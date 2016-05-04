/*
- Existen varios orígenes posibles para los Settings
  - usuario: cuando el usuario invoca directamente o se extrae de un arbol de componentes
  - default: lo que no se setea por nadie
  - default heredado: son los defaults que tiene el componente base que estoy extendiendo.
- El componente tiene un objeto Data asociado de donde saca los datos para renderizar.
  - usuario: cuando el usuario invoca directamente o se extrae de un arbol de componentes
  - tree: es la data q se le da a todo el arbol de componentes, no solo al componente en cuestion



TODO: 
- Pasar a el formato prototype
- El JSON que define el component tree
  - 

*/



define([
    "jwebkit",
    "./jwk.ui.core",
    "jquery"
], function(jwk, ui, $) {    
    jwk.ui.DEFAULT_NAMESPACE = "jwk-ui";        
    
    if (jwk.query.fn) jwk.query.fn.component = function( type, id ) {
        // console.log("jwk.query.fn.widget que pasa con esto?");
        var htmlid = "#"+id;
        var target = $(this).find(htmlid);            
        var widget = null;
        if (target.size() > 0) {
            widget = target.data(type);
            if (widget) {                    
                return widget;
            }
        }
    }
    
    jwk.ui.create_algo = function() {
        console.log("1 --> ", this, arguments);
        return function () {
            console.log("2 --> ", this, arguments);
            return "";
        }
    }
    
    
    var componentes = {};
    jwk.ui.component = function (namespace, ui_type) {
        if (typeof namespace == "string" && typeof ui_type == "string") {
            console.assert(componentes[namespace], "ERROR: Namespace: " + namespace + " not found", componentes);
            if (!componentes[namespace]) return Object;
            console.assert(componentes[namespace][ui_type], "ERROR: Namespace.Ui_Type: " + namespace+"."+ui_type + " not found", componentes);
            if (!componentes[namespace][ui_type]) return Object;
            return componentes[namespace][ui_type];
        } else {
            var spec = namespace;
            var namespace = spec.namespace || "unknown";
            var ui_type = spec.ui_type || "unknamed";
            var extend = spec.extends || null;
            var api = spec.api || null;
            var defaults = spec.defaults || null;
            
            if (extend) {
                if (typeof spec.constructor == "undefined") {
                    console.error(spec);
                }
                spec.constructor.prototype = new extend();
                spec.constructor.prototype.constructor = spec.constructor;
            }
            
            if (api) {
                for (var name in api) {
                    spec.constructor.prototype[name] = api[name];
                }
            }
            
            if (defaults) {
                defaults.namespace = namespace;
                defaults.ui_type = ui_type;
                spec.defs = defaults;
                spec.defaults = function() {
                    if (typeof spec.defs == "function") {
                        var obj = spec.defs();             
                        obj.namespace = spec.defs.namespace;
                        obj.ui_type   = spec.defs.ui_type;
                    } else {
                        var obj = jwk.extend(true, {}, spec.defs);
                    }
                    return obj
                }
            }            
            componentes[namespace] = componentes[namespace] || {};
            if (componentes[namespace][ui_type]) {
                console.warn("WARNING:  " + namespace+"."+ui_type + " already exist ",componentes[namespace][ui_type],"overwrighting with", spec);
            }
            componentes[namespace][ui_type] = jwk.extend(true, {}, componentes[namespace][ui_type], spec);
            jwk.ui.trigger("component:"+namespace+"."+ui_type, componentes[namespace][ui_type]);                    
        }
    }

    jwk.ui.Component = function (settings) {
        jwk.Object.call(this);
        this.set("renderize", true); // this forces the "renderize" property to be listenable
        if (settings) {
            settings.template = settings.template || {};
            settings.template.main = (typeof settings.template.main == "string") ? settings.template.main : "<div></div>";
            console.assert(settings.ui_type, "ERROR: missing ui_type attribute in settings");
            if (typeof settings.namespace == "undefined") {
                console.warn("WARNING: missing namespace attribute in settings. default value ("+ui.DEFAULT_NAMESPACE+") asigned for ", settings.ui_type);
                settings.namespace = ui.DEFAULT_NAMESPACE;
            }            
            if (typeof settings.datapath == "string" && typeof settings.data != "object") {
                if (settings.datapath.indexOf("self:") == 0) {
                    settings.data = this;
                } else {
                    console.error("ERROR: datapath attribute specified but no data present");
                }                
            }
            if (!settings.render) settings.render = ui.render;            
            this.init_settings(settings);
            this.on("change:renderize", this.paint, this);
        }
    }
    jwk.ui.Component.prototype = new jwk.Object();
    jwk.ui.Component.prototype.constructor = jwk.ui.Component;
    jwk.ui.Component.prototype.extend_in_depth = ["template"];
    jwk.ui.Component.prototype.init_tree = function() {
        var tree = this.tree();
        var data = this.data;
        var children = jwk.ui.create_component_tree(this, tree);
        /*var names = children.keys();
        for (var i in names) {
            var id = names[i];
            this.child(id, children.get(id));
        }*/
        return this;
    }
    
    jwk.ui.create_component_tree = function(parent, uitree) {
        var children = uitree.children;
        var owner = uitree.owner;
        var container = uitree.container;
        var data = uitree.data;
        var path = (typeof uitree.path == "string") ? (uitree.path+".") : "";
        var render = uitree.render || ui.render;
        var root = new jwk.Node();
        root.descartable = true;

        var i,
            is_array = Array.isArray(children);
        
        if (is_array) {
            console.error(children);
        }        
        
        for (var id in children) {
            var child = children[id];
            var ui_type = child.ui_type;            
            if (is_array) {
                assert(false, "ERROR: esto todavía se usa", [children, arguments, this]);
                /*
                i = id;
                if (child.name) {
                    id = child.name;
                } else {
                    id = ui_type.replace(".","_") + "_"+ i;
                }
                */
            }            
            var namespace = child.namespace || parent.namespace || ui.DEFAULT_NAMESPACE;            
            var settings = jwk.extend({
                path: path + id,
                name: id,
                parent: parent,                
                data: data,                
                render: render,
                owner: owner,
                namespace: namespace,
            }, child);
            
            if (container) settings.container = container;

            delete settings.path;
            var component = jwk.ui.create_component(settings);

            root.set(component.name, component);
        }
        return root;
    }
    
    jwk.ui.display_component = function(settings) {
        var c = this.create_component(settings);
        c.paint();
        return c;
    }

    var merge_with_data_stack = [];
    var ops = {
        not: function () {
            return !arguments[0];
        },
        bool: function () {
            return !!arguments[0];
        },
        idem: function () {
            return arguments[0];
        }
    }
    
    function merge_with_data (settings, component) {
        var result = jwk.extend({}, settings);
        
        // lo agrego en el stack si no está
        if (merge_with_data_stack.indexOf(settings) != -1) return settings;
        merge_with_data_stack.push(settings);

//        if (settings.layout == "<<data.layout>>") {        
//console.error("bbbbbbbbbbbbbbbbbbbbbbbbb");
            var data = settings.data || component.data;
            var self = component;
            var owner = component.owner || settings.owner;            
            var parent = component.parent;
            var regexp = /<<([^#]+)>>|<<#([^\s]+) (.+)>>/m;
            var prefix = "";
            
            for (var i in settings) {
                var value = settings[i];            
                if (typeof value == "function") continue;
                //var is_mapping = jwk.is_pure_map_object(value);
                var is_string = typeof value == "string";
                //if (!is_mapping && !is_string) continue;
                /*if (is_mapping) {
                    value = merge_with_data(value);
                    settings[i] = value;
                }*/
                if (is_string) {
                    var test = value.match(regexp);
                    if (test) {
                        // console.error(test);
                        var path = test[1];
                        var op = ops.idem;
                        if (!test[1] && test[2] && test[3]) {
                            path = test[3];
                            op = ops[test[2]] || ops.idem;
                        }                        
                        
                        function apply_change(event, op, comp, prop) {
                            var value = event.value;
                            event.value = op(event.value);
                            comp.update(event, prop);
                            event.value = value;
                        }

                        prefix = "data.";
                        if (path.indexOf(prefix) == 0) {
                            // value = this.resolve_value(path, prefix, data);
                            var _path = path.substring(5);
                            value = op(data.get(_path, {deep: _path.indexOf(".") != -1}));
                            if (component) {
                                (function (comp, prop, op){
                                    console.assert(_path.indexOf(".") == -1 || data instanceof jwk.Object,
                                                   "ERROR: in order to add a listener for the path '"+_path+"' \
                                                    data MUST be an instance of jwk.Object but got ", data);
                                    data.on("change:"+_path, function (name, event) {
                                        apply_change(event, op, comp, prop);
                                    }, comp);                                    
                                })(component, i, op);
                            }
                        }
                        prefix = "self.";
                        if (path.indexOf(prefix) == 0) {
                            var _path = path.substring(prefix.length);
                            value = op(self.get(_path, {deep: _path.indexOf(".") != -1}));
                            if (typeof value == "undefined") value = self[_path];
                            if (component) {
                                (function (comp, prop, op){
                                    console.assert(
                                        _path.indexOf(".") == -1 || comp instanceof jwk.Object,
                                        "ERROR: in order to add a listener for the path \"" + _path + "\", component MUST be an instance of jwk.Object but got ", comp);
                                    comp.on("change:"+_path, function (name, event) {
                                        apply_change(event, op, comp, prop);
                                    }, comp);
                                })(component, i, op);
                            }
                        }
                        prefix = "owner.";
                        if (path.indexOf(prefix) == 0) {
                            var _path = path.substring(prefix.length);
                            value = op(owner.get(_path, {deep: _path.indexOf(".") != -1}));
                            if (typeof value == "undefined") value = self[_path];
                            if (component) {
                                (function (comp, prop, owner, op){
                                    var _o = comp.settings.owner
                                    console.assert(
                                        _path.indexOf(".") == -1 || comp instanceof jwk.Object,
                                        "ERROR: in order to add a listener for the path \"" + _path +
                                        "\", owner MUST be an instance of jwk.Object but got ", _o);
                                    comp.settings.owner.on("change:"+_path, function (name, event) {
                                        apply_change(event, op, comp, prop);
                                    }, comp);
                                })(component, i, owner, op);
                            }
                        }
                        result[i] = value;
                    }                    
                }                
            }                        
        //}
        
        // lo saco del stack
        if (merge_with_data_stack.indexOf(settings) >= 0) {
            merge_with_data_stack.splice(merge_with_data_stack.indexOf(settings), 1);
        }        

        return result;
    }
    
    jwk.ui.create_component = function(settings) {    
        var ui_type = settings.ui_type;
        var namespace = settings.namespace || ui.DEFAULT_NAMESPACE;
        var path = settings.path;
        var name = settings.name;
        
        if (path && name) {
            // TODO: verificar que el final del path es igual al nombre
            console.assert(path.lastIndexOf(name) == path.length - name.length, path, name, path.lastIndexOf(name), path.length - name.length);
        } else if (path && !name) {
            // TODO: tiene path, así que el nombre lo sacamos de ahi.
            var i = path.lastIndexOf(".");
            name = (i>=0) ? path.substring(i+1) : path;            
        } else if (!path && name) {
            // hay nombre pero no hay path. Entonces tenemos que saber si existe un parent o un owner para sacar el comienzo del path de ahi y concatenarle el nombre.
            // Si no, va solo en nombre
            var up_obj = (settings.parent || settings.owner);
            path = (up_obj) ? (up_obj.path + "." + name) : name;
        } else if (!path && !name) {
            path = name = ui_type + "_" + jwk.nextId();
        }
        
        var settings = jwk.extend({
            path: path,
            name: name,
            render: ui.render,
            namespace: namespace
        }, settings);
        var spec = jwk.ui.component(namespace, ui_type);
        console.assert(spec, "ERROR: Not spacification found for ", namespace, ui_type, [settings]);
        var component = new spec.constructor(settings);
        component.init();
        return component;
    }
    
    
    // --------------------------------------------
    // 
    jwk.ui.Component.prototype.update_tree = function (tree) {
        // Acá recibís un tree y actualizás el arbol recorriendo tus hijos
        // Si el tree tiene un hijo y vos también, paás al siguiente hijo
        // Si el tree tiene un hijo que vos no tenés, tenés que crear el componente y agregarlo como hijo.
        // Si el tree no tiene un hijo que vos sí tenés, tenés que sacarte ese hijo y ponerlo en stand by
        // Luego por cada hijo que te quedó vivo, ejecutás recursivamente esto miso.
        
        // se ejecuta un trigger("update_tree") donde el componente podrá hacerse cargo de los componentes que quedaron en stan by
        // Luego se eliminan todos los componentes que continúen en stand by (porque nadie los sacó de ahi).
        console.error("update_tree", [this], [tree])

        var tree_nodes = [tree];
        var self_nodes = [this];
        
        while (tree_nodes.length > 0) {
            var tree_node = tree_nodes.splice(0,1)[0];
            var self_node = self_nodes.splice(0,1)[0];
            
            if (Array.isArray(tree_node.children)) {
                var self_children = self_node.get("children");
                if (self_children) {                    
                    for (var tree_child_name in tree_node.children) {
                        if (self_children.get(tree_child_name)) {
                            var tree_node_child = tree_node.children[tree_child_name];
                            tree_nodes.push(tree_node_child);
                        } else {
                            // Opa, el tree tiene un hijo que yo no tengo
                            console.log("Opa, el tree tiene un hijo que yo no tengo",tree_child_name, [this], [tree]);
                            not_implemented_yet();
                        }
                    }
                    var list = self_children.keys();
                    for (var self_child_name in list) {
                        if (!(self_child_name in tree_node.children)) {
                            // Opa, tengo un hijo que no está en el tree
                            console.log("Opa, tengo un hijo que no está en el tree", self_child_name, [this], [tree]);
                            not_implemented_yet();
                        }
                    }
                    
                } else {
                    // Opa, no tengo chldren y sin embargo el tree tiene
                    console.log("Opa, no tengo chldren y sin embargo el tree tiene", [this], [tree]);
                    not_implemented_yet();        
                }
            }
        }
    }
    
    jwk.ui.Component.prototype.update = function (event, prop) {        
        if (this._update_should_cancel(event, prop)) return;
        return this            
            ._update_begin(event, prop)
            ._update_update_tree(event, prop)
            ._update_update_value(event, prop)
            ._update_restructure(event, prop)        
            ._update_end(event, prop)        
    }
    
    jwk.ui.Component.prototype._update_should_cancel = function (event, prop) {
        return this.making_changes();
    }    
    jwk.ui.Component.prototype._update_begin = function (event, prop) {
        return this; // overwrite this
    }    
    jwk.ui.Component.prototype._update_end = function (event, prop) {
        return this; // overwrite this
    }    
    jwk.ui.Component.prototype._update_update_tree = function (event, prop) {
        if (typeof event.tree == "object") {
            this.update_tree(event.tree);
        }        
        return this;
    }    
    jwk.ui.Component.prototype._update_update_value = function (event, prop) {
        if (typeof prop == "string" && typeof this.settings[prop] != "undefined") {
            var old_value = this[prop];
            this[prop] = event.value;            
            /*
            this.trigger("change:"+prop, {
                event_name: "change:"+prop,
                old_value: old_value,
                path: prop,
                target: this,
                value: event.value
            });
            */
        }        
        return this;
    }    
    jwk.ui.Component.prototype._update_restructure = function (event, prop) {
        if (this.is_rendered()) {
            this.restructure();
            this.render.render(this);
        }
        return this;
    }    
    jwk.ui.Component.prototype.structure_tree = function () {
        // Esto devuelve el json que describe como tiene que ser el arbol de la strucure
        // Acá el componente actualiza esa estructura a apartir de su estado (cantidad, de hijos, latout, etc)
        return false;
    }
    
    jwk.ui.Component.prototype.create_structure = function () {
        var root = this.structure_tree();
        if (!root) return null;        
        root.name = root.name || "struct_" + jwk.nextId();
        root.path = this.path + "."  + root.name;
        root.owner = this;
        root.data = root.data || this.my_data();
        var structure = jwk.ui.create_component(root);
        return structure;
    }
    
    jwk.ui.Component.prototype.restructure = function () {
        var structure = this.get("structure");
        if (structure) {
            structure.destroy();
        }
        structure = this.create_structure();
        if (structure) {
            this.set("structure", structure);
        }
        return this;
    }
    
    // --------------------------------------------
    
    jwk.ui.Component.prototype.destroy = function () {
        this._destroyed = true;
        this.listen_data(false);
        if (this.parent) {
            // console.log("saco", this.name)
            this.parent.child(this.name, null);
        }
        this.drop_children();
        if (this.get("structure")) {
            this.get("structure").destroy();
        }
        if (jwk.ui.render.mouse) {
            jwk.ui.render.mouse.off(null, null, this);
        }
        return this.trigger_fast("destroy", {component:this});
    }
    
    // --------------------------------------------
    // The specific component may extend the way it render by over writing any of this funcions
    jwk.ui.Component.prototype.render_save_children = function (event) {
        this.render.render_save_children(this, this.settings.container);
    }
    
    jwk.ui.Component.prototype.render_node = function (event) {
        this.render.render_node(this, this.settings.container);
    }
    
    jwk.ui.Component.prototype.render_structure = function (event) {
        this.render.render_structure(this, this.settings.container);
    }
    
    jwk.ui.Component.prototype.render_children = function (event) {
        this.render.render_children(this, this.settings.container);
    }
    // --------------------------------------------
    
    jwk.ui.Component.prototype.is_rendered = function () {
        return this.render.is_rendered(this);
    }    
    
    jwk.ui.Component.prototype.add_class = function (_class) {
        this.render.add_class(this, _class);
    }

    jwk.ui.Component.prototype.remove_class = function (_class) {
        this.render.remove_class(this, _class);
    }

    jwk.ui.Component.prototype.paint = function () {
        console.assert(!this._destroyed, "ERROR: rendering a distroyed object", [this]);
        if (this.making_changes()) return this;        
        this.render.render(this);
        this.flag_on("rendered");
        return this;
    }
    
    jwk.ui.Component.prototype.child = function (id, child) {
        // HACK: tuve que sacar esto mientras reimplemento jwk.ui porque me daba problemas
        // console.assert(!child || child instanceof jwk.ui.Component, "ERROR: child is not a component", id, child);        
        console.assert(true || child instanceof jwk.ui.Component, "ERROR: child is not a component", id, child);        
        
        if (arguments.length == 1) {
            return this.get("children").get(id);
        } else {
            if (!child) {
                this.get("children").unset(id);
            } else {
                this.set("children."+id, child, {deep:true});
                this.get("children").parent = this;
            }
        }
        return this;
    }
    
    jwk.ui.Component.prototype.drop_children = function () {
        if (this.get("children")) {
            var list = this.get("children").keys();
            for (var i in list) {
                if(!this.get("children").get(list[i])) {
                    console.error(list[i], this.get("children").keys());
                }
                this.get("children").get(list[i]).destroy();
            }
        }
        return this;
    }
    
    jwk.ui.Component.prototype.container = function () {
        return this.render.resolve_target(this.parent_for.apply(this, arguments));
    }
    
    jwk.ui.Component.prototype.parent_for = function(name, index) {
        var data = {parent:this, query:(name ? "[child="+name+"]" : undefined)};
        if (this.render.resolve_target(data, true)) {
            return data;
        }
        return {parent:this};        
    }
        
    //jwk.ui.Component.prototype.parent_for = function(name, index) {
    //    return {parent:this, query:(name ? "[child="+name+"]" : undefined)};    
    //}
        
    jwk.ui.Component.prototype.tree = function() {
        return this.settings;
        // antes se hacía una copia limpia profunda. No solo el primer nivel
    }        
        
    jwk.ui.Component.prototype.extend_settings = function(_default, _custom) {        
        var in_depth = {};
        var names = this.extend_in_depth;
        for (var i in names) {
            var name = names[i]
            if (_default[name]) in_depth[name] = _default[name];
        }
        var sett = jwk.extend(_default, _custom);
        for (var name in in_depth) {
            sett[name] = jwk.extend(true, in_depth[name], _custom[name]);
        }        
        return sett;        
    }
    
    function trigger_settings_change (settings, diff, old_value) {
        this.trigger("change:settings", {
            target: this,
            stack: [this],
            path: "settings",
            diff_value: diff,
            value: settings,
            old_value: old_value
        });        
    }  
    
    jwk.ui.Component.prototype.init_settings = function (settings) {        
        var children = settings.children;
        var container = settings.container;
        if (typeof settings.disabled != "undefined") {
            settings.enabled = !settings.disabled;
        } else if (typeof settings.enabled != "undefined") {
            settings.disabled = !settings.enabled;
        }
        
        delete settings.children;
        delete settings.container;
        this.settings = jwk.extend({}, settings);
        var _settings = merge_with_data(settings, this);        
        this.set("value", null);
        jwk.extend(this, _settings);        
        this.settings = settings;
        
        
        
        
        
        
        
        
        
        
        
        // BINDING
        this.on("change:value", function (n, e) {
            /*
            cuando el "value" de este componente está logado (bind) con algo afuera (<<data.coso>>, <<owner.algo>>, etc)
            si el "value" cambia internamete hay que propagar el cambio hacia afuera (cambiar la data, o el owner o lo que sea)
            */
            var _value = this.value;
            var prefix;
            var data = this.data;
            var regexp = /<<(.+)>>/m;
            var owner = this.owner || this.settings.owner;
            if (this.settings.value) {
                // Puede pasar que el value no haya sido provisto en los settings
                var test = this.settings.value.match(regexp);
                if (test) {
                    var list = {
                        "data": data,
                        "self": self,
                        "owner": owner
                    };
                    var path = test[1];
                    for (var prefix in list) {
                        if (path.indexOf(prefix + ".") == 0) {
                            var _subpath = path.substring(prefix.length+1);
                            var _target = list[prefix];
                            //console.error([_target], _subpath, _value);
                            _target.set(_subpath, _value, {deep: true})                    
                        }
                    }
                }
            }
        }, this);
        





        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        

        function set_class_disabled () {
            $(this.target).addClass("disabled");
        }
        this.on("change:enabled", function(n,e){
            if (!e.value) {
                set_class_disabled.call(this);
                this.on("render", set_class_disabled, this);
            } else {
                $(this.target).removeClass("disabled");
                this.off("render", set_class_disabled, this);
            }
        }, this);
        this.set("enabled", !settings.disabled, {getter: "getset"});
        settings.children = children; 
        settings.container = container;                
        if (this.parent) {
            if (typeof this.parent.child == "function") {
                 this.parent.child(this.name, this);
                 // console.log("this.name: ", this.name, [this, settings], this.parent.get("children").keys());        
            }
        }
        trigger_settings_change.call(this, this.settings, _settings);
    }
  
    
    jwk.ui.Component.prototype.init_handlers = function () {
        this.listen_data(true);
        this.one("render:first", function (ev_name, ev) {
            ev.component.render.set_features(ev.component);
        });        
    }
    
    jwk.ui.Component.prototype.init_render = function () {
        console.assert(this.render, "ERROR: not render asigned", this);
        this.render.init_component(this);
    }
    
    jwk.ui.Component.prototype.init_structure = function () {
        return this.restructure();
    }
    
    jwk.ui.Component.prototype.update_settings = function (settings) {
        var old_value = this.settings;      
        var new_settings = jwk.extend({}, this.settings, settings);
        this.settings = new_settings;
        
        // set the component the new values
        new_settings = merge_with_data(this.settings);        
        var _container = new_settings.container;
        var _children = new_settings.children;
        delete new_settings.container;
        delete new_settings.children;
        jwk.extend(this, new_settings);
        new_settings.container = _container;
        new_settings.children = _children;
        
        // prepare params for merge_with_data
        settings.data = this.settings.data;
        
        trigger_settings_change.call(this, this.settings, merge_with_data(settings), old_value);
    }
    
    jwk.ui.Component.prototype.init = function () {
        this.init_tree();
        this.init_handlers();
        this.init_render();
        this.init_structure();
        jwk.ui.trigger("init:component", {component:this});
        this.trigger("init:component", {component:this});
        return this;
    }
    
    jwk.ui.Component.prototype.listen_data = function (sync) {
        var data = this.data;
        if (typeof data == "undefined") return;
        if (typeof data["on"] == "function" && typeof data["off"] == "function") {
            if (typeof this.datapath == "string") {
                if (sync) {
                    var component = this;
                    data.on("change:"+this.datapath, function (name, event) {
                        component.update(event);
                    }, this);
                } else {
                    data.off(null, null, this);
                }
            }
        } else {
            if (!Array.isArray(data)) {
                console.warn("WARNING: can't listen to data for change events: ", data);            
            }            
        }
        return this;
    }    
    
    jwk.ui.Component.prototype.my_data = function (value, options) {
        var data = this.data;
        if (typeof value == "undefined") {
            if (typeof this.datapath == "string") {
                if (this.datapath.indexOf("self:") == 0) {
                    var path = this.datapath.substring(5);
                    data = this;
                    if (path.length > 0) {
                        return data.get(path);
                    }
                    return data;
                } else {
                    data = data.get(this.datapath);                    
                }                
            }
            return data;
        } else {
            if (!this.making_changes()) {
                this.change_start();
                if (typeof this.datapath == "string") {
                    if (this.datapath.indexOf("self:") == 0) {
                        var path = this.datapath.substring(5);
                        data = this;
                        if (path.length > 0) {
                            return data.set(path, value);
                        }
                    } else {
                        data.set(this.datapath, value, options);
                    }
                }
                this.change_stop();
            } else {
                console.warn("Estaba haciendo cambios ya?", this);
            }
        }                
    }

    jwk.ui.Component.prototype.change_start = function () {
        this.flag_on("making_changes");
    }
    jwk.ui.Component.prototype.change_stop = function () {
        this.flag_off("making_changes");
    }
    jwk.ui.Component.prototype.making_changes = function () {
        return this.flag("making_changes");
    }

        
    return jwk.ui.Component;
});