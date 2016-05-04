define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
  

    
    /*
dialog (modal)    
dialog.ask
dialog.alert
dialog.window    
    */
    // jwk.ui.dialog library namespace
    jwk.ui.dialog = {}
    
    // Dialog ----------------------------------------------------------------------------------
    jwk.ui.dialog.Dialog = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "dialog",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Dialog,
        "extends": jwk.ui.panel.Panel,
        "defaults": {}
    });      
    
    // Dialog Ask ----------------------------------------------------------------------------------
    jwk.ui.dialog.Ask = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.dialog.Dialog.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "dialog.ask",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Ask,
        "extends": jwk.ui.dialog.Dialog,
        "defaults": {}
    });      
    
    // Dialog Alert ----------------------------------------------------------------------------------
    jwk.ui.dialog.Alert = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.dialog.Dialog.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "dialog.alert",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Alert,
        "extends": jwk.ui.dialog.Dialog,
        "defaults": {}
    });  

    // Dialog Window ----------------------------------------------------------------------------------
    
     var div = $("<div></div>").css("position","absolute");
    
    jwk.ui.dialog.Window = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "dialog.window").defaults();
        
        if (settings.resizable === true) delete settings.resizable;
        if (settings.resizable === false) delete def.resizable;
        if (settings.draggable === true) delete settings.draggable;
        if (settings.draggable === false) delete def.draggable;
        var win_settings = jwk.extend({},def, settings);
        win_settings.resizable = jwk.extend(def.resizable, settings.resizable);
        win_settings.position = jwk.extend(def.position, settings.position);
        win_settings.size = jwk.extend(def.size, settings.size);
        
        jwk.ui.dialog.Dialog.call(this, win_settings);
        
        this.set("state", "normal");
        this.set("controls", win_settings.controls, {no_parse: true});        
        this.set("layout", win_settings.layout, {no_parse: true});
        this.set("min_mode", this.settings.min.mode);
        this.set("title", win_settings.title);
        this.set("icon", win_settings.icon ? "none" : "default");
        this.set("icon_src", win_settings.icon ? win_settings.icon : null);
        this.set("icon_is_src", win_settings.icon? true : false);
                        
        var win = this;
        this.on("feature:selectable", function (n, e) {
            e.controller.on("select", function (_n, _e) {
                _e.component = _e.controller.component;
                _e.component.trigger_fast(_n, _e);
            })
        }, this);
        
        function prepare_event_data (win, target) {
            var snapshot = jwk.ui.snapshot(target);
            var css = snapshot.css;
            // TODO: acá capaz que vale la pena estudiar la situación actual de la ventana.
            // y no siempre poner un my: top left (que en principio puede ser una solución
            var pos   = { my: "center center", at: "center center", of: "container" };
            var size  = { width: snapshot.css.width, height: snapshot.css.height };                
            var state = win.get("state");

            if (css.left == "0%") {
                pos.at = (50 - parseFloat(css.right) * 0.5) + "% ";
            } else if (css.right == "0%") {
                pos.at = (50 + parseFloat(css.left) * 0.5) + "% ";
            } else {
                if (win.get("state") == "normal") {
                    console.error("ERROR: left-right position must be expressed in percentage and one of them must be 0%");
                }
            }

            if (css.top == "0%") {
                pos.at += (50 - parseFloat(css.bottom) * 0.5) + "%";
            } else if (css.bottom == "0%") {
                pos.at += (50 + parseFloat(css.top) * 0.5) + "%";
            } else {
                if (win.get("state") == "normal") {
                    console.error("ERROR: top-bottom position must be expressed in percentage and one of them must be 0%");
                }
            }
            
            return {
                window: win,
                size: size,
                position: pos,
                state: state
            }
            
        }

        this.on("feature:draggable", function (n, e) {
            e.controller.on("stop", function (_n, _e) {                
                win.trigger("move", prepare_event_data(win, _e.target));
            })
        }, this);

        this.on("feature:resizable", function (n, e) {
            e.controller.on("stop", function (_n, _e) {
                win.trigger("resize", prepare_event_data(win, _e.target));
            })
        }, this);
        
        this.on("change:state", function (n, e) {            
            console.debug("state -> ", e.value);
            this.trigger("state", prepare_event_data(win, win.target));        
        }, this); 
        

        this.on("destroy", function (n, e) {
            this.trigger_fast("close", e);
        }, this);
        
        this.on("change:min_mode", function (n, e) {
            this.min = e.value.valueOf();
        }, this); 
        
        this.on("change:structure", function (n, e) {
            
        });
        
        this.on("change:state", function (n, e) {
            this.set("prev_state", e.old_value);
        }, this);
        
        this.on("change:title", function (n, e) {
            console.log("El title de la ventana debería ser: ", e.value);
            e.target.set_title(e.value);
        }, this);
        
        this.on("change:has_menubar", function (n, e) {
            e.target.show_menubar(e.value);
        });
        
        this.on("render", function (n,e){
            var win = e.component;
            win.show_menubar();
            win.controllers.resizable.on("resize", function () {
                this.search("menubar").close();
                this.search("menubar").paint();
            }, win);
            win.controllers.draggable.on("stop", function () {
                this.search("menubar").paint();
            }, win);            
            win.controllers.draggable.on("start", function () {
                this.search("menubar").close();
            }, win);            
            win.search("menubar").paint();
        })
        
        this.on("change:menubar_data", function (n, e) {
            e.target.set("has_menubar",!!e.value);        
        });
        
        this.on("change:structure", function (n,e) {
            var structure = e.value;
            var win = this;
            
            structure.search("menubar").on("open",function () {
                win.add_class("covored");
            }).on("close", function () {
                win.remove_class("covored");
            });
            
            structure.search("controls").on("click", function (n, e) {                
                switch (e.entry) {
                    case "max":
                        if (this.get("state") != "maximized") {
                            this.maximize();
                        } else {
                            this.normal();
                        }
                        break;
                    case "min":
                        if (this.get("state") != "minimized") {
                            this.minimize();
                        } else {
                            this.restore();
                        }
                        break;
                    case "full":
                        if (this.get("state") != "fullcanvas") {
                            this.fullcanvas();
                        } else {
                            this.normal();
                        }
                        break;
                    case "close":
                        this.close();
                        break;
                    default:
                        console.log(n,e.entry, e);
                }
            }, win);
            
            structure.search("border-n").on("dblclick", function (n,e) {
                if (this.get("state") != "maximized") {
                    this.maximize();
                } else {
                    this.normal();
                }                
            }, win);
            
        }, this)
        
        
        if (win_settings.menubar) this.set("menubar_data", win_settings.menubar, {no_parse:true});         
        
        
        
    }
    
    jwk.ui.component({
        "ui_type": "dialog.window",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Window,
        "extends": jwk.ui.dialog.Dialog,
        "defaults":{
            "draggable": {
                "zIndex": ".jwk-ui.window"
            },
            "resizable": {
                "handles": "all"
            },
            "delay": 500,
            "min": {
                "position": {
                    "my": "left bottom",
                    "at": "left bottom",
                    "of": "container",
                    // tween ????
                },
                "mode": "foot",
            },            
            "size": {
                "width": "60%",
                "height": "70%",
                "min-width": "200px",
                "min-height": "100px"
            },
            "position": {
                "update_on": "skin",
                "my": "center center",
                "at": "center center",
                "of": "container"
            },
            "controls": ["min", "max", "close"],
            "layout": [
                ["border-nw", "border-n", "border-ne"],
                ["border-w", ["menubar","content"], "border-e"],
                ["border-sw", "border-s", "border-se"]
            ],
            "template": {
                "main": "<div style='position: absolute; min-height: 300px; min-width: 450px;'></div>"
            }
        },        
        "api": {
            "set_title": function (title) {
                this.target.find("[name=title].panel").text(title);
            },
            "save_state": function () {
                this.set("prev_state", this.get("state"));
                if (this.get("state") == "normal") {
                    this.normal_style = this.target.attr("style");            
                    var dummie = div.clone();
                    this.target.after(dummie);
                    dummie.offset(this.target.offset());                        
                    this.normal_css = {
                        "width": this.target.width(),
                        "height": this.target.height(),                    
                        "top": dummie.css("top"),
                        "left": dummie.css("left"),
                        "opacity": this.target.css("opacity")
                    }
                    dummie.remove();
                }
            },
            "maximize": function () {
                /*/
                return this.maximize_jquery.apply(this, arguments);
                /*/
                return this.maximize_css3.apply(this, arguments);
                //*/
            },
            "maximize_css3": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("maximize", { component: this });        
                var win = this;
                this.save_state();
                this.set("state", "maximized");
                switch (this.get("prev_state")) {
                    case "minimized":
                        break;
                    case "normal":
                        this.target.css(this.normal_css);
                        win.target.css({ "bottom": "",  "margin-left": 0});
                        break;
                }
                                
                var offset = this.target.offset();                
                this.target.css({
                    "top": "",
                    "bottom": "",
                    "left": "",
                    "right": "",
                });
                this.target.offset(offset);
                
                var left = this.target.css("left");
                var top = this.target.css("top");
                
                this.target.css({
                    "top": "0",
                    "left": "0",
                    "margin-top": top,
                    "margin-left": left,
                });
                
                var sec = this.delay / 1000;
                
                this.target.css({
                    "width": "100%",
                    "height": "100%",
                    "margin-top": "0px",
                    "margin-left": "0px",
                    "opacity": 1,
                    "transition-property": "all",
                    "transition-duration": sec + "s",
                    "transition-timing-function": "cubic-bezier(.07, 1.04, .7, .98)"                    
                });                
                
                win.controllers.resizable.enable(false);
                win.controllers.draggable.enable(false);
                setTimeout(function () {
                    win.set("mode", "maximized");
                    win.search("menubar").paint();
                    win.target.css({
                        "transition-property": "",
                        "transition-duration": "",
                        "transition-timing-function": ""
                    });
                    deferred.resolve(win);
                }, this.delay + 200);

                return deferred.promise();                
            },
            "maximize_jquery": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("maximize", { component: this });        
                var win = this;
                this.save_state();                
                this.set("state", "maximized");
                switch (this.get("prev_state")) {
                    case "minimized":
                        break;
                    case "normal":
                        this.target.css(this.normal_css);
                        win.target.css({ "bottom": "",  "margin-left": 0});
                        break;
                }        
                this.target.animate({
                    "width": "100%",
                    "height": "100%",
                    "margin-left": 0,
                    "top": 0,
                    "left": 0,
                    "opacity": 1
                }, this.delay, function (){
                    win.set("mode", "maximized");
                    win.search("menubar").paint();        
                    win.controllers.resizable.enable(false);
                    win.controllers.draggable.enable(false);
                    deferred.resolve(win);
                });
                return deferred.promise();
            },
            "normal": function () {
                /*/
                return this.maximize_jquery.apply(this, arguments);
                /*/
                return this.normal_css3.apply(this, arguments);
                //*/
            },
            
            "normal_css3": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("restore", { component: this });
                var win = this;                
                win.set("mode", "normal");
                win.target.css({ "bottom": "" });                

                var dummie = win.target.clone();
                dummie.children().remove();
                // console.log("dummie.html()", dummie.html());
                this.target.after(dummie);
                dummie.attr("style", this.normal_style);
                var w = dummie.width(),
                    h = dummie.height(),
                    o = dummie.offset()
                dummie.attr("style", "");
                dummie.offset(o);
                var t = dummie.css("top"),
                    l = dummie.css("left");
                
                var sec = this.delay / 1000;
                
                this.target.css({
                    "margin-top": "",
                    "margin-left": "",   
                    "width": w,
                    "height": h,
                    "top": t,
                    "left": l,
                    "margin-left": dummie.css("margin-left"),
                    "opacity": this.normal_css.opacity,
                    "transition-property": "all",
                    "transition-duration": sec + "s",
                    "transition-timing-function": "cubic-bezier(.07, 1.04, .7, .98)"
                });
                
                win.set("state", "transition");
                setTimeout(function () {
                    var zIndex = win.target.css("z-index");
                    win.target.attr("style", win.normal_style);
                    win.target.css("z-index", zIndex);                    
                    win.search("menubar").paint();
                    win.controllers.resizable.enable(true);
                    win.controllers.draggable.enable(true);
                    win.set("state", "normal");
                    win.target.css({
                        "transition-property": "",
                        "transition-duration": "",
                        "transition-timing-function": ""
                    });
                    deferred.resolve(win);
                }, this.delay);

                dummie.remove();

                return deferred.promise();
            },
            "normal_jquery": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("restore", { component: this });
                var win = this;
                win.set("mode", "normal");
                win.target.css({ "bottom": "" });                

                var dummie = win.target.clone();
                dummie.children().remove();
                // console.log("dummie.html()", dummie.html());
                this.target.after(dummie);
                dummie.attr("style", this.normal_style);
                var w = dummie.width(),
                    h = dummie.height(),
                    o = dummie.offset()
                dummie.attr("style", "");
                dummie.offset(o);
                var t = dummie.css("top"),
                    l = dummie.css("left");
                win.controllers.resizable.enable(true);
                win.controllers.draggable.enable(true);

                this.target.animate({
                    "width": w,
                    "height": h,                    
                    "top": t,
                    "left": l,
                    "margin-left": dummie.css("margin-left"),
                    "opacity": this.normal_css.opacity
                }, this.delay, function (){            
                    var zIndex = win.target.css("z-index");
                    win.target.attr("style", win.normal_style);
                    win.target.css("z-index", zIndex);
                    win.set("state", "normal");
                    win.search("menubar").paint();
                    deferred.resolve(win);
                });


                dummie.remove();

                return deferred.promise();
            },
            "restore": function () {
                // console.log(this.get("mode"));        
                this.trigger_fast("restore", { component: this });
                this.target.css({ "display": "block" });
                if (this.get("prev_state") == "normal") {
                    // this.set("prev_state", this.get("state"));
                    this.normal();
                } else if (this.get("prev_state") == "maximized") {
                    this.maximize();
                } else if (this.get("prev_state") == "transition") {
                    console.log("Estamos en plena transición. no se hace nada");
                } else {
                    console.error("ERROR: jwk.ui.dialog.window's prev_state not defined");
                    this.normal();
                }
            },
            "select": function () {
                // console.log("select", this.target.css("z-index"), this, ["jwk.global._listeners.iframe:" , jwk.global._listeners.iframe]);
                this.controllers.selectable.select();
            },
            "minimize": function () {
                return this.minimize_css3();
            },
            "minimize_css3": function () {
                var deferred = jwk.Deferred();
                if (this.get("state") == "transition") {
                    console.log("Estamos en plena transición. no se hace nada");                
                    return deferred.resolve({});
                }
                
                this.trigger_fast("minimize", { component: win });        
                this.save_state();
                this.set("state", "minimized");
                var win = this;
                var target = this.target;

                // console.log(target.css("z-index"));

                switch (this.min.mode) {
                    case "taskbar":
                        var dummie = div.clone();
                        this.target.after(dummie);

                        var header_height = target.find("[child='border-n']").height();
                        var footer_height = target.find("[child='border-s']").height();                
                        var offset = target.offset();
                        // console.log(offset);
                        target.css({
                            "bottom": "",
                            "right": "",
                            "min-height": ""
                        });
                        target.offset(offset);
                        target.width(target.width());
                        target.height(target.height());
                        
                        console.assert($(this.min.position.of).size()>0, "ERROR: relative object not found", [this.min.position]);
                        dummie.setPosition(this.min.position);
                        var t = dummie.css("top"), l = dummie.css("left");
                        // console.log("minimizo ventana", ["jwk.global._listeners.iframe:" , jwk.global._listeners.iframe]);
                        
                        
                        var sec = this.delay / 1000;
                        target.css({
                            "width": "1%",
                            "height": (header_height + footer_height) + "px",
                            "top": t,
                            "left": l,
                            "margin-left": 0,
                            "opacity": 0,
                            "transition-property": "all",
                            "transition-duration": sec + "s",
                            "transition-timing-function": "cubic-bezier(.07, 1.04, .7, .98)"
                        });
                        
                        setTimeout(function () {                        
                            target.css("display","none");
                            win.set("mode", "minimize");
                            deferred.resolve(win);
                            win.target.css({
                                "transition-property": "",
                                "transition-duration": "",
                                "transition-timing-function": ""
                            });                            
                        }, this.delay);
                        
                        dummie.remove();

                        break;
                    default:
                        console.error("ERROR: minimize_mode not implemented:", this.min.mode);
                }

                // console.log(target.css("z-index"));
                return deferred.promise();
            },            
            "minimize_jquery": function () {
                var deferred = jwk.Deferred();
                this.trigger_fast("minimize", { component: win });        
                this.save_state();
                this.set("state", "minimized");
                var win = this;
                var target = this.target;

                // console.log(target.css("z-index"));

                switch (this.min.mode) {
                    case "taskbar":
                        var dummie = div.clone();
                        this.target.after(dummie);

                        var header_height = target.find("[child='border-n']").height();
                        var footer_height = target.find("[child='border-s']").height();                
                        var offset = target.offset();                                                
                        target.css({
                            "bottom": "",
                            "min-height": ""                    
                        });
                        target.offset(offset);

                        // Coloco un objeto dummie en el lugar que debería ir la ventana para sacar el destino de la animación
                        
                        console.assert($(this.min.position.of).size()>0, "ERROR: relative object not found", [this.min.position]);
                        dummie.setPosition(this.min.position);
                        // console.log("minimizo ventana", ["jwk.global._listeners.iframe:" , jwk.global._listeners.iframe]);
                        this.target.animate({
                            "width": "1%",
                            "margin-left": 0,
                            "left": dummie.css("left"),
                            "top": dummie.css("top"),
                            "opacity": 0,
                            "height": (header_height + footer_height) + "px"                    
                        }, this.delay, function () {
                            target.css("display","none");
                            win.set("mode", "minimize");
                            deferred.resolve(win);
                        });

                        dummie.remove();

                        break;
                    default:
                        console.error("ERROR: minimize_mode not implemented:", this.min.mode);
                }

                // console.log(target.css("z-index"));
                return deferred.promise();
            },
            "fullcanvas": function () {
                this.set("state", "fullcanvas");
            },
            "close": function () {
                this.set("state", "close");
                var win = this;
                var what_to_do = function (what){
                    switch (typeof what) {
                        case "undefined":
                            this.destroy();
                            break;
                        case "string":
                            if (window.confirm(what)) win.destroy();
                            break;
                        case "boolean":
                            if (what) win.destroy();
                            break;
                    }            
                }

                if (typeof this.onbeforeclose == "function") {
                    var res = this.onbeforeclose();
                    switch (typeof res) {
                        case "object":
                            if (typeof res.done == "function") {
                                res.done(function (res){
                                    what_to_do.call(win, res);                            
                                })
                            }
                        default:
                            what_to_do.call(this, res);
                            break;
                    }
                } else {
                    this.destroy();            
                }
            },
            "structure_tree": function () {
                return {
                    "name": "win",
                    "data": this,
                    "ui_type": "panel.placeholder",
                    "children": {
                        "layout": {
                            "datapath": "layout",
                            "start": "col",
                            "ui_type": "panel.layout",
                            "children": {
                                "border-n": {
                                    "ui_type": "panel",
                                    "class": "window-border-n",
                                    "children": {
                                        "icon": { "ui_type": "icon", "icon": "<<data.icon>>", "icon_src": "<<data.icon_src>>", "icon_is_src": "<<data.icon_is_src>>", "class": "size_16" },
                                        "title": { "ui_type": "panel", text: "<<data.title>>" },
                                    }
                                },
                                "border-s": { "ui_type": "panel", "class": "window-border-s" },
                                "border-w": { "ui_type": "panel", "class": "window-border-w" },
                                "border-e": { "ui_type": "panel", "class": "window-border-e" },
                                "border-nw": { "ui_type": "panel", "class": "window-border-nw" },
                                "border-ne": { "ui_type": "panel", "class": "window-border-ne" },
                                "border-sw": { "ui_type": "panel", "class": "window-border-sw" },
                                "border-se": { "ui_type": "panel", "class": "window-border-se" },
                                "content": {
                                    "ui_type": "panel",
                                    "class": "window-content",
                                    "children": {
                                        "cover": {
                                            "ui_type": "panel",
                                            "class": "window-cover draggable-cancel"
                                        }                            
                                    },
                                },
                                "menubar": { "ui_type": "menu.menubar", "class": "window-menubar draggable-cancel", "datapath": "menubar_data" }
                            }
                        },
                        "controls": {
                            "ui_type": "list",
                            "class": "window-controls draggable-cancel", 
                            "datapath": "controls",
                            "template.text": ""
                        }
                    }
                }
            },
            "parent_for": function (name, index) {    
                switch (name) {
                    case "controls":                
                    case "win":
                    case "cover":
                    case "layout":                        
                        return {parent:this};
                }        
                return {parent:this.get("structure").search("layout"), query:".window-content"};
            },
            "show_menubar": function (show) {
                if (arguments.length == 0) {
                    show = this.get("has_menubar");
                }
                if (this.target) this.target.find("[child=menubar]").closest("tr").css("display", show ? "" : "none");
            }            
        }
    });
    
    jwk.ui.component({
        "ui_type": "window",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.dialog.Window,
        "defaults": jwk.ui.component("jwk-ui","dialog.window").defaults()
    });
    
    return jwk.ui.dialog;
 
});