load('../Worker.js');
load('../harness.js');

// Copyright (C) 2017 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-atomics.wake
description: >
  Test that Atomics.wake wakes all waiters on a location, but does not
  wake waiters on other locations.
---*/

let WAKEUP = 0;     // Waiters on this will be woken
let DUMMY = 1;      // Waiters on this will not be woken
let RUNNING = 1;    // Accounting of live agents here
let NUMELEM = 2; 

let NUMAGENT = 3;

let rs = [];
let ws = [];
for (let i = 0; i < NUMAGENT; i++) {
    let w = new Worker(`
        onmessage = function(e) {
            let ia = new Int32Array(e.data[0]);
            Atomics.add(ia, ${RUNNING}, 1);
            let ret = "A " + Atomics.wait(ia, ${WAKEUP}, 0);
            postMessage([ret]);
        }
    `);
    w.onmessage = function(e) {
        rs.push(e.data);
        check_results();
    }
    ws.push(w);
}

let w = new Worker(`
    onmessage = function(e) {
        let ia = new Int32Array(e.data[0]);
        Atomics.add(ia, ${RUNNING}, 1);
        // This will always time out.
        let ret = "B " + Atomics.wait(ia, ${DUMMY}, 0, 1000);
        postMessage([ret]);
    }
`);
w.onmessage = function(e) {
    rs.push(e.data);
    check_results();
}
ws.push(w);

var ia = new Int32Array(new SharedArrayBuffer(NUMELEM * Int32Array.BYTES_PER_ELEMENT));
ws.forEach(function(w) {
    w.postMessage([ia.buffer]);
});

// Wait for agents to be running.
waitUntil(ia, RUNNING, NUMAGENT+1);

// Then wait some more to give the agents a fair chance to wait.  If we don't,
// we risk sending the wakeup before agents are sleeping, and we hang.
sleep(500).then(function() {
    // Wake all waiting on WAKEUP, should be 3 always, they won't time out.
    assert.sameValue(Atomics.wake(ia, WAKEUP), NUMAGENT);
});

enterEventLoop();

ws.forEach(function(w) {
    w.terminate();
});

function check_results() {
    if (rs.length == NUMAGENT+1) {
        rs.sort();
        for (let i=0; i < NUMAGENT; i++)
            assert.sameValue(rs[i], "A ok");
        assert.sameValue(rs[NUMAGENT], "B timed-out");
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
