import chai from 'chai';
import xhr from '../index';
import sinon from 'sinon';

chai.should();

describe('#get', () => {

    let self = this;
    let _xhr;
    let _requests;

    beforeEach(() => {
        _xhr = sinon.useFakeXMLHttpRequest();
        _requests = [];
        _xhr.onCreate = (xhr) => {
            _requests.push(xhr);
        }.bind(self);
    });

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        _xhr.restore();
    });

    it('get request without caching', (done) => {
        var data = {someField:'someValue'};
        var jsonData = JSON.stringify(data);
        xhr.get('A', {}, {}).then((responseText) => {
            var res = JSON.parse(responseText);
            res.should.deep.equal(data);
            done();
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json'
        }, jsonData);
    });

    it('get request with Expires', (done) => {
        var data = {
            someField: 'someValue'
        };
        var jsonData = JSON.stringify(data);
        var d = new Date();
        d.setDate((new Date()).getDate() + 3);
        xhr.get('A', {arg0:'val0', arg1:42}, {}).then((responseText) => {
            var res = JSON.parse(responseText);
            res.should.deep.equal(data);
            var e = localStorage.getItem('xhr|e|A{"arg0":"val0","arg1":42}');
            e.should.equal(d.toUTCString());
            var r = JSON.parse(localStorage.getItem('xhr|r|A{"arg0":"val0","arg1":42}'));
            r.should.deep.equal(data);
            done();
        });
        _requests[0].respond(200, {
            'Content-Type': 'application/json',
            'Expires': d.toUTCString()
        }, jsonData);
    });
});
