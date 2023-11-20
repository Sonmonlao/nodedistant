const Emitter = require('events');
let emitter = new Emitter();
let eventName = 'greet';
emitter.on(eventName, function () {
  console.log('Hello all!');
});

emitter.on(eventName, function () {
  console.log('Привет!');
});

emitter.emit(eventName);
