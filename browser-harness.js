createWorkerFromString = function(source_text) {
    let blob = new Blob([source_text], {type: 'text/javascript'});
    let url = URL.createObjectURL(blob);
    return new Worker(url);
}

function enterEventLoop() {}

function exitEventLoop(w) {
    if (w.constructor === Array) {
        w.forEach((w) => w.terminate());
    } else if (typeof w === 'object') {
        w.terminate();
    }
}

function sleep(ns) {
    function wait(sec) {
        let start = Date.now();
        while (true) {
            if (Date.now() - start > sec) {
                return;
            }
        }
    }
    wait(ns);
    return {
        then: function(fn) {
            if (fn) { fn(); }
        }
    }
}

assert = {
    'sameValue': function(a, b) {
        if (a !== b) {
            throw new Error('not equals: ' + a + " != " + b);
        }
    }
}
