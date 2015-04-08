import chai from 'chai';
import xhr from '../index';

chai.should();

describe('get', function () {

    beforeEach(function () {
        this._xhr = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        this._xhr.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    afterEach(function () {
        this._xhr.restore();
    });

    it('get caching', function () {
        console.log('Test OK');
    });
});
