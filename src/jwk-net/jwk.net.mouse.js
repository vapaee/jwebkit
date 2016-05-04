define("jwk-net/jwk.net.mouse", [
    "jwk-model/jwk.model",
    "jwk-net/jwk.net.core",
    "jwk-net/jwk.net.proxy"
], function(jwk, global) {
    var mouse_global_id = "jwk.global.mouse";
    

    jwk.GlobalMouse = function (id, global) {
        var mouse = this;

        
        mouse.last_pageY = -1;
        mouse.last_pageX = -1;
        jwk.Proxy.apply(this, arguments);
                
        var events = [
            "click",      // The event occurs when the user clicks on an element
            "dblclick",   // The event occurs when the user double-clicks on an element
            "mousedown",  // The event occurs when a user presses a mouse button over an element
            "mousemove",  // The event occurs when the pointer is moving while it is over an element
            "mouseover",  // The event occurs when the pointer is moved onto an element
            "mouseout",   // The event occurs when a user moves the mouse pointer out of an element
            "mouseup",    // The event occurs when a user releases a mouse button over an element	     
            "contextmenu"
        ];
        
        
        for (var i=0; i<events.length; i++) {
            var event = events[i];
            var onevent = "on"+event;
            
            window[onevent] = function (event) {
                
                if (event.type == "mousemove") {
                    if (mouse.last_pageY == event.pageY && mouse.last_pageX == event.pageX) {
                        // the mouse dosn't really moved. Cancel event
                        // console.log("aborting mouse move");
                        return this;
                    }
                }
                mouse.last_pageY = event.pageY;
                mouse.last_pageX = event.pageX;
                
                // if (simple) {
                    // Posible optimización: usar el trigger_fast
                    // Se podría mantener un objeto event pre hecho y que solo necesite actualizar pageX, pageY y timeStamp. Así evitar pasar datos innecesarios
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
                    mouse.trigger_extern(event.type, evt);
                    
                    evt.currentTarget = event.currentTarget;
                    evt.target = event.target;                    
                    
                    mouse._local.trigger(event.type, evt);
                /*} else {
                    mouse.trigger(event.type, {
                        altKey:             event.altKey,
                        bubbles:            event.bubbles,
                        button:             event.button,
                        cancelBubble:       event.cancelBubble,
                        cancelable:         event.cancelable,
                        charCode:           event.charCode,
                        clientX:            event.clientX,
                        clientY:            event.clientY,
                        clipboardData:      event.clipboardData,
                        ctrlKey:            event.ctrlKey,
                        currentTarget:      event.currentTarget,
                        dataTransfer:       event.dataTransfer,
                        defaultPrevented:   event.defaultPrevented,
                        detail:             event.detail,
                        eventPhase:         event.eventPhase,
                        fromElement:        event.fromElement,
                        keyCode:            event.keyCode,
                        layerX:             event.layerX,
                        layerY:             event.layerY,
                        metaKey:            event.metaKey,
                        offsetX:            event.offsetX,
                        offsetY:            event.offsetY,
                        pageX:              event.pageX,
                        pageY:              event.pageY,
                        relatedTarget:      event.relatedTarget,
                        returnValue:        event.returnValue,
                        screenX:            event.screenX,
                        screenY:            event.screenY,
                        shiftKey:           event.shiftKey,
                        srcElement:         event.srcElement,
                        target:             event.target,
                        timeStamp:          event.timeStamp,
                        toElement:          event.toElement,
                        type:               event.type,
                        view:               event.view,
                        webkitMovementX:    event.webkitMovementX,
                        webkitMovementY:    event.webkitMovementY,
                        which:              event.which,
                        x:                  event.x,
                        y:                  event.y
                    });
                }
                */
                /*for (var name in event) {
                    console.log(name, typeof event[name], event[name]);
                }*/
                if (event.type == "contextmenu") {
                    return false;
                }
                
            };
        }
    };
    
    
    jwk.GlobalMouse.prototype = new jwk.Proxy();
    jwk.GlobalMouse.prototype.constructor = jwk.GlobalMouse;    
    
    jwk.global.mouse = global.proxy(mouse_global_id, jwk.GlobalMouse);
    
    return jwk.global.mouse;
});


