define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {

    
/*
hud.growl
hud.dock
*/    
     
    // jwk.ui.hud library namespace
    jwk.ui.hud = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.hud.HUD = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "hud",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.hud.HUD,
        "extends": jwk.ui.panel.Panel
    });
    
    // Growl bar ----------------------------------------------------------------------------------
    jwk.ui.hud.Growl = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.hud.HUD.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "hud.growl",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.hud.Growl,
        "extends": jwk.ui.hud.HUD
    });
    
    // Dock bar ----------------------------------------------------------------------------------
    jwk.ui.hud.Dock = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.hud.HUD.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "hud.dock",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.hud.Dock,
        "extends": jwk.ui.hud.HUD
    });
    
    return jwk.ui.hud;    
    
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