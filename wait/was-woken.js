load('../Worker.js');
load('../harness.js');

let w = new Worker(`
    onmessage = function(e) {
        let ia = new Int32Array(e.data[0]);
        let ret = Atomics.wait(ia, 0, 0); // No timeout => Infinity
        postMessage([ret]);
    }
`);

w.onmessage = function(e) {
    assert.sameValue(e.data[0], "ok");
    exitEventLoop();
}

let ia = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
w.postMessage([ia.buffer]);

// Give the agent a chance to wait.
sleep(500).then(() => Atomics.wake(ia, 0));

enterEventLoop();
w.terminate();
