define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
   
    /*
bar.slide 
bar.range
bar.progress
bar.scroll
bar.tools    
    */
    // jwk.ui.bar library namespace
    jwk.ui.bar = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Bar = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.bar.Bar,
        "extends": jwk.ui.panel.Panel
    });
    
    // Slide bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Slide = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.slide",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.bar.Slide,
        "extends": jwk.ui.bar.Bar
    });
    
    // Range bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Range = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.range",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.bar.Range,
        "extends": jwk.ui.bar.Bar
    });
    
    // Progress bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Progress = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.progress",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.bar.Progress,
        "extends": jwk.ui.bar.Bar
    });
    
    // Scroll bar ----------------------------------------------------------------------------------
    jwk.ui.bar.Scroll = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.scroll",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.bar.Scroll,
        "defaults": {},
        "extends": jwk.ui.bar.Bar
    });
    
    // Toolbar ----------------------------------------------------------------------------------
    jwk.ui.bar.Toolbar = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.bar.Bar.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "bar.toolbar",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.bar.Toolbar,
        "defaults": {},
        "extends": jwk.ui.bar.Bar
    });
    
    jwk.ui.component({
        "ui_type": "toolbar",
        "namespace": "jwk-ui",
        "defaults": {},
        "constructor": jwk.ui.bar.Toolbar,        
    });
    
    return jwk.ui.bar;
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