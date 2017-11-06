# Worker API

This is a proposal for a common worker API for JS shells.  It is built up around structured cloning an an inter-worker messaging mechanism and is closely modeled on how workers communicate in the browser.

## On the main thread

### `w = new Worker(source_text)`

Returns a new Worker object.  `source_text` is the string representing the source code.

### `w.postMessage(object [, transfer])`

Structured-clone `object`, possibly paying attention to `transfer`, and send it to the worker `w`.  If `w` is terminated this may or may not throw an error.

### `w.onmessage = function (ev) ...`

Install an event handler on the worker `w`, which will be invoked when a message is received from that worker.  The data of the message is in `ev.data`, in order to be compatible with the browsers.  There are no other fields in `ev` at this time.

### `w.terminate()`

Tell the worker `w` to stop processing events and to terminate (if that is sensible in the implementation).

### `enterEventLoop()`

Start dispatching messages from workers.  The event handlers can create additional workers.

### `exitEventLoop()`

Make the call to `enterEventLoop()` return.


## On the worker thread

### `postMessage(object [, transfer])`

Structured-clone `object`, possibly paying attention to `transfer`, and send it to the main thread.

### `onmessage = function (ev) ...`

Install an event handler that receives messages from the main thread.  Again, `ev.data` holds the cloned data.

## Notes

The event loop is implicit on the worker thread for reasons of symmetry with a web browser, but explicit on the main thread because, in a shell setting, the main thread runs to completion and then the shell exits.

If the main program terminates without terminating the workers explicitly, it is unspecified whether the program exits or hangs, waiting for the workers to terminate.  (In the SpiderMonkey shell it hangs.)

## Questions

Should there be a `terminate()` call inside the worker so that a worker can terminate itself?
