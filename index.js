import MINI from 'minified';
import deepExtend from 'deep-extend';
import * as cache from './cache';

let $ = MINI.$,
    _ = MINI._;

// Module caching-xhr wraps minified's $.request() to cache responses in the
// localStorage.
//
// Additionally it reports connection state change (lost/restored) via callback.
//
// Also, module provides default settings, which application can set during
// initialization and which are merged with settings, passed in arguments.
// 
// Module caches only 'GET' requests and only with HTTP headers 'Expires'
// or 'Last-Modified'.
//
// Module returns cached value if it is not expired, or if server returns
// response with error status (including 304 - Not modified), or if timeout
// occurred during request.
//
// Setting '{cache: false}' could be used to bypass cache (if you want to use
// single API or only need notifications about connection state change).
//
// Setting '{xhr:{timeout:3000}}' could be used to change request timeout.
module.exports = {

    // Use this method to set default settings, which will be merged with
    // settings, provided via request/get/put/post/del argument.
    setDefaultSettings: (settings) => {
        _defaultSettings = settings;
    },

    // Use this method to pass callback function, which will be invoked
    // whenever connection state changes.
    // Callback should take boolean argument, which is true when connection
    // restored and false when it lost.
    connectionStatusSubscribe(cb) {
        _cb = cb;
    },

    // This method is a shortcut for request("GET", ...)
    // with caching and with connection state change notifications.
    get(url, data, settings) {
        return _cachingRequest("GET", url, data || {},
            deepExtend({}, _defaultSettings, settings));
    },

    // This method is a shortcut for request("POST", ...)
    // without caching, but with connection state change notifications.
    post(url, data, settings) {
        return _notifingRequest("POST", url, data,
            deepExtend({}, _defaultSettings, settings));
    },

    // This method is a shortcut for request("PUT", ...)
    // without caching, but with connection state change notifications.
    put(url, data, settings) {
        return _notifingRequest("PUT", url, data,
            deepExtend({}, _defaultSettings, settings));
    },

    // This method is a shortcut for request("DEL", ....)
    // without caching, but with connection state change notifications.
    del(url, data, settings) {
        return _notifingRequest("DELETE", url, data,
            deepExtend({}, _defaultSettings, settings));
    },

    // This method is a wrapper around $.request() with caching support and
    // with connection state change notifications.
    // 
    // Method caches only 'GET' requests and only with HTTP headers 'Expires'
    // or 'Last-Modified'.
    //
    // Setting '{cache:false}' could be used to bypass cache.
    // Setting '{xhr:{timeout:3000}}' could be used to change request timeout.
    // Other settings are passed to $.request().
    request(method, url, data, settings) {
        return _cachingRequest(method, url, data || {},
            deepExtend({}, _defaultSettings, settings));
    }
};


// Module state

let _defaultSettings = {
        headers: {
            'Content-Type': 'application/json'
        },
        xhr: {
            timeout: 5000
        }
    },
    _cb = () => {},
    _connected = true,
    _cacheSettings = {
        keyPrefix: 'xhr',
        maxItems: 1000
    },
    _cache;


// Implementation

// This method wraps $.request() and invokes callback when it detects connection
// status change. It assumes connection is lost when $.request() invokes error
// callback with status 0. All other status codes and successful request mean
// that connection is OK.
function _notifingRequest(method, url, data, settings) {
    let prom = $.request(method, url, data, settings);
    prom.then(() => {
            if (!_connected) {
                _connected = true;
                _cb(true);
            }
        })
        .error((status) => {
            let c = status != 0;
            if (_connected != c) {
                _connected = c;
                _cb(c);
            }
        });
    return prom;
}

// This method utilizes localStorage to cache server responses with HTTP headers
// 'Expires' and 'Last-Modified'. It uses _notifingRequest() to send actual
// request.
function _cachingRequest(method, url, data, settings) {
    try {
        localStorage.getItem('x');
    } catch (e) {
        settings.cache = false;
    }
    if (settings.cache === false || method.toUpperCase() != 'GET') {
        return _notifingRequest(method, url, data, settings);
    }
    if (!_cache) {
        _cache = new cache.Cache(_cacheSettings.keyPrefix, _cacheSettings.maxItems);
    }
    let prom = _.promise(),
        key = _cache.keyFromUrl(url, data),
        c = _cache.getItem(key);
    if (!!c) {
        if (!!c.e && Date.parse(c.e) > new Date()) {
            prom(true, [c.r || '']);
            return prom;
        }
        if (!!c.m) {
            settings.headers['If-Modified-Since'] = c.m;
        }
    }
    _notifingRequest(method, url, data, settings)
        .then((responseText, xhr) => {
            let e = xhr.getResponseHeader('Expires'),
                m = xhr.getResponseHeader('Last-Modified');
            if (!!e || !!m) {
                let c = _cache.getItem(key),
                    d = { e: e, m: m, r: responseText },
                    p = e ? Date.parse(e) : 0;
                if (!!c) {
                    _cache.updateItem(key, d, p);
                } else {
                    _cache.addItem(key, d, p);
                }
            } else {
                _cache.removeItem(key);
            }
            prom(true, [responseText, xhr]);
        })
        .error((status, responseText, xhr) => {
            let c = _cache.getItem(key);
            if (!!c) {
                if (xhr['status'] == 304) {
                    let e = xhr.getResponseHeader('Expires'),
                        m = xhr.getResponseHeader('Last-Modified'),
                        d = { e: e, m: m || c.m, r: c.r },
                        p = e ? Date.parse(e) : 0;
                    _cache.updateItem(key, d, p);
                }
                prom(true, [c.r]);
            } else {
                prom(false, [xhr['status'], xhr['responseText'], xhr]);
            }
        });

    return prom;
};
