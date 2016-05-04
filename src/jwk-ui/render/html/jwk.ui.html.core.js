define([
    "jwebkit",
    "../../jwk.ui.core",
    "mustache",
    "jquery"
], function(jwk, ui, Mustache, $) {    
    
    var debug = false;
    var debug_path = "jwebdesk-packmanager_0.structure.main_layout.list_panel.pack_list.Owner";

    $.fn.disableSelection = $.fn.disableSelection || function() {
        return this
         .attr('unselectable', 'on')
         .css('user-select', 'none')
         .on('selectstart', false);
    };
    
    $.fn.enableSelection = $.fn.enableSelection || function() {
        return this
         .attr('unselectable', 'off')
         .css('user-select', '')
         .on('selectstart', true);
    };
    
    ui.HtmlRender = function () {
        
    }
    
    ui.HtmlRender.prototype = new jwk.Node();
    ui.HtmlRender.prototype.constructor = ui.HtmlRender;
    
    // Render API ---
    ui.HtmlRender.prototype.components = {};
    
    
    ui.HtmlRender.prototype.init_component = function (component) {
        // console.log("regist", component.path);
        if (debug && component.path.indexOf(debug_path) != -1) {
            this.inits = this.inits || 0;
            this.inits++;
            console.log("init_component",  [component, component.target], [this], this.distroys, this.inits, this.renderss);
        }
        
        if (typeof this.components[component.path] != "undefined") {
            if (this.components[component.path] == component) {
                console.error("Estas registrando más de una vez. POR QUE?");
            } else {
                console.warn("WARNING: a different component with the same path was previously registered", [component.path, component, this.components]);
            }
        }
        component.on("change:visible", function (n,e) {
            if (e.target.target) e.target.target[e.value ? "show" : "hide"](0);
        });
        component.on("destroy", function (n,e) {
            if (e.component.target) e.component.target.remove();
            delete this.components[e.component.path];
            if (debug && component.path.indexOf(debug_path) != -1) {
                this.distroys = this.distroys || 0;
                this.distroys++;
                console.log("destroy",  [component, component.target], [this], this.distroys, this.inits, this.renderss);
            }
            /*for (var name in this.components) {
                if (name.indexOf(component.path) == 0) {
                    // console.log("delete", name);
                    delete this.components[name];
                }
            }*/
        }, this);
        this.components[component.path] = component;        
    }
    
    ui.HtmlRender.prototype.render = function (component, container) {        
        // console.log("render", component.path, [this.components[component.path] == component], [this.components[component.path]], [component]);        
        // console.log("render", component.ui_type, component.text, [component.visible]);
        
        console.assert(typeof component.path == "string", component);
        console.assert(this.components[component.path] == component, "ERROR: this component is not well registered", component.path, [component, this.components[component.path], this.components]);        
        if (debug && component.path.indexOf(debug_path) != -1) {
            this.renderss = this.renderss || 0;
            this.renderss++;
            console.log("render",  [component, component.target], [this], this.distroys, this.inits, this.renderss);
        }       
        
        if (component.renderize === false) {
            if (component.target) {
                // Ya había renderizado pero ahora tiene que no verse -> creo un placeholder
                component.placeholder = component.placeholder || $("<placeholder></placeholder>").css("display", "none");
                component.target.before(component.placeholder);
                component.target.remove();
                delete component.target;
            }
            if (!component.target && !component.placeholder) {
                // Renderizo por primera vez pero no devo estar visible -> creo un placeholder
                var container = this.resolve_component_container(component);
                component.placeholder = $("<placeholder></placeholder>");
                component.placeholder.css("display", "none");            
                component.placeholder.appendTo(container);
            }            
            return;
        }
        
        
        
        
        /*
        if (component.renderize === false) {
            if (component.target) {
                // $(component.target).remove();
                $(component.target).css("display", "none");
            }
            // delete  component.target;
            return;
        }        
        */
        
        
        
        if (typeof component.render_save_children == "function") {
            component.render_save_children();
        }
        component.trigger_fast("render_start", { component: component });
        
        if (typeof component.render_node == "function") {
            component.render_node();
            component.trigger_fast("render_node", { component: component });
        }

        if (typeof component.render_structure == "function") {
            component.render_structure();
            component.trigger_fast("render_structure", { component: component });
        }

        if (typeof component.render_children == "function") {
            component.render_children();
            component.trigger_fast("render_children", { component: component });
        }
        
        var save = component.get("temporary_saved_children");
        if (save) {
            save.remove();
            component.unset("temporary_saved_children");  
        }        
        
        var render_type = "";
        $target = $(component.target);
        if (component.first_rendering === true) {
            render_type = ":first";
            delete component.first_rendering;
            if (component.settings.disable_selection) {
                $target.disableSelection();
                $target.css("cursor", "default");
            }
        }
        /*
        if (component.renderize === false && $target.css("display") != "none") {
            $target.css("display", "none");
        } else if (component.renderize === true && $target.css("display") == "none") {
            $target.css("display", "initial");
        }
        */
            
        component.trigger("render"+render_type, { component: component });
    }

    var container = new jwk.Node();
    ui.HtmlRender.prototype.container = function () {
        return {target:$("body")};
    }
    
    ui.HtmlRender.prototype.render_html = function (component) {
        /*var data = component.settings.data;
        if (typeof component.settings.datapath == "string") {
            data = data.get(component.settings.datapath);
        }*/
        var obj = {
            ui: ui,
            data: component.my_data(),
            self: component
        }
        
        component.trigger_fast("render_html", obj);
        
        console.assert(component.settings.template && component.settings.template.main != undefined, component.settings);
        var html = Mustache.render (
            component.settings.template.main, obj, component.settings.template
        );
        // console.log("-------------->", component.settings.ui_type, component.settings.template.main, html, [component.settings.template]);        
        return html;
    }
    
    ui.HtmlRender.prototype.resolve_component_container = function (component) {
        var container;
        container = component.settings.container;
        if (typeof container == "undefined") {
            if (component.parent) {
                if (!component.parent.container) delete component.parent.container;
                container = component.settings.container = component.parent.container(component.name);
            }
        }
        if (typeof container == "undefined") {
            if (component.owner) {
                if (!component.owner.container) delete component.owner.container;
                container = component.settings.container = component.owner.container(component.name)
            }
        }
        if (typeof container == "undefined") {
            container = component.settings.container = this.container(); // Body
        }        
        return container;
    }

    ui.HtmlRender.prototype.render_node = function (component, container) {
        container = container || this.resolve_component_container(component);
        var target = component.target;
        var tree_node = component.tree();

        component.first_rendering = true;
        if (component.target && component.target.size() > 0 && container === component.settings.container) {
            // this.render_save_children(component);
            component.first_rendering = false;
            if (tree_node.class) {
                if (tree_node.class) component.target.addClass("class", tree_node.class);
            }
            var html = this.render_html(component);
            var html_node = $(html).eq(0);
            $.each(html_node[0].attributes, function(i, attrib){
                var name = attrib.name;
                var value = attrib.value;
                try {
                    component.target.attr(name, value);
                } catch (e){} // some browsers do not allow to change some propperties
            });
            
                /*
            var ch = component.get("children");
            console.assert(!ch || typeof ch.keys == "function", ch, typeof ch.list);
            if (ch && ch.keys().length > 0) {
                console.error("caso no implementado. Tenés componentes hijos y me estas pidiendo que simplemente borre el html interno al nodo", component, this, html);                    
            } else {
                if (html_node.html() != "") {
                    component.target.html(html_node.html());                            
                }
            }
            */
            // Esto fue la alternativa a lo anterior pero me parece que vuela todo a la mierda
            
            component.target.html(html_node.html());
            if (html_node.html() != "") {
                
                //var  new_content = $("<div style='display:none' temporal='true' component_target__new_content='true'>"+html_node.html()+"</div>");                
                //component.target.append(new_content);
            }

        } else {
            var html = this.render_html(component);
            var cont = (container.target instanceof $) ? container.target : container
            if (component.placeholder && component.placeholder.closest($("body")).size() > 0) {
                target = $(html);
                component.placeholder.before(target);
                component.placeholder.remove();
                delete component.placeholder;
            } else {
                target = $(html).appendTo( $(cont) );
            }

            // El style es solo para debugear. No se supone que sea siempre así.
            if (tree_node.style)  target.attr("style", (target.attr("style") ? (target.attr("style") + "; ") : "") + tree_node.style);
        }
        
        this.set_target(component, target);

        if (tree_node.class) target.addClass(tree_node.class);
        if (component.size)  target.css(component.size);
        if (component.text || component.html || component.content) {
            component.one("render", function (n, e) {
                var target = this.resolve_target(e.component.parent_for(null, 0));
                if (e.component.text)  target.append($("<span>").text(e.component.text));
                if (e.component.html)  target.append(e.component.html);                
                if (e.component.content) {
                    target.find("content").after(e.component.content);
                    target.find("content").remove();
                }
            }, this);
        }
        
        var forbidden = {class:true, text:true,  content:true, style:true, html:true};
        for (var prop in tree_node) {
            if (typeof tree_node[prop] != "string") continue;
            if (prop in forbidden) continue;
            target.attr(prop, tree_node[prop]);
        }
        
        /*
        // El style es solo para debugear. No se supone que sea siempre así.
        if (tree_node.style)  component.target.attr("style", tree_node.style);
        */        
        console.assert(true)
    }
    
    ui.HtmlRender.prototype.render_structure = function (component, container) {
        var structure = component.get("structure");
        if (!structure) return;        
        structure.paint();
    }    
    
    ui.HtmlRender.prototype.is_rendered = function (component) {
        return !!component.target;
    }    
    
    ui.HtmlRender.prototype.resolve_container = function (parent_for, no_warning) {
        // console.warn("WARNING: ui.HtmlRender.prototype.resolve_container Deprecated");
        return this.resolve_target(parent_for, no_warning);
    }
    
    ui.HtmlRender.prototype.resolve_target = function (parent_for, no_warning) {
        var parent = parent_for.parent,
            query = parent_for.query,
            target = parent.target;
        
        if (typeof query == "string") {            
            if (target.length == 0) {
                if (!no_warning) console.warn("WARNING: container hasent rendered yet", [parent_for.parent]);
                return null;
            }
            target = target.find(query);            
            if (target.length == 0) {
                if (!no_warning) console.warn("WARNING: query got null target", query);
                return null;
            }
            // console.assert(target.length > 0, "query got null target ", query, "for component ", parent_for.parent.path);
            /*if (target.length == 0) {
                console.warn("WARNING: query got null target", query);
                target = parent.target;
            }*/
        }
        
        return target.eq(0);
    }
    
    ui.HtmlRender.prototype.render_save_children = function (component) {        
        var ch = component.get("children");
        if (!ch || !component.target) return;
        var save = null;
        var names = ch.keys();        
        if (names.length > 0) {
            var str = "<div component='"+component.path+"' teporal='true' holding='component saved children'>";
            var container = component.settings.container;
            container = (container instanceof $) ? container : container.target; 
            for (var i in names) {
                var child = ch.get(names[i]);
                var target = child.target;
                if (target && target.size() > 0 /*&& target.closest("body").size() > 0*/) {
                    save = save || $(str).css("display", "none").appendTo(container);
                    save.append(target);
                }                    
            }
        }
        component.set("temporary_saved_children", save);
        return this;
    }
    
    ui.HtmlRender.prototype.render_children = function (component) {
        var children = component.get("children");
        if (!children) return this;

        var list = children.keys();
        var save = component.get("temporary_saved_children");        

        for (var i in list) {
            var child = children.get(list[i]);
            child.settings.container = this.resolve_target(component.parent_for(list[i], i)) || save;
            if (child.settings.container && child.settings.container.length > 0) {
                if (child.target) {
                    if (child.target.closest(save).length > 0) {
                        child.target.appendTo(child.settings.container);
                    } else {
                        child.paint();
                    }
                } else {
                    child.paint();
                }
            }
            //console.assert(child.settings.container, "resolve_target returns null", component.parent_for(list[i], i) );
            //console.assert(child.settings.container.length > 0, "resolve_target returns null", component.parent_for(list[i], i) );
        }
        
        return this;
    }
    
    ui.HtmlRender.prototype.add_class = function (component, klass) {
        console.assert(component.target && component.target.length > 0, component);
        console.assert(typeof klass == "string", klass);
        component.target.addClass(klass);
        return this;
    }
    
    ui.HtmlRender.prototype.remove_class = function (component, klass) {
        console.assert(component.target && component.target.length > 0, component);
        console.assert(typeof klass == "string", klass);
        component.target.removeClass(klass);
        return this;
    }
    
    ui.HtmlRender.prototype.set_target = function(component, target) {
        component.target = $(target).eq(0);
        component.target.attr("path", component.settings.path);
        component.target.attr("ui", component.settings.namespace+"."+component.settings.ui_type);
        component.target.attr("name", component.name);

        if (component.visible == false) {
            if (component.target) component.target.css("display", "none");
        }
        var ui_type = component.settings.ui_type;
        var ui_comp = ui_type.split(".").join(" ");
        /*if (ui_type.indexOf(".") > 0) {
            ui_comp = ui_type.substring(0,ui_type.indexOf("."));
            type = ui_type.substring(ui_type.indexOf(".")+1);
            ui_comp = ui_comp + " " + type;
        }*/
        component.target.addClass(component.settings.namespace+" "+ui_comp);
        // component.trigger("target",{component:component});
        return this;
    }    
    
    ui.HtmlRender.prototype.controlers = {};
    
    ui.HtmlRender.prototype.set_features = function (component) {
        // console.error(component.settings.path, component.settings, component.settings.draggable);
        var target = component.target;
        var settings = component.settings;
        component.on("feature", function (n,e) {
            e.controller.component = e.component;
            
            ui.HtmlRender.prototype.controlers[e.controller.type] = ui.HtmlRender.prototype.controlers[e.controller.type] || {};
            ui.HtmlRender.prototype.controlers["all"] = ui.HtmlRender.prototype.controlers["all"] || {};
            
            ui.HtmlRender.prototype.controlers[e.controller.type][e.controller.get("id")] = e.controller;
            ui.HtmlRender.prototype.controlers["all"][e.controller.get("id")] = e.controller;

        }, this);
        
        component.controllers = {};
        if (target) {
            if (settings.draggable && settings.draggable.disable != true) {
                this.set_draggable(component, settings.draggable);
            }
            if (settings.droppable && settings.droppable.disable != true) {
                this.set_droppable(component, settings.droppable);
            }
            if (settings.position && settings.position.disable != true) {
                this.set_position(component, settings.position);
            }
            if (settings.resizable && settings.resizable.disable != true) {
                this.set_resizable(component, settings.resizable);
            }
            if (settings.selectable && settings.selectable.disable != true) {
                this.set_selectable(component, settings.selectable);
            }
            if (settings.sortable && settings.sortable.disable != true) {
                this.set_sortable(component, settings.sortable);
            }
            if (settings.splittable && settings.splittable.disable != true) {
                this.set_splittable(component, settings.splittable);
            }
        }
        component.off("feature", null, this);
        component.trigger("features", {component:component});
    }
    
    function prepare_settings (component, settings1, settings2) {
        if (settings1 === true) settings1 = {};
        if (settings1) {
            settings1.component = component;
            return settings1;
        } 
        if (settings2) {
            settings2.component = component;
            return settings2;
        } 
    }
    
    ui.HtmlRender.prototype.set_draggable  = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.draggable);
        component.controllers.draggable  = component.target.setDraggable(settings).controller();
        component.controllers.draggable.component = component;
        component.trigger("feature:draggable", {component:component, controller: component.controllers.draggable, type: "draggable"});
    }
    ui.HtmlRender.prototype.set_droppable  = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.droppable);
        component.controllers.droppable  = component.target.setDroppable(settings).controller();
        component.controllers.droppable.component = component;
        component.trigger("feature:droppable", {component:component, controller: component.controllers.droppable, type: "droppable"});
    }
    ui.HtmlRender.prototype.set_position   = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.position);
        component.controllers.position   = component.target.setPosition(settings).controller();
        component.controllers.position.component = component;
        component.trigger("feature:position", {component:component, controller: component.controllers.position, type: "position"});
    }
    ui.HtmlRender.prototype.set_resizable  = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.resizable);
        component.controllers.resizable  = component.target.setResizable(settings).controller();
        component.controllers.resizable.component = component;
        component.trigger("feature:resizable", {component:component, controller: component.controllers.resizable, type: "resizable"});
    }
    ui.HtmlRender.prototype.set_selectable = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.selectable);
        component.controllers.selectable = component.target.setSelectable(settings).controller();
        component.controllers.selectable.component = component;
        component.trigger("feature:selectable", {component:component, controller: component.controllers.selectable, type: "selectable"});
    }
    ui.HtmlRender.prototype.set_sortable   = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.draggable);
        component.controllers.sortable   = component.target.setSortable(settings).controller();
        component.controllers.sortable.component = component;
        component.trigger("feature:sortable", {component:component, controller: component.controllers.sortable, type: "sortable"});
    }
    ui.HtmlRender.prototype.set_splittable = function (component, settings) {
        settings = prepare_settings(component, settings, component.settings.splittable);
        var def = {};
        if (typeof settings == "undefined") {
            switch (component.settings.splittable.toString().toLowerCase()) {
                case "true": break;
                case "horizontal":
                case "x":
                    def.axis = "x";
                    break;
                case "vertical":
                case "y":
                    def.axis = "y";
                    break;
            }
        }
        component.controllers.splittable = component.target.setSplittable(settings || def).controller();
        // redefino el parent_for() para futuras invocaciones (habrá?)
        // en este momento se supone que el componente ya tiene sus hijos
        component.parent_for = function (name, index) {
            return this.splittable.parent_for(name, index);
        }            

        component.trigger("splittable", {component:component, controller: component.splittable, type: "splittable"});
    }
    
    
    ui.htmlrender = new ui.HtmlRender();
    ui.render = ui.htmlrender;
    ui.set("render", ui.render);
    
    try {
        container.target = $("body");        
        container.target.bind( [
            "change",
            "submit",
            "keyup",
            "resize"
        ].join(" "), function( e ) {
            var comp = $(e.target).closest("[ui][path]");
            // console.log(comp);
            e.ui_type = comp.attr("ui");
            e.path = comp.attr("path");
            e.component = ui.render.components[e.path];
            e.input = $(e.target).closest("input")[0];
            container.trigger(e.type, e);
        });
        
    } catch (e) {
        console.log(obj, window, window.location);
    }
    
    
    return ui.render;
});

            