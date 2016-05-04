define([
    "jwebkit",
    "jquery",
    "jwebkit.ui",
], function( jwk, $ ) {
  
    jwk.WebComponents = function () {
        var wc = this;
        jwk.Node.apply(wc);
    }
    
    jwk.WebComponents.prototype = new jwk.Node();
    jwk.WebComponents.prototype.constructor = jwk.WebComponents;
    jwk.WebComponents.prototype.register_component = function (settings) {
        jwk.wc[settings.className].prototype = new jwk.wc[settings.extendClassName]();
        jwk.wc[settings.className].constructor = jwk.wc[settings.className];        
        return new jwk.wc[settings.className](settings);
    }
    
    jwk.wc = new jwk.WebComponents();
    var wc = jwk.wc;
    
    return jwk.wc;
});

            