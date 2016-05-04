define([
    "jwebkit",
    "jquery",
    "./jwk.ui.panel",
], function(jwk, $, Panel) {
   
    
/*
list
list.iconview
list.table
list.compobox
*/
    // jwk.ui.icon library namespace
    jwk.ui.list = {}
    
    // Bar ----------------------------------------------------------------------------------
    jwk.ui.list.List = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "list").defaults();
        if (settings.removable && (!settings.template || !settings.template.remove)) {
            def["template.remove"] = "<div class='remove entry' signal='remove_entry'></div>";            
        }
        var sett = this.extend_settings(def, settings);        
        
        if (sett.removable) {
            sett.class = (typeof sett.class == "string" ? sett.class + " " : "" ) + "removable";            
        }
        jwk.ui.panel.Panel.call(this, sett);
        
        function swap_data(e){
            console.error("Me hicieron swap. Quedó bien?");
        }
        
        this.on("sortable", function (n,e) {
            controller.on("swap", swap_data);
            console.error("my_data()->", this.my_data());        
        });
    }
    
    jwk.ui.component({
        "ui_type": "list",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.list.List,
        "extends": jwk.ui.panel.Panel,
        "defaults": {
            "disable_selection": true,
            "ui_type": "list", 
            "namespace": "jwk-ui", 
            "removable": false,
            "template": {
                "empty": "...",
                "remove": "",
                "text": "{{.}}",
                "entry": "<div signal='entry' entry='{{.}}'>{{>text}}{{>remove}}</div>",
                "main": "<div>{{#data.valueOf}}{{>entry}}{{/data.valueOf}}{{^data.valueOf}}{{>empty}}{{/data.valueOf}}</div>"
            }
        },
        "api": {
            "click": function (n, e) {                
                if (e.which("signal") == "remove_entry") {
                    e.component.remove(e.index("entry"));
                } else {
                    e.index = e.index("entry");
                    e.entry = e.which("entry");
                    e.component.trigger("click:entry", e);
                }
            },
            "remove": function (who) {
                switch (typeof who) {
                    case "number":
                        var index = who;

                        var data = this.my_data();

                        if (typeof data.splice == "function") {
                            this.trigger("remove", {component:this, index: index, value: data.valueOf()[index]});
                            console.log(data);
                            data.splice(index, 1);
                            this.my_data(data);
                        } else {
                            console.error("ERROR: casono implementado");
                        }

                        break;
                    default:
                        console.error("caso no implementado");
                }
            }            
        }
    });
    
    // Iconview ----------------------------------------------------------------------------------
    
    jwk.ui.list.Iconview = function (settings) {
        if (!settings) return;
        
        var def = jwk.ui.component(settings.namespace, "list.iconview").defaults();
        var sett = jwk.extend(true, {}, def, settings);
        jwk.ui.list.List.call(this, sett);
        // this.set("icon_map", sett.icon_map || default_icon_map );
        var iconview = this;
        this.on("feature:selectable", function (){            
            this.controllers.selectable.on("select", function (n, e) {
                var selection = [];
                $(e.target).each(function (i, target){
                    var root = $(target).closest("[root]").attr("root");
                    var path = $(target).closest("[path]").attr("path");
                    selection.push(root + ":" + path);
                })
                iconview.trigger_fast("select", {
                    selection: selection
                });
            })
        }, this)
    }
    
    function trigger_custom(n,e) {
        this.trigger_fast(n, jwk.extend(e, {root: e.which("root"), path: e.which("path")}));
    };
    
    jwk.ui.component({
        "ui_type": "list.iconview",
        "namespace": "jwk-ui",        
        "constructor": jwk.ui.list.Iconview,
        "extends": jwk.ui.list.List,
        "api": {
            "click":       trigger_custom,
            "dblclick":    trigger_custom,
            "mousedown":   trigger_custom,
            "mousemove":   trigger_custom,
            "mouseover":   trigger_custom,
            "mouseout":    trigger_custom,
            "mouseup":     trigger_custom,
            "contextmenu": trigger_custom,
            "create_icon": function () {
                var iconview = this;
                return function (text, render) {
                    return jwk.ui.icon.create(this);
                };
            },
            "create_text": function () {
                var iconview = this;
                return function (text, render) {
                    var name = this.name;                    
                    return name;
                };
            }
        },
        "defaults": {
            "icon_size": "48",
            "selectable":{
                "allowMultiple": true,
                "applyTo": "children"
            },
            "template": {
                "empty": "<span class='empty'></span>",
                "remove": "",
                "text": "<span>{{#self.create_text}}{{/self.create_text}}</span>",
                "icon": "{{#self.create_icon}}{{/self.create_icon}}",
                "path": "path='{{path}}' root='{{root}}'",
                "entry": "<div signal='entry' {{>path}} icon='{{id}}'>{{>icon}}{{>text}}</div>",
                "main": "<div>{{#data.valueOf}}{{>entry}}{{/data.valueOf}}{{^data.valueOf}}{{>empty}}{{/data.valueOf}}</div>"
            }
        }
    }); 
    
    jwk.ui.component({
        "ui_type": "iconview",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.list.Iconview
    });    
    
    // TableList ----------------------------------------------------------------------------------
    jwk.ui.list.TableList = function (settings) {
        if (!settings) return;
        var tablelist = this;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        if (typeof settings.table_attr == "string") {
            def.template.table_attr = settings.table_attr;
        }
        this.selection = [];
        // this.selection = (Array.isArray(settings.selection)) ? settings.selection : [];
        jwk.ui.list.List.call(this, def);
        
        
        this.on("feature:selectable", function (n, e) {
            e.controller.on("select", function (_n, _e) {
                console.log(arguments);
                tablelist.selection.length = 0;
                _e.selection.each(function () {
                    var row = $(this).attr("row");
                    tablelist.selection.push(row);
                });
                tablelist.trigger("selection", {
                    "selection": tablelist.selection,
                    "index": tablelist.selection[0],
                    "target": tablelist
                });
            })
        })
        
        
        
        
        
    }
    
    jwk.ui.component({
        "ui_type": "tablelist",
        "namespace": "jwk-ui",
        "api": {
            compile_row: function () {
                var table = this;
                // console.log("acá es donde se puede hacer magia");
                console.assert(Array.isArray(table.value),
                               "ERROR: table.value must have an array with data to display on each row of tablelist", 
                               [table.value, table]);
                console.assert(Array.isArray(table.fields),
                               "ERROR: table.fields must have an array with the names of the attributes of each entry which determines column order", 
                               [table.fields, table]);
                
                
                return function (text, render) {
                    
                    var index = table.value.indexOf(this);
                    
                    var _class = (index % 2 == 0 ? "even" : "odd");
                    for (var i in table.selection) {
                        if (table.selection[i] == index) {
                            _class += " selected"; // TODO: hay que obtener este "selected" de la clase
                        }
                    }
                    result = "<tr signal='row' row='"+index+"' class='"+ _class +"'>";                    
                    
                    
                    // result = "<tr signal='row' row='"+index+"' class='"+ (index % 2 == 0 ? "even" : "odd") +"'>";                    
                    for (var i in table.fields) {
                        var prop = table.fields[i];
                        var value = this[prop];
                        var compiled = "<div prop='"+prop+"'>" + value + "</div>";
                        if (table.settings.template[prop]) {
                            console.error("ERROR: not implemented");
                        }
                        result += "<td cell='"+prop+"'><div class='table-layout'>" + compiled + "</div></td>";
                    }
                    result += "</tr>";
                    return result;
                };
            }, /*click: function (n, e) {                
                console.log(arguments, e.which("row"));
                
                
                
                this.trigger_fast(n, e);
            },*/ _update_end: function (event, prop) {
            }, _update_restructure: function (event, prop) {
                // console.log("tablelist._update_restructure", arguments);
                if (this.is_rendered()) {
                    if (prop == "columns") {
                        var $cols = this.target.find("colgroup col");
                        $cols.each(function (index) {
                            if ($(this).attr("width") != event.value[index]) {
                                $(this).attr("width", event.value[index]);
                            }
                        });
                    }
                    if (prop == "value") {
                        this.paint();
                    }
                }
                return this;
            }
        },
        "defaults": {
            "disable_selection": true,
            "ui_type": "tablelist",
            "namespace": "jwk-ui", 
            "removable": false,
            "template": {              
                "row": "{{#self.compile_row}}{{/self.compile_row}}",
                "body": "<tbody>{{#self.value}}{{>row}}{{/self.value}}</tbody>",
                "footer": "<tfoot></tfoot>",
                "table_attr": "cellpadding='0' cellspacing='0'",
                "col": "<col width='{{.}}' />",
                "columns": "<colgroup>{{#self.columns}}{{>col}}{{/self.columns}}</colgroup>", // TODO-HOY: acá hay que poner el tag columns
                "table": "<table {{>table_attr}}>{{>columns}}{{>body}}</table>",
                "main": "<div>{{>table}}</div>"
            }
        },
        "constructor": jwk.ui.list.TableList,
        "extends": jwk.ui.list.List
    });
    
    
    // Table ----------------------------------------------------------------------------------
    jwk.ui.list.Table = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        def = jwk.extend(true, {}, def, settings);
        if (typeof settings.table_attr == "string") {
            def.template.table_attr = settings.table_attr;
        }
        if (def.fields && !def.labels) {
            def.labels = def.fields;
        }
        if (def.labels && !def.fields) {
            def.fields = def.labels;
        }
        
        jwk.ui.list.List.call(this, def);
        
        if (!this.columns) {
            this.columns = this.labels.map(function (n) { return ""; });
        }
        
        console.assert(Array.isArray(this.value), this.value);        
        function clean_copy_to_rows() {    
            this._rows = this.value.map(function (obj, index) {                
                return obj;
            });
        }
        clean_copy_to_rows.call(this);
        // cada vez que me actualizan el value hago una copia limpia a _rows
        this.on("change:value", clean_copy_to_rows, this);
        
        this._fields_priority = this.fields.map(function (n) {
            return {field:n, order:"asc"};
        });
        
        this.selection = settings.selection || [];
        this._selected_rows = [];
        
        
        
        // Assertions
        console.assert(Array.isArray(this.labels),
                       "ERROR: labels must be an Array of strings but got",
                       typeof this.labels, [this.labels, arguments] );
        console.assert(Array.isArray(this.fields),
                       "ERROR: fields must be an Array of strings but got",
                       typeof this.fields, [this.fields, arguments] );
        console.assert(this.fields.length == this.labels.length,
                       "ERROR: fields and labels must be same size but they are: ",
                       this.fields.length, this.labels.length, [this, this.settings, arguments]);

        this.on("render_start", function (n,e) {
            // console.log("cancelado el reestructurado");
            // e.component.restructure();  
        }, this);
        
    }
    
    jwk.ui.component({
        "ui_type": "table",
        "namespace": "jwk-ui",
        "api": {
            "sortData": function() {
                var self = this;
                function compare(a, b) {                    
                    for (var i in self._fields_priority) {
                        var field = self._fields_priority[i].field;
                        var order = self._fields_priority[i].order == "asc" ? 1 : -1;
                        console.assert(typeof a[field] in {"number":1, "string":1}, "ERROR: type comparison nos implemented for ", typeof a[field]);
                        console.assert(typeof a[field] == typeof b[field], "ERROR: type missmatch:", typeof a[field], typeof b[field]);
                        var compare = 0;
                        if (typeof a[field] == "string") {
                            compare = a[field].localeCompare(b[field]);
                        } else {
                            if (a[field] < b[field]) return -1 * order;
                            if (a[field] > b[field]) return 1 * order;
                        }
                        if (compare == 0) continue; // intentemos desempatar con otro field de menos prioridad.
                        return compare * order;
                    }
                    return 0;
                }
                console.log("Antes", this._rows);
                this._rows.sort(compare);
                console.log("Después", this._rows);
                console.log("----> va pelota");

                this._selected_rows.length = 0;
                for (var i in this.selection) {
                    var real_index = this.selection[i];
                    var object = this.value[real_index];
                    var new_index = this._rows.indexOf(object);
                    this._selected_rows.push(new_index);
                }                
                
                this.trigger_fast("change:_rows", {value: this._rows, target: this, path:"_rows"});
            },
            "parent_for": function (name, index) {
                switch (name) {
                    case "structure": return { parent: this };
                    default:
                        return { parent: this.search("tab_content") };
                }
            },    
            "structure_tree": function () {
                var table = this;                
                
                this.one("change:structure", function (n,e) {
                    var structure = e.value;
                    
                    // tero sobre los splitters y me anoto como listener
                    structure.on("render", function () {                        
                        for (var i=0; i<table.fields.length; i++) {
                            var name = "btn_" + table.fields[i];
                            structure.search(name).on("click", function (n,e) {                                
                                var field = e.component.field;
                                var order = e.component.value;
                                console.log(field, order);
                                var index = 0;
                                for (var i in table._fields_priority) {
                                    if (table._fields_priority[i].field == field) {
                                        index = i;
                                    }
                                }
                                table._fields_priority.splice(index, 1);
                                table._fields_priority.unshift({field:field, order:order});
                                table.sortData();
                            });
                            /*
                            structure.search(name).on("selected", function (n,e) {                                
                                console.log("OPA!! empezó a funcionar eso?", arguments);
                            });
                            structure.search(name).controllers.selectable.on("select", function (n,e) {
                                // e.controller.component
                                var value = e.controller.component.value;
                                console.log(value);
                                var index = table._fields_priority.indexOf(value);
                                table._fields_priority.splice(index, 1);
                                table._fields_priority.unshift(value);
                                table.sortData();
                            })*/                            
                        }
                        structure.search("table_content").on("click:entry", function (n,e) {
                            console.log(arguments);
                            table.trigger_fast(n,e);
                        });
                        structure.search("table_content").on("selection", function (n,e) {
                            console.log(arguments);
                            table.selection.length = 0;
                            for (var i in e.selection) {
                                var local_index = e.selection[i];
                                var object = table._rows[local_index];
                                var real_index = table.value.indexOf(object);
                                table.selection.push(real_index);
                            }
                            e.selection = table.selection;
                            e.index = table.selection[0];
                            table.trigger_fast(n,e);
                        });
                        structure.search("row_0").get("children").each(function (comp) {                        
                            if (comp.ui_type == "panel.row-splitter") {
                                comp.on("resize:width", function (n, e) {                                    
                                    var index = this.parent.children.indexOf(this);
                                    index = (index-1) / 2;                                    
                                    console.assert(index>=0, index, this.parent.children, this);
                                    table.columns[index] = (e.value + this.target.width()) + "px";
                                    table.trigger("change:columns", {value:table.columns, index:index});
                                    // console.log(e.value, e.percent, e.total, e.units);
                                    // con los datos de este evento hay que resizear la columna correspondiente de la table_content
                                }, comp);
                                console.assert(comp.controllers && comp.controllers.draggable, comp);
                                comp.controllers.draggable.move({x:0, y:0});
                            }                    
                        });
                    });                    
                });
                
                
                var structure = {          
                    "ui_type": "panel.layout",
                    "class": "expand",
                    "name": "structure",
                    "start": "col",                    
                    "children": {
                        "body": {
                            "class": "expand",
                            "ui_type": "panel.scroll",
                            "children": {
                                "table_content": {                                    
                                    "ui_type": "tablelist",
                                    "class": "expand",
                                    "selectable": {
                                        "applyTo": "group",
                                        "group": "tr",
                                        "allowMultiple": !!table.allowMultiple,
                                        "zIndex": false
                                    },
                                    "selection": "<<owner._selected_rows>>",
                                    "value": "<<owner._rows>>",
                                    "columns": "<<owner.columns>>",
                                    "labels": "<<owner.labels>>",
                                    "fields": "<<owner.fields>>",
                                }
                            }
                        },
                        "footer": {
                            "ui_type": "panel.emboss",
                            "class": "expand"
                        }
                    }
                }
                
                var headers = [];

                var group = "t-header-" + Math.random();
                for (var i=0; i<this.fields.length; i++) {
                    var name = "btn_" + this.fields[i];
                    structure.children[name] = {
                        "ui_type": "button.cycle",
                        "states": ["desc", "asc"],
                        "field": this.fields[i],
                        /*"selectable": {
                            "group": group,
                            // "context": this.target,
                            "zIndex": false,
                        },*/
                        "text": this.labels[i]
                    }
                    headers.push(name);
                    headers.push("|%");
                }
                headers.pop();
                
                structure.layout = [headers,"body","footer"];
                
                return structure;
            },
            
            compile_row: function () {
                aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa();
                var table = this;
                return function (text, render) {
                    var index = table.value.indexOf(this);
                    var _class = (index % 2 == 0 ? "even" : "odd");
                    for (var i in table.selection) {
                        if (table.selection[i] == index) {
                            _class += " selected"; // TODO: hay que obtener este "selected" de la clase
                        }
                    }
                    result = "<tr signal='row' row='"+index+"' class='"+ _class +"'>";                    
                    for (var i in table._rows) {
                        var prop = table._rows[i];
                        var value = this[prop];
                        var compiled = "<span prop='"+prop+"'>" + value + "<span>";
                        if (table.settings.template[prop]) {
                            console.error("ERROR: not implemented");
                        }
                        result += "<td cell='"+prop+"'>" + compiled + "</td>";
                    }
                    result += "</tr>";
                    return result;
                };
            }
        },
        "defaults": {
            "disable_selection": true,
            "ui_type": "table",
            "namespace": "jwk-ui",            
            "template": {
                "main": "<div></div>"
            }
        },
        "constructor": jwk.ui.list.Table,
        "extends": jwk.ui.list.List
    });
        
    // Combobox ----------------------------------------------------------------------------------
    jwk.ui.list.Combobox = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        jwk.ui.list.List.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        "ui_type": "list.combobox",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.list.Combobox,
        "extends": jwk.ui.list.List
    }); 
    
    
    return;    
    

    
});