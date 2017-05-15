define("jwk-model/jwk.flagged", [
    "jwk-base/jwk.core"
], function(jwk) {
    console.assert(jwk.Deferred, jwk)
    jwk.Flagged = function () {
        var _flags = { _deferreds: {} };
        Object.defineProperty(this, "_flags", {
            enumerable: false, configurable: false,
            get : function () { return _flags; },
            set : function (_val) { return _flags = _val; }
        });       
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


