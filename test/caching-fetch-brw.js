import chai from 'chai';
import xhr from '../src/caching-fetch';
import 'isomorphic-fetch';
import {Cache} from 'heap-local-storage';

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

    /*
     * This test should fail, because timout is not part of API (yet?).
     *
    it('real request with timeout', done => {
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
    */
});

describe('# caching-fetch', () => {

    it('real request', done => {
        xhr.fetch('http://echo.jsontest.com/meaning/42/')
            .then(response => {
                response.status.should.equal(200);
		response.headers.get('Content-Type').should.contains('json');
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
});

