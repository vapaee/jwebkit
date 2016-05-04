define([
    "jwebkit",
    "jquery",
    "../jwk.ui.component",
], function(jwk, $, Component) {
  
    
    // jwk.ui.panel library namespace
    jwk.ui.panel = {}
    
    // Panel ----------------------------------------------------------------------------------
    jwk.ui.panel.Panel = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel").defaults();
        Component.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Panel,
        extends: Component,
        defaults: { template: { main: "<div></div>" } }
    });    

    
    // Placeholder --------------------------------------------------------------------------
    jwk.ui.panel.Placeholder = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.placeholder").defaults();        
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.placeholder",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Placeholder,
        extends: jwk.ui.panel.Panel,
        api: {
            parent_for: function (name, index) {
                return (this.parent || this.owner).parent_for(name, index);
            }
        },
        defaults: { ui_type: "panel.placeholder", template: { main: "" } },
    });
    
    
    // Form --------------------------------------------------------------------------
    jwk.ui.panel.Form = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.form").defaults();        
        jwk.ui.panel.Panel.call(this, jwk.extend(true, {}, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.form",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Form,
        extends: jwk.ui.panel.Panel,
        api: {
            parent_for: function (name, index) {
                return { parent:this, query: "form" };
            }
        },
        defaults: { ui_type: "panel.form", template: { main: "<div><form></form></div>" } },
    });
    
    
    // Image --------------------------------------------------------------------------
    jwk.ui.panel.Image = function (_settings) {
        if (!_settings) return;
        
        var def = jwk.ui.component("jwk-ui", "panel.image").defaults();
        var settings = jwk.extend(true, def, _settings);
        jwk.ui.panel.Panel.call(this, settings);
        
        this.set("url", this.url);
        this.settings.template.url = this.url;
        
        this.on("render_start", function (n,e) {
            this.settings.template.url = this.url;            
        }, this);
        
        this.on("change:url", function (n,e) {
            this.settings.template.url = e.value;
            if (this.target) this.paint();
        }, this);
    }    
    
    jwk.ui.component({
        ui_type: "panel.image",
        namespace: "jwk-ui",
        defaults: {
            ui_type: "panel.image",
            template: {
                url: "http://www.example.com",
                main: "<div><img src='{{>url}}' style='border:0px;' /></div>"
            }
        },
        constructor: jwk.ui.panel.Image,
        extends: jwk.ui.panel.Panel
    });    
    
    // iFrame --------------------------------------------------------------------------
    jwk.ui.panel.iFrame = function (_settings) {
        if (!_settings) return;
        
        var def = jwk.ui.component("jwk-ui", "panel.iframe").defaults();
        var settings = jwk.extend(true, def, _settings);
        this.set("url", settings.url || settings.template.url);
        settings.template.url = this.get("url");
        jwk.ui.panel.Panel.call(this, settings);
        this.on("change:url", function (n,e) {
            this.settings.url = e.value;
            this.paint();
        }, this);
        
        if (jwk.global) {

            function on_iframe (n,e)  {
                if (e.popup) return;
                if (e.iframe[0] == this.target[0]) {                    
                    var id = e.global.replace("global", "iframe");
                    var proxy = jwk.global.proxy(id);
                    this.set("proxy", proxy);
                }
            }
            // el siguiente listener es on en vez de one porque sucede que la aplicación dentro de un iframe puede recargarse perdiendo la identidad y desconectándose del jwk.net
            // La solución es esperar a que se cargue de vuelta y se conecte otra vez.
            // Es por eso que se usa on() en vez de one().            
            jwk.global.on("iframe", on_iframe, this);   
        } else {
            console.error("no existe global");
            alert("no existe global");
        }

    }    
    
    jwk.ui.component({
        ui_type: "panel.iframe",
        namespace: "jwk-ui",
        defaults: {
            ui_type: "panel.iframe",
            template: {
                url: "http://www.example.com",
                main: "<iframe src='{{>url}}' style='border:0px;width:100%;height:100%'></iframe>"
            }
        },
        constructor: jwk.ui.panel.iFrame,
        extends: jwk.ui.panel.Panel
    });
    
    
    // Emboss --------------------------------------------------------------------------
    jwk.ui.panel.Emboss = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.emboss").defaults();
        sett = jwk.extend(def, settings);        
        this.set("row_1.cells", [{"class":"left top corner", "img": true},    {"class":"middle top side", "img": true},    {"class":"right top corner", "img": true}], {deep: true, parse: true});
        this.set("row_2.cells", [{"class":"left center side", "img": true},   {"class":"container center"},                {"class":"right center side", "img": true}], {deep: true, parse: true});
        this.set("row_3.cells", [{"class":"left bottom corner", "img": true}, {"class":"middle bottom side", "img": true}, {"class":"right bottom corner", "img": true}], {deep: true, parse: true});
        jwk.ui.panel.Panel.call(this, sett);
    }
    
    jwk.ui.component({
        ui_type: "panel.emboss",
        namespace: "jwk-ui",
        defaults: {
            ui_type: "panel.emboss",
            namespace: "jwk-ui",
            template: {
                cell: "<td class='{{class}}' owner='{{self.name}}'>{{#img}} <img style='visibility: hidden;' src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' />{{/img}}</td>",
                cellection: "{{#toArray}}{{>cell}}{{/toArray}}",
                row: "<tr>{{#cells}}{{>cellection}}{{/cells}}</tr>",
                empty: "<tr>{{>cell}}{{>cell}}{{>cell}}</tr>",
                rows: "<tbody>{{#row_1}}{{>row}}{{/row_1}}{{#row_2}}{{>row}}{{/row_2}}{{#row_3}}{{>row}}{{/row_3}}</tbody>",
                main: "<div><table style='width: 100%; height: 100%;' cellpadding='0' cellspacing='0'>{{#self}}{{>rows}}{{/self}}</table></div>",                
            },            
        },
        api: { parent_for: function (name, index) { return {parent:this, query: ".container"}; }},
        constructor: jwk.ui.panel.Emboss,
        extends: jwk.ui.panel.Panel
    });
  
    jwk.ui.component({
        ui_type: "panel.inset",
        namespace: "jwk-ui",        
        constructor: jwk.ui.panel.Emboss,        
    });
     
    /*
    // RowSplitter --------------------------------------------------------------------------
    jwk.ui.panel.RowSplitter = function (settings) {        
        if (!settings) return;
        var def = jwk.ui.component("panel.row-splitter", "jwk-gui").defaults();
        var sett = jwk.extend(def, settings);        
        
        sett.draggable.axis = sett.axis;
        jwk.ui.panel.Panel.call(this, sett);
        this.one("render", function (name, event) {
            event.component.controllers.draggable.on("start", function (name, event) {
                var cell_resizer = $(event.target).closest("td[cell]");
                if (this.side == "width") {
                    cell_target = cell_resizer.prev();
                } else {
                    cell_target = cell_resizer.parent().prev().find("[cell]").eq(0);
                }
                event.helper.css("display", "none");
                this._init = {
                    prop: cell_target[this.side](),
                    parent_prop: cell_target.parent()[this.side](),
                    offset: cell_target.offset(),
                    cell_target: cell_target
                }
                this._init.width_percent = this._init.prop / this._init.parent_prop;
            }, event.component);            
            event.component.controllers.draggable.on("drag", function (name, event) {
                var dif = this._init.cell_target.offset()[this.which] - this._init.offset[this.which];
                var prop = this._init.prop + event.motion[this.axis] - dif;
                if (this.side == "height") {
                    this.use = "px"; // no vertical percent support
                }                
                switch (this.use) {
                    case "px":
                        this._init.cell_target[this.side](prop);                        
                        break;
                    case "%":                    
                        var percent = (100 * prop / this._init.parent_prop) + "%";
                        this._init.cell_target.css(this.side, percent);
                        break;
                    default:
                        console.log("not implemented", this.use);
                        this._init.cell_target[this.side](prop);   
                        break;
                }
                
            }, event.component);
        });
    }
    
    //jwk.ui.panel.RowSplitter.prototype = new jwk.ui.panel.Panel();
    //jwk.ui.panel.RowSplitter.prototype.constructor = jwk.ui.panel.RowSplitter;
    
    jwk.ui.component({
        ui_type: "panel.row-splitter",
        namespace: "jwk-gui",
        defaults: {
            class: "splitter",
            ui_type: "panel.row-splitter",
            namespace: "jwk-gui",
            name: "gustavo",
            use: "px",
            side: "width",
            which: "left",
            axis: "x",
            draggable: {
                disable_selection: true,
                iFrameFix: true,
                cursorDragging: "ew-resize",
                cursorOver: "ew-resize",
                helper: "clone",
                round: true,
                axis: "x"
            },            
            template: {
                main: "<div></div>",
            },            
        },
        constructor: jwk.ui.panel.RowSplitter,
        extends: jwk.ui.panel.Panel
    });
    
    // ColSplitter --------------------------------------------------------------------------
    jwk.ui.panel.ColSplitter = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        var sett = jwk.extend(def, settings);        
        jwk.ui.panel.RowSplitter.call(this, sett);
    }
    
    //jwk.ui.panel.ColSplitter.prototype = new jwk.ui.panel.RowSplitter();
    //jwk.ui.panel.ColSplitter.prototype.constructor = jwk.ui.panel.ColSplitter;    
    jwk.ui.component({
        ui_type: "panel.col-splitter",
        namespace: "jwk-gui",        
        constructor: jwk.ui.panel.ColSplitter,
        extends: jwk.ui.panel.RowSplitter,
        defaults: {
            ui_type: "panel.col-splitter",            
            side: "height",
            which: "top",
            axis: "y",
            draggable: {
                cursorDragging: "ns-resize",
                cursorOver: "ns-resize",
            },
            template: {
                main: "<div></div>",
            }                           
        }
    });    
    */
    
    jwk.ui.panel.Splitter = function (settings) {        
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();
        var sett = jwk.extend(true, def, settings);        
        sett.class = (sett.class ? sett.class + " " : "") + "splitter";
        sett.draggable.axis = sett.axis;
        jwk.ui.panel.Panel.call(this, sett);
        
        jwk.ui.window.on("resize", function (eventname, event) {
            // console.log("this.controllers.draggable.move", [this, this.target]);            
            var cell_resizer = this.target.closest("td[cell]");
            if (this.side == "width") {
                cell_target = cell_resizer.prev();
            } else {
                cell_target = cell_resizer.parent().prev().find("[cell]").eq(0);
            }
            var value = cell_target[this.side]();
            var parent_value =  cell_target.parent()[this.side]();
            var percent = value / parent_value;
            this.trigger("resize:"+this.side, {value:value, percent:percent, total: parent_value, "units":this.use});            
            // this.controllers.draggable.move({x:0,y:0});
        }, this, {lazy:true});
        
        this.one("render", function (name, event) {
            event.component.controllers.draggable.on("start", function (name, event) {
                var cell_resizer = $(event.target).closest("td[cell]");
                if (this.side == "width") {
                    cell_target = cell_resizer.prev();
                } else {
                    cell_target = cell_resizer.parent().prev().find("[cell]").eq(0);
                }
                event.helper.css("display", "none");
                this._init = {
                    prop: cell_target[this.side](),
                    parent_prop: cell_target.parent()[this.side](),
                    offset: cell_target.offset(),
                    cell_target: cell_target
                }
                this._init.width_percent = this._init.prop / this._init.parent_prop;
            }, event.component);            
            event.component.controllers.draggable.on("drag", function (name, event) {
                var dif = this._init.cell_target.offset()[this.which] - this._init.offset[this.which];
                var value = this._init.prop + event.motion[this.axis] - dif;
                if (this.side == "height") {
                    this.use = "px"; // no vertical percent support
                }       
                var percent =  (100 * value / this._init.parent_prop);
                switch (this.use) {
                    case "px":
                        this._init.cell_target[this.side](value);                        
                        break;
                    case "%":                        
                        this._init.cell_target.css(this.side, percent + "%");
                        break;
                    default:
                        console.log("not implemented", this.use);
                        this._init.cell_target[this.side](value);   
                        break;
                }                
                this.trigger("resize:"+this.side, {value:value, percent:percent, total: this._init.parent_prop, "units":this.use});
                
            }, event.component);
        });
    }
    
    jwk.ui.component({
        ui_type: "panel.row-splitter",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Splitter,
        defaults: {            
            ui_type: "panel.row-splitter",
            name: "gustavo",
            use: "px",
            side: "width",
            which: "left",
            axis: "x",
            draggable: {
                disable_selection: true,
                iFrameFix: true,
                helper: "clone",
                round: true,
                axis: "x",
                cursorDragging: "ew-resize",
                cursorOver: "ew-resize",
            },            
            template: {
                main: "<div></div>",
            },            
        },
        extends: jwk.ui.panel.Panel
    });
    
    jwk.ui.component({
        ui_type: "panel.col-splitter",
        namespace: "jwk-ui",        
        constructor: jwk.ui.panel.Splitter,
        defaults: {
            ui_type: "panel.col-splitter",            
            side: "height",
            which: "top",
            axis: "y",
            draggable: {
                disable_selection: true,
                iFrameFix: true,
                helper: "clone",
                round: true,
                axis: "y",                
                cursorDragging: "ns-resize",
                cursorOver: "ns-resize"
            },
            template: {
                main: "<div></div>",
            }
        }
    });     
        
    
    /*
    // Line: Col & Row (DIV version) --------------------------------------------------------------------------
    jwk.ui.panel.Line = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component(settings.namespace, settings.ui_type).defaults();        
        def.data = this;
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    //jwk.ui.panel.Line.prototype = new jwk.ui.panel.Panel();
    //jwk.ui.panel.Line.prototype.constructor = jwk.ui.panel.Line;
        
    jwk.ui.component({
        ui_type: "panel.col",
        namespace: "jwk-gui",
        defaults: {
            template: {
                empty: "<div></div>",
                entry: "<div child_type=\"{{ui_type}}\" cell=\"{{name}}\" child=\"{{name}}\"></div>",
                children: "{{#values}}{{>entry}}{{/values}}",
                self: "{{#children}}{{>children}}{{/children}}{{^children}}{{>empty}}{{/children}}",                
                main: "<div>{{#self}}{{>self}}{{/self}}</div>",
            },            
        },
        constructor: jwk.ui.panel.Line,
        extends: jwk.ui.panel.Panel
    });
    
    
    
    jwk.ui.component({
        ui_type: "panel.row",
        namespace: "jwk-gui",
        // defaults: jwk.ui.component("jwk-gui", "panel.col").defaults(),
        defaults: {
            template: {
                empty: "<div></div>",
                entry: "<div child_type=\"{{ui_type}}\" cell=\"{{name}}\" child=\"{{name}}\"></div>",
                children: "{{#values}}{{>entry}}{{/values}}",
                self: "{{#children}}{{>children}}{{/children}}{{^children}}{{>empty}}{{/children}}",                
                main: "<div>{{#self}}{{>self}}{{/self}}</div>",
            },            
        },        
        constructor: jwk.ui.panel.Line        
    });
    */
    
    
    
    // Row --------------------------------------------------------------------------
    jwk.ui.panel.Row = function (settings) {
        if (!settings) return;
        var def = {
            data: this,
            template: {
                empty: "<td><div></div></td>",
                entry: "<td child_type=\"{{ui_type}}\" cell=\"{{name}}\"><div child=\"{{name}}\"></div></td>",
                children: "{{#values}}{{>entry}}{{/values}}",                
                self: "{{#children}}{{>children}}{{/children}}{{^children}}{{>empty}}{{/children}}",
                main: "<table cellpadding='0' cellspacing='0'><tr>{{#self}}{{>self}}{{/self}}</tr></table>"                
            },            
        };
        jwk.ui.panel.Panel.call(this, jwk.extend(def, settings));
        //jwk.ui.panel.Panel.call(this, settings);
    }
    
    jwk.ui.panel.Row.prototype = new jwk.ui.panel.Panel();
    jwk.ui.panel.Row.prototype.constructor = jwk.ui.panel.Row;

    jwk.ui.component({
        ui_type: "panel.row",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Row
    });    
    
    // Col --------------------------------------------------------------------------
    jwk.ui.panel.Col = function (settings) {
        if (!settings) return;
        var def = {
            data: this,
            template: {
                empty: "<tr><td><div></div></td></tr>",
                entry: "<tr><td child_type=\"{{ui_type}}\" cell=\"{{name}}\"><div child=\"{{name}}\"></div></td></tr>",
                children: "{{#values}}{{>entry}}{{/values}}",
                self: "{{#children}}{{>children}}{{/children}}{{^children}}{{>empty}}{{/children}}",                
                main: "<table cellpadding='0' cellspacing='0'>{{#self}}{{>self}}{{/self}}</table>",               
            },            
        };
        jwk.ui.panel.Panel.call(this, jwk.extend(def, settings));
        
    }
    
    jwk.ui.panel.Col.prototype = new jwk.ui.panel.Panel();
    jwk.ui.panel.Col.prototype.constructor = jwk.ui.panel.Col;

    jwk.ui.component({
        ui_type: "panel.col",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Col
    });
    
    // http://jsfiddle.net/GgZm7/10/
    // Layout --------------------------------------------------------------------------
    jwk.ui.panel.Panel.Layout = function (settings) {
        if (!settings) return;
        var def = {
            datapath: "self:layout",
        };
        settings = jwk.extend(def, settings);
        // settings.class = (settings.class ? settings.class + " " : "") + "flat";
        jwk.ui.panel.Panel.call(this, settings);
        this.set("layout", this.layout, {no_parse: true});
        // console.log("---------------->", this.get("layout"));
        this.on("render_start", function (n,e) {            
            this.set("layout", this.layout, {no_parse: true});
            e.component.restructure();  
        }, this);
    }
    
    jwk.ui.panel.Panel.Layout.prototype = new jwk.ui.panel.Panel();
    jwk.ui.panel.Panel.Layout.prototype.constructor = jwk.ui.panel.Panel.Layout;

    jwk.ui.panel.Panel.Layout.prototype.structure_tree = function () {
        var layout = this.my_data();
        console.assert(layout, "ERROR: missing layout parameter.", [this], "settings: ", this.settings.layout, "data: ", [this.settings.data]);
        
        function recursiva (array, is_row) {
            var ret = {children:{}};
            if (array instanceof jwk.Collection) {
                array = array.toArray();
            }
            
            if (Array.isArray(array)) {
                ret.class = "expand";
                ret.ui_type = "panel." + (is_row?"row":"col");
                for (var i in array) {
                    // if (typeof array[i] == "string") continue; // no agrego los nodos que son mis hijos                    
                    var name = typeof array[i] == "string" ? array[i] : (!is_row?"row_":"col_")+i;                    
                    var child = recursiva.call(this, array[i], !is_row);
                    if (child.name) { name = child.name };
                    ret.children[name] = child;
                }
            } else if (typeof array == "string") {
                if (array.indexOf("|") == 0) {
                    ret = {
                        ui_type: is_row ? "panel.col-splitter" : "panel.row-splitter",
                        name: "splitter-"+jwk.nextId(),
                        class: "flat"
                    };
                    if (array.indexOf("%") > 0) ret.use = "%";
                } else {
                    ret = this.settings.children[array];                
                    console.assert(ret, "ERROR: layout referes to an unexisting child called "+ array);            
                    ret = {ui_type: "panel.placeholder"};
                }
            }
            return ret;
        }
        
        var structure = recursiva.call(this, layout, this.settings["start"] != "col");        
        structure.layout = layout;
        structure.namespace = this.settings.namespace;
        structure.name = (this.settings["start"] ? this.settings["start"] : "col")+ "_0";
        // console.log(structure);
        return structure;
    }

    jwk.ui.panel.Panel.Layout.prototype.parent_for = function (name, index) {
        if (name == "col_0") return {parent:this};
        if (name == "row_0") return {parent:this};        
        var obj = {parent: this.get("structure"), query:"[child="+name+"]"};        
        if (this.render.resolve_target(obj, true)) {
            return obj;
        }
        return {parent:{target:$("")}};
    }

    jwk.ui.component({
        ui_type: "panel.layout",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Panel.Layout
    });    
    
    
    // Layout --------------------------------------------------------------------------
    jwk.ui.panel.Panel.Table = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.table").defaults();
        settings = jwk.extend(def, settings);
        jwk.ui.panel.Panel.call(this, settings);
        var table = this;
        this.on("render_start", function (n,e) {
            var fila = -1;
            var col = 0;
            this.rows = [];
            console.assert(typeof this.cols == "number", "ERROR: you must specify how many columns should have the table");
            var children = this.children.valueOf();
            this.children.each(function (obj, name, index) {
                col++;
                if ((index*1) % table.cols == 0) {
                    fila++;
                    col = 0;
                }
                table.rows[fila] = table.rows[fila] || [];
                table.rows[fila].push({name:name, col:col});            
            });
        }, this);
        
    }
    
    jwk.ui.panel.Panel.Table.prototype = new jwk.ui.panel.Panel();
    jwk.ui.panel.Panel.Table.prototype.constructor = jwk.ui.panel.Panel.Table;

    jwk.ui.panel.Panel.Table.prototype.parent_for = function (name, index) {
        if (name == "col_0") return {parent:this};
        if (name == "row_0") return {parent:this};
        var obj = {parent:this.get("structure"), query:"[child="+name+"]"};        
        if (this.render.resolve_target(obj, true)) {
            return obj;
        }
        return {parent:{target:$("")}};
    }

    jwk.ui.component({        
        ui_type: "panel.table",
        namespace: "jwk-ui",
        api: {
            parent_for: function (name, index) {
                var obj = {parent:this, query:"[child="+name+"]"};
                if (this.render.resolve_target(obj, true)) {
                    return obj;
                }
                return {parent:{target:$("")}};
            }
        },
        defaults: {
            cols: 2,
            template: {
                cell: "<td child='{{name}}' col='{{col}}'></td>",
                rows: "<tr>{{#.}}{{>cell}}{{/.}}</tr>",
                main: "<table>{{#self.rows}}{{>rows}}{{/self.rows}}</table>"
            }
        },
        constructor: jwk.ui.panel.Panel.Table
    });    
    
    
    // Splitter --------------------------------------------------------------------------
    jwk.ui.panel.Splitter = function (settings) {
        if (!settings) return;
        var def = { ui_type: "panel.splitter" };
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.splitter",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Splitter,
        extends: jwk.ui.panel.Panel
    });
    
    // Scroll --------------------------------------------------------------------------
    jwk.ui.panel.Scroll = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.scroll").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.scroll",
        namespace: "jwk-ui",
        api: {
            parent_for: function (name, index) {
                return {parent: this, query: ".content"};
            }
        },
        defaults: {
            template: {
                main: "<div><div class='content' component='panel.scroll'></div></div>",
            }
        },        
        constructor: jwk.ui.panel.Scroll,
        extends: jwk.ui.panel.Panel
    });    
    
    // Tabs --------------------------------------------------------------------------
    jwk.ui.panel.Tabs = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.tabs").defaults();
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
        
        var children = new jwk.Node();
        this.set("children",children);
        
        // this.on("all", function () { console.log("--------------", arguments); })
        
        function update_tab_buttons (n, e) {
            if (e.path.indexOf(".") != -1) return this; // No cambiaron los hijos sino una propiedad de uno de ellos. 
            // console.log("update_tab_buttons", arguments)
            var tabs = this;
            var buttons = this.search("tab_buttons");
            console.log(buttons);
            var content = this.search("tab_content");
            if (buttons) {
                buttons.drop_children();
                this.get("children").each(function (child){
                    var extra = {};
                    if (typeof child.tab == "string") {
                        extra.text = child.tab;
                    }
                    if (typeof child.tab == "object") {
                        extra = child.tab;
                    }                
                    var settings = jwk.extend({}, {
                        "parent": buttons,
                        "class": "emboss",
                        "name": child.name + "_btn",
                    }, tabs.tab_button, extra);

                    var btn = jwk.ui.create_component(
                        settings
                    );

                    if (child.selected) {
                        btn.autoselect = true;
                    }

                    btn.on("feature:selectable", function () {
                        this.controllers.selectable.on("select", function (n, e) {                      
                            var name = e.controller.component.name;
                            name = name.substring(0, name.length-4);                    
                            tabs.get("children").each(function (child) {                            
                                child.set("visible", false);
                            });
                            tabs.search(name).set("visible", true);
                        });
                        /*
                        if (child.selected) {                        
                            btn.one("render", function () {
                                this.select();
                            }, btn);
                        }
                        */
                    }, btn);
                });

                this.one("render", function () {
                    console.log(this);
                    this.get("children").each(function (child) {
                        if (child.autoselect) {
                            delete child.autoselect;
                            console.log("child.select()", [child]);
                            child.select();
                        }
                    });
                }, buttons);
            }
        }        
        
        children.on("change", update_tab_buttons, this);
        this.on("change:structure", update_tab_buttons, this);
        
    }
    
    jwk.ui.component({
        "ui_type": "panel.tabs",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.panel.Tabs,
        "extends": jwk.ui.panel.Panel,
        "defaults": function () {
            return {
                "tab_button": {
                    "ui_type": "button.option",
                    "namespace": this.namespace, 
                },                
                "horizontal": false,
                "layout": ["tab_buttons", "tab_content"]
            };
        },
        "api": {
            "add_tab": function () {
            },
            "parent_for": function (name, index) {
                switch (name) {
                    case "structure": return { parent: this };
                    default:
                        return { parent: this.search("tab_content") };
                }
            },            
            "structure_tree": function () {
                var structure = {
                    "ui_type": "panel.layout",
                    "class": "expand",
                    "name": "structure",
                    "start": this.settings.horizontal ? "row" : "col",
                    "layout": this.settings.layout,
                    "children": {
                        "tab_buttons": {
                            "ui_type": "panel",
                            "class": "flat background expand"
                        },
                        "tab_content": {
                            "ui_type": "panel",
                            "class": "flat expand"
                        }
                    }
                }
                return structure;
            }
        }
    });
        
    // Sections --------------------------------------------------------------------------
    jwk.ui.panel.Sections = function (settings) {
        if (!settings) return;
        var def = jwk.ui.component("jwk-ui", "panel.sections").defaults();
        jwk.ui.panel.Tabs.call(this, jwk.extend(true, def, settings));
        
        this.on("change:value", function (n,e) {
            this.section(e.value);
        }, this);
    }
    
    jwk.ui.component({
        "ui_type": "panel.sections",
        "namespace": "jwk-ui",
        "constructor": jwk.ui.panel.Sections,
        "extends": jwk.ui.panel.Tabs,
        "defaults": function () {
            return {
                "tab_button": {
                    "ui_type": "button.option",
                    "namespace": this.namespace, 
                },                
                "horizontal": false,
                "layout": ["tab_buttons", "tab_content"]
            };
        },
        "api": {
            "setTabsContainer": function (parent) {
                console.assert(typeof parent.drop_children == "function", parent);
                // tab__buttons está dentro de la estructura. Por eso hay que buscarla con search.
                this.search("tab_buttons").drop_children();
                // La nueva this.tab_button es para sobreescribir la anterior y que se empiece z usar esa en vez de la otra.
                this.set("tab_buttons", parent);
                // Forzamos a que se actualice la estructura
                this.children.trigger_fast("change", {"path": "_this_it_to_force_update_tabs_"});
                // Forzamos a que se actualice la interfaz
                parent.paint();
            },
            "section": function (sec) {
                var btn = this.search("tab_buttons").search(sec + "_btn");
                console.assert(btn, "ERROR: jwk-ui.panel.section.section(sec) child not found: ", sec, " children: ", this.children);
                btn.select();
            },
            "_update_update_value": function (event, prop) {
                this[prop] = event.value;
                return this;
            },
            "_update_restructure": function () { return this; },
        }
    });
    
    
    
    
    
    
    // Accordion --------------------------------------------------------------------------
    jwk.ui.panel.Formlayout = function (settings) {
        if (!settings) return;
        var def = { ui_type: "panel.formlayout" };
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.formlayout",
        namespace: "jwk-ui",
        defaults: function () {
            return {
                template: {
                    child: "<tr><td class='label'><span>{{label}}</span></td><td cell='{{name}}'></td></tr>",
                    row: "{{#self.children}}{{>child}}{{/self.children}}",
                    main: "<div><table>{{>row}}</table></div>"
                }
            }
        },
        api: {
            parent_for: function (name, index) {
                return {parent: this, query:"[cell="+name+"]"}
            }
        },
        constructor: jwk.ui.panel.Formlayout,
        extends: jwk.ui.panel.Panel
    });    
    
    
    
    // Accordion --------------------------------------------------------------------------
    jwk.ui.panel.Accordion = function (settings) {
        if (!settings) return;
        var def = { ui_type: "panel.accordion" };
        jwk.ui.panel.Panel.call(this, jwk.extend(true, def, settings));
    }
    
    jwk.ui.component({
        ui_type: "panel.accordion",
        namespace: "jwk-ui",
        constructor: jwk.ui.panel.Accordion,
        extends: jwk.ui.panel.Panel
    });    
    
    return jwk.ui.panel.Panel;
});