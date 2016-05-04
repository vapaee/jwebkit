define([
    "jwebkit",
    "jquery"
], function( jwk, $ ) {
    // console.log("jwk-ui/jwk.ui.core ------------------------------------------------------------------------------------------------------");

    jwk.UserInterface = function () {
        var ui = this;
        jwk.Node.apply(ui);
    }
    
    jwk.UserInterface.prototype = new jwk.Node();
    jwk.UserInterface.prototype.constructor = jwk.UserInterface;
    
    jwk.ui = new jwk.UserInterface();
    var ui = jwk.ui;
    
    jwk.ui.window = new jwk.Object();
    window.onresize = function (event) {
        //console.debug("window.onresize 1");
        jwk.ui.window.trigger_fast("resize", event);
    };
    window.addEventListener("onresize", function (event) {
        //console.debug("window.onresize 2");
        jwk.ui.window.trigger_fast("resize", event);
    });            
    window.addEventListener("resize", function (event) {
        //console.debug("window.onresize 3");
        jwk.ui.window.trigger_fast("resize", event);
    });
    
    
    
    ui.on("handler:change:render", function (n, e) {
        // Alguien se suscribió al seteo del render para poder obtenerlo asi: jwk.ui.render
        if (typeof ui.render != "undefined") {
            // jwk.ui.render ya fue asignado por lo que el evento "change:render" ya fue gatillado.
            // Hay que volver a gatillar para que quien esté escuchando no lo haga por siempre        
            // console.error("ui.on('handler:change:render')","volvemos a gatillar!!!!!", ui.render, ui, e);
            var force = true;
            ui.set("render", ui.render, force);
        } else {
            // al parecer el render no ha sido asignado todavía por lo que el evento no ha sido gatillado.
            // Si todo va bien, ocurrirá en breve sin problemas.
            // console.error("ui.on('handler:change:render')", ui.render, ui, e);
        }
    });

    ui.which_browser = function() {
        try {
            if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0)
                return "opera";
        } catch (e) {}
        try {
            if (typeof InstallTrigger !== 'undefined')
                return "firefox";
        } catch (e) {}
        try {
            if (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0)
                return "safari";
        } catch (e) {}
        try {
            if (!!window.chrome && !isOpera)
                return "chrome";
        } catch (e) {}
        try {
            if (document.documentMode)
                return "ie";
        } catch (e) {}
    }
     
            
    ui.ontop = function(target, all) {
        // console.log("ui.ontop", arguments);
        // sort by the z-index if pressent
        var group = jwk.makeArray(all).sort(function(a,b) {
            return (parseInt($(a).css("zIndex"),10) || 0) - (parseInt($(b).css("zIndex"), 10) || 0);
        });
        if (!group.length) { return; }
        
        // get the lowest zIndex
        var min = parseInt($(group[0]).css("zIndex")) || 0;
        
        // get out the selected object 
        var pos = group.indexOf( target[0] );
        group.splice( pos, 1 );
        
        // Lo coloco al final
        group.push(target[0]);
        
        $(group).each(function(i) {
            $(this).css("zIndex", min + i);             
        });
    }    

    
    ui.css = function (source) {
        var browser = ui.which_browser();
        var css = {
            width:        source.width(),
            height:       source.height(),
            top:          source.css("top"),
            left:         source.css("left"),
            right:        source.css("right"),
            bottom:       source.css("bottom"),
            position:     source.css("position"),
            display:      source.css("display"),
            marginLeft:   source.css("margin-left"),
            marginRight:  source.css("margin-right"),
            marginTop:    source.css("margin-top"),
            marginBottom: source.css("margin-bottom"),
            margin:       source.css("margin")
        }        

        
        var style = source[0].style;
        if (style instanceof CSSStyleDeclaration) {
            for (var i=0; i<style.length; i++) {
                function camelize(str) {
                  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
                    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
                    return index == 0 ? match.toLowerCase() : match.toUpperCase();
                  });
                }                
                var name = camelize(style[i]); //.camelize(false);
                css[name] = style[name];
            }
        }
        
        switch (browser) {
            case "firefox":
                css.marginLeft   = style["marginLeft"];
                css.marginRight  = style["marginRight"];
                css.marginTop    = style["marginTop"];
                css.marginBottom = style["marginBottom"];
                css.left         = style["left"];
                css.right        = style["right"];
                css.top          = style["top"];
                css.bottom       = style["bottom"];

                css.left         = (css.left == "")         ? "auto" : css.left;
                css.right        = (css.right == "")        ? "auto" : css.right;
                css.top          = (css.top == "")          ? "auto" : css.top;
                css.bottom       = (css.bottom == "")       ? "auto" : css.bottom;
                
                var top          = (css.marginTop == "")    ? "0px" : css.marginTop;
                var left         = (css.marginLeft == "")   ? "0px" : css.marginLeft;
                var right        = (css.marginRight == "")  ? "0px" : css.marginRight;
                var bottom       = (css.marginBottom == "") ? "0px" : css.marginBottom;
                css.margin       = top + " " + right + " " + bottom + " " + left;
        }
        
        // TODO: tengo que arreglar el problema de que si es "" alguno me queda una separación de dos espacios seguidos cuando debería haber un 0px
        return css;
    }
    
        
    ui.snapshot = function (source) {
        // console.log("jwk.ui.snapshot", source);
        var css = ui.css(source);
        var shot = { css: css };

        // -- Horizontal --
        if (css["right"] == "auto" || typeof css["right"] == "undefined") {
            // no tiene rihgt
            shot.horizontal = "left";
        } else  {
            // tiene rihgt
            if (css["left"] == "auto" || typeof css["left"] == "undefined") {
                // no tiene left pero tiene rihgt
                // - righ   
                shot.horizontal = "right";                        
            } else  {
                // tiene left y right
                if (css["width"] == "auto" || typeof css["width"] == "undefined") {
                    // no tiene width pero tiene left y right
                    // - left & right                
                    shot.horizontal = "both";                            
                } else  {
                    // tiene width, left y right
                    // - left, right & width                
                    shot.horizontal = "margin";                            
                }                          
            }                    
        }

        // -- Vertical --
        if (css["bottom"] == "auto" || typeof css["bottom"] == "undefined") {
            // no tiene bottom
            shot.vertical = "top";
        } else  {
            // tiene bottom
            if (css["top"] == "auto" || typeof css["top"] == "undefined") {
                // no tiene top pero tiene bottom
                // - bottom   
                shot.vertical = "bottom";                        
            } else  {
                // tiene top y bottom
                if (css["height"] == "auto" || typeof css["height"] == "undefined") {
                    // no tiene width pero tiene top y bottom
                    // - top & right                
                    shot.vertical = "both";
                } else  {
                    // tiene width, top y bottom
                    // - top, bottom & width                
                    shot.vertical = "margin";                            
                }                          
            }                    
        }  

        var prop;
        var side;

        side = "height";
        prop = "top";
        var mystyle = source[0].style;
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        prop = "bottom";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }                
        side = "width";
        prop = "left";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        prop = "right";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        
        return shot;
    }
    
    
    ui.setDraggable = function (component, settings) {
        console.error("Esto lo usa alguien o lo puedo sacar?");
        alert("Opa, no podés sacar esto al parecer");
        return ui.render.set_draggable(settings);
    }
    
    return jwk.ui;

});

            