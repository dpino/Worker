load('../Worker.js');
load('../harness.js');

let w = new Worker(`
    onmessage = function(e) {
        let ia = new Int32Array(e.data[0]);
        let then = Date.now();
        Atomics.wait(ia, 0, 0);
        let diff = Date.now() - then; // Should be about 1000 ms but can be more
        postMessage([diff]);
    }
`);

w.onmessage = function(e) {
    assert.sameValue(e.data[0] >= 1000, true);
    exitEventLoop();
}

let ia = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
w.postMessage([ia.buffer]);

sleep(500).then(function() {        // Give the agent a chance to wait
    Atomics.store(ia, 0, 1);        // Change the value, should not wake the agent
    sleep(500).then(function() {    // Wait some more so that we can tell
        Atomics.wake(ia, 0);          // Really wake it up
    });
});

enterEventLoop();
w.terminate();
