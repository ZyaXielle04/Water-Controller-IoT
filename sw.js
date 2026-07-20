const CACHE_NAME =
    "water-controller-v1";


const urlsToCache = [

    "/",

    "/index.html",

    "/style.css",

    "/app.js",

    "/manifest.json",

    "/icons/icon-192.png",

    "/icons/icon-512.png"

];


// ==================================================
// INSTALL
// ==================================================

self.addEventListener(

    "install",

    event => {


        event.waitUntil(

            caches.open(

                CACHE_NAME

            )

            .then(

                cache =>

                    cache.addAll(

                        urlsToCache

                    )

            )

        );


        self.skipWaiting();

    }

);


// ==================================================
// ACTIVATE
// ==================================================

self.addEventListener(

    "activate",

    event => {


        event.waitUntil(

            Promise.all(

                [

                    clients.claim(),


                    caches.keys()

                        .then(

                            cacheNames =>

                                Promise.all(

                                    cacheNames

                                        .filter(

                                            cacheName =>

                                                cacheName !==

                                                CACHE_NAME

                                        )

                                        .map(

                                            cacheName =>

                                                caches.delete(

                                                    cacheName

                                                )

                                        )

                                )

                        )

                ]

            )

        );

    }

);


// ==================================================
// FETCH
// ==================================================

self.addEventListener(

    "fetch",

    event => {


        // Only handle GET requests

        if (

            event.request.method !==

            "GET"

        ) {

            return;

        }


        // Ignore Firebase and other external requests

        if (

            !event.request.url.startsWith(

                self.location.origin

            )

        ) {

            return;

        }


        event.respondWith(

            fetch(

                event.request

            )

            .then(

                response => {


                    if (

                        response.ok

                    ) {


                        const responseCopy =

                            response.clone();


                        caches.open(

                            CACHE_NAME

                        )

                        .then(

                            cache =>

                                cache.put(

                                    event.request,

                                    responseCopy

                                )

                        );

                    }


                    return response;

                }

            )

            .catch(

                () =>

                    caches.match(

                        event.request

                    )

            )

        );

    }

);