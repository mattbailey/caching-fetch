import chai from 'chai';
import xhr from '../src/caching-fetch';
import 'isomorphic-fetch';
import nock from 'nock';
import { Cache } from 'heap-local-storage';

let should = chai.should();

describe('# build URL', () => {
    it('no data', () => {
        xhr.url('http://www.example.com').should.equal('http://www.example.com');
        xhr.url('/sub/').should.equal('/sub/');
        xhr.url('http://www.example.com', null).should.equal('http://www.example.com');
        xhr.url('/sub/', null).should.equal('/sub/');
    });
    it('empty data', () => {
        xhr.url('http://www.example.com', {}).should.equal('http://www.example.com');
        xhr.url('/sub/', {}).should.equal('/sub/');
        xhr.url('http://www.example.com', []).should.equal('http://www.example.com');
        xhr.url('http://www.example.com', '').should.equal('http://www.example.com');
    });
    it('json', () => {
        xhr.url('http://www.example.com', 'query=string')
            .should.equal('http://www.example.com?query=string');
        xhr.url('http://www.example.com', {
            a: 42,
            e: null,
            f: undefined,
            g: 0,
            h: 'null',
            b: 'zzz',
            c: 'xxx yyy',
            d: 'http://www.xxx.com/?param=ppp&next=nnn',
            i: 'undefined',
            j: '',
            k: 'ok'
        }).should.equal('http://www.example.com?a=42&b=zzz&c=xxx%20yyy' +
            '&d=http%3A%2F%2Fwww.xxx.com%2F%3Fparam%3Dppp%26next%3Dnnn' +
            '&g=0&h=null&i=undefined&j&k=ok');
        xhr.url('/sub/', {
            a: 42,
            b: 'zzz',
            c: 'xxx yyy',
            d: 'http://www.xxx.com/?param=ppp&next=nnn',
            e: null,
            f: undefined,
            g: 0,
            h: 'null',
            i: 'undefined',
            j: '',
            k: 'ok'
        }).should.equal('/sub/?a=42&b=zzz&c=xxx%20yyy' +
            '&d=http%3A%2F%2Fwww.xxx.com%2F%3Fparam%3Dppp%26next%3Dnnn' +
            '&g=0&h=null&i=undefined&j&k=ok');
        xhr.url('http://www.example.com', ['aaa', 'bbb', null, undefined, 0])
            .should.equal('http://www.example.com?aaa&bbb');

        xhr.url('http://www.example.com?existing=yes', {
            a: 42,
            b: 'zzz',
            c: 'xxx yyy',
            d: 'http://www.xxx.com/?param=ppp&next=nnn',
            e: null,
            f: undefined,
            g: 0,
            h: 'null',
            i: 'undefined',
            j: '',
            k: 'ok'
        }).should.equal('http://www.example.com?existing=yes&a=42&b=zzz&c=xxx%20yyy' +
            '&d=http%3A%2F%2Fwww.xxx.com%2F%3Fparam%3Dppp%26next%3Dnnn' +
            '&g=0&h=null&i=undefined&j&k=ok');
        xhr.url('/sub/?existing=yes', {
            a: 42,
            b: 'zzz',
            c: 'xxx yyy',
            d: 'http://www.xxx.com/?param=ppp&next=nnn',
            e: null,
            f: undefined,
            g: 0,
            h: 'null',
            i: 'undefined',
            j: '',
            k: 'ok'
        }).should.equal('/sub/?existing=yes&a=42&b=zzz&c=xxx%20yyy' +
            '&d=http%3A%2F%2Fwww.xxx.com%2F%3Fparam%3Dppp%26next%3Dnnn' +
            '&g=0&h=null&i=undefined&j&k=ok');
        xhr.url('http://www.example.com?existing=yes', ['aaa', 'bbb', null, undefined, 0])
            .should.equal('http://www.example.com?existing=yes&aaa&bbb');
    });
});

describe('# fetch', () => {

    it('real request', done => {
        nock.enableNetConnect();
        fetch('http://echo.jsontest.com/meaning/42/')
            .then(response => {
                response.status.should.equal(200);
                return Promise.resolve(response.json());
            })
            .then(json => {
                json.should.deep.equal({'meaning':'42'});
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it('real request with timeout', done => {
        nock.enableNetConnect();
        fetch('http://www.google.com:8888', {
                timeout: 500
            })
            .then(response => {
                response.status.should.equal(0);
                done();
            })
            .catch(error => {
                error.toString().should.not
                    .contains('Ensure the done() callback is being called in this test');
                done();
            });
    });
});

describe('# fetch & nock', () => {

    beforeEach(() => {
        nock.disableNetConnect();
        nock.cleanAll();
    });

    afterEach(() => {
        nock.disableNetConnect();
        nock.cleanAll();
    });

    it('mock request', done => {
        nock('http://echo.jsontest.com/meaning/42/')
            .get('/')
            .reply(200, {
                mocked: true
            });

        fetch('http://echo.jsontest.com/meaning/42/')
            .then(response => {
                response.status.should.equal(200);
                response.headers.get('Content-Type').should.equal('application/json');
                if (response.status === 200 || response.status === 0) {
                    return Promise.resolve(response.json())
                } else {
                    return Promise.reject(new Error(response.statusText))
                }
            })
            .then(json => {
                json.should.be.deep.equal({
                    mocked: true
                });
                done();
            })
            .catch(e => {
                done(e);
            });
    });
});

describe('# caching-fetch', () => {

    var data = {
        someField: 'someValue',
        a: {
            b: 'zzz'
        }
    };

    afterEach(() => {
        nock.disableNetConnect();
        nock.cleanAll();
    });

    it('real request', done => {
        nock.enableNetConnect();
        xhr.fetch('http://echo.jsontest.com/meaning/42/')
            .then(response => {
                response.status.should.equal(200);
                return Promise.resolve(response.json());
            })
            .then(json => {
                json.should.deep.equal({'meaning':'42'});
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it('real request with timeout', done => {
        nock.enableNetConnect();
        xhr.fetch('http://www.google.com:8888', {
                timeout: 500
            })
            .then(response => {
                response.status.should.equal(0);
                done();
            })
            .catch(error => {
                error.toString().should.not
                    .contains('Ensure the done() callback is being called in this test');
                done();
            });
    });

    function t(url, done, setup, _fetch, stateCheck1, dataCheck1, stateCheck2, dataCheck2) {
        var n = setup(url);
        _fetch(url)
            .then(response => {
                stateCheck1(url, response);
                return Promise.resolve(response.json())
            })
            .then(json => {
                dataCheck1(url, json);
                return Promise.resolve(_fetch(url));
            })
            .then(response => {
                stateCheck2 ? stateCheck2(url, response) : stateCheck1(url, response);
                return Promise.resolve(response.json())
            })
            .then(json => {
                dataCheck2 ? dataCheck2(url, json) : dataCheck1(url, json);
                n.done();
                done();
            })
            .catch(e => {
                done(e);
            });
    }

    it('without caching', (done) => {
        t('http://A',
            done,
            url => {
                return nock(url).get('/').twice().reply(200, data);
            }, url => {
                return xhr.fetch(url);
            }, (url, response) => {
                response.status.should.equal(200);
                response.headers.get('Content-Type').should.equal('application/json');
            }, (url, json) => {
                json.should.be.deep.equal(data);
                var _cache = new Cache('xhr', 1000);
                var emr = _cache.getItem(_cache.keyFromUrl(url));
                should.not.exist(emr);
            });
    });

    it('with caching disabled', (done) => {
        var d = new Date();
        d.setDate((new Date()).getDate() + 3);
        t('http://B',
            done,
            url => {
                return nock(url).get('/').twice().reply(200, data, {
                    'Expires': d.toUTCString()
                });
            }, url => {
                return xhr.fetch(url, {
                    cache: 'no-cache'
                });
            }, (url, response) => {
                response.status.should.equal(200);
                response.headers.get('Content-Type').should.equal('application/json');
            }, (url, json) => {
                json.should.be.deep.equal(data);
                var _cache = new Cache('xhr', 1000);
                var emr = _cache.getItem(_cache.keyFromUrl(url));
                should.not.exist(emr);
            });
    });


    it('with Expires', (done) => {
        var d = new Date();
        d.setDate((new Date()).getDate() + 3);
        t(xhr.url('http://C/', {
                arg0: 'val0',
                arg1: 42
            }),
            done,
            url => {
                var u = url.split('?');
                return nock(u[0]).get('/?' + u[1]).reply(200, data, {
                    'Expires': d.toUTCString()
                });
            }, url => {
                return xhr.fetch(url);
            }, (url, response) => {
                response.status.should.equal(200);
                response.headers.get('Content-Type').should.equal('application/json');
                response.headers.get('Expires').should.equal(d.toUTCString());
            }, (url, json) => {
                json.should.be.deep.equal(data);
            }, null, (url, json) => {
                json.should.be.deep.equal(data);
                var _cache = new Cache('xhr', 1000);
                var r = _cache.getItem(_cache.keyFromUrl(url));
                r.headers['expires'][0].should.equal(d.toUTCString());
                JSON.parse(r.responseText).should.deep.equal(data);
            });
    });

    it('with Last-Modified', (done) => {
        var d1 = new Date(),
            d2 = new Date(),
            d3 = new Date();
        d1.setDate((new Date()).getDate() - 3);
        d2.setDate((new Date()).getDate() + 3);
        t(xhr.url('http://D/', {
                arg0: 'val0',
                arg1: 42
            }),
            done,
            url => {
                var u = url.split('?');
                return nock(u[0])
                    .matchHeader('If-Modified-Since', (v) => {
                        return !v || v == d3.toUTCString();
                    })
                    .get('/?' + u[1])
                    .reply(200, data, {
                        'Last-Modified': d3.toUTCString(),
                        'Expires': d1.toUTCString()
                    })
                    .get('/?' + u[1])
                    .reply(304, data, {
                        'Last-Modified': d3.toUTCString(),
                        'Expires': d2.toUTCString()
                    });
            }, url => {
                return xhr.fetch(url);
            }, (url, response) => {
                response.status.should.equal(200);
                response.headers.get('Content-Type').should.equal('application/json');
                response.headers.get('Expires').should.equal(d1.toUTCString());
            }, (url, json) => {
                json.should.be.deep.equal(data);
            }, (url, response) => {
                response.status.should.equal(200);
                response.headers.get('Content-Type').should.equal('application/json');
                response.headers.get('Expires').should.equal(d2.toUTCString());
            }, (url, json) => {
                json.should.be.deep.equal(data);
                var _cache = new Cache('xhr', 1000);
                var r = _cache.getItem(_cache.keyFromUrl(url));
                r.headers['expires'][0].should.equal(d2.toUTCString());
                JSON.parse(r.responseText).should.deep.equal(data);
            });
    });

    it('callbacks', (done) => {
        let c = 0;
        xhr.connectionStatusSubscribe(status => {
            ++c;
            if (c == 1) {
                status.should.equal(false);
            } else if (c == 2) {
                status.should.equal(true);
                done();
            }
        });
        t('http://E',
            done,
            url => {
                return nock(url).get('/').reply(0, {}).get('/').reply(200, {});
            }, url => {
                return xhr.fetch(url);
            }, () => {}, () => {});
    });
});
