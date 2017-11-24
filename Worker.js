// Worker abstraction for JS shells.  See API.md for an API description.

// This is a polyfill / self-hosted implementation for SpiderMonkey's JS shell.
// Load this in your JS application before other code.
//
// The polyfill uses shared memory and atomics for synchronization, and a
// SpiderMonkey-specific messaging substrate to clone data and send it.

"use strict";

// One 'm2w' (master-to-worker) SAB for each worker

const M2W_MESSAGES = 0;		// Pending master-to-worker messages
const M2W_DONE = 1;		// When set, worker should terminate
const M2W_NUMBYTES = 2 * Int32Array.BYTES_PER_ELEMENT;

// One 'w2m' (worker-to-master) SAB to share

const W2M_ID = 0;		// New worker's ID appears here
const W2M_MESSAGES = 1;		// Pending worker-to-master messages
const W2M_NUMBYTES = 2 * Int32Array.BYTES_PER_ELEMENT;

const workers = [null];		// Worker 0 is not defined

const w2m = new Int32Array(new SharedArrayBuffer(W2M_NUMBYTES));

function Worker(source_text) {
    const id = workers.length;
    const m2w = new Int32Array(new SharedArrayBuffer(M2W_NUMBYTES));
    const timeout = 5000;

    putMessage(id, [w2m, m2w]);
    Atomics.store(w2m, W2M_ID, id);

    evalInWorker(
	`
	const [_w2m, _m2w] = getMessage(${id});

	function onmessage(ev) {}

	function postMessage(msg, transfer) {
	    putMessage(0, [${id}, msg], transfer);
	    Atomics.add(_w2m, ${W2M_MESSAGES}, 1);
	    Atomics.wake(_w2m, ${W2M_MESSAGES});
	}

	Atomics.store(_w2m, ${W2M_ID}, 0);
	Atomics.wake(_w2m, ${W2M_ID});
	;
        ${source_text}
        ;
	for(;;) {
	    Atomics.wait(_m2w, ${M2W_MESSAGES}, 0);
	    let msg = getMessage(${id});
	    if (Atomics.load(_m2w, ${M2W_DONE}))
		break;
	    Atomics.sub(_m2w, ${M2W_MESSAGES}, 1);
	    try {
		onmessage({data:msg});
	    } catch (e) {
		print("WORKER ${id}:");
		print(e);
	    }
	}
        `
    );

    if (Atomics.wait(w2m, W2M_ID, id, timeout) == "timed-out")
	throw new Error("Worker handshake timed out");

    this._id = id;
    this._m2w = m2w;
    workers.push(this);
}

Worker.prototype.postMessage = function (msg, transfer) {
    putMessage(this._id, msg, transfer);
    Atomics.add(this._m2w, M2W_MESSAGES, 1);
    Atomics.wake(this._m2w, M2W_MESSAGES);
}

Worker.prototype.onmessage = function (ev) {}

Worker.prototype.terminate = function () {
    Atomics.store(this._m2w, M2W_DONE, 1);
    Atomics.wake(this._m2w, M2W_MESSAGES);
}

let inloop = false;		// Set when entering the main event loop
let exiting = false;		// Set when leaving the main event loop

function enterEventLoop() {
    if (inloop)
	throw new Error("Already in event loop");

    exiting = false;
    inloop = true;
    while (!exiting) {
	Atomics.wait(w2m, W2M_MESSAGES, 0);
	let [w, msg] = getMessage(0);
	Atomics.sub(w2m, W2M_MESSAGES, 1);
	try {
	    workers[w].onmessage({data: msg});
	} catch (e) {
	    print("MAIN:")
	    print(e);
	}
    }
    inloop = false;
}

function exitEventLoop() {
    if (!inloop)
	throw new Error("Not in event loop");
    exiting = true;
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
