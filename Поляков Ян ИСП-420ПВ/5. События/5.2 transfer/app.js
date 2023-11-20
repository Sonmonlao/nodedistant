const Emitter = require('events');
let emitter = new Emitter();
let eventName = 'greet';
emitter.on(eventName, function (data) {
  console.log(data);
});

emitter.emit(eventName, 'Привет мир!');
