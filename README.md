Corridors.js
=========

A lightweight socket.io based library to provide a clean, abstract way to manage web socket rooms and users.

## Installation

  npm install corridors --save

## Usage

corridors uses a three step process to get up and running: init, configure, and run.  The init phase requires a server (of your creation) to start socket.io.  The configure stage has a series of options that you can pick from, including whether or not to allow room keys, user authentication, maximum members per room.  There are defaults set for everything as well (see Documentation) The run stage applies all the settings.

corridors also has a reset function that destroys all settings and removes listeners, essentially restoring the state of the system to the init stage.

Example:
```javascript
  var app = require('express')();
  var express = require('express');
  var server = require('http').Server(app);
  var corridors = require('corridors');

  app.use(express.static('public'));
  server.listen(4004);

  corridors.init(server);

  corridors.configure({
  	maxMembers: 2,
    allowKeys
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

  corridors.run();
```

The client side of corridor (included in install, very small file) is essentially a method that applies special listeners to sockets.  The usage for this is very easy:
```javascript
  var socket = io.connect("http://localhost:4004");
  corridorify(socket, {
    roomKey: null, //A null room key is assigned to an open room 
    onConnect: function () {
      console.log("I am connected to the server and I registered successfully.");    
    },
    onReject: function () {
      console.log("I was rejected");
    }
  });
```

## Tests

  npm test

## Contributing

Please make sure that for any new or changed functionality, unit tests are also
provided.  I would also like to be notified if possible.

## Release History

* 0.1.0 Initial release
* 0.1.1 Updated readme
* 0.1.2 Added room key functionality, authentication hook.