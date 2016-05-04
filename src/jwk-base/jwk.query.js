// jwk.query ------------------------------------------------------

define("jwk-base/jwk.query", [
    "jwk-base/jwk.core"
], function(jwk) {
    
    // treequery --
    jwk.query = jwk.treequery;
    jwk.html = jwk.query;    
    return jwk.query;
    
    
    
    return 
    var pushStack = jwk.thirdparty ? jwk.thirdparty.jquery.fn.pushStack : null;
    var return_empty = false; 
    if (jwk.thirdparty) jwk.thirdparty.jquery.fn.pushStack = function () {
        return_empty = true;
        return pushStack.apply(this, arguments);
    }
    
    jwk.query = function (selector, context, rootjQuery) {
// console.error("EN USO", arguments.callee.name);  
        if (return_empty && arguments.length == 0) {
            return_empty = false; 
            return new jwk.query();
        }
        if (!(this instanceof jwk.query)) {
            if (arguments.length == 0) {
                return new jwk.query();
            } else {
                return new jwk.query(selector, context, rootjQuery);
            }            
        }
        if (arguments.length == 0) {
            this.length = 0;
            return this; // jwk.query instance
        } else {
            var target = jwk.thirdparty.jquery(selector, context, rootjQuery);
            return target;
        }
    }
    
    
    jwk.query.prototype = jwk.thirdparty.jquery.fn;
    jwk.query.prototype.constructor = jwk.query;
    jwk.query.prototype.jquery = jwk.thirdparty.jquery;
    for (var i in jwk.thirdparty.jquery) {        
        jwk.query[i] = jwk.thirdparty.jquery[i];
    }
    
    
    // ------------------------ esto es provisorio ---------------------
    var ui = {
        which_browser: function() {
            try {
                if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0)
                    return "opera";
            } catch (e) {}
            try {
                if (typeof InstallTrigger !== 'undefined')
                    return "firefox";
            } catch (e) {}
            try {
                if (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0)
                    return "safari";
            } catch (e) {}
            try {
                if (!!window.chrome && !isOpera)
                    return "chrome";
            } catch (e) {}
            try {
                if (document.documentMode)
                    return "ie";
            } catch (e) {}        
        },        
        css: function (source) {  
console.error("EN USO", arguments.callee.name);            
            var browser = ui.which_browser();
            var css = {
                width:        source.width(),
                height:       source.height(),
                top:          source.css("top"),
                left:         source.css("left"),
                right:        source.css("right"),
                bottom:       source.css("bottom"),
                position:     source.css("position"),
                display:      source.css("display"),
                marginLeft:   source.css("margin-left"),
                marginRight:  source.css("margin-right"),
                marginTop:    source.css("margin-top"),
                marginBottom: source.css("margin-bottom"),
                margin:       source.css("margin")
            }        


            var style = source[0].style;
            if (style instanceof CSSStyleDeclaration) {
                for (var i=0; i<style.length; i++) {
                    function camelize(str) {
                      return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
                        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
                        return index == 0 ? match.toLowerCase() : match.toUpperCase();
                      });
                    }                    
                    var name = camelize(style[i]); //.camelize(false);
                    css[name] = style[name];
                }
            }

            switch (browser) {
                case "firefox":
                    css.marginLeft   = style["marginLeft"];
                    css.marginRight  = style["marginRight"];
                    css.marginTop    = style["marginTop"];
                    css.marginBottom = style["marginBottom"];
                    css.left         = style["left"];
                    css.right        = style["right"];
                    css.top          = style["top"];
                    css.bottom       = style["bottom"];

                    css.left         = (css.left == "")         ? "auto" : css.left;
                    css.right        = (css.right == "")        ? "auto" : css.right;
                    css.top          = (css.top == "")          ? "auto" : css.top;
                    css.bottom       = (css.bottom == "")       ? "auto" : css.bottom;

                    var top          = (css.marginTop == "")    ? "0px" : css.marginTop;
                    var left         = (css.marginLeft == "")   ? "0px" : css.marginLeft;
                    var right        = (css.marginRight == "")  ? "0px" : css.marginRight;
                    var bottom       = (css.marginBottom == "") ? "0px" : css.marginBottom;
                    css.margin       = top + " " + right + " " + bottom + " " + left;
            }

            // TODO: tengo que arreglar el problema de que si es "" alguno me queda una separación de dos espacios seguidos cuando debería haber un 0px
            return css;
                
        }
    }
    
    
    jwk.query.prototype.css_snapshot = function () {
console.error("EN USO", arguments.callee.name);        
        // console.log("jwk.ui.snapshot", source);
        var source = this;
        var css = ui.css(this);
        var shot = { css: css};
        
        this.style();

        // -- Horizontal --
        if (css["right"] == "auto" || typeof css["right"] == "undefined") {
            // no tiene rihgt
            shot.horizontal = "left";
        } else  {
            // tiene rihgt
            if (css["left"] == "auto" || typeof css["left"] == "undefined") {
                // no tiene left pero tiene rihgt
                // - righ   
                shot.horizontal = "right";                        
            } else  {
                // tiene left y right
                if (css["width"] == "auto" || typeof css["width"] == "undefined") {
                    // no tiene width pero tiene left y right
                    // - left & right                
                    shot.horizontal = "both";                            
                } else  {
                    // tiene width, left y right
                    // - left, right & width                
                    shot.horizontal = "margin";                            
                }                          
            }                    
        }

        // -- Vertical --
        if (css["bottom"] == "auto" || typeof css["bottom"] == "undefined") {
            // no tiene bottom
            shot.vertical = "top";
        } else  {
            // tiene bottom
            if (css["top"] == "auto" || typeof css["top"] == "undefined") {
                // no tiene top pero tiene bottom
                // - bottom   
                shot.vertical = "bottom";                        
            } else  {
                // tiene top y bottom
                if (css["height"] == "auto" || typeof css["height"] == "undefined") {
                    // no tiene width pero tiene top y bottom
                    // - top & right                
                    shot.vertical = "both";
                } else  {
                    // tiene width, top y bottom
                    // - top, bottom & width                
                    shot.vertical = "margin";                            
                }                          
            }                    
        }  

        var prop;
        var side;

        side = "height";
        prop = "top";
        var mystyle = source[0].style;
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        prop = "bottom";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }                
        side = "width";
        prop = "left";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        prop = "right";
        if (typeof mystyle[prop] == "string" && mystyle[prop].indexOf("%") > -1 ) {
            shot.css[prop] = mystyle[prop];
            shot.css[prop+"_percent"] = parseFloat(mystyle[prop]);
            shot.css[prop+"_k"] = 100.0 / source.parent()[side]();
        }
        // delete shot.css;
        return shot;
    }
    
    function getComputedStyle(o) {
        if (document.defaultView && document.defaultView.getComputedStyle) {
            return document.defaultView.getComputedStyle(o, "");
        } else if (oElm.currentStyle){
            console.error("a ver si esto funciona?");
            // strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){ return p1.toUpperCase(); });
            return o.currentStyle;
        }
    }
        
    document.old_height = document.height;
    document.height = function () {
        // http://stackoverflow.com/questions/1145850/how-to-get-height-of-entire-document-with-javascript
        var body = document.body,
            html = document.documentElement,
            height;        
        if (typeof document.old_height !== 'undefined') {
            height = document.old_height // For webkit browsers
        } else {
            height = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
        }       
        
        return height;
    }
    
    
    // -----------------------------------------------------------------
    
    jwk.query.prototype.style = function (options) {
console.error("EN USO", arguments.callee.name);        
        options = jwk.extend({}, options);
        var computed_style = getComputedStyle(this[0]);

        // Hallamos las diferencias con el estilo que tendría por defecto ese nodo
        // -------------------------------------------------------
        var own_style = [];
        iframe = jwk.thirdparty.jquery("<iframe id='temporal_aux_iframe' style='display:none'>").appendTo("body");
        
        var aux_body = iframe.contents().find("body");
        var aux = jwk.thirdparty.jquery("<" + this[0].nodeName + ">").appendTo(aux_body);        
        var default_style = getComputedStyle(aux[0]);
        for (var i=0; i<default_style.length; i++) {
            var prop = default_style[i];
            if (computed_style[prop] != default_style[prop]) {
                own_style.push(prop);
                own_style[prop] = computed_style[prop];
            }
        }        
        
        jwk.thirdparty.jquery("#temporal_aux_iframe").remove();
        return own_style;
    }
    // -----------------------------------------------------------------
    
    function getStyle(oElm, strCssRule) {
        console.log(arguments);
        var strValue = "";
        if (document.defaultView && document.defaultView.getComputedStyle){
            strValue = document.defaultView.getComputedStyle(oElm, "").getPropertyValue(strCssRule);
        }
        else if (oElm.currentStyle){
            strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){
                return p1.toUpperCase();
            });
            strValue = oElm.currentStyle[strCssRule];
        }
        return strValue;
    }    
    
    jwk.query.prototype.path = function () {
console.error("EN USO", arguments.callee.name);
        // http://stackoverflow.com/questions/2068272/getting-a-jquery-selector-for-an-element
        if (this.length != 1) throw 'Requires one element.';

        var path, node = this;
        while (node.length) {
            var realNode = node[0];
            var name = (

                // IE9 and non-IE
                realNode.localName ||

                // IE <= 8
                realNode.tagName ||
                realNode.nodeName

            );

            // on IE8, nodeName is '#document' at the top level, but we don't need that
            if (!name || name == '#document') break;

            name = name.toLowerCase();
            if (realNode.id) {
                // As soon as an id is found, there's no need to specify more.
                return name + '#' + realNode.id + (path ? ' > ' + path : '');
            } else if (realNode.className) {
                name += '.' + realNode.className.split(/\s+/).join('.');
            }

            var parent = node.parent(), siblings = parent.children(name);
            if (siblings.length > 1) name += ':eq(' + siblings.index(node) + ')';
            path = name + (path ? ' > ' + path : '');

            node = parent;
        }

        return path;
    }    
    
    jwk.query.prototype.id = function (value) {
console.error("EN USO", arguments.callee.name);
        if (arguments.length == 1) {            
            return this.attr("id", value.toString());
        } else {
            return this.attr("id");
        }
    }
    
    jwk.query.prototype.serialize = function () {
        return this.selector;
    }    
    
    
    
    jwk.html = jwk.query;
    
    return jwk.query;

});


