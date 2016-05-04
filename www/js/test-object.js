function ambient() {
    return { callbacks: [], args: [] };
}

QUnit.test("object basics", function( assert ) {                
    var o = new jwk.Object();
    var e = null;
    var env = ambient();

    // actions ---
    env = ambient();
    o.on("change:path.to.target", function (n, e) {        
        env.callbacks.push("change:path.to.target");
        env.args.push(arguments);
        console.debug("---->", arguments, env);
    });
    o.set("path", jwk.Node());
    o.path.set("to", jwk.Node());
    o.path.to.set("target", "target-value");
    // asserts ---
    assert.equal(env.callbacks[0], "change:path.to.target");
    assert.equal(env.args[0][0], "change:path.to.target");
    assert.equal(env.args[0][1].event_name, "change:path.to.target");
    assert.notOk(env.args[0][1].old_value);
    assert.equal(env.args[0][1].path, "path.to.target");
    assert.equal(env.args[0][1].target, o);
    assert.equal(env.args[0][1].value, "target-value");

    // actions ---
    env = ambient();    
    o.on("change", function (n, e) {
        env.callbacks.push("change");
        env.args.push(arguments);
        console.debug("---->", arguments, env);
    });    
    o.on("change:other", function (n, e) {        
        env.callbacks.push("change:other");
        env.args.push(arguments);
        console.debug("---->", arguments, env);
    });
    
    o.on("change:other.string", function (n, e) {    
        env.callbacks.push("change:other.string");
        env.args.push(arguments);
        console.debug("---->", arguments, env);
    });
    
    o.on("change:other.string.target", function (n, e) {    
        env.callbacks.push("change:other.string.target");
        env.args.push(arguments);
        console.debug("---->", arguments, env);
    });
    console.log("hago el maping ------")
    o.map({
        "other": {
            "string": {
                "target": "string-target"
            }
        }
    });

    // asserts ---
    assert.equal(env.callbacks[0], "change:other");
    assert.equal(env.callbacks[1], "change");
    assert.equal(env.callbacks[2], "change:other.string");
    assert.equal(env.callbacks[3], "change");
    assert.equal(env.callbacks[4], "change:other.string.target");
    assert.equal(env.callbacks[5], "change");
    assert.equal(env.args[5][1].event_name, "change:other.string.target");
    assert.notOk(env.args[5][1].old_value);
    assert.equal(env.args[5][1].path, "other.string.target");
    assert.equal(env.args[5][1].target, o);
    assert.equal(env.args[5][1].value, "string-target");
    
    
    // actions ---
    o = new jwk.Object();
    env = ambient();    
    o.map({
        "path": {
            "list": []
        }
    });

    o.on("change:path.list", function (n, e) {    
        env.callbacks.push("change:path.list");
        env.args.push(arguments);
        console.debug("---->", arguments, env);
    });        
    o.path.list = [1,2,3];
    // asserts ---
    assert.equal(env.callbacks[0], "change:path.list");
    
    
    
    /*
    
    env = ambient();
    o.path.to.target = "target-otro-value";
    // asserts ---
    assert.equal(env.callbacks[0], "change:path.to.target");
    assert.equal(env.callbacks[1], "change:path.to");
    assert.equal(env.callbacks[2], "change:path");
    assert.equal(env.callbacks[3], "change");
    
    */
    
    
});
