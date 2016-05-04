define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {

    
/*
input
input.password
input.autocomplete
input.search
input.spinner
input.rating

*/    
    // jwk.ui.input library namespace
    jwk.ui.input = {}
    
    // Input ----------------------------------------------------------------------------------
    jwk.ui.input.Input = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "input",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Input,
        "extends": jwk.ui.panel.Panel,
        "api": {
            "keyup": function (n,e) {
                this.flag_on("making_changes");
                this.value = e.target.value;
                this.flag_off("making_changes");
            }
        },
        "defaults": {
            "template": {
                "type": "text",
                // "value": "{{#self.value}}value='{{self.value}}'{{/self.value}}",
                "value": "value='{{self.value}}'",
                "label": "{{#self.label}}<span class='label'>{{self.label}}</span>{{/self.label}}",
                "main": "<div>{{>label}}<input type='{{>type}}' {{>value}} /></div>{{#self.settings.breakline}}</br>{{/self.settings.breakline}}"
            }
        }
    });    
    
    // Password ----------------------------------------------------------------------------------
    jwk.ui.component({
        "ui_type": "input.password",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Input,
        "defaults": {
            "template": {
                "type": "password",
                "main": "<div><input type='{{>type}}' /></div>"
            }
        }        
    }); 
    
    // Search ----------------------------------------------------------------------------------
    jwk.ui.component({
        "ui_type": "input.search",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Input,
        "api": {
            "change": function (n,e) {
                this.value = e.target.value;
            }
        },        
        "defaults": {
            "template": {
                "type": "text",
                "search": "<icon name='search'></icon>",
                "main": "<div><input type='{{>type}}' />{{>search}}</div>"
            }
        }        
    });
    
    // Range ----------------------------------------------------------------------------------
    jwk.ui.component({
        "ui_type": "input.range",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Input,
        "defaults": {
            "template": {
                "type": "range",
                "value": "{{self.value}}",
                "main": "<div><input type='{{>type}}' value='{{>value}}' /></div>"
            }
        }        
    }); 
    
    // Spinner ----------------------------------------------------------------------------------
    jwk.ui.input.Spinner = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.input.Input.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "input.spinner",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Spinner,
        "extends": jwk.ui.input.Input,
        "defaults": {
            "template": {
                "type": "text",
                "main": "<div>Spinner Component</div>"
            }
        }
    }); 
    
    // Ratting ----------------------------------------------------------------------------------
    jwk.ui.input.Ratting = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.input.Input.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "input.ratting",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.input.Ratting,
        "extends": jwk.ui.input.Input,
        "defaults": {
            "template": {
                "type": "text",
                "main": "<div>Ratting Component</div>"
            }
        }
    });     
    
    return;    
    
  
    // jwk.ui.Input ----------------------------------------------------------------------------------
    jwk.ui.Input = function (settings) {
        var input = this;
        if (!settings) return;
        var def = {
            template: {
                type: "text",
                main: "<input type='{{>type}}' />"
            }
        };
        Panel.call(this, jwk.extend(def, settings));
        console.assert(jwk.ui.render.mouse);        
    }
    
    jwk.ui.Input.prototype = new Panel();
    jwk.ui.Input.prototype.constructor = jwk.ui.Input;
    
    jwk.ui.component({
        ui_type: "input",
        namespace: "jwk-ui",
        constructor: jwk.ui.Input
    });

    
    // jwk.ui.Input ----------------------------------------------------------------------------------
    jwk.ui.Input.Password = function (settings) {
        var input = this;
        if (!settings) return;
        var def = {
            ui_type: "input.password",        
            template: {
                type: "password",
                main: "<input type='{{>type}}' />"
            }
        };
        Panel.call(this, jwk.extend(def, settings));
        console.assert(jwk.ui.render.mouse);
    }
    
    jwk.ui.Input.Password.prototype = new jwk.ui.Input();
    jwk.ui.Input.Password.prototype.constructor = jwk.ui.Input.Password;
    
    jwk.ui.component({
        ui_type: "input.password",
        namespace: "jwk-ui",
        constructor: jwk.ui.Input.Password
    });    
    
});

