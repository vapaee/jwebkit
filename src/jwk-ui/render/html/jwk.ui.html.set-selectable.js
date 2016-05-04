define([
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "jquery"
], function(jwk, ui, render, $) {
    // console.log("jwk-ui/jwk.ui.set-selectable ------------------------------------------------------------------------------------------------------");
    
    var ctrl_sel = {
        id: "jwk.set-selectable",
        name: "jwk-selectable",
        prefix: "selectable-"
    };


    var select_this = function (controller, target, silent) {
        target.addClass(controller.options.selectedClass).removeClass(controller.options.unselectedClass);
        // If needed selected object is gonnaa be on top of the group mates
        // console.log("select_this: ", controller, target)
        var group = controller.group();
        if (controller.options.zIndex) {            
            jwk.ui.ontop(target, group);
        }        
        if (!silent) controller.trigger("select", {target: target, controller: controller, selection: group.filter("."+controller.options.selectedClass)});        
        return controller;
    };

    var unselect_all = function (controller) {
        var group = controller.group();
        
        group
            .addClass(controller.options.unselectedClass)
            .removeClass(controller.options.selectedClass);

        group.each(function () {
            var id = $(this).closest("[selectable]").attr("selectable");
            var selectable = ui.render.controlers.selectable[id];
            selectable.trigger("unselect", {target: $(this), controller: selectable});
        });
        
        return controller;
    };

    var is_focussed = function (controller, target) {
        return target.hasClass(controller.options.focussedClass);
    };

    var focus = function (controller, target) {
        target.addClass(controller.options.focussedClass);
        return controller;
    };

    var blur = function (controller, target) {
        target.removeClass(controller.options.focussedClass);
        return controller;
    };

    /*
    // Esto en realidad debería estar solo en jwk.ui.html.mouse y no replicado acá.
    // Lo que pasa es que el selectable fue concebido para usarse solo con DOM y no con componentes
    // Por eso en el init se hace target.on("mousedown") lo cual es un listener jquery y no de esta biblioteca.
    // por eso cuando se genera el event este no tiene la función which
    var track_attribute = function (attribute) {
        console.assert(typeof attribute == "string" && attribute.length > 0, attribute);
        var target = $(this.target);
        var wanted = target.closest("["+attribute+"]");
        return wanted.attr(attribute);
    }    
    */
    var mousedown = function (controller, event) {
        
        // event.which = track_attribute;

        var item_selector = "." + ctrl_sel.prefix + controller.options.applyTo;
        if (controller.options.applyTo == "children") {
            item_selector += " > *";
        }
        if (controller.options.applyTo == "group") {
            item_selector += " " + controller.options.group;
        }
        
        var item_elem = $(event.target).closest(item_selector);
        if (item_elem.size() == 0) return;

        // if current selection is equal to event target there's no changes
        var current = controller.group().filter("."+controller.options.selectedClass);
        if (current.size() == 1 && item_elem[0] == current[0]) return;

        var group = controller.group();
        // Determine the last clicked (the focussed element)
        var focussed = group.filter("."+controller.options.focussedClass);

        // If we don't have multiple selection just unselect everything
        if (!event.ctrlKey || !controller.options.allowMultiple) {
            unselect_all(controller);
        }
        if (event.shiftKey && controller.options.allowMultiple) {
            // We are gonna try to select all nodes between focussed and last clicked node
            if (focussed.size() == 0) {
                // We take the first sibling by default
                focus(controller, item_elem.siblings(":first"));
            } else if (item_elem.siblings("."+controller.options.focussedClass).size() > 0) {
                // The node is a brother of focussed node. Therefore, all intermediate nodes are selected

                // HACK: how to get the index in a more elegantely fashion?
                var parent = item_elem.parent();
                selecting = false;
                var filter = controller.options.group;
                var current_index = item_elem.index();
                /*
                if (controller.options.applyTo == "children") {
                    filter = undefined;
                    current_index = $(event.target).closest("[selectable] > *").index();
                    console.assert(item_elem.index() == current_index, item_elem.index(), current_index);
                } else {
                    current_index = $(event.target).closest("[selectable]").index();
                }
                */
                // console.warn("OJO que esto está modificado sin testear. Puede explotar mal!");
                parent.children(filter).each(function (index) {
                        var extremo = false;
                        if (is_focussed(controller, $(this))) {
                            selecting = !selecting;
                            extremo = true;
                        }
                        if (index == current_index) {
                            selecting = !selecting;
                            extremo = true;
                        }
                        if(selecting || extremo) {
                            select_this(controller, $(this), true);
                        }                                
                });                
                // dont change focussed
                var _selection = group.filter("."+controller.options.selectedClass);
                controller.trigger("select", {controller: controller, target: _selection, selection: _selection});
            } else {
                // Ad the node normaly because the fecussed node is not part of the siblings
                blur(controller, focussed);
                select_this(controller, item_elem); // this triggers "select" event
                focus(controller, item_elem);
            }
        } else {
            // Select normally
            blur(controller, focussed);
            select_this(controller, item_elem); // this triggers "select" event
            focus(controller, item_elem);
        }
    }


    render.SelectableController = function (target, args) {
        /*
        TODO: wishlist :D
        - stack: si seleccionás un objeto este pasa a estar arriba de todos.
        - maxSelected: 1 (no se pueden seleccionar más de esos elementos)
        - minSelected: 1 (no puede haber menos de esos elementos seleccionados. Si mueren ha de encontrarse reemplazo)
        */
        var def_args = {
            allowMultiple: false,
            selected: false,
            zIndex: true,
            selectedClass: "selected",
            unselectedClass: "unselected",
            focussedClass: "focussed",
            group: undefined, // any jquery valid selector. TODO: eliminar la dependencia con jquery
            applyTo: "target",
            cursor: "default",
            context: document,
        };

        if (args.applyTo == "group") {
            def_args.context = target;
        }
        
        var controller = this;
        jwk.Node.apply(controller);
        // -- initialization ---
        controller.init(target, $.extend({}, def_args, args));
    }


    render.SelectableController.prototype = new jwk.Node();
    render.SelectableController.prototype.constructor = render.SelectableController;
    render.SelectableController.prototype.type = "selectable";
    
    render.SelectableController.prototype.controller = function () { return this; }
    render.SelectableController.prototype.update = function (options) {
        // TODO: code to update options width new options
        console.error("SelectableController.prototype.update() not implemented");
        return this;
    }

    render.SelectableController.prototype.init = function (target, options) {
        var ctrlid = "Selectable_"+jwk.nextId();
        this.set("id", ctrlid);
        this.options = options;
        this.target = target;
        var controller = this;
        // console.log(target[0]);
        target.on("mousedown", null, this, function (event) {
            mousedown(controller, event);
        });
        target.attr(controller.type, controller.get("id"));
        target.addClass(ctrl_sel.prefix + options.applyTo);
        if (options.group) target.attr("selectable-group", options.group);
        // target.disableSelection();
        target.css("cursor", this.options.cursor);
        
        if (options.selected) {
            controller.select();            
        }
    }

    render.SelectableController.prototype.group = function () {
        if (this.options.applyTo == "children") {
            if (this.options.group) {
                return this.target.children(controller.options.group);
            } else {
                return this.target.children();
            }
        } else {
            if (this.options.group == "siblings") {
                return this.target.siblings();
            } else {
                console.assert(
                    this.options.context instanceof HTMLElement ||
                    this.options.context instanceof $ ||
                    this.options.context === document,
                        this.options.context);
                var group = null;
                if (this.options.applyTo == "group") {
                    group = $(this.options.group, this.options.context);
                } else {
                    group = $("[selectable-group='"+this.options.group+"']", this.options.context);                    
                }
                if (group.length > 0) {
                    return group;
                } else {
                    group = $(this.options.group, this.options.context);
                    if (group.length == 0) {
                        console.warn("WARNING: doesn't exist elements in the selectable group (" + this.options.group + ") for target: ", this.target);
                    }                    
                    return group;
                }                
            }            
        }
    }

    render.SelectableController.prototype.select = function (object) {
        unselect_all(this);
        if (!object && this.target) return select_this(this, this.target);
        if (object instanceof $) return select_this(this, object);
        if (object.target instanceof $) return select_this(this, object.target);        
    }

    render.SelectableController.prototype.all_instances = {};

    render.setSelectable = function (target, args) {
        controller = new render.SelectableController(target, args);
        target.data(ctrl_sel.id, controller);
        return controller;
    }
    
    $.fn.setSelectable = function( args ) {
        args = args || {};
        var target = $(this);
        var controller = target.data(ctrl_sel.id);
        if (!controller) {
            var def_args_for_all = {
                group: (args.applyTo != "children" ?
                        "select-group-"+Math.round(Math.random()*100) :
                        undefined)
            };
            controller = render.setSelectable(target, $.extend(def_args_for_all,args));
            target.data(ctrl_sel.id, controller);
            target.controller = function( ) { return $(this).data(ctrl_sel.id); }
            return target;
        }         
        return controller.update(args);
    };

    return render.setSelectable;
        
});    