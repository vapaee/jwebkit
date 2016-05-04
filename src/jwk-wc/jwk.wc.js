// http://jsfiddle.net/dcE6e/1/
define([
    "jwebkit",
    "jwebkit.ui",
    "./jwk.wc.core",
    "./jwk.wc.jwk-panel",
    "./jwk.wc.jwk-button",
], function(jwk, ui, wc) {
    console.assert(wc, "wc not loaded correctly");
    return wc;
});