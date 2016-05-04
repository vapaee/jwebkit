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

