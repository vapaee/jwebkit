define([
    "jwebkit",
    "jwebkit.ui",
    "polymer",
    "./jwk.wc.core",
    "./jwk.wc.jwk-component"
], function(jwk, ui, Polymer, wc, JWKComponent) {
    
    var TAG_NAME            = 'jwk-panel',
        CLASS_NAME          = 'JWKPanel',
        EXTENDS_CLASS_NAME  = 'JWKComponent',
        PUBLIC_VARIABLES    = 'name',

        SHADOW_DOM          = '<content></content>';
            
    
    var DEFINITION          = {
            ready: function() {
                // console.log(TAG_NAME + '.ready()');
            }        
        };
    
    
    jwk.wc.JWKPanel
    
    // ------------------------------------

    = function (settings) {
        if (!settings) return;
        jwk.wc[EXTENDS_CLASS_NAME].call(this, settings);
    }
    
    jwk.wc[TAG_NAME] = jwk.wc.register_component({
        definition: DEFINITION,
        shadowDOM: SHADOW_DOM,
        variables: PUBLIC_VARIABLES,
        tagName: TAG_NAME,
        className: CLASS_NAME,
        extendClassName: EXTENDS_CLASS_NAME
    });
        
    return jwk.wc[TAG_NAME];
});