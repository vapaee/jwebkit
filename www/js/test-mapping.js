QUnit.test("mapping basics", function( assert ) {                
    var m = new jwk.Node();
    var e = null;

    // actions ---
    m.map({
        "aaa": 123,
        "bbb":"abc"
    });
    // asserts ---
    assert.equal(m.aaa, 123);
    assert.equal(m.bbb, "abc");

    m.on("change:aaa", function () { e = arguments; });
    m.on("change:bbb", function () { e = arguments; });                

    // actions ---
    m.aaa = m.bbb;
    // asserts ---
    assert.equal(m.bbb, "abc");
    assert.equal(m.aaa, "abc");
    assert.equal(e.length, 2);
    assert.equal(e[0], "change:aaa");
    assert.equal(e[1].value, "abc");
    assert.equal(e[1].old_value, 123);
    e = null;

    // actions ---
    m.bbb = 3;
    // asserts ---
    assert.equal(m.bbb, 3);
    assert.equal(e.length, 2);
    assert.equal(e[0], "change:bbb");
    assert.equal(e[1].value, 3);
    assert.equal(e[1].old_value, "abc");
});

QUnit.test("mapping iteration", function( assert ) {                
    var m = new jwk.Node();
    var list = [];

    // actions ---
    m.map({
        "aaa": 123,
        "bbb":"abc"
    });
    // asserts ---
    assert.equal(m.aaa, 123);
    assert.equal(m.bbb, "abc");                
    assert.deepEqual(m.keys(), ["aaa", "bbb"]);
    assert.deepEqual(m.values(), [123, "abc"]);
    assert.equal(m.count(), 2);                
    m.each(function (val, key, i) { list.push(arguments); })
    assert.equal(list[0][0], 123);
    assert.equal(list[0][1], "aaa");
    assert.equal(list[1][0], "abc");
    assert.equal(list[1][1], "bbb");

});