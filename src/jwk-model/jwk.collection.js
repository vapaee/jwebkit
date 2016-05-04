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

