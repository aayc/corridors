Corridors.js
=========

A lightweight socket.io based library to provide a clean, abstract way to manage web socket rooms and users.

## Installation

  npm install corridors --save

## Usage

corridors uses a three step process to get up and running: init, configure, and run.
```javascript
  var corridors = require('corridors');

  corridors.init(server);

  corridors.configure({
  	maxMembers: 2,
    messages: {
    	testMessage: function (user, data) {
    		console.log("hello, my name is " + user.room.customName);
    	}
    },
    configureRoom: {
    	customName: "Bob!"
    },
    configureUser: {}
  });

  corridors.run();`
```
## Tests

  npm test

## Contributing

Please make sure that for any new or changed functionality, unit tests are also
provided.  I would also like to be notified if possible.

## Release History

* 0.1.0 Initial release
* 0.1.1 Updated readme