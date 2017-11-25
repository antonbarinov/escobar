"use strict";

const routing = require('./lib/routing');
const helpers = require('./lib/helpers');
const httpServer = require('./lib/http_server');


class EscobarServer {
    constructor() {
        this.host = '0.0.0.0';
        this.port = 3000;
        this.backlog = 65535;

        this.routes = {};

        // Callbacks
        this.onBeforeEndpoint = null;
        this.onBeforeSendResponse = null;
        this.onEndpointNotFound = null;
        this.onExecRoute = null;
        this.onRequest = null;
        this.onError = null;

        // Parsers
        this.useJsonParser = true;
        this.useMultipartParser = true;
        this.useUrlencodedParser = true;
    }

    async loadRoutes(pathToFolder) {
        try {
            const timerStr = 'Routes load time';
            console.time(timerStr);
            const _routes = await routing(pathToFolder);
            if (_routes === false) {
                console.error(`There is no routes loaded, please check ${pathToFolder} folder.`);
            } else {
                console.timeEnd(timerStr);
                this.routes = _routes;
                helpers.forEach(_routes, (key) => {
                    console.log(`Loaded route: ${key}`);
                });
            }
        } catch (e) {
            throw e;
        }
    };

    startServer () {
        /**
         * Run HTTP server and listen connections
         */
        this.httpServer = httpServer.bind(this)();

        this.httpServer.on('clientError', (err, socket) => {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });

        this.httpServer.listen(this.port, this.host, this.backlog, () => {
            console.log(`Server running at http://${this.host}:${this.port}/`);
        });
    };
}



module.exports = EscobarServer;