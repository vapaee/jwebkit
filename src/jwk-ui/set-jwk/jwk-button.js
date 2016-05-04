define([
    "jwebkit",
    "./jwk-panel",
], function(jwk, Panel) {
    var TAG_NAME            = 'jwk-button',
        CLASS_NAME          = 'JWKButton',
        EXTENDS_CLASS_NAME  = 'JWKPanel',        
        PUBLIC_VARIABLES    = 'label';
    
    var SHADOW_DOM          = '\
            <template if={{label}}>\
                <span>{{label}}</span>\
            </template>\
            <content></content>';
    
    var DEFAULT_SETTINGS    = {
            "disable_selection": true,
            "template": {
                "shadow_dom": SHADOW_DOM,
                "main": "<" + TAG_NAME + "-js>{{>shadow_dom}}</"+ TAG_NAME + "-js>"
            }
        };
    
    var PUBLIC_API          = {
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
    };
        
    jwk.ui.JWKButton = function (settings) {        
        jwk.ui[EXTENDS_CLASS_NAME].call(this, jwk.extend({}, DEFAULT_SETTINGS, settings));        
    }
        
    // ------------------------------------
    jwk.ui[CLASS_NAME].shadowDOM = SHADOW_DOM;
    jwk.ui[CLASS_NAME].variables = PUBLIC_VARIABLES;
    jwk.ui[CLASS_NAME].tagName   = TAG_NAME;
    jwk.ui[CLASS_NAME].settings  = DEFAULT_SETTINGS;
        
    jwk.ui.register_component({
        "ui_type": TAG_NAME,
        "namespace": "jwk-ui",
        "constructor": jwk.ui[CLASS_NAME],
        "extends": jwk.ui[EXTENDS_CLASS_NAME],
        "defaults": DEFAULT_SETTINGS,        
        "attr": PUBLIC_VARIABLES,
        "api": PUBLIC_API,
    }); 
    
});

