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
        var _listeners = {};
        var _filters   = {}; // this is not fully implemented but already works: target._filters["event-name"] = function (args) { /* modification */ return args; }
        
        Object.defineProperty(this, "_listeners", {
            enumerable: false, configurable: false,
            get : function () { return _listeners; },
            set : function (_val) { return _listeners = _val; }
        });        
        
        Object.defineProperty(this, "_filters", {
            enumerable: false, configurable: false,
            get : function () { return _filters; },
            set : function (_val) { return _filters = _val; }
        });
        
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
                this.on(events[ev], callback, context, options);
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
            
            if (typeof listener.lazy != "undefined") {
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

