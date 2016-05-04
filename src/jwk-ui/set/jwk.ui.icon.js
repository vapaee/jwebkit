define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
   

    var default_icon_map = new jwk.Node({
        "folderopen": "icon_0",
        "folder":     "icon_1",
        "compressed": "icon_2",
        "default":    "icon_3",
        "media":      "icon_4",
        "mp3":        "icon_5",
        "mp4":        "icon_6",
        "png":        "icon_7",
        "pdf":        "icon_8",
        "bin":        "icon_9",
        "txt":        "icon_10",
        "js":         "icon_11",
        "less":       "icon_11",
        "doc":        "icon_12",
        "sys":        "icon_13"
    })
    
    // jwk.ui.icon library namespace
    function IconManage(s){ jwk.Node.call(this, s); };
    IconManage.prototype = new jwk.Node();
    IconManage.prototype.constructor = IconManage;
    
    jwk.ui.icon = new IconManage({
        "iconmap": default_icon_map
    });
    /*
    jwk.ui.icon.on("change:iconmap", function () {
        console.log("AAAAAAAAAAAAa", arguments);
    })
    */
    
    IconManage.prototype.configure = function() {    
         
    }
    
    IconManage.prototype.create = function(entry, _options) {
        var options = jwk.extend({icon_size: "48"}, _options);
        var parts = entry.icon.split(" ");
        console.assert(parts.length < 3, [parts, entry.icon, entry]);
        
        var icon = entry.icon;
        var icon_size = "size_" + options.icon_size;
        var icon_class = jwk.ui.icon.get("iconmap").valueOf()[icon] || "";
        
        if (icon_class == "") {
            // console.log(icon);
            // console.log(jwk.ui.icon.get("iconmap"));
            // console.log(jwk.ui.icon.get("iconmap").valueOf());
        }
        
        var div = "<div class='" + icon + " icon " + icon_class + " " + icon_size + "'></div>";
        // console.log("IconManage.prototype.create: ", entry, div);
        return div;
    }

    // Bar ----------------------------------------------------------------------------------
    jwk.ui.icon.Icon = function (settings) {
        if (!settings) return;
        
//alert("ESTO SE USA jwk.ui.icon.Icon!!!!!!!!!!");
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "icon",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "style": "{{#self.icon_is_src}} style='background-size: contain; background-image:url({{self.icon_src}});' {{/self.icon_is_src}}",
                "main": "<div class='{{self.icon}} icon {{self.class}}' {{>style}}></div>"
            }
        },
        "api": {
            "coso": function () {
                console.log("coso->", arguments)
            }
        },  
        "constructor": jwk.ui.icon.Icon,
        "extends": jwk.ui.panel.Panel
    });
    
    // Icontool ----------------------------------------------------------------------------------
    jwk.ui.icon.Tool = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.icon.Icon.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "icon.tool",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.icon.Tool,
        "extends": jwk.ui.icon.Icon
    });
        
    return jwk.ui.icon;    
    
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
    
    // jwk.ui.IconTool ----------------------------------------------------------------------------------
    jwk.ui.IconTool = function (settings) {
        if (!settings) return;
        var def = {
            icon: "default",
            class: "icon",
            template: {
                main: "<div class='{{self.icon}}'></div>"
            }            
        };
        
        Component.call(this, jwk.extend(def, settings));
    }
    
    jwk.ui.IconTool.prototype = new Component();
    jwk.ui.IconTool.prototype.constructor = jwk.ui.IconTool;        

    jwk.ui.component({
        ui_type: "icontool",
        namespace: "jwk-ui",
        constructor: jwk.ui.IconTool
    });
    
    return jwk.ui.Iconview;      
    */
});