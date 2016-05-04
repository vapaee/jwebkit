
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
