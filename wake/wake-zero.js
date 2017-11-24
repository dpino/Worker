load('../Worker.js');
load('../harness.js');

// Copyright (C) 2017 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-atomics.wake
description: >
  Test that Atomics.wake wakes one waiter if that's what the count is.
---*/


let NUMAGENT = 3;

let WAKEUP = 0;     // Agents wait here
let RUNNING = 1;    // Accounting of live agents here
let NUMELEM = 2; 

let WAKECOUNT = 0;

let rs = [];
let ws = [];
for (let i = 0; i < NUMAGENT; i++) {
    let w = new Worker(`
        onmessage = function(e) {
            let ia = new Int32Array(e.data[0]);
            Atomics.add(ia, ${RUNNING}, 1);
            // Waiters that are not woken will time out eventually.
            let ret = Atomics.wait(ia, ${WAKEUP}, 0, 2000);
            postMessage([ret]);
        }
    `);
    w.onmessage = function(e) {
        rs.push(e.data);
        check_results();
    }
    ws.push(w);
}

var ia = new Int32Array(new SharedArrayBuffer(NUMELEM * Int32Array.BYTES_PER_ELEMENT));
ws.forEach(function(w) {
    w.postMessage([ia.buffer]);
});

// Wait for agents to be running.
waitUntil(ia, RUNNING, NUMAGENT);

enterEventLoop();

// Then wait some more to give the agents a fair chance to wait.  If we don't,
// we risk sending the wakeup before agents are sleeping, and we hang.
sleep(500).then(function() {
    // There's a slight risk we'll fail to wake the desired count, if the preceding
    // sleep() took much longer than anticipated and workers have started timing
    // out.
    assert.sameValue(Atomics.wake(ia, 0, WAKECOUNT), WAKECOUNT);
});

ws.forEach(function(w) {
    w.terminate();
});

function check_results() {
    if (rs.length == NUMAGENT) {
        rs.sort();
        for (let i=0; i < WAKECOUNT; i++)
            assert.sameValue(rs[i], "ok");
        for (let i=WAKECOUNT; i < NUMAGENT; i++)
            assert.sameValue(rs[i], "timed-out");
        exitEventLoop();
    }
}

function waitUntil(ia, k, value) {
    var i = 0;
    while (Atomics.load(ia, k) !== value && i < 15) {
        sleep(100);
        i++;
    }
    assert.sameValue(Atomics.load(ia, k), value, "All agents are running");
}
