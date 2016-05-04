// http://jsfiddle.net/X62Zk/

define([
    "jwebkit",
    "./jwk.ui.core",
], function(jwk, ui) {
    
    ui.Skin = function () {        
        jwk.Node.apply(this);
    }
    
    ui.Skin.prototype = new jwk.Node();
    ui.Skin.prototype.constructor = ui.Skin;
    
    
    ui.Skin.prototype.load_default =function () {
        console.error("ui.Skin.prototype.load_default se utiliza");
        this.load(["base.less", "color-default.less", "less-lib.less", "skin-default.less"]);
    }
    ui.Skin.prototype.load = function (list) {
        console.error("ui.Skin.prototype.load se utiliza");
        return this.load_less(list);
    }
    ui.skin_manager = new ui.Skin();
    
    return ui.skin_manager;
});