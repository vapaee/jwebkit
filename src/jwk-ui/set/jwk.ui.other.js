define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
    return;    
    
  
    
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
    
});