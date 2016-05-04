define([
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "./jwk.ui.html.set-draggable",
    "./jwk.ui.html.set-position",
    "jquery"
], function(jwk, ui, render, draggable, position, $) {
    // console.log("jwk-ui/jwk.ui.set-resizable ------------------------------------------------------------------------------------------------------");
    
    var ctrl_res = {
        id: "jwk.set-resizable",
        name: "jwk-resizable",
        prefix: "resizable-",
        help_prefix: "helper-",
        help_common: "resizable-helper"
    };
    
    function update_vars (controller, force) {
        var trigger = false;
        var t_w = controller.target.outerWidth();
        var t_h = controller.target.outerHeight();

        if (controller.vars.size.w != t_w || force) {
            controller.vars.size.w = t_w;
            trigger = true;
            if (!controller.relative) {
                controller.handlers
                    .children("."+ctrl_res.help_prefix+"n, ."+ctrl_res.help_prefix+"s")
                    .width(t_w - controller.options.margin.w);
            }
        }
        if (controller.vars.size.h != t_h || force) {
            controller.vars.size.h = t_h;
            trigger = true;
            if (!controller.relative) {
                controller.handlers
                    .children("."+ctrl_res.help_prefix+"e, ."+ctrl_res.help_prefix+"w")
                    .height(t_h - controller.options.margin.h);
            }
        }                
        if (trigger) {
            var evt = {target:controller.target};
            controller.trigger("resize", evt);
            controller.target.triggerHandler("resize", evt);
        }
    }
    
    function create_helpers (controller, handles) {
        // controller.handlers.children("." + ctrl_res.help_common).remove();
        if (handles[0] == "")return;
        positions = {
            n:  {my:"center center", at: "center top"},
            e:  {my:"center center", at: "right center"},
            s:  {my:"center center", at: "center bottom"},
            w:  {my:"center center", at: "left center"},
            ne: {my:"center center", at: "right top"},
            se: {my:"center center", at: "right bottom"},
            sw: {my:"center center", at: "left bottom"},
            nw: {my:"center center", at: "left top"}
        }

        var div = $("<div>").css({
            width: "10px",
            height: "10px",
            // background: "transparent",// "transparent" or "black"
            "z-index": 100,
            position: "absolute"
        });

        $(controller.helpers).each(function(){
            $(this).remove();
        });
        controller.helpers = [];

        handles.forEach(function(han) {
            var handle = jwk.trim(han);
            var helper = div.clone();
            controller.vars.size.w = controller.target.outerWidth();
            controller.vars.size.h = controller.target.outerHeight();
            helper
                .addClass(ctrl_res.help_common)
                .addClass(ctrl_res.help_prefix + handle)
                .attr("handle",handle)
                .appendTo(controller.handlers)
                // .appendTo(controller.target.parent())
            if (handle == "s" || handle == "n") {
                if (controller.relative) {
                    helper.css({
                        width: "auto",
                        left: (controller.options.margin.w/2)+"px",
                        right: (controller.options.margin.w/2)+"px",
                    });
                } else {
                    helper.width(controller.vars.size.w-controller.options.margin.w);
                }
            }
            if (handle == "e" || handle == "w") {
                if (controller.relative) {
                    helper.css({
                        height: "auto",
                        top: (controller.options.margin.h/2)+"px",
                        bottom: (controller.options.margin.h/2)+"px",
                    });
                } else {
                    helper.height(controller.vars.size.h-controller.options.margin.h);
                }
            }

            var params = $.extend({of: controller.target}, positions[handle]);
            helper.position = helper.setPosition(params).controller();
            // console.error("helper: ", helper, helper.width(), helper.css("left"), controller.options.margin.w);
            controller.helpers.push(helper);                
        });
    }
    
    register_values = function (controller) {

        // controller.target[0].style
        controller.vars = jwk.ui.snapshot(controller.target);
        controller.vars.size = {};            
        controller.vars.resizing = {
            init: {
                style: {
                    width:   controller.target[0].style.width,
                    height:  controller.target[0].style.height,
                    top:     controller.target[0].style.top,
                    left:    controller.target[0].style.left,
                    bottom:  controller.target[0].style.bottom,
                    right:   controller.target[0].style.right
                },
                size: {
                    w: controller.target.width(),
                    h: controller.target.height(),
                    pw: controller.target.parent().width(),
                    ph: controller.target.parent().height()
                },
                offset: controller.target.offset()
            }
        }
        /*
        hay que sacar la parte de controller.vars.resizing.init.style y delegar esa parte a  jwk.ui.snapshot
        por ahora yo dejaría la parte de controller.vars.resizing.init.size y controller.vars.resizing.init.offset
        */

        if (controller.options.iFrameFix) {
            controller.target.closest("body").append(
                $("<div iFrameFix='true' style='z-index:9999'>").css({
                    background: "rgba(0 , 0 , 0 , 0.0001)",
                    top: 0, bottom: 0, left: 0, right: 0, position:"fixed"
                })
            );
        }
        controller.trigger("start", {target:controller.target});
    }
    
    formate_percent = function(controller, b) {
        var digits = 2;
        if (controller.options.round) {
            var str = ""+b;
            if (str.indexOf(".") > -1) {
                str = str.substring(0, str.indexOf(".")+1+digits);
            }                            
            return str;
        } else {
            return ""+b;
        }
    }
    
    formate_pixel = function(controller, b) {
        if (controller.options.round) {
            return ""+Math.round(b);
        } else {
            return ""+b;
        }
    }
    
    formate_offset = function(controller, prop, b, object) {
        var obj = {}; obj[prop] = b;
        object.offset(obj);
        if (controller.options.round) {
            var value = parseFloat(object[0].style[prop]);
            object.css(prop, formate_pixel(controller, value));
        } else {
            return ""+b;
        }
    } 

    resize_n = function (controller, evt) {
        var init = controller.vars.resizing.init;            
        if (typeof init.style["height"] == "string" && init.style["height"].indexOf("%") > -1 ) {
            var height = parseFloat(init.style["height"]);
            var dif_pc = height * (init.size.h - evt.motion.y) / init.size.h;
            var ahora = init.size.h * dif_pc / height;
            if (parseInt(controller.target.css("min-height")) > ahora) return;            
            controller.target.height(""+formate_percent(controller, dif_pc)+"%");
        } else {
            controller.target.height(formate_pixel(controller, init.size.h - evt.motion.y));
        } 

        if (controller.vars.vertical == "margin") {
            var css = controller.vars.css;
            var percent_motion  = evt.motion.y * css["top_k"] * 0.5;
            var percent_current = 50;
            var css_modif = {};
            if (css["top_percent"] < 0 && css["bottom_percent"] == 0) {
                percent_current = 50 + 0.5 * css["top_percent"];
            } else if (css["top_percent"] == 0 && css["bottom_percent"] < 0) {
                percent_current = 50 - 0.5 * css["bottom_percent"];
            }
            if (percent_current + percent_motion <= 50) {
                css_modif.top    = ((percent_current + percent_motion) * 2 -100) + "%";
                css_modif.bottom = "0%";
            } else {
                css_modif.top    = "0%";
                css_modif.bottom = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
            }                
            controller.target.css(css_modif);                
        } else {
            if (typeof init.style["top"] == "string" && init.style["top"].indexOf("%") > -1 ) {
                var top = parseFloat(init.style["top"]);
                var dif_pc = top + 100 * evt.motion.y / init.size.ph;
                controller.target.css("top", ""+formate_percent(controller, dif_pc)+"%");
            } else {
                formate_offset(controller, "top", evt.motion.y + init.offset.top, controller.target);
            }                
        }
    }

    resize_s = function (controller, evt) {

        var init = controller.vars.resizing.init;            
        if (typeof init.style["height"] == "string" && init.style["height"].indexOf("%") > -1 ) {
            var height = parseFloat(init.style["height"]);
            var dif_pc = height * (evt.motion.y + init.size.h) / init.size.h;
            var ahora = init.size.h * dif_pc / height;
            if (parseInt(controller.target.css("min-height")) > ahora) return;
            controller.target.height(""+formate_percent(controller, dif_pc)+"%");
        } else {
            controller.target.height(formate_pixel(controller, evt.motion.y + init.size.h));
        }

        if (controller.vars.vertical == "margin") {
            var css = controller.vars.css;
            var percent_motion  = evt.motion.y * css["top_k"] * 0.5;
            var percent_current = 50;
            var css_modif = {};
            if (css["top_percent"] < 0 && css["bottom_percent"] == 0) {
                percent_current = 50 + 0.5 * css["top_percent"];
            } else if (css["top_percent"] == 0 && css["bottom_percent"] < 0) {
                percent_current = 50 - 0.5 * css["bottom_percent"];
            }
            if (percent_current + percent_motion <= 50) {
                css_modif.top    = ((percent_current + percent_motion) * 2 -100) + "%";
                css_modif.bottom = "0%";
            } else {
                css_modif.top    = "0%";
                css_modif.bottom = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
            }                
            controller.target.css(css_modif);
        }

    }

    resize_e = function (controller, evt) {
        var init = controller.vars.resizing.init;
        if (typeof init.style["width"] == "string" && init.style["width"].indexOf("%") > -1 ) {
            var width = parseFloat(init.style["width"]);
            var dif_pc = width * (init.size.w + evt.motion.x) / init.size.w;
            var ahora = init.size.w * dif_pc / width;
            if (parseInt(controller.target.css("min-width")) > ahora) return;
            controller.target.width(""+formate_percent(controller, dif_pc)+"%");            
        } else {
            controller.target.width(formate_pixel(controller, init.size.w + evt.motion.x));
        }

        if (controller.vars.horizontal == "margin") {
            var css = controller.vars.css;
            var percent_motion  = evt.motion.x * css["left_k"] * 0.5;
            var percent_current = 50;
            var css_modif = {};
            if (css["left_percent"] < 0 && css["right_percent"] == 0) {
                percent_current = 50 + 0.5 * css["left_percent"];
            } else if (css["left_percent"] == 0 && css["right_percent"] < 0) {
                percent_current = 50 - 0.5 * css["right_percent"];
            }
            if (percent_current + percent_motion <= 50) {
                css_modif.left   = ((percent_current + percent_motion) * 2 -100) + "%";
                css_modif.right  = "0%";
            } else {
                css_modif.left   = "0%";
                css_modif.right  = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
            }                
            controller.target.css(css_modif);
        }            
    }

    resize_w = function (controller, evt) {
        var init = controller.vars.resizing.init;
        if (typeof init.style["width"] == "string" && init.style["width"].indexOf("%") > -1 ) {
            var width = parseFloat(init.style["width"]);
            var dif_pc = width * (init.size.w - evt.motion.x) / init.size.w;
            var ahora = init.size.w * dif_pc / width;
            if (parseInt(controller.target.css("min-width")) > ahora) return;
            controller.target.width(""+formate_percent(controller, dif_pc)+"%");
        } else {
            controller.target.width(formate_pixel(controller, init.size.w - evt.motion.x));
        }            

        if (controller.vars.horizontal == "margin") {
            var css = controller.vars.css;
            var percent_motion  = evt.motion.x * css["left_k"] * 0.5;
            var percent_current = 50;
            var css_modif = {};
            if (css["left_percent"] < 0 && css["right_percent"] == 0) {
                percent_current = 50 + 0.5 * css["left_percent"];
            } else if (css["left_percent"] == 0 && css["right_percent"] < 0) {
                percent_current = 50 - 0.5 * css["right_percent"];
            }
            if (percent_current + percent_motion <= 50) {
                css_modif.left   = ((percent_current + percent_motion) * 2 -100) + "%";
                css_modif.right  = "0%";
            } else {
                css_modif.left   = "0%";
                css_modif.right  = ((100 - (percent_current + percent_motion)) * 2 -100) + "%";
            }                
            controller.target.css(css_modif);                
        } else {            
            if (typeof init.style["left"] == "string" && init.style["left"].indexOf("%") > -1 ) {
                var left = parseFloat(init.style["left"]);
                var dif_pc = left + 100 * evt.motion.x / init.size.pw;
                controller.target.css("left", ""+formate_percent(controller, dif_pc)+"%");
            } else {
                formate_offset(controller, "left", evt.motion.x + init.offset.left, controller.target);
            }            
        }

    }    
    
    
    
    render.ResizableController = function(target, args) {
        
        var def_args = {
            round: true,
            enabled: true, // false
            iFrameFix: true,
            alsoResize: null,
            animate: null,
            appendTo: "target", // "target" | "parent"
            animateDuration: null,
            animateEasing: null,
            aspectRatio: null,
            autoHide: null,
            cancel: null,
            containment: null,
            delay: null,
            disabled: null,
            distance: null,
            ghost: null,
            grid: null,
            handles: "e, s, se", // n, e, s, w, ne, se, sw, nw, all
            helper: null,
            maxHeight: null,
            maxWidth: null,
            minHeight: null,
            minWidth: null,
            margin: {
                w: 40,
                h: 40
            }
        };
                
        jwk.Node.apply(this);
        // -- initialization ---
        this.init(target, $.extend({}, def_args, args));
    }
    
    
    render.ResizableController.prototype = new jwk.Node();
    render.ResizableController.prototype.constructor = render.ResizableController;
    render.ResizableController.prototype.type = "resizable";

    render.ResizableController.prototype.enable = function (enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.handlers.children(".resizable-helper").css("display","block");
        } else {
            this.handlers.children(".resizable-helper").css("display","none");
        }
        return this;
    }

    render.ResizableController.prototype.update = function (_opt) {
        // TODO: code to update options width new args        
        var options = jwk.extend(true, {}, this.options, _opt);
        this.options = options;        
        this.vars = {size:{}};

        var handles = options.handles.split(",")
        if (handles.length != this.helpers.length) {
            create_helpers(this, handles);
        }
        var controller = this;
        $(this.helpers).each(function(){
            var handle = this.attr("handle");
            var helper = this;

            function make_opt(handle, axis) {
                return  {
                    axis: axis,
                    cursorDragging: handle+"-resize",
                    cursorOver: handle+"-resize",
                    position:"absolute",
                    zIndex: false,
                    helper: "none"
                }
            }

            switch (handle) {
                case "n":
                    helper.draggable = this.setDraggable(make_opt(handle, "y")).controller();
                    helper.draggable.on("drag",function(e_name, evt) {
                        resize_n(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "ne": 
                    helper.draggable = this.setDraggable(make_opt(handle)).controller();
                    helper.draggable.on("drag",function(e_name, evt) {
                        controller.target.width(evt.motion.x + controller.vars.resizing.init.size.w);
                        resize_n(controller, evt);
                        resize_e(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "nw": 
                    helper.draggable = this.setDraggable(make_opt(handle)).controller();
                    helper.draggable.on("drag",function(e_name, evt) {
                        resize_n(controller, evt);
                        resize_w(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "s": 
                    helper.draggable = this.setDraggable(make_opt(handle, "y")).controller();
                    helper.draggable.on("drag",function(e_name, evt){
                        resize_s(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "se":
                    helper.draggable = this.setDraggable(make_opt(handle)).controller();
                    helper.draggable.on("drag",function(e_name, evt){
                        resize_s(controller, evt);
                        resize_e(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "sw":
                    helper.draggable = this.setDraggable(make_opt(handle)).controller();
                    helper.draggable.on("drag",function(e_name, evt){
                        resize_s(controller, evt);
                        resize_w(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "e": 
                    helper.draggable = this.setDraggable(make_opt(handle, "x")).controller();
                    helper.draggable.on("drag",function(e_name, evt){
                        resize_e(controller, evt);
                        update_vars(controller);
                    });
                    break;
                case "w":
                    helper.draggable = this.setDraggable(make_opt(handle, "x")).controller();
                    helper.draggable.on("drag",function(e_name, evt) {
                        resize_w(controller, evt);
                        update_vars(controller);
                    });
                    break;
            }
            if (helper.draggable && helper.draggable.on) {
                helper.draggable.on("start",function () {
                    register_values(controller);
                });
                helper.draggable.on("stop",function () { 
                    controller.vars.resizing = undefined;
                    update_vars(controller, true);
                    if (controller.options.iFrameFix) {
                        controller.target.closest("body").find("[iFrameFix]").remove();
                    }
                    controller.trigger("stop", {target:controller.target});
                });
            }
            /*
            n:  {my:"center center", at: "center top"},
            e:  {my:"center center", at: "right center"},
            s:  {my:"center center", at: "center bottom"},
            w:  {my:"center center", at: "left center"},
            ne: {my:"center center", at: "right top"},
            se: {my:"center center", at: "right bottom"},
            sw: {my:"center center", at: "left bottom"},
            nw: {my:"center center", at: "left top"}
            */
        });

        return this;
    }

    render.ResizableController.prototype.controller = function () { return this; }
    render.ResizableController.prototype.resize = function (size) {
        this.target.css(size);
        update_vars(controller);
    }

    render.ResizableController.prototype.init = function (target, options) {
        var ctrlid = "Resizable_"+jwk.nextId();
        this.set("id", ctrlid);
        this.target = target;
        this.handlers = target;
        this.relative = true;
        var controller = this;
        target.attr(controller.type, controller.get("id"));
        if (target.prop("nodeName").toLowerCase() === "iframe") {
            options.iFrameFix = true;
        }
        if (options.appendTo == "parent" || target.prop("nodeName").toLowerCase() === "iframe") {
            this.handlers = target.parent();
            this.relative = false;
        }
        this.helpers = [];
        if (options.handles.toLowerCase() == "all") {
            options.handles = "n, e, s, w, ne, se, sw, nw";
        }							
        this.update(options);
        this.enable(options.enabled);
    }

    render.setResizable = function (target, args) {
        controller = new render.ResizableController(target, args);
        target.data(ctrl_res.id, controller);
        return controller;
    }
    
    $.fn.setResizable = function( args ) {
        var target = $(this);            
        var controller = $(this).data(ctrl_res.id);
        if (!controller) {
            target.each(function() {
                controller = render.setResizable($(this), args);
                $(this).data(ctrl_res.id, controller);
            });
            return $.extend(this, { controller: function() {
                if ($(this).size() == 1) return $(this).data(ctrl_res.id);
                var consoladores = [];
                $(this).each(function(){
                    consoladores.push($(this).data(ctrl_res.id));
                });
                return $(consoladores);
            }});
        }         
        return controller.update(args);
    };

    return render.setResizable;


});