define("jwk-ajax/jwk.ajax", [
    "jwk-base/jwk.core",
    "./ajax",
    "./ajax/jsonp",
    "./ajax/xhr",
], function(jwk, jQuery) {

    jwk.ajax           = jQuery.ajax;
    jwk.ajaxComplete   = jQuery.ajaxComplete;
    jwk.ajaxError      = jQuery.ajaxError;
    jwk.ajaxSend       = jQuery.ajaxSend;
    jwk.ajaxStart      = jQuery.ajaxStart;
    jwk.ajaxStop       = jQuery.ajaxStop;
    jwk.ajaxSuccess    = jQuery.ajaxSuccess;
    jwk.ajaxSetup      = jQuery.ajaxSetup;
    jwk.ajaxTransport  = jQuery.ajaxTransport;
    jwk.ajaxPrefilter  = jQuery.ajaxPrefilter;
    jwk.getJSON        = jQuery.getJSON;
    jwk.get            = jQuery.get;
    jwk.post           = jQuery.post;
    
    return jwk;
});