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

            