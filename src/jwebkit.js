// --------------------------------------------------------------------------------------------------------------------------
//
// -- JWK --

define("jwebkit", [    
    "jwk-base/jwk",
    "jwk-model/jwk.model",
    "jwk-ajax/jwk.ajax",
    "jwk-net/jwk.net",
], function(jwk){
    var Fn = Function, window = (new Fn("return this"))();
    if (!define.amd || define.amd.fake) {
        window.jwk = jwk;
    }
    
    if (typeof angular == "object" && typeof angular.module == "function") {
        angular.module('jwebkit',[]).factory("jwebkit", function() {
            return jwk;
        });        
    }
    
    console.debug("-- jwebkit --", [jwk]);
    return jwk;    
});

if (window["jwebkit_must_require"]) {
    requirejs("jwebkit");
} else {
    
}
