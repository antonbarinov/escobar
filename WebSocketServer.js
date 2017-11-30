"use strict";

const routing = require('./lib/routing');
const helpers = require('./lib/helpers');
const wsServer = require('./lib/ws_server');


class EscobarWebSocketServer {
    constructor(WebSocketServer) {
        this.host = '0.0.0.0';
        this.port = 3000;
        this.backlog = 65535;

        this.WebSocketServer = WebSocketServer;

        this.routes = {};

        // Callbacks
        this.onConnect = null;
        this.onMessage = null;

        this.onBeforeEndpoint = null;
        this.onBeforeSendResponse = null;
        this.onEndpointNotFound = null;
        this.onExecRoute = null;
        this.onError = null;
    }

    async loadRoutes(pathToFolder) {
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
    };

    startServer () {
        /**
         * Run Web Socket Server server and listen connections
         */
        this.wss = new this.WebSocketServer({ port: this.port, host: this.host, backlog: this.backlog });
        wsServer.bind(this)();

        this.wss.on('err', (err) => {
            console.error(err);
        });
    };
}



module.exports = EscobarWebSocketServer;