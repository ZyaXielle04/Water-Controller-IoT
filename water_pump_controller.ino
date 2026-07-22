#include <WiFi.h>
#include <Firebase_ESP_Client.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ==================================================
// WIFI
// ==================================================

#define WIFI_SSID       "maeve"
#define WIFI_PASSWORD   "09maeve14"

// ==================================================
// FIREBASE
// ==================================================

#define API_KEY \
"AIzaSyBat_HnVj7HiMUVfECv-sPOrTP8ftOJAKw"

#define DATABASE_URL \
"https://water-controller-d087a-default-rtdb.asia-southeast1.firebasedatabase.app/"

// ==================================================
// FIREBASE OBJECTS
// ==================================================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool firebaseAuthReady = false;

// ==================================================
// PIN DEFINITIONS
// ==================================================

#define RELAY_PIN 26
#define WATER_SENSOR_PIN 34

// ==================================================
// RELAY LOGIC
// ==================================================
//
// GPIO 26 LOW  = RELAY ON  = PUMP ON
// GPIO 26 HIGH = RELAY OFF = PUMP OFF
//

const bool RELAY_ACTIVE_LOW = true;

// ==================================================
// WATER SENSOR
// ==================================================

const int WATER_FULL_THRESHOLD = 1500;

int latestWaterLevel = 0;
bool latestIsFull = false;

// ==================================================
// TIMING
// ==================================================

unsigned long lastFirebaseRead = 0;
unsigned long lastSensorUpdate = 0;
unsigned long lastHeartbeat = 0;

const unsigned long FIREBASE_READ_INTERVAL = 1000;
const unsigned long SENSOR_UPDATE_INTERVAL = 2000;
const unsigned long HEARTBEAT_INTERVAL = 10000;
const unsigned long WIFI_TIMEOUT_MS = 20000;
const unsigned long TIME_SYNC_TIMEOUT_MS = 15000;

// ==================================================
// CURRENT PUMP COMMAND STATE
// ==================================================

bool currentPumpState = false;

// ==================================================
// SET RELAY / PUMP
// ==================================================

void setPump(bool pumpOn) {
    int relaySignal;

    if (RELAY_ACTIVE_LOW) {
        relaySignal = pumpOn ? LOW : HIGH;
    } else {
        relaySignal = pumpOn ? HIGH : LOW;
    }

    digitalWrite(RELAY_PIN, relaySignal);
    currentPumpState = pumpOn;

    Serial.print("Pump state command applied: ");
    Serial.println(pumpOn ? "ON" : "OFF");

    Serial.print("GPIO 26 output: ");
    Serial.println(relaySignal == HIGH ? "HIGH" : "LOW");
}

// ==================================================
// UPDATE PUMP STATE TO FIREBASE
// ==================================================

void updatePumpState() {
    Serial.println("Uploading pump state...");

    if (Firebase.RTDB.setBool(&fbdo, "/pump/state", currentPumpState)) {
        Serial.println("Pump state uploaded");
    } else {
        Serial.print("Pump state upload FAILED: ");
        Serial.println(fbdo.errorReason());
    }
}

// ==================================================
// FORCE PUMP OFF WHEN FULL
// ==================================================

void forcePumpOffBecauseFull() {
    Serial.println("Water is FULL. Forcing pump OFF.");

    setPump(false);
    updatePumpState();

    if (Firebase.RTDB.setBool(&fbdo, "/pump/command", false)) {
        Serial.println("Firebase pump command reset to OFF");
    } else {
        Serial.print("Pump command reset FAILED: ");
        Serial.println(fbdo.errorReason());
    }
}

// ==================================================
// READ LOCAL WATER SENSOR ONLY
// ==================================================

void readLocalWaterSensor() {
    latestWaterLevel = analogRead(WATER_SENSOR_PIN);
    latestIsFull = latestWaterLevel >= WATER_FULL_THRESHOLD;
}

// ==================================================
// READ PUMP COMMAND FROM FIREBASE
// ==================================================

void readPumpCommand() {
    Serial.println("Reading Firebase command...");

    if (Firebase.RTDB.getBool(&fbdo, "/pump/command")) {
        bool requestedPumpState = fbdo.boolData();

        Serial.print("Firebase pump command: ");
        Serial.println(requestedPumpState ? "ON" : "OFF");

        if (requestedPumpState && latestIsFull) {
            forcePumpOffBecauseFull();
            return;
        }

        Serial.println("Applying Firebase command to relay...");
        setPump(requestedPumpState);
        updatePumpState();
    } else {
        Serial.print("Firebase READ FAILED: ");
        Serial.println(fbdo.errorReason());
    }
}

// ==================================================
// READ WATER SENSOR
// ==================================================

void updateWaterSensor() {
    readLocalWaterSensor();

    Serial.print("Water sensor value: ");
    Serial.println(latestWaterLevel);

    Serial.print("Container status: ");
    Serial.println(latestIsFull ? "FULL" : "NOT FULL");

    if (Firebase.RTDB.setInt(&fbdo, "/sensor/waterLevel", latestWaterLevel)) {
        Serial.println("Water level uploaded");
    } else {
        Serial.print("Water level upload FAILED: ");
        Serial.println(fbdo.errorReason());
    }

    if (Firebase.RTDB.setBool(&fbdo, "/sensor/isFull", latestIsFull)) {
        Serial.println("Water status uploaded");
    } else {
        Serial.print("Water status upload FAILED: ");
        Serial.println(fbdo.errorReason());
    }

    if (latestIsFull && currentPumpState) {
        forcePumpOffBecauseFull();
    }
}

// ==================================================
// UPDATE DEVICE ONLINE STATUS
// ==================================================

void updateDeviceStatus() {
    if (Firebase.RTDB.setBool(&fbdo, "/device/online", true)) {
        Serial.println("Device online status updated");
    } else {
        Serial.print("Device status upload FAILED: ");
        Serial.println(fbdo.errorReason());
    }
}

// ==================================================
// WAIT FOR INTERNET TIME
// ==================================================

bool waitForTimeSync() {
    Serial.println("Syncing time for SSL...");

    configTime(0, 0, "pool.ntp.org", "time.nist.gov");

    time_t now = time(nullptr);
    unsigned long startedAt = millis();

    while (now < 1700000000 && millis() - startedAt < TIME_SYNC_TIMEOUT_MS) {
        Serial.print(".");
        delay(500);
        now = time(nullptr);
    }

    Serial.println();

    if (now < 1700000000) {
        Serial.println("Time sync FAILED. Firebase SSL may fail.");
        return false;
    }

    Serial.print("Time synced: ");
    Serial.println(ctime(&now));
    return true;
}

// ==================================================
// SETUP
// ==================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("================================");
    Serial.println("AUTOMATIC WATER PUMP STARTING");
    Serial.println("================================");

    int relayOffSignal = RELAY_ACTIVE_LOW ? HIGH : LOW;
    digitalWrite(RELAY_PIN, relayOffSignal);
    pinMode(RELAY_PIN, OUTPUT);
    setPump(false);

    pinMode(WATER_SENSOR_PIN, INPUT);
    analogReadResolution(12);
    analogSetPinAttenuation(WATER_SENSOR_PIN, ADC_11db);
    readLocalWaterSensor();

    Serial.println();
    Serial.print("Connecting to Wi-Fi");

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long wifiStartedAt = millis();

    while (WiFi.status() != WL_CONNECTED && millis() - wifiStartedAt < WIFI_TIMEOUT_MS) {
        Serial.print(".");
        delay(500);
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println();
        Serial.println("Wi-Fi connection FAILED. Pump stays OFF.");
        return;
    }

    Serial.println();
    Serial.println("Wi-Fi connected");
    Serial.print("ESP32 IP address: ");
    Serial.println(WiFi.localIP());

    waitForTimeSync();

    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    config.token_status_callback = tokenStatusCallback;

    if (Firebase.signUp(&config, &auth, "", "")) {
        Serial.println();
        Serial.println("Anonymous authentication successful");
    } else {
        Serial.println();
        Serial.print("Anonymous authentication FAILED: ");
        Serial.println(config.signer.signupError.message.c_str());
        Serial.println("Enable Firebase Authentication > Sign-in method > Anonymous, then upload again.");
        setPump(false);
        return;
    }

    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    firebaseAuthReady = true;

    Serial.println();
    Serial.println("Firebase initialized");
    Serial.println("Waiting for Firebase token...");
}

// ==================================================
// LOOP
// ==================================================

void loop() {
    Serial.println();
    Serial.println("========== LOOP ==========");

    Serial.print("Wi-Fi status: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");

    Serial.print("Firebase ready: ");

    if (firebaseAuthReady && Firebase.ready()) {
        Serial.println("YES");

        if (millis() - lastFirebaseRead >= FIREBASE_READ_INTERVAL) {
            lastFirebaseRead = millis();
            readPumpCommand();
        }

        if (millis() - lastSensorUpdate >= SENSOR_UPDATE_INTERVAL) {
            lastSensorUpdate = millis();
            updateWaterSensor();
        }

        if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
            lastHeartbeat = millis();
            updateDeviceStatus();
        }
    } else {
        Serial.println("NO");
    }

    delay(1000);
}
