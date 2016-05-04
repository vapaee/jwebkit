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

