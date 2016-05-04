define([
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "./jwk.ui.html.set-draggable",
    "jquery"
], function(jwk, ui, render, draggable, $) {
    // console.log("jwk-ui/jwk.ui.set-position ------------------------------------------------------------------------------------------------------");
        
    var ctrl_pos = {
        id: "jwk.set-position",
        name: "jwk-position",
        prefix: "position-"
    };

    position_relative = function (controller) {

        var _my = controller.options.my.split(" "); if(_my.length == 1) _my.push(_my[0]);
        var _at = controller.options.at.split(" "); if(_at.length == 1) _at.push(_at[0]);
        var offset_parent = controller.target.offsetParent();
        var css_modif = {}
        var vars = {
            init: jwk.ui.snapshot(controller.target),
            my: {x:0, y:0},
            at: {x:0, y:0},
            edge: {x:_at[0], y:_at[1]},
            value: {x:0, y:0},
            mystyle: controller.target[0].style,
            mysize: {
                w:controller.target.outerWidth(),
                h:controller.target.outerHeight()
            },
            ofsize: {
                w:controller.options.of.outerWidth(),
                h:controller.options.of.outerHeight()
            },
        }

        // console.log("position_relative", _my, _at, vars.my, vars.at, vars, vars.init);

        var num = 0;
        switch (_at[0]) {
            case "left":
                switch (_my[0]) {
                    case "left":   num = 0; break;
                    case "center": num = 0.5; break;
                    case "right":  num = 1; break;
                    default:
                        // percent expresion. ej: 45% --> 0.45
                        if (/\d+%/.test(_my[0])) num = parseFloat(_my[0]) * 0.01;
                }
                if (/\d+%/.test(vars.init.css.width)) {
                    css_modif.right = "";
                    css_modif.left = - (parseFloat(vars.init.css.width) * num) + "%";
                } else if (/\d+px/.test(vars.init.css.width)) {
                    css_modif.right = "";
                    css_modif.left = - (parseFloat(vars.init.css.width) * num) + "px";
                } else {
                    if (vars.init.horizontal == "both") {
                        if (/\d+px/.test(vars.init.css.left) && /\d+px/.test(vars.init.css.right)) {
                            var offset = num * (offset_parent.width() - parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right));
                            css_modif.left = (-offset) +"px";
                            css_modif.right = (offset + parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right)) + "px";
                        } else {
                            console.log("lo siento caso no implementado");
                        }
                    } else {
                        console.log("lo siento caso no implementado");
                    }
                }
                break;
            case "right":
                switch (_my[0]) {
                    case "left":   num = 1; break;
                    case "center": num = 0.5; break;
                    case "right":  num = 0; break;
                    default:
                        // percent expresion. ej: 45% --> (1-0.45) 0.55 (from right POV)
                        // asumimos que el porcentaje siempre esta dicho desde left (a menos que _my.length == 4)
                        if (/\d+%/.test(_my[0])) num = (1-parseFloat(_my[0]) * 0.01); 
                }
                if (/\d+%/.test(vars.init.css.width)) {
                    css_modif.left = "";
                    css_modif.right = (- parseFloat(vars.init.css.width) * num) + "%";
                } else if (/\d+px/.test(vars.init.css.width)) {
                    css_modif.left = "";
                    css_modif.right = (- parseFloat(vars.init.css.width) * num) + "px";
                } else {
                    if (vars.init.horizontal == "both") {
                        if (/\d+px/.test(vars.init.css.left) && /\d+px/.test(vars.init.css.right)) {
                            var offset = num * (offset_parent.width() - parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right));
                            css_modif.right = (-offset) +"px";
                            css_modif.left = (offset + parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right)) + "px"; 
                        } else {
                            console.log("lo siento caso no implementado");
                        }
                    } else {
                        console.log("lo siento caso no implementado");
                    }
                }
                break;                        
            case "center":
                num = 0.5;
            default:
                var at_left;
                if (/\d+%/.test(_at[0])) {
                    // asumo que siempre es desde el punto de vista left
                    num = parseFloat(_at[0]) * 0.01;
                }
                at_left = 100 * num;
                css_modif.left = at_left + "%";
                switch (_my[1]) {
                    case "left":   num = 1; break;
                    case "center": num = 0; break;
                    case "right":  num = -1; break;
                    default:
                        if (/\d+%/.test(_my[1])) num = parseFloat(_my[1]) * 0.01;
                }

                // El siguiente código resuelve el posicionamiento de el objeto expresando su posición mediante left y right
                // manteniendo los margin-left y margin-right en auto
                var units = false;
                if (/\d+%/.test(vars.init.css.width)) {
                    units = "%";
                } else if (/\d+(px)?/.test(vars.init.css.width)) {
                    units = "px";
                }

                // Percent Aligment (CSS solution) http://jsfiddle.net/SQDJ6/
                if (units) {
                    if (at_left <= 50) {
                        css_modif.left    = (at_left * 2 -100) + "%";
                        css_modif.right = (- parseFloat(vars.init.css.width) * num) + units;
                    } else {
                        css_modif.left    = (- parseFloat(vars.init.css.width) * num) + units;
                        css_modif.right = ((100 - at_left) * 2 -100) + units;
                    }
                    css_modif["margin-left"]  = "auto";
                    css_modif["margin-right"] = "auto";
                } else if (vars.init.horizontal == "both") {
                    if (at_left == 50) {
                        var margin = (parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right)) * 0.5;
                        css_modif.right  = margin + "px";
                        css_modif.left   = margin + "px";
                    } else {
                        console.log("lo siento caso no implementado");
                    }                                
                }                
                
                
                /*
                // El siguiente código genera el mismo efecto solo que la posición queda expresada como left: X%
                
                switch (_my[0]) {
                    case "left":   num = 0; break;
                    case "center": num = 0.5; break;
                    case "right":  num = 1; break;
                    default:
                        // percent expresion. ej: 45% --> (1-0.45) 0.55 (from right POV)
                        // asumimos que el porcentaje siempre esta dicho desde left (a menos que _my.length == 4)
                        if (/\d+%/.test(_my[0])) num = parseFloat(_my[0]) * 0.01; 
                }

                if (/\d+%/.test(vars.init.css.width)) {
                    css_modif["margin-left"] = (- parseFloat(vars.init.css.width) * num) + "%";
                } else if (/\d+(px)?/.test(vars.init.css.width)) {
                    css_modif["margin-left"] = (- parseFloat(vars.init.css.width) * num) + "px";
                } else if (vars.init.horizontal == "both") {
                    if (at_left == 50) {
                        var margin = (parseFloat(vars.init.css.left) + parseFloat(vars.init.css.right)) * 0.5;
                        css_modif.right = margin + "px";
                        css_modif.left  = margin + "px";
                    } else {
                        console.log("lo siento caso no implementado");
                    }                                
                }
                */                        
                break;
                
                
        }



        switch (_at[1]) {
            case "top":
                switch (_my[1]) {
                    case "top":   num = 0; break;
                    case "center": num = 0.5; break;
                    case "bottom":  num = 1; break;
                    default:
                        // percent expresion. ej: 45% --> 0.45
                        if (/\d+%/.test(_my[1])) num = parseFloat(_my[1]) * 0.01;
                }
                if (/\d+%/.test(vars.init.css.height)) {
                    css_modif.bottom = "";
                    css_modif.top = (- parseFloat(vars.init.css.height) * num) + "%";
                } else if (/\d+(px)?/.test(vars.init.css.height)) {
                    css_modif.bottom = "";
                    css_modif.top = (- parseFloat(vars.init.css.height) * num) + "px";
                } else {
                    if (vars.init.vertical == "both") {
                        if (/\d+(px)?/.test(vars.init.css.top) && /\d+(px)?/.test(vars.init.css.bottom)) {
                            var offset = num * (offset_parent.height() - parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom));
                            css_modif.top = (-offset) +"px";
                            css_modif.bottom = (offset + parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom)) + "px";
                        } else {
                            console.log("lo siento caso no implementado");
                        }
                    } else {
                        console.log("lo siento caso no implementado");
                    }
                }
                break;
            case "bottom":
                switch (_my[1]) {
                    case "top":   num = 1; break;
                    case "center": num = 0.5; break;
                    case "bottom":  num = 0; break;
                    default:
                        // percent expresion. ej: 45% --> (1-0.45) 0.55 (from bottom POV)
                        // asumimos que el porcentaje siempre esta dicho desde top (a menos que _my.length == 4)
                        if (/\d+%/.test(_my[1])) num = (1-parseFloat(_my[1]) * 0.01); 
                }
                if (/\d+%/.test(vars.init.css.height)) {
                    css_modif.top = "";
                    css_modif.bottom = (- parseFloat(vars.init.css.height) * num) + "%";
                } else if (/\d+(px)?/.test(vars.init.css.height)) {
                    css_modif.top = "";
                    css_modif.bottom = (- parseFloat(vars.init.css.height) * num) + "px";
                } else {
                    if (vars.init.vertical == "both") {
                        if (/\d+(px)?/.test(vars.init.css.top) && /\d+(px)?/.test(vars.init.css.bottom)) {
                            var offset = num * (offset_parent.height() - parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom));
                            css_modif.bottom = (-offset) +"px";
                            css_modif.top = (offset + parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom)) + "px"; 
                        } else {
                            console.log("lo siento caso no implementado");
                        }
                    } else {
                        console.log("lo siento caso no implementado");
                    }
                }
                break;                        
            case "center":
                num = 0.5;
            default:
                var at_top;
                if (/\d+%/.test(_at[1])) {
                    // asumo que siempre es desde el punto de vista top
                    num = parseFloat(_at[1]) * 0.01;
                }
                at_top = 100 * num;
                switch (_my[1]) {
                    case "top":   num = 1; break;
                    case "center": num = 0; break;
                    case "bottom":  num = -1; break;
                    default:
                        if (/\d+%/.test(_my[1])) num = parseFloat(_my[1]) * 0.01;
                }
                var units = false;
                if (/\d+%/.test(vars.init.css.height)) {
                    units = "%";
                } else if (/\d+(px)?/.test(vars.init.css.height)) {
                    units = "px";
                }

                // Percent Aligment (CSS solution) http://jsfiddle.net/SQDJ6/
                if (units) {
                    if (at_top <= 50) {
                        css_modif.top    = (at_top * 2 -100) + "%";
                        css_modif.bottom = (- parseFloat(vars.init.css.height) * num) + units;
                    } else {
                        css_modif.top    = (- parseFloat(vars.init.css.height) * num) + units;
                        css_modif.bottom = ((100 - at_top) * 2 -100) + units;
                    }
                    css_modif["margin-top"]    = "auto";
                    css_modif["margin-bottom"] = "auto";
                } else if (vars.init.vertical == "both") {
                    if (at_top == 50) {
                        var margin = (parseFloat(vars.init.css.top) + parseFloat(vars.init.css.bottom)) * 0.5;
                        css_modif.bottom = margin + "px";
                        css_modif.top    = margin + "px";
                    } else {
                        console.log("lo siento caso no implementado");
                    }                                
                }
        }                

        //console.log("position_relative", "css_modif:", css_modif);
        if (vars.init.css["position"] == "static") css_modif.position = "absolute";
        controller.vars = vars;				
        controller.target.css(css_modif);
    }

    of_target_moved = function (controller) {
        // _of_target_moved is called only for update non-relative position
        var offset = controller.options.of.offset();
        var vars = controller.vars;
        
        var pos = {
            top:  offset.top + vars.at.y, // offset.top  - offset.top+outherHeight
            left: offset.left + vars.at.x // offset.left - offset.left+outherHeight
        }
        var my = {
            top:  vars.my.y,  // 0 - outherHeight
            left: vars.my.x   // 0 - outherWidth
        };

        controller.target.offset({
            top:  my.top  + pos.top,
            left: my.left + pos.left
        });

        return this;
    }    

    update_vars = function (controller) {

        var _my = controller.options.my.split(" "); if(_my.length == 1) _my.push(_my[0]);
        var _at = controller.options.at.split(" "); if(_at.length == 1) _at.push(_at[0]);

        var vars = {
            my: {x:_my[0], y:_my[1]},
            at: {x:_at[0], y:_at[1]},
            mysize: {
                w:controller.target.outerWidth(),
                h:controller.target.outerHeight()
            },
            ofsize: {
                w:controller.options.of.outerWidth(),
                h:controller.options.of.outerHeight()
            },
        }

        switch (_my[0]) {
            case "left":   vars.my.x = 0; break;
            case "center": vars.my.x = - vars.mysize.w / 2; break;
            case "right":  vars.my.x = - vars.mysize.w; break;
            case "top":
            case "bottom":
                console.error("ERROR: position.my must be expresed like 'Horizontal Vertical' but got the other way round");
                break;    
                
            default:
                // percent expresion. ej: 45% --> 0.45
                if (/\d+%/.test(_my[0])) vars.my.x = parseInt(_my[0]) * 0.01;
        }

        switch (_my[1]) {
            case "top":   vars.my.y = 0; break;
            case "center": vars.my.y = - vars.mysize.h / 2; break;
            case "bottom":  vars.my.y = - vars.mysize.h; break;
            case "left":
            case "right":
                console.error("ERROR: position.my must be expresed like 'Horizontal Vertical' but got the other way round");
            default:
                if (/\d+%/.test(_my[1])) vars.my.y = parseInt(_my[1]) * 0.01;
        }

        switch (_at[0]) {
            case "left":   vars.at.x = 0; break;
            case "center": vars.at.x = vars.ofsize.w / 2; break;
            case "right":  vars.at.x = vars.ofsize.w; break;
            case "top":
            case "bottom":
                console.error("ERROR: position.at must be expresed like 'Horizontal Vertical' but got the other way round");
            default:
                if (/\d+%/.test(_at[0])) vars.at.x = parseInt(_at[0]) * 0.01;
        }

        switch (_at[1]) {
            case "top":   vars.at.y = 0; break;
            case "center": vars.at.y = vars.ofsize.h / 2; break;
            case "bottom":  vars.at.y = vars.ofsize.h; break;
            case "left":
            case "right":
                console.error("ERROR: position.at must be expresed like 'Horizontal Vertical' but got the other way round");
            default:
                if (/\d+%/.test(_at[1])) vars.at.y = parseInt(_at[1]) * 0.01;
        }

        controller.vars = vars;
    }

    render.PositionController = function(target, args) {
        var controller = this;
        jwk.Node.apply(controller);
        controller.init(target, args);        
    }

    render.PositionController.prototype = new jwk.Node();
    render.PositionController.prototype.constructor = render.PositionController;
    render.PositionController.prototype.type = "position";
    
    render.PositionController.prototype.controller = function () { return this; }
    
    function try_to_find_the_of_target(options) {
        var of_target;
        switch (typeof options.of) {
            case "undefined":
                console.error("ERROR: position.of object MUST be specificated in order to position the target rilatively to it.", this, options);
                break;
            case "object":
                // Is it a jquery object?
                if (options.of instanceof $) {
                    if (options.of.length == 0) console.warn("WARNING: position.of has a valid jquery object but no dom object asociated", options, this.target, this);
                    of_target = options.of;
                    break;
                }
                
                if (options.of.target instanceof $) {
                    of_target = options.of.target;
                    break;
                }
                break;
            case "string":
                // let's try to find out if it is a jquery valid selector
                
                of_target = $(options.of);
                if (of_target.length > 0) break;
                
                if (options.of == "container") {
                    of_target = this.target.parent();
                    if (of_target.length > 0) break;
                }                
                
                if (options.of == "screen") {
                    of_target = $("body");
                    if (of_target.length > 0) break;
                }                
                
                if (this.component) {
                    // We are working width jwk.ui components library
                    
                    // Is it the component parent?
                    if (options.of == "parent") {
                        var parent = this.component.parent;
                        if (parent) of_target = parent.target;
                        if (of_target.length > 0) break;
                    }
                    
                    // Is it the component owner?
                    if (options.of == "owner") {
                        var owner = this.component.owner;
                        if (owner) of_target = owner.target;
                        if (of_target.length > 0) break;
                    }
                    
                    // is it an absolute path to an other component?
                    if (render.components[options.of]) of_target = render.components[options.of].target;
                    if (of_target.length > 0) break;
                }
                
                break;
        }
        return of_target;
    }

    render.PositionController.prototype.update = function (options) {
        // TODO: code to update options width new options
        if (options) {
            this.component = options.component; // jwk.ui components
            this.options = options;
            var of_target = try_to_find_the_of_target.call(this, options);            
            console.assert(of_target, "ERROR: could't be found a dom object identified by", options.of, "for the target", this.target);
            options.of = of_target;            
            console.assert(this.options.of.size() > 0, options);            
        }
        
        if (this.options.position) {
            var pos = this.options.position;
            console.assert( pos === "absolute" || pos === "fixed" || pos === "relative");
            var of = this.target.offset();                
            this.target.css("position", pos);
            this.target.offset(of);           
        }                        

        this.options.relative = this.target.parent()[0] == this.options.of[0] && this.target.parent().css("position") in {"absolute":1, "relative":1};
        // if controller.target is being dragged, update position must not be performed
        if (jwk.ui.render.drag_manager._target &&
            this.target[0] == jwk.ui.render.drag_manager._target[0]) {
            return this;
        }
        if (this.options.relative) {
            position_relative(this);
        } else {
            update_vars(this);
            of_target_moved(this);
        }
        return this;
    }

    render.PositionController.prototype.init = function (target, options) {
        // console.log("controller.init:", target, options);
        var ctrlid = "Position_" +jwk.nextId();
        this.set("id", ctrlid);
        this.target = $(target);        
        this.update(options);
        // console.assert(jwk.ui.render.drag_manager, "jwk.ui.render.drag_manager MUST exist in order to set positions");
        var controller = this;
        
        if (options.update_on) {
            $( window ).on(options.update_on,function() {
                controller.update();
            });
        }

        if (!options.relative) {
            
            if (jwk.ui.render.drag_manager) {
                jwk.ui.render.drag_manager.on("start", function (e_name, event) {
                    // if whatever been dragging is or contains the followed object (controller.options.of) position must be updated each drag event
                    controller.forgetit = $(event.target)[0] != controller.options.of[0] && !$(controller.options.of).parents().is(event.target);
                });
    
                jwk.ui.render.drag_manager.on("drag", function (e_name, event) {
                    if(controller.forgetit) return;
                    of_target_moved(controller);
                });
    
                jwk.ui.render.drag_manager.on("stop", function (e_name, event) {
                    controller.forgetit = true;
                });
            } else {
                error.warn("WARNING: not drag manager found so positioned objects will not be updated if some object is dragged some other way.");
            }
            
            $(window).on("resize",function(e_name, evt) {
                controller.update();
            });
        }

        target.attr(controller.type, controller.get("id"));
        target.addClass(ctrl_pos.name);
        // target.disableSelection();
    }

    render.setPosition = function (target, args) {
        var _args = $.extend({}, args);
        controller = new render.PositionController(target, _args);
        target.data(ctrl_pos.id, controller);
        return controller;
    }
    
    $.fn.setPosition = function( args ) {
        var target = $(this);
        if (typeof args === "string") {
            args = { position: args };
        }        
        var controller = $(this).data(ctrl_pos.id);
        if (!controller) {
            target.each(function() {
                controller = render.setPosition($(this), args);
                $(this).data(ctrl_pos.id, controller);
            });
            return $.extend(this, { controller: function() {
                if ($(this).size() == 1) return $(this).data(ctrl_pos.id);
                var consoladores = [];
                $(this).each(function(){
                    consoladores.push($(this).data(ctrl_pos.id));
                });
                return $(consoladores);
            }});
        }         
        return controller.update(args);
    };

    return render.setPosition;

});