define([
    "jwebkit",
    "../../jwk.ui.core",
    "./jwk.ui.html.core",
    "./jwk.ui.html.set-draggable",
    "./jwk.ui.html.set-droppable",
    "jquery"
], function(jwk, ui, render, draggable, droppable, $) {
    
    var ctrl_sort = {
        id: "jwk.set-sortable",
        name: "jwk-sortable",
        prefix: "sortable-"
    };

    function swap(controller, swap, evt) {
        controller.vars[swap=="after"?"next":"prev"].obj[swap](controller.placeholder);
        update_vars(controller);
        controller.trigger("swap", {
            event: evt,
            target: controller.dragging,
            index: controller.vars.index,
            index_ini:controller.init_index,
            index_last: controller.vars.index + (swap=="before"? 1:-1)
        });
    }

    function update_vars(controller) {
        var _prev = controller.prev();
        var _next = controller.next();
        controller.vars = {
            prev: {
                obj: _prev,
                offset: _prev.offset(),
                size: { w: _prev.outerWidth(), h: _prev.outerHeight()}
            },
            next: {
                obj: _next,
                offset: _next.offset(),
                size: { w: _next.outerWidth(), h: _next.outerHeight()}
            },
            helper: {
                offset: controller.helper.offset(),
                size: {
                    w: controller.helper.outerWidth(),
                    h: controller.helper.outerHeight()
                }
            },
            index: controller.placeholder.prevAll(":visible").size()
        }
        // console.log("controller.vars", controller.vars);
    }

    next_or_prev_sibbling = function (controller, sibling, which) {
        console.assert(which=="prev" || which=="next");
        console.assert(controller.helper);
        console.assert(controller.placeholder);
        console.assert(controller.dragging);
        var elem = sibling[which]();
        if (elem && elem[0] == controller.helper[0]) {
            elem = next_or_prev_sibbling(controller, elem, which);
        }
        if (elem && elem[0] == controller.placeholder[0]) {
            elem = next_or_prev_sibbling(controller, elem, which);
        }
        if (elem && elem[0] == controller.dragging[0]) {
            elem = next_or_prev_sibbling(controller, elem, which);
        }
        if (elem) return elem;
    }

    render.SortableController = function (target, args) {
        var def_args = {
            cursor: "default",
            axis: "y"
        };

        jwk.Node.apply(this);
        this.init(target, $.extend({}, def_args, args));
    }

    render.SortableController.prototype = new jwk.Node();
    render.SortableController.prototype.constructor = render.SortableController;
    render.SortableController.prototype.type = "sortable";

    render.SortableController.prototype.controller = function () { return controller; }
    render.SortableController.prototype.update = function (options) {
        // TODO: code to update options width new options
        return this;
    }

    render.SortableController.prototype.init = function (target, options) {
        var ctrlid = "Sortable_"+jwk.nextId();
        controller.set("id", ctrlid);

        var group = "sortabble-group-" + ctrlid;
        controller.options = options;
        controller.target = target;
        target.attr(controller.type, controller.get("id"));
        controller.target.setDraggable({axis: controller.options.axis, helper: "clone", applyTo:"children", group: group, position:"absolute"}).controller()

        .on("start", function (e_name, evt) {
            controller.dragging = evt.target;
            controller.helper   = evt.helper;
            controller.helper.addClass("helper");
            controller.helper.width(evt.target.width());
            controller.helper.height(evt.target.height());

            controller.placeholder = controller.dragging.css("visibility", "hidden").addClass("sortting-placeholder");
            update_vars(controller);
            controller.init_index = controller.vars.index;
            console.log(controller.vars);
        })

        .on("drag", function (e_name, evt) {
            var vars = controller.vars;
            if (controller.options.axis == "y") {
                if (vars.prev.obj.size() > 0) {
                    if (evt.helper.offset().top < vars.prev.offset.top + (vars.prev.size.h / 2)) {
                        swap(controller, "before", evt);
                    }
                }
                if (vars.next.obj.size() > 0) {
                    var t_bottom = evt.helper.offset().top + vars.helper.size.h;
                    if (t_bottom > vars.next.offset.top + (vars.next.size.h / 2)) {
                        swap(controller, "after", evt);
                    }
                }
            } else {
                if (vars.prev.obj.size() > 0) {
                    if (evt.helper.offset().left < vars.prev.offset.left + (vars.prev.size.w / 2)) {
                        swap(controller, "before", evt);
                    }
                }
                if (vars.next.obj.size() > 0) {
                    var t_right = evt.helper.offset().left + vars.helper.size.w;
                    if (t_right > vars.next.offset.left + (vars.next.size.w / 2)) {
                        swap(controller, "after", evt);
                    }
                }
            }                    
        })

        .on("stop", function (e_name, evt) {
            controller.placeholder.css("visibility", "").removeClass("sortting-placeholder");
            controller.target.children().css("z-index", "");
            var event = { event: evt, target: evt.target, index: controller.vars.index, index_ini:controller.init_index};
            // controller.trigger("sort:end", event);
            controller.trigger("sort", event);
        });

    }

    render.SortableController.prototype.prev = function (sibling) {
        return next_or_prev_sibbling(controller, sibling || controller.placeholder, "prev");
    }

    render.SortableController.prototype.next = function (sibling) {
        return next_or_prev_sibbling(controller, sibling || controller.placeholder, "next");
    }        

    render.setSortable = function (target, args) {
        controller = new render.SortableController(target, args);
        target.data(ctrl_sort.id, controller);
        return controller;
    }

    $.fn.setSortable = function( args ) {
        args = args || {};
        var target = $(this);
        var controller = target.data(ctrl_sort.id);
        if (!controller) {
            controller = render.setSortable(target, args);
            target.data(ctrl_sort.id, controller);
            target.controller = function( ) { return $(this).data(ctrl_sort.id); }
            return target;
        }         
        return controller.update(args);
    };

    return render.setSortable;
});
