define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
  
    
    /*    
button
button.cycle
button.file
button.option
button.split
button.stay    
    */
    
    
    // jwk.ui.button library namespace
    jwk.ui.button = {}
    
    // Button ----------------------------------------------------------------------------------
    jwk.ui.button.Button = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "button",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Button,
        "extends": jwk.ui.panel.Panel,
        "defaults": {
            "disable_selection": true,
            "template": {
                "main": "<div><div class='btn_container'></div></div>",
            }
        },
        "api": {
            "click": function (n,e) {            
                this.trigger(n,e)
            },
            "parent_for": function (name, index) {
                var data = { parent:this, query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            }            
        }
    });     
    
    // Cycle Button ----------------------------------------------------------------------------------
    jwk.ui.button.Cycle = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        this.set("states", settings.states);
        jwk.ui.button.Button.call(this, def);
        
        if (settings.state && !settings.value) {
            console.warn("WARNING: state ("+settings.state+") param is DEPRECATED. use value instead.");
            this.set("value", settings.state);
        }
        
        this.on("click", function (name, event) {                
            event.component.next();
        });        
        
        this.one("render:first", function (name, event) {                
            event.component.next();
        });
    }
    
    jwk.ui.component({
        "ui_type": "button.cycle",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Cycle,
        "extends": jwk.ui.button.Button,
        "defaults": {
            "states": ["first", "second", "third"],                        
            "template": {
                "state": "{{self.value}}",
                // "text": "{{self.text}}",
                "nstate": "<div state='{{>state}}'><div class='btn_container'></div></div>",
                "main": "{{>nstate}}"
            },
        },
        "api": {
            "parent_for": function (name, index) {
                var data = { parent:this, query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            },
            "next": function () {
                var current = this.get("value");
                var states = this.get("states");

                switch (typeof states) {
                    case "number":
                        if (!current) {
                            current = 0;
                        } else {
                            current = (parseInt(current) + 1) % states;                    
                        }
                        break;
                    case "object":                        
                        if (states instanceof jwk.Collection) {
                            states = states.toArray();
                        }
                        if (Array.isArray(states)){
                            if (!current) {
                                current = states[0];
                            } else {
                                var index = states.indexOf(current);
                                current = states[(index+1) % states.length];                                
                            }                            
                        } else {
                            console.error("caso no implementado", states);
                        }
                        break;
                    default:
                        console.error("caso no implementado", states);
                }

                this.set("value", current);
                if (this.datapath) this.my_data(current);
                this.paint();
                
                // this.trigger_fast("change:state", {value: current, states: states);
            }
        }
    });     
    
    // File Button ----------------------------------------------------------------------------------
    jwk.ui.button.File = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        if (settings.multiple) {
            def.template.multiple = "multiple='true'";
        }        
        def = jwk.extend(true, {}, def, settings);
        jwk.ui.button.Button.call(this, def);
        
        var file_btn = this;
        jwk.ui.get("render").container().on("change", function (name, event) {
            console.error("analiza que pasó aca a ver si funciona");
            if (file_btn == event.component) {
                file_btn.trigger("change", event);
                file_btn.paint(); // This force the HTMLinput to be repainted, so it loses its files property.
                                  // That means the next time the user presses the button if he or she choses the same file, the "change" event will be triggered again.
                file_btn.trigger("mouseout", event);
            }
        });
        
    }
    
    
    jwk.ui.component({
        "ui_type": "button.file",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.File,
        "extends": jwk.ui.button.Button,
        "defaults": {
            "template": {
                "multiple": "",
                "file": "<div style='border:0;position:relative;'><div style='position:absolute; overflow: hidden; width: 100%; height:100%; top:0; left:0; border:0px; padding:0px; margin:px;'><input {{>multiple}} type='file' name='file' style='opacity:0;position:absolute;top:0;bottom:0;left:0;right:0;'/></div><div class='file_container'></div></div>",
                "main": "{{>file}}"
            }
        },
        "api": {
            "parent_for": function (name, index) {
                var data = { parent:this, query:".file_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }                
            }            
        }        
    }); 
    
    
    // Option Button ----------------------------------------------------------------------------------
    jwk.ui.button.Option = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        
        if (def.group == "siblings") {
            def.selectable.group = def.group;
        } else {
            console.assert(typeof def.group == "string", def.group);
            def.selectable.group = "[group="+def.group+"]";
        }
        
        if (settings.selected) {
            def.selectable.selected = true;
        }
        
        jwk.ui.button.Button.call(this, def);

        this.on("feature:selectable", function (name, event) {
            event.controller.on("select", function (n, e) {
                e.controller.component.set("selected", true);
            }).on("unselect", function (n, e) {
                e.controller.component.set("selected", false);           
            });            
            if (event.component.settings.selected) this.select();
        });
        this.on("change:selected", function (n,e) {
            e.target.my_data(e.target.get("selected"));
        });        
    }
    
    jwk.ui.component({
        "ui_type": "button.option",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Option,
        "extends": jwk.ui.button.Button,
        "defaults": {
            "group": "siblings",
            "selectable": {
                "allowMultiple": false,
                "zIndex": false
            },
            "template": {
                "option": "<div><div class='btn_container'></div></div>",
                "main": "{{>option}}"
            },
        },
        "api": {
            "parent_for": function (name, index) {
                var data = { parent:this, query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            },            
            "select": function () {
                this.controllers.selectable.select(this);
            },    
            "group": function () {
                console.error("jwk.ui.Button.Option.group() No implementado");
            }         
        }
    });  
    
    // Split Button ----------------------------------------------------------------------------------
    jwk.ui.button.Split = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        jwk.ui.button.Button.call(this, def);
    }
    
    jwk.ui.component({
        "ui_type": "button.split",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Split,
        "extends": jwk.ui.button.Button,
        "defaults": {},
        "api": {}
    });  
    
    // Stay Button ----------------------------------------------------------------------------------
    jwk.ui.button.Stay = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        jwk.ui.button.Button.call(this, def);
    }
    
    jwk.ui.component({
        "ui_type": "button.stay",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.button.Stay,
        "extends": jwk.ui.button.Button,
        "defaults": {},
        "api": {}
    });  
    
    return jwk.ui.button;    
    /*
    // jwk.ui.Button ----------------------------------------------------------------------------------
    jwk.ui.Button = function (settings) {
        var button = this;
        if (!settings) return;
        var def = {
            ui_type: "button",
            disable_selection: true,
            template: {
                main: "<div></div>"
            }
        };
        Panel.call(this, jwk.extend(def, settings));
        console.assert(jwk.ui.render.mouse);        
    }
    
    jwk.ui.Button.prototype = new Panel();
    jwk.ui.Button.prototype.constructor = jwk.ui.Button;
    
    jwk.ui.component({
        ui_type: "button",
        namespace: "jwk-ui",
        constructor: jwk.ui.Button
    });
    
    // http://jsfiddle.net/nfgJy/7/    
    // jwk.ui.Button.File ----------------------------------------------------------------------------------
    jwk.ui.Button.File = function (settings) {
        var button = this;
        if (!settings) return;
        var def = {
            ui_type: "button.file",
            template: {
                multiple: "",
                file: "<div style='border:0;position:relative;'><div style='position:absolute; overflow: hidden; width: 100%; height:100%; top:0; left:0; border:0px; padding:0px; margin:px;'><input {{>multiple}} type='file' name='file' style='opacity:0;position:absolute;top:0;bottom:0;left:0;right:0;'/></div><div class='container'></div></div>",
                main: "{{>file}}"
            },
        };
        if (settings.multiple) {
            def.template.multiple = "multiple='true'";
        }
        jwk.ui.Button.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.Button.File.prototype = new jwk.ui.Button();
    jwk.ui.Button.File.prototype.constructor = jwk.ui.Button.File;
    
    jwk.ui.Button.File.prototype.parent_for = function (name, index) {
        return {parent:this, query:".container"};
    }
    
    jwk.ui.on("change:render", function (n, e) {        
        jwk.ui.get("render").container().on("change", function (name, event) {
            event.component.trigger("change", event);
            event.component.paint(); // This force the HTMLinput to be repainted, so it loses its files property.
                                      // That means the next time the user presses the button if he or she choses the same file, the "change" event will be triggered again.
            event.component.trigger("mouseout", event);
        });
    })
    
    jwk.ui.component({
        ui_type: "button.file",
        namespace: "jwk-ui",
        constructor: jwk.ui.Button.File
    });
    
    
    // http://jsfiddle.net/nfgJy/10/
    // jwk.ui.Button.NState ----------------------------------------------------------------------------------
    jwk.ui.Button.NState = function (settings) {
        var button = this;
        if (!settings) return;
        var def = {
            states: ["first", "second", "third"],            
            ui_type: "button.n-state",
            template: {
                state: "{{self.current}}",
                text: "{{self.text}}",
                nstate: "<div state='{{>state}}'>{{>text}}</div>",
                main: "{{>nstate}}"
            },
        };
        settings = jwk.extend(def, settings);
        this.set("states", settings.states);
        jwk.ui.Button.call(this, settings);
        this.on("click", function (name, event) {                
            event.component.next();
        });        
        
        this.one("render:first", function (name, event) {                
            event.component.next();
        });
        
    }
    
    jwk.ui.Button.NState.prototype = new jwk.ui.Button();
    jwk.ui.Button.NState.prototype.constructor = jwk.ui.Button.NState;
    jwk.ui.Button.NState.prototype.next = function () {
        var current = this.get("current");
        var states = this.get("states");
    
        switch (typeof states) {
            case "number":
                if (!current) {
                    current = 0;
                } else {
                    current = (parseInt(current) + 1) % states;                    
                }
                break;
            case "object":
                if (states instanceof jwk.Collection) {
                    states = states.toArray();
                }
                if (Array.isArray(states)){
                    if (!current) {
                        current = states[0];
                    } else {
                        var index = states.indexOf(current);
                        current = states[(index+1) % states.length];                                
                    }                            
                } else {
                    console.error("caso no implementado", states);
                }
                break;
            default:
                console.error("caso no implementado", states);
        }
        
        this.set("current", current);
        if (this.datapath) this.my_data(current);
        this.paint();
    }
    
    jwk.ui.component({
        ui_type: "button.n-state",
        namespace: "jwk-ui",
        constructor: jwk.ui.Button.NState
    });
    
    
                
    // http://jsfiddle.net/nfgJy/13/
    // jwk.ui.Button.Option (radio button) ----------------------------------------------------------------------------------
    jwk.ui.Button.Option = function (settings) {
        if (!settings) return;
        var def = {
            ui_type: "button.option",
            group: "siblings",
            selectable: {
                allowMultiple: false,
                zIndex: false
            },
            template: {
                text: "{{self.text}}",
                option: "<div>{{>text}}</div>",
                main: "{{>option}}"
            },
        };
        settings = jwk.extend(def, settings);
        if (settings.group == "siblings") {
            settings.selectable.group = settings.group;
        } else {
            console.assert(typeof settings.group == "string", settings.group);
            settings.selectable.group = "[group="+settings.group+"]";
        }
        
        jwk.ui.Button.call(this, settings);        

        this.on("selectable", function (name, event) {
            event.controller.on("select", function (n, e) {
                e.controller.component.set("selected", true);
            }).on("unselect", function (n, e) {
                e.controller.component.set("selected", false);           
            });
            if (event.component.settings.selected) this.select();
        });
        this.on("change:selected", function (n,e) {
            e.target.my_data(e.target.get("selected"));
        });
    }
    
    jwk.ui.Button.Option.prototype = new jwk.ui.Button();
    jwk.ui.Button.Option.prototype.constructor = jwk.ui.Button.Option;
    
    jwk.ui.Button.Option.prototype.select = function () {
        this.controllers.selectable.select(this);
    }
    
    jwk.ui.Button.Option.prototype.group = function () {
        console.error("jwk.ui.Button.Option.group() No implementado");
    }    
    
    jwk.ui.component({
        ui_type: "button.option",
        namespace: "jwk-ui",
        constructor: jwk.ui.Button.Option
    });
    */ 
});

