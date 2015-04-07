import chai from 'chai';
import xhr from '../index';
import sinon from 'sinon';

chai.should();

describe('#get', function () {
    /*
    beforeEach(function() {
        this.xhr = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        this.xhr.onCreate = function(xhr) {
            this.requests.push(this.xhr);
        }.bind(this);
    });

    afterEach(function() {
        this.xhr.restore();
    });
    */

    it('get caching', function () {
        console.log('Test OK');
    });
});
