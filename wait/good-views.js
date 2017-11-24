load('../Worker.js');
load('../harness.js');

let rs = [];

function check_done() {
    if (rs.length == 7) {
        rs.sort();
        assert.sameValue(rs[0] == "A timed-out", true);
        assert.sameValue(rs[1] == "B not-equal", true);
        assert.sameValue(rs[2] == "C not-equal", true);
        assert.sameValue(rs[3] == "C not-equal", true);
        assert.sameValue(rs[4] == "C not-equal", true);
        assert.sameValue(rs[5] == "C not-equal", true);
        assert.sameValue(rs[6] == "C not-equal", true);
        exitEventLoop();    
    }
}

let A = new Worker(`
    onmessage = function(e) {
        let view = e.data[0];
        let ret = "A " + Atomics.wait(view, 0, 0, 0);
        postMessage([ret]);
    }
`);
A.onmessage = function(e) {
    rs.push(e.data[0]);    
    check_done();
}

let B = new Worker(`
    onmessage = function(e) {
        let view = e.data[0];
        let ret = "B " + Atomics.wait(view, 0, 37, 0);
        postMessage([ret]);
    }
`);
B.onmessage = function(e) {
    rs.push(e.data[0]);    
    check_done();
}

let C = new Worker(`
    onmessage = function(e) {
        let view = e.data[0];
        let idx = e.data[1];
        let ret = "C " + Atomics.wait(view, idx, 0);
        postMessage([ret]);
    }
`);
C.onmessage = function(e) {
    rs.push(e.data[0]);    
    check_done();
}

let sab = new SharedArrayBuffer(1024);
let view = new Int32Array(sab, 32, 20);

A.postMessage([view]);
B.postMessage([view]);

let good_indices = [
    (view) => 0/-1,
    (view) => '-0',
    (view) => view.length - 1,
    (view) => ({ valueOf: () => 0 }),
    (view) => ({ toString: () => '0', valueOf: false }) // non-callable valueOf triggers invocation of toString
];

sleep(500).then(function() {
    for (let idxGen of good_indices) {
        let idx = idxGen(view);
        view[idx] = 0;
        // Firefox cannot apply clone algorithm on an Object.
        // See https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
        if (typeof idx == "object") {
            idx = idx.valueOf ? idx.valueOf() : idx.toString();
        }
        Atomics.store(view, idx, 37);
        C.postMessage([view, idx]);
    }
});

enterEventLoop();
A.terminate();
B.terminate();
C.terminate();
