# Escobar

> Node.js micro framework for REST API or any other applications based on HTTP server.

> Application example with recommended architecture is [here](https://github.com/antonbarinov/escobar-architecture)

### Requirements
Node.js that supports async/await. (version 7.6 or higher has native support)

### Features
- 0 dependencies
- Async/await
- Fast
- Simple
- Flexible
- Light

### Navigation
- [Installation](#installation)
- [Escobar server documentation](#escobar-server)
- [requestData object documentation](#requestdata)


# Installation
```
npm i --save escobar
```

# Quick start example
```
const EscobarServer = require('escobar');
const server = new EscobarServer();

server.host = '127.0.0.1';
server.port = 8080;
server.loadRoutes(__dirname + '/routes'); // Load routes from folder
server.startServer();
```


# Documentation with examples

## Escobar server

### Settings
**_.host_** - Http server binding host. (Default: '0.0.0.0')

**_.port_** - Http server binding port. (Default: 3000)

**_.httpServer_** - [Node.js http.Server](https://nodejs.org/api/http.html#http_class_http_server) (Available after `.startServer()` exec`)

```
server.httpServer.timeout = 30000; // Set timeout to 30 sec.
```

**_.routes_** - Object with routes functions. (Default: {})

```
{
    '/': [function],
    '/some/endpoint': [function]
}
```

**_.useJsonParser_** - Parse request body with json, when Content-Type is 'application/json'. (Default: true)

**_.useMultipartParser_** - Parse request body (files and data), when Content-Type is 'multipart/form-data'. (Default: true)

**_.useUrlencodedParser_** - Parse request body data, when Content-Type is 'application/x-www-form-urlencoded'. (Default: true)


### Events
**All events functions must be async or return Promise.**


**Event: 'request'**

Fires when we got new request.

Arguments: 

- [requestData](#requestdata)

```
server.on('request', async (requestData) => {
   const res = requestData._response;
   const req = requestData._request;

   // Set response headers (default)
   res.setHeader('Content-Type', 'application/json; charset=utf-8');

   // Headers for cross domain requests
   if (req.method == 'OPTIONS') {
       res.setHeader('Allow', 'GET,POST,PUT,DELETE,OPTIONS');
   }
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');


   // Or some stuff
   // req.on('data', (chunk) => { console.log('request body chunk: ' + chunk) });
   // req.on('end', () => {console.log("client request is complete. Let's send him response!")});

   // If you set server.useJsonParser or server.useMultipartParser or server.useUrlencodedParser to false
   // You can use your tools to parse this data

   return true;
});
```

**Event: 'before_endpoint'**

Fires before routing function will be executed. If it return `true` - routing function will be executed. If it return `false` - routing function will ***NOT*** be executed.

Arguments: 

- [requestData](#requestdata)

```
server.on('before_endpoint', async (requestData) => {
    // Get sessionId
    requestData._sessionId =
        requestData._request.headers.sessionid
        || requestData.$_GET.sessionId
        || requestData._http.getCookie(__sessionCookieName)
        || requestData._sessionId;
        
    // Some function that check access
    requestData._user = await auth(requestData);
    
});
```

**Event: 'exec_route'**

If this event is handled, you need to rewrite default execution. **renderFunc** - route function.

Arguments: 

- [requestData](#requestdata)
- renderFunc

Default route execution is simply:   
```
requestData._clientResponse = await renderFunc(requestData);
```

Custom execution example:
```
server.on('exec_route', async (requestData, renderFunc) => {
    const method = requestData._request.method;
    const funcToExec = renderFunc[method];

    if (funcToExec) {
        if (funcToExec.authOnly && !requestData._user) {
            requestData._clientResponse = __unauthorized(requestData, "You don't have access to this resource.");
            return false;
        }

        requestData._clientResponse = await funcToExec.exec(requestData);
    } else {
        requestData._clientResponse = __badRequest(requestData, `Method '${method}' is not supported for this endpoint`);
    }

    return true;
});

// Route index file
// ./routes/some/endpoint/__index.js
module.exports = {
    GET: require('./GET'),
    POST: require('./POST')
};

// Route logic file
// ./routes/some/endpoint/GET.js
module.exports = {
    authOnly: true,
    exec: async (requestData) => {
        // Return response string that will be delivered to the client
        return {
            status: 'OK',
            data: 'Hello world!'
        };
    }
};
```

**Event: 'before_send_response'**

Fires before we send response to client (`response.end(requestData._clientResponse);`).

Arguments: 

- [requestData](#requestdata)
 
```
server.on('before_send_response', async (requestData) => {
    // You can modify requestData._clientResponse here and it will be sent to client modified

    try {
        if (typeof requestData._clientResponse === 'object') {
            requestData._clientResponse = JSON.stringify(requestData._clientResponse);
        }
    } catch (e) {
        requestData._clientResponse = JSON.stringify({
            status: "FAIL",
            message: getErrorMsg(e)
        })
    }
});
```

**Event: 'not_found'**

Fires when we don't find any route for request. Example (https://example.com/endpoint/that/does/not/exists)

Arguments: 

- [requestData](#requestdata)
 
```
const endpointNotFound = JSON.stringify({
    status: "FAIL",
    message: "Endpoint not found"
});

server.on('not_found', async (requestData) => {
    // Don't exec server.onBeforeSendResponse
    // Because i don't want to waste CPU time for JSON.stringify every time
    requestData._execOnBeforeSendResponse = false;

    requestData._clientResponse = endpointNotFound;
    
    return true;
});
```

**Event: 'error'**

Fires when we got error.

Arguments: 

- [requestData](#requestdata)
- err

```
const getErrorMsg = (e) => {
    let msg = 'Internal Server Error';
    if (typeof e == 'string') msg = e;
    if (typeof e == 'object') {
        if (e.msg) msg = e.msg;
        if (e.message) msg = e.message;
    }
    
    return msg;
};

server.on('error', async (requestData, err) => {
    requestData._http.setCode(500);
    
    requestData._clientResponse = {
        status: 'FAIL',
        message: getErrorMsg(err)
    };
    
    return true;
});
```

### Events life cycle

- await util executed: `request`
- await util executed: `before_endpoint`
- await util executed: `exec_route`
- await util executed: `before_send_response`

### Functions

**_.startServer()_** - Start server.

**_.loadRoutes(pathToFolder)_** - Load routes from folder. **pathToFolder** - Full path to folder that contains routes.

```
server.loadRoutes(__dirname + '/routesFolder');
```

**_How to use routes folder?_**

Here is example of files and folder structure:
```
routesFolder
    __main
        __index.js
    someFolder
        anotherFolder
            __index.js
    auth
        __index.js
```

**__index.js** - entry point for route.

**__main** folder - route for '/'.

Result routes:
```
{
    '/': [function],
    '/someFolder/anotherFolder': [function],
    'auth': [function]
}
```

## requestData
requestData - is main object for manipulating your application.

**requestData has a following properties by default for each request:**

_**._request**_ - [Node.js http request from client.](https://nodejs.org/api/http.html#http_class_http_incomingmessage)

_**._response**_ - [Node.js http response from server.](https://nodejs.org/api/http.html#http_class_http_serverresponse)

_**._route**_ - Endpoint route (example: '/api/version'). (Default: false)

NOTE: If you define it inside `.onRequest` callback, routing will try to navigate using this url, instead of url from request.

_**._routeParams**_ - See explanation below. (Default: [])

```
Example 1:
We have:
Route with endpoint /api/user
Request with URL /api/user/1337/remove

In this case requestData._routeParams will be [1337, 'remove'].


Example 2:
Route with endpoint /api/user
Request with URL /api/user

In this case requestData._routeParams will be empty array [].
```

_**._clientResponse**_ - This will be sent to client. (Default: '')

_**._execOnBeforeSendResponse**_ - Do we need to exec callback `onBeforeSendResponse`?. (Default: true)

_**._execRouting**_ - Do we need to exec routing flow?. _NOTE: Change this property available only inside `onRequest` callback._ (Default: true)

_**._execRoute**_ - Do we need to exec route or 'exec_route' event?. (Default: true)

_**._customResponse**_ - If true, `response.end(requestData._clientResponse);` will not be executed in the end of request life cycle. 

_**.$_DATA**_ - Parsed data from request body. (Default: {})

_**.$_GET**_ - Parsed data from query params. (Default: {})

_**.$_FILES**_ - List of uploaded files (when Content-Type: multipart/form-data). (Default: {})

_**._http**_ - Help functions. See list below.

- _**.setCookie(name, value, options = false)**_ - Set cookie.

```
requestData._http.setCookie('token', 'someTokenvalue', {
    domain: '.example.com',
    httponly: true,
    secure: true
});
```

- _**.getCookie(name)**_ - Get cookie. Returns `false` if cookie does't exists.

```
const token = requestData._http.getCookie('token');
```

- _**.getCookies()**_ - Get all cookies.

```
const cookies = requestData._http.getCookies();

/*
cookies = {
    token: 'someTokenvalue',
    cityId: 231
}
*/
```

- _**.removeCookie(name)**_ - Remove cookie.

- _**.setCode(code)**_ - Set status code and status message for response.

This function do following stuff:
```
requestData._response.statusCode = code;
requestData._response.statusMessage = http.STATUS_CODES[code];
```