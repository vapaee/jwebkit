define([
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "jquery",
    "./jwk.ui.html.set-draggable"
], function(jwk, ui, render, $) {
    // console.log("jwk-ui/jwk.ui.set-droppable ------------------------------------------------------------------------------------------------------");
    
    var ctrl_drop = {
        id: "jwk.set-droppable",
        name: "jwk-droppable",
        prefix: "droppable-"
    };
    var manager;
    
    render.DropManager = function () {
        var manager = this;
        jwk.Node.apply(manager);
        manager.init();            
    }
    
    render.DropManager.prototype = new jwk.Node();
    render.DropManager.prototype.constructor = render.DropManager;
    
    render.DropManager.prototype.init = function () {
        manager = this;
        manager.map({
            droppables: {},
            accepting: []
        })
        // manager.set("droppables",{});
        // manager.set("accepting",[]);
        render.drag_manager.on("start", function (e_name, event) {
            // console.log("start", arguments);
            // If is not acceptable we return
            var droppables = manager.get("droppables");
            var accepting = [];                    
            var names = droppables.keys();
            for (var i in names) {
                var droppable   = droppables.get(names[i]);
                var target      = droppable.target();
                var controller  = droppable.controller();
                var options     = controller.options;
                var acceptable  = false;
                if (event.target.filter(options.accept).size() > 0) acceptable = true;
                controller.was_over = false;
                delete controller.dropobj;
                if (acceptable) {
                    controller.dropobj = event.helper;
                    accepting.push(droppable.id());
                }
            }

            function sortAlpha(a, b) {  
                var targetA = droppables.get(a).target();
                var targetB = droppables.get(b).target();
                if (targetA.parents().filter(targetB).length > 0) {
                    // b es ancestro de a
                    return -1;
                }
                if (targetB.parents().filter(targetA).length > 0) {
                    // b es ancestro de a
                    return 1;
                }
                var parentsA = jQuery.makeArray( targetA.parents() );
                var parentsB = jQuery.makeArray( targetB.parents() );

                var common_parent = parentsA.intersect(parentsB);
                console.log("parentsA.intersect(parentsB):", parentsA.intersect(parentsB));
                return 0;

            };  

            accepting = $(accepting).sort(sortAlpha);
            manager.set("accepting", accepting);
        });

        render.drag_manager.on("drag", function (e_name, event) {

            var accepting = manager.get("accepting");
            var droppables = manager.get("droppables");
            var candidate = undefined;
            for (var i=0; i<accepting.length; i++) {
                var droppable   = droppables.get(accepting[i]);
                var target      = droppable.target();
                var controller  = droppable.controller();
                var options     = controller.options;

                if(!controller.dropobj) continue;
                console.assert(controller.dropobj[0] == event.helper[0]);
                var is_over = false;

                if (!candidate) {

                    var obj  = { offset: event.helper.offset(), size: {w:event.helper.outerWidth(), h:event.helper.outerHeight()}}
                    var self = { offset: controller.target.offset(), size: {w:controller.target.outerWidth(), h:controller.target.outerHeight()}}
                    switch (controller.options.tolerance) {
                        case "fit":
                            if ( obj.offset.top >= self.offset.top &&
                                obj.offset.left >= self.offset.left &&
                                obj.offset.top + obj.size.h <= self.offset.top + self.size.h &&
                                obj.offset.left + obj.size.w <= self.offset.left + self.size.w
                            ) {
                                is_over = true;
                            }
                            break;
                        case "intersect":
                            var top = Math.max(obj.offset.top, self.offset.top);
                            var left = Math.max(obj.offset.left, self.offset.left);
                            var bottom = Math.min(obj.offset.top + obj.size.h, self.offset.top + self.size.h);
                            var right = Math.min(obj.offset.left + obj.size.w, self.offset.left + self.size.w);

                            if ( (bottom - top) >= (obj.size.h/2) &&
                                    (right - left) >= (obj.size.w/2)
                                ) {
                                    is_over = true;
                            }
                            break;
                        case "pointer":
                            if ( self.offset.left <= event.pageX &&
                                self.offset.top  <= event.pageY &&
                                obj.offset.left + obj.size.w >= event.pageX &&
                                obj.offset.top  + obj.size.h >= event.pageY
                                ) {
                                is_over = true;
                            }
                            break;
                        case "touch":
                            if ( obj.offset.left <= self.offset.left + self.size.w &&
                                obj.offset.left + obj.size.w >= self.offset.left &&
                                obj.offset.top <= self.offset.top + self.size.h &&
                                obj.offset.top  + obj.size.h >= self.offset.top
                                ) {
                                is_over = true;
                            }
                            break;
                    }

                }

                if (is_over) {
                    candidate = controller;
                    controller.target.addClass(controller.options.dropAcceptClass);
                } else {
                    controller.target.removeClass(controller.options.dropAcceptClass);
                }

                if (controller.was_over != is_over) {
                    controller.was_over = is_over;
                    controller.trigger(is_over ? "over" : "out", { event: event, target:controller.target });
                }


            }                    

        });

        render.drag_manager.on("stop", function (e_name, event) {
            var accepting  = manager.get("accepting");
            var droppables = manager.get("droppables");
            for (var i=0; i<accepting.length; i++) {
                var droppable   = droppables.get(accepting[i]);
                var target      = droppable.target();
                var controller  = droppable.controller();
                var options     = controller.options;

                if (controller.was_over) {
                    controller.trigger("drop", { event: event, target: target, droppable: controller, draggable: event["draggable"] || event.target });
                    controller.target.removeClass(controller.options.dropAcceptClass);
                }
                controller.dropobj = false;
            }
            manager.set("accepting",[]);
        });

    }
        
    render.DropManager.prototype.addDroppable = function (target, controller) {
        var droppables = manager.get("droppables");
        var droppable = new jwk.Node();
        droppable.set("id", controller.id());
        droppable.set("target", $(target));
        droppable.set("controller", controller);
        droppables.set(controller.id(), droppable);
    }
        
        
    // console.log("jwk.DropManager()");
    render.drop_manager = render.drop_manager || new render.DropManager();
    
    
    render.DroppableController = function (target, args) {
        var def_args = {
            dropAcceptClass: "jwk-dropaccept",
            cursor: "default",
            tolerance: "intersect", // fit, intersect, pointer, touch
            accept: ".jwk-draggable-target"
        };
        
        var controller = this;
        jwk.Node.apply(controller);
        // -- initialization ---
        controller.init(target, $.extend({}, def_args, args));
    }
    
    render.DroppableController.prototype = new jwk.Node();
    render.DroppableController.prototype.constructor = render.DroppableController;
    render.DroppableController.prototype.type = "droppable";

    render.DroppableController.prototype.controller = function () { return controller; }
    render.DroppableController.prototype.update = function (options) {
        // TODO: code to update options width new options
        return this;
    }

    render.DroppableController.prototype.init = function (target, options) {
        var ctrlid = "Droppable_" + jwk.nextId();
        this.set("id", ctrlid);
        this.target = $(target);
        this.options = options;
        console.assert(jwk.ui.render.drag_manager, "jwk.ui.render.drag_manager MUST exist in order to set Droppables");

        target.attr(controller.type, controller.get("id"));
        target.addClass(ctrl_drop.name);
        target.addClass(options.group);
        // target.disableSelection();

        jwk.render.drop_manager.addDroppable(target, this);
        // suscribirse a eventos del manager
    }

    render.setDroppable = function (target, args) {
        controller = new render.DroppableController(target, args);
        target.data(ctrl_drop.id, controller);
        return controller;
    }
    
    $.fn.setDroppable = function( args ) {
        var target = $(this);            
        var controller = $(this).data(ctrl_drop.id);
        if (!controller) {
            target.each(function() {
                controller = render.setDroppable($(this), args);
                $(this).data(ctrl_drop.id, controller);
            });
            return $.extend(this, { controller: function() {
                if ($(this).size() == 1) return $(this).data(ctrl_drop.id);
                var consoladores = [];
                $(this).each(function(){
                    consoladores.push($(this).data(ctrl_drop.id));
                });
                return $(consoladores);
            }});
        }         
        return controller.update(args);
    };
    
    return render.setDroppable;
});