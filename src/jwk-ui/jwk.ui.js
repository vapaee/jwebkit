// http://jsfiddle.net/dcE6e/1/
define([
    "jwebkit",
    "./jwk.ui.core",
    "./jwk.ui.component",
    "./jwk.ui.skin",
    "./render/html/jwk.ui.html",
    "./set/jwk.ui.set",
    "./set-jwk/jwk-set",
], function(jwk, ui) {
    // console.log("jwk-ui ------------------------------------------------------------------------------------------------------");
    console.assert(ui, "ui not loaded correctly");
    return ui;
});