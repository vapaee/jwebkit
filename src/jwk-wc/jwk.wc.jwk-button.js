define([
    "jwebkit",
    "jwebkit.ui",
    "polymer",
    "./jwk.wc.core",
    "./jwk.wc.jwk-panel"
], function(jwk, ui, Polymer, wc) {

    var TAG_NAME            = 'jwk-button',
        CLASS_NAME          = 'JWKButton',
        EXTENDS_CLASS_NAME  = 'JWKPanel',        
        PUBLIC_VARIABLES    = 'label';
    
    var SHADOW_DOM          = '\
            <template if={{label}}>\
                <span>{{label}}</span>\
            </template>\
            <content></content>';
    
    var DEFINITION          = {
        hostAttributes: {
          label: "COSO",
        },        
        created:  function() { console.log(TAG_NAME + ".created()", arguments) }, 
        ready:    function() { console.log(TAG_NAME + ".ready()", arguments) },
        attached: function() { console.log(TAG_NAME + ".attached()", arguments) },
        domReady: function() { console.log(TAG_NAME + ".domReady()", arguments) },
        detached: function() { console.log(TAG_NAME + ".detached()", arguments) },
        attributeChanged: function(attrName, oldVal, newVal) {
            console.log(attrName, 'old: ' + oldVal, 'new:', newVal);
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
    
    jwk.wc.JWKButton = 
    
    // ------------------------------------

    function (settings) {
        if (!settings) return;
        console.log("jwk.wc.JWKButton");
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