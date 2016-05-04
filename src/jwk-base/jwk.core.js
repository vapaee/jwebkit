define("jwk-base/jwk.core", [
    /*
    "inner_jquery", 
    /*/
    "treequery",
    //*/
    //"less", 
    "Async",
    "base64",
    "md5", // crypto-js
    "sha1", // crypto-js
    "sha256", // crypto-js
], function(treequery, /*less,*/ Async, base64, crypto) {
    
    var warn_obsolete = true;
    // console.log("jwk.core", arguments);
    
    // Array.isArray PollyFill
    if (!Array.isArray) {
        Array.isArray = function (vArg) {
            return Object.prototype.toString.call(vArg) === "[object Array]";
        };
    }    
    
    var jwk_current_id_ = 0;
    var Fn = Function, g = (new Fn("return this"))();            
    function JWK () {
        this.nextId = function () {
            return jwk_current_id_++;
        }
        this.uniqueId = function () {
            return (new Date()).getTime() +"-"+Math.round(Math.random()*1000);
        }
        this.unique_id = function () {
            if (warn_obsolete) console.warn("jwk.unique_id OBSOLETE");
            return this.uniqueId();
        }
        
    }
    var jwk = g.jwk || new JWK();
    
    jwk.treequery = treequery;
    // jwk.thirdparty = {jquery:query};
    // jwk.thirdparty.less = less;
    // jwk.thirdparty.mustache = Mustache;
    
    Async.setJWK(jwk);
    jwk.doInParallel = Async.doInParallel;
    jwk.doSequentially = Async.doSequentially;
    /*
    jwk.doSequentiallyInBackground = Async.doSequentiallyInBackground;
    jwk.doInParallel_aggregateErrors = Async.doInParallel_aggregateErrors;
    jwk.withTimeout = Async.withTimeout;
    jwk.waitForAll = Async.waitForAll;
    jwk.chain = Async.chain;
    jwk.promisify = Async.promisify;
    */
    

    
    
    var native_trim = String.prototype.trim;
    jwk.trim = native_trim && !native_trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				native_trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		}
    
    jwk.merge = function( first, second ) {
		var l = second.length,
			i = first.length,
			j = 0;

		if ( typeof l === "number" ) {
			for ( ; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}

		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	}
    
    jwk.makeArray = function( arr, results ) {
		var type,
			ret = results || [];

		if ( arr != null ) {
			// The window, strings (and functions) also have 'length'
			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
			type = jwk.type( arr );

			if ( arr.length == null || type === "string" || type === "function" || type === "regexp" || jwk.isWindow( arr ) ) {
				Array.prototype.push.call( ret, arr );
			} else {
				jwk.merge( ret, arr );
			}
		}

		return ret;
	}
    jwk.each = function( callback, args ) {
        return (function( obj, callback, args ) {
            var name,
                i = 0,
                length = obj.length,
                isObj = length === undefined || jQuery.isFunction( obj );

            if ( args ) {
                if ( isObj ) {
                    for ( name in obj ) {
                        if ( callback.apply( obj[ name ], args ) === false ) {
                            break;
                        }
                    }
                } else {
                    for ( ; i < length; ) {
                        if ( callback.apply( obj[ i++ ], args ) === false ) {
                            break;
                        }
                    }
                }

            // A special, fast, case for the most common use of each
            } else {
                if ( isObj ) {
                    for ( name in obj ) {
                        if ( callback.call( obj[ name ], name, obj[ name ] ) === false ) {
                            break;
                        }
                    }
                } else {
                    for ( ; i < length; ) {
                        if ( callback.call( obj[ i ], i, obj[ i++ ] ) === false ) {
                            break;
                        }
                    }
                }
            }
            return obj;
        })( this, callback, args );		
	}
    
    jwk.atob = function (data) {
        return base64.decode(data);
    }
    
    jwk.btoa = function (data) {
        return base64.encode(data);
    }

    jwk.encodeB64 = function (data) {
        return this.btoa(data);
    }
    
    jwk.decodeB64 = function (data) {
        return this.atob(data);
    }
    
    jwk.md5 = function (data) {
        return CryptoJS.MD5(data).toString(CryptoJS.enc.Hex);
    }
    
    jwk.sha1 = function (data) {
        return CryptoJS.SHA1(data).toString(CryptoJS.enc.Hex);
    }
    
    jwk.sha2 = function (data) {
        return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
    }
    
    jwk.is_basic_value = function(value)  {
        if (warn_obsolete) console.warn("jwk.is_basic_value OBSOLETE");
        return jwk.isBasicValue.apply(jwk, arguments);
    }
    jwk.isBasicValue = function(value)  {
        var basic = {
            "boolean":true,
            "number":true,
            "string":true,
            "undefined": true
        }
        if ((typeof value) in basic) return true;
        if (value === null) return true;
        return false;
    }
    jwk.isBV = jwk.isBasicValue;
    
    jwk.is_pure_map_object = function () {
        if (warn_obsolete) console.warn("jwk.is_pure_map_object OBSOLETE");
        return jwk.isPureMapObject.apply(jwk, arguments);
    }
    jwk.isPureMapObject = function(obj) {
        if (jwk.isBasicValue(obj)) return false;
        if (typeof obj == "function") return false;
        if (jwk.isWindow(obj)) return false;
        for (var i in obj) {
            if (typeof obj[i] == "function") return false; // Object has functions. So is not a pure json object 
        }
        if (obj instanceof jwk.Mapping) return false; // Object is a jwk.Mapping already
        if (Array.isArray(obj)) return false; // array
        return true;
    }
    jwk.isPMO = jwk.isPureMapObject;
    
    
    jwk.getCookie = function(cname) {
        // http://www.w3schools.com/js/js_cookies.asp
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
        }
        return "";
    }

    jwk.setCookie = function(cname, cvalue, exdays) {
        // http://www.w3schools.com/js/js_cookies.asp
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    }   
    
    jwk.extend = function (in_depth) {        
        var target = arguments[0];
        var start_from = 1;
        if (in_depth === true) { target = arguments[1]; start_from = 2; }
        for (var i=start_from; i<arguments.length; i++) {
            var obj = arguments[i];
            for (var prop in obj) {
                if (prop.indexOf(".") > -1) {
                    var parts = prop.split(".");
                    var current = target;
                    var val = obj[prop];
                    for (var j in parts) {
                        var next = current[parts[j]];
                        if (!next && j < parts.length-1) {
                            next = current[parts[j]] = {};
                        }
                        if (j == parts.length-1) {
                            current[parts[j]] = val;
                        }
                        current = next;
                    }
                } else {
                    if (in_depth === true) {
                        if (jwk.isBV(obj[prop])) {
                            target[prop] = obj[prop];
                        } else if (jwk.isPMO(obj[prop])) {
                            target[prop] = jwk.extend(true, {}, target[prop], obj[prop]);
                        } else {                            
                            // leave the objet as it is
                            target[prop] = obj[prop];
                        }
                    } else {
                        target[prop] = obj[prop];
                    }                    
                }                
            }
        }
        return target;
    }
    
    jwk._mutex = {};
    jwk.mutex = function (name) {        
        if (!this._mutex[name]) this._mutex[name] = jwk.Deferred().resolve();    
        var mutex = jwk.Deferred();
        var def = jwk.Deferred();
        (function(_mutex, _def){
            jwk._mutex[name].always(function () {
                _def.resolve(_mutex);
            });
        })(mutex, def);
        this._mutex[name] = mutex.promise();
        return def.promise();
    }
    
    jwk.htmlEntityDecode = function(str) {
        // http://www.webdeveloper.com/forum/showthread.php?136026-RESOLVED-convert-HTML-Entities-into-normal-characters
        // Firefox (and IE if the string contains no elements surrounded by angle brackets )
        try {
            var ta=document.createElement("textarea");
            ta.innerHTML=str;
            return ta.value;
        } catch(e){};
        // Internet Explorer
        try {
            var d=document.createElement("div");
            d.innerHTML=str.replace(/</g,"&lt;").replace(/>/g,"&gt;");
            if(typeof d.innerText!="undefined") return d.innerText; // Sadly this strips tags as well
        } catch(e){}
    }    
    
    
    jwk.isWindow = function (value) {
        if (!value) return false;
        if (typeof value.postMessage != "function") return false;
        if (typeof value.close != "function") return false;
        if (typeof value.blur != "function") return false;
        if (typeof value.focus != "function") return false;
        if (typeof value.parent != "object") return false;
        try {
            // is not exaustive
            if (value.setTimeout != null && typeof value.setTimeout != "function") { return false; }
            if (value.onload != null && typeof value.onload != "function") { return false; }
            if (value.oncontextmenu != null && typeof value.oncontextmenu != "function") { return false; }
            if (value.onblur != null && typeof value.onblur != "function") { return false; }
            if (value.ondblclick != null && typeof value.ondblclick != "function") { return false; }
        } catch (err) { return true; }
        return true;
    }
    
    jwk.is_window = function(value) {
        console.error("jwk.is_window OBSOLETE");
        return jwk.isWindow.apply(jwk, arguments);        
        // TODO: IS WINDOW: http://jsfiddle.net/uV36N/
        if (value) return typeof value.postMessage == "function";
        return false;
    }
    
    jwk.inArray = function( elem, arr, i ) {
		return arr ? -1 : indexOf.call( arr, elem, i );
	}
    
    
    // Populate the class2type map
    // (this was taken from jquery)
    var class2type = {};
    var list = "Boolean Number String Function Array Date RegExp Object Error".split(" ");
    for (var i=0; i<list.length; i++) {
        var name = list[i];
        class2type[ "[object " + name + "]" ] = name.toLowerCase();
    }
    jwk.type = function (obj) {
		if ( obj == null ) {
			return obj + "";
		}
        if (typeof obj != "object") return typeof obj;        
        if (typeof obj === "object") {
            var _key = toString.call(obj);
            console.log(_key);
            var _ret = class2type[ _key ];
            //console.log(_ret);
            for (var i in class2type) {
                //console.log(i, class2type[i]);
            }
            return _ret || "object";
        } else {
            return typeof obj;
        }        
    }
    
    jwk.isFunction = function (v) {
        return (typeof v == "function");
    }
    
    // http://stackoverflow.com/questions/5916900/detect-version-of-browser?answertab=votes#tab-top
    navigator.sayswho= (function(){
        var ua= navigator.userAgent, tem, 
        M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
        if(/trident/i.test(M[1])){
            tem=  /\brv[ :]+(\d+(\.\d+)?)/g.exec(ua) || [];
            return 'IE '+(tem[1] || '');
        }
        M= M[2]? [M[1], M[2]]:[navigator.appName, navigator.appVersion, '-?'];
        if((tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
        return M.join(' ');
    })();
    // --------------------------------------------------------------------------------------------
    
    jwk.whichBrowser = function(){
        return navigator.sayswho().toLocaleLowerCase();
    }
    
    jwk.which_browser = function(){
        if (warn_obsolete) console.warn("jwk.which_browser OBSOLETE");
        return jwk.whichBrowser.apply(jwk, arguments);        
    }
    
    jwk.popup_window = function(url, title, w, h) {
        if (warn_obsolete) console.warn("jwk.popup_window OBSOLETE");
        return jwk.popupWindow.apply(jwk, arguments);        
    }
    
    jwk.popupWindow = function(url, title, w, h) {
    // http://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
        var left = (screen.width/2)-(w/2);
        var top = (screen.height/2)-(h/2);
        return window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+top+', left='+left);
    }
    
    jwk.urlParam = function(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
    }    
    
    jwk.url_param = function(name) {
        if (warn_obsolete) console.warn("jwk.url_param OBSOLETE");
        return jwk.urlParam.apply(jwk, arguments);        
    }    
    
    
    // this is for debugging purposes ----
    jwk.serializing = [];
    var level = 0;
    var object = null;
    function parar(value) {
        var str = "";
        for (var i=0;i<level; i++) {
            str = " " + str;
        }
        
        if (level > 30) {
            console.error("ERROR: you serialize object too big", [jwk.serializing]);
            throw {message: "too big serializing object exception"};
        } 

        if (level > 10) {
            console.warn("WARNING: " + str + "serializing object too big", [jwk.serializing]);
        } 
         
    }
    // --------------------------
    
    jwk.isArray = function (value)  {        
        return Array.isArray(value) || value.toString() == "[object Arguments]";
    }

    jwk.serialize = function (value) {            
        var result = value;
        if (jwk.serializing.indexOf(value) != -1) { return; }
        parar(value);

        switch (typeof value) {
            case "object":
                level++;
                jwk.serializing.push(value);
                if (value == null) {
                    result = null;
                    break;
                }
                if (jwk.isWindow(value)) {
                    result = value.toString();
                    break;
                }
                
                if (jwk.Node.prototype.valueOf == value.valueOf) {
                    result = value.valueOf();
                } else if (typeof value.serialize == "function") {
                    result = value.serialize();
                } else {
                    if (jwk.isArray(value)) {
                        var result = [];
                        for (var i=0; i<value.length; i++) {
                            if (typeof value[i] == "function") continue;
                            var entry = jwk.serialize(value[i]);
                            result.push(entry);                            
                        }
                    } else {
                        result = {};
                        for (var prop in value) {
                            if (typeof value[prop] == "function") continue;
                            var entry = jwk.serialize(value[prop]);
                            result[prop] = entry;
                        }
                    }
                }
                var index = jwk.serializing.indexOf(value);
                if (index != -1) jwk.serializing.splice(index, 1);
                level--;
                break;
            case "function":
                result = undefined;            
                break;
        }
        return result;
    }    
    
    return jwk;
});

