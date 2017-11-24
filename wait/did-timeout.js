load('../Worker.js');
load('../harness.js');

let w = new Worker(`
    onmessage = function(e) {
        let ia = new Int32Array(e.data[0]);
        let then = Date.now();
        let ret = Atomics.wait(ia, 0, 0, 500); // Timeout 500ms
        postMessage([ret, Date.now() - then]); // Actual time can be more than 500ms
    }
`);

w.onmessage = function(e) {
    assert.sameValue(e.data[0], "timed-out");
    assert.sameValue(e.data[1] >= 500, true);
    exitEventLoop();
}

let ia = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
w.postMessage([ia.buffer]);

enterEventLoop();
w.terminate();
