import MINI from 'minified';

/*
 * Module xhr wraps $.request() to cache responses in the localStorage.
 * 
 * Cache only 'GET' requests and only with http headers 'Expires' or 'Last-Modified'.
 * Setting 'cache=false' could be used to bypass cache (or just use $.request() directly).
 * Setting 'xhr.timeout' could be used to change request timeout (such as {xhr:{timeout:3000}}).
 */
module.exports = {

    connectionStatusCallback(status /*bool*/ ) {},

        connectionStatusSubscribe(cb) {
            this.connectionStatusCallback = cb;
        },

        request(method, url, data0, settings0) {

            var settings = settings0 || {},
                data = data0 || {},
                $ = MINI.$,
                _ = MINI._;

            if (settings.cache === false || method.toUpperCase() != 'GET') {
                var prom = $.request(method, url, data, settings);
                prom.then(() => {
                        this.connectionStatusCallback(true);
                    })
                    .error(() => {
                        this.connectionStatusCallback(false);
                    });
                return prom;
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

            var _get = () => {
                    return {
                        e: localStorage.getItem(KEY_EU),
                        m: localStorage.getItem(KEY_MU),
                        r: localStorage.getItem(KEY_RU)
                    };
                },

                _set = (e, m, r, c) => {
                    setTimeout(() => {
                        _gc();
                        try {
                            !!e ? localStorage.setItem(KEY_EU, e) : localStorage.removeItem(KEY_EU);
                            !!m ? localStorage.setItem(KEY_MU, m) : localStorage.removeItem(KEY_MU);
                            if (!localStorage.getItem(KEY_RU)) {
                                localStorage.setItem(KEY_RU, r);
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
                    for (var i = localStorage.length - 1; i >= 0; --i) {
                        var k = localStorage.key(i);
                        if (!!k && _.startsWith(k, KEY_X)) {
                            localStorage.removeItem(k);
                        }
                    };
                    localStorage.setItem(KEY_C, 0);
                },

                // removes all items with 'Expires' before date d
                _removeExpiresBefore = (d) => {
                    var candidates = [],
                        cnt = 0;
                    for (var i = 0, l = localStorage.length; i < l; ++i) {
                        var k = localStorage.key(i);
                        if (!!k && _.startsWith(k, KEY_R)) {
                            var url = k.substring(KEY_R.length),
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
                    // first iteration: remove expiered items
                    if (+localStorage.getItem(KEY_C) < MAX_ITEMS) {
                        return;
                    }
                    _removeExpiresBefore(new Date());
                    if (+localStorage.getItem(KEY_C) < MAX_ITEMS) {
                        return;
                    }
                    setTimeout(() => {
                        // second iteration: remove items that will expire soon
                        var d = new Date();
                        d.setDate((new Date()).getDate() + 3);
                        _removeExpiresBefore(d);
                        setTimeout(() => {
                            // third iteration: remove random items
                            var candidates = [],
                                i, l;
                            for (i = 0, l = localStorage.length; i < l; ++i) {
                                var k = localStorage.key(i);
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

            var xhr = settings.xhr || {},
                ontimeout = xhr.ontimeout || () => {},
                _fromCache = (xhr) => {
                    var c = _get(url);
                    if (!!c.r) {
                        if (xhr['status'] == 304) {
                            var e = xhr.getResponseHeader('Expires'),
                                m = xhr.getResponseHeader('Last-Modified');
                            _set(e, m || c.m, c.r, 0);
                        }
                        prom(true, [c.r]);
                    } else {
                        prom(false, [xhr['status'], xhr['responseText'], xhr]);
                    }
                };

            xhr.timeout = xhr.timeout || 5000;
            xhr.ontimeout = () => {
                _fromCache(xhr, url);
                 this.connectionStatusCallback(false);
                ontimeout();
            };

            $.request(method, url, data, settings)
                .then((responseText, xhr) => {
                    this.connectionStatusCallback(true);
                    var e = xhr.getResponseHeader('Expires'),
                        m = xhr.getResponseHeader('Last-Modified');
                    if (!!e || !!m) {
                        _set(e, m, responseText, 0);
                    } else {
                        _remove(url);
                    }
                    prom(true, [responseText, xhr]);
                })
                .error((status, responseText, xhr) => {
                    _fromCache(xhr);
                });

            return prom;
        },

        get(url, data, settings0) {
            var settings = settings0 || {};
            settings.headers = settings.headers || {};
            settings.headers['Content-Type'] = settings.headers['Content-Type'] || 'application/json';
            return this.request("GET", url, data, settings);
        },

        post(url, data, settings) {
            return $.request("POST", url, data, settings);
        },

        put(url, data, settings) {
            return $.request("PUT", url, data, settings);
        },

        del(url, data, settings) {
            return $.request("DELETE", url, data, settings);
        }
};
