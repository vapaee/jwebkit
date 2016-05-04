define([
    "jwebkit",
    "jwebkit.ui",
    "polymer",
    "./jwk.wc.core"
], function(jwk, ui, Polymer, wc) {
    
    var polymer_version = "Polymer-0.8.0";
    
    jwk.wc.JWKComponent = function (settings) {
        if (!settings) return;
        jwk.Node.apply(this);        
        this.map(settings);
        
        var registerShadowDOM = (function () { 
            this.registerShadowDOM();
        }).bind(this);
    
        var event;
        switch(polymer_version) {
            case "Polymer-0.8.0":
                event = 'load';
                break;
            case "Polymer-0.5.0":
                event = 'polymer-ready';
                break;
        }        
        if (window.addEventListener) window.addEventListener(event,registerShadowDOM,false); //W3C
        else window.attachEvent('onload',startClock); //IE                
        
    }
    
    jwk.wc.JWKComponent.prototype = new jwk.Node();
    jwk.wc.JWKComponent.prototype.constructor = jwk.wc.JWKComponent;
    
    jwk.wc.JWKComponent.prototype.registerShadowDOM = function () {
        console.log("registerShadowDOM:", [this.tagName, this.definition]);
        var html;
        switch(polymer_version) {
            case "Polymer-0.8.0":
                this.definition.is = this.tagName;
                Polymer(this.definition);
                html = '\
                    <dom-module id="' + this.tagName + '" >\
                        <template>\
                            ' + this.shadowDOM + '\
                        </template>\
                    </dom-module>';
                break;
            case "Polymer-0.5.0":
                Polymer(this.tagName, this.definition);
                html = '\
                    <polymer-element name="' + this.tagName + '" attributes="' + this.variables + '">\
                        <template>\
                            ' + this.shadowDOM + '\
                        </template>\
                    </polymer-element>';
                break;
        }
        var shadowDOM = document.createElement('div');

        shadowDOM.innerHTML = html;
        document.body.appendChild(shadowDOM);
    }    
    
    return jwk.wc.JWKComponent;
});