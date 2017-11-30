const http = require('http');

function errorResponse(requestData, code) {
    const statusText = http.STATUS_CODES[code] || 'Internal server error';
    requestData._clientResponse = JSON.stringify({
        status: 'FAIL',
        code,
        message: statusText
    });
}

module.exports = function () {
    this.wss.on('connection', async (ws) => {
        let requestData = {
            _ws: ws
        };

        try {
            if (typeof this.onConnect == 'function') {
                await this.onConnect(requestData);
            }

            ws.on('error', (err) => {
                console.error(err);
            });

            ws.on('message', async (message) => {
                try {
                    const msgData = JSON.parse(message);
                    requestData = {
                        ...requestData,
                        _route: false, // Endpoint route (example: /api/version)

                        /**
                         * _routeParams explanation.
                         * Example:
                         * If _route = /api/user, but request.url = /api/user/1337/remove,
                         * in this case _routeParams = [1337, 'remove'].
                         * If request.url == /api/user, _routeParams will be empty array [].
                         */
                        _routeParams: [],
                        _clientResponse: '', // This will be send to client response
                        _execOnBeforeSendResponse: true, // Exec onBeforeSendResponse hook?
                        _execRouting: true, // Exec routing?
                        _customResponse: false, // If true, response.end(requestData._clientResponse); will not be executed in the end of request life cycle
                        $_DATA: msgData
                    };

                    if (typeof this.onMessage == 'function') {
                        await this.onMessage(requestData);
                    }

                    if (requestData._execRouting) {
                        // If we define requestData._route manually, we will try to navigate using this url, not url from request
                        let url = requestData._route;
                        if (!url) {
                            url = msgData.endpoint;
                        }

                        // Try to find route
                        let renderFunc = this.routes[url];
                        if (!renderFunc) {
                            let routePath;
                            let splitted = url.split('/');
                            splitted.shift();
                            while (splitted.length) {
                                routePath = '/' + splitted.join('/');
                                renderFunc = this.routes[routePath];
                                if (renderFunc) {
                                    requestData._route = routePath;
                                    requestData._routeParams = url.substr(routePath.length + 1).split('/');
                                    break;
                                }
                                splitted.pop();
                            }
                        } else {
                            requestData._route = url;
                        }


                        if (renderFunc) {
                            let doExecRoute = true;
                            if (typeof this.onBeforeEndpoint == 'function') {
                                doExecRoute = await this.onBeforeEndpoint(requestData);
                            }

                            if (doExecRoute) {
                                if (typeof this.onExecRoute == 'function') {
                                    await this.onExecRoute(requestData, renderFunc);
                                } else {
                                    requestData._clientResponse = await renderFunc(requestData);
                                }
                            }
                        } else {
                            if (typeof this.onEndpointNotFound != 'function') {
                                errorResponse(requestData, 404);
                            } else {
                                await this.onEndpointNotFound(requestData);
                            }
                        }
                    }


                } catch (e) {
                    console.error(e);
                    if (typeof this.onError == 'function') {
                        await this.onError(requestData, e);
                    } else {
                        errorResponse(requestData, 500);
                    }
                }

                try {
                    if (requestData._execOnBeforeSendResponse && typeof this.onBeforeSendResponse == 'function') {
                        await this.onBeforeSendResponse(requestData);
                    }

                    if (!requestData._customResponse) {
                        ws.send(requestData._clientResponse);
                    }
                } catch (e) {
                    console.error(e);
                }
            });
        } catch (e) {
            try {
                console.error(e);
                if (typeof this.onError == 'function') {
                    await this.onError(requestData, e);
                } else {
                    errorResponse(requestData, 500);
                }
            } catch (e) {
                errorResponse(requestData, 500);
                console.error(e);
            }
        }
    });
};