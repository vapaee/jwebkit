/**
 * @license almond 0.3.0 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

(function (_requirejs, _require, _define) {
    var requirejs = _requirejs, require = _require, define = _define;
    if (typeof requirejs == "undefined") {
        window.jwebkit_must_require = true;
    } else {
        
    }
    
if (typeof requirejs == "undefined") {
    
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true,
        fake: true
    };

}());

};/*!
 * jQuery JavaScript Library v3.0.0-pre
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2016-03-27T22:52Z
 */
( function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Support: Firefox 18+
// Can't be in strict mode, several libs including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
//"use strict";

var arr = [];

var document = window.document;

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var support = {};


	function DOMEval( code, doc ) {
		doc = doc || document;

		var script = doc.createElement( "script" );

		script.text = code;
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}


var
	version = "3.0.0-pre",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android<4.1
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return just the one element from the set
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return all the elements in a clean array
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = jQuery.isArray( copy ) ) ) ) {

					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray( src ) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject( src ) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isFunction: function( obj ) {
		return jQuery.type( obj ) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {

		// As of jQuery 3.0, isNumeric is limited to
		// strings and numbers (primitives or objects)
		// that can be coerced to finite numbers (gh-2662)
		var type = jQuery.type( obj );
		return ( type === "number" || type === "string" ) &&

			// parseFloat NaNs numeric-cast false positives ("")
			// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
			// subtraction forces infinities to NaN
			!isNaN( obj - parseFloat( obj ) );
	},

	isPlainObject: function( obj ) {
		var key;

		// Not plain objects:
		// - Any object or value whose internal [[Class]] property is not "[object Object]"
		// - DOM nodes
		// - window
		if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		// Not own constructor property must be Object
		if ( obj.constructor &&
				!hasOwn.call( obj, "constructor" ) &&
				!hasOwn.call( obj.constructor.prototype || {}, "isPrototypeOf" ) ) {
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own
		for ( key in obj ) {}

		return key === undefined || hasOwn.call( obj, key );
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}

		// Support: Android<4.0 (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call( obj ) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		DOMEval( code );
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Support: IE9-11+
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// Support: Android<4.1
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android<4.1, PhantomJS<2
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

// JSHint would error on this code due to the Symbol not being defined in ES5.
// Defining this global in .jshintrc would create a danger of using the global
// unguarded in another place, it seems safer to just disable JSHint for these
// three lines.
/* jshint ignore: start */
if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}
/* jshint ignore: end */

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
function( i, name ) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
} );

function isArrayLike( obj ) {

	// Support: iOS 8.2 (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.0
 * https://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2016-01-04
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" + ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	disabledAncestor = addCombinator(
		function( elem ) {
			return elem.disabled === true;
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {

		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
			setDocument( context );
		}
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

				// ID selector
				if ( (m = match[1]) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( (elem = context.getElementById( m )) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && (elem = newContext.getElementById( m )) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[2] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( (m = match[3]) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!compilerCache[ selector + " " ] &&
				(!rbuggyQSA || !rbuggyQSA.test( selector )) ) {

				if ( nodeType !== 1 ) {
					newContext = context;
					newSelector = selector;

				// qSA looks outside Element context, which is not what we want
				// Thanks to Andrew Dupont for this workaround technique
				// Support: IE <=8
				// Exclude object elements
				} else if ( context.nodeName.toLowerCase() !== "object" ) {

					// Capture the context ID, setting it first if necessary
					if ( (nid = context.getAttribute( "id" )) ) {
						nid = nid.replace( rcssescape, fcssescape );
					} else {
						context.setAttribute( "id", (nid = expando) );
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[i] = "#" + nid + " " + toSelector( groups[i] );
					}
					newSelector = groups.join( "," );

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;
				}

				if ( newSelector ) {
					try {
						push.apply( results,
							newContext.querySelectorAll( newSelector )
						);
						return results;
					} catch ( qsaError ) {
					} finally {
						if ( nid === expando ) {
							context.removeAttribute( "id" );
						}
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement("fieldset");

	try {
		return !!fn( el );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}
		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {
	// Known :disabled false positives:
	// IE: *[disabled]:not(button, input, select, textarea, optgroup, option, menuitem, fieldset)
	// not IE: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Check form elements and option elements for explicit disabling
		return "label" in elem && elem.disabled === disabled ||
			"form" in elem && elem.disabled === disabled ||

			// Check non-disabled form elements for fieldset[disabled] ancestors
			"form" in elem && elem.disabled === false && (
				// Support: IE6-11+
				// Ancestry is covered for us
				elem.isDisabled === disabled ||

				// Otherwise, assume any non-<option> under fieldset[disabled] is disabled
				/* jshint -W018 */
				elem.isDisabled !== !disabled &&
					("label" in elem || !disabledAncestor( elem )) !== disabled
			);
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9-11, Edge
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	if ( preferredDoc !== document &&
		(subWindow = document.defaultView) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( el ) {
		el.className = "i";
		return !el.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( el ) {
		el.appendChild( document.createComment("") );
		return !el.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var m = context.getElementById( id );
				return m ? [ m ] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( el ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement("input");
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll(":enabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll(":disabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( el ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === document ? -1 :
				b === document ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		!compilerCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return (sel + "").replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || (node[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								(outerCache[ node.uniqueID ] = {});

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {
							// Use previously-cached element index if available
							if ( useCache ) {
								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {
								// Use the same loop as above to seek `elem` from the start
								while ( (node = ++nodeIndex && node && node[ dir ] ||
									(diff = nodeIndex = 0) || start.pop()) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] || (node[ expando ] = {});

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												(outerCache[ node.uniqueID ] = {});

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( (oldCache = uniqueCache[ key ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context === document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					if ( !context && elem.ownerDocument !== document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context || document, xml) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				support.getById && context.nodeType === 9 && documentIsHTML &&
				Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( el ) {
	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement("fieldset") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( el ) {
	return el.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;



var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		} );

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) > -1 ) !== not && elem.nodeType === 1;
	} );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnotwhite = ( /\S+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( jQuery.isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && jQuery.type( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = jQuery.isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this === promise ? newDefer.promise() : this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this === promise ? undefined : this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( jQuery.isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notify )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )(
											that || deferred.promise(), args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that || deferred.promise(),
													args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function() {
		var method, resolveContexts,
			i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length,

			// the master Deferred.
			master = jQuery.Deferred(),

			// Update function for both resolving subordinates
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						master.resolveWith(
							resolveContexts.length === 1 ? resolveContexts[ 0 ] : resolveContexts,
							resolveValues
						);
					}
				};
			};

		// Add listeners to promise-like subordinates; treat others as resolved
		if ( length > 0 ) {
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {

				// jQuery.Deferred - treated specially to get resolve-sync behavior
				if ( resolveValues[ i ] &&
					jQuery.isFunction( ( method = resolveValues[ i ].promise ) ) ) {

					method.call( resolveValues[ i ] )
						.done( updateFunc( i ) )
						.fail( master.reject );

				// Other thenables
				} else if ( resolveValues[ i ] &&
					jQuery.isFunction( ( method = resolveValues[ i ].then ) ) ) {

					method.call(
						resolveValues[ i ],
						updateFunc( i ),
						master.reject
					);
				} else {
					updateFunc( i )( resolveValues[ i ] );
				}
			}

		// If we're not waiting on anything, resolve the master
		} else {
			master.resolveWith();
		}

		return master.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, stack );
	}
};




// The deferred used on DOM ready
var readyList;

jQuery.fn.ready = function( fn ) {

	// Add the callback
	jQuery.ready.promise().done( fn );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

/**
 * The ready event handler and self cleanup method
 */
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called
		// after the browser event has already occurred.
		// Support: IE9-10 only
		// Older IE sometimes signals "interactive" too soon
		if ( document.readyState === "complete" ||
			( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

			// Handle it asynchronously to allow scripts the opportunity to delay ready
			window.setTimeout( jQuery.ready );

		} else {

			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed );
		}
	}
	return readyList.promise( obj );
};

// Kick off the DOM ready check even if the user does not
jQuery.ready.promise();




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
					value :
					value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			len ? fn( elems[ 0 ], key ) : emptyGet;
};
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	/* jshint -W018 */
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ jQuery.camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ jQuery.camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ jQuery.camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( jQuery.camelCase );
			} else {
				key = jQuery.camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnotwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <= 35-45+
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :

					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? JSON.parse( data ) :
					data;
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE11+
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;
		return jQuery.css( elem, "display" ) === "none" ||
			!jQuery.contains( elem.ownerDocument, elem );
	};

var swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};




function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted,
		scale = 1,
		maxIterations = 20,
		currentValue = tween ?
			function() { return tween.cur(); } :
			function() { return jQuery.css( elem, prop, "" ); },
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = ( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		do {

			// If previous iteration zeroed out, double until we get *something*.
			// Use string for doubling so we don't accidentally see scale as unchanged below
			scale = scale || ".5";

			// Adjust and apply
			initialInUnit = initialInUnit / scale;
			jQuery.style( elem, prop, initialInUnit + unit );

		// Update scale, tolerating zero or NaN from tween.cur()
		// Break the loop if scale is unchanged or perfect, or if we've just had enough.
		} while (
			scale !== ( scale = currentValue() / initial ) && scale !== 1 && --maxIterations
		);
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) ),
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && jQuery.css( elem, "display" ) === "none" &&

					// Support: Firefox 43+
					// Don't set inline display on disconnected elements with computed display: none
					jQuery.contains( elem.ownerDocument, elem ) ) {

				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]+)/i );

var rscriptType = ( /^$|\/(?:java|ecma)script/i );



// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// Support: IE9
	option: [ 1, "<select multiple='multiple'>", "</select>" ],

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

// Support: IE9
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function getAll( context, tag ) {

	// Support: IE9-11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret = typeof context.getElementsByTagName !== "undefined" ?
			context.getElementsByTagName( tag || "*" ) :
			typeof context.querySelectorAll !== "undefined" ?
				context.querySelectorAll( tag || "*" ) :
			[];

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], ret ) :
		ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, contains, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( jQuery.type( elem ) === "object" ) {

				// Support: Android<4.1, PhantomJS<2
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android<4.1, PhantomJS<2
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		contains = jQuery.contains( elem.ownerDocument, elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( contains ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android<4.2
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE<=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
} )();


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE9 only
// See #13393 for more info
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = {};
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, j, ret, matched, handleObj,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
				// a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.rnamespace || event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, matches, sel, handleObj,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Support (at least): Chrome, IE9
		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		//
		// Support: Firefox<=42+
		// Avoid non-left-click in FF but don't block IE radio events (#3861, gh-2343)
		if ( delegateCount && cur.nodeType &&
			( event.type !== "click" || isNaN( event.button ) || event.button < 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && ( cur.disabled !== true || event.type !== "click" ) ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push( { elem: cur, handlers: matches } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: this, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: ( "altKey bubbles cancelable ctrlKey currentTarget detail eventPhase " +
		"metaKey relatedTarget shiftKey target timeStamp view which" ).split( " " ),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split( " " ),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: ( "button buttons clientX clientY offsetX offsetY pageX pageY " +
			"screenX screenY toElement" ).split( " " ),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX +
					( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) -
					( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY +
					( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) -
					( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: Safari 6-8+
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {

			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {

			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android<4.0
				src.returnValue === false ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

	// Support: IE 10-11, Edge 10240+
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

function manipulationTarget( elem, content ) {
	if ( jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return elem.getElementsByTagName( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.access( src );
		pdataCur = dataPriv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = concat.apply( [], args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		isFunction = jQuery.isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( isFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( isFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android<4.1, PhantomJS<2
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl ) {
								jQuery._evalUrl( node.src );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && jQuery.contains( node.ownerDocument, node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html.replace( rxhtmlTag, "<$1></$2>" );
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <= 35-45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <= 35-45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android<4.1, PhantomJS<2
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rmargin = ( /^margin/ );

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE<=11 only, Firefox<=30+ (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};

var documentElement = document.documentElement;



( function() {
	var pixelPositionVal, boxSizingReliableVal, pixelMarginRightVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE9-11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" +
		"padding:0;margin-top:1px;position:absolute";
	container.appendChild( div );

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {
		div.style.cssText =
			"box-sizing:border-box;" +
			"position:relative;display:block;" +
			"margin:auto;border:1px;padding:1px;" +
			"top:1%;width:50%";
		div.innerHTML = "";
		documentElement.appendChild( container );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";
		reliableMarginLeftVal = divStyle.marginLeft === "2px";
		boxSizingReliableVal = divStyle.width === "4px";

		// Support: Android 4.0 - 4.3 only
		// Some styles come back with percentage values, even though they shouldn't
		div.style.marginRight = "50%";
		pixelMarginRightVal = divStyle.marginRight === "4px";

		documentElement.removeChild( container );
	}

	jQuery.extend( support, {
		pixelPosition: function() {

			// This test is executed only once but we still do memoizing
			// since we can use the boxSizingReliable pre-computing.
			// No need to check if the test was already performed, though.
			computeStyleTests();
			return pixelPositionVal;
		},
		boxSizingReliable: function() {
			if ( boxSizingReliableVal == null ) {
				computeStyleTests();
			}
			return boxSizingReliableVal;
		},
		pixelMarginRight: function() {

			// Support: Android 4.0 - 4.3 only
			// We're checking for boxSizingReliableVal here instead of pixelMarginRightVal
			// since that compresses better and they're computed together anyway.
			if ( boxSizingReliableVal == null ) {
				computeStyleTests();
			}
			return pixelMarginRightVal;
		},
		reliableMarginLeft: function() {

			// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44+
			if ( boxSizingReliableVal == null ) {
				computeStyleTests();
			}
			return reliableMarginLeftVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,
		style = elem.style;

	computed = computed || getStyles( elem );

	// Support: IE9 only
	// getPropertyValue is only needed for .css('filter') (#12537)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelMarginRight() && rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE9-11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style;

// Return a css property mapped to a potentially vendor prefixed property
function vendorPropName( name ) {

	// Shortcut for names that are not vendor prefixed
	if ( name in emptyStyle ) {
		return name;
	}

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

function setPositiveNumber( elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?

		// If we already have the right measurement, avoid augmentation
		4 :

		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {

			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// At this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {

			// At this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// At this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var val,
		valueIsBorderBox = true,
		styles = getStyles( elem ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// Support: IE <= 11 only
	// Running getBoundingClientRect on a disconnected node
	// in IE throws an error.
	if ( elem.getClientRects().length ) {
		val = elem.getBoundingClientRect()[ name ];
	}

	// Support: IE11 only
	// In IE 11 fullscreen elements inside of an iframe have
	// 100x too small dimensions (gh-1764).
	if ( document.msFullscreenElement && window.top !== window ) {
		val *= 100;
	}

	// Some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {

		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test( val ) ) {
			return val;
		}

		// Check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox &&
			( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// Use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] ||
			( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			if ( type === "number" ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// Support: IE9-11+
			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				style[ name ] = value;
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] ||
			( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}
		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <= 11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
						swap( elem, cssShow, function() {
							return getWidthOrHeight( elem, name, extra );
						} ) :
						getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = extra && getStyles( elem ),
				subtract = extra && augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				);

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ name ] = value;
				value = jQuery.css( elem, name );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
				) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var hooks = Tween.propHooks[ this.prop ];

		this.pos = this.options.duration ?
			jQuery.easing[ this.easing ]( percent ) :
			percent;
		this.now = ( this.end - this.start ) * this.pos + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 &&
				( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null ||
					jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back Compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function raf() {
	if ( timerId ) {
		window.requestAnimationFrame( raf );
		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	/* jshint validthis: true */
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE 9 - 11
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* jshint -W083 */
			anim.done( function() {

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( jQuery.isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					jQuery.proxy( result.stop, result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnotwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	// Go to the end state if fx are off or if document is hidden
	if ( jQuery.fx.off || document.hidden ) {
		opt.duration = 0;

	} else {
		opt.duration = typeof opt.duration === "number" ?
			opt.duration : opt.duration in jQuery.fx.speeds ?
				jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = window.requestAnimationFrame ?
			window.requestAnimationFrame( raf ) :
			window.setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	if ( window.cancelAnimationFrame ) {
		window.cancelAnimationFrame( timerId );
	} else {
		window.clearInterval( timerId );
	}

	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android<4.4
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE<=11+
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE<=11+
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle;
		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ name ];
			attrHandle[ name ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				name.toLowerCase() :
				null;
			attrHandle[ name ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE 9-11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				return tabindex ?
					parseInt( tabindex, 10 ) :
					rfocusable.test( elem.nodeName ) ||
						rclickable.test( elem.nodeName ) && elem.href ?
							0 :
							-1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {
			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




var rclass = /[\t\r\n\f]/g;

function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnotwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 &&
					( " " + curValue + " " ).replace( rclass, " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnotwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 &&
					( " " + curValue + " " ).replace( rclass, " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( type === "string" ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = value.match( rnotwhite ) || [];

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
						"" :
						dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + getClass( elem ) + " " ).replace( rclass, " " )
					.indexOf( className ) > -1
			) {
				return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g,
	rspaces = /[\x20\t\r\n\f]+/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?

					// Handle most common string cases
					ret.replace( rreturn, "" ) :

					// Handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE10-11+
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					jQuery.trim( jQuery.text( elem ) ).replace( rspaces, " " );
			}
		},
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];
					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true

				// Previously, `originalEvent: {}` was set here, so stopPropagation call
				// would not be triggered on donor event, since in our own
				// jQuery.event.stopPropagation function we had a check for existence of
				// originalEvent.stopPropagation method, so, consequently it would be a noop.
				//
				// But now, this "simulate" function is used only for events
				// for which stopPropagation() is noop, so there is no need for that anymore.
				//
				// For the compat branch though, guard for "click" and "submit"
				// events is still used, but was moved to jQuery.event.stopPropagation function
				// because `originalEvent` should point to the original event for the constancy
				// with other events and for more focused logic
			}
		);

		jQuery.event.trigger( e, null, elem );

		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
} );

jQuery.fn.extend( {
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );




support.focusin = "onfocusin" in window;


// Support: Firefox 44+
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome 48+, Safari 9.0+
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = jQuery.now();

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9-11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {

			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} )
		.filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} )
		.map( function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					} ) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );
	originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
					jQuery( callbackContext ) :
					jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE8-11+
			// IE throws exception if url is malformed, e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE8-11+
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in uncached url if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rts, "" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce++ ) + uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );


jQuery._evalUrl = function( url ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,
		"throws": true
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( jQuery.isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = callback( "error" );

				// Support: IE9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" ).prop( {
					charset: s.scriptCharset,
					src: s.url
				} ).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	// Stop scripts or inline event handlers from being executed immediately
	// by using document.implementation
	context = context || ( support.createHTMLDocument ?
		document.implementation.createHTMLDocument( "" ) :
		document );

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = jQuery.trim( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( self, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var docElem, win, rect, doc,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Support: IE<=11+
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		rect = elem.getBoundingClientRect();

		// Make sure element is not hidden (display: none)
		if ( rect.width || rect.height ) {
			doc = elem.ownerDocument;
			win = getWindow( doc );
			docElem = doc.documentElement;

			return {
				top: rect.top + win.pageYOffset - docElem.clientTop,
				left: rect.left + win.pageXOffset - docElem.clientLeft
			};
		}

		// Return zeros for disconnected and hidden elements (gh-2310)
		return rect;
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
		// because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume getBoundingClientRect is there when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {

			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari<7-9.0+, Chrome<37-48+
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
		function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	}
} );

jQuery.parseJSON = JSON.parse;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}



var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( !noGlobal ) {
	window.jQuery = window.$ = jQuery;
}


return jQuery;
} ) );

define('jwk-ui/jwk.ui.core',[
    "jwebkit",
    "jquery"
], function( jwk, $ ) {
    // console.log("jwk-ui/jwk.ui.core ------------------------------------------------------------------------------------------------------");

    jwk.UserInterface = function () {
        var ui = this;
        jwk.Node.apply(ui);
    }
    
    jwk.UserInterface.prototype = new jwk.Node();
    jwk.UserInterface.prototype.constructor = jwk.UserInterface;
    
    jwk.ui = new jwk.UserInterface();
    var ui = jwk.ui;
    
    jwk.ui.window = new jwk.Object();
    window.onresize = function (event) {
        //console.debug("window.onresize 1");
        jwk.ui.window.trigger_fast("resize", event);
    };
    window.addEventListener("onresize", function (event) {
        //console.debug("window.onresize 2");
        jwk.ui.window.trigger_fast("resize", event);
    });            
    window.addEventListener("resize", function (event) {
        //console.debug("window.onresize 3");
        jwk.ui.window.trigger_fast("resize", event);
    });
    
    
    
    ui.on("handler:change:render", function (n, e) {
        // Alguien se suscribió al seteo del render para poder obtenerlo asi: jwk.ui.render
        if (typeof ui.render != "undefined") {
            // jwk.ui.render ya fue asignado por lo que el evento "change:render" ya fue gatillado.
            // Hay que volver a gatillar para que quien esté escuchando no lo haga por siempre        
            // console.error("ui.on('handler:change:render')","volvemos a gatillar!!!!!", ui.render, ui, e);
            var force = true;
            ui.set("render", ui.render, force);
        } else {
            // al parecer el render no ha sido asignado todavía por lo que el evento no ha sido gatillado.
            // Si todo va bien, ocurrirá en breve sin problemas.
            // console.error("ui.on('handler:change:render')", ui.render, ui, e);
        }
    });

    ui.which_browser = function() {
        try {
            if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0)
                return "opera";
        } catch (e) {}
        try {
            if (typeof InstallTrigger !== 'undefined')
                return "firefox";
        } catch (e) {}
        try {
            if (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0)
                return "safari";
        } catch (e) {}
        try {
            if (!!window.chrome && !isOpera)
                return "chrome";
        } catch (e) {}
        try {
            if (document.documentMode)
                return "ie";
        } catch (e) {}
    }
     
            
    ui.ontop = function(target, all) {
        // console.log("ui.ontop", arguments);
        // sort by the z-index if pressent
        var group = jwk.makeArray(all).sort(function(a,b) {
            return (parseInt($(a).css("zIndex"),10) || 0) - (parseInt($(b).css("zIndex"), 10) || 0);
        });
        if (!group.length) { return; }
        
        // get the lowest zIndex
        var min = parseInt($(group[0]).css("zIndex")) || 0;
        
        // get out the selected object 
        var pos = group.indexOf( target[0] );
        group.splice( pos, 1 );
        
        // Lo coloco al final
        group.push(target[0]);
        
        $(group).each(function(i) {
            $(this).css("zIndex", min + i);             
        });
    }    

    
    ui.css = function (source) {
        var browser = ui.which_browser();
        var css = {
            width:        source.width(),
            height:       source.height(),
            top:          source.css("top"),
            left:         source.css("left"),
            right:        source.css("right"),
            bottom:       source.css("bottom"),
            position:     source.css("position"),
            display:      source.css("display"),
            marginLeft:   source.css("margin-left"),
            marginRight:  source.css("margin-right"),
            marginTop:    source.css("margin-top"),
            marginBottom: source.css("margin-bottom"),
            margin:       source.css("margin")
        }        

        
        var style = source[0].style;
        if (style instanceof CSSStyleDeclaration) {
            for (var i=0; i<style.length; i++) {
                function camelize(str) {
                  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
                    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
                    return index == 0 ? match.toLowerCase() : match.toUpperCase();
                  });
                }                
                var name = camelize(style[i]); //.camelize(false);
                css[name] = style[name];
            }
        }
        
        switch (browser) {
            case "firefox":
                css.marginLeft   = style["marginLeft"];
                css.marginRight  = style["marginRight"];
                css.marginTop    = style["marginTop"];
                css.marginBottom = style["marginBottom"];
                css.left         = style["left"];
                css.right        = style["right"];
                css.top          = style["top"];
                css.bottom       = style["bottom"];

                css.left         = (css.left == "")         ? "auto" : css.left;
                css.right        = (css.right == "")        ? "auto" : css.right;
                css.top          = (css.top == "")          ? "auto" : css.top;
                css.bottom       = (css.bottom == "")       ? "auto" : css.bottom;
                
                var top          = (css.marginTop == "")    ? "0px" : css.marginTop;
                var left         = (css.marginLeft == "")   ? "0px" : css.marginLeft;
                var right        = (css.marginRight == "")  ? "0px" : css.marginRight;
                var bottom       = (css.marginBottom == "") ? "0px" : css.marginBottom;
                css.margin       = top + " " + right + " " + bottom + " " + left;
        }
        
        // TODO: tengo que arreglar el problema de que si es "" alguno me queda una separación de dos espacios seguidos cuando debería haber un 0px
        return css;
    }
    
        
    ui.snapshot = function (source) {
        // console.log("jwk.ui.snapshot", source);
        var css = ui.css(source);
        var shot = { css: css };

        // -- Horizontal --
        if (css["right"] == "auto" || typeof css["right"] == "undefined") {
            // no tiene rihgt
            shot.horizontal = "left";
        } else  {
            // tiene rihgt
            if (css["left"] == "auto" || typeof css["left"] == "undefined") {
                // no tiene left pero tiene rihgt
                // - righ   
                shot.horizontal = "right";                        
            } else  {
                // tiene left y right
                if (css["width"] == "auto" || typeof css["width"] == "undefined") {
                    // no tiene width pero tiene left y right
                    // - left & right                
                    shot.horizontal = "both";                            
                } else  {
                    // tiene width, left y right
                    // - left, right & width                
                    shot.horizontal = "margin";                            
                }                          
            }                    
        }

        // -- Vertical --
        if (css["bottom"] == "auto" || typeof css["bottom"] == "undefined") {
            // no tiene bottom
            shot.vertical = "top";
        } else  {
            // tiene bottom
            if (css["top"] == "auto" || typeof css["top"] == "undefined") {
                // no tiene top pero tiene bottom
                // - bottom   
                shot.vertical = "bottom";                        
            } else  {
                // tiene top y bottom
                if (css["height"] == "auto" || typeof css["height"] == "undefined") {
                    // no tiene width pero tiene top y bottom
                    // - top & right                
                    shot.vertical = "both";
                } else  {
                    // tiene width, top y bottom
                    // - top, bottom & width                
                    shot.vertical = "margin";                            
                }                          
            }                    
        }  

        var prop;
        var side;

        side = "height";
        prop = "top";
        var mystyle = source[0].style;
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        prop = "bottom";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }                
        side = "width";
        prop = "left";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        prop = "right";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        
        return shot;
    }
    
    
    ui.setDraggable = function (component, settings) {
        console.error("Esto lo usa alguien o lo puedo sacar?");
        alert("Opa, no podés sacar esto al parecer");
        return ui.render.set_draggable(settings);
    }
    
    return jwk.ui;

});

            
/*
- Existen varios orígenes posibles para los Settings
  - usuario: cuando el usuario invoca directamente o se extrae de un arbol de componentes
  - default: lo que no se setea por nadie
  - default heredado: son los defaults que tiene el componente base que estoy extendiendo.
- El componente tiene un objeto Data asociado de donde saca los datos para renderizar.
  - usuario: cuando el usuario invoca directamente o se extrae de un arbol de componentes
  - tree: es la data q se le da a todo el arbol de componentes, no solo al componente en cuestion



TODO: 
- Pasar a el formato prototype
- El JSON que define el component tree
  - 

*/



define('jwk-ui/jwk.ui.component',[
    "jwebkit",
    "./jwk.ui.core",
    "jquery"
], function(jwk, ui, $) {    
    jwk.ui.DEFAULT_NAMESPACE = "jwk-ui";        
    
    if (jwk.query.fn) jwk.query.fn.component = function( type, id ) {
        // console.log("jwk.query.fn.widget que pasa con esto?");
        var htmlid = "#"+id;
        var target = $(this).find(htmlid);            
        var widget = null;
        if (target.size() > 0) {
            widget = target.data(type);
            if (widget) {                    
                return widget;
            }
        }
    }
    
    jwk.ui.create_algo = function() {
        console.log("1 --> ", this, arguments);
        return function () {
            console.log("2 --> ", this, arguments);
            return "";
        }
    }
    
    
    var componentes = {};
    jwk.ui.component = function (namespace, ui_type) {
        if (typeof namespace == "string" && typeof ui_type == "string") {
            console.assert(componentes[namespace], "ERROR: Namespace: " + namespace + " not found", componentes);
            if (!componentes[namespace]) return Object;
            console.assert(componentes[namespace][ui_type], "ERROR: Namespace.Ui_Type: " + namespace+"."+ui_type + " not found", componentes);
            if (!componentes[namespace][ui_type]) return Object;
            return componentes[namespace][ui_type];
        } else {
            var spec = namespace;
            var namespace = spec.namespace || "unknown";
            var ui_type = spec.ui_type || "unknamed";
            var extend = spec.extends || null;
            var api = spec.api || null;
            var defaults = spec.defaults || null;
            
            if (extend) {
                if (typeof spec.constructor == "undefined") {
                    console.error(spec);
                }
                spec.constructor.prototype = new extend();
                spec.constructor.prototype.constructor = spec.constructor;
            }
            
            if (api) {
                for (var name in api) {
                    spec.constructor.prototype[name] = api[name];
                }
            }
            
            if (defaults) {
                defaults.namespace = namespace;
                defaults.ui_type = ui_type;
                spec.defs = defaults;
                spec.defaults = function() {
                    if (typeof spec.defs == "function") {
                        var obj = spec.defs();             
                        obj.namespace = spec.defs.namespace;
                        obj.ui_type   = spec.defs.ui_type;
                    } else {
                        var obj = jwk.extend(true, {}, spec.defs);
                    }
                    return obj
                }
            }            
            componentes[namespace] = componentes[namespace] || {};
            if (componentes[namespace][ui_type]) {
                console.warn("WARNING:  " + namespace+"."+ui_type + " already exist ",componentes[namespace][ui_type],"overwrighting with", spec);
            }
            componentes[namespace][ui_type] = jwk.extend(true, {}, componentes[namespace][ui_type], spec);
            jwk.ui.trigger("component:"+namespace+"."+ui_type, componentes[namespace][ui_type]);                    
        }
    }

    jwk.ui.Component = function (settings) {
        jwk.Object.call(this);
        this.set("renderize", true); // this forces the "renderize" property to be listenable
        if (settings) {
            settings.template = settings.template || {};
            settings.template.main = (typeof settings.template.main == "string") ? settings.template.main : "<div></div>";
            console.assert(settings.ui_type, "ERROR: missing ui_type attribute in settings");
            if (typeof settings.namespace == "undefined") {
                console.warn("WARNING: missing namespace attribute in settings. default value ("+ui.DEFAULT_NAMESPACE+") asigned for ", settings.ui_type);
                settings.namespace = ui.DEFAULT_NAMESPACE;
            }            
            if (typeof settings.datapath == "string" && typeof settings.data != "object") {
                if (settings.datapath.indexOf("self:") == 0) {
                    settings.data = this;
                } else {
                    console.error("ERROR: datapath attribute specified but no data present");
                }                
            }
            if (!settings.render) settings.render = ui.render;            
            this.init_settings(settings);
            this.on("change:renderize", this.paint, this);
        }
    }
    jwk.ui.Component.prototype = new jwk.Object();
    jwk.ui.Component.prototype.constructor = jwk.ui.Component;
    jwk.ui.Component.prototype.extend_in_depth = ["template"];
    jwk.ui.Component.prototype.init_tree = function() {
        var tree = this.tree();
        var data = this.data;
        var children = jwk.ui.create_component_tree(this, tree);
        /*var names = children.keys();
        for (var i in names) {
            var id = names[i];
            this.child(id, children.get(id));
        }*/
        return this;
    }
    
    jwk.ui.create_component_tree = function(parent, uitree) {
        var children = uitree.children;
        var owner = uitree.owner;
        var container = uitree.container;
        var data = uitree.data;
        var path = (typeof uitree.path == "string") ? (uitree.path+".") : "";
        var render = uitree.render || ui.render;
        var root = new jwk.Node();
        root.descartable = true;

        var i,
            is_array = Array.isArray(children);
        
        if (is_array) {
            console.error(children);
        }        
        
        for (var id in children) {
            var child = children[id];
            var ui_type = child.ui_type;            
            if (is_array) {
                assert(false, "ERROR: esto todavía se usa", [children, arguments, this]);
                /*
                i = id;
                if (child.name) {
                    id = child.name;
                } else {
                    id = ui_type.replace(".","_") + "_"+ i;
                }
                */
            }            
            var namespace = child.namespace || parent.namespace || ui.DEFAULT_NAMESPACE;            
            var settings = jwk.extend({
                path: path + id,
                name: id,
                parent: parent,                
                data: data,                
                render: render,
                owner: owner,
                namespace: namespace,
            }, child);
            
            if (container) settings.container = container;

            delete settings.path;
            var component = jwk.ui.create_component(settings);

            root.set(component.name, component);
        }
        return root;
    }
    
    jwk.ui.display_component = function(settings) {
        var c = this.create_component(settings);
        c.paint();
        return c;
    }

    var merge_with_data_stack = [];
    var ops = {
        not: function () {
            return !arguments[0];
        },
        bool: function () {
            return !!arguments[0];
        },
        idem: function () {
            return arguments[0];
        }
    }
    
    function merge_with_data (settings, component) {
        var result = jwk.extend({}, settings);
        
        // lo agrego en el stack si no está
        if (merge_with_data_stack.indexOf(settings) != -1) return settings;
        merge_with_data_stack.push(settings);

//        if (settings.layout == "<<data.layout>>") {        
//console.error("bbbbbbbbbbbbbbbbbbbbbbbbb");
            var data = settings.data || component.data;
            var self = component;
            var owner = component.owner || settings.owner;            
            var parent = component.parent;
            var regexp = /<<([^#]+)>>|<<#([^\s]+) (.+)>>/m;
            var prefix = "";
            
            for (var i in settings) {
                var value = settings[i];            
                if (typeof value == "function") continue;
                //var is_mapping = jwk.is_pure_map_object(value);
                var is_string = typeof value == "string";
                //if (!is_mapping && !is_string) continue;
                /*if (is_mapping) {
                    value = merge_with_data(value);
                    settings[i] = value;
                }*/
                if (is_string) {
                    var test = value.match(regexp);
                    if (test) {
                        // console.error(test);
                        var path = test[1];
                        var op = ops.idem;
                        if (!test[1] && test[2] && test[3]) {
                            path = test[3];
                            op = ops[test[2]] || ops.idem;
                        }                        
                        
                        function apply_change(event, op, comp, prop) {
                            var value = event.value;
                            event.value = op(event.value);
                            comp.update(event, prop);
                            event.value = value;
                        }

                        prefix = "data.";
                        if (path.indexOf(prefix) == 0) {
                            // value = this.resolve_value(path, prefix, data);
                            var _path = path.substring(5);
                            value = op(data.get(_path, {deep: _path.indexOf(".") != -1}));
                            if (component) {
                                (function (comp, prop, op){
                                    console.assert(_path.indexOf(".") == -1 || data instanceof jwk.Object,
                                                   "ERROR: in order to add a listener for the path '"+_path+"' \
                                                    data MUST be an instance of jwk.Object but got ", data);
                                    data.on("change:"+_path, function (name, event) {
                                        apply_change(event, op, comp, prop);
                                    }, comp);                                    
                                })(component, i, op);
                            }
                        }
                        prefix = "self.";
                        if (path.indexOf(prefix) == 0) {
                            var _path = path.substring(prefix.length);
                            value = op(self.get(_path, {deep: _path.indexOf(".") != -1}));
                            if (typeof value == "undefined") value = self[_path];
                            if (component) {
                                (function (comp, prop, op){
                                    console.assert(
                                        _path.indexOf(".") == -1 || comp instanceof jwk.Object,
                                        "ERROR: in order to add a listener for the path \"" + _path + "\", component MUST be an instance of jwk.Object but got ", comp);
                                    comp.on("change:"+_path, function (name, event) {
                                        apply_change(event, op, comp, prop);
                                    }, comp);
                                })(component, i, op);
                            }
                        }
                        prefix = "owner.";
                        if (path.indexOf(prefix) == 0) {
                            var _path = path.substring(prefix.length);
                            value = op(owner.get(_path, {deep: _path.indexOf(".") != -1}));
                            if (typeof value == "undefined") value = self[_path];
                            if (component) {
                                (function (comp, prop, owner, op){
                                    var _o = comp.settings.owner
                                    console.assert(
                                        _path.indexOf(".") == -1 || comp instanceof jwk.Object,
                                        "ERROR: in order to add a listener for the path \"" + _path +
                                        "\", owner MUST be an instance of jwk.Object but got ", _o);
                                    comp.settings.owner.on("change:"+_path, function (name, event) {
                                        apply_change(event, op, comp, prop);
                                    }, comp);
                                })(component, i, owner, op);
                            }
                        }
                        result[i] = value;
                    }                    
                }                
            }                        
        //}
        
        // lo saco del stack
        if (merge_with_data_stack.indexOf(settings) >= 0) {
            merge_with_data_stack.splice(merge_with_data_stack.indexOf(settings), 1);
        }        

        return result;
    }
    
    jwk.ui.create_component = function(settings) {    
        var ui_type = settings.ui_type;
        var namespace = settings.namespace || ui.DEFAULT_NAMESPACE;
        var path = settings.path;
        var name = settings.name;
        
        if (path && name) {
            // TODO: verificar que el final del path es igual al nombre
            console.assert(path.lastIndexOf(name) == path.length - name.length, path, name, path.lastIndexOf(name), path.length - name.length);
        } else if (path && !name) {
            // TODO: tiene path, así que el nombre lo sacamos de ahi.
            var i = path.lastIndexOf(".");
            name = (i>=0) ? path.substring(i+1) : path;            
        } else if (!path && name) {
            // hay nombre pero no hay path. Entonces tenemos que saber si existe un parent o un owner para sacar el comienzo del path de ahi y concatenarle el nombre.
            // Si no, va solo en nombre
            var up_obj = (settings.parent || settings.owner);
            path = (up_obj) ? (up_obj.path + "." + name) : name;
        } else if (!path && !name) {
            path = name = ui_type + "_" + jwk.nextId();
        }
        
        var settings = jwk.extend({
            path: path,
            name: name,
            render: ui.render,
            namespace: namespace
        }, settings);
        var spec = jwk.ui.component(namespace, ui_type);
        console.assert(spec, "ERROR: Not spacification found for ", namespace, ui_type, [settings]);
        var component = new spec.constructor(settings);
        component.init();
        return component;
    }
    
    
    // --------------------------------------------
    // 
    jwk.ui.Component.prototype.update_tree = function (tree) {
        // Acá recibís un tree y actualizás el arbol recorriendo tus hijos
        // Si el tree tiene un hijo y vos también, paás al siguiente hijo
        // Si el tree tiene un hijo que vos no tenés, tenés que crear el componente y agregarlo como hijo.
        // Si el tree no tiene un hijo que vos sí tenés, tenés que sacarte ese hijo y ponerlo en stand by
        // Luego por cada hijo que te quedó vivo, ejecutás recursivamente esto miso.
        
        // se ejecuta un trigger("update_tree") donde el componente podrá hacerse cargo de los componentes que quedaron en stan by
        // Luego se eliminan todos los componentes que continúen en stand by (porque nadie los sacó de ahi).
        console.error("update_tree", [this], [tree])

        var tree_nodes = [tree];
        var self_nodes = [this];
        
        while (tree_nodes.length > 0) {
            var tree_node = tree_nodes.splice(0,1)[0];
            var self_node = self_nodes.splice(0,1)[0];
            
            if (Array.isArray(tree_node.children)) {
                var self_children = self_node.get("children");
                if (self_children) {                    
                    for (var tree_child_name in tree_node.children) {
                        if (self_children.get(tree_child_name)) {
                            var tree_node_child = tree_node.children[tree_child_name];
                            tree_nodes.push(tree_node_child);
                        } else {
                            // Opa, el tree tiene un hijo que yo no tengo
                            console.log("Opa, el tree tiene un hijo que yo no tengo",tree_child_name, [this], [tree]);
                            not_implemented_yet();
                        }
                    }
                    var list = self_children.keys();
                    for (var self_child_name in list) {
                        if (!(self_child_name in tree_node.children)) {
                            // Opa, tengo un hijo que no está en el tree
                            console.log("Opa, tengo un hijo que no está en el tree", self_child_name, [this], [tree]);
                            not_implemented_yet();
                        }
                    }
                    
                } else {
                    // Opa, no tengo chldren y sin embargo el tree tiene
                    console.log("Opa, no tengo chldren y sin embargo el tree tiene", [this], [tree]);
                    not_implemented_yet();        
                }
            }
        }
    }
    
    jwk.ui.Component.prototype.update = function (event, prop) {        
        if (this._update_should_cancel(event, prop)) return;
        return this            
            ._update_begin(event, prop)
            ._update_update_tree(event, prop)
            ._update_update_value(event, prop)
            ._update_restructure(event, prop)        
            ._update_end(event, prop)        
    }
    
    jwk.ui.Component.prototype._update_should_cancel = function (event, prop) {
        return this.making_changes();
    }    
    jwk.ui.Component.prototype._update_begin = function (event, prop) {
        return this; // overwrite this
    }    
    jwk.ui.Component.prototype._update_end = function (event, prop) {
        return this; // overwrite this
    }    
    jwk.ui.Component.prototype._update_update_tree = function (event, prop) {
        if (typeof event.tree == "object") {
            this.update_tree(event.tree);
        }        
        return this;
    }    
    jwk.ui.Component.prototype._update_update_value = function (event, prop) {
        if (typeof prop == "string" && typeof this.settings[prop] != "undefined") {
            var old_value = this[prop];
            this[prop] = event.value;            
            /*
            this.trigger("change:"+prop, {
                event_name: "change:"+prop,
                old_value: old_value,
                path: prop,
                target: this,
                value: event.value
            });
            */
        }        
        return this;
    }    
    jwk.ui.Component.prototype._update_restructure = function (event, prop) {
        if (this.is_rendered()) {
            this.restructure();
            this.render.render(this);
        }
        return this;
    }    
    jwk.ui.Component.prototype.structure_tree = function () {
        // Esto devuelve el json que describe como tiene que ser el arbol de la strucure
        // Acá el componente actualiza esa estructura a apartir de su estado (cantidad, de hijos, latout, etc)
        return false;
    }
    
    jwk.ui.Component.prototype.create_structure = function () {
        var root = this.structure_tree();
        if (!root) return null;        
        root.name = root.name || "struct_" + jwk.nextId();
        root.path = this.path + "."  + root.name;
        root.owner = this;
        root.data = root.data || this.my_data();
        var structure = jwk.ui.create_component(root);
        return structure;
    }
    
    jwk.ui.Component.prototype.restructure = function () {
        var structure = this.get("structure");
        if (structure) {
            structure.destroy();
        }
        structure = this.create_structure();
        if (structure) {
            this.set("structure", structure);
        }
        return this;
    }
    
    // --------------------------------------------
    
    jwk.ui.Component.prototype.destroy = function () {
        this._destroyed = true;
        this.listen_data(false);
        if (this.parent) {
            // console.log("saco", this.name)
            this.parent.child(this.name, null);
        }
        this.drop_children();
        if (this.get("structure")) {
            this.get("structure").destroy();
        }
        if (jwk.ui.render.mouse) {
            jwk.ui.render.mouse.off(null, null, this);
        }
        return this.trigger_fast("destroy", {component:this});
    }
    
    // --------------------------------------------
    // The specific component may extend the way it render by over writing any of this funcions
    jwk.ui.Component.prototype.render_save_children = function (event) {
        this.render.render_save_children(this, this.settings.container);
    }
    
    jwk.ui.Component.prototype.render_node = function (event) {
        this.render.render_node(this, this.settings.container);
    }
    
    jwk.ui.Component.prototype.render_structure = function (event) {
        this.render.render_structure(this, this.settings.container);
    }
    
    jwk.ui.Component.prototype.render_children = function (event) {
        this.render.render_children(this, this.settings.container);
    }
    // --------------------------------------------
    
    jwk.ui.Component.prototype.is_rendered = function () {
        return this.render.is_rendered(this);
    }    
    
    jwk.ui.Component.prototype.add_class = function (_class) {
        this.render.add_class(this, _class);
    }

    jwk.ui.Component.prototype.remove_class = function (_class) {
        this.render.remove_class(this, _class);
    }

    jwk.ui.Component.prototype.paint = function () {
        console.assert(!this._destroyed, "ERROR: rendering a distroyed object", [this]);
        if (this.making_changes()) return this;        
        this.render.render(this);
        this.flag_on("rendered");
        return this;
    }
    
    jwk.ui.Component.prototype.child = function (id, child) {
        // HACK: tuve que sacar esto mientras reimplemento jwk.ui porque me daba problemas
        // console.assert(!child || child instanceof jwk.ui.Component, "ERROR: child is not a component", id, child);        
        console.assert(true || child instanceof jwk.ui.Component, "ERROR: child is not a component", id, child);        
        
        if (arguments.length == 1) {
            return this.get("children").get(id);
        } else {
            if (!child) {
                this.get("children").unset(id);
            } else {
                this.set("children."+id, child, {deep:true});
                this.get("children").parent = this;
            }
        }
        return this;
    }
    
    jwk.ui.Component.prototype.drop_children = function () {
        if (this.get("children")) {
            var list = this.get("children").keys();
            for (var i in list) {
                if(!this.get("children").get(list[i])) {
                    console.error(list[i], this.get("children").keys());
                }
                this.get("children").get(list[i]).destroy();
            }
        }
        return this;
    }
    
    jwk.ui.Component.prototype.container = function () {
        return this.render.resolve_target(this.parent_for.apply(this, arguments));
    }
    
    jwk.ui.Component.prototype.parent_for = function(name, index) {
        var data = {parent:this, query:(name ? "[child="+name+"]" : undefined)};
        if (this.render.resolve_target(data, true)) {
            return data;
        }
        return {parent:this};        
    }
        
    //jwk.ui.Component.prototype.parent_for = function(name, index) {
    //    return {parent:this, query:(name ? "[child="+name+"]" : undefined)};    
    //}
        
    jwk.ui.Component.prototype.tree = function() {
        return this.settings;
        // antes se hacía una copia limpia profunda. No solo el primer nivel
    }        
        
    jwk.ui.Component.prototype.extend_settings = function(_default, _custom) {        
        var in_depth = {};
        var names = this.extend_in_depth;
        for (var i in names) {
            var name = names[i]
            if (_default[name]) in_depth[name] = _default[name];
        }
        var sett = jwk.extend(_default, _custom);
        for (var name in in_depth) {
            sett[name] = jwk.extend(true, in_depth[name], _custom[name]);
        }        
        return sett;        
    }
    
    function trigger_settings_change (settings, diff, old_value) {
        this.trigger("change:settings", {
            target: this,
            stack: [this],
            path: "settings",
            diff_value: diff,
            value: settings,
            old_value: old_value
        });        
    }  
    
    jwk.ui.Component.prototype.init_settings = function (settings) {        
        var children = settings.children;
        var container = settings.container;
        if (typeof settings.disabled != "undefined") {
            settings.enabled = !settings.disabled;
        } else if (typeof settings.enabled != "undefined") {
            settings.disabled = !settings.enabled;
        }
        
        delete settings.children;
        delete settings.container;
        this.settings = jwk.extend({}, settings);
        var _settings = merge_with_data(settings, this);        
        this.set("value", null);
        jwk.extend(this, _settings);        
        this.settings = settings;
        
        
        
        
        
        
        
        
        
        
        
        // BINDING
        this.on("change:value", function (n, e) {
            /*
            cuando el "value" de este componente está logado (bind) con algo afuera (<<data.coso>>, <<owner.algo>>, etc)
            si el "value" cambia internamete hay que propagar el cambio hacia afuera (cambiar la data, o el owner o lo que sea)
            */
            var _value = this.value;
            var prefix;
            var data = this.data;
            var regexp = /<<(.+)>>/m;
            var owner = this.owner || this.settings.owner;
            if (this.settings.value) {
                // Puede pasar que el value no haya sido provisto en los settings
                var test = this.settings.value.match(regexp);
                if (test) {
                    var list = {
                        "data": data,
                        "self": self,
                        "owner": owner
                    };
                    var path = test[1];
                    for (var prefix in list) {
                        if (path.indexOf(prefix + ".") == 0) {
                            var _subpath = path.substring(prefix.length+1);
                            var _target = list[prefix];
                            //console.error([_target], _subpath, _value);
                            _target.set(_subpath, _value, {deep: true})                    
                        }
                    }
                }
            }
        }, this);
        





        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        

        function set_class_disabled () {
            $(this.target).addClass("disabled");
        }
        this.on("change:enabled", function(n,e){
            if (!e.value) {
                set_class_disabled.call(this);
                this.on("render", set_class_disabled, this);
            } else {
                $(this.target).removeClass("disabled");
                this.off("render", set_class_disabled, this);
            }
        }, this);
        this.set("enabled", !settings.disabled, {getter: "getset"});
        settings.children = children; 
        settings.container = container;                
        if (this.parent) {
            if (typeof this.parent.child == "function") {
                 this.parent.child(this.name, this);
                 // console.log("this.name: ", this.name, [this, settings], this.parent.get("children").keys());        
            }
        }
        trigger_settings_change.call(this, this.settings, _settings);
    }
  
    
    jwk.ui.Component.prototype.init_handlers = function () {
        this.listen_data(true);
        this.one("render:first", function (ev_name, ev) {
            ev.component.render.set_features(ev.component);
        });        
    }
    
    jwk.ui.Component.prototype.init_render = function () {
        console.assert(this.render, "ERROR: not render asigned", this);
        this.render.init_component(this);
    }
    
    jwk.ui.Component.prototype.init_structure = function () {
        return this.restructure();
    }
    
    jwk.ui.Component.prototype.update_settings = function (settings) {
        var old_value = this.settings;      
        var new_settings = jwk.extend({}, this.settings, settings);
        this.settings = new_settings;
        
        // set the component the new values
        new_settings = merge_with_data(this.settings);        
        var _container = new_settings.container;
        var _children = new_settings.children;
        delete new_settings.container;
        delete new_settings.children;
        jwk.extend(this, new_settings);
        new_settings.container = _container;
        new_settings.children = _children;
        
        // prepare params for merge_with_data
        settings.data = this.settings.data;
        
        trigger_settings_change.call(this, this.settings, merge_with_data(settings), old_value);
    }
    
    jwk.ui.Component.prototype.init = function () {
        this.init_tree();
        this.init_handlers();
        this.init_render();
        this.init_structure();
        jwk.ui.trigger("init:component", {component:this});
        this.trigger("init:component", {component:this});
        return this;
    }
    
    jwk.ui.Component.prototype.listen_data = function (sync) {
        var data = this.data;
        if (typeof data == "undefined") return;
        if (typeof data["on"] == "function" && typeof data["off"] == "function") {
            if (typeof this.datapath == "string") {
                if (sync) {
                    var component = this;
                    data.on("change:"+this.datapath, function (name, event) {
                        component.update(event);
                    }, this);
                } else {
                    data.off(null, null, this);
                }
            }
        } else {
            if (!Array.isArray(data)) {
                console.warn("WARNING: can't listen to data for change events: ", data);            
            }            
        }
        return this;
    }    
    
    jwk.ui.Component.prototype.my_data = function (value, options) {
        var data = this.data;
        if (typeof value == "undefined") {
            if (typeof this.datapath == "string") {
                if (this.datapath.indexOf("self:") == 0) {
                    var path = this.datapath.substring(5);
                    data = this;
                    if (path.length > 0) {
                        return data.get(path);
                    }
                    return data;
                } else {
                    data = data.get(this.datapath);                    
                }                
            }
            return data;
        } else {
            if (!this.making_changes()) {
                this.change_start();
                if (typeof this.datapath == "string") {
                    if (this.datapath.indexOf("self:") == 0) {
                        var path = this.datapath.substring(5);
                        data = this;
                        if (path.length > 0) {
                            return data.set(path, value);
                        }
                    } else {
                        data.set(this.datapath, value, options);
                    }
                }
                this.change_stop();
            } else {
                console.warn("Estaba haciendo cambios ya?", this);
            }
        }                
    }

    jwk.ui.Component.prototype.change_start = function () {
        this.flag_on("making_changes");
    }
    jwk.ui.Component.prototype.change_stop = function () {
        this.flag_off("making_changes");
    }
    jwk.ui.Component.prototype.making_changes = function () {
        return this.flag("making_changes");
    }

        
    return jwk.ui.Component;
});
// http://jsfiddle.net/X62Zk/

define('jwk-ui/jwk.ui.skin',[
    "jwebkit",
    "./jwk.ui.core",
], function(jwk, ui) {
    
    ui.Skin = function () {        
        jwk.Node.apply(this);
    }
    
    ui.Skin.prototype = new jwk.Node();
    ui.Skin.prototype.constructor = ui.Skin;
    
    
    ui.Skin.prototype.load_default =function () {
        console.error("ui.Skin.prototype.load_default se utiliza");
        this.load(["base.less", "color-default.less", "less-lib.less", "skin-default.less"]);
    }
    ui.Skin.prototype.load = function (list) {
        console.error("ui.Skin.prototype.load se utiliza");
        return this.load_less(list);
    }
    ui.skin_manager = new ui.Skin();
    
    return ui.skin_manager;
});
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false*/

(function (root, factory) {
  if (typeof exports === "object" && exports) {
    factory(exports); // CommonJS
  } else {
    var mustache = {};
    factory(mustache);
    if (typeof define === "function" && define.amd) {
      define('mustache',mustache); // AMD
    } else {
      root.Mustache = mustache; // <script>
    }
  }
}(this, function (mustache) {

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var nonSpaceRe = /\S/;
  var eqRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  var RegExp_test = RegExp.prototype.test;
  function testRegExp(re, string) {
    return RegExp_test.call(re, string);
  }

  function isWhitespace(string) {
    return !testRegExp(nonSpaceRe, string);
  }

  var Object_toString = Object.prototype.toString;
  var isArray = Array.isArray || function (object) {
    return Object_toString.call(object) === '[object Array]';
  };

  function isFunction(object) {
    return typeof object === 'function';
  }

  function escapeRegExp(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  function Scanner(string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function () {
    return this.tail === "";
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function (re) {
    var match = this.tail.match(re);

    if (match && match.index === 0) {
      var string = match[0];
      this.tail = this.tail.substring(string.length);
      this.pos += string.length;
      return string;
    }

    return "";
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function (re) {
    var index = this.tail.search(re), match;

    switch (index) {
    case -1:
      match = this.tail;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, index);
      this.tail = this.tail.substring(index);
    }

    this.pos += match.length;

    return match;
  };

  function Context(view, parent) {
    this.view = view == null ? {} : view;
    this.parent = parent;
    this._cache = { '.': this.view };
  }

  Context.make = function (view) {
    return (view instanceof Context) ? view : new Context(view);
  };

  Context.prototype.push = function (view) {
    return new Context(view, this);
  };

  Context.prototype.lookup = function (name) {
    var value, owner;
    if (name in this._cache) {
      value = this._cache[name];
    } else {
      var context = this;

      while (context) {
        if (name.indexOf('.') > 0) {
          value = context.view;
          var names = name.split('.'), i = 0;
          while (value != null && i < names.length) {
                owner = value;
                if (isFunction(value)) {
                    owner = value.call(value.owner || this.view);
                }            
                value = owner[names[i++]];
                if (isFunction(value)) {
                    value.owner = owner;
                }
          }
        } else {
          value = context.view[name];
        }

        if (value != null) break;

        context = context.parent;
      }

      this._cache[name] = value;
    }

    if (isFunction(value)) {
      value = value.call(value.owner || this.view);
    }

    return value;
  };

  function Writer() {
    this.clearCache();
  }

  Writer.prototype.clearCache = function () {
    this._cache = {};
    this._partialCache = {};
  };

  Writer.prototype.compile = function (template, tags) {
    var fn = this._cache[template];

    if (!fn) {
      var tokens = mustache.parse(template, tags);
      fn = this._cache[template] = this.compileTokens(tokens, template);
    }

    return fn;
  };

  Writer.prototype.compilePartial = function (name, template, tags) {
    var fn = this.compile(template, tags);
    this._partialCache[name] = fn;
    return fn;
  };

  Writer.prototype.getPartial = function (name) {
    if (!(name in this._partialCache) && this._loadPartial) {
      this.compilePartial(name, this._loadPartial(name));
    }

    return this._partialCache[name];
  };

  Writer.prototype.compileTokens = function (tokens, template) {
    var self = this;
    return function (view, partials) {
      if (partials) {
        if (isFunction(partials)) {
          self._loadPartial = partials;
        } else {
          for (var name in partials) {
            self.compilePartial(name, partials[name]);
          }
        }
      }

      return renderTokens(tokens, self, Context.make(view), template);
    };
  };

  Writer.prototype.render = function (template, view, partials) {
    return this.compile(template)(view, partials);
  };

  /**
   * Low-level function that renders the given `tokens` using the given `writer`
   * and `context`. The `template` string is only needed for templates that use
   * higher-order sections to extract the portion of the original template that
   * was contained in that section.
   */
  function renderTokens(tokens, writer, context, template) {
    var buffer = '';

    // This function is used to render an artbitrary template
    // in the current context by higher-order functions.
    function subRender(template) {
      return writer.render(template, context);
    }

    var token, tokenValue, value;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      tokenValue = token[1];

      switch (token[0]) {
      case '#':
        value = context.lookup(tokenValue);

        if (typeof value === 'object' || typeof value === 'string') {
          if (isArray(value)) {
            for (var j = 0, jlen = value.length; j < jlen; ++j) {
              buffer += renderTokens(token[4], writer, context.push(value[j]), template);
            }
          } else if (value) {
            buffer += renderTokens(token[4], writer, context.push(value), template);
          }
        } else if (isFunction(value)) {
          var text = template == null ? null : template.slice(token[3], token[5]);
          value = value.call(context.view, text, subRender);
          if (value != null) buffer += value;
        } else if (value) {
          buffer += renderTokens(token[4], writer, context, template);
        }

        break;
      case '^':
        value = context.lookup(tokenValue);

        // Use JavaScript's definition of falsy. Include empty arrays.
        // See https://github.com/janl/mustache.js/issues/186
        if (!value || (isArray(value) && value.length === 0)) {
          buffer += renderTokens(token[4], writer, context, template);
        }

        break;
      case '>':
        value = writer.getPartial(tokenValue);
        if (isFunction(value)) buffer += value(context);
        break;
      case '&':
        value = context.lookup(tokenValue);
        if (value != null) buffer += value;
        break;
      case 'name':
        value = context.lookup(tokenValue);
        if (value != null) buffer += mustache.escape(value);
        break;
      case 'text':
        buffer += tokenValue;
        break;
      }
    }

    return buffer;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens(tokens) {
    var tree = [];
    var collector = tree;
    var sections = [];

    var token;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      switch (token[0]) {
      case '#':
      case '^':
        sections.push(token);
        collector.push(token);
        collector = token[4] = [];
        break;
      case '/':
        var section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : tree;
        break;
      default:
        collector.push(token);
      }
    }

    return tree;
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens(tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          lastToken = token;
          squashedTokens.push(token);
        }
      }
    }

    return squashedTokens;
  }

  function escapeTags(tags) {
    return [
      new RegExp(escapeRegExp(tags[0]) + "\\s*"),
      new RegExp("\\s*" + escapeRegExp(tags[1]))
    ];
  }

  /**
   * Breaks up the given `template` string into a tree of token objects. If
   * `tags` is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. ["<%", "%>"]). Of
   * course, the default is to use mustaches (i.e. Mustache.tags).
   */
  function parseTemplate(template, tags) {
    template = template || '';
    tags = tags || mustache.tags;

    if (typeof tags === 'string') tags = tags.split(spaceRe);
    if (tags.length !== 2) throw new Error('Invalid tags: ' + tags.join(', '));

    var tagRes = escapeTags(tags);
    var scanner = new Scanner(template);

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace() {
      if (hasTag && !nonSpace) {
        while (spaces.length) {
          delete tokens[spaces.pop()];
        }
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var start, type, value, chr, token, openSection;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(tagRes[0]);
      if (value) {
        for (var i = 0, len = value.length; i < len; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push(['text', chr, start, start + 1]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr == '\n') stripSpace();
        }
      }

      // Match the opening tag.
      if (!scanner.scan(tagRes[0])) break;
      hasTag = true;

      // Get the tag type.
      type = scanner.scan(tagRe) || 'name';
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === '=') {
        value = scanner.scanUntil(eqRe);
        scanner.scan(eqRe);
        scanner.scanUntil(tagRes[1]);
      } else if (type === '{') {
        value = scanner.scanUntil(new RegExp('\\s*' + escapeRegExp('}' + tags[1])));
        scanner.scan(curlyRe);
        scanner.scanUntil(tagRes[1]);
        type = '&';
      } else {
        value = scanner.scanUntil(tagRes[1]);
      }

      // Match the closing tag.
      if (!scanner.scan(tagRes[1])) throw new Error('Unclosed tag at ' + scanner.pos);

      token = [type, value, start, scanner.pos];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === '/') {
        // Check section nesting.
        openSection = sections.pop();
        if (!openSection) {
          throw new Error('Unopened section "' + value + '" at ' + start);
        }
        if (openSection[1] !== value) {
          throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
        }
      } else if (type === 'name' || type === '{' || type === '&') {
        nonSpace = true;
      } else if (type === '=') {
        // Set the tags for the next time around.
        tags = value.split(spaceRe);
        if (tags.length !== 2) {
          throw new Error('Invalid tags at ' + start + ': ' + tags.join(', '));
        }
        tagRes = escapeTags(tags);
      }
    }

    // Make sure there are no open sections when we're done.
    openSection = sections.pop();
    if (openSection) {
      throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);
    }

    return nestTokens(squashTokens(tokens));
  }

  mustache.name = "mustache.js";
  mustache.version = "0.7.3";
  mustache.tags = ["{{", "}}"];

  mustache.Scanner = Scanner;
  mustache.Context = Context;
  mustache.Writer = Writer;

  mustache.parse = parseTemplate;

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  mustache.escape = escapeHtml;

  // All Mustache.* functions use this writer.
  var defaultWriter = new Writer();

  /**
   * Clears all cached templates and partials in the default writer.
   */
  mustache.clearCache = function () {
    return defaultWriter.clearCache();
  };

  /**
   * Compiles the given `template` to a reusable function using the default
   * writer.
   */
  mustache.compile = function (template, tags) {
    return defaultWriter.compile(template, tags);
  };

  /**
   * Compiles the partial with the given `name` and `template` to a reusable
   * function using the default writer.
   */
  mustache.compilePartial = function (name, template, tags) {
    return defaultWriter.compilePartial(name, template, tags);
  };

  /**
   * Compiles the given array of tokens (the output of a parse) to a reusable
   * function using the default writer.
   */
  mustache.compileTokens = function (tokens, template) {
    return defaultWriter.compileTokens(tokens, template);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  mustache.render = function (template, view, partials) {
    return defaultWriter.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.
  mustache.to_html = function (template, view, partials, send) {
    var result = mustache.render(template, view, partials);

    if (isFunction(send)) {
      send(result);
    } else {
      return result;
    }
  };

}));

define('jwk-ui/render/html/jwk.ui.html.core',[
    "jwebkit",
    "../../jwk.ui.core",
    "mustache",
    "jquery"
], function(jwk, ui, Mustache, $) {    
    
    var debug = false;
    var debug_path = "jwebdesk-packmanager_0.structure.main_layout.list_panel.pack_list.Owner";

    $.fn.disableSelection = $.fn.disableSelection || function() {
        return this
         .attr('unselectable', 'on')
         .css('user-select', 'none')
         .on('selectstart', false);
    };
    
    $.fn.enableSelection = $.fn.enableSelection || function() {
        return this
         .attr('unselectable', 'off')
         .css('user-select', '')
         .on('selectstart', true);
    };
    
    ui.HtmlRender = function () {
        
    }
    
    ui.HtmlRender.prototype = new jwk.Node();
    ui.HtmlRender.prototype.constructor = ui.HtmlRender;
    
    // Render API ---
    ui.HtmlRender.prototype.components = {};
    
    
    ui.HtmlRender.prototype.init_component = function (component) {
        // console.log("regist", component.path);
        if (debug && component.path.indexOf(debug_path) != -1) {
            this.inits = this.inits || 0;
            this.inits++;
            console.log("init_component",  [component, component.target], [this], this.distroys, this.inits, this.renderss);
        }
        
        if (typeof this.components[component.path] != "undefined") {
            if (this.components[component.path] == component) {
                console.error("Estas registrando más de una vez. POR QUE?");
            } else {
                console.warn("WARNING: a different component with the same path was previously registered", [component.path, component, this.components]);
            }
        }
        component.on("change:visible", function (n,e) {
            if (e.target.target) e.target.target[e.value ? "show" : "hide"](0);
        });
        component.on("destroy", function (n,e) {
            if (e.component.target) e.component.target.remove();
            delete this.components[e.component.path];
            if (debug && component.path.indexOf(debug_path) != -1) {
                this.distroys = this.distroys || 0;
                this.distroys++;
                console.log("destroy",  [component, component.target], [this], this.distroys, this.inits, this.renderss);
            }
            /*for (var name in this.components) {
                if (name.indexOf(component.path) == 0) {
                    // console.log("delete", name);
                    delete this.components[name];
                }
            }*/
        }, this);
        this.components[component.path] = component;        
    }
    
    ui.HtmlRender.prototype.render = function (component, container) {        
        // console.log("render", component.path, [this.components[component.path] == component], [this.components[component.path]], [component]);        
        // console.log("render", component.ui_type, component.text, [component.visible]);
        
        console.assert(typeof component.path == "string", component);
        console.assert(this.components[component.path] == component, "ERROR: this component is not well registered", component.path, [component, this.components[component.path], this.components]);        
        if (debug && component.path.indexOf(debug_path) != -1) {
            this.renderss = this.renderss || 0;
            this.renderss++;
            console.log("render",  [component, component.target], [this], this.distroys, this.inits, this.renderss);
        }       
        
        if (component.renderize === false) {
            if (component.target) {
                // Ya había renderizado pero ahora tiene que no verse -> creo un placeholder
                component.placeholder = component.placeholder || $("<placeholder></placeholder>").css("display", "none");
                component.target.before(component.placeholder);
                component.target.remove();
                delete component.target;
            }
            if (!component.target && !component.placeholder) {
                // Renderizo por primera vez pero no devo estar visible -> creo un placeholder
                var container = this.resolve_component_container(component);
                component.placeholder = $("<placeholder></placeholder>");
                component.placeholder.css("display", "none");            
                component.placeholder.appendTo(container);
            }            
            return;
        }
        
        
        
        
        /*
        if (component.renderize === false) {
            if (component.target) {
                // $(component.target).remove();
                $(component.target).css("display", "none");
            }
            // delete  component.target;
            return;
        }        
        */
        
        
        
        if (typeof component.render_save_children == "function") {
            component.render_save_children();
        }
        component.trigger_fast("render_start", { component: component });
        
        if (typeof component.render_node == "function") {
            component.render_node();
            component.trigger_fast("render_node", { component: component });
        }

        if (typeof component.render_structure == "function") {
            component.render_structure();
            component.trigger_fast("render_structure", { component: component });
        }

        if (typeof component.render_children == "function") {
            component.render_children();
            component.trigger_fast("render_children", { component: component });
        }
        
        var save = component.get("temporary_saved_children");
        if (save) {
            save.remove();
            component.unset("temporary_saved_children");  
        }        
        
        var render_type = "";
        $target = $(component.target);
        if (component.first_rendering === true) {
            render_type = ":first";
            delete component.first_rendering;
            if (component.settings.disable_selection) {
                $target.disableSelection();
                $target.css("cursor", "default");
            }
        }
        /*
        if (component.renderize === false && $target.css("display") != "none") {
            $target.css("display", "none");
        } else if (component.renderize === true && $target.css("display") == "none") {
            $target.css("display", "initial");
        }
        */
            
        component.trigger("render"+render_type, { component: component });
    }

    var container = new jwk.Node();
    ui.HtmlRender.prototype.container = function () {
        return {target:$("body")};
    }
    
    ui.HtmlRender.prototype.render_html = function (component) {
        /*var data = component.settings.data;
        if (typeof component.settings.datapath == "string") {
            data = data.get(component.settings.datapath);
        }*/
        var obj = {
            ui: ui,
            data: component.my_data(),
            self: component
        }
        
        component.trigger_fast("render_html", obj);
        
        console.assert(component.settings.template && component.settings.template.main != undefined, component.settings);
        var html = Mustache.render (
            component.settings.template.main, obj, component.settings.template
        );
        // console.log("-------------->", component.settings.ui_type, component.settings.template.main, html, [component.settings.template]);        
        return html;
    }
    
    ui.HtmlRender.prototype.resolve_component_container = function (component) {
        var container;
        container = component.settings.container;
        if (typeof container == "undefined") {
            if (component.parent) {
                if (!component.parent.container) delete component.parent.container;
                container = component.settings.container = component.parent.container(component.name);
            }
        }
        if (typeof container == "undefined") {
            if (component.owner) {
                if (!component.owner.container) delete component.owner.container;
                container = component.settings.container = component.owner.container(component.name)
            }
        }
        if (typeof container == "undefined") {
            container = component.settings.container = this.container(); // Body
        }        
        return container;
    }

    ui.HtmlRender.prototype.render_node = function (component, container) {
        container = container || this.resolve_component_container(component);
        var target = component.target;
        var tree_node = component.tree();

        component.first_rendering = true;
        if (component.target && component.target.size() > 0 && container === component.settings.container) {
            // this.render_save_children(component);
            component.first_rendering = false;
            if (tree_node.class) {
                if (tree_node.class) component.target.addClass("class", tree_node.class);
            }
            var html = this.render_html(component);
            var html_node = $(html).eq(0);
            $.each(html_node[0].attributes, function(i, attrib){
                var name = attrib.name;
                var value = attrib.value;
                try {
                    component.target.attr(name, value);
                } catch (e){} // some browsers do not allow to change some propperties
            });
            
                /*
            var ch = component.get("children");
            console.assert(!ch || typeof ch.keys == "function", ch, typeof ch.list);
            if (ch && ch.keys().length > 0) {
                console.error("caso no implementado. Tenés componentes hijos y me estas pidiendo que simplemente borre el html interno al nodo", component, this, html);                    
            } else {
                if (html_node.html() != "") {
                    component.target.html(html_node.html());                            
                }
            }
            */
            // Esto fue la alternativa a lo anterior pero me parece que vuela todo a la mierda
            
            component.target.html(html_node.html());
            if (html_node.html() != "") {
                
                //var  new_content = $("<div style='display:none' temporal='true' component_target__new_content='true'>"+html_node.html()+"</div>");                
                //component.target.append(new_content);
            }

        } else {
            var html = this.render_html(component);
            var cont = (container.target instanceof $) ? container.target : container
            if (component.placeholder && component.placeholder.closest($("body")).size() > 0) {
                target = $(html);
                component.placeholder.before(target);
                component.placeholder.remove();
                delete component.placeholder;
            } else {
                target = $(html).appendTo( $(cont) );
            }

            // El style es solo para debugear. No se supone que sea siempre así.
            if (tree_node.style)  target.attr("style", (target.attr("style") ? (target.attr("style") + "; ") : "") + tree_node.style);
        }
        
        this.set_target(component, target);

        if (tree_node.class) target.addClass(tree_node.class);
        if (component.size)  target.css(component.size);
        if (component.text || component.html || component.content) {
            component.one("render", function (n, e) {
                var target = this.resolve_target(e.component.parent_for(null, 0));
                if (e.component.text)  target.append($("<span>").text(e.component.text));
                if (e.component.html)  target.append(e.component.html);                
                if (e.component.content) {
                    target.find("content").after(e.component.content);
                    target.find("content").remove();
                }
            }, this);
        }
        
        var forbidden = {class:true, text:true,  content:true, style:true, html:true};
        for (var prop in tree_node) {
            if (typeof tree_node[prop] != "string") continue;
            if (prop in forbidden) continue;
            target.attr(prop, tree_node[prop]);
        }
        
        /*
        // El style es solo para debugear. No se supone que sea siempre así.
        if (tree_node.style)  component.target.attr("style", tree_node.style);
        */        
        console.assert(true)
    }
    
    ui.HtmlRender.prototype.render_structure = function (component, container) {
        var structure = component.get("structure");
        if (!structure) return;        
        structure.paint();
    }    
    
    ui.HtmlRender.prototype.is_rendered = function (component) {
        return !!component.target;
    }    
    
    ui.HtmlRender.prototype.resolve_container = function (parent_for, no_warning) {
        // console.warn("WARNING: ui.HtmlRender.prototype.resolve_container Deprecated");
        return this.resolve_target(parent_for, no_warning);
    }
    
    ui.HtmlRender.prototype.resolve_target = function (parent_for, no_warning) {
        var parent = parent_for.parent,
            query = parent_for.query,
            target = parent.target;
        
        if (typeof query == "string") {            
            if (target.length == 0) {
                if (!no_warning) console.warn("WARNING: container hasent rendered yet", [parent_for.parent]);
                return null;
            }
            target = target.find(query);            
            if (target.length == 0) {
                if (!no_warning) console.warn("WARNING: query got null target", query);
                return null;
            }
            // console.assert(target.length > 0, "query got null target ", query, "for component ", parent_for.parent.path);
            /*if (target.length == 0) {
                console.warn("WARNING: query got null target", query);
                target = parent.target;
            }*/
        }
        
        return target.eq(0);
    }
    
    ui.HtmlRender.prototype.render_save_children = function (component) {        
        var ch = component.get("children");
        if (!ch || !component.target) return;
        var save = null;
        var names = ch.keys();        
        if (names.length > 0) {
            var str = "<div component='"+component.path+"' teporal='true' holding='component saved children'>";
            var container = component.settings.container;
            container = (container instanceof $) ? container : container.target; 
            for (var i in names) {
                var child = ch.get(names[i]);
                var target = child.target;
                if (target && target.size() > 0 /*&& target.closest("body").size() > 0*/) {
                    save = save || $(str).css("display", "none").appendTo(container);
                    save.append(target);
                }                    
            }
        }
        component.set("temporary_saved_children", save);
        return this;
    }
    
    ui.HtmlRender.prototype.render_children = function (component) {
        var children = component.get("children");
        if (!children) return this;

        var list = children.keys();
        var save = component.get("temporary_saved_children");        

        for (var i in list) {
            var child = children.get(list[i]);
            child.settings.container = this.resolve_target(component.parent_for(list[i], i)) || save;
            if (child.settings.container && child.settings.container.length > 0) {
                if (child.target) {
                    if (child.target.closest(save).length > 0) {
                        child.target.appendTo(child.settings.container);
                    } else {
                        child.paint();
                    }
                } else {
                    child.paint();
                }
            }
            //console.assert(child.settings.container, "resolve_target returns null", component.parent_for(list[i], i) );
            //console.assert(child.settings.container.length > 0, "resolve_target returns null", component.parent_for(list[i], i) );
        }
        
        return this;
    }
    
    ui.HtmlRender.prototype.add_class = function (component, klass) {
        console.assert(component.target && component.target.length > 0, component);
        console.assert(typeof klass == "string", klass);
        component.target.addClass(klass);
        return this;
    }
    
    ui.HtmlRender.prototype.remove_class = function (component, klass) {
        console.assert(component.target && component.target.length > 0, component);
        console.assert(typeof klass == "string", klass);
        component.target.removeClass(klass);
        return this;
    }
    
    ui.HtmlRender.prototype.set_target = function(component, target) {
        component.target = $(target).eq(0);
        component.target.attr("path", component.settings.path);
        component.target.attr("ui", component.settings.namespace+"."+component.settings.ui_type);
        component.target.attr("name", component.name);

        if (component.visible == false) {
            if (component.target) component.target.css("display", "none");
        }
        var ui_type = component.settings.ui_type;
        var ui_comp = ui_type.split(".").join(" ");
        /*if (ui_type.indexOf(".") > 0) {
            ui_comp = ui_type.substring(0,ui_type.indexOf("."));
            type = ui_type.substring(ui_type.indexOf(".")+1);
            ui_comp = ui_comp + " " + type;
        }*/
        component.target.addClass(component.settings.namespace+" "+ui_comp);
        // component.trigger("target",{component:component});
        return this;
    }    
    
    ui.HtmlRender.prototype.controlers = {};
    
    ui.HtmlRender.prototype.set_features = function (component) {
        // console.error(component.settings.path, component.settings, component.settings.draggable);
        var target = component.target;
        var settings = component.settings;
        component.on("feature", function (n,e) {
            e.controller.component = e.component;
            
            ui.HtmlRender.prototype.controlers[e.controller.type] = ui.HtmlRender.prototype.controlers[e.controller.type] || {};
            ui.HtmlRender.prototype.controlers["all"] = ui.HtmlRender.prototype.controlers["all"] || {};
            
            ui.HtmlRender.prototype.controlers[e.controller.type][e.controller.get("id")] = e.controller;
            ui.HtmlRender.prototype.controlers["all"][e.controller.get("id")] = e.controller;

        }, this);
        
        component.controllers = {};
        if (target) {
            if (settings.draggable && settings.draggable.disable != true) {
                this.set_draggable(component, settings.draggable);
            }
            if (settings.droppable && settings.droppable.disable != true) {
                this.set_droppable(component, settings.droppable);
            }
            if (settings.position && settings.position.disable != true) {
                this.set_position(component, settings.position);
            }
            if (settings.resizable && settings.resizable.disable != true) {
                this.set_resizable(component, settings.resizable);
            }
            if (settings.selectable && settings.selectable.disable != true) {
                this.set_selectable(component, settings.selectable);
            }
            if (settings.sortable && settings.sortable.disable != true) {
                this.set_sortable(component, settings.sortable);
            }
            if (settings.splittable && settings.splittable.disable != true) {
                this.set_splittable(component, settings.splittable);
            }
        }
        component.off("feature", null, this);
        component.trigger("features", {component:component});
    }
    
    function prepare_settings (component, settings1, settings2) {
        if (settings1 === true) settings1 = {};
        if (settings1) {
            settings1.component = component;
            return settings1;
        } 
        if (settings2) {
            settings2.component = component;
            return settings2;
        } 
    }
    
    ui.HtmlRender.prototype.set_draggable  = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.draggable);
        component.controllers.draggable  = component.target.setDraggable(settings).controller();
        component.controllers.draggable.component = component;
        component.trigger("feature:draggable", {component:component, controller: component.controllers.draggable, type: "draggable"});
    }
    ui.HtmlRender.prototype.set_droppable  = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.droppable);
        component.controllers.droppable  = component.target.setDroppable(settings).controller();
        component.controllers.droppable.component = component;
        component.trigger("feature:droppable", {component:component, controller: component.controllers.droppable, type: "droppable"});
    }
    ui.HtmlRender.prototype.set_position   = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.position);
        component.controllers.position   = component.target.setPosition(settings).controller();
        component.controllers.position.component = component;
        component.trigger("feature:position", {component:component, controller: component.controllers.position, type: "position"});
    }
    ui.HtmlRender.prototype.set_resizable  = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.resizable);
        component.controllers.resizable  = component.target.setResizable(settings).controller();
        component.controllers.resizable.component = component;
        component.trigger("feature:resizable", {component:component, controller: component.controllers.resizable, type: "resizable"});
    }
    ui.HtmlRender.prototype.set_selectable = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.selectable);
        component.controllers.selectable = component.target.setSelectable(settings).controller();
        component.controllers.selectable.component = component;
        component.trigger("feature:selectable", {component:component, controller: component.controllers.selectable, type: "selectable"});
    }
    ui.HtmlRender.prototype.set_sortable   = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.draggable);
        component.controllers.sortable   = component.target.setSortable(settings).controller();
        component.controllers.sortable.component = component;
        component.trigger("feature:sortable", {component:component, controller: component.controllers.sortable, type: "sortable"});
    }
    ui.HtmlRender.prototype.set_splittable = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.splittable);
        var def = {};
        if (typeof settings == "undefined") {
            switch (component.settings.splittable.toString().toLowerCase()) {
                case "true": break;
                case "horizontal":
                case "x":
                    def.axis = "x";
                    break;
                case "vertical":
                case "y":
                    def.axis = "y";
                    break;
            }
        }
        component.controllers.splittable = component.target.setSplittable(settings || def).controller();
        // redefino el parent_for() para futuras invocaciones (habrá?)
        // en este momento se supone que el componente ya tiene sus hijos
        component.parent_for = function (name, index) {
            return this.splittable.parent_for(name, index);
        }            

        component.trigger("splittable", {component:component, controller: component.splittable, type: "splittable"});
    }
    
    
    ui.htmlrender = new ui.HtmlRender();
    ui.render = ui.htmlrender;
    ui.set("render", ui.render);
    
    try {
        container.target = $("body");        
        container.target.bind( [
            "change",
            "submit",
            "keyup",
            "resize"
        ].join(" "), function( e ) {
            var comp = $(e.target).closest("[ui][path]");
            // console.log(comp);
            e.ui_type = comp.attr("ui");
            e.path = comp.attr("path");
            e.component = ui.render.components[e.path];
            e.input = $(e.target).closest("input")[0];
            container.trigger(e.type, e);
        });
        
    } catch (e) {
        console.log(obj, window, window.location);
    }
    
    
    return ui.render;
});

            
define('jwk-ui/render/html/jwk.ui.html.mouse',[
    "jwebkit",
    "./jwk.ui.html.core",
    "jquery"
], function(jwk, htmlrender, $) {    
    var mouse = jwk.global.mouse;
    
    htmlrender.Mouse = function () {
        
        track_attribute = function (attribute) {
            console.assert(typeof attribute == "string" && attribute.length > 0, attribute);
            var target = $(this.target);
            var wanted = target.closest("["+attribute+"]");
            return wanted.attr(attribute);
        }
        
        track_index_of_attribute = function (attribute) {
            console.assert(typeof attribute == "string" && attribute.length > 0, attribute);
            var target = $(this.target);
            var wanted = target.closest("["+attribute+"]");
            var parent = wanted.parent();
            if (parent.size() > 0) {
                var nodeList = Array.prototype.slice.call( wanted.parent()[0].children );
                return nodeList.indexOf( wanted[0] );
            }            
            return -1;
        }
        
        var mouse_events = {
            "click": true,      // The event occurs when the user clicks on an element
            "dblclick": true,   // The event occurs when the user double-clicks on an element
            "mousedown": true,  // The event occurs when a user presses a mouse button over an element
            "mousemove": true,  // The event occurs when the pointer is moving while it is over an element
            "mouseover": true,  // The event occurs when the pointer is moved onto an element
            "mouseout": true,   // The event occurs when a user moves the mouse pointer out of an element
            "mouseup": true,    // The event occurs when a user releases a mouse button over an element	     
            "contextmenu": true        
        }
        
        mouse.on("all", function (n, e) {
            if ( !(n in mouse_events) ) return;
            var target = $(e.target);
            var comp = target.closest("[ui][path]");
            //var signal = target.closest("[signal]");
            
            e.which = track_attribute;            
            e.index = track_index_of_attribute;            
            e.ui_type = comp.attr("ui");
            e.path = comp.attr("path");
            
            /*
            var entry = $(signal || e.target);
            var parent = entry.parent();
            if (parent.size() > 0) {
                var nodeList = Array.prototype.slice.call( entry.parent()[0].children );
                e.index = nodeList.indexOf( entry[0] );  
            }*/

            e.component = htmlrender.components[e.path];
            
            
            if (e.component && e.component.enabled) {
                if (typeof e.component[n] == "function") {
                    // This allow the component to prepare and trigger a more complex event.
                    e.component[n](n, e);
                    try {
                        
                    } catch (er) {
                        console.error(er);
                        console.error(er.stack());                        
                    }
                    
                } else {
                    e.component.trigger_fast(n, e);
                }
                
            }
            this.trigger_fast(n, e);
        }, this);
    }
    
    htmlrender.Mouse.prototype = new jwk.Node();
    htmlrender.Mouse.prototype.constructor = htmlrender.Mouse;
    
    htmlrender.mouse = new htmlrender.Mouse();
    return htmlrender.mouse;
});

define('jwk-ui/render/html/jwk.ui.html.keyboard',[
    "jwebkit",
    "./jwk.ui.html.core",
    "jquery"
], function(jwk, htmlrender, $) {
    var keyboard = jwk.net.keyboard;
    
    htmlrender.Keyboard = function () {
        
        track_attribute = function (attribute) {
            console.assert(typeof attribute == "string" && attribute.length > 0, attribute);
            var target = $(this.target);
            var wanted = target.closest("["+attribute+"]");
            return wanted.attr(attribute);
        }
        
        track_index_of_attribute = function (attribute) {
            console.assert(typeof attribute == "string" && attribute.length > 0, attribute);
            var target = $(this.target);
            var wanted = target.closest("["+attribute+"]");
            var parent = wanted.parent();
            if (parent.size() > 0) {
                var nodeList = Array.prototype.slice.call( wanted.parent()[0].children );
                return nodeList.indexOf( wanted[0] );
            }            
            return -1;
        }
        
        var keyboard_events = {
            "keydown": true,
            "keypress": true,
            "keyup": true,
            "change": true       
        }
        
        keyboard.on("all", function (n, e) {
            if ( !(n in keyboard_events) ) return;
            var target = $(e.target);
            var comp = target.closest("[ui][path]");
            //var signal = target.closest("[signal]");
            
            e.which = track_attribute;            
            e.index = track_index_of_attribute;            
            e.ui_type = comp.attr("ui");
            e.path = comp.attr("path");
            
            /*
            var entry = $(signal || e.target);
            var parent = entry.parent();
            if (parent.size() > 0) {
                var nodeList = Array.prototype.slice.call( entry.parent()[0].children );
                e.index = nodeList.indexOf( entry[0] );  
            }*/

            e.component = htmlrender.components[e.path];
            
            
            if (e.component && e.component.enabled) {
                if (typeof e.component[n] == "function") {
                    // This allow the component to prepare and trigger a more complex event.
                    e.component[n](n, e);
                    try {
                        
                    } catch (er) {
                        console.error(er);
                        console.error(er.stack());                        
                    }
                    
                } else {
                    e.component.trigger_fast(n, e);
                }
                
            }
            this.trigger_fast(n, e);
        }, this);
    }
    
    htmlrender.Keyboard.prototype = new jwk.Node();
    htmlrender.Keyboard.prototype.constructor = htmlrender.Keyboard;
    
    htmlrender.keyboard = new htmlrender.Keyboard();
    return htmlrender.keyboard;
});

define('jwk-ui/render/html/jwk.ui.html.set-draggable',[
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "jquery"
], function(jwk, ui, render, $) {    
    var global = jwk.global;
    // console.log("jwk-ui/jwk.ui.set-draggable ------------------------------------------------------------------------------------------------------");
// return console.log("desabilito el set-draggable");
    // console.log("TODO: hay que implementar el cancel object que es una lista de objetos en donde el drag no tiene efecto.");
   
    var ctrl_drag = {
        id: "jwk.set-draggable",
        name: "jwk-draggable",
        prefix: "draggable-"
    };
    
    var default_settings = {
        disable_selection: true,
        lazy: false,
        iFrameFix: true,
        cursorDragging: "default",
        cursorOver: "default",
        applyTo: "target",
        position: "inherit",
        container: "parent", // "body"
        helper: "target",
        cancel: "." + ctrl_drag.prefix + "cancel",
        zIndex: "." + ctrl_drag.prefix + "target, ." + ctrl_drag.prefix + "children > *",
        round: true,
        axis: "both", // "x" o "y"
        grid: {
            enabled: false,
            x: 50,
            y: 50,
            offset: {
                x: 0,
                y: 0
            }
        },
        snap: {
            enabled: false,
            selector: "." + ctrl_drag.prefix + "target, ." + ctrl_drag.prefix + " > *",
            tolerance: 10
        }
    }
    
    var manager;
    
    render.DragManager = function (globalhtml) {
        manager = this;        
        manager._globalhtml = globalhtml;
        manager._dragging = false;
        manager._target = false;
        manager._helper = false;
        jwk.Node.apply(manager);
        manager.init(jwk.global.mouse);
    }
    
    
    // -- initialization ---
    render.DragManager.prototype = new jwk.Node();
    render.DragManager.prototype.constructor = ui.DropManager;
        
    render.DragManager.prototype.dragging = function() {
        return this._dragging;
    }

    render.DragManager.prototype.init = function(mouse) {
        mouse.on("mousedown", function (event_name, event) {
            var draggable = $(event.target).closest("." + ctrl_drag.prefix + "target");
            if (draggable.size() == 0) {
                draggable = $(event.target).closest("." + ctrl_drag.prefix + "children > *");
                controller = draggable.parent().data(ctrl_drag.id);
            } else {
                controller = draggable.data(ctrl_drag.id);
            }
            
            if (draggable.size() > 0) {
                
                var cancel = controller.options.cancel;
                if (cancel) {
                    if ($(event.target).closest(cancel).size() > 0) {
                        manager.cancel_drag();
                        return this;
                    }
                }                
                
                manager.candidate(draggable, controller, event);                
            }        
        }, this);
        mouse.on("mousemove", function (name, event) {
            manager.drag(event);
        }, this);
        mouse.on("mouseup", function (name, event) {
            manager.drop(event);
        }, this);
    }

    render.DragManager.prototype.candidate = function (draggable, controller, event) {
        // console.log("candidate:", jwk.css(draggable));

        /*
        Hay que ver los diferentes casos:
        -- Horizontal --
        - right
        - left
        - left & right                
        - left, right & width

        -- Vertical --
        - top
        - bottom
        - top & bottom                
        - top, bottom & height
        */

        //console.log("candidate() draggable:", draggable);
        if (controller.enabled == false) return this;
        manager._target = draggable;
        manager._dragctrl = controller;
        // manager._event = event;
        manager._options = controller.options;
        manager._mouseclick  = { x: event.pageX, y:event.pageY };
        manager._containment = manager._options.containment;
        manager._initoffset  = draggable.offset();
        var parent_offset = draggable.offsetParent().offset();
        manager._initoffset.top  -= parent_offset.top;  
        manager._initoffset.left -= parent_offset.left;  
        
        manager._axis = manager._options.axis;
        manager._prec = {};
        manager._area = undefined;
        manager._snap = undefined;
        manager._grid = undefined;
        manager._init = jwk.ui.snapshot(draggable); 
        manager._init.css.top_float = parseFloat(manager._init.css.top);
        manager._init.css.left_float = parseFloat(manager._init.css.left);
        manager._init.css.bottom_float = parseFloat(manager._init.css.bottom);
        manager._init.css.right_float = parseFloat(manager._init.css.right);


        switch (manager._options.container) {
            case "parent": manager._helper_container = manager._target.parent();              break;
            case "body":   manager._helper_container = manager._target.closest("body");       break;
            default:       manager._helper_container = manager._options.container || manager._target.parent();
        }

        var t_offset = manager._target.offset();
        var t_size = manager._initsize;

        if (manager._dragctrl.options.containment) {
            var area = null;
            switch(manager._dragctrl.options.containment) {
                case "parent":
                    var parent = manager._target.parent();
                    var p_offset = parent.offset();
                    manager._area = {};
                    manager._area.left   = p_offset.left - t_offset.left;
                    manager._area.top    = p_offset.top - t_offset.top;
                    manager._area.right  = p_offset.left + parent.outerWidth() - (t_offset.left +t_size.w);
                    manager._area.bottom = p_offset.top + parent.outerHeight() - (t_offset.top + t_size.h);
                    break;
                default:
                    console.error("ERROR: containment option not supported yet:", this._dragctrl.options.containment);
            }
        }
        var grid;
        try {
            if (manager._dragctrl.options.grid.enabled) grid = manager._dragctrl.options.grid;
        } catch (e) {}        
        if (grid) {
            //console.log(t_offset, grid.offset);
            var offset = {
                x: grid.offset.x +(t_offset.left % grid.x),
                y: grid.offset.y +(t_offset.top % grid.y)
            }
            manager._grid = $.extend({}, grid,{
                offset: offset
            });
        }        

        var snap;
        try {
            if (manager._dragctrl.options.grid.enabled) snap = manager._snap = manager._dragctrl.options.snap;
        } catch (e) {}        
        if (snap) {
            console.error("TODO: sin implementar");
            // acá lo que tengo que hacer es usar el jwk.util.box2dweb para crear un mundo temporal con los objetos a colisionar
            // y en el drag hacer un update position y luego step para testear colision
            console.log(jwk.thirdparty.box2dweb);                        
        }
    }
    
    render.DragManager.prototype.move = function (motion) {
        console.assert(this == manager, [this, manager]);
        if (manager._area) {
            var containment = manager._area;
            if (motion.x < containment.left)    motion.x = containment.left;
            if (motion.x > containment.right)   motion.x = containment.right;
            if (motion.y < containment.top)     motion.y = containment.top;
            if (motion.y > containment.bottom)  motion.y = containment.bottom;
        }
        if (this._grid) {
            var grid = manager._grid;
            if (grid) {
                var mod, sig;
                // -------
                mod = motion.x % grid.x;
                sig = (mod < 0) ? -1 : 1;
                if (sig * (mod+grid.offset.x) <= grid.range.x) {
                    motion.x -= mod+grid.offset.x;
                }
                if (sig * (mod+grid.offset.x) > grid.x - grid.range.x) {
                    motion.x += sig * grid.x - (mod+grid.offset.x);
                }
                // -------
                mod = motion.y % grid.y;
                sig = (mod < 0) ? -1 : 1;
                if (sig * (mod+grid.offset.y) <= grid.range.y) {
                    motion.y -= mod+grid.offset.y;
                } 
                if (sig * (mod+grid.offset.y) > grid.y - grid.range.y) {
                    motion.y += sig * grid.y - (mod+grid.offset.y);
                }
            }
        }
        if (this._snap) {
            var snap = manager._snap;
            if (snap) {

            }
        }

        var last = manager._helper.offset();
        var diff = {
            dx: motion.x - (last.left - manager._initoffset.left),
            dy: motion.y - (last.top - manager._initoffset.top)
        }
        //console.log("manager._initoffset", manager._initoffset);
        //console.log("last", last);
        //console.log("diff", diff);


        /*

        Aca hay que reformular esta parte:
        Tienen que verse por separado los casos 
        hay que hacer 2 switch case (horizontal y vertical)
        pasar los pixeles a porcentajes si corresponde y aplicar el cambio a los campos que corresponden según el caso.
        */

        function formate_percent(manager, b) {
            var digits = 2;
            if (manager._dragctrl.options.round) {
                var str = ""+b;
                if (str.indexOf(".") > -1) {
                    str = str.substring(0, str.indexOf(".")+1+digits);
                }                            
                return str+ "%";
            } else {
                return b+ "%";
            }
        }
        function formate_pixel(manager, b) {
            //console.log("format",b);
            if (manager._dragctrl.options.round) {
                return Math.round(b)+"px";
            } else {
                return b+"px";
            }
        }                    
        function formate_offset(manager, prop, b, object) {
            var obj = {}; obj[prop] = b;
            object.offset(obj);
            if (manager._dragctrl.options.round) {
                var value = parseFloat(object.offset()[prop]);
                object.css(prop, formate_pixel(manager, value));
            } else {
                return ""+b;
            }
        }                    
        var css = manager._init.css;

        // Horizontal
        switch (manager._init.horizontal) {
            case "left":
                if (css["left_percent"]) {
                    this._helper.css({ left: formate_percent(this, css["left_percent"] + motion.x * css["left_k"]) });
                } else {
                    formate_offset(manager, "left", manager._initoffset.left + motion.x, manager._helper);
                    // this._helper.offset({ left: formate(this, this._initoffset.left + motion.x )});
                }                            
                break;
            case "right":
                if (css["right_percent"]) {
                    manager._helper.css({ right: formate_percent(manager, css["right_percent"] - motion.x * css["right_k"])  });
                } else {
                    // formate_offset("right", parseFloat(this, manager._init.css.right) - motion.x, manager._helper);
                    manager._helper.css({ right: formate_pixel(manager, parseFloat(manager._init.css.right) - motion.x )});
                }                            
                break;
            case "both":
                if (css["left_percent"]) {
                    manager._helper.css({ left: formate_percent(manager, css["left_percent"] + motion.x * css["left_k"])  });
                } else {
                    formate_offset(manager, "left", manager._initoffset.left + motion.x, manager._helper);
                    // this._helper.offset({ left: formate(this, this._initoffset.left + motion.x )});
                }                            
                if (css["right_percent"]) {
                    manager._helper.css({ right: formate_percent(manager, css["right_percent"] - motion.x * css["right_k"])  });
                } else {
                    // formate_offset("right", parseFloat(this, this._init.css.right) - motion.x, this._helper);
                    manager._helper.css({ right: formate_pixel(manager, parseFloat(manager._init.css.right) - motion.x )});
                }                           
                break;
            case "margin":                    
                var percent_motion  = motion.x * css["left_k"];
                var percent_current = 50;
                if (css["left_percent"] < 0 && css["right_percent"] == 0) {
                    percent_current = 50 + 0.5 * css["left_percent"];
                } else if (css["left_percent"] == 0 && css["right_percent"] < 0) {
                    percent_current = 50 - 0.5 * css["right_percent"];
                }
                var css_modif = {};
                if (percent_current + percent_motion <= 50) {
                    css_modif.left    = ((percent_current + percent_motion) * 2 -100) + "%";
                    css_modif.right = "0%";
                } else {
                    css_modif.left    = "0%";
                    css_modif.right = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
                }
                manager._helper.css(css_modif);
                break;
        }

        // Vertical
        switch (manager._init.vertical) {
            case "top":
                if (css["top_percent"]) {
                    manager._helper.css({ top: formate_percent(manager, css["top_percent"] + motion.y * css["top_k"]) });
                } else {
                    formate_offset(manager, "top", manager._initoffset.top + motion.y, manager._helper);
                    // this._helper.offset({ top: formate(this._initoffset.top + motion.y )});
                }
                break;
            case "bottom":
                if (css["bottom_percent"]) {
                    manager._helper.css({ bottom: formate_percent(manager, css["bottom_percent"] - motion.y * css["bottom_k"]) });
                } else {
                    // formate_offset("bottom", parseFloat(this._init.css.bottom) - motion.y, this._helper);
                    manager._helper.css({ bottom: formate_pixel(manager, parseFloat(manager._init.css.bottom) - motion.y )});
                }
                break;
            case "both":
                if (css["top_percent"]) {
                    manager._helper.css({ top: formate_percent(manager, css["top_percent"] + motion.y * css["top_k"]) });
                } else {
                    formate_offset(manager,"top", manager._initoffset.top + motion.y, manager._helper);
                    // this._helper.offset({ top: formate(this._initoffset.top + motion.y )});
                }
                if (css["bottom_percent"]) {
                    manager._helper.css(manager, { bottom: formate_percent(manager, css["bottom_percent"] - motion.y * css["bottom_k"]) });
                } else {
                    // formate_offset("bottom", parseFloat(this._init.css.bottom) - motion.y, this._helper);
                    manager._helper.css(manager, { bottom: formate_pixel(manager, parseFloat(manager._init.css.bottom) - motion.y )});
                }
                break;
            case "margin":
                var percent_motion  = motion.y * css["top_k"];
                var percent_current = 50;
                if (css["top_percent"] < 0 && css["bottom_percent"] == 0) {
                    percent_current = 50 + 0.5 * css["top_percent"];
                } else if (css["top_percent"] == 0 && css["bottom_percent"] < 0) {
                    percent_current = 50 - 0.5 * css["bottom_percent"];
                }
                var css_modif = {};
                if (percent_current + percent_motion <= 50) {
                    css_modif.top    = ((percent_current + percent_motion) * 2 -100) + "%";
                    css_modif.bottom = "0%";
                } else {
                    css_modif.top    = "0%";
                    css_modif.bottom = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
                }
                manager._helper.css(css_modif);


                // console.log(percent_current + percent_motion, percent_motion, css_modif.top, css_modif.bottom, manager._helper.css("top"), manager._helper.css("bottom"));

                /*
                if (at_top <= 50) {
                    css_modif.top    = (at_top * 2 -100) + "%";
                    css_modif.bottom = (- parseFloat(vars.init.css.height) * num) + units;
                } else {
                    css_modif.top    = (- parseFloat(vars.init.css.height) * num) + units;
                    css_modif.bottom = ((100 - at_top) * 2 -100) + units;
                }

                if (css["top_percent"]) {
                    this._helper.css({ top: formate_percent(css["top_percent"] + motion.y * css["top_k"]) });
                } else {
                    formate_offset("top", this._initoffset.top + motion.y, this._helper);
                    // this._helper.offset({ top: formate(this._initoffset.top + motion.y )});
                } 
                */
                break;
        }


        var evt = {
            target: manager._target,
            helper: manager._helper,
            motion: $.extend(diff, motion),
            event: event
        };
        manager._dragctrl.trigger("drag", evt);
        manager.trigger("drag" ,evt);
        manager._target.triggerHandler("drag", evt);
    }
    
    render.DragManager.prototype.drag = function (event) {
        //console.log("drag() dragging:", this._dragging);
        if (this._dragging) {
            var motion = {
                x: manager._axis == "y" ? 0 : event.pageX - manager._mouseclick.x,
                y: manager._axis == "x" ? 0 : event.pageY - manager._mouseclick.y
            }
            this.move(motion);
        } else if (manager._target) {
            manager.start_drag(event);
        } else {
            // just, mousemove

        }
    }
    
    render.DragManager.prototype.drop = function (event) {
        // console.log("drop() dragging:", this._dragging, this._target);
        if (this._dragging) {
            var evt = {
                target: manager._target,
                helper: manager._helper,
                offset: { x: event.pageX - manager._initoffset.left, y: event.pageY - manager._initoffset.top},
                event: event
            }
            var helper = manager._helper; 
            manager._dragging = false;
            manager._target = null;
            manager._helper = null;
            manager._dragctrl.trigger("stop", evt);
            manager.trigger("stop", evt);
            evt.target.triggerHandler("stop", evt);
            manager._globalhtml.css("cursor", "");
            if (manager._dragctrl.options.helper == "clone" || manager._dragctrl.options.helper == "none") {
                helper.remove();
            }
            if (manager._dragctrl.options.iFrameFix) {
                manager._dragctrl.target.closest("body").find("[iFrameFix]").remove();
            }
        }
        this.cancel_drag();
    }
    
    
    render.DragManager.prototype.cancel_drag = function () {
        manager._dragging = manager._target = manager._helper = null;
    }
    
    render.DragManager.prototype.start_drag = function (event) {
        //console.log("start_drag dragging:",this._dragging);
        var manager = this;
        this._helper = this._target;
        var cancel = manager._dragctrl.options.cancel;
        if (cancel) {
            if ($(event.target).closest(cancel).size() > 0) {
                // CANCEL !
                this.cancel_drag();
                return this;
            }
        }
        
        if (manager._dragctrl.options.helper == "clone" || manager._dragctrl.options.helper == "none") {
            manager._helper = manager._target.clone().appendTo(this._helper_container);
            manager._helper.css("position","absolute");
            manager._helper.offset(manager._target.offset());
            manager._helper.css({ bottom: "", right: ""});
            manager._helper.addClass("dragging-helper");
            if (manager._dragctrl.options.helper == "none") {
                manager._helper.css("display","none");
            }
            
        } else {
            switch(this._init.css["position"]) {
                case "absolute":
                case "relative":
                    // todo bien !
                    break;
                default:
                    var offset = manager._helper.offset();
                    manager._helper.css("position","absolute");
                    manager._helper.offset(offset);
            }
        }

        /*this._last_position = this._target.css("position");
        if (!this._last_position == "relative" || this._dragctrl.options.position == "absolute") {
            this._helper.css("position","absolute");
        }*/
        
        manager._dragging = true;
        if (manager._dragctrl.options.zIndex) {
            ui.ontop(manager._helper, $(manager._dragctrl.options.zIndex));
        }
        var evt = {target: manager._target, helper: manager._helper, event: event}
        manager._dragctrl.trigger("start", evt);
        manager.trigger("start", evt);
        manager._target.triggerHandler("start", evt);
        manager._last_cursor = manager._globalhtml.css("cursor");
        manager._globalhtml.css("cursor", manager._dragctrl.options.cursorDragging);

        if (manager._dragctrl.options.iFrameFix) {
            manager._dragctrl.target.closest("body").append(
                $("<div iFrameFix='true' style='z-index:9999'>").css({
                    background: "rgba(0 , 0 , 0 , 0.0001)",
                    top: 0, bottom: 0, left: 0, right: 0, position:"fixed"
                }).disableSelection()
            );
        }				

        manager.drag(event);
    }

    render.drag_manager = render.drag_manager || new render.DragManager($("html"));
    
    render.DraggableController = function(target, args) {
    
        var def_args = default_settings;
        jwk.Node.apply(this);
        this.init(target, $.extend(true, {}, jwk.def_args, def_args, args));
    }
    render.DraggableController.prototype = new jwk.Node();
    render.DraggableController.prototype.constructor = render.DraggableController;    
    render.DraggableController.prototype.type = "draggable";
    
    render.DraggableController.prototype.controller = function () { return controller; }
    render.DraggableController.prototype.update = function (options) {
        // TODO: code to update options with new options
        return this;
    }   
    
    
    
    
    
    // aaaaaaaaAAAAAAAA
    render.DraggableController.prototype.move = function (motion) {
        var aux = this.manager._helper;
        //
        var event = {target: this.target, pageX: 0, pageY:0};
        var controller = this.target.data(ctrl_drag.id);
        this.manager.candidate(this.target, controller, event);
        this.manager.start_drag(event);
        this.manager.move(motion);
        this.manager.drop(event);
        //
        this.manager._helper = aux;
    }
    
    
    
    
    
    render.DraggableController.prototype.enable = function (enabled) {
        this.enabled = enabled;        
        return this;
    }
    render.DraggableController.prototype.init = function (target, options) {
        var ctrlid = "Draggable_"+jwk.nextId();
        this.set("id", ctrlid);

        if (options.grid && options.grid.enabled != false) {
            var grid = options.grid;
            if (grid.range) {
                if (typeof grid.range.x != "number") {
                    if (!isNaN(grid.range)) {
                        grid.range = {x:grid.range, y:grid.range};
                    } else {
                        grid.range = {x:grid.x/2, y:grid.y/2};
                    }
                }
            } else {
                grid.range = {x:grid.x/2, y:grid.y/2};
            }
        }    

        if (!options.lazy && options.applyTo == "target") {
            switch(target.css("position")) {
                case "absolute":
                case "relative":
                    // todo bien!
                    break;
                default:             
                    target.css("position","absolute");
            }                
        }

        this.options = options;
        this.target = target;
        target.attr(this.type, this.get("id"));
        target.addClass(ctrl_drag.prefix + options.applyTo);
        if (options.disable_selection) target.disableSelection();

        target.css("cursor", options.cursorOver);
        // ---------------- 
        var dom = target.closest("html");
        var drag_manager = render.drag_manager;
        console.assert(drag_manager,"No encontre el drag manager", render)
        this.map({
            dom: dom,
            manager: drag_manager
        });
    }    
    
    render.setDraggable = function (target, args) {
        controller = new render.DraggableController(target, args);
        target.data(ctrl_drag.id, controller);
        return controller;
    }
    
    $.fn.setDraggable = function( args ) {
        args = args || {};
        var target = $(this);
        var controller = target.data(ctrl_drag.id);
        if (!controller) {
    
            target.each(function() {
                controller = render.setDraggable($(this), args);
                $(this).data(ctrl_drag.id, controller);
            });
            
            return $.extend(this, { controller: function() {
                if ($(this).size() == 1) return $(this).data(ctrl_drag.id);
                var consoladores = [];
                $(this).each(function(){
                    consoladores.push($(this).data(ctrl_drag.id));
                });
                return $(consoladores);
            }});
            
            return target;
        }         
        return controller.update(args);
    };
    
    return ui.setDraggable;

});
define('jwk-ui/render/html/jwk.ui.html.set-droppable',[
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "jquery",
    "./jwk.ui.html.set-draggable"
], function(jwk, ui, render, $) {
    // console.log("jwk-ui/jwk.ui.set-droppable ------------------------------------------------------------------------------------------------------");
    
    var ctrl_drop = {
        id: "jwk.set-droppable",
        name: "jwk-droppable",
        prefix: "droppable-"
    };
    var manager;
    
    render.DropManager = function () {
        var manager = this;
        jwk.Node.apply(manager);
        manager.init();            
    }
    
    render.DropManager.prototype = new jwk.Node();
    render.DropManager.prototype.constructor = render.DropManager;
    
    render.DropManager.prototype.init = function () {
        manager = this;
        manager.map({
            droppables: {},
            accepting: []
        })
        // manager.set("droppables",{});
        // manager.set("accepting",[]);
        render.drag_manager.on("start", function (e_name, event) {
            // console.log("start", arguments);
            // If is not acceptable we return
            var droppables = manager.get("droppables");
            var accepting = [];                    
            var names = droppables.keys();
            for (var i in names) {
                var droppable   = droppables.get(names[i]);
                var target      = droppable.target();
                var controller  = droppable.controller();
                var options     = controller.options;
                var acceptable  = false;
                if (event.target.filter(options.accept).size() > 0) acceptable = true;
                controller.was_over = false;
                delete controller.dropobj;
                if (acceptable) {
                    controller.dropobj = event.helper;
                    accepting.push(droppable.id());
                }
            }

            function sortAlpha(a, b) {  
                var targetA = droppables.get(a).target();
                var targetB = droppables.get(b).target();
                if (targetA.parents().filter(targetB).length > 0) {
                    // b es ancestro de a
                    return -1;
                }
                if (targetB.parents().filter(targetA).length > 0) {
                    // b es ancestro de a
                    return 1;
                }
                var parentsA = jQuery.makeArray( targetA.parents() );
                var parentsB = jQuery.makeArray( targetB.parents() );

                var common_parent = parentsA.intersect(parentsB);
                console.log("parentsA.intersect(parentsB):", parentsA.intersect(parentsB));
                return 0;

            };  

            accepting = $(accepting).sort(sortAlpha);
            manager.set("accepting", accepting);
        });

        render.drag_manager.on("drag", function (e_name, event) {

            var accepting = manager.get("accepting");
            var droppables = manager.get("droppables");
            var candidate = undefined;
            for (var i=0; i<accepting.length; i++) {
                var droppable   = droppables.get(accepting[i]);
                var target      = droppable.target();
                var controller  = droppable.controller();
                var options     = controller.options;

                if(!controller.dropobj) continue;
                console.assert(controller.dropobj[0] == event.helper[0]);
                var is_over = false;

                if (!candidate) {

                    var obj  = { offset: event.helper.offset(), size: {w:event.helper.outerWidth(), h:event.helper.outerHeight()}}
                    var self = { offset: controller.target.offset(), size: {w:controller.target.outerWidth(), h:controller.target.outerHeight()}}
                    switch (controller.options.tolerance) {
                        case "fit":
                            if ( obj.offset.top >= self.offset.top &&
                                obj.offset.left >= self.offset.left &&
                                obj.offset.top + obj.size.h <= self.offset.top + self.size.h &&
                                obj.offset.left + obj.size.w <= self.offset.left + self.size.w
                            ) {
                                is_over = true;
                            }
                            break;
                        case "intersect":
                            var top = Math.max(obj.offset.top, self.offset.top);
                            var left = Math.max(obj.offset.left, self.offset.left);
                            var bottom = Math.min(obj.offset.top + obj.size.h, self.offset.top + self.size.h);
                            var right = Math.min(obj.offset.left + obj.size.w, self.offset.left + self.size.w);

                            if ( (bottom - top) >= (obj.size.h/2) &&
                                    (right - left) >= (obj.size.w/2)
                                ) {
                                    is_over = true;
                            }
                            break;
                        case "pointer":
                            if ( self.offset.left <= event.pageX &&
                                self.offset.top  <= event.pageY &&
                                obj.offset.left + obj.size.w >= event.pageX &&
                                obj.offset.top  + obj.size.h >= event.pageY
                                ) {
                                is_over = true;
                            }
                            break;
                        case "touch":
                            if ( obj.offset.left <= self.offset.left + self.size.w &&
                                obj.offset.left + obj.size.w >= self.offset.left &&
                                obj.offset.top <= self.offset.top + self.size.h &&
                                obj.offset.top  + obj.size.h >= self.offset.top
                                ) {
                                is_over = true;
                            }
                            break;
                    }

                }

                if (is_over) {
                    candidate = controller;
                    controller.target.addClass(controller.options.dropAcceptClass);
                } else {
                    controller.target.removeClass(controller.options.dropAcceptClass);
                }

                if (controller.was_over != is_over) {
                    controller.was_over = is_over;
                    controller.trigger(is_over ? "over" : "out", { event: event, target:controller.target });
                }


            }                    

        });

        render.drag_manager.on("stop", function (e_name, event) {
            var accepting  = manager.get("accepting");
            var droppables = manager.get("droppables");
            for (var i=0; i<accepting.length; i++) {
                var droppable   = droppables.get(accepting[i]);
                var target      = droppable.target();
                var controller  = droppable.controller();
                var options     = controller.options;

                if (controller.was_over) {
                    controller.trigger("drop", { event: event, target: target, droppable: controller, draggable: event["draggable"] || event.target });
                    controller.target.removeClass(controller.options.dropAcceptClass);
                }
                controller.dropobj = false;
            }
            manager.set("accepting",[]);
        });

    }
        
    render.DropManager.prototype.addDroppable = function (target, controller) {
        var droppables = manager.get("droppables");
        var droppable = new jwk.Node();
        droppable.set("id", controller.id());
        droppable.set("target", $(target));
        droppable.set("controller", controller);
        droppables.set(controller.id(), droppable);
    }
        
        
    // console.log("jwk.DropManager()");
    render.drop_manager = render.drop_manager || new render.DropManager();
    
    
    render.DroppableController = function (target, args) {
        var def_args = {
            dropAcceptClass: "jwk-dropaccept",
            cursor: "default",
            tolerance: "intersect", // fit, intersect, pointer, touch
            accept: ".jwk-draggable-target"
        };
        
        var controller = this;
        jwk.Node.apply(controller);
        // -- initialization ---
        controller.init(target, $.extend({}, def_args, args));
    }
    
    render.DroppableController.prototype = new jwk.Node();
    render.DroppableController.prototype.constructor = render.DroppableController;
    render.DroppableController.prototype.type = "droppable";

    render.DroppableController.prototype.controller = function () { return controller; }
    render.DroppableController.prototype.update = function (options) {
        // TODO: code to update options width new options
        return this;
    }

    render.DroppableController.prototype.init = function (target, options) {
        var ctrlid = "Droppable_" + jwk.nextId();
        this.set("id", ctrlid);
        this.target = $(target);
        this.options = options;
        console.assert(jwk.ui.render.drag_manager, "jwk.ui.render.drag_manager MUST exist in order to set Droppables");

        target.attr(controller.type, controller.get("id"));
        target.addClass(ctrl_drop.name);
        target.addClass(options.group);
        // target.disableSelection();

        jwk.render.drop_manager.addDroppable(target, this);
        // suscribirse a eventos del manager
    }

    render.setDroppable = function (target, args) {
        controller = new render.DroppableController(target, args);
        target.data(ctrl_drop.id, controller);
        return controller;
    }
    
    $.fn.setDroppable = function( args ) {
        var target = $(this);            
        var controller = $(this).data(ctrl_drop.id);
        if (!controller) {
            target.each(function() {
                controller = render.setDroppable($(this), args);
                $(this).data(ctrl_drop.id, controller);
            });
            return $.extend(this, { controller: function() {
                if ($(this).size() == 1) return $(this).data(ctrl_drop.id);
                var consoladores = [];
                $(this).each(function(){
                    consoladores.push($(this).data(ctrl_drop.id));
                });
                return $(consoladores);
            }});
        }         
        return controller.update(args);
    };
    
    return render.setDroppable;
});
define('jwk-ui/render/html/jwk.ui.html.set-position',[
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "./jwk.ui.html.set-draggable",
    "jquery"
], function(jwk, ui, render, draggable, $) {
    // console.log("jwk-ui/jwk.ui.set-position ------------------------------------------------------------------------------------------------------");
        
    var ctrl_pos = {
        id: "jwk.set-position",
        name: "jwk-position",
        prefix: "position-"
    };

    position_relative = function (controller) {

        var _my = controller.options.my.split(" "); if(_my.length == 1) _my.push(_my[0]);
        var _at = controller.options.at.split(" "); if(_at.length == 1) _at.push(_at[0]);
        var offset_parent = controller.target.offsetParent();
        var css_modif = {}
        var vars = {
            init: jwk.ui.snapshot(controller.target),
            my: {x:0, y:0},
            at: {x:0, y:0},
            edge: {x:_at[0], y:_at[1]},
            value: {x:0, y:0},
            mystyle: controller.target[0].style,
            mysize: {
                w:controller.target.outerWidth(),
                h:controller.target.outerHeight()
            },
            ofsize: {
                w:controller.options.of.outerWidth(),
                h:controller.options.of.outerHeight()
            },
        }

        // console.log("position_relative", _my, _at, vars.my, vars.at, vars, vars.init);

        var num = 0;
        switch (_at[0]) {
            case "left":
                switch (_my[0]) {
                    case "left":   num = 0; break;
                    case "center": num = 0.5; break;
                    case "right":  num = 1; break;
                    default:
                        // percent expresion. ej: 45% --> 0.45
                        if (/\d+%/.test(_my[0])) num = parseFloat(_my[0]) * 0.01;
                }
                if (/\d+%/.test(vars.init.css.width)) {
                    css_modif.right = "";
                    css_modif.left = - (parseFloat(vars.init.css.width) * num) + "%";
                } else if (/\d+px/.test(vars.init.css.width)) {
                    css_modif.right = "";
                    css_modif.left = - (parseFloat(vars.init.css.width) * num) + "px";
                } else {
                    if (vars.init.horizontal == "both") {
                        if (/\d+px/.test(vars.init.css.left) && /\d+px/.test(vars.init.css.right)) {
                            var offset = num * (offset_parent.width() - parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right));
                            css_modif.left = (-offset) +"px";
                            css_modif.right = (offset + parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right)) + "px";
                        } else {
                            console.log("lo siento caso no implementado");
                        }
                    } else {
                        console.log("lo siento caso no implementado");
                    }
                }
                break;
            case "right":
                switch (_my[0]) {
                    case "left":   num = 1; break;
                    case "center": num = 0.5; break;
                    case "right":  num = 0; break;
                    default:
                        // percent expresion. ej: 45% --> (1-0.45) 0.55 (from right POV)
                        // asumimos que el porcentaje siempre esta dicho desde left (a menos que _my.length == 4)
                        if (/\d+%/.test(_my[0])) num = (1-parseFloat(_my[0]) * 0.01); 
                }
                if (/\d+%/.test(vars.init.css.width)) {
                    css_modif.left = "";
                    css_modif.right = (- parseFloat(vars.init.css.width) * num) + "%";
                } else if (/\d+px/.test(vars.init.css.width)) {
                    css_modif.left = "";
                    css_modif.right = (- parseFloat(vars.init.css.width) * num) + "px";
                } else {
                    if (vars.init.horizontal == "both") {
                        if (/\d+px/.test(vars.init.css.left) && /\d+px/.test(vars.init.css.right)) {
                            var offset = num * (offset_parent.width() - parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right));
                            css_modif.right = (-offset) +"px";
                            css_modif.left = (offset + parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right)) + "px"; 
                        } else {
                            console.log("lo siento caso no implementado");
                        }
                    } else {
                        console.log("lo siento caso no implementado");
                    }
                }
                break;                        
            case "center":
                num = 0.5;
            default:
                var at_left;
                if (/\d+%/.test(_at[0])) {
                    // asumo que siempre es desde el punto de vista left
                    num = parseFloat(_at[0]) * 0.01;
                }
                at_left = 100 * num;
                css_modif.left = at_left + "%";
                switch (_my[1]) {
                    case "left":   num = 1; break;
                    case "center": num = 0; break;
                    case "right":  num = -1; break;
                    default:
                        if (/\d+%/.test(_my[1])) num = parseFloat(_my[1]) * 0.01;
                }

                // El siguiente código resuelve el posicionamiento de el objeto expresando su posición mediante left y right
                // manteniendo los margin-left y margin-right en auto
                var units = false;
                if (/\d+%/.test(vars.init.css.width)) {
                    units = "%";
                } else if (/\d+(px)?/.test(vars.init.css.width)) {
                    units = "px";
                }

                // Percent Aligment (CSS solution) http://jsfiddle.net/SQDJ6/
                if (units) {
                    if (at_left <= 50) {
                        css_modif.left    = (at_left * 2 -100) + "%";
                        css_modif.right = (- parseFloat(vars.init.css.width) * num) + units;
                    } else {
                        css_modif.left    = (- parseFloat(vars.init.css.width) * num) + units;
                        css_modif.right = ((100 - at_left) * 2 -100) + units;
                    }
                    css_modif["margin-left"]  = "auto";
                    css_modif["margin-right"] = "auto";
                } else if (vars.init.horizontal == "both") {
                    if (at_left == 50) {
                        var margin = (parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right)) * 0.5;
                        css_modif.right  = margin + "px";
                        css_modif.left   = margin + "px";
                    } else {
                        console.log("lo siento caso no implementado");
                    }                                
                }                
                
                
                /*
                // El siguiente código genera el mismo efecto solo que la posición queda expresada como left: X%
                
                switch (_my[0]) {
                    case "left":   num = 0; break;
                    case "center": num = 0.5; break;
                    case "right":  num = 1; break;
                    default:
                        // percent expresion. ej: 45% --> (1-0.45) 0.55 (from right POV)
                        // asumimos que el porcentaje siempre esta dicho desde left (a menos que _my.length == 4)
                        if (/\d+%/.test(_my[0])) num = parseFloat(_my[0]) * 0.01; 
                }

                if (/\d+%/.test(vars.init.css.width)) {
                    css_modif["margin-left"] = (- parseFloat(vars.init.css.width) * num) + "%";
                } else if (/\d+(px)?/.test(vars.init.css.width)) {
                    css_modif["margin-left"] = (- parseFloat(vars.init.css.width) * num) + "px";
                } else if (vars.init.horizontal == "both") {
                    if (at_left == 50) {
                        var margin = (parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right)) * 0.5;
                        css_modif.right = margin + "px";
                        css_modif.left  = margin + "px";
                    } else {
                        console.log("lo siento caso no implementado");
                    }                                
                }
                */                        
                break;
                
                
        }



        switch (_at[1]) {
            case "top":
                switch (_my[1]) {
                    case "top":   num = 0; break;
                    case "center": num = 0.5; break;
                    case "bottom":  num = 1; break;
                    default:
                        // percent expresion. ej: 45% --> 0.45
                        if (/\d+%/.test(_my[1])) num = parseFloat(_my[1]) * 0.01;
                }
                if (/\d+%/.test(vars.init.css.height)) {
                    css_modif.bottom = "";
                    css_modif.top = (- parseFloat(vars.init.css.height) * num) + "%";
                } else if (/\d+(px)?/.test(vars.init.css.height)) {
                    css_modif.bottom = "";
                    css_modif.top = (- parseFloat(vars.init.css.height) * num) + "px";
                } else {
                    if (vars.init.vertical == "both") {
                        if (/\d+(px)?/.test(vars.init.css.top) && /\d+(px)?/.test(vars.init.css.bottom)) {
                            var offset = num * (offset_parent.height() - parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom));
                            css_modif.top = (-offset) +"px";
                            css_modif.bottom = (offset + parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom)) + "px";
                        } else {
                            console.log("lo siento caso no implementado");
                        }
                    } else {
                        console.log("lo siento caso no implementado");
                    }
                }
                break;
            case "bottom":
                switch (_my[1]) {
                    case "top":   num = 1; break;
                    case "center": num = 0.5; break;
                    case "bottom":  num = 0; break;
                    default:
                        // percent expresion. ej: 45% --> (1-0.45) 0.55 (from bottom POV)
                        // asumimos que el porcentaje siempre esta dicho desde top (a menos que _my.length == 4)
                        if (/\d+%/.test(_my[1])) num = (1-parseFloat(_my[1]) * 0.01); 
                }
                if (/\d+%/.test(vars.init.css.height)) {
                    css_modif.top = "";
                    css_modif.bottom = (- parseFloat(vars.init.css.height) * num) + "%";
                } else if (/\d+(px)?/.test(vars.init.css.height)) {
                    css_modif.top = "";
                    css_modif.bottom = (- parseFloat(vars.init.css.height) * num) + "px";
                } else {
                    if (vars.init.vertical == "both") {
                        if (/\d+(px)?/.test(vars.init.css.top) && /\d+(px)?/.test(vars.init.css.bottom)) {
                            var offset = num * (offset_parent.height() - parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom));
                            css_modif.bottom = (-offset) +"px";
                            css_modif.top = (offset + parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom)) + "px"; 
                        } else {
                            console.log("lo siento caso no implementado");
                        }
                    } else {
                        console.log("lo siento caso no implementado");
                    }
                }
                break;                        
            case "center":
                num = 0.5;
            default:
                var at_top;
                if (/\d+%/.test(_at[1])) {
                    // asumo que siempre es desde el punto de vista top
                    num = parseFloat(_at[1]) * 0.01;
                }
                at_top = 100 * num;
                switch (_my[1]) {
                    case "top":   num = 1; break;
                    case "center": num = 0; break;
                    case "bottom":  num = -1; break;
                    default:
                        if (/\d+%/.test(_my[1])) num = parseFloat(_my[1]) * 0.01;
                }
                var units = false;
                if (/\d+%/.test(vars.init.css.height)) {
                    units = "%";
                } else if (/\d+(px)?/.test(vars.init.css.height)) {
                    units = "px";
                }

                // Percent Aligment (CSS solution) http://jsfiddle.net/SQDJ6/
                if (units) {
                    if (at_top <= 50) {
                        css_modif.top    = (at_top * 2 -100) + "%";
                        css_modif.bottom = (- parseFloat(vars.init.css.height) * num) + units;
                    } else {
                        css_modif.top    = (- parseFloat(vars.init.css.height) * num) + units;
                        css_modif.bottom = ((100 - at_top) * 2 -100) + units;
                    }
                    css_modif["margin-top"]    = "auto";
                    css_modif["margin-bottom"] = "auto";
                } else if (vars.init.vertical == "both") {
                    if (at_top == 50) {
                        var margin = (parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom)) * 0.5;
                        css_modif.bottom = margin + "px";
                        css_modif.top    = margin + "px";
                    } else {
                        console.log("lo siento caso no implementado");
                    }                                
                }
        }                

        //console.log("position_relative", "css_modif:", css_modif);
        if (vars.init.css["position"] == "static") css_modif.position = "absolute";
        controller.vars = vars;				
        controller.target.css(css_modif);
    }

    of_target_moved = function (controller) {
        // _of_target_moved is called only for update non-relative position
        var offset = controller.options.of.offset();
        var vars = controller.vars;
        
        var pos = {
            top:  offset.top + vars.at.y, // offset.top  - offset.top+outherHeight
            left: offset.left + vars.at.x // offset.left - offset.left+outherHeight
        }
        var my = {
            top:  vars.my.y,  // 0 - outherHeight
            left: vars.my.x   // 0 - outherWidth
        };

        controller.target.offset({
            top:  my.top  + pos.top,
            left: my.left + pos.left
        });

        return this;
    }    

    update_vars = function (controller) {

        var _my = controller.options.my.split(" "); if(_my.length == 1) _my.push(_my[0]);
        var _at = controller.options.at.split(" "); if(_at.length == 1) _at.push(_at[0]);

        var vars = {
            my: {x:_my[0], y:_my[1]},
            at: {x:_at[0], y:_at[1]},
            mysize: {
                w:controller.target.outerWidth(),
                h:controller.target.outerHeight()
            },
            ofsize: {
                w:controller.options.of.outerWidth(),
                h:controller.options.of.outerHeight()
            },
        }

        switch (_my[0]) {
            case "left":   vars.my.x = 0; break;
            case "center": vars.my.x = - vars.mysize.w / 2; break;
            case "right":  vars.my.x = - vars.mysize.w; break;
            case "top":
            case "bottom":
                console.error("ERROR: position.my must be expresed like 'Horizontal Vertical' but got the other way round");
                break;    
                
            default:
                // percent expresion. ej: 45% --> 0.45
                if (/\d+%/.test(_my[0])) vars.my.x = parseInt(_my[0]) * 0.01;
        }

        switch (_my[1]) {
            case "top":   vars.my.y = 0; break;
            case "center": vars.my.y = - vars.mysize.h / 2; break;
            case "bottom":  vars.my.y = - vars.mysize.h; break;
            case "left":
            case "right":
                console.error("ERROR: position.my must be expresed like 'Horizontal Vertical' but got the other way round");
            default:
                if (/\d+%/.test(_my[1])) vars.my.y = parseInt(_my[1]) * 0.01;
        }

        switch (_at[0]) {
            case "left":   vars.at.x = 0; break;
            case "center": vars.at.x = vars.ofsize.w / 2; break;
            case "right":  vars.at.x = vars.ofsize.w; break;
            case "top":
            case "bottom":
                console.error("ERROR: position.at must be expresed like 'Horizontal Vertical' but got the other way round");
            default:
                if (/\d+%/.test(_at[0])) vars.at.x = parseInt(_at[0]) * 0.01;
        }

        switch (_at[1]) {
            case "top":   vars.at.y = 0; break;
            case "center": vars.at.y = vars.ofsize.h / 2; break;
            case "bottom":  vars.at.y = vars.ofsize.h; break;
            case "left":
            case "right":
                console.error("ERROR: position.at must be expresed like 'Horizontal Vertical' but got the other way round");
            default:
                if (/\d+%/.test(_at[1])) vars.at.y = parseInt(_at[1]) * 0.01;
        }

        controller.vars = vars;
    }

    render.PositionController = function(target, args) {
        var controller = this;
        jwk.Node.apply(controller);
        controller.init(target, args);        
    }

    render.PositionController.prototype = new jwk.Node();
    render.PositionController.prototype.constructor = render.PositionController;
    render.PositionController.prototype.type = "position";
    
    render.PositionController.prototype.controller = function () { return this; }
    
    function try_to_find_the_of_target(options) {
        var of_target;
        switch (typeof options.of) {
            case "undefined":
                console.error("ERROR: position.of object MUST be specificated in order to position the target rilatively to it.", this, options);
                break;
            case "object":
                // Is it a jquery object?
                if (options.of instanceof $) {
                    if (options.of.length == 0) console.warn("WARNING: position.of has a valid jquery object but no dom object asociated", options, this.target, this);
                    of_target = options.of;
                    break;
                }
                
                if (options.of.target instanceof $) {
                    of_target = options.of.target;
                    break;
                }
                break;
            case "string":
                // let's try to find out if it is a jquery valid selector
                
                of_target = $(options.of);
                if (of_target.length > 0) break;
                
                if (options.of == "container") {
                    of_target = this.target.parent();
                    if (of_target.length > 0) break;
                }                
                
                if (options.of == "screen") {
                    of_target = $("body");
                    if (of_target.length > 0) break;
                }                
                
                if (this.component) {
                    // We are working width jwk.ui components library
                    
                    // Is it the component parent?
                    if (options.of == "parent") {
                        var parent = this.component.parent;
                        if (parent) of_target = parent.target;
                        if (of_target.length > 0) break;
                    }
                    
                    // Is it the component owner?
                    if (options.of == "owner") {
                        var owner = this.component.owner;
                        if (owner) of_target = owner.target;
                        if (of_target.length > 0) break;
                    }
                    
                    // is it an absolute path to an other component?
                    if (render.components[options.of]) of_target = render.components[options.of].target;
                    if (of_target.length > 0) break;
                }
                
                break;
        }
        return of_target;
    }

    render.PositionController.prototype.update = function (options) {
        // TODO: code to update options width new options
        if (options) {
            this.component = options.component; // jwk.ui components
            this.options = options;
            var of_target = try_to_find_the_of_target.call(this, options);            
            console.assert(of_target, "ERROR: could't be found a dom object identified by", options.of, "for the target", this.target);
            options.of = of_target;            
            console.assert(this.options.of.size() > 0, options);            
        }
        
        if (this.options.position) {
            var pos = this.options.position;
            console.assert( pos === "absolute" || pos === "fixed" || pos === "relative");
            var of = this.target.offset();                
            this.target.css("position", pos);
            this.target.offset(of);           
        }                        

        this.options.relative = this.target.parent()[0] == this.options.of[0] && this.target.parent().css("position") in {"absolute":1, "relative":1};
        // if controller.target is being dragged, update position must not be performed
        if (jwk.ui.render.drag_manager._target &&
            this.target[0] == jwk.ui.render.drag_manager._target[0]) {
            return this;
        }
        if (this.options.relative) {
            position_relative(this);
        } else {
            update_vars(this);
            of_target_moved(this);
        }
        return this;
    }

    render.PositionController.prototype.init = function (target, options) {
        // console.log("controller.init:", target, options);
        var ctrlid = "Position_" +jwk.nextId();
        this.set("id", ctrlid);
        this.target = $(target);        
        this.update(options);
        // console.assert(jwk.ui.render.drag_manager, "jwk.ui.render.drag_manager MUST exist in order to set positions");
        var controller = this;
        
        if (options.update_on) {
            $( window ).on(options.update_on,function() {
                controller.update();
            });
        }

        if (!options.relative) {
            
            if (jwk.ui.render.drag_manager) {
                jwk.ui.render.drag_manager.on("start", function (e_name, event) {
                    // if whatever been dragging is or contains the followed object (controller.options.of) position must be updated each drag event
                    controller.forgetit = $(event.target)[0] != controller.options.of[0] && !$(controller.options.of).parents().is(event.target);
                });
    
                jwk.ui.render.drag_manager.on("drag", function (e_name, event) {
                    if(controller.forgetit) return;
                    of_target_moved(controller);
                });
    
                jwk.ui.render.drag_manager.on("stop", function (e_name, event) {
                    controller.forgetit = true;
                });
            } else {
                error.warn("WARNING: not drag manager found so positioned objects will not be updated if some object is dragged some other way.");
            }
            
            $(window).on("resize",function(e_name, evt) {
                controller.update();
            });
        }

        target.attr(controller.type, controller.get("id"));
        target.addClass(ctrl_pos.name);
        // target.disableSelection();
    }

    render.setPosition = function (target, args) {
        var _args = $.extend({}, args);
        controller = new render.PositionController(target, _args);
        target.data(ctrl_pos.id, controller);
        return controller;
    }
    
    $.fn.setPosition = function( args ) {
        var target = $(this);
        if (typeof args === "string") {
            args = { position: args };
        }        
        var controller = $(this).data(ctrl_pos.id);
        if (!controller) {
            target.each(function() {
                controller = render.setPosition($(this), args);
                $(this).data(ctrl_pos.id, controller);
            });
            return $.extend(this, { controller: function() {
                if ($(this).size() == 1) return $(this).data(ctrl_pos.id);
                var consoladores = [];
                $(this).each(function(){
                    consoladores.push($(this).data(ctrl_pos.id));
                });
                return $(consoladores);
            }});
        }         
        return controller.update(args);
    };

    return render.setPosition;

});
define('jwk-ui/render/html/jwk.ui.html.set-resizable',[
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "./jwk.ui.html.set-draggable",
    "./jwk.ui.html.set-position",
    "jquery"
], function(jwk, ui, render, draggable, position, $) {
    // console.log("jwk-ui/jwk.ui.set-resizable ------------------------------------------------------------------------------------------------------");
    
    var ctrl_res = {
        id: "jwk.set-resizable",
        name: "jwk-resizable",
        prefix: "resizable-",
        help_prefix: "helper-",
        help_common: "resizable-helper"
    };
    
    function update_vars (controller, force) {
        var trigger = false;
        var t_w = controller.target.outerWidth();
        var t_h = controller.target.outerHeight();

        if (controller.vars.size.w != t_w || force) {
            controller.vars.size.w = t_w;
            trigger = true;
            if (!controller.relative) {
                controller.handlers
                    .children("."+ctrl_res.help_prefix+"n, ."+ctrl_res.help_prefix+"s")
                    .width(t_w - controller.options.margin.w);
            }
        }
        if (controller.vars.size.h != t_h || force) {
            controller.vars.size.h = t_h;
            trigger = true;
            if (!controller.relative) {
                controller.handlers
                    .children("."+ctrl_res.help_prefix+"e, ."+ctrl_res.help_prefix+"w")
                    .height(t_h - controller.options.margin.h);
            }
        }                
        if (trigger) {
            var evt = {target:controller.target};
            controller.trigger("resize", evt);
            controller.target.triggerHandler("resize", evt);
        }
    }
    
    function create_helpers (controller, handles) {
        // controller.handlers.children("." + ctrl_res.help_common).remove();
        if (handles[0] == "")return;
        positions = {
            n:  {my:"center center", at: "center top"},
            e:  {my:"center center", at: "right center"},
            s:  {my:"center center", at: "center bottom"},
            w:  {my:"center center", at: "left center"},
            ne: {my:"center center", at: "right top"},
            se: {my:"center center", at: "right bottom"},
            sw: {my:"center center", at: "left bottom"},
            nw: {my:"center center", at: "left top"}
        }

        var div = $("<div>").css({
            width: "10px",
            height: "10px",
            // background: "transparent",// "transparent" or "black"
            "z-index": 100,
            position: "absolute"
        });

        $(controller.helpers).each(function(){
            $(this).remove();
        });
        controller.helpers = [];

        handles.forEach(function(han) {
            var handle = jwk.trim(han);
            var helper = div.clone();
            controller.vars.size.w = controller.target.outerWidth();
            controller.vars.size.h = controller.target.outerHeight();
            helper
                .addClass(ctrl_res.help_common)
                .addClass(ctrl_res.help_prefix + handle)
                .attr("handle",handle)
                .appendTo(controller.handlers)
                // .appendTo(controller.target.parent())
            if (handle == "s" || handle == "n") {
                if (controller.relative) {
                    helper.css({
                        width: "auto",
                        left: (controller.options.margin.w/2)+"px",
                        right: (controller.options.margin.w/2)+"px",
                    });
                } else {
                    helper.width(controller.vars.size.w-controller.options.margin.w);
                }
            }
            if (handle == "e" || handle == "w") {
                if (controller.relative) {
                    helper.css({
                        height: "auto",
                        top: (controller.options.margin.h/2)+"px",
                        bottom: (controller.options.margin.h/2)+"px",
                    });
                } else {
                    helper.height(controller.vars.size.h-controller.options.margin.h);
                }
            }

            var params = $.extend({of: controller.target}, positions[handle]);
            helper.position = helper.setPosition(params).controller();
            // console.error("helper: ", helper, helper.width(), helper.css("left"), controller.options.margin.w);
            controller.helpers.push(helper);                
        });
    }
    
    register_values = function (controller) {

        // controller.target[0].style
        controller.vars = jwk.ui.snapshot(controller.target);
        controller.vars.size = {};            
        controller.vars.resizing = {
            init: {
                style: {
                    width:   controller.target[0].style.width,
                    height:  controller.target[0].style.height,
                    top:     controller.target[0].style.top,
                    left:    controller.target[0].style.left,
                    bottom:  controller.target[0].style.bottom,
                    right:   controller.target[0].style.right
                },
                size: {
                    w: controller.target.width(),
                    h: controller.target.height(),
                    pw: controller.target.parent().width(),
                    ph: controller.target.parent().height()
                },
                offset: controller.target.offset()
            }
        }
        /*
        hay que sacar la parte de controller.vars.resizing.init.style y delegar esa parte a  jwk.ui.snapshot
        por ahora yo dejaría la parte de controller.vars.resizing.init.size y controller.vars.resizing.init.offset
        */

        if (controller.options.iFrameFix) {
            controller.target.closest("body").append(
                $("<div iFrameFix='true' style='z-index:9999'>").css({
                    background: "rgba(0 , 0 , 0 , 0.0001)",
                    top: 0, bottom: 0, left: 0, right: 0, position:"fixed"
                })
            );
        }
        controller.trigger("start", {target:controller.target});
    }
    
    formate_percent = function(controller, b) {
        var digits = 2;
        if (controller.options.round) {
            var str = ""+b;
            if (str.indexOf(".") > -1) {
                str = str.substring(0, str.indexOf(".")+1+digits);
            }                            
            return str;
        } else {
            return ""+b;
        }
    }
    
    formate_pixel = function(controller, b) {
        if (controller.options.round) {
            return ""+Math.round(b);
        } else {
            return ""+b;
        }
    }
    
    formate_offset = function(controller, prop, b, object) {
        var obj = {}; obj[prop] = b;
        object.offset(obj);
        if (controller.options.round) {
            var value = parseFloat(object[0].style[prop]);
            object.css(prop, formate_pixel(controller, value));
        } else {
            return ""+b;
        }
    } 

    resize_n = function (controller, evt) {
        var init = controller.vars.resizing.init;            
        if (typeof init.style["height"] == "string" && init.style["height"].indexOf("%") > -1 ) {
            var height = parseFloat(init.style["height"]);
            var dif_pc = height * (init.size.h - evt.motion.y) / init.size.h;
            var ahora = init.size.h * dif_pc / height;
            if (parseInt(controller.target.css("min-height")) > ahora) return;            
            controller.target.height(""+formate_percent(controller, dif_pc)+"%");
        } else {
            controller.target.height(formate_pixel(controller, init.size.h - evt.motion.y));
        } 

        if (controller.vars.vertical == "margin") {
            var css = controller.vars.css;
            var percent_motion  = evt.motion.y * css["top_k"] * 0.5;
            var percent_current = 50;
            var css_modif = {};
            if (css["top_percent"] < 0 && css["bottom_percent"] == 0) {
                percent_current = 50 + 0.5 * css["top_percent"];
            } else if (css["top_percent"] == 0 && css["bottom_percent"] < 0) {
                percent_current = 50 - 0.5 * css["bottom_percent"];
            }
            if (percent_current + percent_motion <= 50) {
                css_modif.top    = ((percent_current + percent_motion) * 2 -100) + "%";
                css_modif.bottom = "0%";
            } else {
                css_modif.top    = "0%";
                css_modif.bottom = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
            }                
            controller.target.css(css_modif);                
        } else {
            if (typeof init.style["top"] == "string" && init.style["top"].indexOf("%") > -1 ) {
                var top = parseFloat(init.style["top"]);
                var dif_pc = top + 100 * evt.motion.y / init.size.ph;
                controller.target.css("top", ""+formate_percent(controller, dif_pc)+"%");
            } else {
                formate_offset(controller, "top", evt.motion.y + init.offset.top, controller.target);
            }                
        }
    }

    resize_s = function (controller, evt) {

        var init = controller.vars.resizing.init;            
        if (typeof init.style["height"] == "string" && init.style["height"].indexOf("%") > -1 ) {
            var height = parseFloat(init.style["height"]);
            var dif_pc = height * (evt.motion.y + init.size.h) / init.size.h;
            var ahora = init.size.h * dif_pc / height;
            if (parseInt(controller.target.css("min-height")) > ahora) return;
            controller.target.height(""+formate_percent(controller, dif_pc)+"%");
        } else {
            controller.target.height(formate_pixel(controller, evt.motion.y + init.size.h));
        }

        if (controller.vars.vertical == "margin") {
            var css = controller.vars.css;
            var percent_motion  = evt.motion.y * css["top_k"] * 0.5;
            var percent_current = 50;
            var css_modif = {};
            if (css["top_percent"] < 0 && css["bottom_percent"] == 0) {
                percent_current = 50 + 0.5 * css["top_percent"];
            } else if (css["top_percent"] == 0 && css["bottom_percent"] < 0) {
                percent_current = 50 - 0.5 * css["bottom_percent"];
            }
            if (percent_current + percent_motion <= 50) {
                css_modif.top    = ((percent_current + percent_motion) * 2 -100) + "%";
                css_modif.bottom = "0%";
            } else {
                css_modif.top    = "0%";
                css_modif.bottom = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
            }                
            controller.target.css(css_modif);
        }

    }

    resize_e = function (controller, evt) {
        var init = controller.vars.resizing.init;
        if (typeof init.style["width"] == "string" && init.style["width"].indexOf("%") > -1 ) {
            var width = parseFloat(init.style["width"]);
            var dif_pc = width * (init.size.w + evt.motion.x) / init.size.w;
            var ahora = init.size.w * dif_pc / width;
            if (parseInt(controller.target.css("min-width")) > ahora) return;
            controller.target.width(""+formate_percent(controller, dif_pc)+"%");            
        } else {
            controller.target.width(formate_pixel(controller, init.size.w + evt.motion.x));
        }

        if (controller.vars.horizontal == "margin") {
            var css = controller.vars.css;
            var percent_motion  = evt.motion.x * css["left_k"] * 0.5;
            var percent_current = 50;
            var css_modif = {};
            if (css["left_percent"] < 0 && css["right_percent"] == 0) {
                percent_current = 50 + 0.5 * css["left_percent"];
            } else if (css["left_percent"] == 0 && css["right_percent"] < 0) {
                percent_current = 50 - 0.5 * css["right_percent"];
            }
            if (percent_current + percent_motion <= 50) {
                css_modif.left   = ((percent_current + percent_motion) * 2 -100) + "%";
                css_modif.right  = "0%";
            } else {
                css_modif.left   = "0%";
                css_modif.right  = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
            }                
            controller.target.css(css_modif);
        }            
    }

    resize_w = function (controller, evt) {
        var init = controller.vars.resizing.init;
        if (typeof init.style["width"] == "string" && init.style["width"].indexOf("%") > -1 ) {
            var width = parseFloat(init.style["width"]);
            var dif_pc = width * (init.size.w - evt.motion.x) / init.size.w;
            var ahora = init.size.w * dif_pc / width;
            if (parseInt(controller.target.css("min-width")) > ahora) return;
            controller.target.width(""+formate_percent(controller, dif_pc)+"%");
        } else {
            controller.target.width(formate_pixel(controller, init.size.w - evt.motion.x));
        }            

        if (controller.vars.horizontal == "margin") {
            var css = controller.vars.css;
            var percent_motion  = evt.motion.x * css["left_k"] * 0.5;
            var percent_current = 50;
            var css_modif = {};
            if (css["left_percent"] < 0 && css["right_percent"] == 0) {
                percent_current = 50 + 0.5 * css["left_percent"];
            } else if (css["left_percent"] == 0 && css["right_percent"] < 0) {
                percent_current = 50 - 0.5 * css["right_percent"];
            }
            if (percent_current + percent_motion <= 50) {
                css_modif.left   = ((percent_current + percent_motion) * 2 -100) + "%";
                css_modif.right  = "0%";
            } else {
                css_modif.left   = "0%";
                css_modif.right  = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
            }                
            controller.target.css(css_modif);                
        } else {            
            if (typeof init.style["left"] == "string" && init.style["left"].indexOf("%") > -1 ) {
                var left = parseFloat(init.style["left"]);
                var dif_pc = left + 100 * evt.motion.x / init.size.pw;
                controller.target.css("left", ""+formate_percent(controller, dif_pc)+"%");
            } else {
                formate_offset(controller, "left", evt.motion.x + init.offset.left, controller.target);
            }            
        }

    }    
    
    
    
    render.ResizableController = function(target, args) {
        
        var def_args = {
            round: true,
            enabled: true, // false
            iFrameFix: true,
            alsoResize: null,
            animate: null,
            appendTo: "target", // "target" | "parent"
            animateDuration: null,
            animateEasing: null,
            aspectRatio: null,
            autoHide: null,
            cancel: null,
            containment: null,
            delay: null,
            disabled: null,
            distance: null,
            ghost: null,
            grid: null,
            handles: "e, s, se", // n, e, s, w, ne, se, sw, nw, all
            helper: null,
            maxHeight: null,
            maxWidth: null,
            minHeight: null,
            minWidth: null,
            margin: {
                w: 40,
                h: 40
            }
        };
                
        jwk.Node.apply(this);
        // -- initialization ---
        this.init(target, $.extend({}, def_args, args));
    }
    
    
    render.ResizableController.prototype = new jwk.Node();
    render.ResizableController.prototype.constructor = render.ResizableController;
    render.ResizableController.prototype.type = "resizable";

    render.ResizableController.prototype.enable = function (enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.handlers.children(".resizable-helper").css("display","block");
        } else {
            this.handlers.children(".resizable-helper").css("display","none");
        }
        return this;
    }

    render.ResizableController.prototype.update = function (_opt) {
        // TODO: code to update options width new args        
        var options = jwk.extend(true, {}, this.options, _opt);
        this.options = options;        
        this.vars = {size:{}};

        var handles = options.handles.split(",")
        if (handles.length != this.helpers.length) {
            create_helpers(this, handles);
        }
        var controller = this;
        $(this.helpers).each(function(){
            var handle = this.attr("handle");
            var helper = this;

            function make_opt(handle, axis) {
                return  {
                    axis: axis,
                    cursorDragging: handle+"-resize",
                    cursorOver: handle+"-resize",
                    position:"absolute",
                    zIndex: false,
                    helper: "none"
                }
            }

            switch (handle) {
                case "n":
                    helper.draggable = this.setDraggable(make_opt(handle, "y")).controller();
                    helper.draggable.on("drag",function(e_name, evt) {
                        resize_n(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "ne": 
                    helper.draggable = this.setDraggable(make_opt(handle)).controller();
                    helper.draggable.on("drag",function(e_name, evt) {
                        controller.target.width(evt.motion.x + controller.vars.resizing.init.size.w);
                        resize_n(controller, evt);
                        resize_e(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "nw": 
                    helper.draggable = this.setDraggable(make_opt(handle)).controller();
                    helper.draggable.on("drag",function(e_name, evt) {
                        resize_n(controller, evt);
                        resize_w(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "s": 
                    helper.draggable = this.setDraggable(make_opt(handle, "y")).controller();
                    helper.draggable.on("drag",function(e_name, evt){
                        resize_s(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "se":
                    helper.draggable = this.setDraggable(make_opt(handle)).controller();
                    helper.draggable.on("drag",function(e_name, evt){
                        resize_s(controller, evt);
                        resize_e(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "sw":
                    helper.draggable = this.setDraggable(make_opt(handle)).controller();
                    helper.draggable.on("drag",function(e_name, evt){
                        resize_s(controller, evt);
                        resize_w(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "e": 
                    helper.draggable = this.setDraggable(make_opt(handle, "x")).controller();
                    helper.draggable.on("drag",function(e_name, evt){
                        resize_e(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "w":
                    helper.draggable = this.setDraggable(make_opt(handle, "x")).controller();
                    helper.draggable.on("drag",function(e_name, evt) {
                        resize_w(controller, evt);
                        update_vars(controller);
                    });
                    break;
            }
            if (helper.draggable && helper.draggable.on) {
                helper.draggable.on("start",function () {
                    register_values(controller);
                });
                helper.draggable.on("stop",function () { 
                    controller.vars.resizing = undefined;
                    update_vars(controller, true);
                    if (controller.options.iFrameFix) {
                        controller.target.closest("body").find("[iFrameFix]").remove();
                    }
                    controller.trigger("stop", {target:controller.target});
                });
            }
            /*
            n:  {my:"center center", at: "center top"},
            e:  {my:"center center", at: "right center"},
            s:  {my:"center center", at: "center bottom"},
            w:  {my:"center center", at: "left center"},
            ne: {my:"center center", at: "right top"},
            se: {my:"center center", at: "right bottom"},
            sw: {my:"center center", at: "left bottom"},
            nw: {my:"center center", at: "left top"}
            */
        });

        return this;
    }

    render.ResizableController.prototype.controller = function () { return this; }
    render.ResizableController.prototype.resize = function (size) {
        this.target.css(size);
        update_vars(controller);
    }

    render.ResizableController.prototype.init = function (target, options) {
        var ctrlid = "Resizable_"+jwk.nextId();
        this.set("id", ctrlid);
        this.target = target;
        this.handlers = target;
        this.relative = true;
        var controller = this;
        target.attr(controller.type, controller.get("id"));
        if (target.prop("nodeName").toLowerCase() === "iframe") {
            options.iFrameFix = true;
        }
        if (options.appendTo == "parent" || target.prop("nodeName").toLowerCase() === "iframe") {
            this.handlers = target.parent();
            this.relative = false;
        }
        this.helpers = [];
        if (options.handles.toLowerCase() == "all") {
            options.handles = "n, e, s, w, ne, se, sw, nw";
        }							
        this.update(options);
        this.enable(options.enabled);
    }

    render.setResizable = function (target, args) {
        controller = new render.ResizableController(target, args);
        target.data(ctrl_res.id, controller);
        return controller;
    }
    
    $.fn.setResizable = function( args ) {
        var target = $(this);            
        var controller = $(this).data(ctrl_res.id);
        if (!controller) {
            target.each(function() {
                controller = render.setResizable($(this), args);
                $(this).data(ctrl_res.id, controller);
            });
            return $.extend(this, { controller: function() {
                if ($(this).size() == 1) return $(this).data(ctrl_res.id);
                var consoladores = [];
                $(this).each(function(){
                    consoladores.push($(this).data(ctrl_res.id));
                });
                return $(consoladores);
            }});
        }         
        return controller.update(args);
    };

    return render.setResizable;


});
define('jwk-ui/render/html/jwk.ui.html.set-selectable',[
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "jquery"
], function(jwk, ui, render, $) {
    // console.log("jwk-ui/jwk.ui.set-selectable ------------------------------------------------------------------------------------------------------");
    
    var ctrl_sel = {
        id: "jwk.set-selectable",
        name: "jwk-selectable",
        prefix: "selectable-"
    };


    var select_this = function (controller, target, silent) {
        target.addClass(controller.options.selectedClass).removeClass(controller.options.unselectedClass);
        // If needed selected object is gonnaa be on top of the group mates
        // console.log("select_this: ", controller, target)
        var group = controller.group();
        if (controller.options.zIndex) {            
            jwk.ui.ontop(target, group);
        }        
        if (!silent) controller.trigger("select", {target: target, controller: controller, selection: group.filter("."+controller.options.selectedClass)});        
        return controller;
    };

    var unselect_all = function (controller) {
        var group = controller.group();
        
        group
            .addClass(controller.options.unselectedClass)
            .removeClass(controller.options.selectedClass);

        group.each(function () {
            var id = $(this).closest("[selectable]").attr("selectable");
            var selectable = ui.render.controlers.selectable[id];
            selectable.trigger("unselect", {target: $(this), controller: selectable});
        });
        
        return controller;
    };

    var is_focussed = function (controller, target) {
        return target.hasClass(controller.options.focussedClass);
    };

    var focus = function (controller, target) {
        target.addClass(controller.options.focussedClass);
        return controller;
    };

    var blur = function (controller, target) {
        target.removeClass(controller.options.focussedClass);
        return controller;
    };

    /*
    // Esto en realidad debería estar solo en jwk.ui.html.mouse y no replicado acá.
    // Lo que pasa es que el selectable fue concebido para usarse solo con DOM y no con componentes
    // Por eso en el init se hace target.on("mousedown") lo cual es un listener jquery y no de esta biblioteca.
    // por eso cuando se genera el event este no tiene la función which
    var track_attribute = function (attribute) {
        console.assert(typeof attribute == "string" && attribute.length > 0, attribute);
        var target = $(this.target);
        var wanted = target.closest("["+attribute+"]");
        return wanted.attr(attribute);
    }    
    */
    var mousedown = function (controller, event) {
        
        // event.which = track_attribute;

        var item_selector = "." + ctrl_sel.prefix + controller.options.applyTo;
        if (controller.options.applyTo == "children") {
            item_selector += " > *";
        }
        if (controller.options.applyTo == "group") {
            item_selector += " " + controller.options.group;
        }
        
        var item_elem = $(event.target).closest(item_selector);
        if (item_elem.size() == 0) return;

        // if current selection is equal to event target there's no changes
        var current = controller.group().filter("."+controller.options.selectedClass);
        if (current.size() == 1 && item_elem[0] == current[0]) return;

        var group = controller.group();
        // Determine the last clicked (the focussed element)
        var focussed = group.filter("."+controller.options.focussedClass);

        // If we don't have multiple selection just unselect everything
        if (!event.ctrlKey || !controller.options.allowMultiple) {
            unselect_all(controller);
        }
        if (event.shiftKey && controller.options.allowMultiple) {
            // We are gonna try to select all nodes between focussed and last clicked node
            if (focussed.size() == 0) {
                // We take the first sibling by default
                focus(controller, item_elem.siblings(":first"));
            } else if (item_elem.siblings("."+controller.options.focussedClass).size() > 0) {
                // The node is a brother of focussed node. Therefore, all intermediate nodes are selected

                // HACK: how to get the index in a more elegantely fashion?
                var parent = item_elem.parent();
                selecting = false;
                var filter = controller.options.group;
                var current_index = item_elem.index();
                /*
                if (controller.options.applyTo == "children") {
                    filter = undefined;
                    current_index = $(event.target).closest("[selectable] > *").index();
                    console.assert(item_elem.index() == current_index, item_elem.index(), current_index);
                } else {
                    current_index = $(event.target).closest("[selectable]").index();
                }
                */
                // console.warn("OJO que esto está modificado sin testear. Puede explotar mal!");
                parent.children(filter).each(function (index) {
                        var extremo = false;
                        if (is_focussed(controller, $(this))) {
                            selecting = !selecting;
                            extremo = true;
                        }
                        if (index == current_index) {
                            selecting = !selecting;
                            extremo = true;
                        }
                        if(selecting || extremo) {
                            select_this(controller, $(this), true);
                        }                                
                });                
                // dont change focussed
                var _selection = group.filter("."+controller.options.selectedClass);
                controller.trigger("select", {controller: controller, target: _selection, selection: _selection});
            } else {
                // Ad the node normaly because the fecussed node is not part of the siblings
                blur(controller, focussed);
                select_this(controller, item_elem); // this triggers "select" event
                focus(controller, item_elem);
            }
        } else {
            // Select normally
            blur(controller, focussed);
            select_this(controller, item_elem); // this triggers "select" event
            focus(controller, item_elem);
        }
    }


    render.SelectableController = function (target, args) {
        /*
        TODO: wishlist :D
        - stack: si seleccionás un objeto este pasa a estar arriba de todos.
        - maxSelected: 1 (no se pueden seleccionar más de esos elementos)
        - minSelected: 1 (no puede haber menos de esos elementos seleccionados. Si mueren ha de encontrarse reemplazo)
        */
        var def_args = {
            allowMultiple: false,
            selected: false,
            zIndex: true,
            selectedClass: "selected",
            unselectedClass: "unselected",
            focussedClass: "focussed",
            group: undefined, // any jquery valid selector. TODO: eliminar la dependencia con jquery
            applyTo: "target",
            cursor: "default",
            context: document,
        };

        if (args.applyTo == "group") {
            def_args.context = target;
        }
        
        var controller = this;
        jwk.Node.apply(controller);
        // -- initialization ---
        controller.init(target, $.extend({}, def_args, args));
    }


    render.SelectableController.prototype = new jwk.Node();
    render.SelectableController.prototype.constructor = render.SelectableController;
    render.SelectableController.prototype.type = "selectable";
    
    render.SelectableController.prototype.controller = function () { return this; }
    render.SelectableController.prototype.update = function (options) {
        // TODO: code to update options width new options
        console.error("SelectableController.prototype.update() not implemented");
        return this;
    }

    render.SelectableController.prototype.init = function (target, options) {
        var ctrlid = "Selectable_"+jwk.nextId();
        this.set("id", ctrlid);
        this.options = options;
        this.target = target;
        var controller = this;
        // console.log(target[0]);
        target.on("mousedown", null, this, function (event) {
            mousedown(controller, event);
        });
        target.attr(controller.type, controller.get("id"));
        target.addClass(ctrl_sel.prefix + options.applyTo);
        if (options.group) target.attr("selectable-group", options.group);
        // target.disableSelection();
        target.css("cursor", this.options.cursor);
        
        if (options.selected) {
            controller.select();            
        }
    }

    render.SelectableController.prototype.group = function () {
        if (this.options.applyTo == "children") {
            if (this.options.group) {
                return this.target.children(controller.options.group);
            } else {
                return this.target.children();
            }
        } else {
            if (this.options.group == "siblings") {
                return this.target.siblings();
            } else {
                console.assert(
                    this.options.context instanceof HTMLElement ||
                    this.options.context instanceof $ ||
                    this.options.context === document,
                        this.options.context);
                var group = null;
                if (this.options.applyTo == "group") {
                    group = $(this.options.group, this.options.context);
                } else {
                    group = $("[selectable-group='"+this.options.group+"']", this.options.context);                    
                }
                if (group.length > 0) {
                    return group;
                } else {
                    group = $(this.options.group, this.options.context);
                    if (group.length == 0) {
                        console.warn("WARNING: doesn't exist elements in the selectable group (" + this.options.group + ") for target: ", this.target);
                    }                    
                    return group;
                }                
            }            
        }
    }

    render.SelectableController.prototype.select = function (object) {
        unselect_all(this);
        if (!object && this.target) return select_this(this, this.target);
        if (object instanceof $) return select_this(this, object);
        if (object.target instanceof $) return select_this(this, object.target);        
    }

    render.SelectableController.prototype.all_instances = {};

    render.setSelectable = function (target, args) {
        controller = new render.SelectableController(target, args);
        target.data(ctrl_sel.id, controller);
        return controller;
    }
    
    $.fn.setSelectable = function( args ) {
        args = args || {};
        var target = $(this);
        var controller = target.data(ctrl_sel.id);
        if (!controller) {
            var def_args_for_all = {
                group: (args.applyTo != "children" ?
                        "select-group-"+Math.round(Math.random()*100) :
                        undefined)
            };
            controller = render.setSelectable(target, $.extend(def_args_for_all,args));
            target.data(ctrl_sel.id, controller);
            target.controller = function( ) { return $(this).data(ctrl_sel.id); }
            return target;
        }         
        return controller.update(args);
    };

    return render.setSelectable;
        
});    
define('jwk-ui/render/html/jwk.ui.html.set-sortable',[
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "./jwk.ui.html.set-draggable",
    "./jwk.ui.html.set-droppable",
    "jquery"
], function(jwk, ui, render, draggable, droppable, $) {
    
    var ctrl_sort = {
        id: "jwk.set-sortable",
        name: "jwk-sortable",
        prefix: "sortable-"
    };

    function swap(controller, swap, evt) {
        controller.vars[swap=="after"?"next":"prev"].obj[swap](controller.placeholder);
        update_vars(controller);
        controller.trigger("swap", {
            event: evt,
            target: controller.dragging,
            index: controller.vars.index,
            index_ini:controller.init_index,
            index_last: controller.vars.index + (swap=="before"? 1:-1)
        });
    }

    function update_vars(controller) {
        var _prev = controller.prev();
        var _next = controller.next();
        controller.vars = {
            prev: {
                obj: _prev,
                offset: _prev.offset(),
                size: { w: _prev.outerWidth(), h: _prev.outerHeight()}
            },
            next: {
                obj: _next,
                offset: _next.offset(),
                size: { w: _next.outerWidth(), h: _next.outerHeight()}
            },
            helper: {
                offset: controller.helper.offset(),
                size: {
                    w: controller.helper.outerWidth(),
                    h: controller.helper.outerHeight()
                }
            },
            index: controller.placeholder.prevAll(":visible").size()
        }
        // console.log("controller.vars", controller.vars);
    }

    next_or_prev_sibbling = function (controller, sibling, which) {
        console.assert(which=="prev" || which=="next");
        console.assert(controller.helper);
        console.assert(controller.placeholder);
        console.assert(controller.dragging);
        var elem = sibling[which]();
        if (elem && elem[0] == controller.helper[0]) {
            elem = next_or_prev_sibbling(controller, elem, which);
        }
        if (elem && elem[0] == controller.placeholder[0]) {
            elem = next_or_prev_sibbling(controller, elem, which);
        }
        if (elem && elem[0] == controller.dragging[0]) {
            elem = next_or_prev_sibbling(controller, elem, which);
        }
        if (elem) return elem;
    }

    render.SortableController = function (target, args) {
        var def_args = {
            cursor: "default",
            axis: "y"
        };

        jwk.Node.apply(this);
        this.init(target, $.extend({}, def_args, args));
    }

    render.SortableController.prototype = new jwk.Node();
    render.SortableController.prototype.constructor = render.SortableController;
    render.SortableController.prototype.type = "sortable";

    render.SortableController.prototype.controller = function () { return controller; }
    render.SortableController.prototype.update = function (options) {
        // TODO: code to update options width new options
        return this;
    }

    render.SortableController.prototype.init = function (target, options) {
        var ctrlid = "Sortable_"+jwk.nextId();
        controller.set("id", ctrlid);

        var group = "sortabble-group-" + ctrlid;
        controller.options = options;
        controller.target = target;
        target.attr(controller.type, controller.get("id"));
        controller.target.setDraggable({axis: controller.options.axis, helper: "clone", applyTo:"children", group: group, position:"absolute"}).controller()

        .on("start", function (e_name, evt) {
            controller.dragging = evt.target;
            controller.helper   = evt.helper;
            controller.helper.addClass("helper");
            controller.helper.width(evt.target.width());
            controller.helper.height(evt.target.height());

            controller.placeholder = controller.dragging.css("visibility", "hidden").addClass("sortting-placeholder");
            update_vars(controller);
            controller.init_index = controller.vars.index;
            console.log(controller.vars);
        })

        .on("drag", function (e_name, evt) {
            var vars = controller.vars;
            if (controller.options.axis == "y") {
                if (vars.prev.obj.size() > 0) {
                    if (evt.helper.offset().top < vars.prev.offset.top + (vars.prev.size.h / 2)) {
                        swap(controller, "before", evt);
                    }
                }
                if (vars.next.obj.size() > 0) {
                    var t_bottom = evt.helper.offset().top + vars.helper.size.h;
                    if (t_bottom > vars.next.offset.top + (vars.next.size.h / 2)) {
                        swap(controller, "after", evt);
                    }
                }
            } else {
                if (vars.prev.obj.size() > 0) {
                    if (evt.helper.offset().left < vars.prev.offset.left + (vars.prev.size.w / 2)) {
                        swap(controller, "before", evt);
                    }
                }
                if (vars.next.obj.size() > 0) {
                    var t_right = evt.helper.offset().left + vars.helper.size.w;
                    if (t_right > vars.next.offset.left + (vars.next.size.w / 2)) {
                        swap(controller, "after", evt);
                    }
                }
            }                    
        })

        .on("stop", function (e_name, evt) {
            controller.placeholder.css("visibility", "").removeClass("sortting-placeholder");
            controller.target.children().css("z-index", "");
            var event = { event: evt, target: evt.target, index: controller.vars.index, index_ini:controller.init_index};
            // controller.trigger("sort:end", event);
            controller.trigger("sort", event);
        });

    }

    render.SortableController.prototype.prev = function (sibling) {
        return next_or_prev_sibbling(controller, sibling || controller.placeholder, "prev");
    }

    render.SortableController.prototype.next = function (sibling) {
        return next_or_prev_sibbling(controller, sibling || controller.placeholder, "next");
    }        

    render.setSortable = function (target, args) {
        controller = new render.SortableController(target, args);
        target.data(ctrl_sort.id, controller);
        return controller;
    }

    $.fn.setSortable = function( args ) {
        args = args || {};
        var target = $(this);
        var controller = target.data(ctrl_sort.id);
        if (!controller) {
            controller = render.setSortable(target, args);
            target.data(ctrl_sort.id, controller);
            target.controller = function( ) { return $(this).data(ctrl_sort.id); }
            return target;
        }         
        return controller.update(args);
    };

    return render.setSortable;
});

define('jwk-ui/render/html/jwk.ui.html',[
    "jwebkit",
    "./jwk.ui.html.core",
    "./jwk.ui.html.mouse",
    "./jwk.ui.html.keyboard",
    "./jwk.ui.html.set-draggable",
    "./jwk.ui.html.set-droppable",
    "./jwk.ui.html.set-position",
    "./jwk.ui.html.set-resizable",
    "./jwk.ui.html.set-selectable",
    "./jwk.ui.html.set-sortable",
], function(jwk, render){
    // console.log("jwk-ui ------------------------------------------------------------------------------------------------------");
    return render;
});
define('jwk-ui/set/jwk.ui.panel',[
    "jwebkit",
    "jquery",
    "../jwk.ui.component",
], function(jwk, $, Component) {
  
    
    // jwk.ui.panel library namespace
    jwk.ui.panel = {}
    
    // Panel ----------------------------------------------------------------------------------
    jwk.ui.panel.Panel = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel").defaults();
        Component.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Panel,
        extends: Component,
        defaults: { template: { main: "<div></div>" } }
    });    

    
    // Placeholder --------------------------------------------------------------------------
    jwk.ui.panel.Placeholder = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.placeholder").defaults();        
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.placeholder",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Placeholder,
        extends: jwk.ui.panel.Panel,
        api: {
            parent_for: function (name, index) {
                return (this.parent || this.owner).parent_for(name, index);
            }
        },
        defaults: { ui_type: "panel.placeholder", template: { main: "" } },
    });
    
    
    // Form --------------------------------------------------------------------------
    jwk.ui.panel.Form = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.form").defaults();        
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.form",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Form,
        extends: jwk.ui.panel.Panel,
        api: {
            parent_for: function (name, index) {
                return { parent:this, query: "form" };
            }
        },
        defaults: { ui_type: "panel.form", template: { main: "<div><form></form></div>" } },
    });
    
    
    // Image --------------------------------------------------------------------------
    jwk.ui.panel.Image = function (_settings) {
        if (!_settings) return;
        
        var def = jwk.ui.component("jwk-ui", "panel.image").defaults();
        var settings = jwk.extend(true, def, _settings);
        jwk.ui.panel.Panel.call(this, settings);
        
        this.set("url", this.url);
        this.settings.template.url = this.url;
        
        this.on("render_start", function (n,e) {
            this.settings.template.url = this.url;            
        }, this);
        
        this.on("change:url", function (n,e) {
            this.settings.template.url = e.value;
            if (this.target) this.paint();
        }, this);
    }    
    
    jwk.ui.component({
        ui_type: "panel.image",
        namespace: "jwk-ui",
        defaults: {
            ui_type: "panel.image",
            template: {
                url: "http://www.example.com",
                main: "<div><img src='{{>url}}' style='border:0px;' /></div>"
            }
        },
        constructor: jwk.ui.panel.Image,
        extends: jwk.ui.panel.Panel
    });    
    
    // iFrame --------------------------------------------------------------------------
    jwk.ui.panel.iFrame = function (_settings) {
        if (!_settings) return;
        
        var def = jwk.ui.component("jwk-ui", "panel.iframe").defaults();
        var settings = jwk.extend(true, def, _settings);
        this.set("url", settings.url || settings.template.url);
        settings.template.url = this.get("url");
        jwk.ui.panel.Panel.call(this, settings);
        this.on("change:url", function (n,e) {
            this.settings.url = e.value;
            this.paint();
        }, this);
        
        if (jwk.global) {

            function on_iframe (n,e)  {
                if (e.popup) return;
                if (e.iframe[0] == this.target[0]) {                    
                    var id = e.global.replace("global", "iframe");
                    var proxy = jwk.global.proxy(id);
                    this.set("proxy", proxy);
                }
            }
            // el siguiente listener es on en vez de one porque sucede que la aplicación dentro de un iframe puede recargarse perdiendo la identidad y desconectándose del jwk.net
            // La solución es esperar a que se cargue de vuelta y se conecte otra vez.
            // Es por eso que se usa on() en vez de one().            
            jwk.global.on("iframe", on_iframe, this);   
        } else {
            console.error("no existe global");
            alert("no existe global");
        }

    }    
    
    jwk.ui.component({
        ui_type: "panel.iframe",
        namespace: "jwk-ui",
        defaults: {
            ui_type: "panel.iframe",
            template: {
                url: "http://www.example.com",
                main: "<iframe src='{{>url}}' style='border:0px;width:100%;height:100%'></iframe>"
            }
        },
        constructor: jwk.ui.panel.iFrame,
        extends: jwk.ui.panel.Panel
    });
    
    
    // Emboss --------------------------------------------------------------------------
    jwk.ui.panel.Emboss = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.emboss").defaults();
        sett = jwk.extend(def, settings);        
        this.set("row_1.cells", [{"class":"left top corner", "img": true},    {"class":"middle top side", "img": true},    {"class":"right top corner", "img": true}], {deep: true, parse: true});
        this.set("row_2.cells", [{"class":"left center side", "img": true},   {"class":"container center"},                {"class":"right center side", "img": true}], {deep: true, parse: true});
        this.set("row_3.cells", [{"class":"left bottom corner", "img": true}, {"class":"middle bottom side", "img": true}, {"class":"right bottom corner", "img": true}], {deep: true, parse: true});
        jwk.ui.panel.Panel.call(this, sett);
    }
    
    jwk.ui.component({
        ui_type: "panel.emboss",
        namespace: "jwk-ui",
        defaults: {
            ui_type: "panel.emboss",
            namespace: "jwk-ui",
            template: {
                cell: "<td class='{{class}}' owner='{{self.name}}'>{{#img}} <img style='visibility: hidden;' src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' />{{/img}}</td>",
                cellection: "{{#toArray}}{{>cell}}{{/toArray}}",
                row: "<tr>{{#cells}}{{>cellection}}{{/cells}}</tr>",
                empty: "<tr>{{>cell}}{{>cell}}{{>cell}}</tr>",
                rows: "<tbody>{{#row_1}}{{>row}}{{/row_1}}{{#row_2}}{{>row}}{{/row_2}}{{#row_3}}{{>row}}{{/row_3}}</tbody>",
                main: "<div><table style='width: 100%; height: 100%;' cellpadding='0' cellspacing='0'>{{#self}}{{>rows}}{{/self}}</table></div>",                
            },            
        },
        api: { parent_for: function (name, index) { return {parent:this, query: ".container"}; }},
        constructor: jwk.ui.panel.Emboss,
        extends: jwk.ui.panel.Panel
    });
  
    jwk.ui.component({
        ui_type: "panel.inset",
        namespace: "jwk-ui",        
        constructor: jwk.ui.panel.Emboss,        
    });
     
    /*
    // RowSplitter --------------------------------------------------------------------------
    jwk.ui.panel.RowSplitter = function (settings) {        
        if (!settings) return;
        var def = jwk.ui.component("panel.row-splitter", "jwk-gui").defaults();
        var sett = jwk.extend(def, settings);        
        
        sett.draggable.axis = sett.axis;
        jwk.ui.panel.Panel.call(this, sett);
        this.one("render", function (name, event) {
            event.component.controllers.draggable.on("start", function (name, event) {
                var cell_resizer = $(event.target).closest("td[cell]");
                if (this.side == "width") {
                    cell_target = cell_resizer.prev();
                } else {
                    cell_target = cell_resizer.parent().prev().find("[cell]").eq(0);
                }
                event.helper.css("display", "none");
                this._init = {
                    prop: cell_target[this.side](),
                    parent_prop: cell_target.parent()[this.side](),
                    offset: cell_target.offset(),
                    cell_target: cell_target
                }
                this._init.width_percent = this._init.prop / this._init.parent_prop;
            }, event.component);            
            event.component.controllers.draggable.on("drag", function (name, event) {
                var dif = this._init.cell_target.offset()[this.which] - this._init.offset[this.which];
                var prop = this._init.prop + event.motion[this.axis] - dif;
                if (this.side == "height") {
                    this.use = "px"; // no vertical percent support
                }                
                switch (this.use) {
                    case "px":
                        this._init.cell_target[this.side](prop);                        
                        break;
                    case "%":                    
                        var percent = (100 * prop / this._init.parent_prop) + "%";
                        this._init.cell_target.css(this.side, percent);
                        break;
                    default:
                        console.log("not implemented", this.use);
                        this._init.cell_target[this.side](prop);   
                        break;
                }
                
            }, event.component);
        });
    }
    
    //jwk.ui.panel.RowSplitter.prototype = new jwk.ui.panel.Panel();
    //jwk.ui.panel.RowSplitter.prototype.constructor = jwk.ui.panel.RowSplitter;
    
    jwk.ui.component({
        ui_type: "panel.row-splitter",
        namespace: "jwk-gui",
        defaults: {
            class: "splitter",
            ui_type: "panel.row-splitter",
            namespace: "jwk-gui",
            name: "gustavo",
            use: "px",
            side: "width",
            which: "left",
            axis: "x",
            draggable: {
                disable_selection: true,
                iFrameFix: true,
                cursorDragging: "ew-resize",
                cursorOver: "ew-resize",
                helper: "clone",
                round: true,
                axis: "x"
            },            
            template: {
                main: "<div></div>",
            },            
        },
        constructor: jwk.ui.panel.RowSplitter,
        extends: jwk.ui.panel.Panel
    });
    
    // ColSplitter --------------------------------------------------------------------------
    jwk.ui.panel.ColSplitter = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        var sett = jwk.extend(def, settings);        
        jwk.ui.panel.RowSplitter.call(this, sett);
    }
    
    //jwk.ui.panel.ColSplitter.prototype = new jwk.ui.panel.RowSplitter();
    //jwk.ui.panel.ColSplitter.prototype.constructor = jwk.ui.panel.ColSplitter;    
    jwk.ui.component({
        ui_type: "panel.col-splitter",
        namespace: "jwk-gui",        
        constructor: jwk.ui.panel.ColSplitter,
        extends: jwk.ui.panel.RowSplitter,
        defaults: {
            ui_type: "panel.col-splitter",            
            side: "height",
            which: "top",
            axis: "y",
            draggable: {
                cursorDragging: "ns-resize",
                cursorOver: "ns-resize",
            },
            template: {
                main: "<div></div>",
            }                           
        }
    });    
    */
    
    jwk.ui.panel.Splitter = function (settings) {        
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        var sett = jwk.extend(true, def, settings);        
        sett.class = (sett.class ? sett.class + " " : "") + "splitter";
        sett.draggable.axis = sett.axis;
        jwk.ui.panel.Panel.call(this, sett);
        
        jwk.ui.window.on("resize", function (eventname, event) {
            // console.log("this.controllers.draggable.move", [this, this.target]);            
            var cell_resizer = this.target.closest("td[cell]");
            if (this.side == "width") {
                cell_target = cell_resizer.prev();
            } else {
                cell_target = cell_resizer.parent().prev().find("[cell]").eq(0);
            }
            var value = cell_target[this.side]();
            var parent_value =  cell_target.parent()[this.side]();
            var percent = value / parent_value;
            this.trigger("resize:"+this.side, {value:value, percent:percent, total: parent_value, "units":this.use});            
            // this.controllers.draggable.move({x:0,y:0});
        }, this, {lazy:true});
        
        this.one("render", function (name, event) {
            event.component.controllers.draggable.on("start", function (name, event) {
                var cell_resizer = $(event.target).closest("td[cell]");
                if (this.side == "width") {
                    cell_target = cell_resizer.prev();
                } else {
                    cell_target = cell_resizer.parent().prev().find("[cell]").eq(0);
                }
                event.helper.css("display", "none");
                this._init = {
                    prop: cell_target[this.side](),
                    parent_prop: cell_target.parent()[this.side](),
                    offset: cell_target.offset(),
                    cell_target: cell_target
                }
                this._init.width_percent = this._init.prop / this._init.parent_prop;
            }, event.component);            
            event.component.controllers.draggable.on("drag", function (name, event) {
                var dif = this._init.cell_target.offset()[this.which] - this._init.offset[this.which];
                var value = this._init.prop + event.motion[this.axis] - dif;
                if (this.side == "height") {
                    this.use = "px"; // no vertical percent support
                }       
                var percent =  (100 * value / this._init.parent_prop);
                switch (this.use) {
                    case "px":
                        this._init.cell_target[this.side](value);                        
                        break;
                    case "%":                        
                        this._init.cell_target.css(this.side, percent + "%");
                        break;
                    default:
                        console.log("not implemented", this.use);
                        this._init.cell_target[this.side](value);   
                        break;
                }                
                this.trigger("resize:"+this.side, {value:value, percent:percent, total: this._init.parent_prop, "units":this.use});
                
            }, event.component);
        });
    }
    
    jwk.ui.component({
        ui_type: "panel.row-splitter",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Splitter,
        defaults: {            
            ui_type: "panel.row-splitter",
            name: "gustavo",
            use: "px",
            side: "width",
            which: "left",
            axis: "x",
            draggable: {
                disable_selection: true,
                iFrameFix: true,
                helper: "clone",
                round: true,
                axis: "x",
                cursorDragging: "ew-resize",
                cursorOver: "ew-resize",
            },            
            template: {
                main: "<div></div>",
            },            
        },
        extends: jwk.ui.panel.Panel
    });
    
    jwk.ui.component({
        ui_type: "panel.col-splitter",
        namespace: "jwk-ui",        
        constructor: jwk.ui.panel.Splitter,
        defaults: {
            ui_type: "panel.col-splitter",            
            side: "height",
            which: "top",
            axis: "y",
            draggable: {
                disable_selection: true,
                iFrameFix: true,
                helper: "clone",
                round: true,
                axis: "y",                
                cursorDragging: "ns-resize",
                cursorOver: "ns-resize"
            },
            template: {
                main: "<div></div>",
            }
        }
    });     
        
    
    /*
    // Line: Col & Row (DIV version) --------------------------------------------------------------------------
    jwk.ui.panel.Line = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();        
        def.data = this;
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    //jwk.ui.panel.Line.prototype = new jwk.ui.panel.Panel();
    //jwk.ui.panel.Line.prototype.constructor = jwk.ui.panel.Line;
        
    jwk.ui.component({
        ui_type: "panel.col",
        namespace: "jwk-gui",
        defaults: {
            template: {
                empty: "<div></div>",
                entry: "<div child_type=\"{{ui_type}}\" cell=\"{{name}}\" child=\"{{name}}\"></div>",
                children: "{{#values}}{{>entry}}{{/values}}",
                self: "{{#children}}{{>children}}{{/children}}{{^children}}{{>empty}}{{/children}}",                
                main: "<div>{{#self}}{{>self}}{{/self}}</div>",
            },            
        },
        constructor: jwk.ui.panel.Line,
        extends: jwk.ui.panel.Panel
    });
    
    
    
    jwk.ui.component({
        ui_type: "panel.row",
        namespace: "jwk-gui",
        // defaults: jwk.ui.component("jwk-gui", "panel.col").defaults(),
        defaults: {
            template: {
                empty: "<div></div>",
                entry: "<div child_type=\"{{ui_type}}\" cell=\"{{name}}\" child=\"{{name}}\"></div>",
                children: "{{#values}}{{>entry}}{{/values}}",
                self: "{{#children}}{{>children}}{{/children}}{{^children}}{{>empty}}{{/children}}",                
                main: "<div>{{#self}}{{>self}}{{/self}}</div>",
            },            
        },        
        constructor: jwk.ui.panel.Line        
    });
    */
    
    
    
    // Row --------------------------------------------------------------------------
    jwk.ui.panel.Row = function (settings) {
        if (!settings) return;
        var def = {
            data: this,
            template: {
                empty: "<td><div></div></td>",
                entry: "<td child_type=\"{{ui_type}}\" cell=\"{{name}}\"><div child=\"{{name}}\"></div></td>",
                children: "{{#values}}{{>entry}}{{/values}}",                
                self: "{{#children}}{{>children}}{{/children}}{{^children}}{{>empty}}{{/children}}",
                main: "<table cellpadding='0' cellspacing='0'><tr>{{#self}}{{>self}}{{/self}}</tr></table>"                
            },            
        };
        jwk.ui.panel.Panel.call(this, jwk.extend(def, settings));
        //jwk.ui.panel.Panel.call(this, settings);
    }
    
    jwk.ui.panel.Row.prototype = new jwk.ui.panel.Panel();
    jwk.ui.panel.Row.prototype.constructor = jwk.ui.panel.Row;

    jwk.ui.component({
        ui_type: "panel.row",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Row
    });    
    
    // Col --------------------------------------------------------------------------
    jwk.ui.panel.Col = function (settings) {
        if (!settings) return;
        var def = {
            data: this,
            template: {
                empty: "<tr><td><div></div></td></tr>",
                entry: "<tr><td child_type=\"{{ui_type}}\" cell=\"{{name}}\"><div child=\"{{name}}\"></div></td></tr>",
                children: "{{#values}}{{>entry}}{{/values}}",
                self: "{{#children}}{{>children}}{{/children}}{{^children}}{{>empty}}{{/children}}",                
                main: "<table cellpadding='0' cellspacing='0'>{{#self}}{{>self}}{{/self}}</table>",               
            },            
        };
        jwk.ui.panel.Panel.call(this, jwk.extend(def, settings));
        
    }
    
    jwk.ui.panel.Col.prototype = new jwk.ui.panel.Panel();
    jwk.ui.panel.Col.prototype.constructor = jwk.ui.panel.Col;

    jwk.ui.component({
        ui_type: "panel.col",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Col
    });
    
    // http://jsfiddle.net/GgZm7/10/
    // Layout --------------------------------------------------------------------------
    jwk.ui.panel.Panel.Layout = function (settings) {
        if (!settings) return;
        var def = {
            datapath: "self:layout",
        };
        settings = jwk.extend(def, settings);
        // settings.class = (settings.class ? settings.class + " " : "") + "flat";
        jwk.ui.panel.Panel.call(this, settings);
        this.set("layout", this.layout, {no_parse: true});
        // console.log("---------------->", this.get("layout"));
        this.on("render_start", function (n,e) {            
            this.set("layout", this.layout, {no_parse: true});
            e.component.restructure();  
        }, this);
    }
    
    jwk.ui.panel.Panel.Layout.prototype = new jwk.ui.panel.Panel();
    jwk.ui.panel.Panel.Layout.prototype.constructor = jwk.ui.panel.Panel.Layout;

    jwk.ui.panel.Panel.Layout.prototype.structure_tree = function () {
        var layout = this.my_data();
        console.assert(layout, "ERROR: missing layout parameter.", [this], "settings: ", this.settings.layout, "data: ", [this.settings.data]);
        
        function recursiva (array, is_row) {
            var ret = {children:{}};
            if (array instanceof jwk.Collection) {
                array = array.toArray();
            }
            
            if (Array.isArray(array)) {
                ret.class = "expand";
                ret.ui_type = "panel." + (is_row?"row":"col");
                for (var i in array) {
                    // if (typeof array[i] == "string") continue; // no agrego los nodos que son mis hijos                    
                    var name = typeof array[i] == "string" ? array[i] : (!is_row?"row_":"col_")+i;                    
                    var child = recursiva.call(this, array[i], !is_row);
                    if (child.name) { name = child.name };
                    ret.children[name] = child;
                }
            } else if (typeof array == "string") {
                if (array.indexOf("|") == 0) {
                    ret = {
                        ui_type: is_row ? "panel.col-splitter" : "panel.row-splitter",
                        name: "splitter-"+jwk.nextId(),
                        class: "flat"
                    };
                    if (array.indexOf("%") > 0) ret.use = "%";
                } else {
                    ret = this.settings.children[array];                
                    console.assert(ret, "ERROR: layout referes to an unexisting child called "+ array);            
                    ret = {ui_type: "panel.placeholder"};
                }
            }
            return ret;
        }
        
        var structure = recursiva.call(this, layout, this.settings["start"] != "col");        
        structure.layout = layout;
        structure.namespace = this.settings.namespace;
        structure.name = (this.settings["start"] ? this.settings["start"] : "col")+ "_0";
        // console.log(structure);
        return structure;
    }

    jwk.ui.panel.Panel.Layout.prototype.parent_for = function (name, index) {
        if (name == "col_0") return {parent:this};
        if (name == "row_0") return {parent:this};        
        var obj = {parent: this.get("structure"), query:"[child="+name+"]"};        
        if (this.render.resolve_target(obj, true)) {
            return obj;
        }
        return {parent:{target:$("")}};
    }

    jwk.ui.component({
        ui_type: "panel.layout",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Panel.Layout
    });    
    
    
    // Layout --------------------------------------------------------------------------
    jwk.ui.panel.Panel.Table = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.table").defaults();
        settings = jwk.extend(def, settings);
        jwk.ui.panel.Panel.call(this, settings);
        var table = this;
        this.on("render_start", function (n,e) {
            var fila = -1;
            var col = 0;
            this.rows = [];
            console.assert(typeof this.cols == "number", "ERROR: you must specify how many columns should have the table");
            var children = this.children.valueOf();
            this.children.each(function (obj, name, index) {
                col++;
                if ((index*1) % table.cols == 0) {
                    fila++;
                    col = 0;
                }
                table.rows[fila] = table.rows[fila] || [];
                table.rows[fila].push({name:name, col:col});            
            });
        }, this);
        
    }
    
    jwk.ui.panel.Panel.Table.prototype = new jwk.ui.panel.Panel();
    jwk.ui.panel.Panel.Table.prototype.constructor = jwk.ui.panel.Panel.Table;

    jwk.ui.panel.Panel.Table.prototype.parent_for = function (name, index) {
        if (name == "col_0") return {parent:this};
        if (name == "row_0") return {parent:this};
        var obj = {parent:this.get("structure"), query:"[child="+name+"]"};        
        if (this.render.resolve_target(obj, true)) {
            return obj;
        }
        return {parent:{target:$("")}};
    }

    jwk.ui.component({        
        ui_type: "panel.table",
        namespace: "jwk-ui",
        api: {
            parent_for: function (name, index) {
                var obj = {parent:this, query:"[child="+name+"]"};
                if (this.render.resolve_target(obj, true)) {
                    return obj;
                }
                return {parent:{target:$("")}};
            }
        },
        defaults: {
            cols: 2,
            template: {
                cell: "<td child='{{name}}' col='{{col}}'></td>",
                rows: "<tr>{{#.}}{{>cell}}{{/.}}</tr>",
                main: "<table>{{#self.rows}}{{>rows}}{{/self.rows}}</table>"
            }
        },
        constructor: jwk.ui.panel.Panel.Table
    });    
    
    
    // Splitter --------------------------------------------------------------------------
    jwk.ui.panel.Splitter = function (settings) {
        if (!settings) return;
        var def = { ui_type: "panel.splitter" };
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.splitter",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Splitter,
        extends: jwk.ui.panel.Panel
    });
    
    // Scroll --------------------------------------------------------------------------
    jwk.ui.panel.Scroll = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.scroll").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.scroll",
        namespace: "jwk-ui",
        api: {
            parent_for: function (name, index) {
                return {parent: this, query: ".content"};
            }
        },
        defaults: {
            template: {
                main: "<div><div class='content' component='panel.scroll'></div></div>",
            }
        },        
        constructor: jwk.ui.panel.Scroll,
        extends: jwk.ui.panel.Panel
    });    
    
    // Tabs --------------------------------------------------------------------------
    jwk.ui.panel.Tabs = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.tabs").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
        
        var children = new jwk.Node();
        this.set("children",children);
        
        // this.on("all", function () { console.log("--------------", arguments); })
        
        function update_tab_buttons (n, e) {
            if (e.path.indexOf(".") != -1) return this; // No cambiaron los hijos sino una propiedad de uno de ellos. 
            // console.log("update_tab_buttons", arguments)
            var tabs = this;
            var buttons = this.search("tab_buttons");
            console.log(buttons);
            var content = this.search("tab_content");
            if (buttons) {
                buttons.drop_children();
                this.get("children").each(function (child){
                    var extra = {};
                    if (typeof child.tab == "string") {
                        extra.text = child.tab;
                    }
                    if (typeof child.tab == "object") {
                        extra = child.tab;
                    }                
                    var settings = jwk.extend({}, {
                        "parent": buttons,
                        "class": "emboss",
                        "name": child.name + "_btn",
                    }, tabs.tab_button, extra);

                    var btn = jwk.ui.create_component(
                        settings
                    );

                    if (child.selected) {
                        btn.autoselect = true;
                    }

                    btn.on("feature:selectable", function () {
                        this.controllers.selectable.on("select", function (n, e) {                      
                            var name = e.controller.component.name;
                            name = name.substring(0, name.length-4);                    
                            tabs.get("children").each(function (child) {                            
                                child.set("visible", false);
                            });
                            tabs.search(name).set("visible", true);
                        });
                        /*
                        if (child.selected) {                        
                            btn.one("render", function () {
                                this.select();
                            }, btn);
                        }
                        */
                    }, btn);
                });

                this.one("render", function () {
                    console.log(this);
                    this.get("children").each(function (child) {
                        if (child.autoselect) {
                            delete child.autoselect;
                            console.log("child.select()", [child]);
                            child.select();
                        }
                    });
                }, buttons);
            }
        }        
        
        children.on("change", update_tab_buttons, this);
        this.on("change:structure", update_tab_buttons, this);
        
    }
    
    jwk.ui.component({
        "ui_type": "panel.tabs",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.panel.Tabs,
        "extends": jwk.ui.panel.Panel,
        "defaults": function () {
            return {
                "tab_button": {
                    "ui_type": "button.option",
                    "namespace": this.namespace, 
                },                
                "horizontal": false,
                "layout": ["tab_buttons", "tab_content"]
            };
        },
        "api": {
            "add_tab": function () {
            },
            "parent_for": function (name, index) {
                switch (name) {
                    case "structure": return { parent: this };
                    default:
                        return { parent: this.search("tab_content") };
                }
            },            
            "structure_tree": function () {
                var structure = {
                    "ui_type": "panel.layout",
                    "class": "expand",
                    "name": "structure",
                    "start": this.settings.horizontal ? "row" : "col",
                    "layout": this.settings.layout,
                    "children": {
                        "tab_buttons": {
                            "ui_type": "panel",
                            "class": "flat background expand"
                        },
                        "tab_content": {
                            "ui_type": "panel",
                            "class": "flat expand"
                        }
                    }
                }
                return structure;
            }
        }
    });
        
    // Sections --------------------------------------------------------------------------
    jwk.ui.panel.Sections = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.sections").defaults();
        jwk.ui.panel.Tabs.call(this, jwk.extend(true, def, settings));
        
        this.on("change:value", function (n,e) {
            this.section(e.value);
        }, this);
    }
    
    jwk.ui.component({
        "ui_type": "panel.sections",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.panel.Sections,
        "extends": jwk.ui.panel.Tabs,
        "defaults": function () {
            return {
                "tab_button": {
                    "ui_type": "button.option",
                    "namespace": this.namespace, 
                },                
                "horizontal": false,
                "layout": ["tab_buttons", "tab_content"]
            };
        },
        "api": {
            "setTabsContainer": function (parent) {
                console.assert(typeof parent.drop_children == "function", parent);
                // tab__buttons está dentro de la estructura. Por eso hay que buscarla con search.
                this.search("tab_buttons").drop_children();
                // La nueva this.tab_button es para sobreescribir la anterior y que se empiece z usar esa en vez de la otra.
                this.set("tab_buttons", parent);
                // Forzamos a que se actualice la estructura
                this.children.trigger_fast("change", {"path": "_this_it_to_force_update_tabs_"});
                // Forzamos a que se actualice la interfaz
                parent.paint();
            },
            "section": function (sec) {
                var btn = this.search("tab_buttons").search(sec + "_btn");
                console.assert(btn, "ERROR: jwk-ui.panel.section.section(sec) child not found: ", sec, " children: ", this.children);
                btn.select();
            },
            "_update_update_value": function (event, prop) {
                this[prop] = event.value;
                return this;
            },
            "_update_restructure": function () { return this; },
        }
    });
    
    
    
    
    
    
    // Accordion --------------------------------------------------------------------------
    jwk.ui.panel.Formlayout = function (settings) {
        if (!settings) return;
        var def = { ui_type: "panel.formlayout" };
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.formlayout",
        namespace: "jwk-ui",
        defaults: function () {
            return {
                template: {
                    child: "<tr><td class='label'><span>{{label}}</span></td><td cell='{{name}}'></td></tr>",
                    row: "{{#self.children}}{{>child}}{{/self.children}}",
                    main: "<div><table>{{>row}}</table></div>"
                }
            }
        },
        api: {
            parent_for: function (name, index) {
                return {parent: this, query:"[cell="+name+"]"}
            }
        },
        constructor: jwk.ui.panel.Formlayout,
        extends: jwk.ui.panel.Panel
    });    
    
    
    
    // Accordion --------------------------------------------------------------------------
    jwk.ui.panel.Accordion = function (settings) {
        if (!settings) return;
        var def = { ui_type: "panel.accordion" };
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.accordion",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Accordion,
        extends: jwk.ui.panel.Panel
    });    
    
    return jwk.ui.panel.Panel;
});
define('jwk-ui/set/jwk.ui.bar',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
   
    /*
bar.slide 
bar.range
bar.progress
bar.scroll
bar.tools    
    */
    // jwk.ui.bar library namespace
    jwk.ui.bar = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Bar = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.bar.Bar,
        "extends": jwk.ui.panel.Panel
    });
    
    // Slide bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Slide = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.slide",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.bar.Slide,
        "extends": jwk.ui.bar.Bar
    });
    
    // Range bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Range = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.range",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.bar.Range,
        "extends": jwk.ui.bar.Bar
    });
    
    // Progress bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Progress = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.progress",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.bar.Progress,
        "extends": jwk.ui.bar.Bar
    });
    
    // Scroll bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Scroll = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.scroll",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.bar.Scroll,
        "defaults": {},
        "extends": jwk.ui.bar.Bar
    });
    
    // Toolbar ----------------------------------------------------------------------------------
    jwk.ui.bar.Toolbar = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.toolbar",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.bar.Toolbar,
        "defaults": {},
        "extends": jwk.ui.bar.Bar
    });
    
    jwk.ui.component({
        "ui_type": "toolbar",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.bar.Toolbar,        
    });
    
    return jwk.ui.bar;
    /*
    // jwk.ui.Toolbar ----------------------------------------------------------------------------------
    jwk.ui.Toolbar = function (settings) {
        if (!settings) return;
        var def = {
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.Toolbar.prototype = new Component();
    jwk.ui.Toolbar.prototype.constructor = jwk.ui.Toolbar;        

    jwk.ui.component({
        ui_type: "toolbar",
        namespace: "jwk-ui",
        constructor: jwk.ui.Toolbar
    });
    
    // jwk.ui.IconTool ----------------------------------------------------------------------------------
    jwk.ui.IconTool = function (settings) {
        if (!settings) return;
        var def = {
            icon: "default",
            class: "icon",
            template: {
                main: "<div class='{{self.icon}}'></div>"
            }            
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.IconTool.prototype = new Component();
    jwk.ui.IconTool.prototype.constructor = jwk.ui.IconTool;        

    jwk.ui.component({
        ui_type: "icontool",
        namespace: "jwk-ui",
        constructor: jwk.ui.IconTool
    });
    
    return jwk.ui.Iconview;      
    */
});
define('jwk-ui/set/jwk.ui.button',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
  
    
    /*    
button
button.cycle
button.file
button.option
button.split
button.stay    
    */
    
    
    // jwk.ui.button library namespace
    jwk.ui.button = {}
    
    // Button ----------------------------------------------------------------------------------
    jwk.ui.button.Button = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "button",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Button,
        "extends": jwk.ui.panel.Panel,
        "defaults": {
            "disable_selection": true,
            "template": {
                "main": "<div><div class='btn_container'></div></div>",
            }
        },
        "api": {
            "click": function (n,e) {            
                this.trigger(n,e)
            },
            "parent_for": function (name, index) {
                var data = { parent:this, query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            }            
        }
    });     
    
    // Cycle Button ----------------------------------------------------------------------------------
    jwk.ui.button.Cycle = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        this.set("states", settings.states);
        jwk.ui.button.Button.call(this, def);
        
        if (settings.state && !settings.value) {
            console.warn("WARNING: state ("+settings.state+") param is DEPRECATED. use value instead.");
            this.set("value", settings.state);
        }
        
        this.on("click", function (name, event) {                
            event.component.next();
        });        
        
        this.one("render:first", function (name, event) {                
            event.component.next();
        });
    }
    
    jwk.ui.component({
        "ui_type": "button.cycle",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Cycle,
        "extends": jwk.ui.button.Button,
        "defaults": {
            "states": ["first", "second", "third"],                        
            "template": {
                "state": "{{self.value}}",
                // "text": "{{self.text}}",
                "nstate": "<div state='{{>state}}'><div class='btn_container'></div></div>",
                "main": "{{>nstate}}"
            },
        },
        "api": {
            "parent_for": function (name, index) {
                var data = { parent:this, query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            },
            "next": function () {
                var current = this.get("value");
                var states = this.get("states");

                switch (typeof states) {
                    case "number":
                        if (!current) {
                            current = 0;
                        } else {
                            current = (parseInt(current) + 1) % states;                    
                        }
                        break;
                    case "object":                        
                        if (states instanceof jwk.Collection) {
                            states = states.toArray();
                        }
                        if (Array.isArray(states)){
                            if (!current) {
                                current = states[0];
                            } else {
                                var index = states.indexOf(current);
                                current = states[(index+1) % states.length];                                
                            }                            
                        } else {
                            console.error("caso no implementado", states);
                        }
                        break;
                    default:
                        console.error("caso no implementado", states);
                }

                this.set("value", current);
                if (this.datapath) this.my_data(current);
                this.paint();
                
                // this.trigger_fast("change:state", {value: current, states: states);
            }
        }
    });     
    
    // File Button ----------------------------------------------------------------------------------
    jwk.ui.button.File = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        if (settings.multiple) {
            def.template.multiple = "multiple='true'";
        }        
        def = jwk.extend(true, {}, def, settings);
        jwk.ui.button.Button.call(this, def);
        
        var file_btn = this;
        jwk.ui.get("render").container().on("change", function (name, event) {
            console.error("analiza que pasó aca a ver si funciona");
            if (file_btn == event.component) {
                file_btn.trigger("change", event);
                file_btn.paint(); // This force the HTMLinput to be repainted, so it loses its files property.
                                  // That means the next time the user presses the button if he or she choses the same file, the "change" event will be triggered again.
                file_btn.trigger("mouseout", event);
            }
        });
        
    }
    
    
    jwk.ui.component({
        "ui_type": "button.file",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.File,
        "extends": jwk.ui.button.Button,
        "defaults": {
            "template": {
                "multiple": "",
                "file": "<div style='border:0;position:relative;'><div style='position:absolute; overflow: hidden; width: 100%; height:100%; top:0; left:0; border:0px; padding:0px; margin:px;'><input {{>multiple}} type='file' name='file' style='opacity:0;position:absolute;top:0;bottom:0;left:0;right:0;'/></div><div class='file_container'></div></div>",
                "main": "{{>file}}"
            }
        },
        "api": {
            "parent_for": function (name, index) {
                var data = { parent:this, query:".file_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }                
            }            
        }        
    }); 
    
    
    // Option Button ----------------------------------------------------------------------------------
    jwk.ui.button.Option = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        
        if (def.group == "siblings") {
            def.selectable.group = def.group;
        } else {
            console.assert(typeof def.group == "string", def.group);
            def.selectable.group = "[group="+def.group+"]";
        }
        
        if (settings.selected) {
            def.selectable.selected = true;
        }
        
        jwk.ui.button.Button.call(this, def);

        this.on("feature:selectable", function (name, event) {
            event.controller.on("select", function (n, e) {
                e.controller.component.set("selected", true);
            }).on("unselect", function (n, e) {
                e.controller.component.set("selected", false);           
            });            
            if (event.component.settings.selected) this.select();
        });
        this.on("change:selected", function (n,e) {
            e.target.my_data(e.target.get("selected"));
        });        
    }
    
    jwk.ui.component({
        "ui_type": "button.option",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Option,
        "extends": jwk.ui.button.Button,
        "defaults": {
            "group": "siblings",
            "selectable": {
                "allowMultiple": false,
                "zIndex": false
            },
            "template": {
                "option": "<div><div class='btn_container'></div></div>",
                "main": "{{>option}}"
            },
        },
        "api": {
            "parent_for": function (name, index) {
                var data = { parent:this, query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            },            
            "select": function () {
                this.controllers.selectable.select(this);
            },    
            "group": function () {
                console.error("jwk.ui.Button.Option.group() No implementado");
            }         
        }
    });  
    
    // Split Button ----------------------------------------------------------------------------------
    jwk.ui.button.Split = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        jwk.ui.button.Button.call(this, def);
    }
    
    jwk.ui.component({
        "ui_type": "button.split",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Split,
        "extends": jwk.ui.button.Button,
        "defaults": {},
        "api": {}
    });  
    
    // Stay Button ----------------------------------------------------------------------------------
    jwk.ui.button.Stay = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        jwk.ui.button.Button.call(this, def);
    }
    
    jwk.ui.component({
        "ui_type": "button.stay",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Stay,
        "extends": jwk.ui.button.Button,
        "defaults": {},
        "api": {}
    });  
    
    return jwk.ui.button;    
    /*
    // jwk.ui.Button ----------------------------------------------------------------------------------
    jwk.ui.Button = function (settings) {
        var button = this;
        if (!settings) return;
        var def = {
            ui_type: "button",
            disable_selection: true,
            template: {
                main: "<div></div>"
            }
        };
        Panel.call(this, jwk.extend(def, settings));
        console.assert(jwk.ui.render.mouse);        
    }
    
    jwk.ui.Button.prototype = new Panel();
    jwk.ui.Button.prototype.constructor = jwk.ui.Button;
    
    jwk.ui.component({
        ui_type: "button",
        namespace: "jwk-ui",
        constructor: jwk.ui.Button
    });
    
    // http://jsfiddle.net/nfgJy/7/    
    // jwk.ui.Button.File ----------------------------------------------------------------------------------
    jwk.ui.Button.File = function (settings) {
        var button = this;
        if (!settings) return;
        var def = {
            ui_type: "button.file",
            template: {
                multiple: "",
                file: "<div style='border:0;position:relative;'><div style='position:absolute; overflow: hidden; width: 100%; height:100%; top:0; left:0; border:0px; padding:0px; margin:px;'><input {{>multiple}} type='file' name='file' style='opacity:0;position:absolute;top:0;bottom:0;left:0;right:0;'/></div><div class='container'></div></div>",
                main: "{{>file}}"
            },
        };
        if (settings.multiple) {
            def.template.multiple = "multiple='true'";
        }
        jwk.ui.Button.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.Button.File.prototype = new jwk.ui.Button();
    jwk.ui.Button.File.prototype.constructor = jwk.ui.Button.File;
    
    jwk.ui.Button.File.prototype.parent_for = function (name, index) {
        return {parent:this, query:".container"};
    }
    
    jwk.ui.on("change:render", function (n, e) {        
        jwk.ui.get("render").container().on("change", function (name, event) {
            event.component.trigger("change", event);
            event.component.paint(); // This force the HTMLinput to be repainted, so it loses its files property.
                                      // That means the next time the user presses the button if he or she choses the same file, the "change" event will be triggered again.
            event.component.trigger("mouseout", event);
        });
    })
    
    jwk.ui.component({
        ui_type: "button.file",
        namespace: "jwk-ui",
        constructor: jwk.ui.Button.File
    });
    
    
    // http://jsfiddle.net/nfgJy/10/
    // jwk.ui.Button.NState ----------------------------------------------------------------------------------
    jwk.ui.Button.NState = function (settings) {
        var button = this;
        if (!settings) return;
        var def = {
            states: ["first", "second", "third"],            
            ui_type: "button.n-state",
            template: {
                state: "{{self.current}}",
                text: "{{self.text}}",
                nstate: "<div state='{{>state}}'>{{>text}}</div>",
                main: "{{>nstate}}"
            },
        };
        settings = jwk.extend(def, settings);
        this.set("states", settings.states);
        jwk.ui.Button.call(this, settings);
        this.on("click", function (name, event) {                
            event.component.next();
        });        
        
        this.one("render:first", function (name, event) {                
            event.component.next();
        });
        
    }
    
    jwk.ui.Button.NState.prototype = new jwk.ui.Button();
    jwk.ui.Button.NState.prototype.constructor = jwk.ui.Button.NState;
    jwk.ui.Button.NState.prototype.next = function () {
        var current = this.get("current");
        var states = this.get("states");
    
        switch (typeof states) {
            case "number":
                if (!current) {
                    current = 0;
                } else {
                    current = (parseInt(current) + 1) % states;                    
                }
                break;
            case "object":
                if (states instanceof jwk.Collection) {
                    states = states.toArray();
                }
                if (Array.isArray(states)){
                    if (!current) {
                        current = states[0];
                    } else {
                        var index = states.indexOf(current);
                        current = states[(index+1) % states.length];                                
                    }                            
                } else {
                    console.error("caso no implementado", states);
                }
                break;
            default:
                console.error("caso no implementado", states);
        }
        
        this.set("current", current);
        if (this.datapath) this.my_data(current);
        this.paint();
    }
    
    jwk.ui.component({
        ui_type: "button.n-state",
        namespace: "jwk-ui",
        constructor: jwk.ui.Button.NState
    });
    
    
                
    // http://jsfiddle.net/nfgJy/13/
    // jwk.ui.Button.Option (radio button) ----------------------------------------------------------------------------------
    jwk.ui.Button.Option = function (settings) {
        if (!settings) return;
        var def = {
            ui_type: "button.option",
            group: "siblings",
            selectable: {
                allowMultiple: false,
                zIndex: false
            },
            template: {
                text: "{{self.text}}",
                option: "<div>{{>text}}</div>",
                main: "{{>option}}"
            },
        };
        settings = jwk.extend(def, settings);
        if (settings.group == "siblings") {
            settings.selectable.group = settings.group;
        } else {
            console.assert(typeof settings.group == "string", settings.group);
            settings.selectable.group = "[group="+settings.group+"]";
        }
        
        jwk.ui.Button.call(this, settings);        

        this.on("selectable", function (name, event) {
            event.controller.on("select", function (n, e) {
                e.controller.component.set("selected", true);
            }).on("unselect", function (n, e) {
                e.controller.component.set("selected", false);           
            });
            if (event.component.settings.selected) this.select();
        });
        this.on("change:selected", function (n,e) {
            e.target.my_data(e.target.get("selected"));
        });
    }
    
    jwk.ui.Button.Option.prototype = new jwk.ui.Button();
    jwk.ui.Button.Option.prototype.constructor = jwk.ui.Button.Option;
    
    jwk.ui.Button.Option.prototype.select = function () {
        this.controllers.selectable.select(this);
    }
    
    jwk.ui.Button.Option.prototype.group = function () {
        console.error("jwk.ui.Button.Option.group() No implementado");
    }    
    
    jwk.ui.component({
        ui_type: "button.option",
        namespace: "jwk-ui",
        constructor: jwk.ui.Button.Option
    });
    */ 
});


define('jwk-ui/set/jwk.ui.dialog',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
  

    
    /*
dialog (modal)    
dialog.ask
dialog.alert
dialog.window    
    */
    // jwk.ui.dialog library namespace
    jwk.ui.dialog = {}
    
    // Dialog ----------------------------------------------------------------------------------
    jwk.ui.dialog.Dialog = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "dialog",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Dialog,
        "extends": jwk.ui.panel.Panel,
        "defaults": {}
    });      
    
    // Dialog Ask ----------------------------------------------------------------------------------
    jwk.ui.dialog.Ask = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.dialog.Dialog.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "dialog.ask",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Ask,
        "extends": jwk.ui.dialog.Dialog,
        "defaults": {}
    });      
    
    // Dialog Alert ----------------------------------------------------------------------------------
    jwk.ui.dialog.Alert = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.dialog.Dialog.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "dialog.alert",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Alert,
        "extends": jwk.ui.dialog.Dialog,
        "defaults": {}
    });  

    // Dialog Window ----------------------------------------------------------------------------------
    
     var div = $("<div></div>").css("position","absolute");
    
    jwk.ui.dialog.Window = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "dialog.window").defaults();
        
        if (settings.resizable === true) delete settings.resizable;
        if (settings.resizable === false) delete def.resizable;
        if (settings.draggable === true) delete settings.draggable;
        if (settings.draggable === false) delete def.draggable;
        var win_settings = jwk.extend({},def, settings);
        win_settings.resizable = jwk.extend(def.resizable, settings.resizable);
        win_settings.position = jwk.extend(def.position, settings.position);
        win_settings.size = jwk.extend(def.size, settings.size);
        
        jwk.ui.dialog.Dialog.call(this, win_settings);
        
        this.set("state", "normal");
        this.set("controls", win_settings.controls, {no_parse: true});        
        this.set("layout", win_settings.layout, {no_parse: true});
        this.set("min_mode", this.settings.min.mode);
        this.set("title", win_settings.title);
        this.set("icon", win_settings.icon ? "none" : "default");
        this.set("icon_src", win_settings.icon ? win_settings.icon : null);
        this.set("icon_is_src", win_settings.icon? true : false);
                        
        var win = this;
        this.on("feature:selectable", function (n, e) {
            e.controller.on("select", function (_n, _e) {
                _e.component = _e.controller.component;
                _e.component.trigger_fast(_n, _e);
            })
        }, this);
        
        function prepare_event_data (win, target) {
            var snapshot = jwk.ui.snapshot(target);
            var css = snapshot.css;
            // TODO: acá capaz que vale la pena estudiar la situación actual de la ventana.
            // y no siempre poner un my: top left (que en principio puede ser una solución
            var pos   = { my: "center center", at: "center center", of: "container" };
            var size  = { width: snapshot.css.width, height: snapshot.css.height };                
            var state = win.get("state");

            if (css.left == "0%") {
                pos.at = (50 - parseFloat(css.right) * 0.5) + "% ";
            } else if (css.right == "0%") {
                pos.at = (50 + parseFloat(css.left) * 0.5) + "% ";
            } else {
                if (win.get("state") == "normal") {
                    console.error("ERROR: left-right position must be expressed in percentage and one of them must be 0%");
                }
            }

            if (css.top == "0%") {
                pos.at += (50 - parseFloat(css.bottom) * 0.5) + "%";
            } else if (css.bottom == "0%") {
                pos.at += (50 + parseFloat(css.top) * 0.5) + "%";
            } else {
                if (win.get("state") == "normal") {
                    console.error("ERROR: top-bottom position must be expressed in percentage and one of them must be 0%");
                }
            }
            
            return {
                window: win,
                size: size,
                position: pos,
                state: state
            }
            
        }

        this.on("feature:draggable", function (n, e) {
            e.controller.on("stop", function (_n, _e) {                
                win.trigger("move", prepare_event_data(win, _e.target));
            })
        }, this);

        this.on("feature:resizable", function (n, e) {
            e.controller.on("stop", function (_n, _e) {
                win.trigger("resize", prepare_event_data(win, _e.target));
            })
        }, this);
        
        this.on("change:state", function (n, e) {            
            console.debug("state -> ", e.value);
            this.trigger("state", prepare_event_data(win, win.target));        
        }, this); 
        

        this.on("destroy", function (n, e) {
            this.trigger_fast("close", e);
        }, this);
        
        this.on("change:min_mode", function (n, e) {
            this.min = e.value.valueOf();
        }, this); 
        
        this.on("change:structure", function (n, e) {
            
        });
        
        this.on("change:state", function (n, e) {
            this.set("prev_state", e.old_value);
        }, this);
        
        this.on("change:title", function (n, e) {
            console.log("El title de la ventana debería ser: ", e.value);
            e.target.set_title(e.value);
        }, this);
        
        this.on("change:has_menubar", function (n, e) {
            e.target.show_menubar(e.value);
        });
        
        this.on("render", function (n,e){
            var win = e.component;
            win.show_menubar();
            win.controllers.resizable.on("resize", function () {
                this.search("menubar").close();
                this.search("menubar").paint();
            }, win);
            win.controllers.draggable.on("stop", function () {
                this.search("menubar").paint();
            }, win);            
            win.controllers.draggable.on("start", function () {
                this.search("menubar").close();
            }, win);            
            win.search("menubar").paint();
        })
        
        this.on("change:menubar_data", function (n, e) {
            e.target.set("has_menubar",!!e.value);        
        });
        
        this.on("change:structure", function (n,e) {
            var structure = e.value;
            var win = this;
            
            structure.search("menubar").on("open",function () {
                win.add_class("covored");
            }).on("close", function () {
                win.remove_class("covored");
            });
            
            structure.search("controls").on("click", function (n, e) {                
                switch (e.entry) {
                    case "max":
                        if (this.get("state") != "maximized") {
                            this.maximize();
                        } else {
                            this.normal();
                        }
                        break;
                    case "min":
                        if (this.get("state") != "minimized") {
                            this.minimize();
                        } else {
                            this.restore();
                        }
                        break;
                    case "full":
                        if (this.get("state") != "fullcanvas") {
                            this.fullcanvas();
                        } else {
                            this.normal();
                        }
                        break;
                    case "close":
                        this.close();
                        break;
                    default:
                        console.log(n,e.entry, e);
                }
            }, win);
            
            structure.search("border-n").on("dblclick", function (n,e) {
                if (this.get("state") != "maximized") {
                    this.maximize();
                } else {
                    this.normal();
                }                
            }, win);
            
        }, this)
        
        
        if (win_settings.menubar) this.set("menubar_data", win_settings.menubar, {no_parse:true});         
        
        
        
    }
    
    jwk.ui.component({
        "ui_type": "dialog.window",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Window,
        "extends": jwk.ui.dialog.Dialog,
        "defaults":{
            "draggable": {
                "zIndex": ".jwk-ui.window"
            },
            "resizable": {
                "handles": "all"
            },
            "delay": 500,
            "min": {
                "position": {
                    "my": "left bottom",
                    "at": "left bottom",
                    "of": "container",
                    // tween ????
                },
                "mode": "foot",
            },            
            "size": {
                "width": "60%",
                "height": "70%",
                "min-width": "200px",
                "min-height": "100px"
            },
            "position": {
                "update_on": "skin",
                "my": "center center",
                "at": "center center",
                "of": "container"
            },
            "controls": ["min", "max", "close"],
            "layout": [
                ["border-nw", "border-n", "border-ne"],
                ["border-w", ["menubar","content"], "border-e"],
                ["border-sw", "border-s", "border-se"]
            ],
            "template": {
                "main": "<div style='position: absolute; min-height: 300px; min-width: 450px;'></div>"
            }
        },        
        "api": {
            "set_title": function (title) {
                this.target.find("[name=title].panel").text(title);
            },
            "save_state": function () {
                this.set("prev_state", this.get("state"));
                if (this.get("state") == "normal") {
                    this.normal_style = this.target.attr("style");            
                    var dummie = div.clone();
                    this.target.after(dummie);
                    dummie.offset(this.target.offset());                        
                    this.normal_css = {
                        "width": this.target.width(),
                        "height": this.target.height(),                    
                        "top": dummie.css("top"),
                        "left": dummie.css("left"),
                        "opacity": this.target.css("opacity")
                    }
                    dummie.remove();
                }
            },
            "maximize": function () {
                /*/
                return this.maximize_jquery.apply(this, arguments);
                /*/
                return this.maximize_css3.apply(this, arguments);
                //*/
            },
            "maximize_css3": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("maximize", { component: this });        
                var win = this;
                this.save_state();
                this.set("state", "maximized");
                switch (this.get("prev_state")) {
                    case "minimized":
                        break;
                    case "normal":
                        this.target.css(this.normal_css);
                        win.target.css({ "bottom": "",  "margin-left": 0});
                        break;
                }
                                
                var offset = this.target.offset();                
                this.target.css({
                    "top": "",
                    "bottom": "",
                    "left": "",
                    "right": "",
                });
                this.target.offset(offset);
                
                var left = this.target.css("left");
                var top = this.target.css("top");
                
                this.target.css({
                    "top": "0",
                    "left": "0",
                    "margin-top": top,
                    "margin-left": left,
                });
                
                var sec = this.delay / 1000;
                
                this.target.css({
                    "width": "100%",
                    "height": "100%",
                    "margin-top": "0px",
                    "margin-left": "0px",
                    "opacity": 1,
                    "transition-property": "all",
                    "transition-duration": sec + "s",
                    "transition-timing-function": "cubic-bezier(.07, 1.04, .7, .98)"                    
                });                
                
                win.controllers.resizable.enable(false);
                win.controllers.draggable.enable(false);
                setTimeout(function () {
                    win.set("mode", "maximized");
                    win.search("menubar").paint();
                    win.target.css({
                        "transition-property": "",
                        "transition-duration": "",
                        "transition-timing-function": ""
                    });
                    deferred.resolve(win);
                }, this.delay + 200);

                return deferred.promise();                
            },
            "maximize_jquery": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("maximize", { component: this });        
                var win = this;
                this.save_state();                
                this.set("state", "maximized");
                switch (this.get("prev_state")) {
                    case "minimized":
                        break;
                    case "normal":
                        this.target.css(this.normal_css);
                        win.target.css({ "bottom": "",  "margin-left": 0});
                        break;
                }        
                this.target.animate({
                    "width": "100%",
                    "height": "100%",
                    "margin-left": 0,
                    "top": 0,
                    "left": 0,
                    "opacity": 1
                }, this.delay, function (){
                    win.set("mode", "maximized");
                    win.search("menubar").paint();        
                    win.controllers.resizable.enable(false);
                    win.controllers.draggable.enable(false);
                    deferred.resolve(win);
                });
                return deferred.promise();
            },
            "normal": function () {
                /*/
                return this.maximize_jquery.apply(this, arguments);
                /*/
                return this.normal_css3.apply(this, arguments);
                //*/
            },
            
            "normal_css3": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("restore", { component: this });
                var win = this;                
                win.set("mode", "normal");
                win.target.css({ "bottom": "" });                

                var dummie = win.target.clone();
                dummie.children().remove();
                // console.log("dummie.html()", dummie.html());
                this.target.after(dummie);
                dummie.attr("style", this.normal_style);
                var w = dummie.width(),
                    h = dummie.height(),
                    o = dummie.offset()
                dummie.attr("style", "");
                dummie.offset(o);
                var t = dummie.css("top"),
                    l = dummie.css("left");
                
                var sec = this.delay / 1000;
                
                this.target.css({
                    "margin-top": "",
                    "margin-left": "",   
                    "width": w,
                    "height": h,
                    "top": t,
                    "left": l,
                    "margin-left": dummie.css("margin-left"),
                    "opacity": this.normal_css.opacity,
                    "transition-property": "all",
                    "transition-duration": sec + "s",
                    "transition-timing-function": "cubic-bezier(.07, 1.04, .7, .98)"
                });
                
                win.set("state", "transition");
                setTimeout(function () {
                    var zIndex = win.target.css("z-index");
                    win.target.attr("style", win.normal_style);
                    win.target.css("z-index", zIndex);                    
                    win.search("menubar").paint();
                    win.controllers.resizable.enable(true);
                    win.controllers.draggable.enable(true);
                    win.set("state", "normal");
                    win.target.css({
                        "transition-property": "",
                        "transition-duration": "",
                        "transition-timing-function": ""
                    });
                    deferred.resolve(win);
                }, this.delay);

                dummie.remove();

                return deferred.promise();
            },
            "normal_jquery": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("restore", { component: this });
                var win = this;
                win.set("mode", "normal");
                win.target.css({ "bottom": "" });                

                var dummie = win.target.clone();
                dummie.children().remove();
                // console.log("dummie.html()", dummie.html());
                this.target.after(dummie);
                dummie.attr("style", this.normal_style);
                var w = dummie.width(),
                    h = dummie.height(),
                    o = dummie.offset()
                dummie.attr("style", "");
                dummie.offset(o);
                var t = dummie.css("top"),
                    l = dummie.css("left");
                win.controllers.resizable.enable(true);
                win.controllers.draggable.enable(true);

                this.target.animate({
                    "width": w,
                    "height": h,                    
                    "top": t,
                    "left": l,
                    "margin-left": dummie.css("margin-left"),
                    "opacity": this.normal_css.opacity
                }, this.delay, function (){            
                    var zIndex = win.target.css("z-index");
                    win.target.attr("style", win.normal_style);
                    win.target.css("z-index", zIndex);
                    win.set("state", "normal");
                    win.search("menubar").paint();
                    deferred.resolve(win);
                });


                dummie.remove();

                return deferred.promise();
            },
            "restore": function () {
                // console.log(this.get("mode"));        
                this.trigger_fast("restore", { component: this });
                this.target.css({ "display": "block" });
                if (this.get("prev_state") == "normal") {
                    // this.set("prev_state", this.get("state"));
                    this.normal();
                } else if (this.get("prev_state") == "maximized") {
                    this.maximize();
                } else if (this.get("prev_state") == "transition") {
                    console.log("Estamos en plena transición. no se hace nada");
                } else {
                    console.error("ERROR: jwk.ui.dialog.window's prev_state not defined");
                    this.normal();
                }
            },
            "select": function () {
                // console.log("select", this.target.css("z-index"), this, ["jwk.global._listeners.iframe:" , jwk.global._listeners.iframe]);
                this.controllers.selectable.select();
            },
            "minimize": function () {
                return this.minimize_css3();
            },
            "minimize_css3": function () {
                var deferred = jwk.Deferred();
                if (this.get("state") == "transition") {
                    console.log("Estamos en plena transición. no se hace nada");                
                    return deferred.resolve({});
                }
                
                this.trigger_fast("minimize", { component: win });        
                this.save_state();
                this.set("state", "minimized");
                var win = this;
                var target = this.target;

                // console.log(target.css("z-index"));

                switch (this.min.mode) {
                    case "taskbar":
                        var dummie = div.clone();
                        this.target.after(dummie);

                        var header_height = target.find("[child='border-n']").height();
                        var footer_height = target.find("[child='border-s']").height();                
                        var offset = target.offset();
                        // console.log(offset);
                        target.css({
                            "bottom": "",
                            "right": "",
                            "min-height": ""
                        });
                        target.offset(offset);
                        target.width(target.width());
                        target.height(target.height());
                        
                        console.assert($(this.min.position.of).size()>0, "ERROR: relative object not found", [this.min.position]);
                        dummie.setPosition(this.min.position);
                        var t = dummie.css("top"), l = dummie.css("left");
                        // console.log("minimizo ventana", ["jwk.global._listeners.iframe:" , jwk.global._listeners.iframe]);
                        
                        
                        var sec = this.delay / 1000;
                        target.css({
                            "width": "1%",
                            "height": (header_height + footer_height) + "px",
                            "top": t,
                            "left": l,
                            "margin-left": 0,
                            "opacity": 0,
                            "transition-property": "all",
                            "transition-duration": sec + "s",
                            "transition-timing-function": "cubic-bezier(.07, 1.04, .7, .98)"
                        });
                        
                        setTimeout(function () {                        
                            target.css("display","none");
                            win.set("mode", "minimize");
                            deferred.resolve(win);
                            win.target.css({
                                "transition-property": "",
                                "transition-duration": "",
                                "transition-timing-function": ""
                            });                            
                        }, this.delay);
                        
                        dummie.remove();

                        break;
                    default:
                        console.error("ERROR: minimize_mode not implemented:", this.min.mode);
                }

                // console.log(target.css("z-index"));
                return deferred.promise();
            },            
            "minimize_jquery": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("minimize", { component: win });        
                this.save_state();
                this.set("state", "minimized");
                var win = this;
                var target = this.target;

                // console.log(target.css("z-index"));

                switch (this.min.mode) {
                    case "taskbar":
                        var dummie = div.clone();
                        this.target.after(dummie);

                        var header_height = target.find("[child='border-n']").height();
                        var footer_height = target.find("[child='border-s']").height();                
                        var offset = target.offset();                                                
                        target.css({
                            "bottom": "",
                            "min-height": ""                    
                        });
                        target.offset(offset);

                        // Coloco un objeto dummie en el lugar que debería ir la ventana para sacar el destino de la animación
                        
                        console.assert($(this.min.position.of).size()>0, "ERROR: relative object not found", [this.min.position]);
                        dummie.setPosition(this.min.position);
                        // console.log("minimizo ventana", ["jwk.global._listeners.iframe:" , jwk.global._listeners.iframe]);
                        this.target.animate({
                            "width": "1%",
                            "margin-left": 0,
                            "left": dummie.css("left"),
                            "top": dummie.css("top"),
                            "opacity": 0,
                            "height": (header_height + footer_height) + "px"                    
                        }, this.delay, function () {
                            target.css("display","none");
                            win.set("mode", "minimize");
                            deferred.resolve(win);
                        });

                        dummie.remove();

                        break;
                    default:
                        console.error("ERROR: minimize_mode not implemented:", this.min.mode);
                }

                // console.log(target.css("z-index"));
                return deferred.promise();
            },
            "fullcanvas": function () {
                this.set("state", "fullcanvas");
            },
            "close": function () {
                this.set("state", "close");
                var win = this;
                var what_to_do = function (what){
                    switch (typeof what) {
                        case "undefined":
                            this.destroy();
                            break;
                        case "string":
                            if (window.confirm(what)) win.destroy();
                            break;
                        case "boolean":
                            if (what) win.destroy();
                            break;
                    }            
                }

                if (typeof this.onbeforeclose == "function") {
                    var res = this.onbeforeclose();
                    switch (typeof res) {
                        case "object":
                            if (typeof res.done == "function") {
                                res.done(function (res){
                                    what_to_do.call(win, res);                            
                                })
                            }
                        default:
                            what_to_do.call(this, res);
                            break;
                    }
                } else {
                    this.destroy();            
                }
            },
            "structure_tree": function () {
                return {
                    "name": "win",
                    "data": this,
                    "ui_type": "panel.placeholder",
                    "children": {
                        "layout": {
                            "datapath": "layout",
                            "start": "col",
                            "ui_type": "panel.layout",
                            "children": {
                                "border-n": {
                                    "ui_type": "panel",
                                    "class": "window-border-n",
                                    "children": {
                                        "icon": { "ui_type": "icon", "icon": "<<data.icon>>", "icon_src": "<<data.icon_src>>", "icon_is_src": "<<data.icon_is_src>>", "class": "size_16" },
                                        "title": { "ui_type": "panel", text: "<<data.title>>" },
                                    }
                                },
                                "border-s": { "ui_type": "panel", "class": "window-border-s" },
                                "border-w": { "ui_type": "panel", "class": "window-border-w" },
                                "border-e": { "ui_type": "panel", "class": "window-border-e" },
                                "border-nw": { "ui_type": "panel", "class": "window-border-nw" },
                                "border-ne": { "ui_type": "panel", "class": "window-border-ne" },
                                "border-sw": { "ui_type": "panel", "class": "window-border-sw" },
                                "border-se": { "ui_type": "panel", "class": "window-border-se" },
                                "content": {
                                    "ui_type": "panel",
                                    "class": "window-content",
                                    "children": {
                                        "cover": {
                                            "ui_type": "panel",
                                            "class": "window-cover draggable-cancel"
                                        }                            
                                    },
                                },
                                "menubar": { "ui_type": "menu.menubar", "class": "window-menubar draggable-cancel", "datapath": "menubar_data" }
                            }
                        },
                        "controls": {
                            "ui_type": "list",
                            "class": "window-controls draggable-cancel", 
                            "datapath": "controls",
                            "template.text": ""
                        }
                    }
                }
            },
            "parent_for": function (name, index) {    
                switch (name) {
                    case "controls":                
                    case "win":
                    case "cover":
                    case "layout":                        
                        return {parent:this};
                }        
                return {parent:this.get("structure").search("layout"), query:".window-content"};
            },
            "show_menubar": function (show) {
                if (arguments.length == 0) {
                    show = this.get("has_menubar");
                }
                if (this.target) this.target.find("[child=menubar]").closest("tr").css("display", show ? "" : "none");
            }            
        }
    });
    
    jwk.ui.component({
        "ui_type": "window",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Window,
        "defaults": jwk.ui.component("jwk-ui","dialog.window").defaults()
    });
    
    return jwk.ui.dialog;
 
});
define('jwk-ui/set/jwk.ui.hud',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {

    
/*
hud.growl
hud.dock
*/    
     
    // jwk.ui.hud library namespace
    jwk.ui.hud = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.hud.HUD = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "hud",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.hud.HUD,
        "extends": jwk.ui.panel.Panel
    });
    
    // Growl bar ----------------------------------------------------------------------------------
    jwk.ui.hud.Growl = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.hud.HUD.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "hud.growl",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.hud.Growl,
        "extends": jwk.ui.hud.HUD
    });
    
    // Dock bar ----------------------------------------------------------------------------------
    jwk.ui.hud.Dock = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.hud.HUD.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "hud.dock",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.hud.Dock,
        "extends": jwk.ui.hud.HUD
    });
    
    return jwk.ui.hud;    
    
    /*
    // jwk.ui.Toolbar ----------------------------------------------------------------------------------
    jwk.ui.Toolbar = function (settings) {
        if (!settings) return;
        var def = {
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.Toolbar.prototype = new Component();
    jwk.ui.Toolbar.prototype.constructor = jwk.ui.Toolbar;        

    jwk.ui.component({
        ui_type: "toolbar",
        namespace: "jwk-ui",
        constructor: jwk.ui.Toolbar
    });
    
    // jwk.ui.IconTool ----------------------------------------------------------------------------------
    jwk.ui.IconTool = function (settings) {
        if (!settings) return;
        var def = {
            icon: "default",
            class: "icon",
            template: {
                main: "<div class='{{self.icon}}'></div>"
            }            
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.IconTool.prototype = new Component();
    jwk.ui.IconTool.prototype.constructor = jwk.ui.IconTool;        

    jwk.ui.component({
        ui_type: "icontool",
        namespace: "jwk-ui",
        constructor: jwk.ui.IconTool
    });
    
    return jwk.ui.Iconview;      
   */ 
});
define('jwk-ui/set/jwk.ui.icon',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
   

    var default_icon_map = new jwk.Node({
        "folderopen": "icon_0",
        "folder":     "icon_1",
        "compressed": "icon_2",
        "default":    "icon_3",
        "media":      "icon_4",
        "mp3":        "icon_5",
        "mp4":        "icon_6",
        "png":        "icon_7",
        "pdf":        "icon_8",
        "bin":        "icon_9",
        "txt":        "icon_10",
        "js":         "icon_11",
        "less":       "icon_11",
        "doc":        "icon_12",
        "sys":        "icon_13"
    })
    
    // jwk.ui.icon library namespace
    function IconManage(s){ jwk.Node.call(this, s); };
    IconManage.prototype = new jwk.Node();
    IconManage.prototype.constructor = IconManage;
    
    jwk.ui.icon = new IconManage({
        "iconmap": default_icon_map
    });
    /*
    jwk.ui.icon.on("change:iconmap", function () {
        console.log("AAAAAAAAAAAAa", arguments);
    })
    */
    
    IconManage.prototype.configure = function() {    
         
    }
    
    IconManage.prototype.create = function(entry, _options) {
        var options = jwk.extend({icon_size: "48"}, _options);
        var parts = entry.icon.split(" ");
        console.assert(parts.length < 3, [parts, entry.icon, entry]);
        
        var icon = entry.icon;
        var icon_size = "size_" + options.icon_size;
        var icon_class = jwk.ui.icon.get("iconmap").valueOf()[icon] || "";
        
        if (icon_class == "") {
            // console.log(icon);
            // console.log(jwk.ui.icon.get("iconmap"));
            // console.log(jwk.ui.icon.get("iconmap").valueOf());
        }
        
        var div = "<div class='" + icon + " icon " + icon_class + " " + icon_size + "'></div>";
        // console.log("IconManage.prototype.create: ", entry, div);
        return div;
    }

    // Bar ----------------------------------------------------------------------------------
    jwk.ui.icon.Icon = function (settings) {
        if (!settings) return;
        
//alert("ESTO SE USA jwk.ui.icon.Icon!!!!!!!!!!");
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "icon",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "style": "{{#self.icon_is_src}} style='background-size: contain; background-image:url({{self.icon_src}});' {{/self.icon_is_src}}",
                "main": "<div class='{{self.icon}} icon {{self.class}}' {{>style}}></div>"
            }
        },
        "api": {
            "coso": function () {
                console.log("coso->", arguments)
            }
        },  
        "constructor": jwk.ui.icon.Icon,
        "extends": jwk.ui.panel.Panel
    });
    
    // Icontool ----------------------------------------------------------------------------------
    jwk.ui.icon.Tool = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.icon.Icon.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "icon.tool",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.icon.Tool,
        "extends": jwk.ui.icon.Icon
    });
        
    return jwk.ui.icon;    
    
   /*
    
    // jwk.ui.Toolbar ----------------------------------------------------------------------------------
    jwk.ui.Toolbar = function (settings) {
        if (!settings) return;
        var def = {
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.Toolbar.prototype = new Component();
    jwk.ui.Toolbar.prototype.constructor = jwk.ui.Toolbar;        

    jwk.ui.component({
        ui_type: "toolbar",
        namespace: "jwk-ui",
        constructor: jwk.ui.Toolbar
    });
    
    // jwk.ui.IconTool ----------------------------------------------------------------------------------
    jwk.ui.IconTool = function (settings) {
        if (!settings) return;
        var def = {
            icon: "default",
            class: "icon",
            template: {
                main: "<div class='{{self.icon}}'></div>"
            }            
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.IconTool.prototype = new Component();
    jwk.ui.IconTool.prototype.constructor = jwk.ui.IconTool;        

    jwk.ui.component({
        ui_type: "icontool",
        namespace: "jwk-ui",
        constructor: jwk.ui.IconTool
    });
    
    return jwk.ui.Iconview;      
    */
});
define('jwk-ui/set/jwk.ui.tool',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {

    /*
tool
tool.icon
tool.option
    
    */
    // jwk.ui.tool library namespace
    jwk.ui.tool = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.tool.Tool = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "tool").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "tool",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "main": ""
            }
        },
        "constructor": jwk.ui.tool.Tool,
        "extends": jwk.ui.panel.Panel
    });
    
    //  ----------------------------------------------------------------------------------
    jwk.ui.tool.Icontool = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.tool.Tool.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "tool.icon",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "main": ""
            }
        },
        "constructor": jwk.ui.tool.Icontool,
        "api": {
            "parent_for": function (name, index) {
                if (name == "tool" || name == "btn") {
                    return { parent:this.parent };
                }                
                var data = { parent:this.search("btn"), query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            },            
            "structure_tree": function () {
                this.on("change:structure", function (n,e) {
                    var structure = e.value;                    
                    // forward all button mouse events
                    structure.search("btn").on("click dblclick mousedown mouseup contextmenu", function () {
                        this.trigger.apply(this, arguments);
                    }, this);
                    structure.search("icon").on("click dblclick mousedown mouseup contextmenu", function () {
                        this.trigger.apply(this, arguments);
                    }, this);
                })
                return {
                    "name": "tool",
                    "ui_type": "panel.placeholder",
                    "children": {
                       "btn": {
                            "ui_type": "button",
                            "children": { "icon": { "ui_type": "icon", "icon": this.icon, "class": this.class } }
                        }
                    }
                }
            }
        },
        "extends": jwk.ui.tool.Tool
    });
    //  ----------------------------------------------------------------------------------
    jwk.ui.tool.Option = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.tool.Tool.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "tool.option",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "main": ""
            }
        },
        "constructor": jwk.ui.tool.Option,
        "api": {
            "parent_for": function (name, index) {                
                if (name == "tool" || name == "btn") {
                    return { parent:this.parent };
                }                
                var data = { parent:this.search("btn"), query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            },
            "structure_tree": function () {
                return {
                    "name": "tool",
                    "ui_type": "panel.placeholder",
                    "children": {
                       "btn": {
                            "selected": !!this.selected,
                            "ui_type": "button.option",
                            "children": { "icon": { "ui_type": "icon", "icon": this.icon, "class": this.class } }
                        }
                    }
                }
            }
        },
        "extends": jwk.ui.tool.Tool
    });    
        
    return jwk.ui.tool;    
    
   /*
    
    // jwk.ui.Toolbar ----------------------------------------------------------------------------------
    jwk.ui.Toolbar = function (settings) {
        if (!settings) return;
        var def = {
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.Toolbar.prototype = new Component();
    jwk.ui.Toolbar.prototype.constructor = jwk.ui.Toolbar;        

    jwk.ui.component({
        ui_type: "toolbar",
        namespace: "jwk-ui",
        constructor: jwk.ui.Toolbar
    });
    
    // jwk.ui.toolTool ----------------------------------------------------------------------------------
    jwk.ui.toolTool = function (settings) {
        if (!settings) return;
        var def = {
            tool: "default",
            class: "tool",
            template: {
                main: "<div class='{{self.tool}}'></div>"
            }            
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.toolTool.prototype = new Component();
    jwk.ui.toolTool.prototype.constructor = jwk.ui.toolTool;        

    jwk.ui.component({
        ui_type: "tooltool",
        namespace: "jwk-ui",
        constructor: jwk.ui.toolTool
    });
    
    return jwk.ui.toolview;      
    */
});
define('jwk-ui/set/jwk.ui.input',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {

    
/*
input
input.password
input.autocomplete
input.search
input.spinner
input.rating

*/    
    // jwk.ui.input library namespace
    jwk.ui.input = {}
    
    // Input ----------------------------------------------------------------------------------
    jwk.ui.input.Input = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "input",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Input,
        "extends": jwk.ui.panel.Panel,
        "api": {
            "keyup": function (n,e) {
                this.flag_on("making_changes");
                this.value = e.target.value;
                this.flag_off("making_changes");
            }
        },
        "defaults": {
            "template": {
                "type": "text",
                // "value": "{{#self.value}}value='{{self.value}}'{{/self.value}}",
                "value": "value='{{self.value}}'",
                "label": "{{#self.label}}<span class='label'>{{self.label}}</span>{{/self.label}}",
                "main": "<div>{{>label}}<input type='{{>type}}' {{>value}} /></div>{{#self.settings.breakline}}</br>{{/self.settings.breakline}}"
            }
        }
    });    
    
    // Password ----------------------------------------------------------------------------------
    jwk.ui.component({
        "ui_type": "input.password",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Input,
        "defaults": {
            "template": {
                "type": "password",
                "main": "<div><input type='{{>type}}' /></div>"
            }
        }        
    }); 
    
    // Search ----------------------------------------------------------------------------------
    jwk.ui.component({
        "ui_type": "input.search",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Input,
        "api": {
            "change": function (n,e) {
                this.value = e.target.value;
            }
        },        
        "defaults": {
            "template": {
                "type": "text",
                "search": "<icon name='search'></icon>",
                "main": "<div><input type='{{>type}}' />{{>search}}</div>"
            }
        }        
    });
    
    // Range ----------------------------------------------------------------------------------
    jwk.ui.component({
        "ui_type": "input.range",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Input,
        "defaults": {
            "template": {
                "type": "range",
                "value": "{{self.value}}",
                "main": "<div><input type='{{>type}}' value='{{>value}}' /></div>"
            }
        }        
    }); 
    
    // Spinner ----------------------------------------------------------------------------------
    jwk.ui.input.Spinner = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.input.Input.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "input.spinner",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Spinner,
        "extends": jwk.ui.input.Input,
        "defaults": {
            "template": {
                "type": "text",
                "main": "<div>Spinner Component</div>"
            }
        }
    }); 
    
    // Ratting ----------------------------------------------------------------------------------
    jwk.ui.input.Ratting = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.input.Input.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "input.ratting",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Ratting,
        "extends": jwk.ui.input.Input,
        "defaults": {
            "template": {
                "type": "text",
                "main": "<div>Ratting Component</div>"
            }
        }
    });     
    
    return;    
    
  
    // jwk.ui.Input ----------------------------------------------------------------------------------
    jwk.ui.Input = function (settings) {
        var input = this;
        if (!settings) return;
        var def = {
            template: {
                type: "text",
                main: "<input type='{{>type}}' />"
            }
        };
        Panel.call(this, jwk.extend(def, settings));
        console.assert(jwk.ui.render.mouse);        
    }
    
    jwk.ui.Input.prototype = new Panel();
    jwk.ui.Input.prototype.constructor = jwk.ui.Input;
    
    jwk.ui.component({
        ui_type: "input",
        namespace: "jwk-ui",
        constructor: jwk.ui.Input
    });

    
    // jwk.ui.Input ----------------------------------------------------------------------------------
    jwk.ui.Input.Password = function (settings) {
        var input = this;
        if (!settings) return;
        var def = {
            ui_type: "input.password",        
            template: {
                type: "password",
                main: "<input type='{{>type}}' />"
            }
        };
        Panel.call(this, jwk.extend(def, settings));
        console.assert(jwk.ui.render.mouse);
    }
    
    jwk.ui.Input.Password.prototype = new jwk.ui.Input();
    jwk.ui.Input.Password.prototype.constructor = jwk.ui.Input.Password;
    
    jwk.ui.component({
        ui_type: "input.password",
        namespace: "jwk-ui",
        constructor: jwk.ui.Input.Password
    });    
    
});


define('jwk-ui/set/jwk.ui.label',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
  
    // console.log("jwk-ui/jwk.ui.wg-label ------------------------------------------------------------------------------------------------------");
    /*
    label
    label.link
    label.editinline
    label.feedback
    label.tooltip
    label.textarea
    label.log
  */  
    
    // jwk.ui.icon library namespace
    jwk.ui.label = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.label.Label = function (_settings) {
        if (!_settings) return;
        var def = jwk.ui.component("jwk-ui", "label").defaults();
        var settings = jwk.extend(true, {}, def, _settings);
        jwk.ui.panel.Panel.call(this, settings);
    }
    
    jwk.ui.component({
        "ui_type": "label",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "br": "{{#self.breakline}}</br>{{/self.breakline}}",
                "main": "<div>{{#self.value}}{{self.value}}{{/self.value}}</div>{{>br}}"
            }
        },
        "constructor": jwk.ui.label.Label,
        "extends": jwk.ui.panel.Panel,
    });
    
    // Hipperlink ----------------------------------------------------------------------------------
    jwk.ui.label.Link = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        var _settings =jwk.extend(true, {}, def, settings);
        
        if (_settings.openin) _settings.template.openin = "target='{{self.openin}}'";
        if (_settings.url)    _settings.template.url = "{{self.url}}";
        
        jwk.ui.label.Label.call(this, _settings);
    }
    
    jwk.ui.component({
        "ui_type": "label.link",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "openin": "",
                "url": "#",
                "main": "<div><a href='{{>url}}' {{>openin}}  class='container'></a></div>"
            }
        },
        "api": { parent_for: function (name, index) { return {parent:this, query: ".container"}; }},
        "constructor": jwk.ui.label.Link,
        "extends": jwk.ui.label.Label
    });
    
    // editinline ----------------------------------------------------------------------------------
    jwk.ui.label.Edtable = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.editable",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Edtable,
        "extends": jwk.ui.label.Label
    });
    
    // Feedback ----------------------------------------------------------------------------------
    jwk.ui.label.Feedback = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.feedback",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Feedback,
        "extends": jwk.ui.label.Label
    });
    
    // Textarea ----------------------------------------------------------------------------------
    jwk.ui.label.Textarea = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.textarea",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Textarea,
        "extends": jwk.ui.label.Label
    });
    
    // Tooltip ----------------------------------------------------------------------------------
    jwk.ui.label.Tooltip = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.tooltip",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Tooltip,
        "extends": jwk.ui.label.Label
    });
    
    // Log ----------------------------------------------------------------------------------
    jwk.ui.label.Log = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.log",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Log,
        "extends": jwk.ui.label.Label
    });    
        
    return jwk.ui.label;    
});


define('jwk-ui/set/jwk.ui.list',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
   
    
/*
list
list.iconview
list.table
list.compobox
*/
    // jwk.ui.icon library namespace
    jwk.ui.list = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.list.List = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "list").defaults();
        if (settings.removable && (!settings.template || !settings.template.remove)) {
            def["template.remove"] = "<div class='remove entry' signal='remove_entry'></div>";            
        }
        var sett = this.extend_settings(def, settings);        
        
        if (sett.removable) {
            sett.class = (typeof sett.class == "string" ? sett.class + " " : "" ) + "removable";            
        }
        jwk.ui.panel.Panel.call(this, sett);
        
        function swap_data(e){
            console.error("Me hicieron swap. Quedó bien?");
        }
        
        this.on("sortable", function (n,e) {
            controller.on("swap", swap_data);
            console.error("my_data()->", this.my_data());        
        });
    }
    
    jwk.ui.component({
        "ui_type": "list",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.list.List,
        "extends": jwk.ui.panel.Panel,
        "defaults": {
            "disable_selection": true,
            "ui_type": "list", 
            "namespace": "jwk-ui", 
            "removable": false,
            "template": {
                "empty": "...",
                "remove": "",
                "text": "{{.}}",
                "entry": "<div signal='entry' entry='{{.}}'>{{>text}}{{>remove}}</div>",
                "main": "<div>{{#data.valueOf}}{{>entry}}{{/data.valueOf}}{{^data.valueOf}}{{>empty}}{{/data.valueOf}}</div>"
            }
        },
        "api": {
            "click": function (n, e) {                
                if (e.which("signal") == "remove_entry") {
                    e.component.remove(e.index("entry"));
                } else {
                    e.index = e.index("entry");
                    e.entry = e.which("entry");
                    e.component.trigger("click:entry", e);
                }
            },
            "remove": function (who) {
                switch (typeof who) {
                    case "number":
                        var index = who;

                        var data = this.my_data();

                        if (typeof data.splice == "function") {
                            this.trigger("remove", {component:this, index: index, value: data.valueOf()[index]});
                            console.log(data);
                            data.splice(index, 1);
                            this.my_data(data);
                        } else {
                            console.error("ERROR: casono implementado");
                        }

                        break;
                    default:
                        console.error("caso no implementado");
                }
            }            
        }
    });
    
    // Iconview ----------------------------------------------------------------------------------
    
    jwk.ui.list.Iconview = function (settings) {
        if (!settings) return;
        
        var def = jwk.ui.component(settings.namespace, "list.iconview").defaults();
        var sett = jwk.extend(true, {}, def, settings);
        jwk.ui.list.List.call(this, sett);
        // this.set("icon_map", sett.icon_map || default_icon_map );
        var iconview = this;
        this.on("feature:selectable", function (){            
            this.controllers.selectable.on("select", function (n, e) {
                var selection = [];
                $(e.target).each(function (i, target){
                    var root = $(target).closest("[root]").attr("root");
                    var path = $(target).closest("[path]").attr("path");
                    selection.push(root + ":" + path);
                })
                iconview.trigger_fast("select", {
                    selection: selection
                });
            })
        }, this)
    }
    
    function trigger_custom(n,e) {
        this.trigger_fast(n, jwk.extend(e, {root: e.which("root"), path: e.which("path")}));
    };
    
    jwk.ui.component({
        "ui_type": "list.iconview",
        "namespace": "jwk-ui",        
        "constructor": jwk.ui.list.Iconview,
        "extends": jwk.ui.list.List,
        "api": {
            "click":       trigger_custom,
            "dblclick":    trigger_custom,
            "mousedown":   trigger_custom,
            "mousemove":   trigger_custom,
            "mouseover":   trigger_custom,
            "mouseout":    trigger_custom,
            "mouseup":     trigger_custom,
            "contextmenu": trigger_custom,
            "create_icon": function () {
                var iconview = this;
                return function (text, render) {
                    return jwk.ui.icon.create(this);
                };
            },
            "create_text": function () {
                var iconview = this;
                return function (text, render) {
                    var name = this.name;                    
                    return name;
                };
            }
        },
        "defaults": {
            "icon_size": "48",
            "selectable":{
                "allowMultiple": true,
                "applyTo": "children"
            },
            "template": {
                "empty": "<span class='empty'></span>",
                "remove": "",
                "text": "<span>{{#self.create_text}}{{/self.create_text}}</span>",
                "icon": "{{#self.create_icon}}{{/self.create_icon}}",
                "path": "path='{{path}}' root='{{root}}'",
                "entry": "<div signal='entry' {{>path}} icon='{{id}}'>{{>icon}}{{>text}}</div>",
                "main": "<div>{{#data.valueOf}}{{>entry}}{{/data.valueOf}}{{^data.valueOf}}{{>empty}}{{/data.valueOf}}</div>"
            }
        }
    }); 
    
    jwk.ui.component({
        "ui_type": "iconview",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.list.Iconview
    });    
    
    // TableList ----------------------------------------------------------------------------------
    jwk.ui.list.TableList = function (settings) {
        if (!settings) return;
        var tablelist = this;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        if (typeof settings.table_attr == "string") {
            def.template.table_attr = settings.table_attr;
        }
        this.selection = [];
        // this.selection = (Array.isArray(settings.selection)) ? settings.selection : [];
        jwk.ui.list.List.call(this, def);
        
        
        this.on("feature:selectable", function (n, e) {
            e.controller.on("select", function (_n, _e) {
                console.log(arguments);
                tablelist.selection.length = 0;
                _e.selection.each(function () {
                    var row = $(this).attr("row");
                    tablelist.selection.push(row);
                });
                tablelist.trigger("selection", {
                    "selection": tablelist.selection,
                    "index": tablelist.selection[0],
                    "target": tablelist
                });
            })
        })
        
        
        
        
        
    }
    
    jwk.ui.component({
        "ui_type": "tablelist",
        "namespace": "jwk-ui",
        "api": {
            compile_row: function () {
                var table = this;
                // console.log("acá es donde se puede hacer magia");
                console.assert(Array.isArray(table.value),
                               "ERROR: table.value must have an array with data to display on each row of tablelist", 
                               [table.value, table]);
                console.assert(Array.isArray(table.fields),
                               "ERROR: table.fields must have an array with the names of the attributes of each entry which determines column order", 
                               [table.fields, table]);
                
                
                return function (text, render) {
                    
                    var index = table.value.indexOf(this);
                    
                    var _class = (index % 2 == 0 ? "even" : "odd");
                    for (var i in table.selection) {
                        if (table.selection[i] == index) {
                            _class += " selected"; // TODO: hay que obtener este "selected" de la clase
                        }
                    }
                    result = "<tr signal='row' row='"+index+"' class='"+ _class +"'>";                    
                    
                    
                    // result = "<tr signal='row' row='"+index+"' class='"+ (index % 2 == 0 ? "even" : "odd") +"'>";                    
                    for (var i in table.fields) {
                        var prop = table.fields[i];
                        var value = this[prop];
                        var compiled = "<div prop='"+prop+"'>" + value + "</div>";
                        if (table.settings.template[prop]) {
                            console.error("ERROR: not implemented");
                        }
                        result += "<td cell='"+prop+"'><div class='table-layout'>" + compiled + "</div></td>";
                    }
                    result += "</tr>";
                    return result;
                };
            }, /*click: function (n, e) {                
                console.log(arguments, e.which("row"));
                
                
                
                this.trigger_fast(n, e);
            },*/ _update_end: function (event, prop) {
            }, _update_restructure: function (event, prop) {
                // console.log("tablelist._update_restructure", arguments);
                if (this.is_rendered()) {
                    if (prop == "columns") {
                        var $cols = this.target.find("colgroup col");
                        $cols.each(function (index) {
                            if ($(this).attr("width") != event.value[index]) {
                                $(this).attr("width", event.value[index]);
                            }
                        });
                    }
                    if (prop == "value") {
                        this.paint();
                    }
                }
                return this;
            }
        },
        "defaults": {
            "disable_selection": true,
            "ui_type": "tablelist",
            "namespace": "jwk-ui", 
            "removable": false,
            "template": {              
                "row": "{{#self.compile_row}}{{/self.compile_row}}",
                "body": "<tbody>{{#self.value}}{{>row}}{{/self.value}}</tbody>",
                "footer": "<tfoot></tfoot>",
                "table_attr": "cellpadding='0' cellspacing='0'",
                "col": "<col width='{{.}}' />",
                "columns": "<colgroup>{{#self.columns}}{{>col}}{{/self.columns}}</colgroup>", // TODO-HOY: acá hay que poner el tag columns
                "table": "<table {{>table_attr}}>{{>columns}}{{>body}}</table>",
                "main": "<div>{{>table}}</div>"
            }
        },
        "constructor": jwk.ui.list.TableList,
        "extends": jwk.ui.list.List
    });
    
    
    // Table ----------------------------------------------------------------------------------
    jwk.ui.list.Table = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        if (typeof settings.table_attr == "string") {
            def.template.table_attr = settings.table_attr;
        }
        if (def.fields && !def.labels) {
            def.labels = def.fields;
        }
        if (def.labels && !def.fields) {
            def.fields = def.labels;
        }
        
        jwk.ui.list.List.call(this, def);
        
        if (!this.columns) {
            this.columns = this.labels.map(function (n) { return ""; });
        }
        
        console.assert(Array.isArray(this.value), this.value);        
        function clean_copy_to_rows() {    
            this._rows = this.value.map(function (obj, index) {                
                return obj;
            });
        }
        clean_copy_to_rows.call(this);
        // cada vez que me actualizan el value hago una copia limpia a _rows
        this.on("change:value", clean_copy_to_rows, this);
        
        this._fields_priority = this.fields.map(function (n) {
            return {field:n, order:"asc"};
        });
        
        this.selection = settings.selection || [];
        this._selected_rows = [];
        
        
        
        // Assertions
        console.assert(Array.isArray(this.labels),
                       "ERROR: labels must be an Array of strings but got",
                       typeof this.labels, [this.labels, arguments] );
        console.assert(Array.isArray(this.fields),
                       "ERROR: fields must be an Array of strings but got",
                       typeof this.fields, [this.fields, arguments] );
        console.assert(this.fields.length == this.labels.length,
                       "ERROR: fields and labels must be same size but they are: ",
                       this.fields.length, this.labels.length, [this, this.settings, arguments]);

        this.on("render_start", function (n,e) {
            // console.log("cancelado el reestructurado");
            // e.component.restructure();  
        }, this);
        
    }
    
    jwk.ui.component({
        "ui_type": "table",
        "namespace": "jwk-ui",
        "api": {
            "sortData": function() {
                var self = this;
                function compare(a, b) {                    
                    for (var i in self._fields_priority) {
                        var field = self._fields_priority[i].field;
                        var order = self._fields_priority[i].order == "asc" ? 1 : -1;
                        console.assert(typeof a[field] in {"number":1, "string":1}, "ERROR: type comparison nos implemented for ", typeof a[field]);
                        console.assert(typeof a[field] == typeof b[field], "ERROR: type missmatch:", typeof a[field], typeof b[field]);
                        var compare = 0;
                        if (typeof a[field] == "string") {
                            compare = a[field].localeCompare(b[field]);
                        } else {
                            if (a[field] < b[field]) return -1 * order;
                            if (a[field] > b[field]) return 1 * order;
                        }
                        if (compare == 0) continue; // intentemos desempatar con otro field de menos prioridad.
                        return compare * order;
                    }
                    return 0;
                }
                console.log("Antes", this._rows);
                this._rows.sort(compare);
                console.log("Después", this._rows);
                console.log("----> va pelota");

                this._selected_rows.length = 0;
                for (var i in this.selection) {
                    var real_index = this.selection[i];
                    var object = this.value[real_index];
                    var new_index = this._rows.indexOf(object);
                    this._selected_rows.push(new_index);
                }                
                
                this.trigger_fast("change:_rows", {value: this._rows, target: this, path:"_rows"});
            },
            "parent_for": function (name, index) {
                switch (name) {
                    case "structure": return { parent: this };
                    default:
                        return { parent: this.search("tab_content") };
                }
            },    
            "structure_tree": function () {
                var table = this;                
                
                this.one("change:structure", function (n,e) {
                    var structure = e.value;
                    
                    // tero sobre los splitters y me anoto como listener
                    structure.on("render", function () {                        
                        for (var i=0; i<table.fields.length; i++) {
                            var name = "btn_" + table.fields[i];
                            structure.search(name).on("click", function (n,e) {                                
                                var field = e.component.field;
                                var order = e.component.value;
                                console.log(field, order);
                                var index = 0;
                                for (var i in table._fields_priority) {
                                    if (table._fields_priority[i].field == field) {
                                        index = i;
                                    }
                                }
                                table._fields_priority.splice(index, 1);
                                table._fields_priority.unshift({field:field, order:order});
                                table.sortData();
                            });
                            /*
                            structure.search(name).on("selected", function (n,e) {                                
                                console.log("OPA!! empezó a funcionar eso?", arguments);
                            });
                            structure.search(name).controllers.selectable.on("select", function (n,e) {
                                // e.controller.component
                                var value = e.controller.component.value;
                                console.log(value);
                                var index = table._fields_priority.indexOf(value);
                                table._fields_priority.splice(index, 1);
                                table._fields_priority.unshift(value);
                                table.sortData();
                            })*/                            
                        }
                        structure.search("table_content").on("click:entry", function (n,e) {
                            console.log(arguments);
                            table.trigger_fast(n,e);
                        });
                        structure.search("table_content").on("selection", function (n,e) {
                            console.log(arguments);
                            table.selection.length = 0;
                            for (var i in e.selection) {
                                var local_index = e.selection[i];
                                var object = table._rows[local_index];
                                var real_index = table.value.indexOf(object);
                                table.selection.push(real_index);
                            }
                            e.selection = table.selection;
                            e.index = table.selection[0];
                            table.trigger_fast(n,e);
                        });
                        structure.search("row_0").get("children").each(function (comp) {                        
                            if (comp.ui_type == "panel.row-splitter") {
                                comp.on("resize:width", function (n, e) {                                    
                                    var index = this.parent.children.indexOf(this);
                                    index = (index-1) / 2;                                    
                                    console.assert(index>=0, index, this.parent.children, this);
                                    table.columns[index] = (e.value + this.target.width()) + "px";
                                    table.trigger("change:columns", {value:table.columns, index:index});
                                    // console.log(e.value, e.percent, e.total, e.units);
                                    // con los datos de este evento hay que resizear la columna correspondiente de la table_content
                                }, comp);
                                console.assert(comp.controllers && comp.controllers.draggable, comp);
                                comp.controllers.draggable.move({x:0, y:0});
                            }                    
                        });
                    });                    
                });
                
                
                var structure = {          
                    "ui_type": "panel.layout",
                    "class": "expand",
                    "name": "structure",
                    "start": "col",                    
                    "children": {
                        "body": {
                            "class": "expand",
                            "ui_type": "panel.scroll",
                            "children": {
                                "table_content": {                                    
                                    "ui_type": "tablelist",
                                    "class": "expand",
                                    "selectable": {
                                        "applyTo": "group",
                                        "group": "tr",
                                        "allowMultiple": !!table.allowMultiple,
                                        "zIndex": false
                                    },
                                    "selection": "<<owner._selected_rows>>",
                                    "value": "<<owner._rows>>",
                                    "columns": "<<owner.columns>>",
                                    "labels": "<<owner.labels>>",
                                    "fields": "<<owner.fields>>",
                                }
                            }
                        },
                        "footer": {
                            "ui_type": "panel.emboss",
                            "class": "expand"
                        }
                    }
                }
                
                var headers = [];

                var group = "t-header-" + Math.random();
                for (var i=0; i<this.fields.length; i++) {
                    var name = "btn_" + this.fields[i];
                    structure.children[name] = {
                        "ui_type": "button.cycle",
                        "states": ["desc", "asc"],
                        "field": this.fields[i],
                        /*"selectable": {
                            "group": group,
                            // "context": this.target,
                            "zIndex": false,
                        },*/
                        "text": this.labels[i]
                    }
                    headers.push(name);
                    headers.push("|%");
                }
                headers.pop();
                
                structure.layout = [headers,"body","footer"];
                
                return structure;
            },
            
            compile_row: function () {
                aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa();
                var table = this;
                return function (text, render) {
                    var index = table.value.indexOf(this);
                    var _class = (index % 2 == 0 ? "even" : "odd");
                    for (var i in table.selection) {
                        if (table.selection[i] == index) {
                            _class += " selected"; // TODO: hay que obtener este "selected" de la clase
                        }
                    }
                    result = "<tr signal='row' row='"+index+"' class='"+ _class +"'>";                    
                    for (var i in table._rows) {
                        var prop = table._rows[i];
                        var value = this[prop];
                        var compiled = "<span prop='"+prop+"'>" + value + "<span>";
                        if (table.settings.template[prop]) {
                            console.error("ERROR: not implemented");
                        }
                        result += "<td cell='"+prop+"'>" + compiled + "</td>";
                    }
                    result += "</tr>";
                    return result;
                };
            }
        },
        "defaults": {
            "disable_selection": true,
            "ui_type": "table",
            "namespace": "jwk-ui",            
            "template": {
                "main": "<div></div>"
            }
        },
        "constructor": jwk.ui.list.Table,
        "extends": jwk.ui.list.List
    });
        
    // Combobox ----------------------------------------------------------------------------------
    jwk.ui.list.Combobox = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.list.List.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "list.combobox",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.list.Combobox,
        "extends": jwk.ui.list.List
    }); 
    
    
    return;    
    

    
});
define('jwk-ui/set/jwk.ui.menu',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
  
    
/*
menu.context
menu.menubar
menu.slide
menu.treeview
*/    
    
    // jwk.ui.panel library namespace
    jwk.ui.menu = {}
    
    // Menu ----------------------------------------------------------------------------------
    jwk.ui.menu.Menu = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
        
        this.on({
            "render_start": function () {
                
                //---- Solucion parcial al problema de q mustache busca en el nodo padre cuando no encuentra en el nodo actual.
                // Está pensado estudiar y evaluar Handlebars.js (es una extencion de mustache) que al parecer trae opciones más elegantes para este problema
                function prepare_data(menu) {                
                    for (var i=0; i<menu.length; i++) {
                        var node = menu[i];
                        var submenu = node.menu;
                        // var submenu = (typeof node["menu"] == "function") ? node.menu().valueOf() :  node.menu.valueOf();
                        if (!Array.isArray(submenu)) {
                            node.menu = false;
                            node.hasmenu = false;
                            node.id = false;
                        } else {
                            node.hasmenu = true;
                            node.id = node.id || "submenu_" + jwk.nextId();
                            prepare_data(submenu.valueOf());
                        }                    
                    }
                    return menu;
                }
                var data = this.my_data();
                if (data) {                
                    this.my_data(prepare_data( (data instanceof jwk.Node) ? data.valueOf() : data ), {no_parse: true});
                }            
                //---------
                
            }
        }, this);
    }
    
    jwk.ui.component({
        "ui_type": "menu",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.menu.Menu,
        "extends": jwk.ui.panel.Panel,
        "api": {
            "click":function (n, e) {                
                if (e.which("data-command")) {
                    e.command = e.which("data-command");                    
                    function searchCommand(com, array) {
                        for (var i in array) {
                            if (array[i].command == com) return array[i];
                            if (array[i].menu) {
                                var c = searchCommand(com, array[i].menu);
                                if (c) return c;
                            }                            
                        }                        
                    }                    
                    var command = searchCommand(e.command, e.component.settings.data);
                    e.params = command.params;
                    // e.params = e.which("data-params");
                    e.component.trigger("click:entry command", e);
                } else {
                    console.error("Que signal dio esto? como debo manejarlo: ", e.which("signal"));
                }
            }        
        },
        "defaults": {
            "disable_selection": true,
            "ui_type": "menu", 
            "namespace": "jwk-ui", 
            "template": {
                "menu_class": "submenu",
                "entry_class": "menu-entry",
                "empty": "<div class='{{>entry_class}} empty' disabled='true'>(...)</div>",
                "checkbox": "<svg class='menu_checkbox' width='16' height='16'>"+
                    "<g>"+
                    "<rect ry='3' rx='3' fill-opacity='0.3' id='svg_8' height='14' width='14' y='1.02963' x='0.99209' stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null' />"+
                    "<path d='m2.36865,9.37968c0,0 3.82932,4.22351 3.82584,4.19188c-0.00348,-0.03164 6.70479,-10.04848 6.70479,-10.04848c0,0 -6.87025,7.4897 -6.87373,7.45806c-0.00348,-0.03164 -3.6569,-1.60145 -3.6569,-1.60145z' stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null'/>"+
                    "</g>"+
                    "</svg>",
                "radiobtn": "<svg class='menu_radio_btn' width='16' height='16'>"+
                    "<g>"+
                    "<circle r='3.41212' cy='8.02963' cx='7.99209' stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null' stroke-width='0'/>"+
                    "<rect ry='3' rx='3' fill-opacity='0.3' height='14' width='14' y='1.02963' x='0.99209' stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null' />"+
                    "</g>"+
                    "</svg>",
                "arrow": "<svg class='menu_arrow' width='14' height='18' xmlns='http://www.w3.org/2000/svg'><g>"+
                         "<path d='m6.39569,9.11835l-0.78473,-2.03675l3.30957,2.03675l-3.30957,2.03675l0.78473,-2.03675z'  stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null'/>"+
                         "</g></svg>",
                "command": "{{#command}}data-command=\"{{command}}\"{{/command}}",
                "id":      "{{#id}} menu-id=\"{{id}}\"{{/id}}",
                "disabled": "{{#disabled}} disabled='true' {{/disabled}}",
                "separator": "{{#separation}}separation='true'{{/separation}}",
                "entry_text": "{{#text}}<span class='text'>{{text}}</span>{{/text}}",
                "entry_arrow": "{{>arrow}}",
                "entry_icon": "{{#icon}}<span class='icon {{icon}}'></span>{{/icon}}",
                "entry_check": "{{#checked}}{{>checkbox}}{{/checked}}",
                "entry_radio": "{{#selected}}{{>radiobtn}}{{/selected}}",
                "entry_img": "{{>entry_icon}}{{>entry_check}}{{>entry_radio}}",
                "entry_submenu": "{{#hasmenu}}{{>entry_arrow}}{{/hasmenu}}{{>menu}}",
                "entry_bind": "{{#bindkey}}<span class='bindkey'>{{bindkey}}</span>{{/bindkey}}",                
                "entry_content": "{{>entry_img}}{{>entry_text}}{{>entry_bind}}{{>entry_submenu}}",
                "entry": "<div {{>command}} {{>separator}} {{>disabled}} {{>id}} class=\"{{>entry_class}}\">{{>entry_content}}</div>",
                "menu": "{{#hasmenu}}<div class=\"{{>menu_class}}\">{{#menu}}{{>entry}}{{/menu}}{{^menu}}{{>empty}}{{/menu}}</div>{{/hasmenu}}",                
                "rootmenu": "<div root class=\"{{>menu_class}}\">{{#data}}{{>entry}}{{/data}}</div>",
                "main": "{{>rootmenu}}"
            }
        }
    });    
    
    
    // Context menu ----------------------------------------------------------------------------------
    jwk.ui.menu.Context = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu.context").defaults();
        jwk.ui.menu.Menu.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "menu.context",
        namespace: "jwk-ui",
        constructor: jwk.ui.menu.Context,
        extends: jwk.ui.menu.Menu,
        defaults: { template: { main: "<div></div>" } }
    });

    // Menubar ----------------------------------------------------------------------------------
    var debug_menu = false;
    jwk.ui.menu.Menubar = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu.menubar").defaults();
        jwk.ui.menu.Menu.call(this, jwk.extend(true, {}, def, settings));
        
        if (jwk.ui.render.mouse) {
            jwk.ui.render.mouse.on("click", function (n,e){
                if (e.component != this) {
                    this.close();
                }
            }, this);
        }
        
        this.on("render_start", function () {
            var menubar = this;
            menubar.drop_children();
            
            var data = this.my_data();
            if (!data) return;
            for (var i=0; i<data.length; i++) {
                var node = data[i];
                node.create_submenu = function () {
                    
                    /// menubar.template.empty tiene lo que busco pero el siguiente código no le da bola
                                        
                    
                    var submenu = jwk.ui.create_component({
                        "parent": menubar,
                        "ui_type": "menu",
                        "namespace": "jwk-ui",
                        "name": this.id,
                        "data": this.menu,
                        "template.empty": menubar.template.empty,
                        "position": {
                            "my": "left top",
                            "at": "left bottom",
                            "of": "[path='" + menubar.path + "'] [menu-id='" + this.id + "']",
                            "position": "absolute"
                        }
                    });
                    
                    submenu.on("command click:entry", function (n,e) { menubar.trigger_fast(n, e); });
                }                                  
            }            
        }, this);        
        
        this.set("opened", false);
        
        this.on("change:opened", function (n,e) {
            if (e.value) {
                e.target.add_class("opened");
                e.target.structure.add_class("opened");                
                
                var list = this.children.keys();
                for (var i=0; i<list.length; i++) {
                    var name = list[i];
                    var child = this.children.get(name);
                    var $entry = e.target.target.find("[menu-id='"+name+"']");
                    if (e.value == name) {
                        child.add_class("opened");
                        $entry.addClass("opened");
                    } else {
                        child.remove_class("opened");
                        $entry.removeClass("opened");
                    }
                }
                
                if (e.old_value == false) {
                    e.target.trigger("open", {component: e.target});
                }                
            } else {
                e.target.remove_class("opened");
                e.target.structure.remove_class("opened");
                
                var list = this.children.keys();
                for (var i=0; i<list.length; i++) {
                    var name = list[i];
                    this.children.get(name).remove_class("opened");
                    e.target.target.find("[menu-id]").removeClass("opened");                
                }
                
                e.target.trigger("close", {component: e.target});
            }
        }, this);
        
    }
    
    // private functions --------------------------------------------------
    function start_menu_change () {
        var menubar = this;
        if (menubar._menu_change_timer) {
            clearTimeout(menubar._menu_change_timer);            
        }
        
        if (debug_menu) if (!menubar._menu_change_data) console.error(" ---------- start_menu_change -----------");

        menubar._menu_change_data      = menubar._menu_change_data || menubar.my_data() || [];
        menubar._menu_change_commands  = menubar._menu_change_commands || {};
        menubar._menu_change_menues    = menubar._menu_change_menues || {};
        

        menubar._menu_change_timer = setTimeout(function () {
            if (debug_menu) console.error(" ------------- menubar._menu_change_data -> ", [menubar._menu_change_data]);
            
            var orden = function (a, b) {
                var ret = 0;
                if ( (!a.position || a.position>=0) && b.position<0) ret = -1; 
                if ( (!b.position ||b.position>=0) && a.position<0) ret = 1; 
                if (ret == 0) ret = (a.position > b.position) ? 1 : -1;
                return ret;
            }
            menubar._menu_change_data = menubar._menu_change_data.sort(orden);                 
            
            if (typeof menubar.datapath == "string") {
                if (menubar.datapath.indexOf("self:") != 0) {
                    if (menubar.data && menubar.data.set) {
                        menubar.data.set(menubar.datapath, menubar._menu_change_data, {no_parse: true});
                        menubar.paint();
                    }
                } else {
                    return console.error("not implemented yet");
                }
            } else {
                return console.error("not implemented yet");
            }
            delete menubar._menu_change_data;
            delete menubar._menu_change_commands;
            delete menubar._menu_change_menues;
            delete menubar._menu_change_timer;
            delete menubar._menu_top_parent;
        }, 100);
    }

    function get_menu_by_id(id) {
        var menu;
        if (this._menu_change_menues) {
            var menu = this._menu_change_menues[id];
            if (menu) return menu;
        }

        var data = this.my_data();

        function search(id, branch) {
            var menu = null;
            console.assert(Array.isArray(branch), branch);
            for (var i in branch) {
                if (branch[i].id == id) return branch[i];
                if (branch[i].menu) {
                    menu = search.call(this, id, branch[i].menu);
                    if (menu) return menu;
                }
            }
        }

        menu = search.call(this, id, data);
        if (menubar._menu_change_commands) {
            menubar._menu_change_commands[id] = menu;
        }

        return menu;
    }
    // ----------------------------------------------------
    function find_entry(commandID) {
        var menubar = this;
        start_menu_change.call(menubar);
        var entry = menubar._menu_change_commands[commandID];        
        if (entry) return entry;
        var menu = menubar._menu_change_menues[commandID]    
        if (menu) return menu;
        
        function search_deep (list) {
            for (var i in list) {
                var entry = list[i];
                if (entry.id) menubar._menu_change_menues[entry.id] = entry;
                if (entry.command) menubar._menu_change_commands[entry.command] = entry;
                if (Array.isArray(entry.menu)) {
                    search_deep(entry.menu);
                }
            }            
        }        
        
        if (menubar._menu_change_data) {
            search_deep(menubar._menu_change_data);
        }
        
        entry = menubar._menu_change_commands[commandID];        
        if (entry) return entry;
        menu = menubar._menu_change_menues[commandID]    
        if (menu) return menu;
                
    }
    
    jwk.ui.component({
        "ui_type": "menu.menubar",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.menu.Menubar,
        "extends": jwk.ui.menu.Menu,
        "defaults": {            
            "template": {                
                "menu": "{{#hasmenu}}{{create_submenu}}{{/hasmenu}}"
            }            
        },
        "api": {            
            "parent_for": function (name, index) {
                switch (name) {
                    case "ontop": return { parent: this.render.container() };
                    default:                
                        return { parent: this.get("structure") };
                }
            },
            "structure_tree": function () {
                return {
                    "name": "ontop",
                    "ui_type": "panel",
                    "class": "menu-ontop-layer"
                }
            },
            // ----------------------------------------------------------------------------------------------
            "add_menu": function (name, id, position, relativeID, callback) {
                if (debug_menu) console.log("add_menu", arguments);
                var menu = {
                    id: id,
                    text: name,
                    menu:[],
                    position: position
                }
                var current = find_entry.call(this, id);
                if (current) {
                    menu = current;
                    menu.text = name;
                }
                                
                this._menu_change_menues[id] = menu;
                if (relativeID) {
                    var parent = find_entry.call(this, relativeID);
                    if (parent) {                        
                        console.assert(Array.isArray(parent.menu), parent);
                        if (parent.menu.indexOf(menu) == -1) parent.menu.push(menu);
                    } else {
                        console.warn("WARNING: relative parent menu id does not exist", [arguments]);                                                
                    }
                } else {
                    if (this._menu_change_data.indexOf(menu) == -1) this._menu_change_data.push(menu);                    
                }
                return true;
            },
            "add_menu_item": function (id, name, commandID, bindingStr, displayStr, position, relativeID, callback) {                        
                if (debug_menu) console.log("add_menu_item", arguments);
                var entry = {
                    command: commandID,
                    text: name,
                    bindkey: displayStr,
                    binding: bindingStr
                };
                                
                if (commandID) {
                    var current = find_entry.call(this, commandID);
                    if (current) {
                        entry = current;
                        entry.text = name;
                        entry.bindkey = displayStr;
                        entry.binding = bindingStr;
                    }                
                    this._menu_change_commands[commandID] = entry;
                }
                if (name == "---") entry = {separation: true, text:""};

                var parent = find_entry.call(this, id);
                if (debug_menu) console.log("add_menu_item id:", id, parent);
                if (parent) {
                    console.assert(Array.isArray(parent.menu), parent);
                    if (parent.menu.indexOf(entry) == -1) {
                        parent.menu.push(entry);
                    }
                }
                return true;
            },
            "remove_menu": function () {
                start_menu_change.call(this);
                if (debug_menu) console.log("remove_menu", arguments);
                console.error("not implemented");
            },
            "remove_menu_item": function () {
                start_menu_change.call(this);
                if (debug_menu) console.log("remove_menu_item", arguments);
                console.error("not implemented");
            },
            "set_menu_item_shortcut": function (commandID, shortcutKey, format_descriptor, callback) {
                start_menu_change.call(this);                
                if (debug_menu) console.log("set_menu_item_shortcut", arguments);
                var entry = find_entry.call(this, commandID);
                entry.bindkey = format_descriptor;
                entry.binging = shortcutKey;
                return true;
            },
            "set_menu_title": function (commandID, name, callback) {
                start_menu_change.call(this);
                if (debug_menu) console.log("set_menu_title", arguments);
                var entry = find_entry.call(this, commandID);
                entry.text = name;
                return true;
            },
            "set_menu_item_state": function (commandID, enabled, checked, selected) {
                start_menu_change.call(this);
                if (debug_menu) console.log("set_menu_item_state", arguments);
                var entry = find_entry.call(this, commandID);
                if (enabled) delete entry.disabled; // está bien que esté al revéz
                if (!enabled) entry.disabled = true;
                if (checked) entry.checked = true; 
                if (!checked) delete entry.checked;        
                if (selected) entry.selected = true; 
                if (!selected) delete entry.selected;
                return true;
            },
            // ----------------------------------------------------------------------------------------------
            "add_menu_entry": function (id, entry) {
                start_menu_change.call(this);
                if (debug_menu) console.log("add_menu_entry", arguments);
                entry = (entry instanceof jwk.Node) ? entry.valueOf() : entry;
                var parent = get_menu_by_id.call(this, id);
                console.assert(Array.isArray(parent.menu), id, entry, parent);
                parent.menu.push(entry);
                return true;
            },
            // ----------------------------------------------------------------------------------------------
            "close": function () {
                this.set("opened", false);
            },
            "open": function (menuid) {        
                this.set("opened", menuid);
            },
            "click": function (n, e) {
                if (e.which("data-command")) {
                    e.command = e.which("data-command");
                    e.component.trigger("click:entry command", e);
                    e.component.close();
                    return this;
                }
                this.open(e.which("menu-id"));
            },
            "mouseover": function (n, e) {
                if (!this.opened) return this;        
                if (e.which("menu-id")) {
                    this.open(e.which("menu-id"));
                }
            }    
        }
    });
    
    // Slide menu ----------------------------------------------------------------------------------
    jwk.ui.menu.Slide = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu.slide").defaults();
        jwk.ui.menu.Menu.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "menu.slide",
        namespace: "jwk-ui",
        constructor: jwk.ui.menu.Slide,
        extends: jwk.ui.menu.Menu,
        defaults: { template: { main: "<div></div>" } }
    });
    
    // Treeview menu ----------------------------------------------------------------------------------
    jwk.ui.menu.Treeview = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu.treeview").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));        
        
        // Cada vez que se renbderiza el componente el .entry_bg vuelve a quedar en su estado inicial
        // por tanto es necesario capturar su estado justo antes de volver a renderizar y restaurarlo luego del render
        this.on("render_start",function () {
            if (!this.target) return;
            var hover_bg = this.target.find(".hover_bg").eq(0);
            var selected_bg = this.target.find(".selected_bg").eq(0);
            this.hover_bg_style = hover_bg.attr("style");
            this.selected_bg_style = selected_bg.attr("style");
        }, this);
        
        this.on("render",function () {
            // console.log(arguments, jwebdesk.elapsed())            
            var selected_bg = this.target.find(".selected_bg").eq(0);
            var hover_bg = this.target.find(".hover_bg").eq(0);
            selected_bg.attr("style", this.selected_bg_style);
            hover_bg.attr("style", this.hover_bg_style);
        }, this);
        // ------------------------------
        
    }
    
    function hilight_selected_node() {
        var node = this.get("selected");
        var selected_bg = this.target.find(".selected_bg").eq(0);
        var li = this.target.find("li[path='"+node.path+"'][root='"+node.root+"']").closest("li");
        if (li.length == 0) return console.error("no encontre el li?", arguments, this);
        // Es importante el orden: primero show y luego offset
        selected_bg.show(0);
        var left = selected_bg.offset().left;
        var top = li.offset().top;
        selected_bg.offset({top:top, left: left});                    
    }
    
    jwk.ui.component({
        "ui_type": "menu.treeview",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.menu.Treeview,
        "extends": jwk.ui.panel.Panel,
        "api": {
            "close": function (root, path) {
                var self = this;
                var deferred = jwk.Deferred();
                var node;
                if (arguments.length == 1 && typeof root == "object") {
                    node = root;
                } else {
                    node = this.my_data().get(root).cache[path];
                    if (!node) {
                        console.error("node?", node, [path, node.cache]);
                    }
                }
                
                if (node.state != "closed") {
                    node.state  = "closed";
                    var li = self.target.find("[path='" + node.path + "'][root='" + node.root + "']");                  
                    var ul = li.children("ul");
                    // -----                    
                    // li.attr("state", "closed").addClass("closed").removeClass("opened");
                    li.find(".state").eq(0).attr("class", "state " + node.state);
                    // -----
                    ul.animate({height: 0},
                        {
                            duration: 500,
                            complete: function () {
                                self.paint();
                                deferred.resolve(node);
                            }
                        }
                    );                    
                }
                
                return deferred.promise();                
            },
            "open": function (root, path) {
                // console.log("open", arguments, jwebdesk.elapsed());
                var self = this;
                var deferred = jwk.Deferred();
                var whenchildren;                
                var node;
                if (arguments.length == 1 && typeof root == "object") {
                    node = root;
                    console.assert(typeof node.nodes == "function", [node, node.nodes]);
                    whenchildren = node.nodes();
                } else {
                    node = this.my_data().get(root);
                    if (path == "/") {
                        whenchildren = node.nodes();
                    } else {
                        console.error("not implemented");
                    }
                }
                
                (function (def){
                    // console.log(whenchildren, whenchildren.state());
                    if (whenchildren.state() == "pending") {
                        if (node.state == "closed") {
                            var li = self.target.find("[path='" + node.path + "'][root='" + node.root + "']");                          
                            // -----
                            li.attr("state", "loading").addClass("loading").removeClass("closed");                            
                            li.find(".state").eq(0).attr("class", "state loading");
                            // -----
                        }                        
                    }
                    
                    whenchildren.done(function (_nodes, parent) {
                        // console.log("whenchildren.done", arguments, jwebdesk.elapsed());
                        if (parent.state == "closed") {                                                        
                            self.paint();
                            parent.state = "opened";
                            var li = self.target.find("[path='" + parent.path + "'][root='" + parent.root + "']");                            
                            var ul = li.children("ul");
                            var h = ul.height();
                            ul.css({height:0, display:"block"});                            
                            // -----                            
                            li.attr("state", "opened").addClass("opened").removeClass("closed").removeClass("loading");                            
                            li.find(".state").eq(0).attr("class", "state opened");
                            // -----
                            ul.animate({height: h},
                                {
                                    duration: 500,
                                    complete: function () {                                  
                                        def.resolve(_nodes, parent);
                                    }
                                }
                            );
                        } else {
                            // console.error("ERROR?",parent.get("state"), this, arguments);
                            // Ya esta abierta.
                            def.resolve(_nodes, parent);
                        }
                    });
                })(deferred);
                
                return deferred.promise();
            },
            "expand_to": function (_root, _path) {
                // console.log("expand_to", arguments, jwebdesk.elapsed());
                var root = _root, 
                    path = _path;
                if (arguments.length == 1 && root.root, root.path) {
                    path = root.path;
                    root = root.root;
                }
                var deferred = jwk.Deferred();
                if (path == "/") {
                    this.open(root, path).done(function (nodes, parent) {
                        deferred.resolve(parent);
                    });
                } else {
                    var self = this;
                    var root_node = this.my_data().get(root);
                    var parts = [path];
                    var paths = {};
                    paths[path] = true;
                    var index = path.indexOf("/", 1);
                    while (index != -1) {
                        var _path = path.substring(0, index);
                        parts.push(_path);
                        paths[_path] = true;
                        index = path.indexOf("/", index+1);                        
                    }
                    console.assert(parts.length > 0, path);
                    (function(paths){
                        function go_deeper(_nodes, parent) {
                            // console.log("go_deeper", arguments, jwebdesk.elapsed());
                            if (parent.path == path) {
                                deferred.resolve(parent);
                            }
                            var current = null;
                            var nodes = _nodes.valueOf();
                            for (var i=0; i<nodes.length; i++) {
                                if (nodes[i].path in paths) {
                                    if (nodes[i].isFolder) {
                                        self.open(nodes[i]).done(go_deeper);
                                    } else {
                                        deferred.resolve(nodes[i]);
                                    }
                                }
                            }
                        }
                        self.open(root_node).done(go_deeper);
                    })(paths);
                }                
                return deferred.promise();
            },
            "click": function(n, e) {
                // console.log(arguments, jwebdesk.elapsed());
                var treeview = this;
                var path = e.which("path");
                var root = e.which("root");
                var state = e.which("state");
                var signal = e.which("signal");
                var abort = false;
                if (root && path) {
                    var node = this.my_data().get(root).cache[path];
                    abort = this.select(node, {silence: true});
                }
                switch(state) {
                    case "closed":
                        this.expand_to(root, path).done(function (node){
                            if (!abort) treeview.trigger("select", {node: node});
                        });
                        break;
                    case "opened":
                        this.close(root, path).done(function (node){
                            if (!abort) treeview.trigger("select", {node: node});
                        });
                        break;
                    default:
                        console.log("click not implemnented for state =", state);
                }
            },
            "select": function(node, _options) {
                if (!node) return;
                var options = _options || {};                
                if (node == this.get("selected")) {
                    hilight_selected_node.call(this);                    
                    return true;
                }
                this.set("selected", node);
                var treeview = this;
                this.one("select", function (n,e) {                    
                    hilight_selected_node.call(treeview);
                });                
                hilight_selected_node.call(treeview);                
                
                if (options.expand) {
                    var path = node.path;
                    var root = node.root;
                    if (node.state == "opened") {
                        if (node.parent) {                            
                            this.expand_to(node.root, node.parent.path).done(function () {                            
                                if (!options.silence) treeview.trigger("select", {node: node});
                            });                    
                        }
                    } else {
                        this.expand_to(node.root, node.path).done(function (node) {                            
                            if (!options.silence) treeview.trigger("select", {node: node});
                        });                    
                    }                    
                } else {
                    if (!options.silence) this.trigger("select", {node: node});                    
                }
                
            },
            "mouseover": function(n, e) {
                if (!e.target) return;
                var hover_bg = this.target.find(".hover_bg").eq(0);
                var li = $(e.target).closest("li");
                if (li.length == 0) return;
                // Es importante el orden: primero show y luego offset
                hover_bg.show(0);
                var left = hover_bg.offset().left;
                var top = li.offset().top;
                hover_bg.offset({top:top, left: left});
            },
            "mouseout": function(n, e) {
                this.target.find(".hover_bg").eq(0).hide(0);
            },
            "create_icon": function () {
                var treeview = this;
                return function (text, render) {
                    var icon = this.icon;
                    var icon_size = "size_" + treeview.icon_size;
                    var icon_class = jwk.ui.icon.get("iconmap").valueOf()[icon] || "";
                    return "<div class='" + icon + " icon " + icon_class + " " + icon_size + "'></div>";
                };
            },            
            "prepare_entry": function () {
                return function (text, render) {
                    if (!this.children) {
                        this.children = false;
                    }                
                    return render(text);
                }
            }
        },
        "defaults": {
            "icon_size": 16,
            "disable_selection": true,
            "template": {
                // "submenu": "<ul class='submenu'>{{#children}}{{#children.valueOf}}{{>entry}}{{/children.valueOf}}{{/children}}</ul>",
                "submenu": "<ul class='submenu'>{{#children}}{{>entry}}{{/children}}</ul>",
                "state_class": "{{#state}}{{.}}{{/state}}{{^state}}closed{{/state}}",
                "state_icon": "<div signal='state' class='state {{>state_class}}'></div>",
                "state": "state='{{>state_class}}'",
                "selected": "{{#selected}}class='selected'{{/selected}}'",
                "icon": "{{#self.create_icon}}{{icon}},{{name}}{{/self.create_icon}}",
                "text": "<div class='text' text='{{name}}'>{{name}}</div>",
                "path": "path='{{path}}'",
                "root": "{{#root}}root='{{root}}'{{/root}}",
                "hover_bg": "<div class='hover_bg'><div class='text'>example</div></div>",
                "selected_bg": "<div class='selected_bg'><div class='text'>example</div></div>",
                "entry": "{{#self.prepare_entry}}<li signal='node' {{>root}} {{>path}} {{#isFolder}}folder='true'{{/isFolder}} {{>state}} {{>selected}}><div class='entry'>{{>state_icon}}{{>icon}}{{>text}}</div>{{>submenu}}</li>{{/self.prepare_entry}}",
                "rootmenu": "<div>{{>hover_bg}}{{>selected_bg}}<ul class='submenu root'>{{#data.values}}{{>entry}}{{/data.values}}</ul></div>",
                "main": "{{>rootmenu}}"
            }
        }
    });  
    
    
    

    
     jwk.ui.component({
        ui_type: "treeview",
        namespace: "jwk-ui",
        constructor: jwk.ui.menu.Treeview
    });  
    
    
    return jwk.ui.menu;
});
define('jwk-ui/set/jwk.ui.other',[
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
    return;    
    
  
    
    // jwk.ui.Toolbar ----------------------------------------------------------------------------------
    jwk.ui.Toolbar = function (settings) {
        if (!settings) return;
        var def = {
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.Toolbar.prototype = new Component();
    jwk.ui.Toolbar.prototype.constructor = jwk.ui.Toolbar;        

    jwk.ui.component({
        ui_type: "toolbar",
        namespace: "jwk-ui",
        constructor: jwk.ui.Toolbar
    });
    
    // jwk.ui.IconTool ----------------------------------------------------------------------------------
    jwk.ui.IconTool = function (settings) {
        if (!settings) return;
        var def = {
            icon: "default",
            class: "icon",
            template: {
                main: "<div class='{{self.icon}}'></div>"
            }            
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.IconTool.prototype = new Component();
    jwk.ui.IconTool.prototype.constructor = jwk.ui.IconTool;        

    jwk.ui.component({
        ui_type: "icontool",
        namespace: "jwk-ui",
        constructor: jwk.ui.IconTool
    });
    
    return jwk.ui.Iconview;      
    
});
define('jwk-ui/set/jwk.ui.set',[
    "./jwk.ui.bar",
    "./jwk.ui.button",
    "./jwk.ui.dialog",
    "./jwk.ui.hud",
    "./jwk.ui.icon",
    "./jwk.ui.tool",
    "./jwk.ui.input",
    "./jwk.ui.label",
    "./jwk.ui.list",
    "./jwk.ui.menu",
    "./jwk.ui.other",
    "./jwk.ui.panel"    
], function() {
    return { name: "jwk.ui.set" };
});
define('jwk-ui/jwk.ui.jwk-component',[
    "jwebkit",
    "./jwk.ui.core",
    "jquery"
], function(jwk, ui, $) {
 
    
    jwk.ui.DEFAULT_NAMESPACE = "jwk-ui";        
    
    if (jwk.query.fn) jwk.query.fn.component = function( type, id ) {
        // console.log("jwk.query.fn.widget que pasa con esto?");
        var htmlid = "#"+id;
        var target = $(this).find(htmlid);            
        var widget = null;
        if (target.size() > 0) {
            widget = target.data(type);
            if (widget) {                    
                return widget;
            }
        }
    }
    
    jwk.ui.create_algo = function() {
        console.log("1 --> ", this, arguments);
        return function () {
            console.log("2 --> ", this, arguments);
            return "";
        }
    }
    
    
    var componentes = {};
    jwk.ui.spec = function (namespace, ui_type) {
        console.assert(typeof namespace == "string", namespace);
        console.assert(typeof ui_type == "string", ui_type);
        console.assert(componentes[namespace], "ERROR: Namespace: " + namespace + " not found", componentes);
        if (!componentes[namespace]) return Object;
        console.assert(componentes[namespace][ui_type], "ERROR: Namespace.Ui_Type: " + namespace+"."+ui_type + " not found", componentes);
        if (!componentes[namespace][ui_type]) return Object;
        return componentes[namespace][ui_type];
    }
    
    
    
    jwk.ui.register_component = function (spec) {        
        var namespace = spec.namespace || "unknown";
        var ui_type = spec.ui_type || "unknamed";
        var extend = spec.extends || null;
        var api = spec.api || null;
        var defaults = spec.defaults || null;

        if (extend) {
            if (typeof spec.constructor == "undefined") {
                console.error(spec);
            }
            spec.constructor.prototype = new extend();
            spec.constructor.prototype.constructor = spec.constructor;
        }

        if (api) {
            for (var name in api) {
                spec.constructor.prototype[name] = api[name];
            }
        }

        if (defaults) {
            defaults.namespace = namespace;
            defaults.ui_type = ui_type;
            spec.defs = defaults;
            spec.defaults = function() {
                if (typeof spec.defs == "function") {
                    var obj = spec.defs();             
                    obj.namespace = spec.defs.namespace;
                    obj.ui_type   = spec.defs.ui_type;
                } else {
                    var obj = jwk.extend(true, {}, spec.defs);
                }
                return obj
            }
        }            
        componentes[namespace] = componentes[namespace] || {};
        if (componentes[namespace][ui_type]) {
            console.warn("WARNING:  " + namespace+"."+ui_type + " already exist ",componentes[namespace][ui_type],"overwrighting with", spec);
        }
        componentes[namespace][ui_type] = jwk.extend(true, {}, componentes[namespace][ui_type], spec);
        jwk.ui.trigger("component:"+namespace+"."+ui_type, componentes[namespace][ui_type]);
    }    
    jwk.ui.regc = jwk.ui.register_component;

    jwk.ui.JWKComponent = function (settings) {
        jwk.Node.call(this);
        if (settings) {
            settings.template = settings.template || {};
            settings.template.main = (typeof settings.template.main == "string") ? settings.template.main : "<div></div>";
            console.assert(settings.ui_type, "ERROR: missing ui_type attribute in settings");
            if (typeof settings.namespace == "undefined") {
                console.warn("WARNING: missing namespace attribute in settings. default value ("+ui.DEFAULT_NAMESPACE+") asigned for ", settings.ui_type);
                settings.namespace = ui.DEFAULT_NAMESPACE;
            }            
            if (typeof settings.datapath == "string" && typeof settings.data != "object") {
                if (settings.datapath.indexOf("self:") == 0) {
                    settings.data = this;
                } else {
                    console.error("ERROR: datapath attribute specified but no data present");
                }                
            }
            if (!settings.render) settings.render = ui.render;            
            this.init_settings(settings);
        }
    }
    jwk.ui.JWKComponent.prototype = new jwk.Node();
    jwk.ui.JWKComponent.prototype.constructor = jwk.ui.JWKComponent;
    jwk.ui.JWKComponent.prototype.extend_in_depth = ["template"];
    
    jwk.ui.JWKComponent.prototype.init_tree = function() {
        var tree = this.tree();
        var data = this.data;
        var children = jwk.ui.create_jwk_component_tree(this, tree);
        /*var names = children.keys();
        for (var i in names) {
            var id = names[i];
            this.child(id, children.get(id));
        }*/
        return this;
    }
    
    jwk.ui.create_jwk_component_tree = function(parent, uitree) {
        var children = uitree.children;
        var owner = uitree.owner;
        var container = uitree.container;
        var data = uitree.data;
        var path = (typeof uitree.path == "string") ? (uitree.path+".") : "";
        var render = uitree.render || ui.render;
        var root = new jwk.Node();
        root.descartable = true;

        var i,
            is_array = Array.isArray(children);
        
        if (is_array) {
            console.error(children);
        }        
        
        for (var id in children) {
            var child = children[id];
            var ui_type = child.ui_type;            
            if (is_array) {
                assert(false, "ERROR: esto todavía se usa", [children, arguments, this]);
                /*
                i = id;
                if (child.name) {
                    id = child.name;
                } else {
                    id = ui_type.replace(".","_") + "_"+ i;
                }
                */
            }            
            var namespace = child.namespace || parent.namespace || ui.DEFAULT_NAMESPACE;            
            var settings = jwk.extend({
                path: path + id,
                name: id,
                parent: parent,                
                data: data,                
                render: render,
                owner: owner,
                namespace: namespace,
            }, child);
            
            if (container) settings.container = container;

            delete settings.path;
            var component = jwk.ui.create_jwk_component(settings);

            root.set(component.name, component);
        }
        return root;
    }
    
    jwk.ui.display_jwk_component = function(settings) {
        var c = this.create_jwk_component(settings);
        c.paint();
        return c;
    }

    var merge_with_data_stack = [];
    function merge_with_data (settings, component) {
        var result = jwk.extend({}, settings);
        
        // lo agrego en el stack si no está
        if (merge_with_data_stack.indexOf(settings) != -1) return settings;
        merge_with_data_stack.push(settings);

//        if (settings.layout == "<<data.layout>>") {        
//console.error("bbbbbbbbbbbbbbbbbbbbbbbbb");
            var data = settings.data || component.data;
            var self = component;
            var owner = component.owner || settings.owner;            
            var parent = component.parent;
            var regexp = /<<(.+)>>/m;
            var prefix = "";
            
            for (var i in settings) {
                var value = settings[i];            
                if (typeof value == "function") continue;
                //var is_mapping = jwk.is_pure_map_object(value);
                var is_string = typeof value == "string";
                //if (!is_mapping && !is_string) continue;
                /*if (is_mapping) {
                    value = merge_with_data(value);
                    settings[i] = value;
                }*/
                if (is_string) {
                    var test = value.match(regexp);
                    if (test) {
                        // console.error(test);
                        var path = test[1];
                        prefix = "data.";
                        if (path.indexOf(prefix) == 0) {
                            // value = this.resolve_value(path, prefix, data);
                            var _path = path.substring(5);
                            value = data.get(_path);
                            if (component) {
                                (function (comp, prop){
                                    data.on("change:"+_path, function (name, event) {
                                        comp.update(event, prop);
                                    }, comp);                                    
                                })(component, i);
                            }
                        }
                        prefix = "self.";
                        if (path.indexOf(prefix) == 0) {
                            var _path = path.substring(prefix.length);
                            value = self.get(_path);
                            if (typeof value == "undefined") value = self[_path];
                            if (component) {
                                (function (comp, prop){
                                    comp.on("change:"+_path, function (name, event) {
                                        comp.update(event, prop);
                                    }, comp);
                                })(component, i);
                            }
                        }
                        prefix = "owner.";
                        if (path.indexOf(prefix) == 0) {
                            var _path = path.substring(prefix.length);
                            value = owner.get(_path);
                            if (typeof value == "undefined") value = self[_path];
                            if (component) {
                                (function (comp, prop, owner){
                                    comp.settings.owner.on("change:"+_path, function (name, event) {
                                        comp.update(event, prop);
                                    }, comp);
                                })(component, i, owner);
                            }
                        }
                        result[i] = value;
                    }                    
                }                
            }                        
        //}
        
        // lo saco del stack
        if (merge_with_data_stack.indexOf(settings) >= 0) {
            merge_with_data_stack.splice(merge_with_data_stack.indexOf(settings), 1);
        }        

        return result;
    }
    
    jwk.ui.create_jwk_component = function(settings) {    
        var ui_type = settings.ui_type;
        var namespace = settings.namespace || ui.DEFAULT_NAMESPACE;
        var path = settings.path;
        var name = settings.name;
        
        if (path && name) {
            // TODO: verificar que el final del path es igual al nombre
            console.assert(path.lastIndexOf(name) == path.length - name.length, path, name, path.lastIndexOf(name), path.length - name.length);
        } else if (path && !name) {
            // TODO: tiene path, así que el nombre lo sacamos de ahi.
            var i = path.lastIndexOf(".");
            name = (i>=0) ? path.substring(i+1) : path;            
        } else if (!path && name) {
            // hay nombre pero no hay path. Entonces tenemos que saber si existe un parent o un owner para sacar el comienzo del path de ahi y concatenarle el nombre.
            // Si no, va solo en nombre
            var up_obj = (settings.parent || settings.owner);
            path = (up_obj) ? (up_obj.path + "." + name) : name;
        } else if (!path && !name) {
            path = name = ui_type + "_" + jwk.nextId();
        }
        
        var settings = jwk.extend({
            path: path,
            name: name,
            render: ui.render,
            namespace: namespace
        }, settings);
        var spec = jwk.ui.spec(namespace, ui_type);
        console.assert(spec, "ERROR: Not spacification found for ", namespace, ui_type, [settings]);
        var component = new spec.constructor(settings);
        component.init();
        return component;
    }
    
    
    // --------------------------------------------
    // 
    jwk.ui.JWKComponent.prototype.update_tree = function (tree) {
        // Acá recibís un tree y actualizás el arbol recorriendo tus hijos
        // Si el tree tiene un hijo y vos también, paás al siguiente hijo
        // Si el tree tiene un hijo que vos no tenés, tenés que crear el componente y agregarlo como hijo.
        // Si el tree no tiene un hijo que vos sí tenés, tenés que sacarte ese hijo y ponerlo en stand by
        // Luego por cada hijo que te quedó vivo, ejecutás recursivamente esto miso.
        
        // se ejecuta un trigger("update_tree") donde el componente podrá hacerse cargo de los componentes que quedaron en stan by
        // Luego se eliminan todos los componentes que continúen en stand by (porque nadie los sacó de ahi).
        console.error("update_tree", [this], [tree])

        var tree_nodes = [tree];
        var self_nodes = [this];
        
        while (tree_nodes.length > 0) {
            var tree_node = tree_nodes.splice(0,1)[0];
            var self_node = self_nodes.splice(0,1)[0];
            
            if (Array.isArray(tree_node.children)) {
                var self_children = self_node.get("children");
                if (self_children) {                    
                    for (var tree_child_name in tree_node.children) {
                        if (self_children.get(tree_child_name)) {
                            var tree_node_child = tree_node.children[tree_child_name];
                            tree_nodes.push(tree_node_child);
                        } else {
                            // Opa, el tree tiene un hijo que yo no tengo
                            console.log("Opa, el tree tiene un hijo que yo no tengo",tree_child_name, [this], [tree]);
                            not_implemented_yet();
                        }
                    }
                    var list = self_children.keys();
                    for (var self_child_name in list) {
                        if (!(self_child_name in tree_node.children)) {
                            // Opa, tengo un hijo que no está en el tree
                            console.log("Opa, tengo un hijo que no está en el tree", self_child_name, [this], [tree]);
                            not_implemented_yet();
                        }
                    }
                    
                } else {
                    // Opa, no tengo chldren y sin embargo el tree tiene
                    console.log("Opa, no tengo chldren y sin embargo el tree tiene", [this], [tree]);
                    not_implemented_yet();        
                }
            }
        }
    }
    
    jwk.ui.JWKComponent.prototype.update = function (event, prop) {
        
        if (this.making_changes()) return;
        if (typeof event.tree == "object") {
            this.update_tree(event.tree);
        }
        if (typeof prop == "string" && typeof this.settings[prop] != "undefined") {
            var old_value = this[prop];
            this[prop] = event.value;            
            this.trigger("change:"+prop, {
                event_name: "change:"+prop,
                old_value: old_value,
                path: prop,
                target: this,
                value: event.value
            });
        }
        if (this.is_rendered()) {
            this.restructure();
            this.render.render(this);
        }
        return this;
    }
    
    jwk.ui.JWKComponent.prototype.structure_tree = function () {
        // Esto devuelve el json que describe como tiene que ser el arbol de la strucure
        // Acá el componente actualiza esa estructura a apartir de su estado (cantidad, de hijos, latout, etc)
        return false;
    }
    
    jwk.ui.JWKComponent.prototype.create_structure = function () {
        var root = this.structure_tree();
        if (!root) return null;        
        root.name = root.name || "struct_" + jwk.nextId();
        root.path = this.path + "."  + root.name;
        root.owner = this;
        root.data = root.data || this.my_data();
        var structure = jwk.ui.create_jwk_component(root);
        return structure;
    }
    
    jwk.ui.JWKComponent.prototype.restructure = function () {
        var structure = this.get("structure");
        if (structure) {
            structure.destroy();
        }
        structure = this.create_structure();
        if (structure) {
            this.set("structure", structure);
        }
        return this;
    }
    
    // --------------------------------------------
    
    jwk.ui.JWKComponent.prototype.destroy = function () {
        this._destroyed = true;
        this.listen_data(false);
        if (this.parent) {
            // console.log("saco", this.name)
            this.parent.child(this.name, null);
        }
        this.drop_children();
        if (this.get("structure")) {
            this.get("structure").destroy();
        }
        if (jwk.ui.render.mouse) {
            jwk.ui.render.mouse.off(null, null, this);
        }
        return this.trigger_fast("destroy", {component:this});
    }
    
    // --------------------------------------------
    // The specific component may extend the way it render by over writing any of this funcions
    jwk.ui.JWKComponent.prototype.render_save_children = function (event) {
        this.render.render_save_children(this, this.settings.container);
    }
    
    jwk.ui.JWKComponent.prototype.render_node = function (event) {
        console.log("jwk.ui.JWKComponent.prototype.render_node", this.ui_type);
        var component = this;
        var container = component.settings.container ;
        if (typeof container == "undefined") {
            if (component.parent) {
                if (!component.parent.container) delete component.parent.container;
                container = component.settings.container = component.parent.container(component.name);
            }
        }
        if (typeof container == "undefined") {
            if (component.owner) {
                if (!component.owner.container) delete component.owner.container;
                container = component.settings.container = component.owner.container(component.name)
            }
        }        
        if (typeof container == "undefined") {
            container = component.settings.container = this.render.container(); // Body
        }

        var target = component.target;
        var tree_node = component.tree();

        component.first_rendering = true;
        if (component.target && component.target.size() > 0 && container === component.settings.container) {
            // this.render_save_children(component);
            component.first_rendering = false;
            if (tree_node.class) {
                if (tree_node.class) component.target.addClass("class", tree_node.class);
            }
            var html = this.render_html(component);
            var html_node = $(html).eq(0);
            jwk.each(html_node[0].attributes, function(i, attrib){
                var name = attrib.name;
                var value = attrib.value;
                try {
                    component.target.attr(name, value);
                } catch (e){} // some browsers do not allow to change some propperties
            });
            
            component.target.html(html_node.html());

        } else {
            var html = this.render.render_html(component);
            var cont = (container.target instanceof $) ? container.target : container
            target = $(html).appendTo( $(cont) );

            // El style es solo para debugear. No se supone que sea siempre así.
            if (tree_node.style)  target.attr("style", (target.attr("style") ? (target.attr("style") + "; ") : "") + tree_node.style);
        }
        
        this.render.set_target(component, target);

        if (tree_node.class) target.addClass(tree_node.class);
        if (component.content) {
            component.one("render", function (n, e) {
                // var target = component.render.resolve_container(e.component.parent_for(null, 0))
                if (e.component.content) {
                    e.component.target.find("content").html(e.component.content);
                }
            }, this);
        }
        
        
        
        var forbidden = {class:true, text:true,  content:true, style:true, html:true};
        for (var prop in tree_node) {
            if (typeof tree_node[prop] != "string") continue;
            if (prop in forbidden) continue;
            target.attr(prop, tree_node[prop]);
        }
        
        /*
        // El style es solo para debugear. No se supone que sea siempre así.
        if (tree_node.style)  component.target.attr("style", tree_node.style);
        */        
        console.assert(true)
    }
    
    jwk.ui.JWKComponent.prototype.render_structure = function (event) {
        this.render.render_structure(this, this.settings.container);
    }
    
    jwk.ui.JWKComponent.prototype.render_children = function (event) {
        this.render.render_children(this, this.settings.container);
    }
    // --------------------------------------------
    
    jwk.ui.JWKComponent.prototype.is_rendered = function () {
        return this.render.is_rendered(this);
    }    
    
    jwk.ui.JWKComponent.prototype.add_class = function (_class) {
        this.render.add_class(this, _class);
    }

    jwk.ui.JWKComponent.prototype.remove_class = function (_class) {
        this.render.remove_class(this, _class);
    }

    jwk.ui.JWKComponent.prototype.paint = function () {
        console.assert(!this._destroyed, "ERROR: rendering a distroyed object", [this]);
        if (this.making_changes()) return this;        
        this.render.render(this);
        this.flag_on("rendered");
        return this;
    }
    
    jwk.ui.JWKComponent.prototype.child = function (id, child) {
        // HACK: tuve que sacar esto mientras reimplemento jwk.ui porque me daba problemas
        // console.assert(!child || child instanceof jwk.ui.JWKComponent, "ERROR: child is not a component", id, child);        
        console.assert(true || child instanceof jwk.ui.JWKComponent, "ERROR: child is not a component", id, child);        
        
        if (arguments.length == 1) {
            return this.get("children").get(id);
        } else {
            if (!child) {
                this.get("children").unset(id);
            } else {
                this.set("children."+id, child, {deep:true});
                this.get("children").parent = this;
            }
        }
        return this;
    }
    
    jwk.ui.JWKComponent.prototype.drop_children = function () {
        if (this.get("children")) {
            var list = this.get("children").keys();
            for (var i in list) {
                if(!this.get("children").get(list[i])) {
                    console.error(list[i], this.get("children").keys());
                }
                this.get("children").get(list[i]).destroy();
            }
        }
        return this;
    }
    
    jwk.ui.JWKComponent.prototype.container = function () {
        return this.render.resolve_container(this.parent_for.apply(this, arguments));
    }
    
    jwk.ui.JWKComponent.prototype.parent_for = function(name, index) {
        var data = {parent:this, query:(name ? "[child="+name+"]" : undefined)};
        if (this.render.resolve_container(data, true)) {
            return data;
        }
        return {parent:this};        
    }
        
    //jwk.ui.JWKComponent.prototype.parent_for = function(name, index) {
    //    return {parent:this, query:(name ? "[child="+name+"]" : undefined)};    
    //}
        
    jwk.ui.JWKComponent.prototype.tree = function() {
        return this.settings;
        // antes se hacía una copia limpia profunda. No solo el primer nivel
    }        
        
    jwk.ui.JWKComponent.prototype.extend_settings = function(_default, _custom) {        
        var in_depth = {};
        var names = this.extend_in_depth;
        for (var i in names) {
            var name = names[i]
            if (_default[name]) in_depth[name] = _default[name];
        }
        var sett = jwk.extend(_default, _custom);
        for (var name in in_depth) {
            sett[name] = jwk.extend(true, in_depth[name], _custom[name]);
        }        
        return sett;        
    }
    
    function trigger_settings_change (settings, diff, old_value) {
        this.trigger("change:settings", {
            target: this,
            stack: [this],
            path: "settings",
            diff_value: diff,
            value: settings,
            old_value: old_value
        });        
    }  
    
    jwk.ui.JWKComponent.prototype.init_settings = function (settings) {        
        var children = settings.children;
        var container = settings.container;
        if (typeof settings.disabled != "undefined") {
            settings.enabled = !settings.disabled;
        } else if (typeof settings.enabled != "undefined") {
            settings.disabled = !settings.enabled;
        }
        
        delete settings.children;
        delete settings.container;
        this.settings = jwk.extend({}, settings);
        var _settings = merge_with_data(settings, this);
        jwk.extend(this, _settings);
        this.settings = settings;

        function set_class_disabled () {
            $(this.target).addClass("disabled");
        }
        this.on("change:enabled", function(n,e){
            if (!e.value) {
                set_class_disabled.call(this);
                this.on("render", set_class_disabled, this);
            } else {
                $(this.target).removeClass("disabled");
                this.off("render", set_class_disabled, this);
            }
        }, this);
        this.set("enabled", !settings.disabled, {getter: "getset"});
        settings.children = children; 
        settings.container = container;                
        if (this.parent) {
            if (typeof this.parent.child == "function") {
                 this.parent.child(this.name, this);
                 // console.log("this.name: ", this.name, [this, settings], this.parent.get("children").keys());        
            }
        }
        trigger_settings_change.call(this, this.settings, _settings);
    }
  
    
    jwk.ui.JWKComponent.prototype.init_handlers = function () {
        this.listen_data(true);
        this.one("render:first", function (ev_name, ev) {
            ev.component.render.set_features(ev.component);
        });        
    }
    
    jwk.ui.JWKComponent.prototype.init_render = function () {
        console.assert(this.render, "ERROR: not render asigned", this);
        this.render.init_component(this);
    }
    
    jwk.ui.JWKComponent.prototype.init_structure = function () {
        return this.restructure();
    }
    
    jwk.ui.JWKComponent.prototype.update_settings = function (settings) {
        var old_value = this.settings;      
        var new_settings = jwk.extend({}, this.settings, settings);
        this.settings = new_settings;
        
        // set the component the new values
        new_settings = merge_with_data(this.settings);        
        var _container = new_settings.container;
        var _children = new_settings.children;
        delete new_settings.container;
        delete new_settings.children;
        jwk.extend(this, new_settings);
        new_settings.container = _container;
        new_settings.children = _children;
        
        // prepare params for merge_with_data
        settings.data = this.settings.data;
        
        trigger_settings_change.call(this, this.settings, merge_with_data(settings), old_value);
    }
    
    jwk.ui.JWKComponent.prototype.init = function () {
        this.init_tree();
        this.init_handlers();
        this.init_render();
        this.init_structure();
        jwk.ui.trigger("init:component", {component:this});
        this.trigger("init:component", {component:this});
        return this;
    }
    
    jwk.ui.JWKComponent.prototype.listen_data = function (sync) {
        var data = this.data;
        if (typeof data == "undefined") return;
        if (typeof data["on"] == "function" && typeof data["off"] == "function") {
            if (typeof this.datapath == "string") {
                if (sync) {
                    var component = this;
                    data.on("change:"+this.datapath, function (name, event) {
                        component.update(event);
                    }, this);
                } else {
                    data.off(null, null, this);
                }
            }
        } else {
            if (!Array.isArray(data)) {
                console.warn("WARNING: can't listen to data for change events: ", data);            
            }            
        }
        return this;
    }    
    
    jwk.ui.JWKComponent.prototype.my_data = function (value, options) {
        var data = this.data;
        if (typeof value == "undefined") {
            if (typeof this.datapath == "string") {
                if (this.datapath.indexOf("self:") == 0) {
                    var path = this.datapath.substring(5);
                    data = this;
                    if (path.length > 0) {
                        return data.get(path);
                    }
                    return data;
                } else {
                    data = data.get(this.datapath);                    
                }                
            }
            return data;
        } else {
            if (!this.making_changes()) {
                this.change_start();
                if (typeof this.datapath == "string") {
                    if (this.datapath.indexOf("self:") == 0) {
                        var path = this.datapath.substring(5);
                        data = this;
                        if (path.length > 0) {
                            return data.set(path, value);
                        }
                    } else {
                        data.set(this.datapath, value, options);
                    }
                }
                this.change_stop();
            } else {
                console.warn("Estaba haciendo cambios ya?", this);
            }
        }                
    }

    jwk.ui.JWKComponent.prototype.change_start = function () {
        this.flag_on("making_changes");
    }
    jwk.ui.JWKComponent.prototype.change_stop = function () {
        this.flag_off("making_changes");
    }
    jwk.ui.JWKComponent.prototype.making_changes = function () {
        return this.flag("making_changes");
    }

        
    return jwk.ui.JWKComponent;
});
define('jwk-ui/set-jwk/jwk-panel',[
    "jwebkit",
    "../jwk.ui.jwk-component",
], function(jwk, JWKComponent) {
    var TAG_NAME            = 'jwk-panel',
        CLASS_NAME          = 'JWKPanel',
        EXTENDS_CLASS_NAME  = 'JWKComponent',
        PUBLIC_VARIABLES    = 'name', 

        SHADOW_DOM          = '<content></content>';
            
    
    var DEFAULT_SETTINGS    = {
            "disable_selection": true,
            "template": {
                "shadow_dom": SHADOW_DOM,
                "main": "<" + TAG_NAME + "-js>{{>shadow_dom}}</"+ TAG_NAME + "-js>"
            }
        };
    
    jwk.ui.JWKPanel = function (settings) {
        jwk.ui[EXTENDS_CLASS_NAME].call(this, jwk.extend({}, DEFAULT_SETTINGS, settings));
    }    
    
    // ------------------------------------
    jwk.ui[CLASS_NAME].shadowDOM = SHADOW_DOM;
    jwk.ui[CLASS_NAME].variables = PUBLIC_VARIABLES;
    jwk.ui[CLASS_NAME].tagName   = TAG_NAME;
    jwk.ui[CLASS_NAME].settings  = DEFAULT_SETTINGS;
    
    jwk.ui.register_component({
        "ui_type": TAG_NAME,
        "namespace": "jwk-ui",
        "constructor": jwk.ui[CLASS_NAME],
        "extends": jwk.ui[EXTENDS_CLASS_NAME],
        "defaults": DEFAULT_SETTINGS,        
        "attr": PUBLIC_VARIABLES,        
    }); 
    
    
    
});


define('jwk-ui/set-jwk/jwk-button',[
    "jwebkit",
    "./jwk-panel",
], function(jwk, Panel) {
    var TAG_NAME            = 'jwk-button',
        CLASS_NAME          = 'JWKButton',
        EXTENDS_CLASS_NAME  = 'JWKPanel',        
        PUBLIC_VARIABLES    = 'label';
    
    var SHADOW_DOM          = '\
            <template if={{label}}>\
                <span>{{label}}</span>\
            </template>\
            <content></content>';
    
    var DEFAULT_SETTINGS    = {
            "disable_selection": true,
            "template": {
                "shadow_dom": SHADOW_DOM,
                "main": "<" + TAG_NAME + "-js>{{>shadow_dom}}</"+ TAG_NAME + "-js>"
            }
        };
    
    var PUBLIC_API          = {
        "click": function (n,e) {            
            this.trigger(n,e)
        },
        "parent_for": function (name, index) {
            var data = { parent:this, query:".btn_container" };
            if (this.render.resolve_container(data, true)) {
                return data;
            } else {
                return { parent:this };
            }   
        }            
    };
        
    jwk.ui.JWKButton = function (settings) {        
        jwk.ui[EXTENDS_CLASS_NAME].call(this, jwk.extend({}, DEFAULT_SETTINGS, settings));        
    }
        
    // ------------------------------------
    jwk.ui[CLASS_NAME].shadowDOM = SHADOW_DOM;
    jwk.ui[CLASS_NAME].variables = PUBLIC_VARIABLES;
    jwk.ui[CLASS_NAME].tagName   = TAG_NAME;
    jwk.ui[CLASS_NAME].settings  = DEFAULT_SETTINGS;
        
    jwk.ui.register_component({
        "ui_type": TAG_NAME,
        "namespace": "jwk-ui",
        "constructor": jwk.ui[CLASS_NAME],
        "extends": jwk.ui[EXTENDS_CLASS_NAME],
        "defaults": DEFAULT_SETTINGS,        
        "attr": PUBLIC_VARIABLES,
        "api": PUBLIC_API,
    }); 
    
});


define('jwk-ui/set-jwk/jwk-set',[
    "./jwk-panel",    
    "./jwk-button",    
], function() {
    return { name: "set-jwk" };
});
// http://jsfiddle.net/dcE6e/1/
define('jwk-ui/jwk.ui',[
    "jwebkit",
    "./jwk.ui.core",
    "./jwk.ui.component",
    "./jwk.ui.skin",
    "./render/html/jwk.ui.html",
    "./set/jwk.ui.set",
    "./set-jwk/jwk-set",
], function(jwk, ui) {
    // console.log("jwk-ui ------------------------------------------------------------------------------------------------------");
    console.assert(ui, "ui not loaded correctly");
    return ui;
});
// ---------------------------------------------------------------------------------------------------------------------------
//
// -- JWK --

// no se está pudiendo cargar usando requirejs: http://jsfiddle.net/8t4pzxqg/
// Funciona bien cuando se incluye la biblioteca sin usar requirejs: http://jsfiddle.net/8z22w4th/

define('jwebkit.ui',[
    "jwebkit",
    "./jwk-ui/jwk.ui"
], function(jwk){
    console.debug("-- jwebkit.UI --", jwk.ui);
    return jwk.ui;
});


if (window["jwebkit_must_require"]) {
    define("jwebkit",[],function(){ return window.jwk; });
    requirejs("jwebkit.ui");
} else {
    
};
;})(window.requirejs, window.require, window.define);