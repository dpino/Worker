load('../Worker.js');
load('../harness.js');

// Copyright (C) 2017 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-atomics.wake
description: >
  Test that Atomics.wake wakes zero waiters if the count is NaN
---*/

let w = new Worker(`
    onmessage = function(e) {
        let ia = new Int32Array(e.data[0]);
        let ret = Atomics.wait(ia, 0, 0, 1000); // We will timeout eventually
        postMessage([ret]);
    }
`);
w.onmessage = function(e) {
    assert.sameValue(e.data[0], "timed-out");
    exitEventLoop();
}

let ia = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
w.postMessage([ia.buffer]);

sleep(500).then(() => // Give the agent a chance to wait
    assert.sameValue(Atomics.wake(ia, 0, NaN), 0)); // Don't actually wake it

enterEventLoop();
w.terminate();
