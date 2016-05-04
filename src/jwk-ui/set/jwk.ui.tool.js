define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {

    /*
tool
tool.icon
tool.option
    
    */
    // jwk.ui.tool library namespace
    jwk.ui.tool = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.tool.Tool = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "tool").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "tool",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "main": ""
            }
        },
        "constructor": jwk.ui.tool.Tool,
        "extends": jwk.ui.panel.Panel
    });
    
    //  ----------------------------------------------------------------------------------
    jwk.ui.tool.Icontool = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.tool.Tool.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "tool.icon",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "main": ""
            }
        },
        "constructor": jwk.ui.tool.Icontool,
        "api": {
            "parent_for": function (name, index) {
                if (name == "tool" || name == "btn") {
                    return { parent:this.parent };
                }                
                var data = { parent:this.search("btn"), query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            },            
            "structure_tree": function () {
                this.on("change:structure", function (n,e) {
                    var structure = e.value;                    
                    // forward all button mouse events
                    structure.search("btn").on("click dblclick mousedown mouseup contextmenu", function () {
                        this.trigger.apply(this, arguments);
                    }, this);
                    structure.search("icon").on("click dblclick mousedown mouseup contextmenu", function () {
                        this.trigger.apply(this, arguments);
                    }, this);
                })
                return {
                    "name": "tool",
                    "ui_type": "panel.placeholder",
                    "children": {
                       "btn": {
                            "ui_type": "button",
                            "children": { "icon": { "ui_type": "icon", "icon": this.icon, "class": this.class } }
                        }
                    }
                }
            }
        },
        "extends": jwk.ui.tool.Tool
    });
    //  ----------------------------------------------------------------------------------
    jwk.ui.tool.Option = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.tool.Tool.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "tool.option",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "main": ""
            }
        },
        "constructor": jwk.ui.tool.Option,
        "api": {
            "parent_for": function (name, index) {                
                if (name == "tool" || name == "btn") {
                    return { parent:this.parent };
                }                
                var data = { parent:this.search("btn"), query:".btn_container" };
                if (this.render.resolve_container(data, true)) {
                    return data;
                } else {
                    return { parent:this };
                }   
            },
            "structure_tree": function () {
                return {
                    "name": "tool",
                    "ui_type": "panel.placeholder",
                    "children": {
                       "btn": {
                            "selected": !!this.selected,
                            "ui_type": "button.option",
                            "children": { "icon": { "ui_type": "icon", "icon": this.icon, "class": this.class } }
                        }
                    }
                }
            }
        },
        "extends": jwk.ui.tool.Tool
    });    
        
    return jwk.ui.tool;    
    
   /*
    
    // jwk.ui.Toolbar ----------------------------------------------------------------------------------
    jwk.ui.Toolbar = function (settings) {
        if (!settings) return;
        var def = {
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.Toolbar.prototype = new Component();
    jwk.ui.Toolbar.prototype.constructor = jwk.ui.Toolbar;        

    jwk.ui.component({
        ui_type: "toolbar",
        namespace: "jwk-ui",
        constructor: jwk.ui.Toolbar
    });
    
    // jwk.ui.toolTool ----------------------------------------------------------------------------------
    jwk.ui.toolTool = function (settings) {
        if (!settings) return;
        var def = {
            tool: "default",
            class: "tool",
            template: {
                main: "<div class='{{self.tool}}'></div>"
            }            
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.toolTool.prototype = new Component();
    jwk.ui.toolTool.prototype.constructor = jwk.ui.toolTool;        

    jwk.ui.component({
        ui_type: "tooltool",
        namespace: "jwk-ui",
        constructor: jwk.ui.toolTool
    });
    
    return jwk.ui.toolview;      
    */
});