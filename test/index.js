import chai from 'chai';
import xhr from '../index';
import sinon from 'sinon';
import LZString from 'lz-string';
import * as lsarray from '../ls-array';
import * as imap from '../indexed-map';
import * as cache from '../cache';


let should = chai.should();

describe('#LSArray', () => {

    let arr;

    beforeEach(() => {
        localStorage.clear();
        arr = new lsarray.LSArray('tmp');
    });

    it('len and prefix', () => {
        arr.push(42);
        arr.push('test');
        arr.len().should.equal(2);
        should.exist(localStorage.getItem('tmp|0'));
        should.exist(localStorage.getItem('tmp|1'));
        should.exist(localStorage.getItem('tmp|l'));
    });

    it('push and pop', () => {
        arr.push(42);
        arr.push('test');
        arr.pop().should.equal('test');
        arr.pop().should.equal('42');
        arr.len().should.equal(0);
    });

    it('get and set', () => {
        arr.push(1);
        arr.push(2);
        arr.getAt(0).should.equal('1');
        arr.getAt(1).should.equal('2');
        arr.setAt(0, 42);
        arr.getAt(0).should.equal('42');
        arr.len().should.equal(2);
    });

    it('len and clear', () => {
        for (let i = 0; i < 42; ++i) {
            arr.push(42);
            should.exist(localStorage.getItem('tmp|' + i));
        }
        arr.len().should.equal(42);
        arr.clear();
        arr.len().should.equal(0);
        for (let i = 0; i < 42; ++i) {
            should.not.exist(localStorage.getItem('tmp|' + i));
        }
    });

    it('out of range', () => {
        arr.push(42);
        arr.push('test');
        chai.expect(function () {
            arr.getAt(42);
        }).to.throw('Index out of range');
        chai.expect(function () {
            arr.setAt(42, 42);
        }).to.throw('Index out of range');
    });
});

describe('#IndexedMap', () => {

    let map;

    beforeEach(() => {
        localStorage.clear();
        map = new imap.IndexedMap('tmp');
    });

    it('len and prefix', () => {
        map.push({ d: 42, k: 777, p: 55 });
        map.push({ d: 'test', k: 'xxx', p: 77 });
        map.len().should.equal(2);
        should.exist(localStorage.getItem('tmp|i|0'));
        should.exist(localStorage.getItem('tmp|i|1'));
        should.exist(localStorage.getItem('tmp|i|l'));
        should.exist(localStorage.getItem('tmp|d|777'));
        should.exist(localStorage.getItem('tmp|d|xxx'));
    });

    it('push and pop', () => {
        map.push({ d: 42, k: 777, p: 55 });
        map.push({ d: 'test', k: 'xxx', p: 77 });
        map.pop().should.deep.equal({ d: 'test', k: 'xxx', p: 77 });
        map.pop().should.deep.equal({ d: 42, k: 777, p: 55 });
        map.len().should.equal(0);
        should.not.exist(localStorage.getItem('tmp|i|0'));
        should.not.exist(localStorage.getItem('tmp|i|1'));
        should.not.exist(localStorage.getItem('tmp|d|777'));
        should.not.exist(localStorage.getItem('tmp|d|xxx'));
    });

    it('get and set', (done) => {
        map.push({ d: 42, k: 555, p: 55 });
        map.push({ d: 42, k: 777, p: 55 });
        map.push({ d: 'test', k: 'xxx', p: 77 });
        map.getItem(777).should.deep.equal({ d: 42, k: 777, p: 55 });
        map.getItem('xxx').should.deep.equal({ d: 'test', k: 'xxx', p: 77 });
        map.updateItem({ d: 'don\'t panic', k: 777, p: 42 }, (h, i) => {
            map.should.equal(h);
            i.should.equal(1);
            map.getItem(777).should.deep.equal({ d: 'don\'t panic', k: 777, p: 42 });
            map.len().should.equal(3);
            done();
        });
    });

    it('len and clear', () => {
        for (let i = 0; i < 42; ++i) {
            map.push({ d: 42, k: i, p: 55 });
            should.exist(localStorage.getItem('tmp|d|' + i));
        }
        map.len().should.equal(42);
        map.clear();
        map.len().should.equal(0);
        for (let i = 0; i < 42; ++i) {
            should.not.exist(localStorage.getItem('tmp|d|' + i));
        }
    });

    it('absent key', () => {
        map.push({ d: 42, k: 5, p: 55 });
        should.not.exist(map.getItem(42));
        chai.expect(function () {
            map.updateItem({ d: 'don\'t panic', k: 777, p: 42 }, (h, i) => {});
        }).to.throw('Attempt to change unexisting item');
    });

    it('less', () => {
        map.push({ d: 42, k: 777, p: 88 });
        map.push({ d: 'test', k: 'xxx', p: 77 });
        map.less(0, 1).should.equal(false);
        map.less(1, 0).should.equal(true);
    });

    it('swap', () => {
        map.push({ d: 42, k: 777, p: 55 });
        map.push({ d: 'test', k: 'xxx', p: 77 });
        map.swap(0, 1);
        map.getItem(777).should.deep.equal({ d: 42, k: 777, p: 55 });
        map.getItem('xxx').should.deep.equal({ d: 'test', k: 'xxx', p: 77 });
        map.pop().should.deep.equal({ d: 42, k: 777, p: 55 });
        map.pop().should.deep.equal({ d: 'test', k: 'xxx', p: 77 });
    });

    it('same elements', () => {
        chai.expect(function () {
            map.push({ d: 'test', k: 'xxx', p: 77 });
            map.push({ d: 'test', k: 'xxx', p: 77 });
        }).to.throw('Attempt to push duplicate item');
    });

    it('remove', (done) => {
        map.push({ d: 42, k: 555, p: 55 });
        map.push({ d: 42, k: 777, p: 55 });
        map.push({ d: 'test', k: 'xxx', p: 77 });
        map.removeItem(777, (h, i) => {
            map.should.equal(h);
            i.should.equal(1);
            map.getItem(777).should.deep.equal({ d: 42, k: 777, p: 55 });
            map.len().should.equal(3);
            done();
        });
    });

    it('existing data', () => {
        map.push({ d: 42, k: 555, p: 55 });
        map.push({ d: 42, k: 777, p: 55 });
        map.push({ d: 'test', k: 'xxx', p: 77 });
        let map1 = new imap.IndexedMap('tmp');
        map.getItem(777).should.deep.equal({ d: 42, k: 777, p: 55 });
        map.getItem('xxx').should.deep.equal({ d: 'test', k: 'xxx', p: 77 });
    });
    
});

describe('#Cache', () => {

    let c;

    beforeEach(() => {
        localStorage.clear();
        c = new cache.Cache('tmp', 10);
    });

    it('key from url', () => {
        let k1 = c.keyFromUrl('http://www.example.com/sample', {a: 1, b: 'zzz', c: 'aaa'});
        let k2 = c.keyFromUrl('http://www.example.com/sample', {b: 'zzz', a: 1, c: 'aaa'});
        let k3 = c.keyFromUrl('http://www.example.com/sample', {b: 'xxx', a: 1, c: 'aaa'});
        let k4 = c.keyFromUrl('http://www.example.com/simple', {b: 'zzz', a: 1, c: 'aaa'});
	k1.should.equal(k2);
	k1.should.not.equal(k3);
	k1.should.not.equal(k4);
    });

    it('len and prefix', () => {
        c.addItem(42, 42, 1);
        c.addItem(50, {}, 2);
        c.addItem('xxx', { a: 42 }, 3);
        c.addItem(70, { b: { c: 'xxx' } }, 4);
        should.exist(localStorage.getItem('tmp|i|0'));
        should.exist(localStorage.getItem('tmp|i|1'));
        should.exist(localStorage.getItem('tmp|i|2'));
        should.exist(localStorage.getItem('tmp|i|3'));
        should.exist(localStorage.getItem('tmp|i|l'));
        should.exist(localStorage.getItem('tmp|d|42'));
        should.exist(localStorage.getItem('tmp|d|50'));
        should.exist(localStorage.getItem('tmp|d|70'));
        should.exist(localStorage.getItem('tmp|d|xxx'));
        localStorage.getItem('tmp|i|l').should.equal('4');
    });

    it('get and update', () => {
        c.addItem(42, 42, 1);
        c.addItem(50, {}, 2);
        c.addItem('xxx', { a: 42 }, 3);
        c.addItem(70, { b: { c: 'xxx' } }, 4);
	c.getItem('xxx').should.deep.equal({ a: 42 });
	c.getItem(70).should.deep.equal({ b: { c: 'xxx' } });
	c.updateItem(50, {ddd:'zzz'}, 15);
	c.getItem(50).should.deep.equal({ddd:'zzz'});
    });

    it('remove and clear', () => {
        c.addItem(42, 42, 1);
        c.addItem(50, {}, 2);
        c.addItem('xxx', { a: 42 }, 3);
        c.addItem(70, { b: { c: 'xxx' } }, 4);
	c.removeItem('xxx');
        should.exist(localStorage.getItem('tmp|i|0'));
        should.exist(localStorage.getItem('tmp|i|1'));
        should.exist(localStorage.getItem('tmp|i|2'));
        should.not.exist(localStorage.getItem('tmp|i|3'));
        should.exist(localStorage.getItem('tmp|i|l'));
        should.exist(localStorage.getItem('tmp|d|42'));
        should.exist(localStorage.getItem('tmp|d|50'));
        should.exist(localStorage.getItem('tmp|d|70'));
        should.not.exist(localStorage.getItem('tmp|d|xxx'));
        localStorage.getItem('tmp|i|l').should.equal('3');
	c.clear();
        should.not.exist(localStorage.getItem('tmp|i|0'));
        should.not.exist(localStorage.getItem('tmp|i|1'));
        should.not.exist(localStorage.getItem('tmp|i|2'));
        should.not.exist(localStorage.getItem('tmp|i|3'));
        should.exist(localStorage.getItem('tmp|i|l'));
        should.not.exist(localStorage.getItem('tmp|d|42'));
        should.not.exist(localStorage.getItem('tmp|d|50'));
        should.not.exist(localStorage.getItem('tmp|d|70'));
        should.not.exist(localStorage.getItem('tmp|d|xxx'));
        localStorage.getItem('tmp|i|l').should.equal('0');
    });

    it('eviction', () => {
        c.addItem(42, 42, 100);
        c.addItem(50, {}, 32);
        for (let i = 0; i < 20; ++i) {
            c.addItem('key' + i, {
                data: i
            }, Math.trunc(Math.random() * 20));
        }
        localStorage.getItem('tmp|i|l').should.equal('10');
        should.exist(localStorage.getItem('tmp|d|42'));
        should.exist(localStorage.getItem('tmp|d|50'));
        for (let i = 20; i < 40; ++i) {
            c.addItem('key' + i, {
                data: i
            }, Math.trunc(Math.random() * 20 + 110));
        }
        localStorage.getItem('tmp|i|l').should.equal('10');
        should.not.exist(localStorage.getItem('tmp|d|42'));
        should.not.exist(localStorage.getItem('tmp|d|50'));
        for (let i = 40; i < 60; ++i) {
            c.addItem('key' + i, {
                data: i
            }, Math.trunc(Math.random() * 20));
        }
        localStorage.getItem('tmp|i|l').should.equal('10');
	let n = 0;
        for (let i = 0; i < 10; ++i) {
            if (JSON.parse(localStorage.getItem('tmp|i|' + i)).p < 100) {
                ++n;
            }
        }
	n.should.equal(1);
    });

    it('same elements', () => {
        chai.expect(function () {
            c.addItem(42, 42, 100);
            c.addItem(42, 42, 100);
        }).to.throw('Attempt to push duplicate item');
    });

    it('performance (long test, see console)', function(done) {
        this.timeout(600000);
        let measure = (iterations, f) => {
            let start = performance.now();
            for (let i = 0; i < iterations; ++i) {
                f();
            }
            return performance.now() - start;
        };

	let putThenGet = (data) => {
	    let key = Math.random().toString(36).slice(2);
	    c.addItem(key, data, 0);
	    let d = c.getItem(key);
	    d.slice(0, 5).should.equal(data.slice(0, 5));
	};

	let generateData = (len) => {
	    let data = '';
	    while (data.length < len) {
	        data += Math.random().toString(36).slice(2);
	    }
	    return data.slice(0, len);
	};

	let exec = (len, iterations) => {
	    let data = generateData(len);
	    let dt = measure(iterations, () => {
	        putThenGet(data);
	    });
	    console.log(iterations + ' iterations with string of length ' +
			    len + ' took: ' + dt.toFixed(2) + 'ms (' +
				    (dt/iterations).toFixed(2) + 'ms per iteration)');
	};

	console.log('=========================');
	console.log('This test is quite long, please wait...');
	console.log('Cache of size 10:');
	exec(100, 1000);
	exec(1000, 1000);
	exec(10000, 1000);
	console.log('Cache of size 100:');
	localStorage.clear();
        c = new cache.Cache('tmp', 100);
	exec(100, 1000);
	exec(1000, 1000);
	exec(10000, 1000);
	console.log('Cache of size 1000:');
	localStorage.clear();
        c = new cache.Cache('tmp', 1000);
	exec(100, 1000);
	exec(1000, 1000);
	exec(10000, 1000);
	console.log('=========================');

        done();
    });
});

describe('#get', () => {

    let _xhr;
    let _requests;

    beforeEach(() => {
        _xhr = sinon.useFakeXMLHttpRequest();
        _requests = [];
        _xhr.onCreate = (xhr) => {
            _requests.push(xhr);
        };
    });

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        _xhr.restore();
    });

    it('get request without caching', (done) => {
        var data = {
            someField: 'someValue'
        };
        var jsonData = JSON.stringify(data);
        xhr.get('A').then((responseText) => {
            var res = JSON.parse(responseText);
            res.should.deep.equal(data);
            should.not.exist(localStorage.getItem('xhr|e|A{}'));
            should.not.exist(localStorage.getItem('xhr|r|A{}'));
            done();
        }).error((status, responseText) => {
            throw 'Error, responseText: ' + responseText;
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json'
        }, jsonData);
    });

    it('get request with caching disabled', (done) => {
        var data = {
            someField: 'someValue'
        };
        var jsonData = JSON.stringify(data);
        var d = new Date();
        d.setDate((new Date()).getDate() + 3);
        xhr.get('B', null, {
            cache: false
        }).then((responseText) => {
            var res = JSON.parse(responseText);
            res.should.deep.equal(data);
            should.not.exist(localStorage.getItem('xhr|e|B{}'));
            should.not.exist(localStorage.getItem('xhr|r|B{}'));
            done();
        }).error((status, responseText) => {
            throw 'Error, responseText: ' + responseText;
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json',
            'Expires': d.toUTCString()
        }, jsonData);
    });

    it('get request with Expires', (done) => {
        var data = {
            someField: 'someValue'
        };
        var jsonData = JSON.stringify(data);
        var d = new Date();
        d.setDate((new Date()).getDate() + 3);
        xhr.get('C', {
            arg0: 'val0',
            arg1: 42
        }).then((responseText1) => {
            xhr.get('C', {
                arg0: 'val0',
                arg1: 42
            }).then((responseText2) => {
                responseText1.should.equal(responseText2);
                var res = JSON.parse(responseText1);
                res.should.deep.equal(data);
                var e = localStorage.getItem('xhr|e|C{"arg0":"val0","arg1":42}');
                e.should.equal(d.toUTCString());
                var r = JSON.parse(LZString.decompressFromUTF16(localStorage.getItem('xhr|r|C{"arg0":"val0","arg1":42}')));
                r.should.deep.equal(data);
                _requests.length.should.equal(1);
                done();
            }).error((status, responseText) => {
                throw 'Error, responseText: ' + responseText;
            });
        }).error((status, responseText) => {
            throw 'Error, responseText: ' + responseText;
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json',
            'Expires': d.toUTCString()
        }, jsonData);
    });

    it('get request with Last-Modified', (done) => {
        var data = {
            someField: 'someValue'
        };
        var jsonData = JSON.stringify(data);
        var d1 = new Date(),
            d2 = new Date(),
            d3 = new Date();
        d1.setDate((new Date()).getDate() - 3);
        d2.setDate((new Date()).getDate() + 3);

        xhr.get('D', {
            arg0: 'val0',
            arg1: 42
        }).then((responseText1) => {
            xhr.get('D', {
                arg0: 'val0',
                arg1: 42
            }).then((responseText2) => {
                responseText1.should.equal(responseText2);
                var res = JSON.parse(responseText1);
                res.should.deep.equal(data);
                var e = localStorage.getItem('xhr|e|D{"arg0":"val0","arg1":42}');
                e.should.equal(d2.toUTCString());
                var r = JSON.parse(LZString.decompressFromUTF16(localStorage.getItem('xhr|r|D{"arg0":"val0","arg1":42}')));
                r.should.deep.equal(data);
                d3.toUTCString().should.equal(_requests[1].requestHeaders['If-Modified-Since']);
                done();
            }).error((status, responseText) => {
                throw 'Error, responseText: ' + responseText;
            });
            _requests[1].respond(304, {
                'Content-Type': 'application/json',
                'Last-Modified': d3.toUTCString(),
                'Expires': d2.toUTCString()
            }, jsonData);
        }).error((status, responseText) => {
            throw 'Error, responseText: ' + responseText;
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json',
            'Last-Modified': d3.toUTCString(),
            'Expires': d1.toUTCString()
        }, jsonData);
    });

    it('default settings', (done) => {
        xhr.get('E').then((responseText) => {
            _requests[0].requestHeaders['Content-Type'].should.equal('application/json');
            _requests[0].timeout.should.equal(5000);
            done();
        }).error((status, responseText) => {
            throw 'Error, responseText: ' + responseText;
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json',
            'Expires': new Date().toUTCString()
        }, '');
    });

    it('default settings (changed)', (done) => {
        xhr.setDefaultSettings({
            headers: {
                'Content-Type': 'text/html'
            },
            xhr: {
                timeout: 3000
            }
        });
        xhr.get('F').then((responseText) => {
            _requests[0].requestHeaders['Content-Type'].should.equal('text/html');
            _requests[0].timeout.should.equal(3000);
            done();
        }).error((status, responseText) => {
            throw 'Error, responseText: ' + responseText;
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json',
            'Expires': new Date().toUTCString()
        }, '');
    });

    it('settings (merged)', (done) => {
        xhr.setDefaultSettings({
            headers: {
                'Content-Type': 'application/json'
            },
            xhr: {
                timeout: 5000
            }
        });
        xhr.get('G', {}, {
            headers: {
                'Content-Type': 'text/html'
            }
        }).then((responseText) => {
            _requests[0].requestHeaders['Content-Type'].should.equal('text/html');
            _requests[0].timeout.should.equal(5000);
            done();
        }).error((status, responseText) => {
            throw 'Error, responseText: ' + responseText;
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json',
            'Expires': new Date().toUTCString()
        }, '');
    });

    it('callbacks', (done) => {
        let c = 0;
        xhr.connectionStatusSubscribe((status) => {
            ++c;
            if (c == 1) {
                status.should.equal(false);
            } else if (c == 2) {
                status.should.equal(true);
                done();
            }
        });
        xhr.get('H').always(() => {
            xhr.get('I');
            _requests[1].respond(200, {
                'Content-Type': 'application/json',
                'Expires': new Date().toUTCString()
            }, '');
        });
        _requests[0].respond(0, {
            'Content-Type': 'application/json',
            'Expires': new Date().toUTCString()
        }, '');
    });
});
