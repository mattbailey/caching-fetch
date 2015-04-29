import 'isomorphic-fetch';
import deepExtend from 'deep-extend';
import { Cache } from 'heap-local-storage';


// Module caching-fetch wraps fetch (from 'isomorphic-fetch npm package')
// to cache responses in the localStorage.
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
// Setting '{cache: "no-cache"}' could be used to bypass cache (if you want
// to use single API or only need notifications about connection state change).
// Other supported values:
//  - default - default setting, cache only requests with 'Expires'
//              or 'Last-Modified' headers;
//  - reload  - force to reload, cache entry will be removed and request
//              to server
//              forced;
//  Other values from spec (https://fetch.spec.whatwg.org/#request-class) don't
//  supported (yet?).
//
// Setting '{timeout:3000}' could be used to change request timeout.
module.exports = {

    // Helper method to append query parameters to url from JSON data.
    // If url already contains '?' then query string appended with '&'.
    // If args is a string, than it appended to url with '?' or '&'.
    // If args is an array than its elements joined with '&' and
    // appended to url with '?' or '&'.
    // Method sorts parameters alphabetically.
    url: (url, args) => {
        let keys = !args || Object.keys(args),
            uri = url,
            c = 0,
            arr = Object.prototype.toString.call(args) === '[object Array]';
        if (!args || !keys.length) {
            return url;
        }
        uri += (url.indexOf('?') < 0 ? '?' : '&');
        if (typeof args === 'string') {
            return uri + args;
        }
        keys.sort((k1, k2) => {
            k1 = k1.toLowerCase();
            k2 = k2.toLowerCase();
            return k1.localeCompare(k2);
        });
        return uri + keys.map(k => {
            let v = args[k];
            if (v !== null && v !== undefined) {
                if (arr) {
                    return !!v ? encodeURIComponent(v) : null;
                } else {
                    return encodeURIComponent(k) +
                        (v || v === 0 ? '=' + encodeURIComponent(v) : '');
                }
            }
            return null;
        }).filter(v => {
            return !!v;
        }).join('&');
    },


    // Use this method to set default options, which will be merged with
    // options, provided via argument of fetch().
    setDefaultOptions: options => {
        _defaultOptions = options;
    },

    // Use this method to append default options (merge new default options
    // with existed).
    appendDefaultOptions: options => {
         deepExtend(_defaultOptions, options);
    },

    // Use this method to pass callback function, which will be invoked
    // whenever connection state changes.
    // Callback should take boolean argument, which is true when connection
    // restored and false when it lost.
    connectionStatusSubscribe: cb => {
        _cb = cb;
    },

    // Wraps fetch from 'isomorphic-fetch' package
    // and adds caching and connection state notifications.
    fetch: (url, options) => {
        let opts = deepExtend({}, _defaultOptions, options);
        opts.method = opts.method.toUpperCase();
        if (opts.method == 'GET') {
            try {
                localStorage.getItem('_');
            } catch (e) {
                opts.cache = 'no-cache';
            }
            if (opts.cache != 'no-cache') {
                return _cachingFetch(url, opts);
            }
        }
        return _notifingFetch(url, opts);
    }
};


// Module data

let _defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        cache: 'default',
        timeout: 5000
    },
    _cb = () => {},
    _connected = true,
    _cacheSettings = {
        keyPrefix: 'xhr',
        maxItems: 1000
    },
    _cache;


// Implementation

// This method wraps fetch() and invokes callback when it detects connection
// status change. It assumes connection is lost when fetch() invokes error
// callback. Successful request means that connection is OK.
function _notifingFetch(url, options) {
    if (options.cache == 'reload') {
        const size = 15;
        var rnd = '';
        while (rnd.length < size) {
            rnd += Math.random().toString(36).slice(2).toUpperCase();
        }
        rnd = rnd.slice(0, size);
        url += ';';
        url += rnd;
    }
    delete options.cache; // not supported by underlying implementation yet
    let promises = [],
        t = null;
    promises.push(
        fetch(url, options)
        .then(response => {
            !t || window.clearTimeout(t);
            if (!_connected) {
                _cb(_connected = true);
            }
            return Promise.resolve(response);
        })
        .catch(error => {
            !t || window.clearTimeout(t);
            if (_connected) {
                _cb(_connected = false);
            }
            return Promise.reject(error);
        }));
    if (typeof window !== 'undefined') {
        promises.push(new Promise((resolve, reject) => {
            t = window.setTimeout(() => {
                reject(new Error('Network error, timeout exceeded.'));
            }, options.timeout);
        }));
    }
    return Promise.race(promises);
}

// This method utilizes localStorage to cache server responses with HTTP headers
// 'Expires' and 'Last-Modified'. It uses _notifingFetch() to send actual
// request.
function _cachingFetch(url, options) {
    return Promise.resolve((() => {
            if (!_cache) {
                _cache = new Cache(_cacheSettings.keyPrefix, _cacheSettings.maxItems);
            }
            let key = _cache.keyFromUrl(url);
            if (options.cache == 'reload') {
                _cache.removeItem(key);
            } else {
                let c = _cache.getItem(key);
                if (!!c) {
                    c.headers = _headers(c.headers);
                    let e = c.headers.get('Expires'),
                        m = c.headers.get('Last-Modified');
                    if (!!e && Date.parse(e) > new Date()) {
                        // Resolve with cached value.
                        return Promise.resolve(c);
                    }
                    if (!!m) {
                        options.headers['If-Modified-Since'] = m;
                    }
                }
            }
            // Make actual request and process results.
            return _notifingFetch(url, options)
                .then(response => {
                    // Resolve response.text() and save response into simple object.
                    // This object will be saved into cache and returned to the caller.
                    return Promise.all([{
                        status: response.status,
                        ok: response.ok,
                        statusText: response.statusText,
                        headers: _headers(response.headers),
                        url: response.url,
                        responseText: ''
                    }, response.text()]);
                })
                .then(v => {
                    let r = v[0],
                        e = r.headers.get('Expires'),
                        m = r.headers.get('Last-Modified'),
                        c = _cache.getItem(key),
                        p = e ? Date.parse(e) : 0;
                    r.responseText = v[1]; // put resolved text into object
                    if (r.status === 200 || r.status === 0) {
                        // There is a good response.
                        // Update cache value if our headers present (otherwise - remove).
                        if (!!e || !!m) {
                            if (!c) {
                                _cache.addItem(key, r, p);
                            } else {
                                _cache.updateItem(key, r, p);
                            }
                        } else {
                            _cache.removeItem(key);
                        }
                        return Promise.resolve(r);
                    }
                    if (!c) {
                        // There is no good response from site and no value in the cache.
                        return Promise.reject(new Error(r.statusText));
                    }
                    c.headers = _headers(c.headers);
                    if (r.status === 304) {
                        // Update headers in the cache.
                        c.headers['expires'][0] = e;
                        !m || (c.headers['last-modified'][0] = m);
                        _cache.updateItem(key, c, p);
                    }
                    return Promise.resolve(c);
                })
                .catch(e => {
                    // In case of network error we still have a chance to
                    // use stall value from cache.
                    let c = _cache.getItem(key);
                    if (!c) {
                        return Promise.reject(e);
                    }
                    c.headers = _headers(c.headers);
                    return Promise.resolve(c);
                });
        })()
        .then(r => {
            // Append helper methods to response to unify it with the fetch API.
            r.text = () => {
                return r.responseText;
            };
            r.json = () => {
                return JSON.parse(r.responseText);
            };
            return Promise.resolve(r);
        }));
}

// Unifies header objects returned by fetch and from cache 
function _headers(h) {
    // NB: there is no API to fetch all headers
    let m = JSON.parse(JSON.stringify(h.map || h._headers || h));
    Object.defineProperty(m, 'get', {
        get: () => {
            return k => {
                k = k.toLowerCase();
                if (m.hasOwnProperty(k)) {
                    return m[k] ? m[k][0] : null;
                } else {
                    return null;
                }
            };
        }
    });
    Object.defineProperty(m, 'getAll', {
        get: () => {
            return k => {
                k = k.toLowerCase();
                if (m.hasOwnProperty(k)) {
                    return m[k] || [];
                } else {
                    return null;
                }
            };
        }
    });
    Object.defineProperty(m, 'has', {
        get: () => {
            return k => {
                k = k.toLowerCase();
                return m.hasOwnProperty(k);
            };
        }
    });
    return m;
}
