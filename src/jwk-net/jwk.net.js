define("jwk-net/jwk.net", [
    "jwk-base/jwk.core",
    "jwk-net/jwk.net.core",
    "jwk-net/jwk.net.proxy",
    "jwk-net/jwk.net.mouse",
    "jwk-net/jwk.net.keyboard",
    "jwk-net/jwk.net.dragndrop"
], function(jwk, net) {
    return net;
});