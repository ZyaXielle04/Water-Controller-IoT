import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
    getDatabase,
    ref,
    set,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// ==================================================
// FIREBASE CONFIGURATION
// ==================================================

const firebaseConfig = {

    apiKey:
        "AIzaSyBat_HnVj7HiMUVfECv-sPOrTP8ftOJAKw",

    authDomain:
        "water-controller-d087a.firebaseapp.com",

    databaseURL:
        "https://water-controller-d087a-default-rtdb.asia-southeast1.firebasedatabase.app",

    projectId:
        "water-controller-d087a",

    storageBucket:
        "water-controller-d087a.firebasestorage.app",

    messagingSenderId:
        "636036855890",

    appId:
        "1:636036855890:web:58852be507d659749ec78b",

    measurementId:
        "G-WBQDLPWD5H"

};


// ==================================================
// INITIALIZE FIREBASE
// ==================================================

const app = initializeApp(
    firebaseConfig
);


const auth = getAuth(
    app
);


const database = getDatabase(
    app
);


// ==================================================
// DATABASE REFERENCES
// ==================================================

const pumpCommandRef = ref(
    database,
    "pump/command"
);


const pumpStateRef = ref(
    database,
    "pump/state"
);


const waterLevelRef = ref(
    database,
    "sensor/waterLevel"
);


const isFullRef = ref(
    database,
    "sensor/isFull"
);


const deviceOnlineRef = ref(
    database,
    "device/online"
);


// Firebase browser connection status

const firebaseConnectionRef = ref(
    database,
    ".info/connected"
);


// ==================================================
// HTML ELEMENTS
// ==================================================

const pumpOnButton =
    document.getElementById(
        "pumpOnButton"
    );


const pumpOffButton =
    document.getElementById(
        "pumpOffButton"
    );


const pumpStateBadge =
    document.getElementById(
        "pumpStateBadge"
    );


const pumpStateText =
    document.getElementById(
        "pumpStateText"
    );


const waterStatusBadge =
    document.getElementById(
        "waterStatusBadge"
    );


const waterStatusText =
    document.getElementById(
        "waterStatusText"
    );


const waterLevelValue =
    document.getElementById(
        "waterLevelValue"
    );


const connectionDot =
    document.getElementById(
        "connectionDot"
    );


const connectionText =
    document.getElementById(
        "connectionText"
    );


const deviceStatusDot =
    document.getElementById(
        "deviceStatusDot"
    );


const deviceStatusText =
    document.getElementById(
        "deviceStatusText"
    );


const lastUpdate =
    document.getElementById(
        "lastUpdate"
    );


const commandStatus =
    document.getElementById(
        "commandStatus"
    );


const relayStatus =
    document.getElementById(
        "relayStatus"
    );


const overviewWaterLevel =
    document.getElementById(
        "overviewWaterLevel"
    );


const overviewContainerStatus =
    document.getElementById(
        "overviewContainerStatus"
    );


const notification =
    document.getElementById(
        "notification"
    );


const notificationText =
    document.getElementById(
        "notificationText"
    );


// ==================================================
// PWA INSTALL ELEMENT
// ==================================================

const installButton =
    document.getElementById(
        "installButton"
    );


// Stores the browser's installation prompt

let deferredInstallPrompt =
    null;


// ==================================================
// NOTIFICATION
// ==================================================

let notificationTimeout;


function showNotification(

    message

) {


    if (

        !notification ||

        !notificationText

    ) {

        return;

    }


    notificationText.textContent =
        message;


    notification.classList.add(
        "show"
    );


    clearTimeout(
        notificationTimeout
    );


    notificationTimeout = setTimeout(

        () => {

            notification.classList.remove(
                "show"
            );

        },

        3000

    );

}


// ==================================================
// UPDATE FIREBASE CONNECTION STATUS
// ==================================================

function updateFirebaseConnectionStatus(

    connected

) {


    if (

        connected

    ) {

        connectionDot.className =
            "status-dot online";


        connectionText.textContent =
            "Connected";

    }

    else {

        connectionDot.className =
            "status-dot offline";


        connectionText.textContent =
            "Offline";

    }

}


// ==================================================
// UPDATE ESP32 DEVICE STATUS
// ==================================================

function updateDeviceStatus(

    online

) {


    if (

        online

    ) {

        deviceStatusDot.className =
            "status-dot online";


        deviceStatusText.textContent =
            "Online";

    }

    else {

        deviceStatusDot.className =
            "status-dot offline";


        deviceStatusText.textContent =
            "Offline";

    }

}


// ==================================================
// SEND PUMP COMMAND
// ==================================================

async function setPumpCommand(

    command

) {


    try {


        pumpOnButton.disabled =
            true;


        pumpOffButton.disabled =
            true;


        await set(

            pumpCommandRef,

            command

        );


        showNotification(

            command

                ? "Pump ON command sent"

                : "Pump OFF command sent"

        );

    }

    catch (

        error

    ) {


        console.error(

            "Pump command error:",

            error

        );


        showNotification(

            "Failed to update pump command"

        );

    }

    finally {


        pumpOnButton.disabled =
            false;


        pumpOffButton.disabled =
            false;

    }

}


// ==================================================
// BUTTON EVENTS
// ==================================================

pumpOnButton.addEventListener(

    "click",

    () => {

        setPumpCommand(

            true

        );

    }

);


pumpOffButton.addEventListener(

    "click",

    () => {

        setPumpCommand(

            false

        );

    }

);


// ==================================================
// FIREBASE CONNECTION LISTENER
// ==================================================

onValue(

    firebaseConnectionRef,

    (

        snapshot

    ) => {


        const connected =
            snapshot.val() === true;


        updateFirebaseConnectionStatus(

            connected

        );


        console.log(

            connected

                ? "Browser connected to Firebase"

                : "Browser disconnected from Firebase"

        );

    }

);


// ==================================================
// PUMP COMMAND LISTENER
// ==================================================

onValue(

    pumpCommandRef,

    (

        snapshot

    ) => {


        const command =
            snapshot.val() === true;


        commandStatus.textContent =

            command

                ? "ON"

                : "OFF";

    }

);


// ==================================================
// PUMP STATE LISTENER
// ==================================================

onValue(

    pumpStateRef,

    (

        snapshot

    ) => {


        const state =
            snapshot.val() === true;


        if (

            state

        ) {


            pumpStateBadge.textContent =
                "ON";


            pumpStateBadge.className =
                "status-badge on";


            pumpStateText.textContent =
                "Pump is currently running";


            relayStatus.textContent =
                "ON";

        }

        else {


            pumpStateBadge.textContent =
                "OFF";


            pumpStateBadge.className =
                "status-badge off";


            pumpStateText.textContent =
                "Pump is currently off";


            relayStatus.textContent =
                "OFF";

        }

    }

);


// ==================================================
// WATER LEVEL LISTENER
// ==================================================

onValue(

    waterLevelRef,

    (

        snapshot

    ) => {


        const waterLevel =
            snapshot.val() ?? 0;


        waterLevelValue.textContent =
            waterLevel;


        overviewWaterLevel.textContent =
            waterLevel;


        lastUpdate.textContent =
            new Date().toLocaleTimeString();

    }

);


// ==================================================
// WATER FULL STATUS LISTENER
// ==================================================

onValue(

    isFullRef,

    (

        snapshot

    ) => {


        const full =
            snapshot.val() === true;


        if (

            full

        ) {


            waterStatusBadge.textContent =
                "FULL";


            waterStatusBadge.className =
                "status-badge full";


            waterStatusText.textContent =
                "Container is full";


            overviewContainerStatus.textContent =
                "FULL";

        }

        else {


            waterStatusBadge.textContent =
                "NOT FULL";


            waterStatusBadge.className =
                "status-badge not-full";


            waterStatusText.textContent =
                "Container is not full";


            overviewContainerStatus.textContent =
                "NOT FULL";

        }

    }

);


// ==================================================
// ESP32 DEVICE STATUS LISTENER
// ==================================================

onValue(

    deviceOnlineRef,

    (

        snapshot

    ) => {


        const online =
            snapshot.val() === true;


        updateDeviceStatus(

            online

        );

    }

);


// ==================================================
// ANONYMOUS AUTHENTICATION
// ==================================================

async function authenticateAnonymously() {


    try {


        console.log(

            "Signing in anonymously..."

        );


        const userCredential =

            await signInAnonymously(

                auth

            );


        console.log(

            "Anonymous authentication successful"

        );


        console.log(

            "Anonymous UID:",

            userCredential.user.uid

        );


        showNotification(

            "Connected to Firebase"

        );

    }

    catch (

        error

    ) {


        console.error(

            "Anonymous authentication failed:",

            error

        );


        updateFirebaseConnectionStatus(

            false

        );


        showNotification(

            "Firebase authentication failed"

        );

    }

}


// ==================================================
// AUTH STATE LISTENER
// ==================================================

onAuthStateChanged(

    auth,

    (

        user

    ) => {


        if (

            user

        ) {


            console.log(

                "Firebase user authenticated:",

                user.uid

            );

        }

        else {


            console.log(

                "No Firebase user authenticated"

            );

        }

    }

);


// ==================================================
// PWA INSTALLATION
// ==================================================

// Capture the browser's install prompt

window.addEventListener(

    "beforeinstallprompt",

    (

        event

    ) => {


        console.log(

            "PWA installation is available"

        );


        // Prevent the browser from showing
        // its default automatic prompt

        event.preventDefault();


        // Save the event for later

        deferredInstallPrompt =
            event;


        // Show our custom button

        if (

            installButton

        ) {

            installButton.style.display =
                "block";

        }

    }

);


// ==================================================
// INSTALL PWA BUTTON
// ==================================================

if (

    installButton

) {


    installButton.addEventListener(

        "click",

        async () => {


            if (

                !deferredInstallPrompt

            ) {


                showNotification(

                    "PWA installation is not available on this device"

                );


                return;

            }


            // Show native installation dialog

            deferredInstallPrompt.prompt();


            const choiceResult =

                await deferredInstallPrompt.userChoice;


            console.log(

                "PWA installation result:",

                choiceResult.outcome

            );


            if (

                choiceResult.outcome ===
                "accepted"

            ) {


                showNotification(

                    "App installation started"

                );

            }

            else {


                showNotification(

                    "App installation cancelled"

                );

            }


            // The prompt can only be used once

            deferredInstallPrompt =
                null;


            // Hide button after prompt

            installButton.style.display =
                "none";

        }

    );

}


// ==================================================
// DETECT WHEN PWA IS INSTALLED
// ==================================================

window.addEventListener(

    "appinstalled",

    () => {


        console.log(

            "PWA installed successfully"

        );


        deferredInstallPrompt =
            null;


        if (

            installButton

        ) {

            installButton.style.display =
                "none";

        }


        showNotification(

            "Smart Water Pump installed"

        );

    }

);


// ==================================================
// DETECT STANDALONE MODE
// ==================================================

function isRunningAsInstalledPWA() {


    return (

        window.matchMedia(

            "(display-mode: standalone)"

        ).matches

        ||

        window.navigator.standalone === true

    );

}


if (

    isRunningAsInstalledPWA()

) {


    console.log(

        "Running as installed PWA"

    );


    if (

        installButton

    ) {

        installButton.style.display =
            "none";

    }

}


// ==================================================
// SERVICE WORKER REGISTRATION
// ==================================================

if (

    "serviceWorker"

    in

    navigator

) {


    window.addEventListener(

        "load",

        async () => {


            try {


                const registration =

                    await navigator.serviceWorker.register(

                        "/sw.js"

                    );


                console.log(

                    "Service Worker registered:",

                    registration.scope

                );

            }

            catch (

                error

            ) {


                console.error(

                    "Service Worker registration failed:",

                    error

                );

            }

        }

    );

}


// ==================================================
// START ANONYMOUS AUTHENTICATION
// ==================================================

authenticateAnonymously();