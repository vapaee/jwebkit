QUnit.test("observable basics", function( assert ) {                
    var obs = new jwk.Observable();
    var myContext = "a";
    var callbacks = [];
    var args = [];

    function onChangeCoso() {
        callbacks.push(onChangeCoso);
        args.push(arguments);
    }

    obs.on ("change", function () { callbacks.push("onChange(anonymous)"); args.push(arguments); }, myContext);
    obs.on ("change:coso", onChangeCoso);
    obs.one("change:just.once", function () { callbacks.push("onChange(just.once)"); args.push(arguments); });

    // actions ---                
    callbacks = [];
    obs.trigger("change:coso", 123, "A", "B", true);                
    // asserts ---
    assert.equal(callbacks[0], onChangeCoso);
    assert.equal(callbacks[1], "onChange(anonymous)");
    assert.equal(args[0][0], "change:coso");
    assert.equal(args[0][1], 123);
    assert.equal(args[0][2], "A");
    assert.equal(args[0][3], "B");
    assert.equal(args[0][4], true);
    assert.equal(args[0][0], args[1][0]);
    assert.equal(args[0][1], args[1][1]);
    assert.equal(args[0][2], args[1][2]);
    assert.equal(args[0][3], args[1][3]);
    assert.equal(args[0][4], args[1][4]);

    // actions ---                
    callbacks = [];
    obs.trigger("coso", "THIS SHOULD NOT BE HANDLED");
    // asserts ---
    assert.equal(typeof callbacks[0], "undefined");

    // actions ---                
    obs.trigger("change:just.once", "handled twice", "by onChange(just.once)", "and onChange(anonymous)");
    // asserts ---
    assert.equal(callbacks[0], "onChange(just.once)");
    assert.equal(callbacks[1], "onChange(anonymous)");

    // actions ---
    callbacks = [];
    obs.trigger("change:just.once", "handled only by onChange(anonymous)");
    // asserts ---
    assert.equal(callbacks[0], "onChange(anonymous)");
    assert.equal(callbacks.length, 1);

    // actions ---
    callbacks = [];
    // we take off the onChangeCoso handler
    obs.off(null, onChangeCoso);    
    obs.trigger("change:coso", 123, "handled only by onChange(anonymous)");
    // asserts ---
    assert.equal(callbacks[0], "onChange(anonymous)");
    assert.equal(callbacks.length, 1);

    // actions ---
    callbacks = [];
    // we take off the myContext asociated handler
    obs.off(null, null, myContext);    
    obs.trigger("change:coso", "A ver", "NOT HANDLED");    
    // asserts ---
    assert.equal(callbacks.length, 0);

});


QUnit.test("observable options", function( assert ) {                
    var obs = new jwk.Observable();
    var myContext = "a";
    var callbacks = [];
    var args = [];

    function onCoso() {
        callbacks.push(onCoso);
        args.push(arguments);
    }
    
    
    for (var i=0; i<3; i++) {
        obs.on (
            "COSO", onCoso, myContext,
            {
                once: true // causes the handler to be removed after first event
            } 
        );
        obs.on (
            "PEPE", function () { callbacks.push("onPepe"); }, myContext,
            {
                multimple: true // allow multiple calls to create a new handler each time
            } 
        );
        obs.on (
            "JUAN", function () { callbacks.push("onJuan"); }, null,
            { once: true , multimple: true}
        );
    }
    
    // Options ------------------------
    // - once: true --> causes the handler to be removed after first event
    // - multimple: true --> causes each call to "on" creates a new separated handler
    // - multimple: false (by default) --> causes several calls to each call to "on" creates just one handler

    
    // actions ---                
    callbacks = [];
    obs.trigger("COSO", "COSO event 1");
    // asserts ---
    assert.equal(callbacks[0], onCoso);
    assert.equal(callbacks.length, 1);
    
    
    // actions ---                
    callbacks = [];
    obs.trigger("PEPE", "PEPE event 1"); // multiple handles for same event. Each handles all "PEPE" events.
    // asserts ---
    assert.equal(callbacks.length, 3);
    assert.equal(callbacks[0], "onPepe");
    assert.equal(callbacks[1], "onPepe");
    assert.equal(callbacks[2], "onPepe");
    
    
    // actions ---                
    callbacks = [];
    obs.trigger("JUAN", "JUAN event 1"); // multiple handles for same event but once each
    // asserts ---
    assert.equal(callbacks.length, 3);
    assert.equal(callbacks[0], "onJuan");
    assert.equal(callbacks[1], "onJuan");
    assert.equal(callbacks[2], "onJuan");
    
    // actions ---                
    callbacks = [];
    obs.trigger("COSO", "COSO event 2"); // no handle (because once = true)
    // asserts ---
    assert.equal(callbacks.length, 0);
    
    
    // actions ---                
    callbacks = [];
    obs.trigger("PEPE", "PEPE event 2"); // each handler executes again once more each. 
    // asserts ---
    assert.equal(callbacks.length, 3);
    assert.equal(callbacks[0], "onPepe");
    assert.equal(callbacks[1], "onPepe");
    assert.equal(callbacks[2], "onPepe");
    
    
    // actions ---                
    callbacks = [];
    obs.trigger("JUAN", "JUAN event 2"); // no handle (because once = true, in spite of being "multiple")
    // asserts ---
    assert.equal(callbacks.length, 0);

});
 

QUnit.test("observable lazy", function( assert ) {                
    var obs = new jwk.Observable();
    assert.expect( 6 );
    
    var done1 = assert.async();
    var done2 = assert.async();
    var done3 = assert.async();

    var start_time;
    var last_delta;
    
    function now() {
        return (new Date()).getTime();
    }
    
    function get_dif(e) {
        var now = (new Date()).getTime();
        start_time = typeof start_time == "undefined" ? now : start_time;
        var delta = now - start_time;
        last_delta = typeof last_delta == "undefined" ? delta : last_delta;
        var diff = delta - last_delta;
        // console.log("get_dif", "now:", now, "delta:", delta, "last_delta:", last_delta, "diff:", diff);
        last_delta = delta;
        return diff;
    };

    obs.one("LAZY", function (n, last_diff, triggered_time) {
        //console.log(arguments);
        assert.lte(25, now() - triggered_time); // pasaron al menos 25ms
        assert.gte(30, last_diff);  // la kdiferencia d etiemepo entre este trigger y el anterior no alcanzó a 25ms
        done1();
    }, null, {
        lazy: true
    });

    obs.one("LAZY", function (n, last_diff, triggered_time) {
        //console.log(arguments);
        assert.lte(100, now() - triggered_time); // pasaron al menos 100ms
        assert.gte(105, last_diff);  // la kdiferencia d etiemepo entre este trigger y el anterior no alcanzó a 100ms
        done2();
    }, null, {
        lazy: 100
    });

    obs.one("LAZY", function (n, last_diff, triggered_time) {
        //console.log(arguments);
        assert.lte(200, now() - triggered_time); // pasaron al menos 200ms
        assert.gte(205, last_diff);  // la kdiferencia d etiemepo entre este trigger y el anterior no alcanzó a 200ms
        done3();
    }, null, {
        lazy: 200
    });

    do_trigger = function (extra) {        
        setTimeout(function () { 
            // console.log("----");
            var diff = get_dif(extra);
            var now = (new Date()).getTime();
            // console.log("trigger LAZY:"+extra, "diff: ", diff);            
            obs.trigger("LAZY:"+extra, diff, now);
        }, extra);
    }    
    
    do_trigger(0);
    do_trigger(10);
    do_trigger(20);
    do_trigger(30);
    do_trigger(50);
    do_trigger(90);
    do_trigger(100);
    do_trigger(190);
    do_trigger(300);
    do_trigger(450);
    do_trigger(700);
    do_trigger(1000);

});
