import chai from 'chai';
import xhr from '../index';
import sinon from 'sinon';

describe('#get', () => {

    let _xhr;
    let _requests;
    let should = chai.should();

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
                var r = JSON.parse(localStorage.getItem('xhr|r|C{"arg0":"val0","arg1":42}'));
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
                var r = JSON.parse(localStorage.getItem('xhr|r|D{"arg0":"val0","arg1":42}'));
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
