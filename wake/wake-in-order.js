load('../Worker.js');
load('../harness.js');

// Copyright (C) 2017 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-atomics.wake
description: >
  Test that Atomics.wake wakes agents in the order they are waiting.
---*/

let NUMAGENT = 3;

let WAKEUP = 0;                 // Waiters on this will be woken
let SPIN = 1;                   // Worker i (zero-based) spins on location SPIN+i
let RUNNING = SPIN + NUMAGENT;  // Accounting of live agents
let NUMELEM = RUNNING + 1;

// Create workers and start them all spinning.  We set atomic slots to make
// them go into a wait, thus controlling the waiting order.  Then we wake them
// one by one and observe the wakeup order.

let rs = [];
let ws = [];
for (let i=0 ; i < NUMAGENT ; i++) {
    let w = new Worker(`
        onmessage = function(e) {
            let sab = e.data[0];    
            let ia = new Int32Array(sab);
            Atomics.add(ia, ${RUNNING}, 1);
            while (Atomics.load(ia, ${SPIN + i}) === 0)
                /* nothing */ ;
            var ret = ${i} + Atomics.wait(ia, ${WAKEUP}, 0);
            postMessage([ret]);
        }
    `);
    w.onmessage = function(e) {
        rs.push(e.data[0]);
        check_results();
    }
    ws.push(w);
}

let ia = new Int32Array(new SharedArrayBuffer(NUMELEM * Int32Array.BYTES_PER_ELEMENT));
ws.forEach((w) => w.postMessage([ia.buffer]));

// Wait for agents to be running.
waitUntil(ia, RUNNING, NUMAGENT);

// Then wait some more to give the agents a fair chance to wait.  If we don't,
// we risk sending the wakeup before agents are sleeping, and we hang.
sleep(500).then(function() {
    for (let i=0; i < NUMAGENT; i++) {
        sleep(500).then(() => Atomics.store(ia, SPIN+i, 1));
    }
});

// Wake them up one at a time and check the order is 0 1 2
for (let i=0; i < NUMAGENT; i++) {
    sleep(200).then(() => assert.sameValue(Atomics.wake(ia, WAKEUP, 1), 1));
}

enterEventLoop();
ws.forEach((w) => w.terminate());

function check_results() {
    if (rs.length == NUMAGENT) {
        for (let i = 0; i < NUMAGENT; i++) {
            assert.sameValue(rs[i], i + "ok");
        }
        exitEventLoop();
    }
}

function waitUntil(ia, k, value) {
    let i = 0;
    while (Atomics.load(ia, k) !== value && i < 15) {
        sleep(100);
        i++;
    }
    assert.sameValue(Atomics.load(ia, k), value, "All agents are running");
}
