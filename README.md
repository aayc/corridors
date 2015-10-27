Corridors.js
=========

A lightweight socket.io based library to provide a clean, abstract way to manage web socket rooms and users.

## Installation

  npm install corridors --save

## Usage

corridors uses a three step process to get up and running: init, configure, and run.  The init phase requires a server (of your creation) to start socket.io.  The configure stage has a series of options that you can pick from, including whether or not to allow room keys, user authentication (set the "shouldAllowUser: function(user, data)" hook - default returns true always), maximum members per room.  There are defaults set for everything as well (see Documentation) The run stage applies all the settings.

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
    allowKeys: true,
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

## Notes
Room keys are more like requests than keys.  Let's say Bob and Joe want to go to a private room to chat.  They can make up their own room name, like "fort" and use that as their room key.  Thus, only people who use the room key "fort" can get into their room.  Also, allowing keys still allows "null" as a key.  Entering "null" as a key is synonymous with no preference, so the room id will be generated by uuid.  If room names conflict, the users who requested the room last will have to pick a different key.  Keys must be unique.

For more help, feel free to contact me with suggestions or questions.

## Tests

  npm test

## Contributing

Please make sure that for any new or changed functionality, unit tests are also
provided.  I would also like to be notified if possible.

## Release History

* 0.1.0 Initial release
* 0.1.1 Updated readme
* 0.1.2 Added room key functionality, authentication hook.
* 0.1.3 Added server-side registration hook (onRegistrationSuccess), fixed browser-reload bug