
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


