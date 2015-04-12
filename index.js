import MINI from 'minified';
import deepExtend from 'deep-extend';
import LZString from 'lz-string';

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
        keyPrefix: 'xhr|',
        maxItems: 200
    };


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

    const KEY_X = 'xhr|',
        KEY_E = 'xhr|e|',
        KEY_M = 'xhr|m|',
        KEY_R = 'xhr|r|',
        KEY_C = 'xhr|c|',
        DATA_PART = JSON.stringify(data),
        KEY_EU = KEY_E + url + DATA_PART,
        KEY_MU = KEY_M + url + DATA_PART,
        KEY_RU = KEY_R + url + DATA_PART,
        MAX_ITEMS = 200;

    let _get = () => {
            return {
                e: localStorage.getItem(KEY_EU),
                m: localStorage.getItem(KEY_MU),
                r: LZString.decompressFromUTF16(localStorage.getItem(KEY_RU))
            };
        },

        _set = (e, m, r, c) => {
            setTimeout(() => {
                _gc();
                try {
                    !!e ? localStorage.setItem(KEY_EU, e) : localStorage.removeItem(KEY_EU);
                    !!m ? localStorage.setItem(KEY_MU, m) : localStorage.removeItem(KEY_MU);
                    if (!localStorage.getItem(KEY_RU)) {
                        localStorage.setItem(KEY_RU, LZString.compressToUTF16(r));
                        localStorage.setItem(KEY_C, +localStorage.getItem(KEY_C) + 1);
                    }
                } catch (e) {
                    if (e == QUOTA_EXCEEDED_ERR) {
                        if (c == 0) {
                            setTimeout(() => {
                                _removeAll();
                                _set(e, m, r, 1);
                            }, 0);
                        } else if (c == 1) {
                            setTimeout(() => {
                                localStorage.clear();
                                _set(e, m, r, 2);

                            }, 0);
                        }
                    }
                }
            }, 0);
        },

        _remove = (url) => {
            const KEY_EU = KEY_E + url + DATA_PART,
                KEY_MU = KEY_M + url + DATA_PART,
                KEY_RU = KEY_R + url + DATA_PART;
            localStorage.removeItem(KEY_EU);
            localStorage.removeItem(KEY_MU);
            if (!!localStorage.getItem(KEY_RU)) {
                localStorage.removeItem(KEY_RU);
                localStorage.setItem(KEY_C, +localStorage.getItem(KEY_C) - 1);
                return true;
            }
            return false;
        },

        _removeAll = () => {
            for (let i = localStorage.length - 1; i >= 0; --i) {
                let k = localStorage.key(i);
                if (!!k && _.startsWith(k, KEY_X)) {
                    localStorage.removeItem(k);
                }
            };
            localStorage.setItem(KEY_C, 0);
        },

        // removes all items with 'Expires' before date d
        _removeExpiresBefore = (d) => {
            let candidates = [],
                cnt = 0;
            for (let i = 0, l = localStorage.length; i < l; ++i) {
                let k = localStorage.key(i);
                if (!!k && _.startsWith(k, KEY_R)) {
                    let url = k.substring(KEY_R.length),
                        c = _get(url);
                    ++cnt;
                    if (!!c.e && Date.parse(c.e) < d) {
                        candidates.push(url);
                    }

                }
            }
            localStorage.setItem(KEY_C, cnt); // self repair
            candidates.forEach((u) => {
                _remove(u);
            });
        },

        _gc = () => {
            // first iteration: remove expired items
            if (+localStorage.getItem(KEY_C) < MAX_ITEMS) {
                return;
            }
            _removeExpiresBefore(new Date());
            if (+localStorage.getItem(KEY_C) < MAX_ITEMS) {
                return;
            }
            setTimeout(() => {
                // second iteration: remove items that will expire soon
                let d = new Date();
                d.setDate((new Date()).getDate() + 3);
                _removeExpiresBefore(d);
                setTimeout(() => {
                    // third iteration: remove random items
                    let candidates = [],
                        i, l;
                    for (i = 0, l = localStorage.length; i < l; ++i) {
                        let k = localStorage.key(i);
                        if (!!k && _.startsWith(k, KEY_R)) {
                            candidates.push(k.substring(KEY_R.length));
                        }
                    }
                    // leave about 3/4 of MAX_ITEMS items
                    for (i = Math.floor(3 * MAX_ITEMS / 4), l = candidates.length; i < l; _remove(candidates[Math.floor(l * Math.random())]) && ++i);
                }, 0);
            }, 0);
        },

        prom = _.promise(),
        c = _get(url);

    if (!!c.r) {
        if (!!c.e && Date.parse(c.e) > new Date()) {
            prom(true, [c.r]);
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
                _set(e, m, responseText, 0);
            } else {
                _remove(url);
            }
            prom(true, [responseText, xhr]);
        })
        .error((status, responseText, xhr) => {
            let c = _get(url);
            if (!!c.r) {
                if (xhr['status'] == 304) {
                    let e = xhr.getResponseHeader('Expires'),
                        m = xhr.getResponseHeader('Last-Modified');
                    _set(e, m || c.m, c.r, 0);
                }
                prom(true, [c.r]);
            } else {
                prom(false, [xhr['status'], xhr['responseText'], xhr]);
            }
        });

    return prom;
};

function _key(url, data) {
    return _cacheSettings.keyPrefix + 'v|' + LZString.compressToUTF16(url + JSON.stringify(data || {}));
}

function _get(key) {
    return JSON.parse(LZString.decompressFromUTF16(localStorage.getItem(key)));
}

function _exist(key) {
    return localStorage.getItem(key) !== null;
}

function _put(key, value) {
    localStorage.setItem(key, LZString.compressToUTF16(JSON.stringify(value)));
}

function _cntrKey() {
    return _cacheSettings.keyPrefix + 'c|';
}

function _incr(cntrKey) {
    localStorage.setItem(cntrKey, +localStorage.getItem(cntrKey) + 1);
}

function _decr(cntrKey) {
    localStorage.setItem(cntrKey, +localStorage.getItem(cntrKey) - 1);
}

function _reset(cntrKey) {
    localStorage.setItem(cntrKey, 0);
}

function _indexKey() {
	return _cacheSettings.keyPrefix + 'i|';
}
