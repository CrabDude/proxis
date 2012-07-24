var fs = require('fs'),
    expect = require('chai').expect,
    Q = require('../proxis'),
    originalQ = require('../node_modules/q');

describe('proxis', function () {
    it('should return an proxy to the original object', function() {
        Object.keys(Q(fs)).forEach(function(v) {
            expect(fs[v]).to.exist;
        })
    });
    it('should return non-function values from the original object', function() {
        expect(Q(process).pid).to.be.an.instanceof.Number;
        expect(Q(fs).readFile).to.be.an.instanceof.Function;
    });
    it('should return a promise when a function is called', function() {
        expect(Q.isPromise(Q(fs).readFile('./proxis.js'))).to.be.true
    });
    it('should return a proxy for child properties', function() {
        fs.readFile.hello = 'world'
        expect(Q(fs).readFile.hello).to.equal('world');
    });
    it('should not error when logging wrapped object with a non-configurable property', function() {
        var obj = Object.create({}, {
            'hello': {
                value: 'world',
                configurable: false
            }
        });
        expect(function() {
            console.log(Q(obj));
        }).to.not.throw(Error);
    })

    describe('wrap', function () {
        it('should return a promise', function () {
            var p = Q.defer().promise;

            p = Q.wrap(p);
            expect(Q.isPromise(p)).to.be.true;
        });
        it('should auto-wrap non-promise return values');
        it('should resolve on success', function (done) {
            var p = Q.resolve(true);

            Q.wrap(p).then(function (result) {
                expect(result).to.be.true;
            }).fin(done).end();
        });
        it('should reject on failure', function (done) {
            var p = Q.reject('Expected');

            Q.wrap(p).then(function (result) {
                throw 'Should have failed';
            }, function (error) {
                expect(error).to.equal('Expected');
            }).fin(done).end();
        });
        it('should call back on success', function (done) {
            var p = Q.resolve(true);

            Q.wrap(p, function (err, data) {
                expect(err).to.not.exist;
                expect(data).to.be.true;
                done();
            });
        });
        it('should call back on failure', function (done) {
            var p = Q.reject('Expected');

            Q.wrap(p, function (err, data) {
                expect(err).to.equal('Expected');
                expect(data).to.not.exist;
                done();
            });
        });
    });

    describe('promise.both', function() {
        it('should call the callback on success', function() {
            Q(fs).readFile('./proxis.js')
                .both(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
        });
        it('should call the callback on failure', function() {
            Q(fs).readFile('')
                .both(function(err) {
                    expect(err).to.exist;
                    done();
                });
        });
    })

    describe('lazy', function() {
        it('should return a function', function() {
            expect(Q.lazy(fs).readFile('./proxis.js')).to.be.instanceof.Function;
        });
        it('should return a promise when the function is called', function() {
           var fn = Q.lazy(fs).readFile('./proxis.js');
            expect(Q.isPromise(fn())).to.be.true;
        });
        it('should resolve to the same value as the non-proxied call', function(done) {
            Q.lazy(fs).readFile('./proxis.js')().then(function(res1) {
                fs.readFile('./proxis.js', function(err, res2) {
                    expect(err).to.not.exist;
                    expect(res1.toString()).to.equal(res2.toString());
                    done();
                });
            });
        });
        it('should delay execution of proxied function call', function(done) {
            var i = 0,
                j = 5,
                foo = {
                    bar: function(cb) {
                        i = j;
                        process.nextTick(cb);
                    }
                },
                fn = Q.lazy(foo).bar();

            expect(i).to.equal(0);

            fn().then(function() {
                expect(i).to.equal(j);
                done();
            }).fail(function(err) {
                expect(err).to.not.exist;
            });
        });
    });
});