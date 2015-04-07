import chai from 'chai';
import sinon from 'sinon';
import xhr from '../index';

chai.should();

describe('get', function () {
    beforeEach(function() {
        this.xhr = sinon.stub();
        //this.xhr = sinon.useFakeXMLHttpRequest();
        //var server = sinon.fakeServer.create();
        //this.xhr = sinon.xhr;
    });

    afterEach(function(){
        //this.xhr.restore();
    });

    it('get caching', function () {
        console.log('Test OK');
    });
});
