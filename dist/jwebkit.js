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

};(function (undef) {
;var VERSION = "0.8.0",
    TreeQuery_prototype = [];

function TreeQuery(selector, context) {
    if (selector instanceof TreeQuery) return selector;
    if (arguments.length == 0) {
        if (!(this instanceof TreeQuery)) return new TreeQuery();
        return;
    }
    if (!(this instanceof TreeQuery)) return new TreeQuery(selector, context);
    this.length = 0;
    this._tq_selector = selector;
    this._tq_context  = context || this._tqGetDefaultContext();
    this._tq_strategy = this._tqGetStrategy();
    
    if (Array.isArray(selector)) {        
        for (var i in selector) {
            if (this.indexOf(selector[i]) == -1) this.push(selector[i]);
        }
        return this;
    }
    
    if (this._tq_strategy._tq_accepts(this._tq_selector)) {
        this.push(this._tq_selector);
        console.assert(this.length == 1, this);
        return this;
    }    
    
    if (typeof selector == "string") {
        if (selector=="body") {
            var body = this._tqGetDefaultContext();
            return new TreeQuery(body,body);
        }
        var result = this._tq_strategy._tq_parse(selector);
        if (result instanceof TreeQuery) {
            return result;
        } else {
            return new TreeQuery(this._tq_context, this._tq_context).find(selector);
        }
    }
    
}

TreeQuery.prototype = TreeQuery_prototype;
TreeQuery_prototype.constructor = TreeQuery;
TreeQuery_prototype._tqGetStrategy = function () {
    return TreeQuery.Factory.getStrategy(this._tq_selector, this._tq_context);
}

TreeQuery_prototype.valueOf = function () {
    return this.map(function (n) { return n; });
}

TreeQuery_prototype._tqGetDefaultContext = function () {
    return document.body;
}

TreeQuery_prototype.find = function (selector) {
    this._tq_selector = selector;
    return TreeQuery.Engine.resolve(this);
}

TreeQuery_prototype.children = function () {
    return TreeQuery.Engine.children(this);
}

TreeQuery_prototype.filter = function (selector) {
    this._tq_selector = selector;
    return TreeQuery.Engine.filter(this, selector);
}

TreeQuery._tq_version = VERSION;
TreeQuery._tq         = TreeQuery_prototype;
TreeQuery._tq_types   = {};

TreeQuery._tq_register_api = function (name, api) {
    for (var func in api) {
        if (typeof api[func] == "function") {
            TreeQuery._tq[func] = api[func];
        }
    }    
    
    /*
    var extensions = TreeQuery._tq_apis[name];    
    if (!extensions) extensions = {};
    
    for (var func in api) {
        if (typeof api[func] == "function") {
            extensions[func] = api[func];
        }
    }
    
    TreeQuery._tq_apis[name] = extensions;
    */
}

TreeQuery._tq_register_stratgy = function (name, api) {
    var base = new BaseStrategy();
    for (var func in base) {
        if (typeof base[func] == "function" && !api[func]) {
            api[func] = base[func];
        }
    }
    var strategy = TreeQuery._tq_types[name];    
    if (!strategy) strategy = new Strategy(name);
    
    for (var func in api) {
        if (typeof api[func] == "function") {
            strategy[func] = api[func];
        }
    }
    
    TreeQuery._tq_types[name] = strategy;
    
    for (var name in api) {
        if (typeof api[name] == "function" && !TreeQuery_prototype[name]) {
            
            (function (_name) {                
                TreeQuery_prototype[_name] = function () {
                    // this is TreeQuery                    
                    var args = Array.prototype.map.call(arguments, function (n) { return n; });
                    args.unshift(null);            // agrego un null al comienzo
                    args.push(0);                  // current index
                    args.push(this.length);        // total 
                    for (var i=0; i<this.length; i++) {
                        args[0]=this[i];           // current element
                        args[args.length-2]=i;     // current index
                        var result = this._tq_strategy[_name].apply(this._tq_strategy, args);
                        if (result != this._tq_strategy) {
                            return result;
                        }
                    }
                    
                    return this;
                };
            })(name);
            
        }
    }    
}
;TreeQuery.Filters = function (strategy) {
    this._filters = [];
    this._strategy = strategy;
}

TreeQuery.Filters.prototype = {};
TreeQuery.Filters.prototype.constructor = TreeQuery.Filters
TreeQuery.Filters.prototype.append = function (filter) {
    this._filters.push(filter);
}
TreeQuery.Filters.prototype.check = function (node, strategy) {
    var _strategy = strategy || this._strategy;
    if (!this._filters) console.warn("WARNING: check function not overwritten for this class: ", this);
    for (var i in this._filters) {
        console.assert(typeof this._filters[i].check == "function", this._filters[i]);
        if (!this._filters[i].check(node, _strategy)) return false;
    }
    return this._filters.length > 0;
}

TreeQuery.Filters.TageNameFilter = function (tagname) {
    this._tagname = tagname.toLowerCase();    
}
TreeQuery.Filters.TageNameFilter.prototype = new TreeQuery.Filters();
TreeQuery.Filters.TageNameFilter.prototype.constructor = TreeQuery.Filters.TageNameFilter
TreeQuery.Filters.TageNameFilter.prototype.check = function (node, strategy) {
    return strategy._tq_tag_name(node).toLowerCase() == this._tagname;
}


TreeQuery.Filters.IdFilter = function (id) {
    this._id = id.toLowerCase();    
}
TreeQuery.Filters.IdFilter.prototype = new TreeQuery.Filters();
TreeQuery.Filters.IdFilter.prototype.constructor = TreeQuery.Filters.IdFilter
TreeQuery.Filters.IdFilter.prototype.check = function (node, strategy) {
    var id = strategy._tq_id(node);;
    return typeof id == "string" ? id.toLowerCase() == this._id : false;
}


TreeQuery.Filters.ClassFilter = function (classname) {
    this._classname = classname.toLowerCase(); 
}
TreeQuery.Filters.ClassFilter.prototype = new TreeQuery.Filters();
TreeQuery.Filters.ClassFilter.prototype.constructor = TreeQuery.Filters.ClassFilter
TreeQuery.Filters.ClassFilter.prototype.check = function (node, strategy) {
    var list = strategy._tq_class(node);
    for (var i in list) {
        if (list[i].toLowerCase() == this._classname) return true;
    }
    return false;
}


TreeQuery.Filters.AsterFilter = function () {}
TreeQuery.Filters.AsterFilter.prototype = new TreeQuery.Filters();
TreeQuery.Filters.AsterFilter.prototype.constructor = TreeQuery.Filters.AsterFilter
TreeQuery.Filters.AsterFilter.prototype.check = function () {    
    return true;
}

;

TreeQuery.Engine = {
    parseSelector: function (selector) {
        return [];
    },    
    filter: function ($target) {
        var result = [];
        var filter = TreeQuery.Factory.getFilter($target._tq_selector, $target._tq_strategy);
        var list = $target.map(function (a) { return a; });                
        while (list.length > 0) {
            var obj = list.splice(0,1)[0];
            if ( filter.check(obj) ) {
                result.push(obj);
            }            
        }
        return TreeQuery(result, $target._tq_context);
    },    
    find: function ($target) {
        var result = [];
        var filter = TreeQuery.Factory.getFilter($target._tq_selector, $target._tq_strategy);
        var list = $target.map(function (a) { return a; });                
        while (list.length > 0) {
            var obj = list.splice(0,1)[0];
            var children = $target._tq_strategy._tq_children(obj);
            for (var index in children) {
                list.push(children[index]); // future revision
                if ( filter.check(children[index]) ) {
                    result.push(children[index]);
                }
            }
        }
        return TreeQuery(result, $target._tq_context);
    },
    apply: function ($target, name_func, args, results) {
        // recorre toda la lista de objetos que contiene $target        
    },
    resolve: function ($target) {
        var $ = TreeQuery;
        // console.log("Engine.resolve", arguments);
        console.assert(typeof $target._tq_selector == "string", $target._tq_selector);
        var list, result = [],
            _list_of_comma_parts  = $target._tq_selector.split(","),
            _list_of_spaces_parts = $target._tq_selector.split(" "),
            _selector_has_commas  = _list_of_comma_parts.length > 1,
            _selector_has_spaces  = _list_of_spaces_parts.length > 1;
        
        if (_selector_has_commas) {
            list = _list_of_comma_parts;
            for (var _select in list) {
                var array = 
                result = result.concat($target.find(list[_select]).valueOf());
            }
            return TreeQuery(result, $target._tq_context);
        } else if (_selector_has_spaces) {
            list = _list_of_spaces_parts;
            
            // div div
            // div > div
            function deep_search($t, selector) { return $t.find(selector); }
            function children($t, selector) { return $t.children().filter(selector); }
            var method = deep_search;
            $current = $target;
            for (var _select in list) {
                if (list[_select] == "") continue;
                if (list[_select] == ">") {
                    method = children;
                    continue;
                }
                $current = method($current, list[_select]);
                method = deep_search;
            }
            return $current;
        } else {
            
            return TreeQuery.Engine.find($target);
        }
        return $target;
    },
    children: function ($target) {
        var result = [];
        var list = $target.map(function (a) { return a; });                
        while (list.length > 0) {
            var obj = list.splice(0,1)[0];
            var children = $target._tq_strategy._tq_children(obj);
            result = result.concat(children);
        }
        return TreeQuery(result, $target._tq_context);
    },
    cache: {}
}
;TreeQuery.Factory = {
    getStrategy: function (selector, context) {
        // itera sobre los tipos definidos y a cada uno le pregunta si el contexto corresponde a su tipo.
        if (typeof TreeQuery.Factory.cache[context] != "undefined") return TreeQuery.Factory.cache[context]
        for (var name in TreeQuery._tq_types) {
            var strategy = TreeQuery._tq_types[name];        
            if (strategy._tq_accepts(context, selector)) {
                // TODO: acá tengo un memory leak?
                TreeQuery.Factory.cache[context] = strategy;
                return strategy;
            }
        }        
        return null;
    },
    getFilter: function (selector, strategy) {        
        console.assert(typeof selector == "string", selector);
        console.assert(selector.split(" ").length == 1, selector);
        /*
        var CLASS_SELECTOR = /(\.([\w-\d]+))+/;
        console.log( selector.match(CLASS_SELECTOR)  );
        // console.log( CLASS_SELECTOR.test(selector)  );
        if (selector.match(CLASS_SELECTOR)) {
            
        }
        */
        // ------
        var FUNCTION = /:(\w+)\(/,
            MODIFIER = /:(\w+)/
        ;
        var parts, tagname, id, class_list, modifier, modif_func, aster;
        
        tagname = selector;
        
        if (selector.indexOf(".") != -1) {
            var parts = selector.split(".");
            tagname = parts.splice(0,1)[0];            
            class_list = parts.map(function (n) {
                return n.split("[")[0].split(":")[0];
            });
        }
        
        if (selector == "*") {        
            tagname = "";
            aster = true;
        }
        
        if (selector.indexOf("#") != -1) {
            var parts = selector.split("#");
            tagname = parts[0];            
            id = parts[1].split("[")[0].split(":")[0];
        }
        
        if (selector.indexOf(":") != -1) {
            var parts = selector.split(":");
            modifier = parts[1];            
            id = parts[1].split("[")[0].split(":")[0];
        }
        
        if (FUNCTION.test(selector)) {
            // [":not(", "not"]
            var parts = text.match(FUNCTION);
            modif_func = parts[1];
        } else if (MODIFIER.test(selector)) {
            // [":not(", "not"]
            var parts = text.match(MODIFIER);
            modifier = parts[1];
        }
        
        // console.log(selector, "-->", tagname, id, class_list);
        
        var filter = new TreeQuery.Filters(strategy);
        
        if (aster) {
            filter.append(new TreeQuery.Filters.AsterFilter())
        }
        if (tagname) {
            filter.append(new TreeQuery.Filters.TageNameFilter(tagname))
        }
        if (id) {
            filter.append(new TreeQuery.Filters.IdFilter(id))
        }
        for (var i in class_list) {
            filter.append(new TreeQuery.Filters.ClassFilter(class_list[i]))
        }
        
        return filter;
    },
    cache: {}
};// ----------------------------------------------

var error_text = "ERROR: 'XXX' function must be overwritten";
function BaseStrategy(selector, context) {}

BaseStrategy.prototype = {};
BaseStrategy.prototype.constructor = BaseStrategy;

function Strategy(name) { this._tg_strategy = name; }
Strategy.prototype = new BaseStrategy();
Strategy.prototype.constructor = Strategy;

// -------------------------------

BaseStrategy.prototype._tq_accepts = function (node) {
    // reorna true si el node es del tipo que implementa esta estrategia
    console.error(error_text.replace("XXX", "check"));
    return false;
}

/*
BaseStrategy.prototype.eq = function (index) {
    return this[index];
}
    

BaseStrategy.prototype.is = function (node, selection) {
    console.assert(false, "TreeQuery.BaseStrategy.is NOT IMPLEMENTED YET");
    return $();
}
   
BaseStrategy.prototype.next = function () {
    // https://api.jquery.com/next/
    // Get the immediately following sibling of each element in the set of matched elements. If a selector is provided, it retrieves the next sibling only if it matches that selector.
    console.assert(false, "TreeQuery.BaseStrategy.next NOT IMPLEMENTED YET");
    return false;
}
    */
BaseStrategy.prototype._tq_class = function (node, new_class_value) {
    // if new_class_value is passed then the class of the node is setted.
    // Otherwise returns the current class value of the node
    console.error(error_text.replace("XXX", "_tq_class"));
}

BaseStrategy.prototype._tq_add_class = function (node) {
    console.error(error_text.replace("XXX", "_tq_add_class"));
}

BaseStrategy.prototype._tq_remove_class = function (node) {
    console.error(error_text.replace("XXX", "_tq_remove_class"));
}

BaseStrategy.prototype._tq_has_class = function (node) {
    console.error(error_text.replace("XXX", "_tq_has_class"));
}

BaseStrategy.prototype._tq_map_attr = function (node, new_attrs_value) {
    console.error(error_text.replace("XXX", "_tq_map_attr"));
}

BaseStrategy.prototype._tq_get_attr = function (node, key) {
    console.error(error_text.replace("XXX", "_tq_get_attr"));
}

BaseStrategy.prototype._tq_set_attr = function (node, key, value) {
    console.error(error_text.replace("XXX", "_tq_set_attr"));
}

BaseStrategy.prototype._tq_remove_attr = function (node, key) {
    console.error(error_text.replace("XXX", "_tq_remove_attr"));
}

BaseStrategy.prototype._tq_children = function (node) {
    console.error(error_text.replace("XXX", "_tq_children"));
}

BaseStrategy.prototype._tq_remove = function (node) {
    console.error(error_text.replace("XXX", "_tq_remove"));
}

BaseStrategy.prototype._tq_add_child = function (node) {
    console.error(error_text.replace("XXX", "_tq_add_child"));
}


BaseStrategy.prototype._tq_remove_child = function (node) {
    console.error(error_text.replace("XXX", "_tq_remove_child"));
}

BaseStrategy.prototype._tq_clone = function (node) {
    console.error(error_text.replace("XXX", "_tq_clone"));
}

BaseStrategy.prototype._tq_parent = function (node, current_parent) {
    // if current_parent is passed then the parent is seted to this obj
    // Otherwise returns the current node's parent (if any) 
    console.error(error_text.replace("XXX", "_tq_parent"));
}

BaseStrategy.prototype._tq_tag_name = function (node) {
    // returns the tag name of the node
    console.error(error_text.replace("XXX", "_tq_tag_name"));
}

BaseStrategy.prototype._tq_id = function (node, new_id) {
    // if new_id is passed then the node's id is seted.
    // Otherwise returns the current node's id
    console.error(error_text.replace("XXX", "_tq_id"));
};

// ----------------------------------------------
;TreeQuery._tq_register_stratgy("html-element", {
    _tq_accepts: function (node) {
        // reorna true si el node es del tipo que implementa esta estrategia
        return node instanceof HTMLElement;
    },
    _tq_parse: function (str) {
        try {
            var div = document.createElement('div');
            div.innerHTML = str;
            var children = Array.prototype.map.call(div.childNodes, function (n) { return n; });                
            if (children.length == 1 && children[0] instanceof Text) {
                return null;
            }
            return TreeQuery(children);
        } catch(e) {
            return null;
        }
    },
    _tq_class: function (node, new_class_value) {
        // if new_class_value is passed then the class of the node is setted.
        // Otherwise returns the current class value of the node
        console.assert(this._tq_accepts(node), node);
        if (new_class_value) {
            node.className = new_class_value;
            return this;
        };
        return node.className.split(" ");
    },
    _tq_add_class: function (node, classname) {
        console.assert(this._tq_accepts(node), node);            
        node.className += " " + classname;
        return this;
    },
    _tq_remove_class: function (node, classname) {
        console.assert(this._tq_accepts(node), node);            
        node.className = node.className.replace(new RegExp("(?:^|\\s)" + classname +  "(?!\\S)", "g"), '' );
        return this;
    },
    _tq_has_class: function (node, classname) {
        console.assert(this._tq_accepts(node), node);            
        var reg = new RegExp("(?:^|\\s)" + classname +  "(?!\\S)");
        return !!node.className.match(reg);
    },
    _tq_get_css: function (node, key) {
        return node.style[key]
    },
    _tq_set_css: function (node, key, value) {
        return node.style[key] = value;        
    },
    _tq_get_attr: function (node, key) {
        console.assert(this._tq_accepts(node), node);        
        console.assert(typeof key == "string", arguments);
        return node.getAttribute(key);
    },
    _tq_set_attr: function (node, key, value) {
        console.assert(this._tq_accepts(node), node);        
        console.assert(typeof key == "string", arguments);
        return node.setAttribute(key, value);
    },
    _tq_map_attr: function (node) {
        console.assert(this._tq_accepts(node), node);            
        var result = {};
        Object.defineProperty(result, 'length', {enumerable: false, value: node.attributes.length});            
        for (var i=0; i<node.attributes.length; i++) {
            result[node.attributes[i].nodeName] = node.attributes[i].nodeValue;
        }
        return result;
    },
    _tq_set_map_attr: function (node, new_attrs_value) {
        console.assert(this._tq_accepts(node), node);            
        for (var i=0; i<node.attributes.length; i++) {
            node.removeAttribute(node.attributes[i].nodeValue);
        }
        for (var prop in new_attrs_value) {                    
            node.setAttribute(prop, new_attrs_value[prop]);
        }
        return this;
    },
    _tq_remove_attr: function (node, key) {
        console.assert(this._tq_accepts(node), node);
        node.removeAttribute(key);
        return this;
    },
    _tq_children: function (node) {
        console.assert(this._tq_accepts(node), node);
        var children = [];
        for (var i in node.childNodes) {
            if (this._tq_accepts(node.childNodes[i])) {
                children.push(node.childNodes[i]);
            }
        }
        return children;                    
    },
    _tq_remove: function (node) {
        console.assert(this._tq_accepts(node), node);
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        return this;
    },        
    // ---------------------------------------------------------
    _tq_add_child: function (node, child) {
        console.assert(this._tq_accepts(node), node);
        console.assert(this._tq_accepts(child), child);
        if (this._tq_accepts(child)) {                        
            node.appendChild(child);
        }
        return this;
    },
    _tq_remove_child: function (node, child) {
        console.assert(this._tq_accepts(node), node);
        console.assert(this._tq_accepts(child), child);
        if (this._tq_accepts(child)) {                        
            node.removeChild(child);
        }
        return this;
    },
    _tq_parent: function (node, current_parent) {
        // if current_parent is passed then the parent is seted to this obj
        // Otherwise returns the current node's parent (if any) 
        console.assert(this._tq_accepts(node), node);            
        if (current_parent && this._tq_accepts(current_parent)) {                        
            if (node.parentNode != current_parent) {
                node.parentNode.removeChild(node);
                current_parent.appendChild(node);
                console.assert(node.parentNode == current_parent, node, node.parentNode,current_parent);
            }
            return this;
        }
        return node.parentNode;
    },
    _tq_clone: function (node) {
        console.assert(this._tq_accepts(node), node);
        return node.cloneNode(true);
    },
    // ----------------------------------------------------------
    _tq_tag_name: function (node) {
        // returns the tag name of the node
        console.assert(this._tq_accepts(node), node);
        return node.tagName.toLowerCase();
    },
    _tq_id: function (node, new_id) {
        // if new_id is passed then the node's id is seted.
        // Otherwise returns the current node's id
        return new_id ? this._tq_set_attr(node, "id", new_id) : this._tq_get_attr(node, "id");
    },
    _tq_offset: function (node, new_value) {
        if (new_value) {
            node.style.width= new_value;
            return this;
        }
        return node.offsetWidth();
    },
    _tq_width: function (node, new_value) {
        if (new_value) {
            node.style.width= new_value;
            return this;
        }
        return node.offsetWidth();
    },
    _tq_height: function (node, new_value) {
        if (new_value) {
            node.style.height = new_value;
            return this;
        }
        return node.offsetHeight();
    },
});
;TreeQuery._tq_register_stratgy("js-object", {
    accepts: function (node) {
        // reorna true si el node es del tipo que implementa esta estrategia
        return false;
    },
    _tq_class: function (node, new_class_value) {
        // if new_class_value is passed then the class of the node is setted.
        // Otherwise returns the current class value of the node
    },
    _tq_add_class: function (node, classname) {},
    _tq_remove_class: function (node, classname) {},
    _tq_has_class: function (node, classname) {
        console.assert(this._tq_accepts(node), node);
    },

    _tq_set_attr: function (node) {},
    _tq_map_attr: function (new_attrs_value) {
        // if new_attrs_value is passed then the attribute list of the node is replaced.
        // Otherwise returns the current node's attribute list
    },
    _tq_remove_attr: function (node) {},

    _tq_children: function (node) {
    },
    _tq_remove: function (node) {},
    _tq_add_child: function (node) {},
    _tq_remove_child: function (node) {},
    _tq_parent: function (node, current_parent) {
        // if current_parent is passed then the parent is seted to this obj
        // Otherwise returns the current node's parent (if any) 
    },
    _tq_tag_name: function (node) {
        // returns the tag name of the node
    },
    _tq_id: function (node, new_id) {
        // if new_id is passed then the node's id is seted.
        // Otherwise returns the current node's id
    },
});;TreeQuery._tq_register_api("jquery-dom-manage", {
    each: function (callback) {
        var do_break = null;
        for (var i=0; i<this.length; i++) {
            do_break = callback.call(this[i], this[i], i, this);
            if (do_break) break;
        }
        return this;
    },
    offset: function () {
        return {
            top: this[0].offsetTop,
            left: this[0].offsetLeft
        }
    },
    eq: function (index) {
        return this[index];
    },
    is: function (selection) {
        console.assert(false, "TreeQuery.BaseStrategy.is NOT IMPLEMENTED YET");
        return $();
    },
    next: function () {
        // https://api.jquery.com/next/
        // Get the immediately following sibling of each element in the set of matched elements. If a selector is provided, it retrieves the next sibling only if it matches that selector.
        console.assert(false, "TreeQuery.BaseStrategy.next NOT IMPLEMENTED YET");
        return false;
    },
    class: function (new_class_value) {
        return this._tq_strategy._tq_class(this[0], new_class_value);
    },
    addClass: function (classname) {        
        return this.each(function (element,index,self) {
            self._tq_strategy._tq_add_class(element, classname);
        });
    },
    removeClass: function (classname) {
        return this.each(function (element,index,self) {
            self._tq_strategy._tq_remove_class(element, classname);
        });
    },
    hasClass: function (classname) {
        return this._tq_strategy._tq_has_class(this[0], classname);
    },
    css: function (key, val) {
        if (arguments.length == 1) {
            if (typeof key == "object") {
                for (var i in key) {
                    this.css(i, key[i]);
                }
                return this;            
            }

            if (typeof key == "string") {
                if (this.length == 0) return null;
                return self._tq_strategy._tq_set_css(this[0], key, val);          
            }
        }
        
        if (arguments.length == 2 && typeof key == "string") {
            return this.each(function (element,index,self) {
                self._tq_strategy._tq_set_css(element, key, val);
            });
        }
        
        return this;
    },
    attr: function (key, value) {
        
        if (arguments.length == 1 && typeof key == "string") {
            return this._tq_strategy._tq_get_attr(this[0], key);
        }
        
        if (arguments.length == 2 && typeof key == "string" && (typeof value == "string" || typeof value == "number")) {
            return this.each(function (element,index,self) {
                self._tq_strategy._tq_set_attr(element, key, value);
            });            
        }
        
        if (arguments.length == 2 && typeof key == "string" && typeof value == "function") {
            return this.each(function (element,index,self) {
                var value_func = value.apply(element, [index, key]);
                self._tq_strategy._tq_set_attr(element, key, value_func);
            });            
        }        
        
        if (typeof key == "object") {
            var list = key;
            for (var key_i in list) {
                var value_i = list[key_i];                
                this.each(function (element,index,self) {
                    self._tq_strategy._tq_set_attr(element, key_i, value_i);
                });
            }            
        }
        return this;               
    },
    attributes: function (new_attrs_value) {
        if (arguments.length == 0) {
            return this._tq_strategy._tq_map_attr(this[0]);       
        }        
        return this.each(function (element,index,self) {
            self._tq_strategy._tq_set_map_attr(element, new_attrs_value);
        });
    },
    removeAttr: function (key) {
        return this.each(function (element,index,self) {
            self._tq_strategy._tq_remove_attr(element, key);
        });
    },
    children: function (selector) {
        console.assert(!selector || typeof selector == "string", arguments);
        var $selector = null;
        
        if (selector) {
            $selector = TreeQuery(selector);
        }
        var result = [];
        this.each(function (element, index, self) {
            var children = self._tq_strategy._tq_children(element);
            if ($selector) {
                // Esto se podría optimizar haciendo que el motor tenga una forma de chequear que un objeto concreto cumple con un query
                for (var i=0; i<$selector.length; i++) {
                    for (var j=0; j<children.length; j++) {
                        if ($selector[i] == children[j]) {
                            result.push(children[j]);
                        }
                    }
                }
            } else {
                result = result.concat(children);
            }
        });
        return TreeQuery(result);
    },
    remove: function () {
        return this.each(function (element,index,self) {
            self._tq_strategy._tq_remove(element);
        });
    },
    parent: function (selector) {
        console.assert(!selector || typeof selector == "string", arguments);
        var $selector = null;
        
        if (selector) {
            $selector = TreeQuery(selector);
        }
        var result = [];
        this.each(function (element, index, self) {
            var parent = self._tq_strategy._tq_parent(element);
            if ($selector) {
                // Esto se podría optimizar haciendo que el motor tenga una forma de chequear que un objeto concreto cumple con un query
                for (var i=0; i<$selector.length; i++) {
                    if ($selector[i] == parent) {
                        result.push(parent);
                    }
                }
            } else {
                result.push(parent);
            }
        });
        return TreeQuery(result);
    },
    clone: function () {
        var result = [];
        this.each(function (element, index, self) {
            var minime = self._tq_strategy._tq_clone(element);
            result.pus(minime);
        });
        return TreeQuery(result);        
    },
    append: function (target) {
        return this.each(function (element,index,self) {
            if (self._tq_strategy._tq_accepts(target)) {
                self._tq_strategy._tq_add_child(node, target);
            }
            if (target instanceof TreeQuery) {
                for (var i=0; i<target.length; i++) {                    
                    var elem = target[i];
                    console.assert(self._tq_strategy._tq_accepts(elem), elem);
                    if (!isNaN(index) && index!=self.length-1) {
                        elem = self._tq_strategy._tq_clone(elem);
                    }
                    self._tq_strategy._tq_add_child(element, elem);
                }
            }
            if (typeof target == "string") {
                self.append(TreeQuery(target));
            }
            
        });        
    },
    appendTo: function (content) {
        if (typeof content == "string") {
            content = new TreeQuery(content, this._tqGetDefaultContext());
        }
        
        return this.each(function (element,index,self) {
            if (self._tq_strategy._tq_accepts(content)) {
                self._tq_strategy._tq_add_child(content, element);
            }

            if (content instanceof TreeQuery) {
                for (var i=0; i<content.length; i++) {                    
                    var elem = content[i];
                    console.assert(self._tq_strategy._tq_accepts(elem), elem);
                    if (i==content.length-1) {
                        self._tq_strategy._tq_add_child(elem, element );
                    } else {
                        self._tq_strategy._tq_add_child(elem, self._tq_strategy._tq_clone(element));
                    }
                }                
            }
        });          
        
    },
    // ----------------------------------------------------------
    height: function (new_value) {        
        if (new_value) {
            if (typeof new_value == "number") {
                new_value = new_value + "px";
            } 
            return this.each(function (element,index,self) {
                self._tq_strategy._tq_height(element, new_value);
            });            
        } else {
           return this._tq_strategy._tq_height(element);
        }
    },
    width: function (new_value) {
        if (new_value) {
            if (typeof new_value == "number") {
                new_value = new_value + "px";
            } 
            return this.each(function (element,index,self) {
                self._tq_strategy._tq_width(element, new_value);
            });            
        } else {
           return this._tq_strategy._tq_width(element);
        }
    },
    
});;
    if ( typeof define === "function" && define.amd ) {
        define('treequery',[],function () {return TreeQuery; } );
    } else {
        window.$ = TreeQuery;
        window.TreeQuery = TreeQuery;
    }

})();
/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, window */

/**
 * Utilities for working with Deferred, Promise, and other asynchronous processes.
 */
define('Async',['require','exports','module'],function (require, exports, module) {
    "use strict";
    var jwk = null;    
    exports.setJWK = function (JWK) { jwk = JWK; }
    
    // Further ideas for Async utilities...
    //  - Utilities for blocking UI until a Promise completes?
    //  - A "SuperDeferred" could feature some very useful enhancements:
    //     - API for cancellation (non guaranteed, best attempt)
    //     - Easier way to add a timeout clause (withTimeout() wrapper below is more verbose)
    //     - Encapsulate the task kickoff code so you can start it later, e.g. superDeferred.start()
    //  - Deferred/Promise are unable to do anything akin to a 'finally' block. It'd be nice if we
    //    could harvest exceptions across all steps of an async process and pipe them to a handler,
    //    so that we don't leave UI-blocking overlays up forever, etc. But this is hard: we'd have
    //    wrap every async callback (including low-level native ones that don't use [Super]Deferred)
    //    to catch exceptions, and then understand which Deferred(s) the code *would* have resolved/
    //    rejected had it run to completion.
    

    /**
     * Executes a series of tasks in parallel, returning a "master" Promise that is resolved once
     * all the tasks have resolved. If one or more tasks fail, behavior depends on the failFast
     * flag:
     *   - If true, the master Promise is rejected as soon as the first task fails. The remaining
     *     tasks continue to completion in the background.
     *   - If false, the master Promise is rejected after all tasks have completed.
     *
     * If nothing fails:          (M = master promise; 1-4 = tasks; d = done; F = fail)
     *  M  ------------d
     *  1 >---d        .
     *  2 >------d     .
     *  3 >---------d  .
     *  4 >------------d
     *
     * With failFast = false:
     *  M  ------------F
     *  1 >---d     .  .
     *  2 >------d  .  .
     *  3 >---------F  .
     *  4 >------------d
     *
     * With failFast = true: -- equivalent to jwk.when()
     *  M  ---------F
     *  1 >---d     .
     *  2 >------d  .
     *  3 >---------F
     *  4 >------------d   (#4 continues even though master Promise has failed)
     * (Note: if tasks finish synchronously, the behavior is more like failFast=false because you
     * won't get a chance to respond to the master Promise until after all items have been processed)
     *
     * To perform task-specific work after an individual task completes, attach handlers to each
     * Promise before beginProcessItem() returns it.
     *
     * Note: don't use this if individual tasks (or their done/fail handlers) could ever show a user-
     * visible dialog: because they run in parallel, you could show multiple dialogs atop each other.
     *
     * @param {!Array.<*>} items
     * @param {!function(*, number):Promise} beginProcessItem
     * @param {!boolean} failFast
     * @return {jwk.Promise}
     */
    function doInParallel(items, beginProcessItem, failFast) {
        var promises = [];
        var masterDeferred = new jwk.Deferred();
        
        if (items.length === 0) {
            masterDeferred.resolve();
            
        } else {
            var numCompleted = 0;
            var hasFailed = false;
            
            items.forEach(function (item, i) {
                var itemPromise = beginProcessItem(item, i);
                promises.push(itemPromise);
                
                itemPromise.fail(function () {
                    if (failFast) {
                        masterDeferred.reject();
                    } else {
                        hasFailed = true;
                    }
                });
                itemPromise.always(function () {
                    numCompleted++;
                    if (numCompleted === items.length) {
                        if (hasFailed) {
                            masterDeferred.reject();
                        } else {
                            masterDeferred.resolve();
                        }
                    }
                });
            });
            
        }
        
        return masterDeferred.promise();
    }
    
    /**
     * Executes a series of tasks in serial (task N does not begin until task N-1 has completed).
     * Returns a "master" Promise that is resolved once all the tasks have resolved. If one or more
     * tasks fail, behavior depends on the failAndStopFast flag:
     *   - If true, the master Promise is rejected as soon as the first task fails. The remaining
     *     tasks are never started (the serial sequence is stopped).
     *   - If false, the master Promise is rejected after all tasks have completed.
     *
     * If nothing fails:
     *  M  ------------d
     *  1 >---d        .
     *  2     >--d     .
     *  3        >--d  .
     *  4           >--d
     *
     * With failAndStopFast = false:
     *  M  ------------F
     *  1 >---d     .  .
     *  2     >--d  .  .
     *  3        >--F  .
     *  4           >--d
     *
     * With failAndStopFast = true:
     *  M  ---------F
     *  1 >---d     .
     *  2     >--d  .
     *  3        >--F
     *  4          (#4 never runs)
     *
     * To perform task-specific work after an individual task completes, attach handlers to each
     * Promise before beginProcessItem() returns it.
     * 
     * @param {!Array.<*>} items
     * @param {!function(*, number):Promise} beginProcessItem
     * @param {!boolean} failAndStopFast
     * @return {jwk.Promise}
     */
    function doSequentially(items, beginProcessItem, failAndStopFast) {

        var masterDeferred = new jwk.Deferred(),
            hasFailed = false;
        
        function doItem(i) {
            if (i >= items.length) {
                if (hasFailed) {
                    masterDeferred.reject();
                } else {
                    masterDeferred.resolve();
                }
                return;
            }
            
            var itemPromise = beginProcessItem(items[i], i);
            
            itemPromise.done(function () {
                doItem(i + 1);
            });
            itemPromise.fail(function () {
                if (failAndStopFast) {
                    masterDeferred.reject();
                    // note: we do NOT process any further items in this case
                } else {
                    hasFailed = true;
                    doItem(i + 1);
                }
            });
        }
        
        doItem(0);
        
        return masterDeferred.promise();
    }
    
    /**
     * Executes a series of synchronous tasks sequentially spread over time-slices less than maxBlockingTime.
     * Processing yields by idleTime between time-slices.
     * 
     * @param {!Array.<*>} items
     * @param {!function(*, number)} fnProcessItem  Function that synchronously processes one item
     * @param {number=} maxBlockingTime
     * @param {number=} idleTime
     * @return {jwk.Promise}
     */
    function doSequentiallyInBackground(items, fnProcessItem, maxBlockingTime, idleTime) {
        
        maxBlockingTime = maxBlockingTime || 15;
        idleTime = idleTime || 30;
        
        var sliceStartTime = (new Date()).getTime();
        
        return doSequentially(items, function (item, i) {
            var result = new jwk.Deferred();
            
            // process the next item
            fnProcessItem(item, i);
            
            // if we've exhausted our maxBlockingTime
            if ((new Date()).getTime() - sliceStartTime >= maxBlockingTime) {
                //yield
                window.setTimeout(function () {
                    sliceStartTime = (new Date()).getTime();
                    result.resolve();
                }, idleTime);
            } else {
                //continue processing
                result.resolve();
            }

            return result;
        }, false);
    }
    
    
    /**
     * Executes a series of tasks in parallel, saving up error info from any that fail along the way.
     * Returns a Promise that is only resolved/rejected once all tasks are complete. This is
     * essentially a wrapper around doInParallel(..., false).
     *
     * If one or more tasks failed, the entire "master" promise is rejected at the end - with one
     * argument: an array objects, one per failed task. Each error object contains:
     *  - item -- the entry in items whose task failed
     *  - error -- the first argument passed to the fail() handler when the task failed
     *
     * @param {!Array.<*>} items
     * @param {!function(*, number):Promise} beginProcessItem
     * @return {jwk.Promise}
     */
    function doInParallel_aggregateErrors(items, beginProcessItem) {
        var errors = [];
        
        var masterDeferred = new jwk.Deferred();
        
        var parallelResult = doInParallel(
            items,
            function (item, i) {
                var itemResult = beginProcessItem(item, i);
                itemResult.fail(function (error) {
                    errors.push({ item: item, error: error });
                });
                return itemResult;
            },
            false
        );
        
        parallelResult
            .done(function () {
                masterDeferred.resolve();
            })
            .fail(function () {
                masterDeferred.reject(errors);
            });
        
        return masterDeferred.promise();
    }
        
    /** Value passed to fail() handlers that have been triggered due to withTimeout()'s timeout */
    var ERROR_TIMEOUT = {};
    
    /**
     * Adds timeout-driven termination to a Promise: returns a new Promise that is resolved/rejected when
     * the given original Promise is resolved/rejected, OR is resolved/rejected after the given delay -
     * whichever happens first.
     * 
     * If the original Promise is resolved/rejected first, done()/fail() handlers receive arguments
     * piped from the original Promise. If the timeout occurs first instead, then resolve() or
     * fail() (with Async.ERROR_TIMEOUT) is called based on value of resolveTimeout.
     * 
     * @param {jwk.Promise} promise
     * @param {number} timeout
     * @param {boolean=} resolveTimeout If true, then resolve deferred on timeout, otherwise reject. Default is false.
     * @return {jwk.Promise}
     */
    function withTimeout(promise, timeout, resolveTimeout) {
        var wrapper = new jwk.Deferred();
        
        var timer = window.setTimeout(function () {
            if (resolveTimeout) {
                wrapper.resolve();
            } else {
                wrapper.reject(ERROR_TIMEOUT);
            }
        }, timeout);
        promise.always(function () {
            window.clearTimeout(timer);
        });
        
        // If the wrapper was already rejected due to timeout, the Promise's calls to resolve/reject
        // won't do anything
        promise.then(wrapper.resolve, wrapper.reject);
        
        return wrapper.promise();
    }
    
    /**
     * Allows waiting for all the promises to be either resolved or rejected.
     * Unlike jwk.when(), it does not call .fail() or .always() handlers on first
     * reject. The caller should take all the precaution to make sure all the
     * promises passed to this function are completed to avoid blocking.
     * 
     * If failOnReject is set to true, promise returned by the function will be
     * rejected if at least one of the promises was rejected. The default value
     * is false, which will cause the call to this function to be always
     * successfully resolved.
     * 
     * If timeout is specified, the promise will be rejected on timeout as per
     * Async.withTimeout.
     * 
     * @param {!Array.<jwk.Promise>} promises Array of promises to wait for
     * @param {boolean=} failOnReject       Whether to reject or not if one of the promises has been rejected.
     * @param {number=} timeout             Number of milliseconds to wait until rejecting the promise
     * 
     * @return {jwk.Promise} A Promise which will be resolved once all dependent promises are resolved. 
     *                     It is resolved with an array of results from the successfully resolved dependent promises.
     *                     The resulting array may not be in the same order or contain as many items as there were 
     *                     promises to wait on and it will contain 'undefined' entries for those promises that resolve
     *                     without a result.
     * 
     */
    function waitForAll(promises, failOnReject, timeout) {
        var masterDeferred = new jwk.Deferred(),
            results = [],
            count = 0,
            sawRejects = false;
        
        if (!promises || promises.length === 0) {
            masterDeferred.resolve();
            return masterDeferred.promise();
        }
        
        // set defaults if needed
        failOnReject = (failOnReject === undefined) ? false : true;
        
        if (timeout !== undefined) {
            withTimeout(masterDeferred, timeout);
        }
        
        promises.forEach(function (promise) {
            promise
                .fail(function (err) {
                    sawRejects = true;
                })
                .done(function (result) {
                    results.push(result);
                })
                .always(function () {
                    count++;
                    if (count === promises.length) {
                        if (failOnReject && sawRejects) {
                            masterDeferred.reject();
                        } else {
                            masterDeferred.resolve(results);
                        }
                    }
                });
        });
        
        return masterDeferred.promise();
    }
    
    /**
     * Chains a series of synchronous and asynchronous (jQuery promise-returning) functions 
     * together, using the result of each successive function as the argument(s) to the next. 
     * A promise is returned that resolves with the result of the final call if all calls 
     * resolve or return normally. Otherwise, if any of the functions reject or throw, the 
     * computation is halted immediately and the promise is rejected with this halting error.
     * 
     * @param {Array.<function(*)>} functions Functions to be chained
     * @param {?Array} args Arguments to call the first function with
     * @return {jQuery.Promise} A promise that resolves with the result of the final call, or
     *      rejects with the first error.
     */
    function chain(functions, args) {
        var deferred = jwk.Deferred();
        
        function chainHelper(index, args) {
            if (functions.length === index) {
                deferred.resolveWith(null, args);
            } else {
                var nextFunction = functions[index++];
                try {
                    var responseOrPromise = nextFunction.apply(null, args);
                    if (responseOrPromise.hasOwnProperty("done") &&
                            responseOrPromise.hasOwnProperty("fail")) {
                        responseOrPromise.done(function () {
                            chainHelper(index, arguments);
                        });
                        responseOrPromise.fail(function () {
                            deferred.rejectWith(null, arguments);
                        });
                    } else {
                        chainHelper(index, [responseOrPromise]);
                    }
                } catch (e) {
                    deferred.reject(e);
                }
            }
        }
        
        chainHelper(0, args || []);
        
        return deferred.promise();
    }
    
    /**
     * Utility for converting a method that takes (error, callback) to one that returns a promise;
     * useful for using FileSystem methods (or other Node-style API methods) in a promise-oriented
     * workflow. For example, instead of
     *
     *      var deferred = new jwk.Deferred();
     *      file.read(function (err, contents) {
     *          if (err) {
     *              deferred.reject(err);
     *          } else {
     *              // ...process the contents...
     *              deferred.resolve();
     *          }
     *      }
     *      return deferred.promise();
     *
     * you can just do
     *
     *      return Async.promisify(file, "read").then(function (contents) {
     *          // ...process the contents...
     *      });
     *
     * The object/method are passed as an object/string pair so that we can
     * properly call the method without the caller having to deal with "bind" all the time.
     *
     * @param {Object} obj The object to call the method on.
     * @param {string} method The name of the method. The method should expect the errback
     *      as its last parameter.
     * @param {...Object} varargs The arguments you would have normally passed to the method
     *      (excluding the errback itself).
     * @return {jwk.Promise} A promise that is resolved with the arguments that were passed to the
     *      errback (not including the err argument) if err is null, or rejected with the err if
     *      non-null.
     */
    function promisify(obj, method) {
        var result = new jwk.Deferred(),
            args = Array.prototype.slice.call(arguments, 2);
        args.push(function (err) {
            if (err) {
                result.reject(err);
            } else {
                result.resolve.apply(result, Array.prototype.slice.call(arguments, 1));
            }
        });
        obj[method].apply(obj, args);
        return result.promise();
    }

    /**
     * Creates a queue of async operations that will be executed sequentially. Operations can be added to the
     * queue at any time. If the queue is empty and nothing is currently executing when an operation is added, 
     * it will execute immediately. Otherwise, it will execute when the last operation currently in the queue 
     * has finished.
     * @constructor
     */
    function PromiseQueue() {
        this._queue = [];
    }
    
    /**
     * @private
     * @type {Array.<function(): jwk.Promise>}
     * The queue of operations to execute sequentially. Note that even if this array is empty, there might
     * still be an operation we need to wait on; that operation's promise is stored in _curPromise.
     */
    PromiseQueue.prototype._queue = null;
    
    /**
     * @private
     * @type {jwk.Promise}
     * The promise we're currently waiting on, or null if there's nothing currently executing.
     */
    PromiseQueue.prototype._curPromise = null;
    
    /**
     * @type {number} The number of queued promises.
     */
    Object.defineProperties(PromiseQueue.prototype, {
        "length": {
            get: function () { return this._queue.length; },
            set: function () { throw new Error("Cannot set length"); }
        }
    });
    
    /**
     * Adds an operation to the queue. If nothing is currently executing, it will execute immediately (and
     * the next operation added to the queue will wait for it to complete). Otherwise, it will wait until
     * the last operation in the queue (or the currently executing operation if nothing is in the queue) is
     * finished. The operation must return a promise that will be resolved or rejected when it's finished;
     * the queue will continue with the next operation regardless of whether the current operation's promise
     * is resolved or rejected.
     * @param {function(): jwk.Promise} op The operation to add to the queue.
     */
    PromiseQueue.prototype.add = function (op) {
        this._queue.push(op);

        // If something is currently executing, then _doNext() will get called when it's done. If nothing
        // is executing (in which case the queue should have been empty), we need to call _doNext() to kickstart
        // the queue.
        if (!this._curPromise) {
            this._doNext();
        }
    };
    
    /**
     * Removes all pending promises from the queue.
     */
    PromiseQueue.prototype.removeAll = function () {
        this._queue = [];
    };
    
    /**
     * @private
     * Pulls the next operation off the queue and executes it.
     */
    PromiseQueue.prototype._doNext = function () {
        var self = this;
        if (this._queue.length) {
            var op = this._queue.shift();
            this._curPromise = op();
            this._curPromise.always(function () {
                self._curPromise = null;
                self._doNext();
            });
        }
    };
    
    // Define public API
    exports.doInParallel   = doInParallel;
    exports.doSequentially = doSequentially;
    exports.doSequentiallyInBackground   = doSequentiallyInBackground;
    exports.doInParallel_aggregateErrors = doInParallel_aggregateErrors;
    exports.withTimeout    = withTimeout;
    exports.waitForAll     = waitForAll;
    exports.ERROR_TIMEOUT  = ERROR_TIMEOUT;
    exports.chain          = chain;
    exports.promisify      = promisify;
    exports.PromiseQueue   = PromiseQueue;
});

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
 
var Base64 = {
 
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = Base64._utf8_encode(input);
 
		while (i < input.length) {
 
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
 
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
		}
 
		return output;
	},
 
	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		output = Base64._utf8_decode(output);
 
		return output;
 
	},
 
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	},
 
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
 
		}
 
		return string;
	}
 
}

if (typeof define == "function") {
    define ('base64',[], function () {    
        return Base64;
    });     
}
;
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(s,p){var m={},l=m.lib={},n=function(){},r=l.Base={extend:function(b){n.prototype=this;var h=new n;b&&h.mixIn(b);h.hasOwnProperty("init")||(h.init=function(){h.$super.init.apply(this,arguments)});h.init.prototype=h;h.$super=this;return h},create:function(){var b=this.extend();b.init.apply(b,arguments);return b},init:function(){},mixIn:function(b){for(var h in b)b.hasOwnProperty(h)&&(this[h]=b[h]);b.hasOwnProperty("toString")&&(this.toString=b.toString)},clone:function(){return this.init.prototype.extend(this)}},
q=l.WordArray=r.extend({init:function(b,h){b=this.words=b||[];this.sigBytes=h!=p?h:4*b.length},toString:function(b){return(b||t).stringify(this)},concat:function(b){var h=this.words,a=b.words,j=this.sigBytes;b=b.sigBytes;this.clamp();if(j%4)for(var g=0;g<b;g++)h[j+g>>>2]|=(a[g>>>2]>>>24-8*(g%4)&255)<<24-8*((j+g)%4);else if(65535<a.length)for(g=0;g<b;g+=4)h[j+g>>>2]=a[g>>>2];else h.push.apply(h,a);this.sigBytes+=b;return this},clamp:function(){var b=this.words,h=this.sigBytes;b[h>>>2]&=4294967295<<
32-8*(h%4);b.length=s.ceil(h/4)},clone:function(){var b=r.clone.call(this);b.words=this.words.slice(0);return b},random:function(b){for(var h=[],a=0;a<b;a+=4)h.push(4294967296*s.random()|0);return new q.init(h,b)}}),v=m.enc={},t=v.Hex={stringify:function(b){var a=b.words;b=b.sigBytes;for(var g=[],j=0;j<b;j++){var k=a[j>>>2]>>>24-8*(j%4)&255;g.push((k>>>4).toString(16));g.push((k&15).toString(16))}return g.join("")},parse:function(b){for(var a=b.length,g=[],j=0;j<a;j+=2)g[j>>>3]|=parseInt(b.substr(j,
2),16)<<24-4*(j%8);return new q.init(g,a/2)}},a=v.Latin1={stringify:function(b){var a=b.words;b=b.sigBytes;for(var g=[],j=0;j<b;j++)g.push(String.fromCharCode(a[j>>>2]>>>24-8*(j%4)&255));return g.join("")},parse:function(b){for(var a=b.length,g=[],j=0;j<a;j++)g[j>>>2]|=(b.charCodeAt(j)&255)<<24-8*(j%4);return new q.init(g,a)}},u=v.Utf8={stringify:function(b){try{return decodeURIComponent(escape(a.stringify(b)))}catch(g){throw Error("Malformed UTF-8 data");}},parse:function(b){return a.parse(unescape(encodeURIComponent(b)))}},
g=l.BufferedBlockAlgorithm=r.extend({reset:function(){this._data=new q.init;this._nDataBytes=0},_append:function(b){"string"==typeof b&&(b=u.parse(b));this._data.concat(b);this._nDataBytes+=b.sigBytes},_process:function(b){var a=this._data,g=a.words,j=a.sigBytes,k=this.blockSize,m=j/(4*k),m=b?s.ceil(m):s.max((m|0)-this._minBufferSize,0);b=m*k;j=s.min(4*b,j);if(b){for(var l=0;l<b;l+=k)this._doProcessBlock(g,l);l=g.splice(0,b);a.sigBytes-=j}return new q.init(l,j)},clone:function(){var b=r.clone.call(this);
b._data=this._data.clone();return b},_minBufferSize:0});l.Hasher=g.extend({cfg:r.extend(),init:function(b){this.cfg=this.cfg.extend(b);this.reset()},reset:function(){g.reset.call(this);this._doReset()},update:function(b){this._append(b);this._process();return this},finalize:function(b){b&&this._append(b);return this._doFinalize()},blockSize:16,_createHelper:function(b){return function(a,g){return(new b.init(g)).finalize(a)}},_createHmacHelper:function(b){return function(a,g){return(new k.HMAC.init(b,
g)).finalize(a)}}});var k=m.algo={};return m}(Math);
(function(s){function p(a,k,b,h,l,j,m){a=a+(k&b|~k&h)+l+m;return(a<<j|a>>>32-j)+k}function m(a,k,b,h,l,j,m){a=a+(k&h|b&~h)+l+m;return(a<<j|a>>>32-j)+k}function l(a,k,b,h,l,j,m){a=a+(k^b^h)+l+m;return(a<<j|a>>>32-j)+k}function n(a,k,b,h,l,j,m){a=a+(b^(k|~h))+l+m;return(a<<j|a>>>32-j)+k}for(var r=CryptoJS,q=r.lib,v=q.WordArray,t=q.Hasher,q=r.algo,a=[],u=0;64>u;u++)a[u]=4294967296*s.abs(s.sin(u+1))|0;q=q.MD5=t.extend({_doReset:function(){this._hash=new v.init([1732584193,4023233417,2562383102,271733878])},
_doProcessBlock:function(g,k){for(var b=0;16>b;b++){var h=k+b,w=g[h];g[h]=(w<<8|w>>>24)&16711935|(w<<24|w>>>8)&4278255360}var b=this._hash.words,h=g[k+0],w=g[k+1],j=g[k+2],q=g[k+3],r=g[k+4],s=g[k+5],t=g[k+6],u=g[k+7],v=g[k+8],x=g[k+9],y=g[k+10],z=g[k+11],A=g[k+12],B=g[k+13],C=g[k+14],D=g[k+15],c=b[0],d=b[1],e=b[2],f=b[3],c=p(c,d,e,f,h,7,a[0]),f=p(f,c,d,e,w,12,a[1]),e=p(e,f,c,d,j,17,a[2]),d=p(d,e,f,c,q,22,a[3]),c=p(c,d,e,f,r,7,a[4]),f=p(f,c,d,e,s,12,a[5]),e=p(e,f,c,d,t,17,a[6]),d=p(d,e,f,c,u,22,a[7]),
c=p(c,d,e,f,v,7,a[8]),f=p(f,c,d,e,x,12,a[9]),e=p(e,f,c,d,y,17,a[10]),d=p(d,e,f,c,z,22,a[11]),c=p(c,d,e,f,A,7,a[12]),f=p(f,c,d,e,B,12,a[13]),e=p(e,f,c,d,C,17,a[14]),d=p(d,e,f,c,D,22,a[15]),c=m(c,d,e,f,w,5,a[16]),f=m(f,c,d,e,t,9,a[17]),e=m(e,f,c,d,z,14,a[18]),d=m(d,e,f,c,h,20,a[19]),c=m(c,d,e,f,s,5,a[20]),f=m(f,c,d,e,y,9,a[21]),e=m(e,f,c,d,D,14,a[22]),d=m(d,e,f,c,r,20,a[23]),c=m(c,d,e,f,x,5,a[24]),f=m(f,c,d,e,C,9,a[25]),e=m(e,f,c,d,q,14,a[26]),d=m(d,e,f,c,v,20,a[27]),c=m(c,d,e,f,B,5,a[28]),f=m(f,c,
d,e,j,9,a[29]),e=m(e,f,c,d,u,14,a[30]),d=m(d,e,f,c,A,20,a[31]),c=l(c,d,e,f,s,4,a[32]),f=l(f,c,d,e,v,11,a[33]),e=l(e,f,c,d,z,16,a[34]),d=l(d,e,f,c,C,23,a[35]),c=l(c,d,e,f,w,4,a[36]),f=l(f,c,d,e,r,11,a[37]),e=l(e,f,c,d,u,16,a[38]),d=l(d,e,f,c,y,23,a[39]),c=l(c,d,e,f,B,4,a[40]),f=l(f,c,d,e,h,11,a[41]),e=l(e,f,c,d,q,16,a[42]),d=l(d,e,f,c,t,23,a[43]),c=l(c,d,e,f,x,4,a[44]),f=l(f,c,d,e,A,11,a[45]),e=l(e,f,c,d,D,16,a[46]),d=l(d,e,f,c,j,23,a[47]),c=n(c,d,e,f,h,6,a[48]),f=n(f,c,d,e,u,10,a[49]),e=n(e,f,c,d,
C,15,a[50]),d=n(d,e,f,c,s,21,a[51]),c=n(c,d,e,f,A,6,a[52]),f=n(f,c,d,e,q,10,a[53]),e=n(e,f,c,d,y,15,a[54]),d=n(d,e,f,c,w,21,a[55]),c=n(c,d,e,f,v,6,a[56]),f=n(f,c,d,e,D,10,a[57]),e=n(e,f,c,d,t,15,a[58]),d=n(d,e,f,c,B,21,a[59]),c=n(c,d,e,f,r,6,a[60]),f=n(f,c,d,e,z,10,a[61]),e=n(e,f,c,d,j,15,a[62]),d=n(d,e,f,c,x,21,a[63]);b[0]=b[0]+c|0;b[1]=b[1]+d|0;b[2]=b[2]+e|0;b[3]=b[3]+f|0},_doFinalize:function(){var a=this._data,k=a.words,b=8*this._nDataBytes,h=8*a.sigBytes;k[h>>>5]|=128<<24-h%32;var l=s.floor(b/
4294967296);k[(h+64>>>9<<4)+15]=(l<<8|l>>>24)&16711935|(l<<24|l>>>8)&4278255360;k[(h+64>>>9<<4)+14]=(b<<8|b>>>24)&16711935|(b<<24|b>>>8)&4278255360;a.sigBytes=4*(k.length+1);this._process();a=this._hash;k=a.words;for(b=0;4>b;b++)h=k[b],k[b]=(h<<8|h>>>24)&16711935|(h<<24|h>>>8)&4278255360;return a},clone:function(){var a=t.clone.call(this);a._hash=this._hash.clone();return a}});r.MD5=t._createHelper(q);r.HmacMD5=t._createHmacHelper(q)})(Math);

define("md5", function(){});

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(e,m){var p={},j=p.lib={},l=function(){},f=j.Base={extend:function(a){l.prototype=this;var c=new l;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
n=j.WordArray=f.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=m?c:4*a.length},toString:function(a){return(a||h).stringify(this)},concat:function(a){var c=this.words,q=a.words,d=this.sigBytes;a=a.sigBytes;this.clamp();if(d%4)for(var b=0;b<a;b++)c[d+b>>>2]|=(q[b>>>2]>>>24-8*(b%4)&255)<<24-8*((d+b)%4);else if(65535<q.length)for(b=0;b<a;b+=4)c[d+b>>>2]=q[b>>>2];else c.push.apply(c,q);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
32-8*(c%4);a.length=e.ceil(c/4)},clone:function(){var a=f.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],b=0;b<a;b+=4)c.push(4294967296*e.random()|0);return new n.init(c,a)}}),b=p.enc={},h=b.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],d=0;d<a;d++){var f=c[d>>>2]>>>24-8*(d%4)&255;b.push((f>>>4).toString(16));b.push((f&15).toString(16))}return b.join("")},parse:function(a){for(var c=a.length,b=[],d=0;d<c;d+=2)b[d>>>3]|=parseInt(a.substr(d,
2),16)<<24-4*(d%8);return new n.init(b,c/2)}},g=b.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],d=0;d<a;d++)b.push(String.fromCharCode(c[d>>>2]>>>24-8*(d%4)&255));return b.join("")},parse:function(a){for(var c=a.length,b=[],d=0;d<c;d++)b[d>>>2]|=(a.charCodeAt(d)&255)<<24-8*(d%4);return new n.init(b,c)}},r=b.Utf8={stringify:function(a){try{return decodeURIComponent(escape(g.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return g.parse(unescape(encodeURIComponent(a)))}},
k=j.BufferedBlockAlgorithm=f.extend({reset:function(){this._data=new n.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=r.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,b=c.words,d=c.sigBytes,f=this.blockSize,h=d/(4*f),h=a?e.ceil(h):e.max((h|0)-this._minBufferSize,0);a=h*f;d=e.min(4*a,d);if(a){for(var g=0;g<a;g+=f)this._doProcessBlock(b,g);g=b.splice(0,a);c.sigBytes-=d}return new n.init(g,d)},clone:function(){var a=f.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});j.Hasher=k.extend({cfg:f.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){k.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,b){return(new a.init(b)).finalize(c)}},_createHmacHelper:function(a){return function(b,f){return(new s.HMAC.init(a,
f)).finalize(b)}}});var s=p.algo={};return p}(Math);
(function(){var e=CryptoJS,m=e.lib,p=m.WordArray,j=m.Hasher,l=[],m=e.algo.SHA1=j.extend({_doReset:function(){this._hash=new p.init([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(f,n){for(var b=this._hash.words,h=b[0],g=b[1],e=b[2],k=b[3],j=b[4],a=0;80>a;a++){if(16>a)l[a]=f[n+a]|0;else{var c=l[a-3]^l[a-8]^l[a-14]^l[a-16];l[a]=c<<1|c>>>31}c=(h<<5|h>>>27)+j+l[a];c=20>a?c+((g&e|~g&k)+1518500249):40>a?c+((g^e^k)+1859775393):60>a?c+((g&e|g&k|e&k)-1894007588):c+((g^e^
k)-899497514);j=k;k=e;e=g<<30|g>>>2;g=h;h=c}b[0]=b[0]+h|0;b[1]=b[1]+g|0;b[2]=b[2]+e|0;b[3]=b[3]+k|0;b[4]=b[4]+j|0},_doFinalize:function(){var f=this._data,e=f.words,b=8*this._nDataBytes,h=8*f.sigBytes;e[h>>>5]|=128<<24-h%32;e[(h+64>>>9<<4)+14]=Math.floor(b/4294967296);e[(h+64>>>9<<4)+15]=b;f.sigBytes=4*e.length;this._process();return this._hash},clone:function(){var e=j.clone.call(this);e._hash=this._hash.clone();return e}});e.SHA1=j._createHelper(m);e.HmacSHA1=j._createHmacHelper(m)})();

define("sha1", function(){});

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(h,s){var f={},t=f.lib={},g=function(){},j=t.Base={extend:function(a){g.prototype=this;var c=new g;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
q=t.WordArray=j.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=s?c:4*a.length},toString:function(a){return(a||u).stringify(this)},concat:function(a){var c=this.words,d=a.words,b=this.sigBytes;a=a.sigBytes;this.clamp();if(b%4)for(var e=0;e<a;e++)c[b+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((b+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)c[b+e>>>2]=d[e>>>2];else c.push.apply(c,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
32-8*(c%4);a.length=h.ceil(c/4)},clone:function(){var a=j.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],d=0;d<a;d+=4)c.push(4294967296*h.random()|0);return new q.init(c,a)}}),v=f.enc={},u=v.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++){var e=c[b>>>2]>>>24-8*(b%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b+=2)d[b>>>3]|=parseInt(a.substr(b,
2),16)<<24-4*(b%8);return new q.init(d,c/2)}},k=v.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++)d.push(String.fromCharCode(c[b>>>2]>>>24-8*(b%4)&255));return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b++)d[b>>>2]|=(a.charCodeAt(b)&255)<<24-8*(b%4);return new q.init(d,c)}},l=v.Utf8={stringify:function(a){try{return decodeURIComponent(escape(k.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return k.parse(unescape(encodeURIComponent(a)))}},
x=t.BufferedBlockAlgorithm=j.extend({reset:function(){this._data=new q.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=l.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,d=c.words,b=c.sigBytes,e=this.blockSize,f=b/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;b=h.min(4*a,b);if(a){for(var m=0;m<a;m+=e)this._doProcessBlock(d,m);m=d.splice(0,a);c.sigBytes-=b}return new q.init(m,b)},clone:function(){var a=j.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});t.Hasher=x.extend({cfg:j.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){x.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,d){return(new a.init(d)).finalize(c)}},_createHmacHelper:function(a){return function(c,d){return(new w.HMAC.init(a,
d)).finalize(c)}}});var w=f.algo={};return f}(Math);
(function(h){for(var s=CryptoJS,f=s.lib,t=f.WordArray,g=f.Hasher,f=s.algo,j=[],q=[],v=function(a){return 4294967296*(a-(a|0))|0},u=2,k=0;64>k;){var l;a:{l=u;for(var x=h.sqrt(l),w=2;w<=x;w++)if(!(l%w)){l=!1;break a}l=!0}l&&(8>k&&(j[k]=v(h.pow(u,0.5))),q[k]=v(h.pow(u,1/3)),k++);u++}var a=[],f=f.SHA256=g.extend({_doReset:function(){this._hash=new t.init(j.slice(0))},_doProcessBlock:function(c,d){for(var b=this._hash.words,e=b[0],f=b[1],m=b[2],h=b[3],p=b[4],j=b[5],k=b[6],l=b[7],n=0;64>n;n++){if(16>n)a[n]=
c[d+n]|0;else{var r=a[n-15],g=a[n-2];a[n]=((r<<25|r>>>7)^(r<<14|r>>>18)^r>>>3)+a[n-7]+((g<<15|g>>>17)^(g<<13|g>>>19)^g>>>10)+a[n-16]}r=l+((p<<26|p>>>6)^(p<<21|p>>>11)^(p<<7|p>>>25))+(p&j^~p&k)+q[n]+a[n];g=((e<<30|e>>>2)^(e<<19|e>>>13)^(e<<10|e>>>22))+(e&f^e&m^f&m);l=k;k=j;j=p;p=h+r|0;h=m;m=f;f=e;e=r+g|0}b[0]=b[0]+e|0;b[1]=b[1]+f|0;b[2]=b[2]+m|0;b[3]=b[3]+h|0;b[4]=b[4]+p|0;b[5]=b[5]+j|0;b[6]=b[6]+k|0;b[7]=b[7]+l|0},_doFinalize:function(){var a=this._data,d=a.words,b=8*this._nDataBytes,e=8*a.sigBytes;
d[e>>>5]|=128<<24-e%32;d[(e+64>>>9<<4)+14]=h.floor(b/4294967296);d[(e+64>>>9<<4)+15]=b;a.sigBytes=4*d.length;this._process();return this._hash},clone:function(){var a=g.clone.call(this);a._hash=this._hash.clone();return a}});s.SHA256=g._createHelper(f);s.HmacSHA256=g._createHmacHelper(f)})(Math);

define("sha256", function(){});

define("jwk-base/jwk.core", [
    /*
    "inner_jquery", 
    /*/
    "treequery",
    //*/
    //"less", 
    "Async",
    "base64",
    "md5", // crypto-js
    "sha1", // crypto-js
    "sha256", // crypto-js
], function(treequery, /*less,*/ Async, base64, crypto) {
    
    var warn_obsolete = true;
    // console.log("jwk.core", arguments);
    
    // Array.isArray PollyFill
    if (!Array.isArray) {
        Array.isArray = function (vArg) {
            return Object.prototype.toString.call(vArg) === "[object Array]";
        };
    }    
    
    var jwk_current_id_ = 0;
    var Fn = Function, g = (new Fn("return this"))();            
    function JWK () {
        this.nextId = function () {
            return jwk_current_id_++;
        }
        this.uniqueId = function () {
            return (new Date()).getTime() +"-"+Math.round(Math.random()*1000);
        }
        this.unique_id = function () {
            if (warn_obsolete) console.warn("jwk.unique_id OBSOLETE");
            return this.uniqueId();
        }
        
    }
    var jwk = g.jwk || new JWK();
    
    jwk.treequery = treequery;
    // jwk.thirdparty = {jquery:query};
    // jwk.thirdparty.less = less;
    // jwk.thirdparty.mustache = Mustache;
    
    Async.setJWK(jwk);
    jwk.doInParallel = Async.doInParallel;
    jwk.doSequentially = Async.doSequentially;
    /*
    jwk.doSequentiallyInBackground = Async.doSequentiallyInBackground;
    jwk.doInParallel_aggregateErrors = Async.doInParallel_aggregateErrors;
    jwk.withTimeout = Async.withTimeout;
    jwk.waitForAll = Async.waitForAll;
    jwk.chain = Async.chain;
    jwk.promisify = Async.promisify;
    */
    

    
    
    var native_trim = String.prototype.trim;
    jwk.trim = native_trim && !native_trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				native_trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		}
    
    jwk.merge = function( first, second ) {
		var l = second.length,
			i = first.length,
			j = 0;

		if ( typeof l === "number" ) {
			for ( ; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}

		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	}
    
    jwk.makeArray = function( arr, results ) {
		var type,
			ret = results || [];

		if ( arr != null ) {
			// The window, strings (and functions) also have 'length'
			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
			type = jwk.type( arr );

			if ( arr.length == null || type === "string" || type === "function" || type === "regexp" || jwk.isWindow( arr ) ) {
				Array.prototype.push.call( ret, arr );
			} else {
				jwk.merge( ret, arr );
			}
		}

		return ret;
	}
    jwk.each = function( callback, args ) {
        return (function( obj, callback, args ) {
            var name,
                i = 0,
                length = obj.length,
                isObj = length === undefined || jQuery.isFunction( obj );

            if ( args ) {
                if ( isObj ) {
                    for ( name in obj ) {
                        if ( callback.apply( obj[ name ], args ) === false ) {
                            break;
                        }
                    }
                } else {
                    for ( ; i < length; ) {
                        if ( callback.apply( obj[ i++ ], args ) === false ) {
                            break;
                        }
                    }
                }

            // A special, fast, case for the most common use of each
            } else {
                if ( isObj ) {
                    for ( name in obj ) {
                        if ( callback.call( obj[ name ], name, obj[ name ] ) === false ) {
                            break;
                        }
                    }
                } else {
                    for ( ; i < length; ) {
                        if ( callback.call( obj[ i ], i, obj[ i++ ] ) === false ) {
                            break;
                        }
                    }
                }
            }
            return obj;
        })( this, callback, args );		
	}
    
    jwk.atob = function (data) {
        return base64.decode(data);
    }
    
    jwk.btoa = function (data) {
        return base64.encode(data);
    }

    jwk.encodeB64 = function (data) {
        return this.btoa(data);
    }
    
    jwk.decodeB64 = function (data) {
        return this.atob(data);
    }
    
    jwk.md5 = function (data) {
        return CryptoJS.MD5(data).toString(CryptoJS.enc.Hex);
    }
    
    jwk.sha1 = function (data) {
        return CryptoJS.SHA1(data).toString(CryptoJS.enc.Hex);
    }
    
    jwk.sha2 = function (data) {
        return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
    }
    
    jwk.is_basic_value = function(value)  {
        if (warn_obsolete) console.warn("jwk.is_basic_value OBSOLETE");
        return jwk.isBasicValue.apply(jwk, arguments);
    }
    jwk.isBasicValue = function(value)  {
        var basic = {
            "boolean":true,
            "number":true,
            "string":true,
            "undefined": true
        }
        if ((typeof value) in basic) return true;
        if (value === null) return true;
        return false;
    }
    jwk.isBV = jwk.isBasicValue;
    
    jwk.is_pure_map_object = function () {
        if (warn_obsolete) console.warn("jwk.is_pure_map_object OBSOLETE");
        return jwk.isPureMapObject.apply(jwk, arguments);
    }
    jwk.isPureMapObject = function(obj) {
        if (jwk.isBasicValue(obj)) return false;
        if (typeof obj == "function") return false;
        if (jwk.isWindow(obj)) return false;
        for (var i in obj) {
            if (typeof obj[i] == "function") return false; // Object has functions. So is not a pure json object 
        }
        if (obj instanceof jwk.Mapping) return false; // Object is a jwk.Mapping already
        if (Array.isArray(obj)) return false; // array
        return true;
    }
    jwk.isPMO = jwk.isPureMapObject;
    
    
    jwk.getCookie = function(cname) {
        // http://www.w3schools.com/js/js_cookies.asp
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
        }
        return "";
    }

    jwk.setCookie = function(cname, cvalue, exdays) {
        // http://www.w3schools.com/js/js_cookies.asp
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    }   
    
    jwk.extend = function (in_depth) {        
        var target = arguments[0];
        var start_from = 1;
        if (in_depth === true) { target = arguments[1]; start_from = 2; }
        for (var i=start_from; i<arguments.length; i++) {
            var obj = arguments[i];
            for (var prop in obj) {
                if (prop.indexOf(".") > -1) {
                    var parts = prop.split(".");
                    var current = target;
                    var val = obj[prop];
                    for (var j in parts) {
                        var next = current[parts[j]];
                        if (!next && j < parts.length-1) {
                            next = current[parts[j]] = {};
                        }
                        if (j == parts.length-1) {
                            current[parts[j]] = val;
                        }
                        current = next;
                    }
                } else {
                    if (in_depth === true) {
                        if (jwk.isBV(obj[prop])) {
                            target[prop] = obj[prop];
                        } else if (jwk.isPMO(obj[prop])) {
                            target[prop] = jwk.extend(true, {}, target[prop], obj[prop]);
                        } else {                            
                            // leave the objet as it is
                            target[prop] = obj[prop];
                        }
                    } else {
                        target[prop] = obj[prop];
                    }                    
                }                
            }
        }
        return target;
    }
    
    jwk._mutex = {};
    jwk.mutex = function (name) {        
        if (!this._mutex[name]) this._mutex[name] = jwk.Deferred().resolve();    
        var mutex = jwk.Deferred();
        var def = jwk.Deferred();
        (function(_mutex, _def){
            jwk._mutex[name].always(function () {
                _def.resolve(_mutex);
            });
        })(mutex, def);
        this._mutex[name] = mutex.promise();
        return def.promise();
    }
    
    jwk.htmlEntityDecode = function(str) {
        // http://www.webdeveloper.com/forum/showthread.php?136026-RESOLVED-convert-HTML-Entities-into-normal-characters
        // Firefox (and IE if the string contains no elements surrounded by angle brackets )
        try {
            var ta=document.createElement("textarea");
            ta.innerHTML=str;
            return ta.value;
        } catch(e){};
        // Internet Explorer
        try {
            var d=document.createElement("div");
            d.innerHTML=str.replace(/</g,"&lt;").replace(/>/g,"&gt;");
            if(typeof d.innerText!="undefined") return d.innerText; // Sadly this strips tags as well
        } catch(e){}
    }    
    
    
    jwk.isWindow = function (value) {
        if (!value) return false;
        if (typeof value.postMessage != "function") return false;
        if (typeof value.close != "function") return false;
        if (typeof value.blur != "function") return false;
        if (typeof value.focus != "function") return false;
        if (typeof value.parent != "object") return false;
        try {
            // is not exaustive
            if (value.setTimeout != null && typeof value.setTimeout != "function") { return false; }
            if (value.onload != null && typeof value.onload != "function") { return false; }
            if (value.oncontextmenu != null && typeof value.oncontextmenu != "function") { return false; }
            if (value.onblur != null && typeof value.onblur != "function") { return false; }
            if (value.ondblclick != null && typeof value.ondblclick != "function") { return false; }
        } catch (err) { return true; }
        return true;
    }
    
    jwk.is_window = function(value) {
        console.error("jwk.is_window OBSOLETE");
        return jwk.isWindow.apply(jwk, arguments);        
        // TODO: IS WINDOW: http://jsfiddle.net/uV36N/
        if (value) return typeof value.postMessage == "function";
        return false;
    }
    
    jwk.inArray = function( elem, arr, i ) {
		return arr ? -1 : indexOf.call( arr, elem, i );
	}
    
    
    // Populate the class2type map
    // (this was taken from jquery)
    var class2type = {};
    var list = "Boolean Number String Function Array Date RegExp Object Error".split(" ");
    for (var i=0; i<list.length; i++) {
        var name = list[i];
        class2type[ "[object " + name + "]" ] = name.toLowerCase();
    }
    jwk.type = function (obj) {
		if ( obj == null ) {
			return obj + "";
		}
        if (typeof obj != "object") return typeof obj;        
        if (typeof obj === "object") {
            var _key = toString.call(obj);
            console.log(_key);
            var _ret = class2type[ _key ];
            //console.log(_ret);
            for (var i in class2type) {
                //console.log(i, class2type[i]);
            }
            return _ret || "object";
        } else {
            return typeof obj;
        }        
    }
    
    jwk.isFunction = function (v) {
        return (typeof v == "function");
    }
    
    // http://stackoverflow.com/questions/5916900/detect-version-of-browser?answertab=votes#tab-top
    navigator.sayswho= (function(){
        var ua= navigator.userAgent, tem, 
        M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
        if(/trident/i.test(M[1])){
            tem=  /\brv[ :]+(\d+(\.\d+)?)/g.exec(ua) || [];
            return 'IE '+(tem[1] || '');
        }
        M= M[2]? [M[1], M[2]]:[navigator.appName, navigator.appVersion, '-?'];
        if((tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
        return M.join(' ');
    })();
    // --------------------------------------------------------------------------------------------
    
    jwk.whichBrowser = function(){
        return navigator.sayswho().toLocaleLowerCase();
    }
    
    jwk.which_browser = function(){
        if (warn_obsolete) console.warn("jwk.which_browser OBSOLETE");
        return jwk.whichBrowser.apply(jwk, arguments);        
    }
    
    jwk.popup_window = function(url, title, w, h) {
        if (warn_obsolete) console.warn("jwk.popup_window OBSOLETE");
        return jwk.popupWindow.apply(jwk, arguments);        
    }
    
    jwk.popupWindow = function(url, title, w, h) {
    // http://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
        var left = (screen.width/2)-(w/2);
        var top = (screen.height/2)-(h/2);
        return window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+top+', left='+left);
    }
    
    jwk.urlParam = function(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
    }    
    
    jwk.url_param = function(name) {
        if (warn_obsolete) console.warn("jwk.url_param OBSOLETE");
        return jwk.urlParam.apply(jwk, arguments);        
    }    
    
    
    // this is for debugging purposes ----
    jwk.serializing = [];
    var level = 0;
    var object = null;
    function parar(value) {
        var str = "";
        for (var i=0;i<level; i++) {
            str = " " + str;
        }
        
        if (level > 30) {
            console.error("ERROR: you serialize object too big", [jwk.serializing]);
            throw {message: "too big serializing object exception"};
        } 

        if (level > 10) {
            console.warn("WARNING: " + str + "serializing object too big", [jwk.serializing]);
        } 
         
    }
    // --------------------------
    
    jwk.isArray = function (value)  {        
        return Array.isArray(value) || value.toString() == "[object Arguments]";
    }

    jwk.serialize = function (value) {            
        var result = value;
        if (jwk.serializing.indexOf(value) != -1) { return; }
        parar(value);

        switch (typeof value) {
            case "object":
                level++;
                jwk.serializing.push(value);
                if (value == null) {
                    result = null;
                    break;
                }
                if (jwk.isWindow(value)) {
                    result = value.toString();
                    break;
                }
                
                if (jwk.Node.prototype.valueOf == value.valueOf) {
                    result = value.valueOf();
                } else if (typeof value.serialize == "function") {
                    result = value.serialize();
                } else {
                    if (jwk.isArray(value)) {
                        var result = [];
                        for (var i=0; i<value.length; i++) {
                            if (typeof value[i] == "function") continue;
                            var entry = jwk.serialize(value[i]);
                            result.push(entry);                            
                        }
                    } else {
                        result = {};
                        for (var prop in value) {
                            if (typeof value[prop] == "function") continue;
                            var entry = jwk.serialize(value[prop]);
                            result[prop] = entry;
                        }
                    }
                }
                var index = jwk.serializing.indexOf(value);
                if (index != -1) jwk.serializing.splice(index, 1);
                level--;
                break;
            case "function":
                result = undefined;            
                break;
        }
        return result;
    }    
    
    return jwk;
});


define("jwk-base/jwk.callbacks", [
	"jwk-base/jwk.core"
], function( jwk ) {
    
// String to Object options format cache
var optionsCache = {};
var rnotwhite = /\S+/g;

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
    var list = options.match( rnotwhite ) || []
    for (var i=0; i<list.length; i++) {
        object[ list[i] ] = true;
    }    
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
jwk.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jwk.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false &&
					options.stopOnFalse ) {

					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						//jQuery.each( args, function( _, arg ) {
                        for (var i=0; i<args.length; i++) {
                            var arg = args[i];
                            
							var type = jwk.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
                        }
						//});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					// jQuery.each( arguments, function( _, arg ) {
                    for (var i=0; i<arguments.length; i++) {
                        var arg = arguments[i];
                        
						var index;
						while ( ( index = jwk.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
                    }
					// });
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jwk.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( list && ( !fired || stack ) ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
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
    
    self.__list = list;
	return self;
};

return jwk;
});

define("jwk-base/jwk.deferred", [
	"jwk-base/jwk.core",
    "jwk-base/jwk.callbacks",
], function( jwk ) {
    
    jwk.Deferred = function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jwk.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jwk.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jwk.Callbacks("memory") ]
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
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jwk.Deferred(function( newDefer ) {
						for (var _i=0; _i<tuples.length; _i++) {
                            (function (tuple, i){
                                var fn = jwk.isFunction( fns[ i ] ) && fns[ i ];
                                // deferred[ done | fail | progress ] for forwarding actions to newDefer
                                deferred[ tuple[1] ](function() {
                                    var returned = fn && fn.apply( this, arguments );
                                    if ( returned && jwk.isFunction( returned.promise ) ) {
                                        returned.promise()
                                            .done( newDefer.resolve )
                                            .fail( newDefer.reject )
                                            .progress( newDefer.notify );
                                    } else {
                                        newDefer[ tuple[ 0 ] + "With" ](
                                            this === promise ? newDefer.promise() : this,
                                            fn ? [ returned ] : arguments
                                        );
                                    }
                                });
                            })(tuples[_i], _i);
                        };
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jwk.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		// jQuery.each( tuples, function( i, tuple ) {
        for (var _i=0; _i<tuples.length; _i++) {
            (function (tuple, i){
                var tuple = tuples[i];

                var list = tuple[ 2 ],
                    stateString = tuple[ 3 ];

                // promise[ done | fail | progress ] = list.add
                promise[ tuple[1] ] = list.add;

                // Handle state
                if ( stateString ) {
                    list.add(function() {
                        // state = [ resolved | rejected ]
                        state = stateString;

                    // [ reject_list | resolve_list ].disable; progress_list.lock
                    }, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
                }

                // deferred[ resolve | reject | notify ]
                deferred[ tuple[0] ] = function() {
                    deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
                    return this;
                };
                deferred[ tuple[0] + "With" ] = list.fireWith;
            })(tuples[_i], _i);
		}

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	};
    
    
    
    jwk.when = function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
            slice = Array.prototype.slice,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 ||
				( subordinate && jwk.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred.
			// If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jwk.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// Add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jwk.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// If we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}

});
// jwk.query ------------------------------------------------------

define("jwk-base/jwk.query", [
    "jwk-base/jwk.core"
], function(jwk) {
    
    // treequery --
    jwk.query = jwk.treequery;
    jwk.html = jwk.query;    
    return jwk.query;
    
    
    
    return 
    var pushStack = jwk.thirdparty ? jwk.thirdparty.jquery.fn.pushStack : null;
    var return_empty = false; 
    if (jwk.thirdparty) jwk.thirdparty.jquery.fn.pushStack = function () {
        return_empty = true;
        return pushStack.apply(this, arguments);
    }
    
    jwk.query = function (selector, context, rootjQuery) {
// console.error("EN USO", arguments.callee.name);  
        if (return_empty && arguments.length == 0) {
            return_empty = false; 
            return new jwk.query();
        }
        if (!(this instanceof jwk.query)) {
            if (arguments.length == 0) {
                return new jwk.query();
            } else {
                return new jwk.query(selector, context, rootjQuery);
            }            
        }
        if (arguments.length == 0) {
            this.length = 0;
            return this; // jwk.query instance
        } else {
            var target = jwk.thirdparty.jquery(selector, context, rootjQuery);
            return target;
        }
    }
    
    
    jwk.query.prototype = jwk.thirdparty.jquery.fn;
    jwk.query.prototype.constructor = jwk.query;
    jwk.query.prototype.jquery = jwk.thirdparty.jquery;
    for (var i in jwk.thirdparty.jquery) {        
        jwk.query[i] = jwk.thirdparty.jquery[i];
    }
    
    
    // ------------------------ esto es provisorio ---------------------
    var ui = {
        which_browser: function() {
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
        },        
        css: function (source) {  
console.error("EN USO", arguments.callee.name);            
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
    }
    
    
    jwk.query.prototype.css_snapshot = function () {
console.error("EN USO", arguments.callee.name);        
        // console.log("jwk.ui.snapshot", source);
        var source = this;
        var css = ui.css(this);
        var shot = { css: css};
        
        this.style();

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
        // delete shot.css;
        return shot;
    }
    
    function getComputedStyle(o) {
        if (document.defaultView && document.defaultView.getComputedStyle) {
            return document.defaultView.getComputedStyle(o, "");
        } else if (oElm.currentStyle){
            console.error("a ver si esto funciona?");
            // strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){ return p1.toUpperCase(); });
            return o.currentStyle;
        }
    }
        
    document.old_height = document.height;
    document.height = function () {
        // http://stackoverflow.com/questions/1145850/how-to-get-height-of-entire-document-with-javascript
        var body = document.body,
            html = document.documentElement,
            height;        
        if (typeof document.old_height !== 'undefined') {
            height = document.old_height // For webkit browsers
        } else {
            height = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
        }       
        
        return height;
    }
    
    
    // -----------------------------------------------------------------
    
    jwk.query.prototype.style = function (options) {
console.error("EN USO", arguments.callee.name);        
        options = jwk.extend({}, options);
        var computed_style = getComputedStyle(this[0]);

        // Hallamos las diferencias con el estilo que tendría por defecto ese nodo
        // -------------------------------------------------------
        var own_style = [];
        iframe = jwk.thirdparty.jquery("<iframe id='temporal_aux_iframe' style='display:none'>").appendTo("body");
        
        var aux_body = iframe.contents().find("body");
        var aux = jwk.thirdparty.jquery("<" + this[0].nodeName + ">").appendTo(aux_body);        
        var default_style = getComputedStyle(aux[0]);
        for (var i=0; i<default_style.length; i++) {
            var prop = default_style[i];
            if (computed_style[prop] != default_style[prop]) {
                own_style.push(prop);
                own_style[prop] = computed_style[prop];
            }
        }        
        
        jwk.thirdparty.jquery("#temporal_aux_iframe").remove();
        return own_style;
    }
    // -----------------------------------------------------------------
    
    function getStyle(oElm, strCssRule) {
        console.log(arguments);
        var strValue = "";
        if (document.defaultView && document.defaultView.getComputedStyle){
            strValue = document.defaultView.getComputedStyle(oElm, "").getPropertyValue(strCssRule);
        }
        else if (oElm.currentStyle){
            strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){
                return p1.toUpperCase();
            });
            strValue = oElm.currentStyle[strCssRule];
        }
        return strValue;
    }    
    
    jwk.query.prototype.path = function () {
console.error("EN USO", arguments.callee.name);
        // http://stackoverflow.com/questions/2068272/getting-a-jquery-selector-for-an-element
        if (this.length != 1) throw 'Requires one element.';

        var path, node = this;
        while (node.length) {
            var realNode = node[0];
            var name = (

                // IE9 and non-IE
                realNode.localName ||

                // IE <= 8
                realNode.tagName ||
                realNode.nodeName

            );

            // on IE8, nodeName is '#document' at the top level, but we don't need that
            if (!name || name == '#document') break;

            name = name.toLowerCase();
            if (realNode.id) {
                // As soon as an id is found, there's no need to specify more.
                return name + '#' + realNode.id + (path ? ' > ' + path : '');
            } else if (realNode.className) {
                name += '.' + realNode.className.split(/\s+/).join('.');
            }

            var parent = node.parent(), siblings = parent.children(name);
            if (siblings.length > 1) name += ':eq(' + siblings.index(node) + ')';
            path = name + (path ? ' > ' + path : '');

            node = parent;
        }

        return path;
    }    
    
    jwk.query.prototype.id = function (value) {
console.error("EN USO", arguments.callee.name);
        if (arguments.length == 1) {            
            return this.attr("id", value.toString());
        } else {
            return this.attr("id");
        }
    }
    
    jwk.query.prototype.serialize = function () {
        return this.selector;
    }    
    
    
    
    jwk.html = jwk.query;
    
    return jwk.query;

});



define("jwk-base/jwk.ajax", [
	"jwk-base/jwk.core",
	"jwk-base/jwk.deferred"    
], function( jwk ) {
    
});
define("jwk-base/jwk", [
    "jwk-base/jwk.core",
    "jwk-base/jwk.callbacks",
    "jwk-base/jwk.deferred",
    "jwk-base/jwk.query",
    "jwk-base/jwk.ajax"
], function(jwk){
    return jwk;
});
// Test: http://jsfiddle.net/naoxd84h/

// TODO: Hay que crear un modo lazy diferente.
// Este espera a que haya un espacio de tiempo sin llamadas para recién ejecutar.
// Necesito uno que ejecute al toque y que ponga un timer para la próxima ejecusión. Así me aseguro un mínimo de ejecusiones cada N millisec


/*
API:
    one          = function (event, callback, context)
    on           = function (event_name, callback, context, once)
    off          = function (event_name, callback, context)
    trigger_fast = function (event_name)
    trigger      = function (event_name)
    extend       = function (object)

*/
define("jwk-model/jwk.observable", [
    "jwk-base/jwk.core"
], function(jwk) {  

    var default_delay = 25;
    
    jwk.Observable = function () {
        this._listeners = {};
        this._filters   = {}; // this is not fully implemented but already works: target._filters["event-name"] = function (args) { /* modification */ return args; }
    }

    jwk.Observable.extend = function (obj) {
        // console.log(obj.prototype, Object.keys(obj));
        jwk.Observable.apply(obj);
        for (var name in jwk.Observable.prototype) {
            obj[name] = jwk.Observable.prototype[name];
        }
        return obj;
    }

    jwk.Observable.prototype.one = function (event, callback, context, options) {
        return this.on(event, callback, context, jwk.extend({}, options, {once:true}));
        return this.on(event, callback, context, jwk.extend({}, options, {once:true, lazy:false}));
    }
    
    jwk.Observable.prototype.setSilence = function (_s) {
        if (_s) this._silence
        else delete this._silence;
    }
    
    jwk.Observable.prototype.on = function (event_name, callback, _context, _options) {
        // accepts: all, space delimited events, object width event-callback mapping
        var options = _options || {};
        var context = _context || this;
        var once = options.once;
        var lazy = options.lazy;
        var package = options.package;
        
        if (/change:\w+\.\w+/.test(event_name)) {
            // console.warn("SE REGISTRAN A EL EVENTO: ", event_name, arguments);
        }
                
        var multimple = options.multimple;
        if (typeof event_name == "object" ) {
            for (var ev in event_name) {
                // Se asume que event es un mapping de event-callback
                this.on(ev, event_name[ev], context, options);
            }
            return this;
        }
        
        if (event_name == null) return console.error("Error: wrong event type. String expected, got null");        
        if (typeof event_name != "string" ) {
            console.error("Error: wrong event type. String expected, got " + (typeof event_name));
            return this;
        }

        if (event_name.indexOf(" ") >= 0) {
            var events = event_name.split(" ");
            for (var ev=0; ev<events.length; ev++) {
                this.on(events[ev], callback, context, once);
            }
            return this;
        }
        
        console.assert(typeof callback == "function", arguments);
        
        
        if (!multimple) {
            this.off(event_name, callback, context);
        }
        
        
        // this._listeners[event_name] = this._listeners[event_name] || [];
        var event_listeners = listeners_for.call(this, event_name, true);         
        var listener = { callback: callback };
        if (context) listener.context = context;
        if (once) listener.once = once;
        if (package) listener.package = package;
        if (lazy) listener.lazy = {
            delay: typeof lazy == "boolean" ? default_delay : lazy
        };
        // console.log(listener);
        if (event_listeners.processing) {
            event_listeners.added_while_processing = event_listeners.added_while_processing || [];
            event_listeners.added_while_processing.push(listener)
        } else {
            event_listeners.push(listener);
        }
        
        this.trigger("handler:"+event_name, {event:event_name, callback:callback, context:context, once:once});
        return this;
    }
    
    
    jwk.Observable.prototype.off = function (event_name, callback, context) {
        
        var delete_indexes = [];
        for (var e_name in this._listeners) {
            var event_listeners = this._listeners[e_name];
            for (var i=event_listeners.length-1; i>=0; i--) {
                if (!event_name || event_name == e_name) {
                    if (!callback || callback == event_listeners[i].callback ||
                        callback.toString() == event_listeners[i].callback.toString()) {
                        if (!context || context == event_listeners[i].context) {
                            delete_indexes.push({event_name: e_name, index: i});
                            // console.log([this], "off: ", [event_name, callback, context]);
                        }
                    }
                }
            }
        }
        
        for (var i=0; i<delete_indexes.length; i++) {
            var event_name = delete_indexes[i].event_name;
            var index = delete_indexes[i].index;            
            this._listeners[event_name].splice(index, 1);
            if (this._listeners[event_name].length == 0) {
                delete this._listeners[event_name];
            }            
        }
        
        return this;
    }
    
    // --------------------------------------------------------
    var triggers_counter = {length:0};
    function do_trigger (_listener, _args) {
        return (function(listener, args, num){
            // ------ loop control
            
            triggers_counter[num] = args
            triggers_counter.length++;
            var timer = setTimeout(function () { console.error("time out for", num, args); }, 1000);        
            if (triggers_counter.length > 150) {
                console.error([this], arguments);
                error();
            }
            // ------
            // avoid infinit loops between updates            
            if (listener.already_calling) {
                // ------
                clearTimeout(timer);
                delete triggers_counter[num];
                triggers_counter.length--;
                // ------
                return false; 
            }
            listener.already_calling = true;
            if (listener.package) {
                args = Array.prototype.map.call(args, function (n) { return n; });
                args.push(listener.package);
            }
            try {
                listener.callback.apply(listener.context || this, args); // <<<------
            } catch (e) {
                console.error(e.message, e.stack);
            } finally {
                delete listener.already_calling;
            }
            
            // ------
            // console.assert(triggers_counter[num] == args, [triggers_counter, num, args]);
            delete triggers_counter[num];
            triggers_counter.length--;
            clearTimeout(timer);
            // ------
            return true;        
        })(_listener, _args, triggers_counter.length);
    }
    
    
    // Auxiliar private functions -----------------------------
    function pre_trigger (event_listeners, args) {
        var delete_indexes = [];
        event_listeners.processing = true;
        for (var i=0; i<event_listeners.length; i++) {
            var listener = event_listeners[i];
            // avoid calling to a dead component
            if (listener.context && listener.context._destroyed) {
                delete_indexes.push(i);
                continue; 
            }
            
            if (listener.lazy) {                
                (function (_l, _a, _list) {
                    console.assert(_l.lazy && !isNaN(_l.lazy.delay), "ERROR: delay lazy invocation missing");
                    // _l.lazy.last_time = (new Date()).getTime();
                    if (_l.lazy.timer) {
                        clearTimeout(_l.lazy.timer);
                    }
                    _l.lazy.timer = setTimeout(function () {
                        // Array.prototype.push.call(_a, _l.lazy.last_time);
                        // Array.prototype.push.call(_a, (new Date()).getTime() - _l.lazy.last_time);
                        do_trigger(_l, _a);
                        delete _l.lazy.timer;
                        if (_l.once) _list.splice(_list.indexOf(_l),1)
                    }, _l.lazy.delay);
                })(listener, args, event_listeners);
            } else {
                if (!do_trigger(listener, args)) continue; // <<<------
                if (listener.once) { delete_indexes.push(i); }
            }
        }
        
        for (var i=delete_indexes.length-1; i>=0; i--) {
             event_listeners.splice(parseInt(delete_indexes[i]), 1);
        }
        
        delete event_listeners.processing;
        if (Array.isArray(event_listeners.added_while_processing)) {
            for (var i=0; event_listeners.added_while_processing.length; i++) {
                event_listeners.push(event_listeners.added_while_processing[i]);
            }
            delete event_listeners.added_while_processing;
        }
        return this;
    }
    
    function listeners_for (event_name, create) {
        if (create) {
            this._listeners[event_name] = this._listeners[event_name] || [];
        }
        return this._listeners[event_name];
    }    
    // --------------------------------------------------------
    
    

    jwk.Observable.prototype.listeners_for = function (event_name, create) {
        console.error("jwk.Observable.prototype.listeners_for DEPRECATED");
        return listeners_for.call(this, event_name, create);
    }    
    
    jwk.Observable.prototype.trigger_fast = function (event_name) {
        // This function triggers a simple event widthout making verifications        
        var event_listeners = listeners_for.call(this, event_name);
        var all_event_listeners = this._listeners["all"];
        if (this._silence) return this;
        if (!event_listeners && !all_event_listeners) return this;
        if (event_listeners) {
            pre_trigger.apply(this, [event_listeners, arguments]);
            if (event_listeners.length == 0) {
                delete this._listeners[event_name];
            }
        }
        if (all_event_listeners) {
            pre_trigger.apply(this, [all_event_listeners, arguments]);
            if (all_event_listeners.length == 0) {
                delete this._listeners["all"];
            }
        }
        return this;
    }
    
    jwk.Observable.prototype.trigger = function (event_name) {

        if (event_name == null) return console.error("Error: wrong event type. String expected, got null");        
        if (typeof event_name != "string" ) {
            var e = null; 
            try { aaaaa(); } catch (_e) { e=_e; }
            return console.error("Error: wrong event type. String expected, got " + (typeof event), [arguments], e.stack);
        }
        
        var single_ev_to_trigger = [];
        
        if (event_name.indexOf(" ") >= 0) {
            var events = event_name.split(" ");
            for (var ev in events) {
                single_ev_to_trigger.push(events[ev]);
            }
        } else {
            single_ev_to_trigger.push(event_name);
        }
        
        
        for (var i=0; i<single_ev_to_trigger.length; i++) {
            var single_ev = single_ev_to_trigger[i];
            var parts = single_ev.split(":");
            var namespace = parts[0];
            var args = arguments;
                        
            // Trigger complete event name (this includes the "all" event if someone is subscribed)
            args[0] = single_ev;
            this.trigger_fast.apply(this, args);
            
            // Trigger namespace
            if (parts.length > 1) {
                var event_listeners = this._listeners[namespace];
                if (event_listeners) {
                    args = arguments;
                    pre_trigger.apply(this, [event_listeners, args]);
                    if (event_listeners.Length == 0) {
                        delete this._listeners[namespace];
                    }                    
                }
            }
        }
        
        return this;
    }

    return jwk.Observable;

});



/*

Mejoras:
- que un obj solo se suscriba al on "change" de todos sus hijos sólo si él tiene un escucha para "change". Si no, nada.
- los obj deberían crear un getter del tipo que provee el nuevo api de getters y setters. 
  Cosa de que se pueda hacer:
  var otro = obj.coso.lo.otro; // y eso invoca get("coso").get("lo").get("otro")
  la biblioteca debería preguntar por la presencia de ese Api. Si está que la use!
  si no, que se implementen igual el get y el set pero el set siempre escribe en la propiedad del mismo nombre:
  obj.set("culo", 123);
  console.log(obj.culo); // 123
*/


define("jwk-model/jwk.mapping", [
    "jwk-base/jwk.core"
], function(jwk) {  

    var prefix = "__",
        create_prop_func = true,
        splice = Array.prototype.splice,
        map = Array.prototype.map,
        push = Array.prototype.push,        
        indexOf = Array.prototype.indexOf;
    
    function is_basic_value(value)  {
        return jwk.isBV(value);
    }
    
    function is_pure_map_object(obj) {
        return jwk.isPMO(obj);
    }
    
    jwk.Mapping = function (json, skip_check) {
        if (json && !skip_check) {
            if (!is_pure_map_object(json)) return console.error("ERROR: parameter is not a valid map object:", json);
        }
        this._names = [];
        if (json) this.map(json, true);
    }
    
    jwk.Mapping.extend = function (obj) {
        // console.log(obj.prototype, Object.keys(obj));
        jwk.Mapping.apply(obj);
        for (var name in jwk.Mapping.prototype) {
            if (Object.defineProperty) {
                Object.defineProperty(obj, name, {
                    enumerable: false,
                    configurable: true,
                    writable: true,
                    value: target
                });                
            } else {
                obj[name] = jwk.Mapping.prototype[name];
            }
        }
        return obj;
    }  
    
    jwk.Mapping.prototype.isPropDefined = function (_key) {
        return this._names.indexOf(_key) != -1;
    }
    
    jwk.Mapping.prototype.set = function (_key, _value, _options) {
        var self = this;
        var options = _options || {};
        var value = _value;

        // Computed properties
        if (Array.isArray(options.dependencies) && typeof value == "function" ) {
            (function (__key, __value, __self) {
                for (var i=0; i<options.dependencies.length; i++) {
                    __self.on("change:"+options.dependencies[i], function () {
                        this.set(__key, __value.call(this));
                    }, __self);                
                }
                __self.set(__key, __value.call(__self));
            })(_key, _value, self);
            return;
        }
        
        if (options.unset) {
            this._names.splice(this._names.indexOf(_key), 1);
            var old_value = this[prefix + _key];
            delete this[prefix + _key];
            delete this[_key];
            if (typeof this.on_set == "function") {
                this.on_set(_key, _value, old_value); // notify of change
            }             
            return;
        }
        
        if (options.deep) {
            var parts = _key.split(".");
            if (parts.length == 1) return this.set(parts[0], _value);
            var prop = parts[0];
            if (!this.get(prop)) {
                console.assert(typeof this[prefix+prop] == "undefined", prop, this);
                this.set(prop, new this.mapping() );
            } else {
                console.assert(this.get(prop) instanceof jwk.Node, [this, prop, this.get(prop)]);
            }
            parts.shift();
            _options.deep = parts.length > 1;
            this.get(prop).set(parts.join("."), _value, _options);
            return value;
        } else {
            // console.assert(_key.indexOf(".") == -1, _key, _options);
        }

        if (options.parse || options.getter == "child") {
            value = this._value.apply(this, [_value]);
        }
                
        if (!this.hasOwnProperty(prefix + _key)) {
            // setter_function(this, _key, value, options);
            
            Object.defineProperty(this, prefix + _key, {
                enumerable: false,
                configurable: true,
                writable: true,                
            });

            if (options.getter == "child") {
                (function (_target, _name) {
                    _target[_name] = function (id, value, options) {
                        if (arguments.length == 0) return this[prefix+_name];
                        if (arguments.length == 1) return this[prefix+_name][id];
                        if (arguments.length >= 2) return this[prefix+_name].set(id, value, options);                        
                    }                
                })(this, _key);
                this[prefix + _key] = value;
                return this;
            } else {
                Object.defineProperty(this, _key, {
                    enumerable: true,
                    configurable: true,
                    get : function () {
                        return this[prefix + _key];
                    },
                    set : function (_val) {                        
                        if (this[prefix + _key] !== _val) {
                            var old_value = this[prefix + _key];
                            this[prefix + _key] = _val;
                            if (typeof this.on_set == "function") {
                                this.on_set(_key, _val, old_value); // notify of change
                            }                    
                        }
                        return _val;
                    }
                });            
            }            
            this._names.push(_key);
        }
        
        if (options.getter != "child") {
            if (options.force) {
                var old = this[_key];
                this[_key] = value;
                if (options.silence) {
                    this._silence = true;
                    this.on_set(_key, value, old);
                    delete this._silence;
                } else {
                    this.on_set(_key, value, old);
                }
            } else {
                if (options.silence) {
                    this._silence = true;
                    this[_key] = value;
                    delete this._silence;
                } else {
                    this[_key] = value;
                }                
            }            
        }
        return value;
    }

    jwk.Mapping.prototype.indexOf = function (obj) {
        var index = this.values().indexOf(obj);
        if (index == -1 && typeof obj == "string") {
            return this.keys().indexOf(obj);
        }
        return index;
    }

    jwk.Mapping.prototype.get = function (_key, _options) {        
        if (_options && _options.deep) {
            var parts = _key.split(".");
            var prop = parts[0];
            if (typeof this[prefix+prop] == "undefined") return;            
            parts.shift();
            _options.deep = parts.length > 1;
            if (parts.length == 0) {
                return this[prop];
            }
            var inner = this.get(prop);
            if (inner instanceof jwk.Mapping) {
                return inner.get(parts.join("."), _options);
            } else {
                var index = 0;
                while ( !(inner instanceof jwk.Mapping) ) {
                    var attr = parts[index];
                    var value = inner[attr];
                    if (index + 1 == parts.length || typeof value == "undefined") {
                        return value;
                    }
                    inner = value;
                    index++;
                    part = parts[index];
                }
            }
            
        } else {
            return this[_key];
        }        
    }

    jwk.Mapping.prototype.map = function (obj, skip_check) {
        if (obj && !skip_check) if (!is_pure_map_object(obj) && !Array.isArray(obj)) return console.error("ERROR: parameter is not a valid map object:", obj);
        // this alows json to be a pure Array. it showd work too
        for (var prop in obj) {
            var value = obj[prop];
            if (is_pure_map_object(value)) {
                var mapping = new this.mapping();
                mapping.map(value);
                this.set(prop, mapping);
            } else {
                this.set(prop, value);
            }
        }        
    }    

    jwk.Mapping.prototype.each = function (func) {        
        var val;
        var keys = this._names;
        for (var i=0; i<keys.length; i++) {
            var prop = keys[i];            
            val = func(this[prefix+prop], prop, i);
            if (val) return this;
        }
        return this;
    }
    
    jwk.Mapping.prototype.last = function () {        
        return this[prefix+this._names[this._names.length-1]];
    }
    
    jwk.Mapping.prototype.count = function () {        
        return this.keys().length;
    }
    
    jwk.Mapping.prototype.first = function () {        
        return this[prefix+this._names[0]];
    }

    function prepare_path(original_path) {
        if (original_path.indexOf("[") != -1) {
            return original_path.replace(/\[/g,".").replace(/\]/g,"");
        } else {
            return original_path;
        }
    }    
    
    jwk.Mapping.prototype.unset = function (path) {
        this.set(path, undefined, {unset: true});
    }

    function set_value_path(parent, path, value, options) {
        options = options || {};
        var force = options.force, no_parse = options.no_parse;        
        if (path.charAt(0) == "[" && path.charAt(path.length-1) == "]") {
            console.assert(Array.isArray(parent), "ERROR: parent is not an array", parent, path);
            var index = parseInt(path.substring(1, path.length-1));                
            parent[index] = value;
        } else {
            parent.set(path, value, options);
        }
        /*
        if (Array.isArray(parent)) {
            console.assert(path.charAt(0) == "[" && path.charAt(path.length-1) == "]", "Not recognizable index format: " + path, "Must be: [index]");
            var index = parseInt(path.substring(1, path.length-1));                
            parent[index] = value;
        } else {
            parent.set(path, value, options);
        } 
        */
    }
    
    jwk.Mapping.prototype.set_old = function (path, _value, options) {
        if (arguments.length == 1) console.warn("WARING: invoking set with no value. You may wanted to get instead? ", path);
        var value = _value;
        var force = (options === true) || (options && options.force);
        options = (typeof options == "object") ? options : {};
        if (options.force) force = true;
        var no_parse = options.no_parse;
        if (!no_parse && Array.isArray(value)) {
            //no_parse = true; // default no_parse if typeof value is array
        }
        if (arguments.length == 4) {
            console.error("tenés que adaptar el código. en vez de set(id, array, false, true). hacés: set(id, array) por defecto toma esos valores");
            force = arguments[2];
            no_parse = arguments[3];
        }
        
        if (typeof path != "string") {
            console.error("ERROR: expected string but got ", path);
            if (is_pure_map_object(path)) console.warn("SUGGESTION: use Mapping.map instead of Mapping.set width", path);
            return;
        }
        var parts = path.replace(/\.\[/g, "[").replace(/(.)\[/g, "$1.[").split(".");
        var last = parts[parts.length-1];
        if (parts.length == 1) {
            console.assert(last.indexOf("[") != 0, "ERROR: path refers to a indexed value but this is not an array", this, path, last);
            var old_value = this[prefix+parts[0]];
            var index;
            if (old_value != _value || force) {                
                if (!no_parse) {
                    value = this._value.apply(this, [_value]);                    
                }
                if (options.unset) {
                    // Array.prototype.splice.apply(this, [this.indexOf(old_value), 1]) -----------------------------------------------------
                    index = indexOf.call(this._names, parts[0]);
                    if (index != -1) {
                        splice.call(this._names, index, 1);
                    }                    
                    delete this[prefix+parts[0]];
                } else {                    
                    if (index = indexOf.call(this._names, parts[0]) == -1) {
                        push.call(this._names, last);
                        // console.log(last, this._names.indexOf(last), this._names, [this]);
                    }                    
                    this[prefix+parts[0]] = value;
                }
                // Getters -------------------------------------------------------------------
                if (typeof this[parts[0]] == "undefined" && options.getter != "none") {
                    (function(obj, _prop, getter){                        
                        if (typeof getter == "function") {
                            obj[_prop] = getter;
                            return;
                        }
                        obj[_prop] = function (value, options) {                            
                            if (getter == "child") {
                                var val = options;
                                var key = value;
                                if (arguments.length == 0) return this.get(_prop);
                                if (arguments.length > 1) {
                                    this.get(_prop).set(key, val);
                                } else {
                                    return this.get(_prop).get(key);
                                }                                
                            } 
                            if (getter == "getset") {
                                console.assert(this instanceof jwk.Mapping, "ERROR: this is not a jwk.Mapping", this, obj, _prop);
                                if (arguments.length > 0) {
                                    this.set(_prop, value, options);
                                } else {
                                    return this.get(_prop);
                                }                                
                            }
                        }
                        obj[_prop].getter = getter;
                        obj[_prop]._prop = _prop;
                    })(this, parts[0], options.getter || "getset"); // TODO: en algún momento hay que sacar este getter por defecto y va a explorat todo!
                }                
                if (typeof this.on_set == "function") {
                    this.on_set(parts[0], value, old_value); // notify of change
                }
            }
        } else {
            //parts.splice(parts.length-1, 1);
            parts.pop();
            var holder_path = parts.join(".");
            var parent = this.get(holder_path, true, last.indexOf("[") == 0);
            if (jwk.isWindow(parent)) {
                return console.error("ERROR: the path \"" + holder_path + "\" points to a window object. \n"+
                                     "Is not posible to access the full path \""+ path +"\"");
            }            
            if (is_basic_value(parent)) {
                return console.error("ERROR: the path \"" + holder_path + "\" already exist but is a basic value (not an object). \n"+
                                     "Is not posible to access the full path \""+ path +"\"");
            }
            if (!no_parse) {
                value = this._value.apply(this, [value]);
            }
        
            set_value_path(parent, last, value, options);
        }
    }
    
    jwk.Mapping.prototype.has = function (path) {
        var _val = this[prefix+path];
        if (typeof _val != "undefined") return true;
        // if (typeof this.get(path) != "undefined") return true;
        return false;
    }
    
    jwk.Mapping.prototype.get_old = function (path, create_path, last_is_array) {
        // TODO: create_path ´también puede ser un object con settings { create: true, last_is_array: true }
        console.assert(typeof path == "string", "ERROR: path must be a string", arguments);
        var _val = this[prefix+path];
        if (typeof _val != "undefined") return _val;
        var parts;
        try {
            parts = path.replace(/\.\[/g, "[").replace(/(.)\[/g, "$1.[").split(".");
        } catch (e) {
            console.error(e, e.stack);
        }
        
        var requested = this;
        var current;
        var sub_path;
        for (var i=0; i<parts.length; i++) {
            if (is_basic_value(requested)) {
                return console.error("ERROR: the path \"" + sub_path + "\" already exist but is a basic value (not an object). \n"+
                                     "Is not posible to access the full path \""+ path +"\"");
            }
            current = requested;
            sub_path = (sub_path?sub_path+".":"") + parts[i]; // voy armando el path a medida que lo camino
            if (Array.isArray(current)) {
                console.assert(parts[i].charAt(0) == "[" && parts[i].charAt(parts[i].length-1) == "]", "Not recognizable index format: " + parts[i] + " full path: " + path);
                var index = parseInt(parts[i].substring(1, parts[i].length-1));
                requested = current[index];
            } else if (parts[i].indexOf("[") == 0) {
                // The next step in the path is a condition ("[condition]")
                if (typeof current.get == "function") {
                    // We hope current.get() implements a conditional path
                    requested = current.get(parts[i], create_path, last_is_array);
                } else {
                    console.error("ERROR: jwk.Mapping does not handle conditional paths like this: ", sub_path.replace(/\.\[/g,"["), "full paht: ", path);
                }
            } else {
                requested = current[prefix+parts[i]];                
                if (typeof requested == "undefined" && typeof current[parts[i]] != "function") {
                    // quizas sea una propiedad simple
                    requested = current[parts[i]];
                }
            }
            
            if (typeof requested == "undefined") {
                if (create_path) {
                    if (i == parts.length-1) {
                        requested = last_is_array ? this.collection([]) : new this.mapping();
                    } else {
                        var next = parts[i+1];
                        if (next.indexOf("[") == 0) {
                            requested = this.collection([]);
                        } else {
                            requested = new this.mapping();
                        }
                    }
                    set_value_path(current, parts[i], requested);
                } else {
                    return requested;
                }
            }
        }
        return requested;
    }
    
    jwk.Mapping.prototype.search = function (prop, max_results) {
        var node = undefined;
        var nodes = [];
        var parents = [this];
        while (node == undefined && parents.length > 0) {
            var parent = parents.splice(0,1)[0];
            parent.each(function (child, child_name) {                
//            for (var child_name in parent) {
                // if (child_name.indexOf(prefix)!=0) continue;
                // var child = parent[child_name];
                if (typeof child == "object" &&
                    child != null &&
                    !jwk.isWindow(child) &&
                    child.valueOf == jwk.Mapping.prototype.valueOf) {
                        parents.push(child);
                } 
                if (child_name == prop) {
                    node = child;
                    if (typeof max_results == "undefined" || (max_results <= nodes.length && max_results >= 0)) {
                        return true;
                    } else {
                        if (node) nodes.push(node);
                        node = undefined;
                    }
                }
  //          }
            });
            
            
        }
        if (max_results) {
            return nodes;
        } else {
            return node;
        }                
    }
    
    var aaa = 0;    
    jwk.Mapping.prototype.query = function (selection, max_results) {
        console.log("jwk.Mapping.prototype.query", arguments);
        var visited = [];
        var node = undefined;
        var nodes = [];
        var parents = [this];
        var value = selection.substring(selection.indexOf("=")+1, selection.length-1 );
        var prop = selection.substring(selection.indexOf("[")+1, selection.indexOf("="));
        console.log("selection:", selection, [prop, value]);
        while (node == undefined && parents.length > 0) {
            if (aaa++>200) {
                aaaa();
            }            
            var parent = parents.splice(0,1)[0];
            visited.push(parent);
            
            // console.log("parent: ", [parent]);
            parent.each(function (obj, name, index) {
                // console.log("-", arguments);
                if (visited.indexOf(obj) > -1) return;
                if (typeof obj != "string" && typeof obj != "object") return;
                if (name == prop && obj == value) {
                    node = parent;
                    if (typeof max_results == "undefined" || (max_results <= nodes.length && max_results >= 0)) {
                        return true;
                    } else {
                        if (node) nodes.push(node);
                        node = undefined;
                    }
                } else {
                    // console.log(typeof obj == "object", obj != null, !jwk.isWindow(obj), obj.each == "function");
                    if (typeof obj == "object" &&
                        obj != null &&
                        !jwk.isWindow(obj) &&
                        typeof obj.each == "function") {
                            parents.push(obj);
                            // console.log("parents:", parents);
                    }
                }
            });
            
            /*
            for (var child_name in parent) {
                if (child_name.indexOf(prefix)!=0) continue;
                var child = parent[child_name];
                if (visited.indexOf(child) > -1) continue;
                var cname = child_name;
                if (typeof child != "string" && typeof child != "object") continue;
                if (child_name.indexOf(prefix)==0) {
                    cname = child_name.substring(prefix.length, child_name.length);
                }
                // console.log("- cname:", [cname], "child:", [child]);
                if (cname == prop && child == value) {
                    node = parent;
                    if (typeof max_results == "undefined" || (max_results <= nodes.length && max_results >= 0)) {
                        break;
                    } else {
                        if (node) nodes.push(node);
                        node = undefined;
                    }
                } else if (typeof child == "object" &&
                    child != null &&
                    !jwk.isWindow(child) &&
                    child.each == "function") {
                        parents.push(child);                        
                }
            }
            */
        }
        if (max_results) {
            return nodes;
        } else {
            return node;
        }        
    }

    jwk.Mapping.prototype.keys = function (filter) {
        var list = []
        if (typeof filter == "function" ) {
            this.each(function (v, n, i) {
                if (filter(v, n, i)) list.push(v);
            });            
        } else {
            return map.call(this._names, function (v) { return v; } );
        }
        return list;
    }
    
    jwk.Mapping.prototype.values = function (filter) {
        var list = [];
        if (typeof filter == "function" ) {
            this.each(function (v, n, i) {
                if (filter(v, n, i)) list.push(v);
            });            
        } else {
            this.each(function (v) {
                list.push(v);
            });
        }
        // sconsole.log("values", this);
        return list;
    }
    
    var stack = [];
    jwk.Mapping.prototype.json = function () {
        console.warn("DEPRECATED: json() is deprecated. use valueOf() instead");
        return this.valueOf();
    }
    
    jwk.Mapping.prototype.valueOf = function () {
        var json = {};
        for (var prop in this) {
            //if (prop.indexOf(prefix) != 0) continue;
            if (typeof this[prefix+prop] == "undefined") continue;
            var value = this[prefix+prop];
            var index = stack.indexOf(value);
            if (index != -1) {
                // console.log("evitamos un loop", [value, this]);
                continue;                
            }
            stack.push(value);
            function get_value_of(value) {
                if (!is_basic_value(value)) {
                    if (jwk.isWindow(value)) {
                        value = value.toString();
                    } else if (typeof value.valueOf == "function") {
                        value = value.valueOf();
                    } else if (Array.isArray(value)) {
                        var array = [];
                        for (var i=0; i<value.length; i++) {
                            array.push(get_json_value(value[i]));
                        }
                        value = array;
                    }
                }
                return value;
            }            
            json[prop] = get_value_of(value);
            index = stack.indexOf(value);
            console.assert(index == stack.indexOf(value) && index == stack.length-1, index, value, stack)
            stack.pop();
        }        
        return json;
    }
    
    jwk.Mapping.prototype._value = function(value) {
        // if (typeof value == "function") return console.error("ERROR: value must NOT be a function");
        if (typeof value == "function") return value;
        if (typeof value == "object") {
            if (value) {
                if (Array.isArray(value)) {
                    return this.collection(value);
                } else {
                    if (is_pure_map_object(value)) {
                        return new this.mapping(value, true);
                    } else {
                        return value;
                    }
                }                        
            } else {
                return null;
            }
        } else {
            return value;
        }          
    }
        
    // this method should be overwrited for a specific collection implementation
    jwk.Mapping.prototype.collection = function (array) {
        for (var i=0; i<array.length; i++) {
            var entry = array[i];
            if (typeof value != "function") {
                entry = this._value.apply(this, [entry]);
            } 
            array[i] = entry;
        }
        return array;
    }

    // this method should be overwrited for a specific collection implementation
    jwk.Mapping.prototype.mapping = jwk.Mapping;
    
    return jwk.Mapping;
    
});



define("jwk-model/jwk.flagged", [
    "jwk-base/jwk.core"
], function(jwk) {
    console.assert(jwk.Deferred, jwk)
    jwk.Flagged = function () {
        this._flags = { _deferreds: {} }        
    }

    jwk.Flagged.extend = function (obj) {
        jwk.Flagged.apply(obj);
        for (var name in jwk.Flagged.prototype) {
            obj[name] = jwk.Flagged.prototype[name];
        }       
        return obj;
    }
    
    jwk.Flagged.prototype.flag_on = function (_name) {
        var name = _name || "FLAG"
        if (this._flags[name]) return; 
        this._flags[name] = true;
        if (this._flags._deferreds[name]) {
            this._flags._deferreds[name].resolve(this);
            delete this._flags._deferreds[name];
        }
    }
    
    jwk.Flagged.prototype.flag_off = function (name) {        
        delete this._flags[name];
        delete this._flags._deferreds[name];
    }
    
    jwk.Flagged.prototype.flag = function (name) {
        return this._flags[name] === true;
    }
    
    jwk.Flagged.prototype.wait_flag = function (name) {
        if (this._flags[name] === true) {
            return jwk.Deferred().resolve(this);
        }
        var def = this._flags._deferreds[name] || jwk.Deferred();
        this._flags._deferreds[name] = def;            
        return def.promise();
    }

    return jwk.Flagged;
    
});



define("jwk-model/jwk.node", [
    "jwk-base/jwk.core",
    "jwk-model/jwk.mapping", 
    "jwk-model/jwk.observable",
    "jwk-model/jwk.flagged"
], function(jwk, Mapping, Observable, Flagged) {  
    jwk.Node = function () {
        if (!(this instanceof jwk.Node) && arguments.length == 0) return new jwk.Node();
        if (!(this instanceof jwk.Node) && arguments.length > 0) {
            console.error("ERROR: jwk.Node arguments.length > 0, not implemented");
            return jwk.Node();
        }
        // if (!(this instanceof jwk.Node)) return new jwk.Node();
        // HACK:
        if (!jwk.Node.prototype.collection && jwk.Collection) {
            jwk.Node.prototype.collection = jwk.Collection;
        }
        // this._handlers = {};
        jwk.Flagged.apply(this, arguments);
        jwk.Observable.apply(this, arguments);
        jwk.Mapping.apply(this, arguments);
    }
    
    jwk.Node.extend = function (obj) {
        jwk.Node.apply(obj);
        for (var name in jwk.Node.prototype) {
            obj[name] = jwk.Node.prototype[name];
        }
        return obj;
    }    
    
    jwk.Node.prototype = new jwk.Mapping();
    jwk.Node.prototype.constructor = jwk.Node;
    
    // Observable API
    jwk.Node.prototype.one          = jwk.Observable.prototype.one;
    jwk.Node.prototype.on           = jwk.Observable.prototype.on;
    jwk.Node.prototype.off          = jwk.Observable.prototype.off;
    jwk.Node.prototype.trigger      = jwk.Observable.prototype.trigger;
    jwk.Node.prototype.trigger_fast = jwk.Observable.prototype.trigger_fast;
    
    // Flagged API
    jwk.Node.prototype.flag         = jwk.Flagged.prototype.flag;
    jwk.Node.prototype.flag_on      = jwk.Flagged.prototype.flag_on;
    jwk.Node.prototype.flag_off     = jwk.Flagged.prototype.flag_off;
    jwk.Node.prototype.wait_flag    = jwk.Flagged.prototype.wait_flag;
    
    
    jwk.Node.prototype.collection   = null;

    function is_jwk_mapping(obj) {
        if (jwk.isWindow(obj)) return false;
        if (!obj) return false;
        if (obj instanceof jwk.Mapping) return true;
        if (obj.set == jwk.Mapping.prototype.set) return true;
        return false;
    }
        
    jwk.Node.prototype.listeners_for = function (event_name, create) {
        var arr = event_name.match(/([^\[]+)(\[\d\])+/);
        if (!arr) return jwk.Observable.prototype.listeners_for.call(this, event_name, create);
        if (create) {
            console.error("ERROR: No está implementado");
        } else {            
            console.assert(typeof arr[1] == "string" && arr[1].charAt(arr[1].length-1) != "]", arr);
            event_name = arr[1];
            return this._listeners[event_name];
        }        
    }    
    
    jwk.Node.prototype.on_set = function (prop, value, old_value) {

        var event_name = "change:" + prop;
        this.trigger_fast(event_name, {
            event_name: event_name,
            path: prop,
            value: value,
            old_value: old_value,
            target: this,           
        });
        
        this.trigger_fast("change", {
            event_name: event_name,
            path: prop,
            value: value,
            old_value: old_value,
            target: this           
        });        
    }    
    
    jwk.Node.prototype.mapping = jwk.Node;
    
    
    return jwk.Node;
});


// http://jsfiddle.net/rx2eY/2/
// http://jsfiddle.net/4A5a8/10/
// 
// http://jsfiddle.net/9jhFN/4/

// push.apply( this, slice.call(arguments, 0) );

define("jwk-model/jwk.collection", [
    "jwk-base/jwk.core",
    "jwk-model/jwk.node"
], function(jwk, Node) {
    
    var default_options = {
        parse: true
    }
    
    function extend () {
        var target = arguments[0];
        for (var i=1; i<arguments.length; i++) {
            var obj = arguments[i];
            for (var prop in obj) {
                target[prop] = obj[prop];
            }
        }
        return target;
    }

    function is_basic_value(value)  {
        switch (typeof value) {
            case "boolean":
            case "number":
            case "string":
            case "undefined":
                return true;
            case "object":
                if (value == null) return true;
        }
        return false;
    }
    
    function initial_state() {
        var list      = this;
        list.length   = 0;
        list._values  = [];
        list._options = extend({}, list._options || {}, default_options);        
        list._mapping = new jwk.Node();
        list._mapping.on("change", function (event_name, event) {            
            if (list.do_nothing_on_set) return;
            
            // event: { event_name, path, value, old_value, target }
            var parts = event.path.split(".");
            var prop = parts[0];
            var options = {};
            options.merge = true;
            if (list.mapping_change_already_handled) {
                options.at = list._values.indexOf(event.value);
            } else {
                if (parts.length > 1) {
                    
                } else {
                    options.at = list._values.indexOf(event.old_value);
                    if (options.at == -1) {
                        options.merge = false;
                        options.at = list.length;
                    }
                    insert.apply(list, [[event.value], extend({}, list._options, options)]);
                }
                
            }
            // parts[0]="";
            // list.trigger("change:["+options.at+"]"+parts.join("."), event);
            list.trigger("change:"+event.path, event);
        });
        
    }
    
    function is_window(value) {
        // TODO: ver una mejor forma de determinar si el objeto es un
        if (value) return typeof value.postMessage == "function";
        return false;
    }
    
    
    function extract_id(value, id_attribute) {
        var id;
        switch(typeof id_attribute) {
            case "function":
                id = id_attribute(value); break;
            case "string":
                id = value[id_attribute];
                if (!id && typeof value.get == "function") {
                    id = value.get(id_attribute);
                } else if (typeof id == "function") {
                    id = value[id_attribute]();
                }
                break;
        }
        return id;
    }
    
    
    function insert(values, options) {
        values = Array.isArray(values) ? values : [values];
        options.add = (typeof options.add == "undefined") ? true : options.add;
        options.map = (typeof options.map == "undefined") ? typeof options.id_attribute != "undefined" : options.map;
        var id_attribute = options.id_attribute;
        // var id_values = [];
        // var no_id_values = [];
        var self = this;
        var intersection = [];
        var to_trigger = {};
        var parse = options.parse;        
        var to_add = [];
        var to_merge = [];
        var to_remove = [];
        var to_map = [];
        var sort = this._options.sort || options.sort;
        var events_to_trigger = [];
        var do_trigger = true;
        
        // if an especific index has given we eant to proccess de list backwards
        if (!isNaN(options.at)) {
            values = values.reverse();
        }
        
        // pre-procesamiento:
        // - dividimos entre, objetos con id y sin id
        for (var i=0; i<values.length; i++) {
            var value = values[i];
            if (typeof value == "undefined") continue;
            var at = options.at || this.length;
            
            if (options.parse) {
                value = this._value(value);
            }
            
            var id = extract_id(value, id_attribute);
            
            var entry = {id: id, value: value, index: options.remove? options.at: at+i-intersection.length, merge: options.merge};
            if (typeof id != "undefined") {
                // id_values.push(entry);
                var current_value = this.get(id);
                var index = this._values.indexOf(current_value);
                if (index != -1) {
                    intersection.push(current_value);
                    entry.index = index;
                    entry.merge = true;
                } else if (options.at) {
                    entry.index = options.at;
                }
                
                if (options.remove) {
                    to_remove.push(entry);
                } else if (options.map) {
                    to_map.push(entry);
                    to_add.push(entry);
                    // Se encontró un value con ID.
                    // Como no se especificó explícitamente que no se hiciera un map (y el remove es falso) lo mapeamos (en vez de un simple add)
                } else if (options.add) {
                    to_add.push(entry);
                } else {
                    console.error("value not proccessed", id, value);
                }
            } else {
                // no_id_values.push(entry);
                if (options.add) {
                    to_add.push(entry);
                } else if (options.remove) {
                    to_remove.push(entry);
                } else {
                    console.error("value not proccessed", value);                    
                }
            }            
        }

        if (to_remove.length > 0) {
            for (var i=0; i<to_remove.length; i++) {
                var entry = to_remove[i];
                if (typeof entry.id != "undefined") {
                    var value = this._mapping.get(entry.id);
                    if (typeof entry.index != "number") {
                        entry.index = this._values.indexOf(value);
                    }
                    this._values.splice(entry.index, 1);
                    this.do_nothing_on_set = true;
                    this._mapping.unset(id);
                    delete this.do_nothing_on_set;
                } else {
                    // Does'n have ID, so I look for an index
                    if (typeof entry.index != "number") {
                        entry.index = this._values.indexOf(entry.value);
                    }
                    
                    if (entry.index != -1) {
                        this._values.splice(entry.index, 1);
                    } else {
                        console.warn("OJO: no se encontró:", entry.value, " en ", this._values);
                    }
                }

                // Push the new event to trigger
                var new_path = "["+entry.index+"]";
                events_to_trigger.push({
                    name: "change:"+new_path,
                    body: {
                        target: this,
                        stack: [this],
                        path: new_path,
                        value: undefined,
                        old_value: entry.value
                    }
                });                
            }
            this.length = this._values.length;
            if (!options.silent) events_to_trigger.push({name:"remove", body: { target: this, values: to_remove, event: "remove" }} );
        }
        
        if (to_add.length > 0) {
            
            for (var i=0; i<to_add.length; i++) {
                var entry = to_add[i];
                if (entry.value && typeof entry.value.on == "function") {
                    entry.value.on("change", function (event_name, event) {
                        // This is invoked when a Mapping inside the collections change somehow
                        // We just pass through the event fixing the path with a inex prefix
                        if (event.path == "" || event.path.indexOf(".") == 0) {
                            console.error("¿?", self, event);
                            a();
                        }
                        
                        var stack = Array.prototype.map.apply(event.stack || [], [function (n) { return n; }]);
                        var parts = event.path.split(".");
                        stack.push(self);
                        var index = self._values.indexOf(event.target);
                        if (index == -1) {
                            // This should never execute
                            console.error("¿?", self, event);
                            event.target.off("change", null, self);
                        } else {
                            var new_path = "["+index+"]." + parts.join(".");
                            self.trigger("change:" + new_path, {
                                stack: stack,
                                target: self,
                                path: new_path,
                                value: event.value,
                                old_value: event.old_value
                            });
                        }
                    }, self);
                }
                
                entry.old_value = undefined;                
                if (typeof entry.index == "number") {
                    var current = this._values[entry.index];
                    if (current && entry.merge && typeof current.off == "function") {
                        current.off("change", null, self);
                    }
                    if (entry.merge) entry.old_value = current;
                    this._values.splice(entry.index, (entry.merge?1:0), entry.value);
                } else {
                    entry.index = this._values.length;
                    this._values.push(entry.value);
                }
                
                // Push the new event to trigger
                var new_path = "["+entry.index+"]";
                events_to_trigger.push({
                    name: "change:"+new_path,
                    body: {
                        target: this,
                        stack: [this],
                        path: new_path,
                        value: entry.value,
                        old_value: undefined
                    }
                });
                
            }
            this.length = this._values.length;
            if (!options.silent) events_to_trigger.push({name:"add", body: { target: this, values: to_add, event: "add" }} );
        }
        
        if (to_map.length > 0) {
            this.mapping_change_already_handled = true;
            this._mapping._value = function (n) {return n;};
            for (var i=0; i<to_map.length; i++) {
                var entry = to_map[i];
                this._mapping.set(entry.id, entry.value);
            }
            delete this.mapping_change_already_handled;
            delete this._mapping._value;
            this.length = this._values.length;
            if (!options.silent) events_to_trigger.push({name:"map", body: { target: this, values: to_map, event: "map" }} );
        }
        
        if (sort) {
            this.sort();
        }
        
        if (do_trigger) {
            for (var index in events_to_trigger) {
                var event = events_to_trigger[index];
                this.trigger(event.name, event.body);                
            }
            
            events_to_trigger.push({
                name: "change",
                body: {
                    target: this,
                    stack: [this],
                    path: "",
                    value: this
                }
            });            
        }
        
        this.length = this._values.length;
    }

    jwk.Collection = function(array, options) {
        if (this.constructor != jwk.Collection) { return new jwk.Collection(array); }
        jwk.Node.apply(this, []);
        this._options = extend({}, options);
        options || (options = {});
        if (options.mapping) this.mapping = options.mapping;
        if (options.comparator !== void 0) this.comparator = options.comparator;
        initial_state.apply(this);
        this.initialize.apply(this, arguments);
        if (array) this.reset(array, extend({silent: true}, options));
    }
    
    jwk.Collection.prototype = new jwk.Node();
    jwk.Collection.prototype.constructor  = jwk.Collection;
    jwk.Collection.prototype.initialize   = function(array, options){};
    
    jwk.Collection.prototype._value       = jwk.Mapping.prototype._value;
    jwk.Collection.prototype.mapping      = jwk.Node;
    jwk.Collection.prototype.collection   = jwk.Collection;
    
    jwk.Collection.prototype.toString = function () {
        return this._values.toString();
    }

    
    jwk.Collection.prototype.toArray = function () {
        return this._values;
    }

    jwk.Collection.prototype.valueOf = function () {
        return this._values;
    }

    jwk.Collection.prototype.reset = function (values, options) {
        options = options || {};
        values = Array.isArray(values) ? values : [values];
        var collection = this;
        this.each(function (value, index) {
            if (typeof value.off == "function") {
                value.off(null, null, collection);
            }
        });
        initial_state.apply(this);
        models = this.add(values, extend({silent: true}, options));
        if (!options.silent) this.trigger('reset', this);
        return values;
    }

    jwk.Collection.prototype.each = function (fn) {        
        for (var i=0; i<this._values.length; i++) { fn(this._values[i], i); }
    }
    jwk.Collection.prototype.at = function (index) {
        return this._values[index];
    }
    
    function prepare_path(original_path) {
        return original_path.replace(/\[/g,".").replace(/\]/g,"");
    }
    
    
    // jwk.Mapping API reimplementation -------------------- 
    jwk.Collection.prototype.keys = function () {
        return this._mapping.keys();
    }
    jwk.Collection.prototype.search = function (prop, max_resoults) {
        return this._mapping.search(prop, max_resoults);
    }
    jwk.Collection.prototype.get = function (path, create_path, last_is_array) {
        console.assert(typeof path == "string", path, create_path, last_is_array);
        var parts = path.split(".");
        var selection = parts[0];
        var arr, expression;
        if (selection.indexOf("[") == 0) {
            if (arr = selection.match(/\[(\d+)\]/)) {
                return this._values[parseInt(arr[1])];
            } else if (arr = selection.match(/\[(\w+)\]/)) {
                // [attribute] contiene el atributo (cuaquier valor)
                expression = /.*/;
            } else if (arr = selection.match(/\[(\w+)=(\w+)\]/)) {
                // [attribute=value] es igual a value
                expression = new RegExp(arr[2]);
            } else if (arr = selection.match(/\[(\w+)^=(\w+)\]/)) {
                // [attribute^=value] empieza con value
                expression = new RegExp("^" + arr[2]);
            } else if (arr = selection.match(/\[(\w+)$=(\w+)\]/)) {
                // [attribute$=value] termina con value
                expression = new RegExp(arr[2] + "$");
            } else if (arr = selection.match(/\[(\w+)*=(\w+)\]/)) {
                // [attribute*=value] contiene la palabra value
                expression = new RegExp(".*"+arr[2]+".*");
            }
            
            var attribute = arr[1], att_value = arr[2];
            for (var i=0; i<this._values.length; i++) {
                var node = this._values[i];
                var value;
                try { value = node[attribute]; } catch(e) { continue; }
                if (typeof value == "undefined") {
                    if (typeof node.get == "function") {
                        value = node.get(attribute);
                    }
                }
                if (typeof value == "undefined") continue;
                if (typeof value == "number") value = "" + value; // If number, we convert it to string to match for equals
                if (typeof value == "string") {
                    if (value.match(expression)) {
                        return node;
                    }
                }
            }
                 
        } else {
            return this._mapping.get(path, create_path, last_is_array);
        }
    }
    jwk.Collection.prototype.set = function (path, value, force) {
        var arr;
        if (arr = path.match(/\[(\d+)\]/)) {
            var index = parseInt(arr[1]);
            return insert.apply(this, [[value], extend({}, this._options, options, {at:index, merge: true, add:true})]);
        } else {
            return this._mapping.set(path, value, force);
        }
    }
    jwk.Collection.prototype.unset = function (path, options) {
        return insert.apply(this, [[this.get(path)], extend({}, this._options, options, {remove:true, add:false})]);
    }
    jwk.Collection.prototype.map = function (json, skip_check) {
        var old_options = this._options;
        if (typeof skip_check == "object") {
            this._options = extend({}, this._options, skip_check);
            skip_check = skip_check.skip_check;
        }
        if (typeof skip_check == "string") {
            // We will asume this to be the id_attribute shortcut 
            this._options = extend({}, this._options, {id_attribute: skip_check});
            skip_check = false;
        }
        var ret_ = this;
        function cancel() {
            console.error("ERROR: You need to provide a id_attribute (string of function) in order to get a valid id from each array entry", this.options);
            return ret_;
        }
        if (Array.isArray(json)) {
            if (typeof this._options != "object") return cancel();
            if (typeof this._options.id_attribute == "undefined") return cancel();
            for (var index in json) {
                var value = json[index];
                if (this._options.parse) value = this._value(value);
                var id = extract_id(value, this._options.id_attribute);
                if (typeof id == "string") {
                    this._mapping.set(id, value);
                } else {
                    console.warn("WARNING: couldn't get a valid id from the following object: ", value, "using the following id_attribute:",this._options.id_attribute);
                }
            }
        } else if (typeof json == "object") {
            ret_ = this._mapping.map(json, skip_check);
        }
        this._options = old_options;
        return ret_;
    }
    jwk.Collection.prototype.json = function (mapping_view) {
        if (mapping_view) return this._mapping.json(this);
        var json = [];
        for (var i=0; i<this.length; i++) {
            var value = this._values[i];
            if (!is_basic_value(value)) {
                if (is_window(value)) {
                    value = value.toString();
                } else if (typeof value.valueOf == "function") {
                    value = value.valueOf();
                }
            }
            json.push(value);
        }
        return json;
    }

    
    // Array pacial API reimplementation -------------------- 
    jwk.Collection.prototype.remove = function (values, options) {
        return insert.apply(this, [values, extend({}, this._options, options, {remove:true, add:false})]);
    }
    jwk.Collection.prototype.add = function (values, _options) {
        options = extend({}, this._options, _options, {add:true});
        return insert.apply(this, [values, options]);
    }
    jwk.Collection.prototype.push = function (values, options) {
        return insert.apply(this, [values, extend({}, this._options, options, {add:true})]);
    }
    jwk.Collection.prototype.pop = function (options) {
        var index = this._values-1;
        return insert.apply(this, [[this._values[index]], extend({}, this._options, options, {at:index, remove:true, add:false})]);
    }
    jwk.Collection.prototype.shift = function (values, options) {
        return insert.apply(this, [values, extend({}, this._options, options, {add:true, index: 0})]);
    }
    jwk.Collection.prototype.forEach = function () {
        return Array.prototype.forEach.apply(this._values, arguments);
    }
    jwk.Collection.prototype.unshift = function () {
        return console.error("Collection.unshift() not implemented yet");
    }
    jwk.Collection.prototype.splice = function (index, count) {
        console.assert(typeof index == "number", "ERROR: index must be a number, got", typeof index, index);
        console.assert(typeof count == "number", "ERROR: count must be a number, got", typeof count, count);
        // return console.error("Collection.splice() not implemented yet");
        if (count > 0) {
            var list = [];
            for (var i=0; i<count; i++) {
                list.push(this._values[index+i]);
            }
            insert.apply(this, [list, extend({}, this._options, options, {at:index, remove:true, add:false})]);
        }
        
        if (arguments.length > 2) {
            return console.error("Collection.splice() not implemented yet with more than 2 arguments");
        }
    }    
    jwk.Collection.prototype.sort = function (options) {
        switch (typeof options) {
            case "function": options = { comparator: options }; break;
            case "boolean": options = { now: options }; break;
            case "undefined": options = { }; break;
            case "object": if (options)
                           if (options.comparator)
                           if (typeof options.comparator != "function") 
                           options = {};
        }
        
        var list = this;
        if (this._timer) clearTimeout(this._timer);
        this._timer = false;
        if (!options.now) {
            this._timer = setTimeout(function() {
                list.sort( extend({}, options, {now: true})); 
            }, 10);
            return this;
        }        

        // if we are gonna to trigger an event we need a snapshot of the list before sorting
        var array_before = options.silent ? [] : this._values.map(function (n){ return n; });

        // We do the sort
        var comparator = options.comparator || this._options.comparator || this.comparator;
        this._values.sort(comparator);
        
        // now we do the check if some object has been sorted
        // TODO: is any efficient way to do this?
        var do_trigger = false;
        for (var i=0; !options.silent && i<array_before.length; i++) {
            if (array_before[i] != this._values[i]) {
                do_trigger = true; break;
            }
        }
        
        if (do_trigger && !options.silent) {
            this.trigger("sort change", {target: this});
        }
        
    }
       
    jwk.Collection.prototype.comparator = function (a,b) {
        if (a > b) return -1; 
        if (a < b) return 1;
        return 0;
    }
    
    // Esto lo dejamos? es útil ?
    jwk.Collection.prototype.option = function (opt, opt_value) {
        this._options[opt] = opt_value;
    }

    jwk.isCollection = function (c) {
        try {
            return (c instanceof jwk.Collection && Array.isArray(c._values) && c.length == c._values.length);
        } catch (e) {
            return false;
        }
    }
    
    return jwk.Collection;
});


define("jwk-model/jwk.object", [    
    "jwk-base/jwk.core", 
    "jwk-model/jwk.node",
    "jwk-model/jwk.observable",
    "jwk-model/jwk.flagged"
], function(jwk, Node, Observable, Flagged) {  
        
    
    function _handle_middle_change(n, e, path, partial) {
        // console.log("_handle_middle_change:", arguments);
        
        if (path == partial) {
            console.assert(this._observe.isPropDefined(path), "ERROR: inconsistency: ", arguments, [this._observe.valueOf()]);
            this._observe.set(path, e.value);
        } else {
            _listen_for_that.call(this, path, partial, e.value, e.old_value);            
        }
        
    }
    
    function _listen_for_that(_path, _partial, _new_value, _old_value) {
        var self = this;
        var options = {
            package: {
                self: this,
                path: _path,
                partial: _partial
            }
        };

        function _handle_middle(n, e, package) {
            _handle_middle_change.apply(package.self, [n, e, package.path, package.partial+(package.partial?".":"")+e.path]);
        }

        if (_path.indexOf(_partial) == 0 && _path != _partial) {
            var next_prop = _path.substring((_partial).length+(_partial?1:0));
            next_prop = next_prop.split(".")[0];
            
            if (_new_value instanceof jwk.Node) {
                _new_value.on("change:"+next_prop, _handle_middle, _path, options);
                // _new_value.set(next_prop, _e.value.get(next_prop), {force: true});
            }
            if (_old_value instanceof jwk.Node) {
                _old_value.off("change:"+next_prop, _handle_middle, _path);
            }            
        }
        
        // self[prop].set(sub_prop, self[prop].get(sub_prop), {force: true});
    }

    jwk.Object = function () {
        if (!(this instanceof jwk.Object)) return new jwk.Object();
        this._observe = new jwk.Node();
        this._observe.on("change", function (n, e) {            
            e.target = this;
            this.trigger_fast(e.event_name, e);
            this.trigger_fast("change", e);
        }, this)
        jwk.Node.apply(this, arguments);        
        
        var self = this;
        // change:path.to.target
        this.on("handler", function (n, e) {
            if (/change:\w+\.\w+/.test(e.event)) {
                var path = e.event.substring("change:".length);                
                var prop = e.event.match(/change:(\w+)\.\w+/i, true)[1];                
                
                _listen_for_that.call(this, path, "", this, null);
                if (this[prop] instanceof jwk.Node) {
                    _listen_for_that.call(this, path, prop, this[prop], null);
                }
                
                this._observe.set(path, this.get(path, {deep: true}), {silence: true});
            }
        }, this);        
     
        // TODO: tiene que haber un evento para cuando hacen this.off() y desuscriben un listener
        
    }
    
    jwk.Object.extend = function (obj) {
        jwk.Object.apply(obj);
        for (var name in jwk.Object.prototype) {
            obj[name] = jwk.Object.prototype[name];
        }
        return obj;
    }    
    
    jwk.Object.prototype = new jwk.Node();
    jwk.Object.prototype.constructor = jwk.Object;
    jwk.Object.prototype.mapping = jwk.Object;
    /*
    _handle_target_change = function (n, e, path, partial) {
        console.log("_handle_target_change:", arguments);        
        //if (e.value || this._observe.get(path)) 
        this._observe.set(path, e.value, {deep: true});
    }*/

    /*
    jwk.Object.prototype.on_set = function (prop, value, old_value) {
        var self = this;
        jwk.Node.prototype.on_set.call(this, prop, value, old_value);        
        if (value instanceof jwk.Node) {
            // console.log("on_set("+prop+")", [value], "es un jwk.Obkect", [this, this.valueOf()], [value, value.valueOf()])
            console.assert(prop.indexOf(".") == -1, prop);
            
            this._observe.each(function (val, key) {
                console.log(arguments);
                if (key.indexOf(prop + ".") == 0) {
                    var sub_prop = key.split(".")[1];
                    var isTarget = key.split(".").length == 2;
                    console.log("Me interesa esta propiedad porque es parte de un path que me están observando", prop, key, sub_prop, isTarget);
                    // prop: "path", key: "path.to"
                    // prop: "path", key: "path.to.target"
                    
                    // primer cosa me podría fijar el valor anterior de path.to y compararlo con el actual. Si cambió hacer un "change".
                    // ahora me suscribo como escucha al nuevo value por la propiedad key - prop: key.substring(prop.length+1);
                    
                    _listen_for_that.call(self, key, prop, prop, sub_prop);
                    
                }
            })
            
        } 
        
        if (old_value instanceof jwk.Node) {
            // me fijo en el anterior si es un Object me desuscribo como escucha
        }
        
        
        
    }
    */
    
    jwk.Object.prototype.mapping = jwk.Object;
    
    
    return jwk.Object;
});


define("jwk-model/jwk.model", [
    "jwk-base/jwk.core",
    "jwk-model/jwk.observable",
    "jwk-model/jwk.mapping",
    "jwk-model/jwk.node",
    "jwk-model/jwk.flagged",
    "jwk-model/jwk.collection",
    "jwk-model/jwk.object"
], function(jwk){    
    return jwk;
});
define( 'jwk-ajax/var/arr',[],function() {
	return [];
} );

define( 'jwk-ajax/var/document',[],function() {
	return window.document;
} );

define( 'jwk-ajax/var/slice',[
	"./arr"
], function( arr ) {
	return arr.slice;
} );

define( 'jwk-ajax/var/concat',[
	"./arr"
], function( arr ) {
	return arr.concat;
} );

define( 'jwk-ajax/var/push',[
	"./arr"
], function( arr ) {
	return arr.push;
} );

define( 'jwk-ajax/var/indexOf',[
	"./arr"
], function( arr ) {
	return arr.indexOf;
} );

define( 'jwk-ajax/var/class2type',[],function() {

	// [[Class]] -> type pairs
	return {};
} );

define( 'jwk-ajax/var/toString',[
	"./class2type"
], function( class2type ) {
	return class2type.toString;
} );

define( 'jwk-ajax/var/hasOwn',[
	"./class2type"
], function( class2type ) {
	return class2type.hasOwnProperty;
} );

define( 'jwk-ajax/var/support',[],function() {

	// All support tests are defined in their respective modules.
	return {};
} );

define( 'jwk-ajax/core/DOMEval',[
	"../var/document"
], function( document ) {
	function DOMEval( code, doc ) {
		doc = doc || document;

		var script = doc.createElement( "script" );

		script.text = code;
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}

	return DOMEval;
} );

define( 'jwk-ajax/core',[
	"./var/arr",
	"./var/document",
	"./var/slice",
	"./var/concat",
	"./var/push",
	"./var/indexOf",
	"./var/class2type",
	"./var/toString",
	"./var/hasOwn",
	"./var/support",
	"./core/DOMEval"
], function( arr, document, slice, concat,
	push, indexOf, class2type, toString, hasOwn, support, DOMEval ) {

var
	version = "@VERSION",

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

return jQuery;
} );

define( 'jwk-ajax/var/rnotwhite',[],function() {
	return ( /\S+/g );
} );

define( 'jwk-ajax/ajax/var/location',[],function() {
	return window.location;
} );

define( 'jwk-ajax/ajax/var/nonce',[
	"../../core"
], function( jQuery ) {
	return jQuery.now();
} );

define( 'jwk-ajax/ajax/var/rquery',[],function() {
	return ( /\?/ );
} );

define( 'jwk-ajax/core/var/rsingleTag',[],function() {

	// Match a standalone tag
	return ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );
} );

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

// EXPOSE
var _sizzle = window.Sizzle;

Sizzle.noConflict = function() {
	if ( window.Sizzle === Sizzle ) {
		window.Sizzle = _sizzle;
	}

	return Sizzle;
};

if ( typeof define === "function" && define.amd ) {
	define('jwk-ajax/external/sizzle',[],function() { return Sizzle; });
// Sizzle requires that there be a global window in Common-JS like environments
} else if ( typeof module !== "undefined" && module.exports ) {
	module.exports = Sizzle;
} else {
	window.Sizzle = Sizzle;
}
// EXPOSE

})( window );
define( 'jwk-ajax/selector-sizzle',[
	"./core",
	"./external/sizzle"
], function( jQuery, Sizzle ) {

jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;

} );

define( 'jwk-ajax/selector',[ "./selector-sizzle" ], function() {} );

define( 'jwk-ajax/traversing/var/rneedsContext',[
	"../../core",
	"../../selector"
], function( jQuery ) {
	return jQuery.expr.match.needsContext;
} );

define( 'jwk-ajax/traversing/findFilter',[
	"../core",
	"../var/indexOf",
	"./var/rneedsContext",
	"../selector"
], function( jQuery, indexOf, rneedsContext ) {

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

} );

// Initialize a jQuery object
define( 'jwk-ajax/core/init',[
	"../core",
	"../var/document",
	"./var/rsingleTag",
	"../traversing/findFilter"
], function( jQuery, document, rsingleTag ) {

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

return init;

} );

define( 'jwk-ajax/ajax/parseXML',[
	"../core"
], function( jQuery ) {

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

return jQuery.parseXML;

} );

define( 'jwk-ajax/manipulation/var/rcheckableType',[],function() {
	return ( /^(?:checkbox|radio)$/i );
} );

define( 'jwk-ajax/traversing/var/dir',[
	"../../core"
], function( jQuery ) {

return function( elem, dir, until ) {
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

} );

define( 'jwk-ajax/traversing/var/siblings',[],function() {

return function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};

} );

define( 'jwk-ajax/traversing',[
	"./core",
	"./var/indexOf",
	"./traversing/var/dir",
	"./traversing/var/siblings",
	"./traversing/var/rneedsContext",
	"./core/init",
	"./traversing/findFilter",
	"./selector"
], function( jQuery, indexOf, dir, siblings, rneedsContext ) {

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

return jQuery;
} );

define( 'jwk-ajax/core/access',[
	"../core"
], function( jQuery ) {

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

return access;

} );

define( 'jwk-ajax/attributes/support',[
	"../var/document",
	"../var/support"
], function( document, support ) {

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

return support;

} );

define( 'jwk-ajax/attributes/prop',[
	"../core",
	"../core/access",
	"./support",
	"../selector"
], function( jQuery, access, support ) {

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

} );

define( 'jwk-ajax/serialize',[
	"./core",
	"./manipulation/var/rcheckableType",
	"./core/init",
	"./traversing", // filter
	"./attributes/prop"
], function( jQuery, rcheckableType ) {

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

return jQuery;
} );

define( 'jwk-ajax/ajax',[
    "jwk-base/jwk.core",
	"./core",
	"./var/document",
	"./var/rnotwhite",
	"./ajax/var/location",
	"./ajax/var/nonce",
	"./ajax/var/rquery",

	"./core/init",
	"./ajax/parseXML",
	"jwk-model/jwk.model",
    "jwk-base/jwk.callbacks",
    "jwk-base/jwk.deferred",
	"./serialize" // jQuery.param
], function(jwk, jQuery, document, rnotwhite, location, nonce, rquery ) {

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
			deferred = jwk.Deferred(),
			completeDeferred = jwk.Callbacks( "once memory" ),

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


return jQuery;




} );

define( 'jwk-ajax/ajax/jsonp',[
	"../core",
	"./var/nonce",
	"./var/rquery",
	"../ajax"
], function( jQuery, nonce, rquery ) {

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

} );

define( 'jwk-ajax/ajax/xhr',[
	"../core",
	"../var/support",
	"../ajax"
], function( jQuery, support ) {

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

} );

define("jwk-ajax/jwk.ajax", [
    "jwk-base/jwk.core",
    "./ajax",
    "./ajax/jsonp",
    "./ajax/xhr",
], function(jwk, jQuery) {

    jwk.ajax           = jQuery.ajax;
    jwk.ajaxComplete   = jQuery.ajaxComplete;
    jwk.ajaxError      = jQuery.ajaxError;
    jwk.ajaxSend       = jQuery.ajaxSend;
    jwk.ajaxStart      = jQuery.ajaxStart;
    jwk.ajaxStop       = jQuery.ajaxStop;
    jwk.ajaxSuccess    = jQuery.ajaxSuccess;
    jwk.ajaxSetup      = jQuery.ajaxSetup;
    jwk.ajaxTransport  = jQuery.ajaxTransport;
    jwk.ajaxPrefilter  = jQuery.ajaxPrefilter;
    jwk.getJSON        = jQuery.getJSON;
    jwk.get            = jQuery.get;
    jwk.post           = jQuery.post;
    
    return jwk;
});
/*
TODO: hacer un update de la implementación de esto habiendo estudiado esto: http://www.easy-bits.com/blog/send-data-two-iframes
*/
// http://jsfiddle.net/Uw74z/
// http://jsfiddle.net/KX25w/   <<<----- mouse
define("jwk-net/jwk.net.core", [
    "jwk-base/jwk.core",    
    "jwk-model/jwk.model"
], function(jwk) {

    var global, proxies = new jwk.Node(), iframe = new jwk.Node(), exe_return = new jwk.Node(), 
                
        enabled = true;
    
    var TTL = 10;
    var debug = false;
    var filter_trigger = false;
    var filter_mouse = true; // no esta implementado
    
    var ft = filter_trigger;
    var fm = filter_mouse;
    function trace(msj) {
        if (!debug) return "log";
        if (JSON.stringify(msj).indexOf("SYNK") != -1) {
            return "error";
        }
        return "log";
    }
    
    
    jwk.Global = function () {
        global = this;
        this.iframe = iframe;        
        this.init();
    }
    
    jwk.Global.prototype = new jwk.Node();
    jwk.Global.prototype.constructor = jwk.Global;
    
    function function_proxy(func_name, args) {                
        return this._global.execute(func_name, this._proxy_id, args);        
    }
    
    function create_function_proxy(name) {
        var func = function () {
            var func_name = arguments.callee.func_name;
            return function_proxy.call(this, func_name, arguments);
        }
        func.func_name = name;        
        return func;
    }
    
    function disconnect_global() {
        global.disconnect();
    }
    
    function proccess_message(event) {
        var msj = event.data;
        if (!msj.action) return; // not a valid package
        if (!enabled) return;
        
        if (debug && (!ft || msj.action != "jwk.global.TRIGGER")) console[trace(msj)](global.whoami(), "<-", msj.from, msj.action, [msj, msj.event ? msj.event.name : ""]);
        var valid = true;
        switch (msj.action) {
            case "jwk.global.HELLO":
                // console.log("HELLO!!! jwk.global._listeners.iframe:", [jwk.global._listeners.iframe]);
                // Soy el padre (posiblemente el top). Me llegó un Hello de un nuevo iframe hijo.
                // tengo que registrar el iframe. // 
                
                
                // console.log(global.whoami(true), "Se conecto alguien:", msj.from);
                
                if (iframe.get(msj.from)) {
                    iframe.get(msj.from).unset("disconnecting");
                    if (debug) console.warn(global.whoami(), "Descartamos el duplicado", msj.action, msj.from, msj);
                    return; // descartamos el duplicado
                }
                
                iframe.set(msj.from, new jwk.Node({
                    "global": msj.from,
                    "origin": event.origin,
                    "source": event.source
                }));
                
                if (msj.popup) {
                    iframe.set(msj.from + ".popup", true, {deep: true});
                } else {
                    // Find out witch iframe posted a this messagge
                    jwk.query("iframe").each(function() {
                        if(jwk.query(this)[0].contentWindow == event.source) {
                            iframe.set(msj.from + ".iframe", jwk.query(this), {deep: true});
                        }
                    });
                }
                
                var answ = {
                    ttl: TTL, // avoid infinite loops with "time to live"
                    action: msj.action + "_ACK",
                    from: global.id                 // parent id
                };
                
                if (debug && (!ft || msj.action != "jwk.global.TRIGGER")) console[trace(msj)](global.whoami(), "->", event.origin, answ.action, [answ]);
                
                try {
                    event.source.postMessage(answ, event.origin);
                } catch (err) {
                    console.error(err, answ);
                }
                
                // console.error("global.trigger(iframe)", [global, global._listeners.iframe, msj.from, iframe.get(msj.from), msj, global.whoami(true)])
                // - BORRAR marcar el iframe que dice "pendiente de confirmar desconexion"
                global.trigger("iframe", iframe.get(msj.from));
                
                break;
            case "jwk.global.HELLO_ACK":
                // soy el hijo y me contestan el HELLO.
                // Me tengo que guardar el ID de mi padre. Tengo que saber que ID tiene.                
                global.parent = {id:msj.from, origin: event.origin, source: event.source};
                global.flag_on("parent");
                break;
                
            case "jwk.global.DISCONNECT":
                // me llegó este mensaje porque un iframe se está por cerrar y mandó un DISCONNECT
                //console.log(global.whoami(true), "Se desconectó alguien", msj.from);
                
                // alert("Buscame!!!!");
                // console.error("Buscame!!!!");
                // TODO: antes de dar por desconectado cualquier iframe habría que:
                // - marcar el iframe como "pendiente de confirmar desconexion"
                // - mandar un mensaje al msj.from y pedir que se reconecte.
                // - si el mensaje llega al destinatario este debería responder con un HELLO y comenzar todo de vuelta.
                
                
                (function (_msj) {                
                    var _iframe = iframe.get(_msj.from);
                    _iframe.set("disconnecting", true);

                    try {
                        var answ = {
                            ttl: TTL,
                            action: "jwk.global.RECONNECT",
                            from: global.id
                        };                        
                        _iframe.get("source").postMessage(answ, event.origin);
                    } catch (err) {
                        console.error(err, answ);
                    }

                    
                    if (debug) {
                        console.warn(global.whoami(), "Desconectando iframe", _msj.from, [_msj, _msj.event ? _msj.event.name : ""], [iframe.get(_msj.from)]);
                    }

                    setTimeout(function () {
                        // - confirmar la desconexión xq no se recibió un HELLO desde entonces.                        
                        if (_iframe.get("disconnecting")) {
                            //console.log(global.whoami(true), "Confirmo la desconexión", _msj.from);
                            iframe.unset(_msj.from);
                            global.trigger_fast("disconnect", {id: _msj.from});                    
                        }
                    }, 500);
                })(msj)
                
                break;
                
            case "jwk.global.RECONNECT":
                // Acabo de mandar un DISCONNECT a propósito y el documento padre me está pidiendo que me reconecte.
                // Si sigo vivo debería estar bien que mande un HELLO.
                // TODO: verificar que no se esté introduciendo un bug al abrir la conexión de vuelta con un iframe que se cerró
                /*if (window.parent != window) {
                    creator = window.parent;
                } else if (window.opener) {            
                    creator = window.opener;
                    popup = true;
                }*/
                console.error(global.whoami(true), "Me reconecto");
                global.parent.postMessage({action:'jwk.global.HELLO',from: global.id, popup: popup},"*");       
                break;
                
            case "jwk.global.EXE":
                if (global.has_proxy(msj.proxy_id)) {
                    var proxy = global.proxy(msj.proxy_id);
                    var args = msj.invoke.args;
                    var func_name = msj.invoke.name;
                    var func = proxy[func_name];
                    
                    if (typeof func == "function" && Array.isArray(args)) {
                        var source = event.source;
                        var deferred = func.apply(proxy, args);
                        //if (typeof deferred != "object" || typeof deferred.done != "function" || typeof deferred.fail != "function") {
                        //    deferred = jwk.Deferred().resolve(deferred);
                        //}                        
                        deferred.done(function (ret) {
                            if (typeof ret == "undefined" && arguments.length == 1) {
                                // ret value is undefined. --> cancel
                                return;
                            }
                            var answ = {
                                req: msj.req,
                                action: "jwk.global.EXE_RETURN",
                                proxy_id: msj.proxy_id,
                                data: jwk.serialize(Array.prototype.slice.call(arguments)),
                                from: global.id
                            }
                            if (debug && (!ft || answ.action != "jwk.global.TRIGGER")) console[trace(msj)](global.whoami(), "->", msj.from, answ.action);
                            try {
                                source.postMessage(answ, event.origin);
                            } catch (e) {
                                console.error(e.message, [answ, event], e.stack);
                            }
                        }).fail(function (){
                            var answ = {
                                req: msj.req,
                                action: "jwk.global.EXE_FAIL",
                                proxy_id: msj.proxy_id,
                                data: jwk.serialize(Array.prototype.slice.call(arguments)),
                                from: global.id
                            }
                            if (debug && (!ft || answ.action != "jwk.global.TRIGGER")) console[trace(msj)](global.whoami(), "->", msj.from, answ.action);
                            try {
                                source.postMessage(answ, event.origin);
                            } catch (e) {
                                console.error(e.message, [answ, event], e.stack);
                            }                            
                        });                        
                    } else {
                        global.broadcast(msj);
                    }
                } else {
                    global.broadcast(msj);
                }
                break;
            case "jwk.global.EXE_RETURN": 
                if (global.has_proxy(msj.proxy_id) && exe_return.get(msj.req)) {
                    var deferred = exe_return.get(msj.req);
                    exe_return.unset(msj.req);
                    console.assert(Array.isArray(msj.data), msj.data);
                    deferred.resolve.apply(deferred, msj.data);
                } else {
                    global.broadcast(msj);                    
                }                
                break; 
            case "jwk.global.EXE_FAIL": 
                if (global.has_proxy(msj.proxy_id) && exe_return.get(msj.req)) {
                    var deferred = exe_return.get(msj.req);
                    exe_return.unset(msj.req);                    
                    deferred.reject.apply(deferred, msj.data);
                } else {
                    global.broadcast(msj);                    
                }                
                break; 
            case "jwk.global.CHANGE_ID": 
                if (global.has_proxy(msj.proxy_id)) {
                    global.update_id(msj.proxy_id, msj.new_id)
                }          
                global.broadcast(msj);                    
                break;
            case "jwk.global.REGISTER":
                if (global.has_proxy(msj.proxy_id)) {
                    var proxy = global.proxy(msj.proxy_id);
                    var func_name = msj.func_name;
                    if (func_name.indexOf("[") == 0) {
                        var list = JSON.parse(func_name);
                        for (var i in list) {
                            func_name = list[i];
                            proxy.register_remote_function(func_name, typeof proxy[func_name] == "function" ? proxy[func_name] : create_function_proxy(func_name));
                            
                            // proxy[func_name] = typeof proxy[func_name] == "function" ? proxy[func_name] : create_function_proxy(func_name);
                            // proxy.flag_on("function:" + func_name);
                            // proxy.flag_on("function_" + func_name); // DEPRECATED
                        }
                    } else {
                        proxy.register_remote_function(func_name, typeof proxy[func_name] == "function" ? proxy[func_name] : create_function_proxy(func_name));
                        // proxy[func_name] = typeof proxy[func_name] == "function" ? proxy[func_name] : create_function_proxy(func_name);
                        // proxy.flag_on("function:" + func_name);
                        // proxy.flag_on("function_" + func_name); // DEPRECATED
                    }
                    proxy.trigger_local("api_update",{proxy:proxy});
                    proxy.flag_on("api");
                }

                global.broadcast(msj);
                break;
                
            case "jwk.global.TRIGGER":
                
                if (msj.from == global.id) alert("error!");
                console.assert(msj.from != global.id, msj, global.whoami(true));
                
                // Este HACK es para arreglar el offset del evento dentro de los iframes                
                if (msj.event && msj.event.data && msj.event.data.pageX) {
                    var filtro = function (msj, global) {
                        var fr = iframe.get(msj.from+".iframe");
                        if (!fr) return;
                        if (!global.parent || msj.from != global.parent.id) {
                            // el msj viene de un hijo. hay que ajustar                            
                            var offset = fr.offset();
                            msj.event.data.pageX += offset.left + parseInt(fr.css("border-left-width"));
                            msj.event.data.pageY += offset.top  + parseInt(fr.css("border-top-width"));
                        }
                    }
                    filtro(msj, global);
                }
                
                
                // console[trace(msj)](global.whoami(),"trigger(" + msj.proxy_id + "." + msj.event.name+")", "listeners:", global.listeners);
                if (global.has_proxy(msj.proxy_id)) {
                    if (msj.event.name.indexOf("change:") == 0) {
                        console.assert(typeof msj.path != "undefined", "msj no trae path:", msj);
                        // console.assert(typeof msj.value != "undefined", "msj no trae value:", msj);                        
                        global.proxy(msj.proxy_id).set_local(msj.path, msj.value);
                    } else {
                        global.proxy(msj.proxy_id).trigger_local(jwk.extend(true, {}, msj));
                    }
                }
                try {
                    global.broadcast(msj);
                } catch (err) {                
                    console.error("ERROR: ",msj, err, err.stack);
                }
                
                break;                
            // case "jwk.global.TRIGGER_ACK": 

            case "jwk.global.SYNK": 
                
                // Somebody is asking for an update of some proxy object

                if (global.has_proxy(msj.proxy_id)) {
                    // We have an updated copy localy so we can answer the request
                    
                    var json;
                    var proxy = global.proxy(msj.proxy_id);
                    console.assert(proxy instanceof jwk.Proxy, msj.proxy_id, proxy);
                    if (msj.path) {
                        console.assert(typeof proxy.get(msj.path) == "object", proxy.get(msj.path));
                        console.assert(typeof proxy.get(msj.path).json == "function", proxy.get(msj.path).json);
                        json = proxy.get(msj.path).valueOf();
                    } else {
                        json = proxy.valueOf();
                    }                    
                    var answ = {
                        req: msj.req,
                        action:msj.action+"_ACK",
                        proxy_id: msj.proxy_id,
                        from: global.id,
                        data: json,
                        api: JSON.stringify(proxy.api())
                    };
                  
                    if (debug && (!ft || msj.action != "jwk.global.TRIGGER")) console[trace(msj)](global.whoami(), "->", msj.from, answ.action, [answ]);
                    try {
                        event.source.postMessage(answ, event.origin);
                    } catch (err) {
                        console.error(err, answ);
                    }
                    if (proxy._functions.keys().length > 0) {
                        global.register(JSON.stringify(proxy._functions.keys()), msj.proxy_id);
                    }
                } else {
                    // We dont have a copy so e pass it trought
                    global.broadcast(msj);
                }
                break;
            case "jwk.global.SYNK_ACK": 
                // We are recibing an answer width updated data of some proxy
                // This is becasuse we asked for it or we are in the middle of a msj path.
                if (global.has_proxy(msj.proxy_id)) {
                    global.proxy(msj.proxy_id).update_local(msj);
                    if (msj.api) {
                        // var api = JSON.parse(msj.api);
                        var copy = jwk.extend({}, msj);
                        copy.action = "jwk.global.REGISTER";
                        //for (var i in api) {
                            copy.func_name = msj.api; //api[i];
                        
                            // console.log("--> simulo registrar el proxy ", msj.proxy_id, "API:", msj.api);
                            proccess_message({data:copy});
                        //}
                    }
                }
                global.broadcast(msj, {exclude: msj.from});
                break;                
                
            default:
                console.warn("WARNING: message discarted because does not follow the protocol ", global.whoami(), "message:", [msj, msj.event ? msj.event.name : ""], [event]);
                valid = false;
        }
        
        if (valid) global.trigger(msj.from, msj);
                
    }
    
    jwk.Global.prototype.debug = function () {
        return [this.whoami(), {proxies:proxies}, {iframe:iframe}, {exe_return:exe_return}, {enabled:enabled}];
    }

    jwk.Global.prototype.enable = function (e) {
        enabled = e;        
    }

    jwk.Global.prototype.is_root = function () {
        return !this.parent;
    }
    
    var body = null;
    
    jwk.Global.prototype.is_inside = function (ev) {
        // console.log(global.whoami(true), "is_inside", ev.pageX + ", " + ev.pageY, body.width() + ", " + document.height());
        var names = iframe.keys();
        for (var i in names) {
            var fr = iframe.get(names[i]).iframe();
            var of = fr.offset();
            if (ev.pageX > of.left &&
                ev.pageY > of.top  &&
                ev.pageX < of.left + fr.width() &&
                ev.pageY < of.top + fr.height()
            ) {
                return false;
            }            
        }
        body == body || jwk.query("body");
        if (ev.pageX < 0            ||
            ev.pageY < 0            ||
            ev.pageX > body.width() ||
            ev.pageY > document.height()
            ) {
            return false;
        } else {
            return true;
        }
    }
    jwk.Global.prototype.has_child = function (id) {
        return iframe.has(id);
    }
    
    jwk.Global.prototype.broadcast = function (msj, options) {
        // me aseguro que sea un array
        if (!enabled) return;
        msj.from = msj.from || global.id;
        msj.ttl = msj.ttl || TTL;
        msj.req = msj.req || "" + (new Date().getTime()) + "" + Math.random();
        
        options = options || {};
        var exclude = options.explude || [];
        var include = options.include || true;
        
        if (msj.ttl <= 0) {
            console.log(global.whoami(), "WARNING. cancelating broadcast because TTL <= 0", msj );
            return;
        }
        
        // Incluimos el remitente del mensaje como una excepción y actualizamos el campo
        msj.ttl--;
        exclude.push(msj.from);
        msj.from = global.id;
        
        
        // console.log(global.whoami(),"broadcast", msj.event, "exceptions:",exceptions, msj);
        function send_to_parent(msj) {
            if (exclude.indexOf(global.parent.id) < 0 && exclude.indexOf(global.parent.origin) < 0)  {
                if (debug && (!ft || msj.action != "jwk.global.TRIGGER")) {
                    console[trace(msj)](global.whoami(),"-> parent:", global.parent.id, msj.from, msj.action, [msj, msj.event ? msj.event.name : ""]);
                }
            
                try {
                    global.parent.source.postMessage(msj, global.parent.origin);
                } catch (e) {
                    console.log(e.message, e.stack, msj);
                }
            } 
        }        
        // Enviar a mi padre
        if (global.parent) {
            send_to_parent(msj);
        } else {
            if (!global.no_parent) {
                (function (msj) {
                    global.wait_flag("parent").done(function () {
                        if (msj.proxy_id == "jwk.global.mouse" && msj.action == "jwk.global.TRIGGER") {
                            // HACK
                            // Existe un problema cuando movés el mouse antes de que la aplicación que se está abriendo
                            // pueda sincronizarse con el padre.
                            // Los mensajes quedan encolados acá y se mandan como ráfaga uno tras otro.
                            // Concretamente este (mouse - TRIGGER) es bloqueado por el browser y todavía no identifico por qué
                        } else {
                            send_to_parent(msj);
                        }                        
                    });
                })(msj);
            }
        }
        
        // HACK: Este HACK es para arreglar el offset del evento dentro de los iframes
        var filtro;
        var pagePos;
        try {
            pagePos = {x:msj.event.data.pageX, y:msj.event.data.pageY};
        } catch (e) {}
        filtro = function (msj, global, frame) {
            // el msj va hacia un hijo. hay que ajustar
            var iframe = frame.get("iframe");
            if (iframe) {
                var offset = iframe.offset();
                msj.event.data.pageX = pagePos.x - offset.left;
                msj.event.data.pageY = pagePos.y - offset.top;
            }
        };
        
        
        var list = iframe.keys();
        for (var i=0; i<list.length; i++) {
            var globalid = list[i];
            var frame = iframe.get(globalid);
            if (exclude.indexOf(globalid) < 0)  {
                if (pagePos) filtro(msj, global, frame);
                if (debug && (!ft || msj.action != "jwk.global.TRIGGER")) console[trace(msj)](global.whoami(),"-> ", frame.get("global"), msj.action, [msj, msj.event ? msj.event.name : ""]);
                frame.get("source").postMessage(msj, frame.get("origin"));
            }
        }
    }      
    
    jwk.Global.prototype.init = function () {
        global.id = "global-" + window.location.hostname.replace(/\./g,"-") + "-"+jwk.uniqueId();
        global.url = window.location.href;
        global.domain = window.location.hostname;
        
        if (debug) console.log(global.whoami(true), "<-----------------------");
        
        // We suscribe to any message sent to us
        window.addEventListener('message', proccess_message, false);
        window.addEventListener('beforeunload', disconnect_global, false);      
        var creator = null;
        var popup = false;
        if (window.parent != window) {
            creator = window.parent;
        } else if (window.opener) {            
            creator = window.opener;
            popup = true;
        }

        if (creator) {
            var timer;
            var callback = function () {
                if (!global.parent) {
                    creator.postMessage({action:'jwk.global.HELLO',from: global.id, popup: popup},"*");
                } else {
                    clearInterval(timer);
                    timer = false;
                }
            }
            timer = setInterval(callback, 100);
            callback();
            setTimeout(function() {
                if (timer) {
                    clearInterval(timer);
                    timer = false;
                    console.warn("time out for comunicating with parent document", window.parent);
                    global.no_parent = true; // podría limpiarse los que hayan quedado enganchados con wait_flag("parent")
                }
            }, 3000) 
        }

    }
    
    jwk.Global.prototype.whoami = function (complete) {
        return "["+global.id+"]" + (complete?" - "+global.url:"");
    };    

    
    jwk.Global.prototype.proxy = function (id, constructor) {
        if (arguments.length == 0) {
            id = "proxy-"+jwk.uniqueId();
        }
        var proxy = proxies.get(id);
        if (!proxy) {
            if (constructor) {
                proxy = new constructor(id, global);                
            } else {
                proxy = new jwk.Proxy(id, global);
            }
            proxies.set(id, proxy);
        }

        return proxy;        
    }    
    jwk.Global.prototype.has_proxy = function (id) {
        return typeof proxies.get(id) != "undefined";
    }
    
    jwk.Global.prototype.register = function (func_name, proxy_id, options) {
        
        var msj = {
            action:"jwk.global.REGISTER",
            proxy_id: proxy_id,
            func_name: func_name
        };			
        
        global.broadcast(msj);
        
    }
    
    jwk.Global.prototype.synk = function (proxy_id, options) {
            
        var msj = {
            action:"jwk.global.SYNK",
            proxy_id: proxy_id
        };			
        
        global.broadcast(jwk.extend({},options, msj));
        
    };
    
    jwk.Global.prototype.propagate = function (proxy_id, options) {
            
        var msj = {
            action:"jwk.global.SYNK",
            proxy_id: proxy_id,
            from: global.id,
            ttl: 4,
            req: "" + (new Date().getTime()) + "" + Math.random()
        };			
        
        proccess_message({data:msj});
        
    };   
    
    jwk.Global.prototype.disconnect = function () {        
        var msj = { action:"jwk.global.DISCONNECT" };
        global.broadcast(msj);
    };
    
    jwk.Global.prototype.update_id = function (proxy_id, new_id) {
        if (global.has_proxy(proxy_id)) {
            var proxy = global.proxy(proxy_id);
            proxy._proxy_id = new_id;
            proxies.unset(proxy_id);
            proxies.set(new_id, proxy);
        }
    }
    jwk.Global.prototype.change_id = function (proxy_id, new_id) {        
        var msj = {
            action:"jwk.global.CHANGE_ID",
            proxy_id: proxy_id,
            new_id: new_id
        };
        global.update_id(proxy_id, new_id)
        global.broadcast(msj);
    };    
    jwk.Global.prototype.trigger_event = function (event_name, proxy_id, data) {        
        
        var msj = {
            action:"jwk.global.TRIGGER",
            proxy_id: proxy_id,
            event: {
                name: event_name,
                data: data
            }
        };
        
        if (event_name.indexOf("change:") == 0) {
            msj.path  = data.path;
            msj.value = data.value;
            delete data.target;
            delete data.old_value;
            delete data.stack;
        }
        
        global.broadcast(msj);
        
    };
    
    jwk.Global.prototype.execute = function (func_name, proxy_id, params) {
        var deferred = jwk.Deferred();
        
        if (params && params.toString() == "[object Arguments]") {
            params = Array.prototype.map.apply(params, [function (n){ return jwk.serialize(n); }]);
        }
        
        var msj = {
            action:"jwk.global.EXE",
            proxy_id: proxy_id,
            invoke: {
                name: func_name,
                args: params.length > 0 ? params : []
            }
        };			
        
        global.broadcast(msj);        
        exe_return.set(msj.req, deferred);
        
        return deferred.promise();
    };    
    
    
    jwk.global = new jwk.Global();
    jwk.net = jwk.global;
    return jwk.global;

});

            

/*
TODO:
- dividir en dos archivos: jwk.net y jwk.proxy

jwk.net:
- implementa lo que ahora es jwk.Global. es decir el algoritmo de comunicación entre nodos de una red.
jwk.net.node:
- implementa el API completo de lo que debería resolver cada nodo.
API:
init: inicializa el nodo
jwk.net.node.iframe:
- implementación del API jwk.net.node para un nodo de tipo iframe
init: se registra con el manager jwk.net diciendo soy un nodo. determina si es raíz (window == top) y se intenta comunicar con los otros nodos usando el protocolo
jwk.net.node.WebRTC:
- implementa el API desde el punto de vista de nodo de peers en una red sobre HTTP por internet.
- La página web del sitio jwk.net va a tener un require de este paquete pues es la base de la comunicación entre los nodos jwk
init:
- intento comunicarme con el servidor y pedir una lista de nodos recientes conocidos
- intento levantar de caché alguna lista pre salvada de alguna corrida anterior
- Intento comunicarme con todos los nodos de las listas hasta conseguir una comunicación con un mínimo de nodos
- Me fijo está presente el nodo.iframe


jwk.proxy:
- reescribir el Observable API: medio rehacer lo que ya está hecho
- trigger_local: puede ser un parámetro del trigger posta.
- register_function: function (event, callback, context)
    - quien la ejecuta, suministra un callback que es el cuerpo de la función y se ejecuta siempre en el contexto del creador (en el iframe del programa que ejecuta)
    - Eso genera un proxy[func_name] = callback dentro del contexto de quien lo ejecuta.
    - En los proxies reales de otros iframes se recibe le orden de generar la función: proxy[func_name] = function () { proxy.trigger("execute:func_name", parameters); return promise; }
    - Si ejecuta la función desde un iframe ageno ( proxy.func_name(params) ) se retorna un deferred y se genera un evento que se propaga a todos los iframes (todos?).
      Cuando lo recibe el iframe posta (el que tiene el callback) lo ejecuta y el valor de retorno lo pasa a json y lo retorna.
      finalmente el ejecutante (que está en el iframe vecino) se le ejecuta un "done" para recibir ese json.
- constraint: función que permite modificar las directivas de acceso. Éstas no son más que una lista de objetos que tienen la siguiente data:
  path: string, rama sobre la cual aplica
  r: array de strings o RegExp. Lista de quienes tienen permiso de LECTURA sobre cualquier nodo de la rama.
  Ej: /.+/, "http://localhost", /.+\.jwk\.net/ (indica cualquier subdominio)
  w: idem anterior pero ESCRITURA Y LECTURA simultáneamente



*/


/*
Proxy:
    

    register_function = function (event, callback)
    one               = function (event, callback, context)
    on                = function (event_name, callback, context, once)
    off               = function (event_name, callback, context)
    trigger_fast      = function (event_name)
    trigger           = function (event_name)
    trigger_local     = function (event_name)

    
    constraint:
    es una estructura que contiene directivas del tipo:
    path, constraint
    
    ej:
    r: significa que puede ver los datos y suscribirse a los cambios
    w: lo mismo que r y además puede modificar el dato (lo que genera un evento de cambio en los demás escuchas)
    x: puede ejecutar eventos (trigger) o funciones que fueran declaradas con register_function
    [
        { "path": "", "r": [/.+/], "w": [/.+/] } // por defecto todos pueden escribir todo
        { "path": "data.setups" }, // Excepción a lo anterior: por defecto nadie accede a ningún nodo de la rama data.setups
        {
            "path": "data.setups.app1", // Excepción a lo anterior: El setup de la aplicación app1 solo puede ser Leida (pero no modificada) por la url de la app1.
            "r": ["app1_url"]
        },
        { "function": "swap" } // nadie puede ejecutar swap. Solo puede ser ejecutada localmente
    ]
    
    
    padre:    
    proxy.set("coso", 1);
    proxy.constraint({"path": "coso"}); // NO VISIBLE
    proxy.register_function ("swap", function(path, a) {
        var temp = this.get(path);
        this.set(path, a);
        return temp;
    });
    proxy.register_function ("otro", function() {
        return this.get("otra_cosa");
    });
    proxy.swap("coso", 2); 
    
    
    iframe:
    proxy.get("coso"); // undefined porque coso no es visible    
    proxy.otro(); // la función genera un trigger que envía un evento al owner. Éste ejecuta la función y devuelve el valor de retorno.
    proxy.swap("coso", 123); // error porque la función no es visible

    
    
    
    
*/



define("jwk-net/jwk.net.proxy",[
    "jwk-base/jwk.core",
    "jwk-net/jwk.net.core", 
    "jwk-model/jwk.model"
], function(jwk, global) {
    function serialize (value) {
        return jwk.serialize(value);
    }
    /*
    global.Proxy = function () {
        jwk.Node.apply(this, arguments);        
    }
    
    global.Proxy.prototype = new jwk.Node();
    global.Proxy.prototype.constructor = global.Node;
    */
    // API
    jwk.Proxy = function (id, global) {
        jwk.Node.apply(this);
        if (arguments.length == 0) return;
        this._proxy_id = id;
        this._global = global;
        this._local_mode = false;
        this._local = new jwk.Observable();
        this._functions = new jwk.Node();
        
        global.synk(id);
        /*
        this.on("change", function (n,e){
            // DEPRECATED
            this.flag_on("prop_" + e.path, e.value);
        }, this);
        */
        this.on("change", function (n,e){
            this.flag_on("prop:" + e.path, e.value);
        }, this);
        
    }
    
    /*
    jwk.Proxy.extend = function (id, obj) {
        console.error("ESTO SE USA!")
        jwk.Proxy.apply(obj, [id, global]);
        return obj;
    }
    */
    
    jwk.Proxy.prototype = new jwk.Node();
    jwk.Proxy.prototype.constructor = jwk.Proxy;
    
    jwk.Proxy.prototype.proxy_id = function () {
        return this._proxy_id;
    }       
    jwk.Proxy.prototype.wait_function = function (name) {
        return this.wait_flag("function:" + name);
    }
    jwk.Proxy.prototype.change_id = function (new_id) {        
        this._global.change_id(this._proxy_id, new_id);        
    }    
    
    jwk.Proxy.prototype.wait_prop = function (name) {
        return this.wait_flag("prop:" + name);
    }    
    
    // Observable API
    jwk.Proxy.prototype.one = function () {
        this._local.one.apply(this._local, arguments);
    }
    jwk.Proxy.prototype.on = function () {
        this._local.on.apply(this._local, arguments);
    }
    jwk.Proxy.prototype.off = function () {
        this._local.off.apply(this._local, arguments);
    }

    jwk.Proxy.prototype.on_set = function (prop, value, old_value) {
        var event = {
            event_name: "change:" + prop,
            path: prop,
            value: value,
            old_value: old_value,
            target: this,           
        }        
        this.trigger_fast(event.event_name, event);        
        this.trigger_fast("change", event);        
        this.trigger_extern(event.event_name, event);
    }
        
    jwk.Proxy.prototype.trigger = function (n,e) {        
        if (arguments[0] !== false) {
            // adentro tambien
            this._local.trigger.apply(this._local, arguments);
        }        
        this.trigger_extern(n, e);
    }
    
    jwk.Proxy.prototype.trigger_fast = function () {
        this._local.trigger_fast.apply(this._local, arguments);
    }
    
    jwk.Proxy.prototype.trigger_extern = function (n,e) {
        if (!this._local_mode) {
            // proxy as second argument for proxy_trigger
            
            if (n.indexOf("change") == 0) {
                delete e.target;
                delete e.old_value;
                delete e.stack;
            }
            var args = Array.prototype.map.apply(arguments, [function(n) {
                return serialize(n);
            }]);
            
            // HACK:
            // cuando un proxy tiene una propiedad de tipo jwk.Node esta se propaga serealizada sin diferencia con un Objeto normal
            // Al instanciarlo do vuelta en otro iframe se instancia como un Objeto normal y pierde las propiedades del jwk.Node
            if (n.indexOf("change") == 0 && e.value instanceof jwk.Node) {                
                args[1].value.__parse_jwk_node__ = true; 
            }
            
            args.splice(1,0,this._proxy_id);
            this._global.trigger_event.apply(this._global, args);
        }        
    }
    
    jwk.Proxy.prototype.trigger_local = function (msj) {
        if (arguments.length == 2) {
            console.assert(typeof arguments[0] == "string", arguments);
            this._local.trigger(arguments[0],arguments[1]);
            return;
        }
        this._local.trigger(msj.event.name, msj.event.data);
    }
    
    jwk.Proxy.prototype.execute_local = function (msj) {
        this._local_mode = true
        this._local.trigger(msj.invo.name, msj.event.data);
        this._local_mode = false;
    }
    
    jwk.Proxy.prototype.set_local = function (path, value) {
        this._local_mode = true        
        if (typeof value == "undefined") {
            this.unset(path);
        } else {
            // HACK
            if (value.__parse_jwk_node__) {
                delete value.__parse_jwk_node__;
                value = new jwk.Node(value);
            }
            this.set(path, value);
        }
        this._local_mode = false;
    }
    
    jwk.Proxy.prototype.update_local = function (msj) { // tenés que actualizar el valor localmente y dejar que el evento change se dispare pero no puede salir de este frame.
        this._local_mode = true
        // console.log(global.whoami(),"update_local <", msj, this.valueOf());
        if (msj.path) {
            //this.set(msj.proxy_id + "." + msj.path, msj.data);
            var data = jwk.extend({}, msj.data);
            // HACK
            if (data.__parse_jwk_node__) {
                console.debug("!!!!----------->", data, msj);
                delete data.__parse_jwk_node__;
                data = new jwk.Node(data);
            }
            this.set(msj.path, data);
        } else {
            this.map(msj.data);
            // console.log("updated -->", this._proxy_id);
            this.flag_on("updated");
        }
        // console.log(global.whoami(),"update_local >", msj, this.valueOf());
        this._local_mode = false;
    } 

    jwk.Proxy.prototype.register_remote_function = function (func_name, callback) {
        var proxy = this;
        proxy._functions.set(func_name, callback);
        proxy[func_name] = callback;
        proxy.flag_on("function:" + func_name);
        // proxy.flag_on("function_" + func_name); // DEPRECATED
    }    
    
    jwk.Proxy.prototype.register_function = function (func_name, callback, context) {
        // console.log("register_function", func_name);
        if ( typeof func_name == "object" ) {
            for (var name in func_name) {
                var func = func_name[name];
                if (typeof func == "function" ) {
                    this.register_function(name, func, callback);
                } else {
                    console.warn("WARNING: registering proxy function " + name + " but its type is ", typeof func);
                }
            }
            return this;
        }
        
        // if (typeof this[func_name] != "undefined") console.warn("WARNING: We are about to overwrite "+func_name+" wich current value is", typeof this[func_name], this[func_name]);
        
        if (typeof this[func_name] == "undefined") {
            (function (proxy, func_name, callback, context) {
                proxy._functions.set(func_name, callback);
                proxy[func_name] = function () {
                    var ret = callback.apply(context ? context : proxy, arguments);
                    if (typeof ret != "object" || typeof ret.done != "function" || typeof ret.fail != "function") {
                        ret = jwk.Deferred().resolve(ret);
                    }                 
                    return ret;
                }            
            })(this, func_name, callback, context);
        }
        
        global.register(func_name, this._proxy_id);
        this._local.trigger("api_update", {proxy: this, name: func_name});
        this.flag_on("function:" + func_name);
        // this.flag_on("function_" + func_name); // DEPRECATED
    }
    
    jwk.Proxy.prototype.api = function () {
        return this._functions.keys();
    }
    
    jwk.Proxy.prototype.execute_function = function (name, args) {
        var deferred = jwk.Deferred();
        if (typeof this[name] == "function") {
            // in this iframe or worker was declared registered this function so we may invoke it
            try {
                var ret = this[name].apply(this, args);
                if (typeof ret == "object" && typeof ret["done"] == "function") {
                    ret.done(function () {
                        deferred.resolve.apply(deferred, arguments);
                    })
                } else {
                    deferred.resolve(ret);
                }
                return deferred.promise();
            } catch (err) {
                return deferred.reject(err);
            }
            return deferred.resolve(ret);
        }
        deferred.reject("PROXY");
    }
});

define("jwk-net/jwk.net.mouse", [
    "jwk-model/jwk.model",
    "jwk-net/jwk.net.core",
    "jwk-net/jwk.net.proxy"
], function(jwk, global) {
    var mouse_global_id = "jwk.global.mouse";
    

    jwk.GlobalMouse = function (id, global) {
        var mouse = this;

        
        mouse.last_pageY = -1;
        mouse.last_pageX = -1;
        jwk.Proxy.apply(this, arguments);
                
        var events = [
            "click",      // The event occurs when the user clicks on an element
            "dblclick",   // The event occurs when the user double-clicks on an element
            "mousedown",  // The event occurs when a user presses a mouse button over an element
            "mousemove",  // The event occurs when the pointer is moving while it is over an element
            "mouseover",  // The event occurs when the pointer is moved onto an element
            "mouseout",   // The event occurs when a user moves the mouse pointer out of an element
            "mouseup",    // The event occurs when a user releases a mouse button over an element	     
            "contextmenu"
        ];
        
        
        for (var i=0; i<events.length; i++) {
            var event = events[i];
            var onevent = "on"+event;
            
            window[onevent] = function (event) {
                
                if (event.type == "mousemove") {
                    if (mouse.last_pageY == event.pageY && mouse.last_pageX == event.pageX) {
                        // the mouse dosn't really moved. Cancel event
                        // console.log("aborting mouse move");
                        return this;
                    }
                }
                mouse.last_pageY = event.pageY;
                mouse.last_pageX = event.pageX;
                
                // if (simple) {
                    // Posible optimización: usar el trigger_fast
                    // Se podría mantener un objeto event pre hecho y que solo necesite actualizar pageX, pageY y timeStamp. Así evitar pasar datos innecesarios
                    var evt = {
                        altKey:             event.altKey,
                        ctrlKey:            event.ctrlKey,
                        metaKey:            event.metaKey,
                        pageX:              event.pageX,
                        pageY:              event.pageY,
                        shiftKey:           event.shiftKey,
                        timeStamp:          event.timeStamp,
                        type:               event.type
                    }                    
                    mouse.trigger_extern(event.type, evt);
                    
                    evt.currentTarget = event.currentTarget;
                    evt.target = event.target;                    
                    
                    mouse._local.trigger(event.type, evt);
                /*} else {
                    mouse.trigger(event.type, {
                        altKey:             event.altKey,
                        bubbles:            event.bubbles,
                        button:             event.button,
                        cancelBubble:       event.cancelBubble,
                        cancelable:         event.cancelable,
                        charCode:           event.charCode,
                        clientX:            event.clientX,
                        clientY:            event.clientY,
                        clipboardData:      event.clipboardData,
                        ctrlKey:            event.ctrlKey,
                        currentTarget:      event.currentTarget,
                        dataTransfer:       event.dataTransfer,
                        defaultPrevented:   event.defaultPrevented,
                        detail:             event.detail,
                        eventPhase:         event.eventPhase,
                        fromElement:        event.fromElement,
                        keyCode:            event.keyCode,
                        layerX:             event.layerX,
                        layerY:             event.layerY,
                        metaKey:            event.metaKey,
                        offsetX:            event.offsetX,
                        offsetY:            event.offsetY,
                        pageX:              event.pageX,
                        pageY:              event.pageY,
                        relatedTarget:      event.relatedTarget,
                        returnValue:        event.returnValue,
                        screenX:            event.screenX,
                        screenY:            event.screenY,
                        shiftKey:           event.shiftKey,
                        srcElement:         event.srcElement,
                        target:             event.target,
                        timeStamp:          event.timeStamp,
                        toElement:          event.toElement,
                        type:               event.type,
                        view:               event.view,
                        webkitMovementX:    event.webkitMovementX,
                        webkitMovementY:    event.webkitMovementY,
                        which:              event.which,
                        x:                  event.x,
                        y:                  event.y
                    });
                }
                */
                /*for (var name in event) {
                    console.log(name, typeof event[name], event[name]);
                }*/
                if (event.type == "contextmenu") {
                    return false;
                }
                
            };
        }
    };
    
    
    jwk.GlobalMouse.prototype = new jwk.Proxy();
    jwk.GlobalMouse.prototype.constructor = jwk.GlobalMouse;    
    
    jwk.global.mouse = global.proxy(mouse_global_id, jwk.GlobalMouse);
    
    return jwk.global.mouse;
});



define("jwk-net/jwk.net.keyboard",[
    "jwk-model/jwk.model",
    "jwk-net/jwk.net.core",    
    "jwk-net/jwk.net.proxy"
], function(jwk, net) {
    var keyboard_net_id = "jwk.net.keyboard";
  
    jwk.NetKeyboard = function (id, net) {
        var keyboard = this;
        
        keyboard.last_pageY = -1;
        keyboard.last_pageX = -1;
        jwk.Proxy.apply(this, arguments);
                
        var events = [
            "keydown",
            "keypress",
            "keyup",
            "change",
        ];        
        
        for (var i=0; i<events.length; i++) {
            var event = events[i];
            var onevent = "on"+event;
            
            window[onevent] = function (event) {

                keyboard.last_pageY = event.pageY;
                keyboard.last_pageX = event.pageX;            

                var evt = {
                    altKey:             event.altKey,
                    ctrlKey:            event.ctrlKey,
                    metaKey:            event.metaKey,
                    pageX:              event.pageX,
                    pageY:              event.pageY,
                    shiftKey:           event.shiftKey,
                    timeStamp:          event.timeStamp,
                    type:               event.type
                }                    
                // -----------------------------------------
                // http://stackoverflow.com/a/27240494/2274525
                //Google chrome retardedness
                if(event.keyIdentifier) {
                    evt.keyCode       = parseInt(event.keyIdentifier.substr(2), 16);
                }
                //not that the other browsers are any closer to something systematic and logical
                else {
                    evt.keyCode       = event.keyCode;
                }                
                // -----------------------------------------

                keyboard.trigger_extern(event.type, evt);

                evt.currentTarget = event.currentTarget;
                evt.target = event.target;                    

                keyboard._local.trigger(event.type, evt);

                if (event.type == "contextmenu") {
                    return false;
                }
                
            };
        }
    };
    
    
    jwk.NetKeyboard.prototype = new jwk.Proxy();
    jwk.NetKeyboard.prototype.constructor = jwk.NetKeyboard;    
    
    jwk.net.keyboard = net.proxy(keyboard_net_id, jwk.NetKeyboard);
    
    return jwk.net.keyboard;
});



/*
caso 1: arrastrando desde el opfolders.com
- original: no se mueve. Queda ahi donde estaba.
- padre: crea una copia del target y la arrastra.
- hermano: on start drag tiene que decir si acepta o no el drop.
- drop: si el frame que recibe el drop lo acepta, hace algo con la info. Si no, no pasa nada.

caso 2: Idem caso 1 con custom look
- original: idem anterior. Puede setear un look específico como cualquier otro frame.
- hermano: un frame que acepta el drop además puede setear un aspecto específico al drag helper mientras es arrastrado SOBRE éste frame.
- padre: si el padre recibe un custom look de algún frame, cuando pase sobre éste deberá, sustituir el helper por el encomendado.

caso 3: tenés una playlist y arrastras una entry hacia afuera de la lista
- original: setea un custom look = null.
- padre: mientras se hace drag sobre el original no se muestra el helper

caso 4: quiero pasar objetos de un iframe a otro
http://jsfiddle.net/aw9Xa/
http://jsfiddle.net/6tgnqm8f/3/
- origen: apenas empieza el drag debe poner transparente el objeto original
- padre: Idem caso 3.
- drop: cada frame se fija si le cae encima. Si sucede crea el objeto y se lo queda (lo agrega como draggable). 


Observaciones:
- El padre debe saber sobre que ifram está pasando en cada momento ( y avisarles? )
- El padre debe saber en que iframe se realiza el drop


agregados al jwk.ui.set-dragagble:
- se debería poder setear una restriccion que aplique cuando el objeto dragado sale de un área específica (ejemplo el padre).
  Esto podría servir para hacer un reordenamiento de la playlist y si se sale para afuera del recuadro que se convierta en otro objeto draggable
  (onda que se pueda dropear sobre otro objeto)

*/

/*
BUGS:
- cuando soltás un objeto en el root, este queda con el z-indez 999
- el drop recibe mal el dato de que el drop fue en su iframe.
  Si el drop se realiza sobre la intersección de dos iframes, ambos reciben inside_this_document = true y está mal
- pasa que cuando hay un solapamiento de ventanas y el mouse se encuentra sobre la intersección no se toma en cuenta cual está más arriba y eso está mal.
*/




define("jwk-net/jwk.net.dragndrop",[
    "jwk-base/jwk.core",
    "jwk-net/jwk.net.core",
    "jwk-net/jwk.net.mouse",
    "jwk-net/jwk.net.proxy"     
], function(jwk, global, mouse) {
  
    var debug = false;
    var iframe = null;
    var body = null;

    var _default = {
        target_css: {
            opacity: 0
        },
        auto_add: true,
        revert: "invalid",
        revertDuration: 500,
    }
    var drag_global_id = "jwk.global.dragndrop";
    var drag_ontop_aux_id = "draggable-ontop";
    

    jwk.global.DragAndDrop = function (id, global) {        
        var dragndrop = this;
        this.is_dragging = false;
        jwk.Proxy.apply(this, arguments);
        
        iframe = global.iframe;
        delete global.iframe;
        
        this._last_mouse_event = null;
        this._draggables = [];
        this._candidate = null;
        this._known_children = {};
        
        /*mouse.on("mouseover mouseout", function (ev_name, ev) {
            console.log(global.whoami(true), arguments);
        });*/
        
        // ---------------------------------------------------
        global.on("parent", function (n,e) {
            // Wait for global to comunicate with parent and then say hello to DragAndDrop parent instance.
            this.trigger("hello", {id: global.id});
        }, this);
        
        global.on("disconnect", function (n, e) {
            delete this._known_children[e.id];
        }, this);
        
        this.on("hello", function (n,e ) {
            // wait for child to trigger hello to registrate it.
            if (global.has_child(e.id)) {
                this._known_children[e.id] = e;
                // console.log(global.whoami(true), arguments, this._known_children);
            }            
        }, this);
        
        // ---------------------------------------------------
        mouse.on("mouseup", function (ev_name, ev) {
            global.dragndrop._last_mouse_event = ev;
            if (global.dragndrop.is_dragging) {
                if (debug) console.log(global.whoami(true), ev_name, [ev.pageX, ev.pageY], "inside:", global.dragndrop._inside_this_document, [global.dragndrop._dragging]);
                global.dragndrop.drop(global.dragndrop._inside_this_document);
            }
            this._candidate = null;
        }, this);

        mouse.on("mousedown", function (ev_name, ev) {
            // console.log("mousedown");
            global.dragndrop._last_mouse_event = ev;
            // console.log({top:ev.pageY, left:ev.pageX});
            var target = jwk.query(ev.target);
            for (var i=0; i<this._draggables.length; i++) {
                var draggable = this._draggables[i];
                var filtered = target.closest(draggable.target);
                if (filtered.length > 0) {
                    this._candidate = jwk.extend({}, draggable, {target: filtered});                    
                    mouse.one("mousemove", function (ev_name, ev) {
                        if (this._candidate && !global.dragndrop.is_dragging) {                        
                            this.start_drag(this._candidate);
                        }
                    }, this);     
                }
            }
        }, this);
        
        this.on("drop-reject drop-accept", function (ev_name, ev) {
            if (debug) console.log(global.whoami(true), ev_name, ev.accept, [this._dragging]);
            this._dragging.accept = ev.accept;
        }, this);            
        
        this.on("drag-"+global.id, function (ev_name, ev) {
            // console.log(global.whoami(true), arguments, this._options);
            body == body || jwk.query("body");
            this._inside_this_document = ev.drag == "over";
            if (this._inside_this_document) {
                if (debug) console.log(global.whoami(true), ev_name, [this._options, this._dragging]);
                if (this._options.reject) {
                    body.addClass("drop-reject");
                    this.trigger("drop-reject", { id: global.id, accept:false });
                } else {
                    body.addClass("drop-accept");
                    this.trigger("drop-accept", { id: global.id, accept:true });
                }
            } else {            
                body.removeClass("drop-accept").removeClass("drop-reject");
            }
        }, this);
        
        this.on("start_drag", function (ev_name, ev) {            
            // console.log("DragAndDrop.start_drag", global.whoami(true), arguments);
            // console.log(global.whoami(true), arguments);
            var data = this.dragging_data;
            if (data instanceof jwk.Node) data = data.json();
            this._options = this._options? this._options : jwk.extend({}, _default);
            
            if (debug) console.log(global.whoami(true), ev_name, "is_root:", global.is_root(), [data, this._options]);
            
            this.is_dragging = true;
            this._dragging = {
                offset: ev.offset,
                target: ev.target
            }
            this._inside_this_document = false;
            
            if (this._started_here) {
                if (this._options.target_css) {
                    this._options.restaure_style = this._dragging.target.attr("style"); // no se si debería ir en options
                    this._dragging.target.css(this._options.target_css);
                }
            }
            
            if (global.is_root()) {
                var aux = jwk.query(ev.html).appendTo("body");                
                this._dragging.helper = aux;
                var of = ev.offset;
                var left = of.left + global.dragndrop._last_mouse_event.pageX;
                var top  = of.top  + global.dragndrop._last_mouse_event.pageY;
                //var left = of.left;
                //var top  = of.top;
                this._dragging.init_offset = {top:top, left: left};
                aux.offset(this._dragging.init_offset);
                
                var order = [];
                for (var id in this._known_children) {
                    var entry = iframe.get(id);                    
                    if (entry) {
                        var fr = entry.iframe();
                        var of = fr.offset();
                        entry.left = of.left;
                        entry.top = of.top;
                        entry.right = of.left + fr.width();
                        entry.bottom = of.top + fr.height();
                        entry.id = entry.global();
                        order.push(entry);
                    }
                }
                
                this._known_children.order = order.sort(function (a,b) {
                    var a_iframe = a.iframe();
                    var b_iframe = b.iframe();
                    var parent = a_iframe.parents().has(b_iframe).first();
                    var A = parent.children().has(a_iframe).first();
                    var B = parent.children().has(b_iframe).first();
                    
                    var nodeList = Array.prototype.slice.call( parent[0].children );
                    var A_index = nodeList.indexOf( A[0] );
                    var B_index = nodeList.indexOf( B[0] );
                    
                    var A_zIndex = A.css("z-index") || 0;
                    var B_zIndex = B.css("z-index") || 0;

                    if (A_zIndex > 0 || B_zIndex > 0) {
                        if (A_zIndex > B_zIndex) return -1;
                        if (A_zIndex < B_zIndex) return 1;                        
                    }
                    if (A_index > B_index) return -1;
                    return 1;
                });
                                                

                function iframe_under(ev) {                    
                    for (var i in global.dragndrop._known_children.order) {                        
                        var entry = global.dragndrop._known_children.order[i];                        
                        if (ev.pageX > entry.left &&
                            ev.pageY > entry.top  &&
                            ev.pageX < entry.right &&
                            ev.pageY < entry.bottom
                        ) {
                            return entry.id;
                        }            
                    }
                    return global.id;
                } 
                var current = null;                
                
                
                mouse.on("mousemove", function (ev_name, ev) {
                    // console.log("DragAndDrop", global.whoami(true), arguments, "is_dragging:", global.dragndrop.is_dragging);
                    if (global.dragndrop.is_dragging) {
                        // console.log(global.whoami(true));
                        var iframe_id = iframe_under(ev);
                        console.log(iframe_id);
                        if (current != iframe_id) {
                            if (current) this.trigger("drag-"+current, {drag:"out"});
                            current = iframe_id;
                            this.trigger("drag-"+current, {drag:"over"});
                            // console.log(global.whoami(true), "current:", current);
                        }
                        var aux = this._dragging.helper; // jwk.query("#" + drag_ontop_aux_id);
                        console.assert(aux && aux.length > 0, this._dragging, this);
                        var of = this._dragging.offset;
                        var left = of.left + ev.pageX;
                        var top  = of.top  + ev.pageY;
                        aux.offset({top:top, left: left});                        
                    }
                }, this);
                // console.error(global.whoami(true), mouse._local._listeners.mousemove);
            }
        }, this);
            
    };    
    
    jwk.global.DragAndDrop.prototype = new jwk.Proxy();
    jwk.global.DragAndDrop.prototype.constructor = jwk.global.DragAndDrop;
       
    jwk.global.DragAndDrop.prototype.drop = function (inside) {
        var data = jwk.serialize(this.dragging_data);        
        if (debug) console.log(global.whoami(true), "drop", "inside:", inside, "accept:", this._dragging.accept,
                               "started_here:", this._started_here, "options.reject:", this._options.reject, [data, this._options]);
        this.is_dragging = false;        
        data.here = !!inside;
        if (data.here) {
            var new_obj = null;
            if (this._options.reject) {
                // console.error("sin implementar");
            } else {
                if (this._started_here) {
                    var aux = jwk.query(data.html).appendTo("body").id("AUX");
                    new_obj = this._dragging.target.css("position","absolute").offset(aux.offset());
                    new_obj.css("opacity", 1);
                    aux.remove();
                    if (this._dragging.helper && this._dragging.helper.length) {
                        this._dragging.helper.remove();
                    }
                } else if (this._dragging.helper && this._dragging.helper.length) {
                    new_obj = this._dragging.helper.clone();                    
                    this._dragging.helper.remove();
                } else {
                    new_obj = jwk.query(data.html);
                }
                new_obj.appendTo(this._options.container || jwk.query("body"));
                var le = this._last_mouse_event;
                var of = this._dragging.offset;
                new_obj.offset({top: of.top + le.pageY, left: of.left + le.pageX});
                new_obj.css("z-index",data.prevcss.zIndex);
                data.target = new_obj;
                if (this._options.auto_add) this.add(data);
            }
        } else {
            // console.log(global.whoami(true), "data.here == false");
            if (this._started_here) {
                // console.log(global.whoami(true), "this._started_here == true");
                // TODO: 
                if (this._dragging.accept) {
                    // console.log(global.whoami(true), "this._dragging.accept == true", this._dragging.target);
                    // se sabe que se acepta el drop                    
                    this._dragging.target.remove();
                } else {
                    // console.log(global.whoami(true), "this._dragging.accept == false");
                    // se sabe que se cancela el drop
                    // this._dragging.target.css(this._options.css_restaure);
                    if (this._options.revert == "invalid") {
                        console.log(global.whoami(true), "this._options.revert == invalid");
                        var target = this._dragging.target;
                        var restaure_style = this._options.restaure_style;
                        setTimeout(function () {
                            // console.log(global.whoami(true), 'this._dragging.target.attr("style", '+restaure_style+');');
                            target.attr("style", restaure_style);                            
                        }, this._options.revertDuration);
                    }
                }                
            }
            var helper = this._dragging.helper;
            if (helper && helper.length) {
                if (this._dragging.accept) {
                    helper.remove();
                } else {                    
                    helper.animate(this._dragging.init_offset, this._options.revertDuration, "swing", function () {
                        helper.remove();
                    })
                }
            }
        }
        global.dragndrop.trigger_local("drop", data);        
        // console.log("------------");
        mouse.off("mousemove", null, this);
        body == body || jwk.query("body");
        body.removeClass("drop-accept").removeClass("drop-reject");
        if (this._started_here) {
            this.dragging_data = null;
        }
        delete this._started_here;
        delete this._options;        
        //console.log("this._options: ", this._options);        
    }
    
    jwk.global.DragAndDrop.prototype.add = function (draggable) {
        if (typeof draggable == "string" || draggable instanceof jwk.query) {
            // se asume que es un jquery valid selector
            draggable = { target: draggable };
        } else {
            console.assert(draggable.target, draggable);
        }
        this._draggables.push(draggable);
    }
    
    jwk.global.DragAndDrop.prototype.options = function (opt) {
        for (var prop in opt) {
            if (this._options[prop] != opt[prop]) {
                switch (prop) {
                    case "reject":
                        // console.log(global.whoami(true), "reject");
                        break;
                    default:
                        console.log("option not handled:", prop, opt[prop], opt);
                }
                this._options[prop] = opt[prop];
            }
        }
    }
    
    jwk.global.DragAndDrop.prototype.start_drag = function (data, _options) {
        /*
        data.target: jquery valid selector or object. Must select exactly 1 object
        what erer else you want to pass
        */
        
        // this.style();
        delete this._candidate;
        if (this.dragging) return this;        
        
        var options = jwk.extend({}, _default, _options);
        this._options = options;
        
        var target = jwk.query(data.target)[0];
        console.assert(target.length > 0, data.target, data);
        
        // console.log("css_snapshot: ", target.css_snapshot().css)
        var style = target.style();
        var aux = target.clone().attr("id", drag_ontop_aux_id).css(style);
        aux.appendTo(jwk.query("body"));
        var new_css = {
            "position": "absolute",
            "z-index": 999,
            "width": target.width(),
            "height": target.height(),
            "bottom": "",
            "right": "",
            "margin": "0px",
            "top": target.offset().top - this._last_mouse_event.pageY,
            "left": target.offset().left - this._last_mouse_event.pageX,
        }
        aux.css(new_css);
        var offset = aux.offset();
        var html = jwk.query("<div></div>").append(aux).html();
        
        this._started_here = true;
        
        this.set("dragging_data", jwk.extend({
            html: html
        }, data, {
            path: target.path(),            
            offset: offset,
            prevcss: style
        }), {no_parse: true});

        // console.log(offset, [html]);
        this.trigger("start_drag", this.dragging_data);    
        
        return this;
    }    
    
    jwk.global.dragndrop = global.proxy(drag_global_id, jwk.global.DragAndDrop);
    
    return jwk.global.dragndrop;
});



define("jwk-net/jwk.net", [
    "jwk-base/jwk.core",
    "jwk-net/jwk.net.core",
    "jwk-net/jwk.net.proxy",
    "jwk-net/jwk.net.mouse",
    "jwk-net/jwk.net.keyboard",
    "jwk-net/jwk.net.dragndrop"
], function(jwk, net) {
    return net;
});
// --------------------------------------------------------------------------------------------------------------------------
//
// -- JWK --

define("jwebkit", [    
    "jwk-base/jwk",
    "jwk-model/jwk.model",
    "jwk-ajax/jwk.ajax",
    "jwk-net/jwk.net",
], function(jwk){
    var Fn = Function, window = (new Fn("return this"))();
    if (!define.amd || define.amd.fake) {
        window.jwk = jwk;
    }
    console.debug("-- jwebkit --", jwk);
    return jwk;    
});

if (window["jwebkit_must_require"]) {
    console.log("jwebkit_must_require");
    requirejs("jwebkit");
} else {
    
}
;
