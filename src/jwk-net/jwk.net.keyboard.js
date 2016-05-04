define("jwk-net/jwk.net.keyboard",[
    "jwk-model/jwk.model",
    "jwk-net/jwk.net.core",    
    "jwk-net/jwk.net.proxy"
], function(jwk, net) {
    var keyboard_net_id = "jwk.net.keyboard";
  
    jwk.NetKeyboard = function (id, net) {
        var keyboard = this;
        
        keyboard.last_pageY = -1;
        keyboard.last_pageX = -1;
        jwk.Proxy.apply(this, arguments);
                
        var events = [
            "keydown",
            "keypress",
            "keyup",
            "change",
        ];        
        
        for (var i=0; i<events.length; i++) {
            var event = events[i];
            var onevent = "on"+event;
            
            window[onevent] = function (event) {

                keyboard.last_pageY = event.pageY;
                keyboard.last_pageX = event.pageX;            

                var evt = {
                    altKey:             event.altKey,
                    ctrlKey:            event.ctrlKey,
                    metaKey:            event.metaKey,
                    pageX:              event.pageX,
                    pageY:              event.pageY,
                    shiftKey:           event.shiftKey,
                    timeStamp:          event.timeStamp,
                    type:               event.type
                }                    
                // -----------------------------------------
                // http://stackoverflow.com/a/27240494/2274525
                //Google chrome retardedness
                if(event.keyIdentifier) {
                    evt.keyCode       = parseInt(event.keyIdentifier.substr(2), 16);
                }
                //not that the other browsers are any closer to something systematic and logical
                else {
                    evt.keyCode       = event.keyCode;
                }                
                // -----------------------------------------

                keyboard.trigger_extern(event.type, evt);

                evt.currentTarget = event.currentTarget;
                evt.target = event.target;                    

                keyboard._local.trigger(event.type, evt);

                if (event.type == "contextmenu") {
                    return false;
                }
                
            };
        }
    };
    
    
    jwk.NetKeyboard.prototype = new jwk.Proxy();
    jwk.NetKeyboard.prototype.constructor = jwk.NetKeyboard;    
    
    jwk.net.keyboard = net.proxy(keyboard_net_id, jwk.NetKeyboard);
    
    return jwk.net.keyboard;
});


