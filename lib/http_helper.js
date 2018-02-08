const querystring = require('querystring');
const http = require('http');
const helpers = require('./helpers');

const getCookiesArray = (cookiesToSend) => {
    let cookiesArray = [];
    helpers.forEach(cookiesToSend, (name, data) => {
        let str = encodeURI(name) + '=' + encodeURI(data.value) + '; ';
        helpers.forEach(data, (key, val) => {
            if (key == 'domain' || key == 'path') {
                str += key + '=' + encodeURI(val) + '; ';
            } else if (key.toLowerCase() == 'secure' && val == true) {
                str += 'Secure; ';
            } else if (key.toLowerCase() == 'httponly' && val == true) {
                str += 'HttpOnly; ';
            }
        });

        let expires = parseInt(data.expires !== undefined ? data.expires : 31536000); // 31536000 - 1 year in seconds
        if (isNaN(expires)) expires = 0;
        let expVal;

        if (expires > 0) {
            expVal = new Date(new Date().getTime() + expires * 1000).toUTCString();
        } else {
            expVal = new Date(1970, 10, 10).toUTCString();
        }

        str += 'expires=' + expVal;
        cookiesArray.push(str);
    });

    return cookiesArray;
};

const getCookies = (request, params) => {
    const cookieString = request.headers.cookie;
    if (!cookieString) return {};

    params.parsedCookies = querystring.parse(cookieString, '; ', '=');
    params.isCookiesParsed = true;

    return params.parsedCookies;
};

const setCookie = (response, params, name, value, options = false) => {
    let obj = {
        value: value,
        path: '/'
    };

    if (options) {
        helpers.forEach(options, (key, val) => {
            obj[key] = val;
        });
    }

    params.cookiesToSend[name] = obj;

    response.setHeader('Set-Cookie', getCookiesArray(params.cookiesToSend));
};

const removeCookie = (response, params, name) => {
    let cookieLink = params.cookiesToSend[name];
    if (!cookieLink) return false;

    cookieLink.expires = 0;
    cookieLink.value = '';

    response.setHeader('Set-Cookie', getCookiesArray(params.cookiesToSend));
};


module.exports = (res, req) => {
    let params = {
        isCookiesParsed: false,
        parsedCookies: {},
        cookiesToSend: {}
    };

    return {
        setCookie: (name, value, options = false) => {
            setCookie(res, params, name, value, options);
        },
        getCookie: name => {
            if (!params.isCookiesParsed) getCookies(req, params); // Parse cookies if we didn't parse it yet
            return params.parsedCookies[name] || null;
        },
        getCookies: () => {
            if (!params.isCookiesParsed) getCookies(req, params); // Parse cookies if we didn't parse it yet
            return params.parsedCookies;
        },
        removeCookie: name => {
            removeCookie(res, params, name);
        },
        setCode: code => {
            res.statusCode = code;
            res.statusMessage = http.STATUS_CODES[code];
        }
    }
};