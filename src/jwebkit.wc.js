// ---------------------------------------------------------------------------------------------------------------------------
//
// -- JWK --

// no se está pudiendo cargar usando requirejs: http://jsfiddle.net/8t4pzxqg/
// Funciona bien cuando se incluye la biblioteca sin usar requirejs: http://jsfiddle.net/8z22w4th/

define([
    "jwebkit",
    "jwebkit.ui",
    "./jwk-wc/jwk.wc"
], function(jwk){
    console.debug("-- jwebkit.WC --", jwk.wc);
    return jwk.wc;    
});


if (window["jwebkit_must_require"]) {
    define("jwebkit",function(){
        console.assert(typeof window.jwk != "udefined", "ERROR: window.jwk not found");
        return window.jwk;
    });
    define("jwebkit.ui",function(){
        console.assert(typeof window.jwk.ui != "udefined", "ERROR: window.jwk.ui not found");
        return window.jwk.ui;
    });
    define("polymer",function(){
        console.assert(typeof Polymer != "udefined", "ERROR: Polymer not found");
        return Polymer;
    });
    requirejs("jwebkit.wc");
} else {
    
}