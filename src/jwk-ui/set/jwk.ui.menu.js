define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
  
    
/*
menu.context
menu.menubar
menu.slide
menu.treeview
*/    
    
    // jwk.ui.panel library namespace
    jwk.ui.menu = {}
    
    // Menu ----------------------------------------------------------------------------------
    jwk.ui.menu.Menu = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
        
        this.on({
            "render_start": function () {
                
                //---- Solucion parcial al problema de q mustache busca en el nodo padre cuando no encuentra en el nodo actual.
                // Está pensado estudiar y evaluar Handlebars.js (es una extencion de mustache) que al parecer trae opciones más elegantes para este problema
                function prepare_data(menu) {                
                    for (var i=0; i<menu.length; i++) {
                        var node = menu[i];
                        var submenu = node.menu;
                        // var submenu = (typeof node["menu"] == "function") ? node.menu().valueOf() :  node.menu.valueOf();
                        if (!Array.isArray(submenu)) {
                            node.menu = false;
                            node.hasmenu = false;
                            node.id = false;
                        } else {
                            node.hasmenu = true;
                            node.id = node.id || "submenu_" + jwk.nextId();
                            prepare_data(submenu.valueOf());
                        }                    
                    }
                    return menu;
                }
                var data = this.my_data();
                if (data) {                
                    this.my_data(prepare_data( (data instanceof jwk.Node) ? data.valueOf() : data ), {no_parse: true});
                }            
                //---------
                
            }
        }, this);
    }
    
    jwk.ui.component({
        "ui_type": "menu",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.menu.Menu,
        "extends": jwk.ui.panel.Panel,
        "api": {
            "click":function (n, e) {                
                if (e.which("data-command")) {
                    e.command = e.which("data-command");                    
                    function searchCommand(com, array) {
                        for (var i in array) {
                            if (array[i].command == com) return array[i];
                            if (array[i].menu) {
                                var c = searchCommand(com, array[i].menu);
                                if (c) return c;
                            }                            
                        }                        
                    }                    
                    var command = searchCommand(e.command, e.component.settings.data);
                    e.params = command.params;
                    // e.params = e.which("data-params");
                    e.component.trigger("click:entry command", e);
                } else {
                    console.error("Que signal dio esto? como debo manejarlo: ", e.which("signal"));
                }
            }        
        },
        "defaults": {
            "disable_selection": true,
            "ui_type": "menu", 
            "namespace": "jwk-ui", 
            "template": {
                "menu_class": "submenu",
                "entry_class": "menu-entry",
                "empty": "<div class='{{>entry_class}} empty' disabled='true'>(...)</div>",
                "checkbox": "<svg class='menu_checkbox' width='16' height='16'>"+
                    "<g>"+
                    "<rect ry='3' rx='3' fill-opacity='0.3' id='svg_8' height='14' width='14' y='1.02963' x='0.99209' stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null' />"+
                    "<path d='m2.36865,9.37968c0,0 3.82932,4.22351 3.82584,4.19188c-0.00348,-0.03164 6.70479,-10.04848 6.70479,-10.04848c0,0 -6.87025,7.4897 -6.87373,7.45806c-0.00348,-0.03164 -3.6569,-1.60145 -3.6569,-1.60145z' stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null'/>"+
                    "</g>"+
                    "</svg>",
                "radiobtn": "<svg class='menu_radio_btn' width='16' height='16'>"+
                    "<g>"+
                    "<circle r='3.41212' cy='8.02963' cx='7.99209' stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null' stroke-width='0'/>"+
                    "<rect ry='3' rx='3' fill-opacity='0.3' height='14' width='14' y='1.02963' x='0.99209' stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null' />"+
                    "</g>"+
                    "</svg>",
                "arrow": "<svg class='menu_arrow' width='14' height='18' xmlns='http://www.w3.org/2000/svg'><g>"+
                         "<path d='m6.39569,9.11835l-0.78473,-2.03675l3.30957,2.03675l-3.30957,2.03675l0.78473,-2.03675z'  stroke-linecap='null' stroke-linejoin='null' stroke-dasharray='null'/>"+
                         "</g></svg>",
                "command": "{{#command}}data-command=\"{{command}}\"{{/command}}",
                "id":      "{{#id}} menu-id=\"{{id}}\"{{/id}}",
                "disabled": "{{#disabled}} disabled='true' {{/disabled}}",
                "separator": "{{#separation}}separation='true'{{/separation}}",
                "entry_text": "{{#text}}<span class='text'>{{text}}</span>{{/text}}",
                "entry_arrow": "{{>arrow}}",
                "entry_icon": "{{#icon}}<span class='icon {{icon}}'></span>{{/icon}}",
                "entry_check": "{{#checked}}{{>checkbox}}{{/checked}}",
                "entry_radio": "{{#selected}}{{>radiobtn}}{{/selected}}",
                "entry_img": "{{>entry_icon}}{{>entry_check}}{{>entry_radio}}",
                "entry_submenu": "{{#hasmenu}}{{>entry_arrow}}{{/hasmenu}}{{>menu}}",
                "entry_bind": "{{#bindkey}}<span class='bindkey'>{{bindkey}}</span>{{/bindkey}}",                
                "entry_content": "{{>entry_img}}{{>entry_text}}{{>entry_bind}}{{>entry_submenu}}",
                "entry": "<div {{>command}} {{>separator}} {{>disabled}} {{>id}} class=\"{{>entry_class}}\">{{>entry_content}}</div>",
                "menu": "{{#hasmenu}}<div class=\"{{>menu_class}}\">{{#menu}}{{>entry}}{{/menu}}{{^menu}}{{>empty}}{{/menu}}</div>{{/hasmenu}}",                
                "rootmenu": "<div root class=\"{{>menu_class}}\">{{#data}}{{>entry}}{{/data}}</div>",
                "main": "{{>rootmenu}}"
            }
        }
    });    
    
    
    // Context menu ----------------------------------------------------------------------------------
    jwk.ui.menu.Context = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu.context").defaults();
        jwk.ui.menu.Menu.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "menu.context",
        namespace: "jwk-ui",
        constructor: jwk.ui.menu.Context,
        extends: jwk.ui.menu.Menu,
        defaults: { template: { main: "<div></div>" } }
    });

    // Menubar ----------------------------------------------------------------------------------
    var debug_menu = false;
    jwk.ui.menu.Menubar = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu.menubar").defaults();
        jwk.ui.menu.Menu.call(this, jwk.extend(true, {}, def, settings));
        
        if (jwk.ui.render.mouse) {
            jwk.ui.render.mouse.on("click", function (n,e){
                if (e.component != this) {
                    this.close();
                }
            }, this);
        }
        
        this.on("render_start", function () {
            var menubar = this;
            menubar.drop_children();
            
            var data = this.my_data();
            if (!data) return;
            for (var i=0; i<data.length; i++) {
                var node = data[i];
                node.create_submenu = function () {
                    
                    /// menubar.template.empty tiene lo que busco pero el siguiente código no le da bola
                                        
                    
                    var submenu = jwk.ui.create_component({
                        "parent": menubar,
                        "ui_type": "menu",
                        "namespace": "jwk-ui",
                        "name": this.id,
                        "data": this.menu,
                        "template.empty": menubar.template.empty,
                        "position": {
                            "my": "left top",
                            "at": "left bottom",
                            "of": "[path='" + menubar.path + "'] [menu-id='" + this.id + "']",
                            "position": "absolute"
                        }
                    });
                    
                    submenu.on("command click:entry", function (n,e) { menubar.trigger_fast(n, e); });
                }                                  
            }            
        }, this);        
        
        this.set("opened", false);
        
        this.on("change:opened", function (n,e) {
            if (e.value) {
                e.target.add_class("opened");
                e.target.structure.add_class("opened");                
                
                var list = this.children.keys();
                for (var i=0; i<list.length; i++) {
                    var name = list[i];
                    var child = this.children.get(name);
                    var $entry = e.target.target.find("[menu-id='"+name+"']");
                    if (e.value == name) {
                        child.add_class("opened");
                        $entry.addClass("opened");
                    } else {
                        child.remove_class("opened");
                        $entry.removeClass("opened");
                    }
                }
                
                if (e.old_value == false) {
                    e.target.trigger("open", {component: e.target});
                }                
            } else {
                e.target.remove_class("opened");
                e.target.structure.remove_class("opened");
                
                var list = this.children.keys();
                for (var i=0; i<list.length; i++) {
                    var name = list[i];
                    this.children.get(name).remove_class("opened");
                    e.target.target.find("[menu-id]").removeClass("opened");                
                }
                
                e.target.trigger("close", {component: e.target});
            }
        }, this);
        
    }
    
    // private functions --------------------------------------------------
    function start_menu_change () {
        var menubar = this;
        if (menubar._menu_change_timer) {
            clearTimeout(menubar._menu_change_timer);            
        }
        
        if (debug_menu) if (!menubar._menu_change_data) console.error(" ---------- start_menu_change -----------");

        menubar._menu_change_data      = menubar._menu_change_data || menubar.my_data() || [];
        menubar._menu_change_commands  = menubar._menu_change_commands || {};
        menubar._menu_change_menues    = menubar._menu_change_menues || {};
        

        menubar._menu_change_timer = setTimeout(function () {
            if (debug_menu) console.error(" ------------- menubar._menu_change_data -> ", [menubar._menu_change_data]);
            
            var orden = function (a, b) {
                var ret = 0;
                if ( (!a.position || a.position>=0) && b.position<0) ret = -1; 
                if ( (!b.position ||b.position>=0) && a.position<0) ret = 1; 
                if (ret == 0) ret = (a.position > b.position) ? 1 : -1;
                return ret;
            }
            menubar._menu_change_data = menubar._menu_change_data.sort(orden);                 
            
            if (typeof menubar.datapath == "string") {
                if (menubar.datapath.indexOf("self:") != 0) {
                    if (menubar.data && menubar.data.set) {
                        menubar.data.set(menubar.datapath, menubar._menu_change_data, {no_parse: true});
                        menubar.paint();
                    }
                } else {
                    return console.error("not implemented yet");
                }
            } else {
                return console.error("not implemented yet");
            }
            delete menubar._menu_change_data;
            delete menubar._menu_change_commands;
            delete menubar._menu_change_menues;
            delete menubar._menu_change_timer;
            delete menubar._menu_top_parent;
        }, 100);
    }

    function get_menu_by_id(id) {
        var menu;
        if (this._menu_change_menues) {
            var menu = this._menu_change_menues[id];
            if (menu) return menu;
        }

        var data = this.my_data();

        function search(id, branch) {
            var menu = null;
            console.assert(Array.isArray(branch), branch);
            for (var i in branch) {
                if (branch[i].id == id) return branch[i];
                if (branch[i].menu) {
                    menu = search.call(this, id, branch[i].menu);
                    if (menu) return menu;
                }
            }
        }

        menu = search.call(this, id, data);
        if (menubar._menu_change_commands) {
            menubar._menu_change_commands[id] = menu;
        }

        return menu;
    }
    // ----------------------------------------------------
    function find_entry(commandID) {
        var menubar = this;
        start_menu_change.call(menubar);
        var entry = menubar._menu_change_commands[commandID];        
        if (entry) return entry;
        var menu = menubar._menu_change_menues[commandID]    
        if (menu) return menu;
        
        function search_deep (list) {
            for (var i in list) {
                var entry = list[i];
                if (entry.id) menubar._menu_change_menues[entry.id] = entry;
                if (entry.command) menubar._menu_change_commands[entry.command] = entry;
                if (Array.isArray(entry.menu)) {
                    search_deep(entry.menu);
                }
            }            
        }        
        
        if (menubar._menu_change_data) {
            search_deep(menubar._menu_change_data);
        }
        
        entry = menubar._menu_change_commands[commandID];        
        if (entry) return entry;
        menu = menubar._menu_change_menues[commandID]    
        if (menu) return menu;
                
    }
    
    jwk.ui.component({
        "ui_type": "menu.menubar",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.menu.Menubar,
        "extends": jwk.ui.menu.Menu,
        "defaults": {            
            "template": {                
                "menu": "{{#hasmenu}}{{create_submenu}}{{/hasmenu}}"
            }            
        },
        "api": {            
            "parent_for": function (name, index) {
                switch (name) {
                    case "ontop": return { parent: this.render.container() };
                    default:                
                        return { parent: this.get("structure") };
                }
            },
            "structure_tree": function () {
                return {
                    "name": "ontop",
                    "ui_type": "panel",
                    "class": "menu-ontop-layer"
                }
            },
            // ----------------------------------------------------------------------------------------------
            "add_menu": function (name, id, position, relativeID, callback) {
                if (debug_menu) console.log("add_menu", arguments);
                var menu = {
                    id: id,
                    text: name,
                    menu:[],
                    position: position
                }
                var current = find_entry.call(this, id);
                if (current) {
                    menu = current;
                    menu.text = name;
                }
                                
                this._menu_change_menues[id] = menu;
                if (relativeID) {
                    var parent = find_entry.call(this, relativeID);
                    if (parent) {                        
                        console.assert(Array.isArray(parent.menu), parent);
                        if (parent.menu.indexOf(menu) == -1) parent.menu.push(menu);
                    } else {
                        console.warn("WARNING: relative parent menu id does not exist", [arguments]);                                                
                    }
                } else {
                    if (this._menu_change_data.indexOf(menu) == -1) this._menu_change_data.push(menu);                    
                }
                return true;
            },
            "add_menu_item": function (id, name, commandID, bindingStr, displayStr, position, relativeID, callback) {                        
                if (debug_menu) console.log("add_menu_item", arguments);
                var entry = {
                    command: commandID,
                    text: name,
                    bindkey: displayStr,
                    binding: bindingStr
                };
                                
                if (commandID) {
                    var current = find_entry.call(this, commandID);
                    if (current) {
                        entry = current;
                        entry.text = name;
                        entry.bindkey = displayStr;
                        entry.binding = bindingStr;
                    }                
                    this._menu_change_commands[commandID] = entry;
                }
                if (name == "---") entry = {separation: true, text:""};

                var parent = find_entry.call(this, id);
                if (debug_menu) console.log("add_menu_item id:", id, parent);
                if (parent) {
                    console.assert(Array.isArray(parent.menu), parent);
                    if (parent.menu.indexOf(entry) == -1) {
                        parent.menu.push(entry);
                    }
                }
                return true;
            },
            "remove_menu": function () {
                start_menu_change.call(this);
                if (debug_menu) console.log("remove_menu", arguments);
                console.error("not implemented");
            },
            "remove_menu_item": function () {
                start_menu_change.call(this);
                if (debug_menu) console.log("remove_menu_item", arguments);
                console.error("not implemented");
            },
            "set_menu_item_shortcut": function (commandID, shortcutKey, format_descriptor, callback) {
                start_menu_change.call(this);                
                if (debug_menu) console.log("set_menu_item_shortcut", arguments);
                var entry = find_entry.call(this, commandID);
                entry.bindkey = format_descriptor;
                entry.binging = shortcutKey;
                return true;
            },
            "set_menu_title": function (commandID, name, callback) {
                start_menu_change.call(this);
                if (debug_menu) console.log("set_menu_title", arguments);
                var entry = find_entry.call(this, commandID);
                entry.text = name;
                return true;
            },
            "set_menu_item_state": function (commandID, enabled, checked, selected) {
                start_menu_change.call(this);
                if (debug_menu) console.log("set_menu_item_state", arguments);
                var entry = find_entry.call(this, commandID);
                if (enabled) delete entry.disabled; // está bien que esté al revéz
                if (!enabled) entry.disabled = true;
                if (checked) entry.checked = true; 
                if (!checked) delete entry.checked;        
                if (selected) entry.selected = true; 
                if (!selected) delete entry.selected;
                return true;
            },
            // ----------------------------------------------------------------------------------------------
            "add_menu_entry": function (id, entry) {
                start_menu_change.call(this);
                if (debug_menu) console.log("add_menu_entry", arguments);
                entry = (entry instanceof jwk.Node) ? entry.valueOf() : entry;
                var parent = get_menu_by_id.call(this, id);
                console.assert(Array.isArray(parent.menu), id, entry, parent);
                parent.menu.push(entry);
                return true;
            },
            // ----------------------------------------------------------------------------------------------
            "close": function () {
                this.set("opened", false);
            },
            "open": function (menuid) {        
                this.set("opened", menuid);
            },
            "click": function (n, e) {
                if (e.which("data-command")) {
                    e.command = e.which("data-command");
                    e.component.trigger("click:entry command", e);
                    e.component.close();
                    return this;
                }
                this.open(e.which("menu-id"));
            },
            "mouseover": function (n, e) {
                if (!this.opened) return this;        
                if (e.which("menu-id")) {
                    this.open(e.which("menu-id"));
                }
            }    
        }
    });
    
    // Slide menu ----------------------------------------------------------------------------------
    jwk.ui.menu.Slide = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu.slide").defaults();
        jwk.ui.menu.Menu.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "menu.slide",
        namespace: "jwk-ui",
        constructor: jwk.ui.menu.Slide,
        extends: jwk.ui.menu.Menu,
        defaults: { template: { main: "<div></div>" } }
    });
    
    // Treeview menu ----------------------------------------------------------------------------------
    jwk.ui.menu.Treeview = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "menu.treeview").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));        
        
        // Cada vez que se renbderiza el componente el .entry_bg vuelve a quedar en su estado inicial
        // por tanto es necesario capturar su estado justo antes de volver a renderizar y restaurarlo luego del render
        this.on("render_start",function () {
            if (!this.target) return;
            var hover_bg = this.target.find(".hover_bg").eq(0);
            var selected_bg = this.target.find(".selected_bg").eq(0);
            this.hover_bg_style = hover_bg.attr("style");
            this.selected_bg_style = selected_bg.attr("style");
        }, this);
        
        this.on("render",function () {
            // console.log(arguments, jwebdesk.elapsed())            
            var selected_bg = this.target.find(".selected_bg").eq(0);
            var hover_bg = this.target.find(".hover_bg").eq(0);
            selected_bg.attr("style", this.selected_bg_style);
            hover_bg.attr("style", this.hover_bg_style);
        }, this);
        // ------------------------------
        
    }
    
    function hilight_selected_node() {
        var node = this.get("selected");
        var selected_bg = this.target.find(".selected_bg").eq(0);
        var li = this.target.find("li[path='"+node.path+"'][root='"+node.root+"']").closest("li");
        if (li.length == 0) return console.error("no encontre el li?", arguments, this);
        // Es importante el orden: primero show y luego offset
        selected_bg.show(0);
        var left = selected_bg.offset().left;
        var top = li.offset().top;
        selected_bg.offset({top:top, left: left});                    
    }
    
    jwk.ui.component({
        "ui_type": "menu.treeview",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.menu.Treeview,
        "extends": jwk.ui.panel.Panel,
        "api": {
            "close": function (root, path) {
                var self = this;
                var deferred = jwk.Deferred();
                var node;
                if (arguments.length == 1 && typeof root == "object") {
                    node = root;
                } else {
                    node = this.my_data().get(root).cache[path];
                    if (!node) {
                        console.error("node?", node, [path, node.cache]);
                    }
                }
                
                if (node.state != "closed") {
                    node.state  = "closed";
                    var li = self.target.find("[path='" + node.path + "'][root='" + node.root + "']");                  
                    var ul = li.children("ul");
                    // -----                    
                    // li.attr("state", "closed").addClass("closed").removeClass("opened");
                    li.find(".state").eq(0).attr("class", "state " + node.state);
                    // -----
                    ul.animate({height: 0},
                        {
                            duration: 500,
                            complete: function () {
                                self.paint();
                                deferred.resolve(node);
                            }
                        }
                    );                    
                }
                
                return deferred.promise();                
            },
            "open": function (root, path) {
                // console.log("open", arguments, jwebdesk.elapsed());
                var self = this;
                var deferred = jwk.Deferred();
                var whenchildren;                
                var node;
                if (arguments.length == 1 && typeof root == "object") {
                    node = root;
                    console.assert(typeof node.nodes == "function", [node, node.nodes]);
                    whenchildren = node.nodes();
                } else {
                    node = this.my_data().get(root);
                    if (path == "/") {
                        whenchildren = node.nodes();
                    } else {
                        console.error("not implemented");
                    }
                }
                
                (function (def){
                    // console.log(whenchildren, whenchildren.state());
                    if (whenchildren.state() == "pending") {
                        if (node.state == "closed") {
                            var li = self.target.find("[path='" + node.path + "'][root='" + node.root + "']");                          
                            // -----
                            li.attr("state", "loading").addClass("loading").removeClass("closed");                            
                            li.find(".state").eq(0).attr("class", "state loading");
                            // -----
                        }                        
                    }
                    
                    whenchildren.done(function (_nodes, parent) {
                        // console.log("whenchildren.done", arguments, jwebdesk.elapsed());
                        if (parent.state == "closed") {                                                        
                            self.paint();
                            parent.state = "opened";
                            var li = self.target.find("[path='" + parent.path + "'][root='" + parent.root + "']");                            
                            var ul = li.children("ul");
                            var h = ul.height();
                            ul.css({height:0, display:"block"});                            
                            // -----                            
                            li.attr("state", "opened").addClass("opened").removeClass("closed").removeClass("loading");                            
                            li.find(".state").eq(0).attr("class", "state opened");
                            // -----
                            ul.animate({height: h},
                                {
                                    duration: 500,
                                    complete: function () {                                  
                                        def.resolve(_nodes, parent);
                                    }
                                }
                            );
                        } else {
                            // console.error("ERROR?",parent.get("state"), this, arguments);
                            // Ya esta abierta.
                            def.resolve(_nodes, parent);
                        }
                    });
                })(deferred);
                
                return deferred.promise();
            },
            "expand_to": function (_root, _path) {
                // console.log("expand_to", arguments, jwebdesk.elapsed());
                var root = _root, 
                    path = _path;
                if (arguments.length == 1 && root.root, root.path) {
                    path = root.path;
                    root = root.root;
                }
                var deferred = jwk.Deferred();
                if (path == "/") {
                    this.open(root, path).done(function (nodes, parent) {
                        deferred.resolve(parent);
                    });
                } else {
                    var self = this;
                    var root_node = this.my_data().get(root);
                    var parts = [path];
                    var paths = {};
                    paths[path] = true;
                    var index = path.indexOf("/", 1);
                    while (index != -1) {
                        var _path = path.substring(0, index);
                        parts.push(_path);
                        paths[_path] = true;
                        index = path.indexOf("/", index+1);                        
                    }
                    console.assert(parts.length > 0, path);
                    (function(paths){
                        function go_deeper(_nodes, parent) {
                            // console.log("go_deeper", arguments, jwebdesk.elapsed());
                            if (parent.path == path) {
                                deferred.resolve(parent);
                            }
                            var current = null;
                            var nodes = _nodes.valueOf();
                            for (var i=0; i<nodes.length; i++) {
                                if (nodes[i].path in paths) {
                                    if (nodes[i].isFolder) {
                                        self.open(nodes[i]).done(go_deeper);
                                    } else {
                                        deferred.resolve(nodes[i]);
                                    }
                                }
                            }
                        }
                        self.open(root_node).done(go_deeper);
                    })(paths);
                }                
                return deferred.promise();
            },
            "click": function(n, e) {
                // console.log(arguments, jwebdesk.elapsed());
                var treeview = this;
                var path = e.which("path");
                var root = e.which("root");
                var state = e.which("state");
                var signal = e.which("signal");
                var abort = false;
                if (root && path) {
                    var node = this.my_data().get(root).cache[path];
                    abort = this.select(node, {silence: true});
                }
                switch(state) {
                    case "closed":
                        this.expand_to(root, path).done(function (node){
                            if (!abort) treeview.trigger("select", {node: node});
                        });
                        break;
                    case "opened":
                        this.close(root, path).done(function (node){
                            if (!abort) treeview.trigger("select", {node: node});
                        });
                        break;
                    default:
                        console.log("click not implemnented for state =", state);
                }
            },
            "select": function(node, _options) {
                if (!node) return;
                var options = _options || {};                
                if (node == this.get("selected")) {
                    hilight_selected_node.call(this);                    
                    return true;
                }
                this.set("selected", node);
                var treeview = this;
                this.one("select", function (n,e) {                    
                    hilight_selected_node.call(treeview);
                });                
                hilight_selected_node.call(treeview);                
                
                if (options.expand) {
                    var path = node.path;
                    var root = node.root;
                    if (node.state == "opened") {
                        if (node.parent) {                            
                            this.expand_to(node.root, node.parent.path).done(function () {                            
                                if (!options.silence) treeview.trigger("select", {node: node});
                            });                    
                        }
                    } else {
                        this.expand_to(node.root, node.path).done(function (node) {                            
                            if (!options.silence) treeview.trigger("select", {node: node});
                        });                    
                    }                    
                } else {
                    if (!options.silence) this.trigger("select", {node: node});                    
                }
                
            },
            "mouseover": function(n, e) {
                if (!e.target) return;
                var hover_bg = this.target.find(".hover_bg").eq(0);
                var li = $(e.target).closest("li");
                if (li.length == 0) return;
                // Es importante el orden: primero show y luego offset
                hover_bg.show(0);
                var left = hover_bg.offset().left;
                var top = li.offset().top;
                hover_bg.offset({top:top, left: left});
            },
            "mouseout": function(n, e) {
                this.target.find(".hover_bg").eq(0).hide(0);
            },
            "create_icon": function () {
                var treeview = this;
                return function (text, render) {
                    var icon = this.icon;
                    var icon_size = "size_" + treeview.icon_size;
                    var icon_class = jwk.ui.icon.get("iconmap").valueOf()[icon] || "";
                    return "<div class='" + icon + " icon " + icon_class + " " + icon_size + "'></div>";
                };
            },            
            "prepare_entry": function () {
                return function (text, render) {
                    if (!this.children) {
                        this.children = false;
                    }                
                    return render(text);
                }
            }
        },
        "defaults": {
            "icon_size": 16,
            "disable_selection": true,
            "template": {
                // "submenu": "<ul class='submenu'>{{#children}}{{#children.valueOf}}{{>entry}}{{/children.valueOf}}{{/children}}</ul>",
                "submenu": "<ul class='submenu'>{{#children}}{{>entry}}{{/children}}</ul>",
                "state_class": "{{#state}}{{.}}{{/state}}{{^state}}closed{{/state}}",
                "state_icon": "<div signal='state' class='state {{>state_class}}'></div>",
                "state": "state='{{>state_class}}'",
                "selected": "{{#selected}}class='selected'{{/selected}}'",
                "icon": "{{#self.create_icon}}{{icon}},{{name}}{{/self.create_icon}}",
                "text": "<div class='text' text='{{name}}'>{{name}}</div>",
                "path": "path='{{path}}'",
                "root": "{{#root}}root='{{root}}'{{/root}}",
                "hover_bg": "<div class='hover_bg'><div class='text'>example</div></div>",
                "selected_bg": "<div class='selected_bg'><div class='text'>example</div></div>",
                "entry": "{{#self.prepare_entry}}<li signal='node' {{>root}} {{>path}} {{#isFolder}}folder='true'{{/isFolder}} {{>state}} {{>selected}}><div class='entry'>{{>state_icon}}{{>icon}}{{>text}}</div>{{>submenu}}</li>{{/self.prepare_entry}}",
                "rootmenu": "<div>{{>hover_bg}}{{>selected_bg}}<ul class='submenu root'>{{#data.values}}{{>entry}}{{/data.values}}</ul></div>",
                "main": "{{>rootmenu}}"
            }
        }
    });  
    
    
    

    
     jwk.ui.component({
        ui_type: "treeview",
        namespace: "jwk-ui",
        constructor: jwk.ui.menu.Treeview
    });  
    
    
    return jwk.ui.menu;
});