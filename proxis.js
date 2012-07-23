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


function $xy(obj, opts, that) {
    // Don't proxy immutables
    if (['undefined', 'boolean', 'number', 'string'].indexOf(typeof obj) !== -1) return obj;

	opts = opts || {};

    var handler = {
        // Custom fundamental traps
        // Forward compatibility when getPropertyDescriptor becomes available?
        getPropertyDescriptor: function(name) {
            var desc = (Object.getPropertyDescriptor || Object.getOwnPropertyDescriptor).call(Object, obj, name);
            if (typeof desc !== 'undefined') { desc.configurable = true}
            return desc;
        },
        // Custom derived traps
        // Keep proxying for all properties
        get: function(receiver, name) {
            return $xy(obj[name], opts, obj);
        },

        // From http://wiki.ecmascript.org/doku.php?id=harmony:proxies&s=proxy#examplea_no-op_forwarding_proxy
        // Fundamental traps
        getOwnPropertyDescriptor: function(name) {
            var desc = Object.getOwnPropertyDescriptor(obj, name);
            if (typeof desc !== 'undefined') { desc.configurable = true}
            return desc;
        },
        getOwnPropertyNames: function() {
            return Object.getOwnPropertyNames(obj);
        },
        getPropertyNames: function() {
            return Object.getOwnPropertyNames(obj);
        },
        // Derived traps
        defineProperty: function(name, desc) {
            Object.defineProperty(obj, name, desc);
        },
        delete: function(name) {
            return delete obj[name];
        },
        fix: function() {
            if (Object.isFrozen(obj)) {
                var result = {};
                Object.getOwnPropertyNames(obj).forEach(function(name) {
                    result[name] = Object.getOwnPropertyDescriptor(obj, name);
                });
                return result;
            }
            // As long as obj is not frozen, the proxy won't allow itself to be fixed
            return undefined; // will cause a TypeError to be thrown
        },
        has: function(name) { return name in obj; },
        hasOwn: function(name) { return ({}).hasOwnProperty.call(obj, name); },
        set: function(receiver, name, val) { obj[name] = val; return true; }, // bad behavior when set fails in non-strict mode
        enumerate: function() {
            var result = [];
            for (var name in obj) {
                result.push(name);
            }
            return result;
        },
        keys: function() {
            return Object.keys(obj);
        }
    };

    // The actual function proxying
    var fn = function() {
        var args = [obj, that].concat(Array.prototype.slice.call(arguments));
        if (opts.isLazy === true) {
            return function() {
                return Q.ncall.apply(Q, args);
            };
        } else {
            return Q.ncall.apply(Q, args)
        }
    }

	return typeof obj === 'function' ? Proxy.createFunction(handler, fn, fn ) : Proxy.create(handler);
}

$xy.lazy = function(obj) {
	return $xy(obj, {isLazy: true});
};

$xy.__proto__ = Q;

module.exports = $xy;
