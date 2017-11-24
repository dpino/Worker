load('../Worker.js');
load('../harness.js');

let w = new Worker(`
    onmessage = function(e) {
        let ia = new Int32Array(e.data[0]);
        let then = Date.now();
        let ret = Atomics.wait(ia, 0, 0, -5);
        postMessage([ret]);  // -5 => 0
    }
`);

w.onmessage = function(e) {
    assert.sameValue(e.data[0], "timed-out");
    exitEventLoop();
}

let ia = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
w.postMessage([ia.buffer]);

enterEventLoop();
w.terminate();
