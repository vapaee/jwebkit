define([
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "jquery"
], function(jwk, ui, render, $) {    
    var global = jwk.global;
    // console.log("jwk-ui/jwk.ui.set-draggable ------------------------------------------------------------------------------------------------------");
// return console.log("desabilito el set-draggable");
    // console.log("TODO: hay que implementar el cancel object que es una lista de objetos en donde el drag no tiene efecto.");
   
    var ctrl_drag = {
        id: "jwk.set-draggable",
        name: "jwk-draggable",
        prefix: "draggable-"
    };
    
    var default_settings = {
        disable_selection: true,
        lazy: false,
        iFrameFix: true,
        cursorDragging: "default",
        cursorOver: "default",
        applyTo: "target",
        position: "inherit",
        container: "parent", // "body"
        helper: "target",
        cancel: "." + ctrl_drag.prefix + "cancel",
        zIndex: "." + ctrl_drag.prefix + "target, ." + ctrl_drag.prefix + "children > *",
        round: true,
        axis: "both", // "x" o "y"
        grid: {
            enabled: false,
            x: 50,
            y: 50,
            offset: {
                x: 0,
                y: 0
            }
        },
        snap: {
            enabled: false,
            selector: "." + ctrl_drag.prefix + "target, ." + ctrl_drag.prefix + " > *",
            tolerance: 10
        }
    }
    
    var manager;
    
    render.DragManager = function (globalhtml) {
        manager = this;        
        manager._globalhtml = globalhtml;
        manager._dragging = false;
        manager._target = false;
        manager._helper = false;
        jwk.Node.apply(manager);
        manager.init(jwk.global.mouse);
    }
    
    
    // -- initialization ---
    render.DragManager.prototype = new jwk.Node();
    render.DragManager.prototype.constructor = ui.DropManager;
        
    render.DragManager.prototype.dragging = function() {
        return this._dragging;
    }

    render.DragManager.prototype.init = function(mouse) {
        mouse.on("mousedown", function (event_name, event) {
            var draggable = $(event.target).closest("." + ctrl_drag.prefix + "target");
            if (draggable.size() == 0) {
                draggable = $(event.target).closest("." + ctrl_drag.prefix + "children > *");
                controller = draggable.parent().data(ctrl_drag.id);
            } else {
                controller = draggable.data(ctrl_drag.id);
            }
            
            if (draggable.size() > 0) {
                
                var cancel = controller.options.cancel;
                if (cancel) {
                    if ($(event.target).closest(cancel).size() > 0) {
                        manager.cancel_drag();
                        return this;
                    }
                }                
                
                manager.candidate(draggable, controller, event);                
            }        
        }, this);
        mouse.on("mousemove", function (name, event) {
            manager.drag(event);
        }, this);
        mouse.on("mouseup", function (name, event) {
            manager.drop(event);
        }, this);
    }

    render.DragManager.prototype.candidate = function (draggable, controller, event) {
        // console.log("candidate:", jwk.css(draggable));

        /*
        Hay que ver los diferentes casos:
        -- Horizontal --
        - right
        - left
        - left & right                
        - left, right & width

        -- Vertical --
        - top
        - bottom
        - top & bottom                
        - top, bottom & height
        */

        //console.log("candidate() draggable:", draggable);
        if (controller.enabled == false) return this;
        manager._target = draggable;
        manager._dragctrl = controller;
        // manager._event = event;
        manager._options = controller.options;
        manager._mouseclick  = { x: event.pageX, y:event.pageY };
        manager._containment = manager._options.containment;
        manager._initoffset  = draggable.offset();
        var parent_offset = draggable.offsetParent().offset();
        manager._initoffset.top  -= parent_offset.top;  
        manager._initoffset.left -= parent_offset.left;  
        
        manager._axis = manager._options.axis;
        manager._prec = {};
        manager._area = undefined;
        manager._snap = undefined;
        manager._grid = undefined;
        manager._init = jwk.ui.snapshot(draggable); 
        manager._init.css.top_float = parseFloat(manager._init.css.top);
        manager._init.css.left_float = parseFloat(manager._init.css.left);
        manager._init.css.bottom_float = parseFloat(manager._init.css.bottom);
        manager._init.css.right_float = parseFloat(manager._init.css.right);


        switch (manager._options.container) {
            case "parent": manager._helper_container = manager._target.parent();              break;
            case "body":   manager._helper_container = manager._target.closest("body");       break;
            default:       manager._helper_container = manager._options.container || manager._target.parent();
        }

        var t_offset = manager._target.offset();
        var t_size = manager._initsize;

        if (manager._dragctrl.options.containment) {
            var area = null;
            switch(manager._dragctrl.options.containment) {
                case "parent":
                    var parent = manager._target.parent();
                    var p_offset = parent.offset();
                    manager._area = {};
                    manager._area.left   = p_offset.left - t_offset.left;
                    manager._area.top    = p_offset.top - t_offset.top;
                    manager._area.right  = p_offset.left + parent.outerWidth() - (t_offset.left +t_size.w);
                    manager._area.bottom = p_offset.top + parent.outerHeight() - (t_offset.top + t_size.h);
                    break;
                default:
                    console.error("ERROR: containment option not supported yet:", this._dragctrl.options.containment);
            }
        }
        var grid;
        try {
            if (manager._dragctrl.options.grid.enabled) grid = manager._dragctrl.options.grid;
        } catch (e) {}        
        if (grid) {
            //console.log(t_offset, grid.offset);
            var offset = {
                x: grid.offset.x +(t_offset.left % grid.x),
                y: grid.offset.y +(t_offset.top % grid.y)
            }
            manager._grid = $.extend({}, grid,{
                offset: offset
            });
        }        

        var snap;
        try {
            if (manager._dragctrl.options.grid.enabled) snap = manager._snap = manager._dragctrl.options.snap;
        } catch (e) {}        
        if (snap) {
            console.error("TODO: sin implementar");
            // acá lo que tengo que hacer es usar el jwk.util.box2dweb para crear un mundo temporal con los objetos a colisionar
            // y en el drag hacer un update position y luego step para testear colision
            console.log(jwk.thirdparty.box2dweb);                        
        }
    }
    
    render.DragManager.prototype.move = function (motion) {
        console.assert(this == manager, [this, manager]);
        if (manager._area) {
            var containment = manager._area;
            if (motion.x < containment.left)    motion.x = containment.left;
            if (motion.x > containment.right)   motion.x = containment.right;
            if (motion.y < containment.top)     motion.y = containment.top;
            if (motion.y > containment.bottom)  motion.y = containment.bottom;
        }
        if (this._grid) {
            var grid = manager._grid;
            if (grid) {
                var mod, sig;
                // -------
                mod = motion.x % grid.x;
                sig = (mod < 0) ? -1 : 1;
                if (sig * (mod+grid.offset.x) <= grid.range.x) {
                    motion.x -= mod+grid.offset.x;
                }
                if (sig * (mod+grid.offset.x) > grid.x - grid.range.x) {
                    motion.x += sig * grid.x - (mod+grid.offset.x);
                }
                // -------
                mod = motion.y % grid.y;
                sig = (mod < 0) ? -1 : 1;
                if (sig * (mod+grid.offset.y) <= grid.range.y) {
                    motion.y -= mod+grid.offset.y;
                } 
                if (sig * (mod+grid.offset.y) > grid.y - grid.range.y) {
                    motion.y += sig * grid.y - (mod+grid.offset.y);
                }
            }
        }
        if (this._snap) {
            var snap = manager._snap;
            if (snap) {

            }
        }

        var last = manager._helper.offset();
        var diff = {
            dx: motion.x - (last.left - manager._initoffset.left),
            dy: motion.y - (last.top - manager._initoffset.top)
        }
        //console.log("manager._initoffset", manager._initoffset);
        //console.log("last", last);
        //console.log("diff", diff);


        /*

        Aca hay que reformular esta parte:
        Tienen que verse por separado los casos 
        hay que hacer 2 switch case (horizontal y vertical)
        pasar los pixeles a porcentajes si corresponde y aplicar el cambio a los campos que corresponden según el caso.
        */

        function formate_percent(manager, b) {
            var digits = 2;
            if (manager._dragctrl.options.round) {
                var str = ""+b;
                if (str.indexOf(".") > -1) {
                    str = str.substring(0, str.indexOf(".")+1+digits);
                }                            
                return str+ "%";
            } else {
                return b+ "%";
            }
        }
        function formate_pixel(manager, b) {
            //console.log("format",b);
            if (manager._dragctrl.options.round) {
                return Math.round(b)+"px";
            } else {
                return b+"px";
            }
        }                    
        function formate_offset(manager, prop, b, object) {
            var obj = {}; obj[prop] = b;
            object.offset(obj);
            if (manager._dragctrl.options.round) {
                var value = parseFloat(object.offset()[prop]);
                object.css(prop, formate_pixel(manager, value));
            } else {
                return ""+b;
            }
        }                    
        var css = manager._init.css;

        // Horizontal
        switch (manager._init.horizontal) {
            case "left":
                if (css["left_percent"]) {
                    this._helper.css({ left: formate_percent(this, css["left_percent"] + motion.x * css["left_k"]) });
                } else {
                    formate_offset(manager, "left", manager._initoffset.left + motion.x, manager._helper);
                    // this._helper.offset({ left: formate(this, this._initoffset.left + motion.x )});
                }                            
                break;
            case "right":
                if (css["right_percent"]) {
                    manager._helper.css({ right: formate_percent(manager, css["right_percent"] - motion.x * css["right_k"])  });
                } else {
                    // formate_offset("right", parseFloat(this, manager._init.css.right) - motion.x, manager._helper);
                    manager._helper.css({ right: formate_pixel(manager, parseFloat(manager._init.css.right) - motion.x )});
                }                            
                break;
            case "both":
                if (css["left_percent"]) {
                    manager._helper.css({ left: formate_percent(manager, css["left_percent"] + motion.x * css["left_k"])  });
                } else {
                    formate_offset(manager, "left", manager._initoffset.left + motion.x, manager._helper);
                    // this._helper.offset({ left: formate(this, this._initoffset.left + motion.x )});
                }                            
                if (css["right_percent"]) {
                    manager._helper.css({ right: formate_percent(manager, css["right_percent"] - motion.x * css["right_k"])  });
                } else {
                    // formate_offset("right", parseFloat(this, this._init.css.right) - motion.x, this._helper);
                    manager._helper.css({ right: formate_pixel(manager, parseFloat(manager._init.css.right) - motion.x )});
                }                           
                break;
            case "margin":                    
                var percent_motion  = motion.x * css["left_k"];
                var percent_current = 50;
                if (css["left_percent"] < 0 && css["right_percent"] == 0) {
                    percent_current = 50 + 0.5 * css["left_percent"];
                } else if (css["left_percent"] == 0 && css["right_percent"] < 0) {
                    percent_current = 50 - 0.5 * css["right_percent"];
                }
                var css_modif = {};
                if (percent_current + percent_motion <= 50) {
                    css_modif.left    = ((percent_current + percent_motion) * 2 -100) + "%";
                    css_modif.right = "0%";
                } else {
                    css_modif.left    = "0%";
                    css_modif.right = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
                }
                manager._helper.css(css_modif);
                break;
        }

        // Vertical
        switch (manager._init.vertical) {
            case "top":
                if (css["top_percent"]) {
                    manager._helper.css({ top: formate_percent(manager, css["top_percent"] + motion.y * css["top_k"]) });
                } else {
                    formate_offset(manager, "top", manager._initoffset.top + motion.y, manager._helper);
                    // this._helper.offset({ top: formate(this._initoffset.top + motion.y )});
                }
                break;
            case "bottom":
                if (css["bottom_percent"]) {
                    manager._helper.css({ bottom: formate_percent(manager, css["bottom_percent"] - motion.y * css["bottom_k"]) });
                } else {
                    // formate_offset("bottom", parseFloat(this._init.css.bottom) - motion.y, this._helper);
                    manager._helper.css({ bottom: formate_pixel(manager, parseFloat(manager._init.css.bottom) - motion.y )});
                }
                break;
            case "both":
                if (css["top_percent"]) {
                    manager._helper.css({ top: formate_percent(manager, css["top_percent"] + motion.y * css["top_k"]) });
                } else {
                    formate_offset(manager,"top", manager._initoffset.top + motion.y, manager._helper);
                    // this._helper.offset({ top: formate(this._initoffset.top + motion.y )});
                }
                if (css["bottom_percent"]) {
                    manager._helper.css(manager, { bottom: formate_percent(manager, css["bottom_percent"] - motion.y * css["bottom_k"]) });
                } else {
                    // formate_offset("bottom", parseFloat(this._init.css.bottom) - motion.y, this._helper);
                    manager._helper.css(manager, { bottom: formate_pixel(manager, parseFloat(manager._init.css.bottom) - motion.y )});
                }
                break;
            case "margin":
                var percent_motion  = motion.y * css["top_k"];
                var percent_current = 50;
                if (css["top_percent"] < 0 && css["bottom_percent"] == 0) {
                    percent_current = 50 + 0.5 * css["top_percent"];
                } else if (css["top_percent"] == 0 && css["bottom_percent"] < 0) {
                    percent_current = 50 - 0.5 * css["bottom_percent"];
                }
                var css_modif = {};
                if (percent_current + percent_motion <= 50) {
                    css_modif.top    = ((percent_current + percent_motion) * 2 -100) + "%";
                    css_modif.bottom = "0%";
                } else {
                    css_modif.top    = "0%";
                    css_modif.bottom = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
                }
                manager._helper.css(css_modif);


                // console.log(percent_current + percent_motion, percent_motion, css_modif.top, css_modif.bottom, manager._helper.css("top"), manager._helper.css("bottom"));

                /*
                if (at_top <= 50) {
                    css_modif.top    = (at_top * 2 -100) + "%";
                    css_modif.bottom = (- parseFloat(vars.init.css.height) * num) + units;
                } else {
                    css_modif.top    = (- parseFloat(vars.init.css.height) * num) + units;
                    css_modif.bottom = ((100 - at_top) * 2 -100) + units;
                }

                if (css["top_percent"]) {
                    this._helper.css({ top: formate_percent(css["top_percent"] + motion.y * css["top_k"]) });
                } else {
                    formate_offset("top", this._initoffset.top + motion.y, this._helper);
                    // this._helper.offset({ top: formate(this._initoffset.top + motion.y )});
                } 
                */
                break;
        }


        var evt = {
            target: manager._target,
            helper: manager._helper,
            motion: $.extend(diff, motion),
            event: event
        };
        manager._dragctrl.trigger("drag", evt);
        manager.trigger("drag" ,evt);
        manager._target.triggerHandler("drag", evt);
    }
    
    render.DragManager.prototype.drag = function (event) {
        //console.log("drag() dragging:", this._dragging);
        if (this._dragging) {
            var motion = {
                x: manager._axis == "y" ? 0 : event.pageX - manager._mouseclick.x,
                y: manager._axis == "x" ? 0 : event.pageY - manager._mouseclick.y
            }
            this.move(motion);
        } else if (manager._target) {
            manager.start_drag(event);
        } else {
            // just, mousemove

        }
    }
    
    render.DragManager.prototype.drop = function (event) {
        // console.log("drop() dragging:", this._dragging, this._target);
        if (this._dragging) {
            var evt = {
                target: manager._target,
                helper: manager._helper,
                offset: { x: event.pageX - manager._initoffset.left, y: event.pageY - manager._initoffset.top},
                event: event
            }
            var helper = manager._helper; 
            manager._dragging = false;
            manager._target = null;
            manager._helper = null;
            manager._dragctrl.trigger("stop", evt);
            manager.trigger("stop", evt);
            evt.target.triggerHandler("stop", evt);
            manager._globalhtml.css("cursor", "");
            if (manager._dragctrl.options.helper == "clone" || manager._dragctrl.options.helper == "none") {
                helper.remove();
            }
            if (manager._dragctrl.options.iFrameFix) {
                manager._dragctrl.target.closest("body").find("[iFrameFix]").remove();
            }
        }
        this.cancel_drag();
    }
    
    
    render.DragManager.prototype.cancel_drag = function () {
        manager._dragging = manager._target = manager._helper = null;
    }
    
    render.DragManager.prototype.start_drag = function (event) {
        //console.log("start_drag dragging:",this._dragging);
        var manager = this;
        this._helper = this._target;
        var cancel = manager._dragctrl.options.cancel;
        if (cancel) {
            if ($(event.target).closest(cancel).size() > 0) {
                // CANCEL !
                this.cancel_drag();
                return this;
            }
        }
        
        if (manager._dragctrl.options.helper == "clone" || manager._dragctrl.options.helper == "none") {
            manager._helper = manager._target.clone().appendTo(this._helper_container);
            manager._helper.css("position","absolute");
            manager._helper.offset(manager._target.offset());
            manager._helper.css({ bottom: "", right: ""});
            manager._helper.addClass("dragging-helper");
            if (manager._dragctrl.options.helper == "none") {
                manager._helper.css("display","none");
            }
            
        } else {
            switch(this._init.css["position"]) {
                case "absolute":
                case "relative":
                    // todo bien !
                    break;
                default:
                    var offset = manager._helper.offset();
                    manager._helper.css("position","absolute");
                    manager._helper.offset(offset);
            }
        }

        /*this._last_position = this._target.css("position");
        if (!this._last_position == "relative" || this._dragctrl.options.position == "absolute") {
            this._helper.css("position","absolute");
        }*/
        
        manager._dragging = true;
        if (manager._dragctrl.options.zIndex) {
            ui.ontop(manager._helper, $(manager._dragctrl.options.zIndex));
        }
        var evt = {target: manager._target, helper: manager._helper, event: event}
        manager._dragctrl.trigger("start", evt);
        manager.trigger("start", evt);
        manager._target.triggerHandler("start", evt);
        manager._last_cursor = manager._globalhtml.css("cursor");
        manager._globalhtml.css("cursor", manager._dragctrl.options.cursorDragging);

        if (manager._dragctrl.options.iFrameFix) {
            manager._dragctrl.target.closest("body").append(
                $("<div iFrameFix='true' style='z-index:9999'>").css({
                    background: "rgba(0 , 0 , 0 , 0.0001)",
                    top: 0, bottom: 0, left: 0, right: 0, position:"fixed"
                }).disableSelection()
            );
        }				

        manager.drag(event);
    }

    render.drag_manager = render.drag_manager || new render.DragManager($("html"));
    
    render.DraggableController = function(target, args) {
    
        var def_args = default_settings;
        jwk.Node.apply(this);
        this.init(target, $.extend(true, {}, jwk.def_args, def_args, args));
    }
    render.DraggableController.prototype = new jwk.Node();
    render.DraggableController.prototype.constructor = render.DraggableController;    
    render.DraggableController.prototype.type = "draggable";
    
    render.DraggableController.prototype.controller = function () { return controller; }
    render.DraggableController.prototype.update = function (options) {
        // TODO: code to update options with new options
        return this;
    }   
    
    
    
    
    
    // aaaaaaaaAAAAAAAA
    render.DraggableController.prototype.move = function (motion) {
        var aux = this.manager._helper;
        //
        var event = {target: this.target, pageX: 0, pageY:0};
        var controller = this.target.data(ctrl_drag.id);
        this.manager.candidate(this.target, controller, event);
        this.manager.start_drag(event);
        this.manager.move(motion);
        this.manager.drop(event);
        //
        this.manager._helper = aux;
    }
    
    
    
    
    
    render.DraggableController.prototype.enable = function (enabled) {
        this.enabled = enabled;        
        return this;
    }
    render.DraggableController.prototype.init = function (target, options) {
        var ctrlid = "Draggable_"+jwk.nextId();
        this.set("id", ctrlid);

        if (options.grid && options.grid.enabled != false) {
            var grid = options.grid;
            if (grid.range) {
                if (typeof grid.range.x != "number") {
                    if (!isNaN(grid.range)) {
                        grid.range = {x:grid.range, y:grid.range};
                    } else {
                        grid.range = {x:grid.x/2, y:grid.y/2};
                    }
                }
            } else {
                grid.range = {x:grid.x/2, y:grid.y/2};
            }
        }    

        if (!options.lazy && options.applyTo == "target") {
            switch(target.css("position")) {
                case "absolute":
                case "relative":
                    // todo bien!
                    break;
                default:             
                    target.css("position","absolute");
            }                
        }

        this.options = options;
        this.target = target;
        target.attr(this.type, this.get("id"));
        target.addClass(ctrl_drag.prefix + options.applyTo);
        if (options.disable_selection) target.disableSelection();

        target.css("cursor", options.cursorOver);
        // ---------------- 
        var dom = target.closest("html");
        var drag_manager = render.drag_manager;
        console.assert(drag_manager,"No encontre el drag manager", render)
        this.map({
            dom: dom,
            manager: drag_manager
        });
    }    
    
    render.setDraggable = function (target, args) {
        controller = new render.DraggableController(target, args);
        target.data(ctrl_drag.id, controller);
        return controller;
    }
    
    $.fn.setDraggable = function( args ) {
        args = args || {};
        var target = $(this);
        var controller = target.data(ctrl_drag.id);
        if (!controller) {
    
            target.each(function() {
                controller = render.setDraggable($(this), args);
                $(this).data(ctrl_drag.id, controller);
            });
            
            return $.extend(this, { controller: function() {
                if ($(this).size() == 1) return $(this).data(ctrl_drag.id);
                var consoladores = [];
                $(this).each(function(){
                    consoladores.push($(this).data(ctrl_drag.id));
                });
                return $(consoladores);
            }});
            
            return target;
        }         
        return controller.update(args);
    };
    
    return ui.setDraggable;

});