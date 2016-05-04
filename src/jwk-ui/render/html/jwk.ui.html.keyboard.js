define([
    "jwebkit",
    "./jwk.ui.html.core",
    "jquery"
], function(jwk, htmlrender, $) {
    var keyboard = jwk.net.keyboard;
    
    htmlrender.Keyboard = function () {
        
        track_attribute = function (attribute) {
            console.assert(typeof attribute == "string" && attribute.length > 0, attribute);
            var target = $(this.target);
            var wanted = target.closest("["+attribute+"]");
            return wanted.attr(attribute);
        }
        
        track_index_of_attribute = function (attribute) {
            console.assert(typeof attribute == "string" && attribute.length > 0, attribute);
            var target = $(this.target);
            var wanted = target.closest("["+attribute+"]");
            var parent = wanted.parent();
            if (parent.size() > 0) {
                var nodeList = Array.prototype.slice.call( wanted.parent()[0].children );
                return nodeList.indexOf( wanted[0] );
            }            
            return -1;
        }
        
        var keyboard_events = {
            "keydown": true,
            "keypress": true,
            "keyup": true,
            "change": true       
        }
        
        keyboard.on("all", function (n, e) {
            if ( !(n in keyboard_events) ) return;
            var target = $(e.target);
            var comp = target.closest("[ui][path]");
            //var signal = target.closest("[signal]");
            
            e.which = track_attribute;            
            e.index = track_index_of_attribute;            
            e.ui_type = comp.attr("ui");
            e.path = comp.attr("path");
            
            /*
            var entry = $(signal || e.target);
            var parent = entry.parent();
            if (parent.size() > 0) {
                var nodeList = Array.prototype.slice.call( entry.parent()[0].children );
                e.index = nodeList.indexOf( entry[0] );  
            }*/

            e.component = htmlrender.components[e.path];
            
            
            if (e.component && e.component.enabled) {
                if (typeof e.component[n] == "function") {
                    // This allow the component to prepare and trigger a more complex event.
                    e.component[n](n, e);
                    try {
                        
                    } catch (er) {
                        console.error(er);
                        console.error(er.stack());                        
                    }
                    
                } else {
                    e.component.trigger_fast(n, e);
                }
                
            }
            this.trigger_fast(n, e);
        }, this);
    }
    
    htmlrender.Keyboard.prototype = new jwk.Node();
    htmlrender.Keyboard.prototype.constructor = htmlrender.Keyboard;
    
    htmlrender.keyboard = new htmlrender.Keyboard();
    return htmlrender.keyboard;
});
