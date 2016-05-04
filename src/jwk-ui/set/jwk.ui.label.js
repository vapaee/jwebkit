define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
  
    // console.log("jwk-ui/jwk.ui.wg-label ------------------------------------------------------------------------------------------------------");
    /*
    label
    label.link
    label.editinline
    label.feedback
    label.tooltip
    label.textarea
    label.log
  */  
    
    // jwk.ui.icon library namespace
    jwk.ui.label = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.label.Label = function (_settings) {
        if (!_settings) return;
        var def = jwk.ui.component("jwk-ui", "label").defaults();
        var settings = jwk.extend(true, {}, def, _settings);
        jwk.ui.panel.Panel.call(this, settings);
    }
    
    jwk.ui.component({
        "ui_type": "label",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "br": "{{#self.breakline}}</br>{{/self.breakline}}",
                "main": "<div>{{#self.value}}{{self.value}}{{/self.value}}</div>{{>br}}"
            }
        },
        "constructor": jwk.ui.label.Label,
        "extends": jwk.ui.panel.Panel,
    });
    
    // Hipperlink ----------------------------------------------------------------------------------
    jwk.ui.label.Link = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        var _settings =jwk.extend(true, {}, def, settings);
        
        if (_settings.openin) _settings.template.openin = "target='{{self.openin}}'";
        if (_settings.url)    _settings.template.url = "{{self.url}}";
        
        jwk.ui.label.Label.call(this, _settings);
    }
    
    jwk.ui.component({
        "ui_type": "label.link",
        "namespace": "jwk-ui",
        "defaults": {
            "template": {
                "openin": "",
                "url": "#",
                "main": "<div><a href='{{>url}}' {{>openin}}  class='container'></a></div>"
            }
        },
        "api": { parent_for: function (name, index) { return {parent:this, query: ".container"}; }},
        "constructor": jwk.ui.label.Link,
        "extends": jwk.ui.label.Label
    });
    
    // editinline ----------------------------------------------------------------------------------
    jwk.ui.label.Edtable = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.editable",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Edtable,
        "extends": jwk.ui.label.Label
    });
    
    // Feedback ----------------------------------------------------------------------------------
    jwk.ui.label.Feedback = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.feedback",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Feedback,
        "extends": jwk.ui.label.Label
    });
    
    // Textarea ----------------------------------------------------------------------------------
    jwk.ui.label.Textarea = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.textarea",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Textarea,
        "extends": jwk.ui.label.Label
    });
    
    // Tooltip ----------------------------------------------------------------------------------
    jwk.ui.label.Tooltip = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.tooltip",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Tooltip,
        "extends": jwk.ui.label.Label
    });
    
    // Log ----------------------------------------------------------------------------------
    jwk.ui.label.Log = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.label.Label.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "label.log",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.label.Log,
        "extends": jwk.ui.label.Label
    });    
        
    return jwk.ui.label;    
});

