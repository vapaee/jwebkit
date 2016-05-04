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


