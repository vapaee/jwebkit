QUnit.test("test jwk.query", function( assert ) {
    // http://www.w3schools.com/jquery/jquery_ref_selectors.asp
    
    var area = document.getElementById("test-area");
    area.innerHTML = '\
        <div id="padre">\
            <div id="pepe" class="coso lololo">\
                <p>texto_A</p>\
                <p>texto_B</p>\
            </div>\
            <div id="acurate"><p>texto_1</p><p>texto_2</p><p>texto_3</p><p>texto_4</p></div>\
            <div id="lola" class="coso lala">\
                <span id="palabra" class="texto">\
                    <p>texto_1</p>\
                    <p>texto_2</p>\
                    <p>texto_3</p>\
                    <p>texto_4</p>\
                </span>\
            </div>\
        </div>\
    ';
    
    var $ = jwk.query;

    // -- actions
    query = "div.coso.lala";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 1, query);
    
    // -- actions
    query = "div.coso";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 2, query);
    
    // -- actions
    query = "div";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 4, query);

    // -- actions
    query = "div#pepe";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 1, query);

    // -- actions
    query = "div div";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 3, query);

    // -- actions
    query = "div .lololo span";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 0, query);

    // -- actions
    query = ".lala span";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 1, query);
    
    // -- actions
    query = "#acurate *";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 4, query);
    
    // -- actions
    query = "div > p";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 6, query);
    
    // -- actions
    query = "span > p";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 4, query);
    
    // -- actions
    query = "div > p, span > p";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 10, query);
    
    // -- actions
    query = ".coso,.texto,.lala";
    $target = $(query, area);
    console.log([query, $target]);
    // -- assertions
    assert.equal($target.length, 3, query);
    
});
