// Simple test case for the Workers API.

// To test this in the SpiderMonkey shell, load Worker.js first and
// then this file:
//
//   js -f Worker.js -f test.js

const NUM = 20;
const ia = new Int32Array(new SharedArrayBuffer(8));
const ws = [];

const worker_src =
`
let id, ia;
onmessage = function (ev) {
  [id, ia] = ev.data;
  // Wait for a goahead
  Atomics.wait(ia, 1, 0);
  for ( let i=0; i < 10; i++ )
    Atomics.add(ia, 0, fib(10 + (i % 7)));
  postMessage("done");
}
function fib(n) {
  if (n < 2) return n;
  return fib(n-1) + fib(n-2);
}
`;

let done = 0;

for ( let i=0; i < NUM; i++ ) {
    let w = new Worker(worker_src);
    ws.push(w);
    w.postMessage([i+1, ia]);
    w.onmessage = function(ev) {
	print((i+1) + " " + ev.data);
	if (++done == NUM)
	    exitEventLoop();
    }
}

// Give the goahead and wait for workers to be done
Atomics.add(ia, 1, 1);
Atomics.wake(ia, 1);
enterEventLoop();

for (let w of ws)
  w.terminate();

print(ia[0]);
print("FINISHED");
