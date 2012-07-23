var Q = require('q');

Q.makePromise.prototype.wrap = function() {
	Array.prototype.unshift.call(arguments, this)
	Q.wrap.apply(Q, arguments)
	return this;
};

Q.makePromise.prototype.both = function() {
	return Q.wrap.apply(Q, [this].concat(Array.prototype.slice.call(arguments)));
};

Q.wrap = function wrap(promise, callback) {
    if (callback == null) {
        return promise;
    }

    // TODO: Are there times where we want to auto-reject?
    if (!Q.isPromise(promise)) {
        promise = Q.resolve(promise);
    }

    return promise.then(function (result) {
        callback(null, result);
    }, function (error) {
        callback(error, null); // TODO: Make sure error is of a sane format?
    });
};


function $xy(reified, opts, that) {
    if (typeof reified !== 'object' && typeof reified !== 'function') return reified;

	opts = opts || {};

    var handler = {
        getPropertyDescriptor: function(name) {
            return Object.getOwnPropertyDescriptor(reified, name);
        },
        getOwnPropertyDescriptor: function(name) {
            var desc = Object.getOwnPropertyDescriptor(reified, name);
            if (desc.configurable !== true) return;
            return desc;
        },
        getOwnPropertyNames: function() {
            return Object.getOwnPropertyNames(reified);
        },
        getPropertyNames: function() {
            return Object.getOwnPropertyNames(reified);
        },
        get: function(receiver, name) {
            return $xy(reified[name], opts, reified);
        }
    };
    var fn = function() {
        var args = [reified, that].concat(Array.prototype.slice.call(arguments));
        if (opts.isLazy === true) {
            return function() {
                return Q.ncall.apply(Q, args);
            };
        } else {
            return Q.ncall.apply(Q, args)
        }
    }

	return typeof reified === 'function' ? Proxy.createFunction(handler, fn, fn ) : Proxy.create(handler);
}

$xy.lazy = function(reified) {
	return $xy(reified, {isLazy: true});
};

$xy.__proto__ = Q;

module.exports = $xy;
