define([
    "jwebkit",
    "../jwk.ui.jwk-component",
], function(jwk, JWKComponent) {
    var TAG_NAME            = 'jwk-panel',
        CLASS_NAME          = 'JWKPanel',
        EXTENDS_CLASS_NAME  = 'JWKComponent',
        PUBLIC_VARIABLES    = 'name', 

        SHADOW_DOM          = '<content></content>';
            
    
    var DEFAULT_SETTINGS    = {
            "disable_selection": true,
            "template": {
                "shadow_dom": SHADOW_DOM,
                "main": "<" + TAG_NAME + "-js>{{>shadow_dom}}</"+ TAG_NAME + "-js>"
            }
        };
    
    jwk.ui.JWKPanel = function (settings) {
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
    }); 
    
    
    
});

