// ---------------------------------------------------------------------------------------------------------------------------
//
// -- JWK --

// no se está pudiendo cargar usando requirejs: http://jsfiddle.net/8t4pzxqg/
// Funciona bien cuando se incluye la biblioteca sin usar requirejs: http://jsfiddle.net/8z22w4th/

define([
    "jwebkit",
    "./jwk-ui/jwk.ui"
], function(jwk){
    console.debug("-- jwebkit.UI --", jwk.ui);
    return jwk.ui;
});


if (window["jwebkit_must_require"]) {
    define("jwebkit",function(){ return window.jwk; });
    requirejs("jwebkit.ui");
} else {
    
}