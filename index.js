var io = require('socket.io')
var User = require('./user.js');
var Room = require('./room.js');
var Lobby = require('./lobby.js');

var clone = function (obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    var temp = obj.constructor();
    for (var key in obj) temp[key] = clone(obj[key]);
    return temp;
}

module.exports = (function () {
	
	var users = {};
	var socketIdToUserId = {};
	var rooms = {};
	var lobby;
	var registrationHandler;
	var connectionHandler;
	var defaults = {
		maxMembers: 1,
		allowKeys: true,
		shouldAllowUser: function (socket, data) {
			return true;
		},
		onRegistrationSuccess: function (user) {},
		messages: {},
		configureRoom: {
			begin: function () {},
			end: function () {},
			removeMember: function (user) {}
		},
		configureUser: {}
	};

	var settings = {};

	var corridors = {
		init: function (server) {
			io = io(server);
		},

		configure: function (options) {
			// Impose defaults
			for (var key in defaults) {
				settings[key] = defaults[key];
			}

			// Override defaults
			for (var i in options) {
				if (typeof options[i] === 'object' && options[i] !== null && settings.hasOwnProperty(i)) {
					//console.log("corridors CONFIGURE: extend " + i + " by " + options[i]);
					for (var j in options[i]) {
						settings[i][j] = options[i][j];
					}
				}
				else {
					//console.log("corridors CONFIGURE: set " + i + " to " + options[i]);
					settings[i] = options[i];
				}
			}
		},

		run: function () {
			lobby = new Lobby(settings.maxMembers);

			/* "this" is bound to the socket on which the function is invoked. */
			registrationHandler = function (data) {
				
				/* Validate user */
				var hasValidRoom = (data.roomKey === null || (!rooms.hasOwnProperty(data.roomKey) && settings.allowKeys));

				if (!settings.shouldAllowUser(this, data) || (!hasValidRoom)) {
					/* A room already exists with this key, and the room is by definition full */
					/* Thus, reject the user. */
					//console.log("DENY " + this.id + " for trying to enter " + data.roomKey);
					//console.log("\tbecause " + rooms.hasOwnProperty(data.roomKey));
					this.emit('_corridors_err_unique_room');
					return;
				}
				
				/* Create user and apply settings */
				var user = new User(this, clone(settings.configureUser));
				user.roomKey = settings.allowKeys ? data.roomKey : null;
				users[user.id] = user;
				socketIdToUserId[this.id] = user.id;
				settings.onRegistrationSuccess(user);

				/* Add user to the lobby */
				lobby.addMember(user, user.roomKey);

				/* Retrieve full rooms and flush */
				var fullRooms = lobby.flushFullRooms();
				for (var roomId in fullRooms) {
					var createdRoom = new Room(roomId, fullRooms[roomId], io, clone(settings.configureRoom));
					//console.log("NEW ROOM: " + createdRoom.id);
					rooms[createdRoom.id] = createdRoom;
				}

				corridors._setupHandlers(this);
				this.emit('_corridors_registered', {});
			};

			connectionHandler = function (socket) {
				socket.emit('_corridors_connected', { id: socket.id });
				socket.on('_corridors_register', registrationHandler.bind(socket));
			};

			io.on('connection', connectionHandler);
		},

		reset: function () {
			/* Terminate all existing connections */
			for (var userId in users) {
				users[userId]._socket.disconnect();
				delete users[userId];
			}

			/* Collapse all rooms */
			for (var roomId in rooms) {
				delete rooms[roomId];
			}

			/* Reset settings */
			settings = {};

			/* Nullify lobby */
			lobby = null;

			/* Remove on connection listener */
			var nsp = io.of('/');
			nsp.removeListener('connection', connectionHandler);
		},

		_setupHandlers: function (socket) {
			/* Set all messages defined in settings (default none). */
			for (var key in settings.messages) {
				//console.log("SOCKET CONFIGURE: on " + key + " do " + settings.messages[key]);
				(function (key, f) {
					socket.on(key, function (data) {
						var user = users[socketIdToUserId[socket.id]];
						f(user, data);
					});
				})(key, settings.messages[key]);
			}

			/* Handle disconnect */
			socket.on('disconnect', function () {
				var user = users[socketIdToUserId[socket.id]];

				/* Erase user. */
				if (user !== null  && user !== undefined && user.inRoom()) {
					user.room._removeMember(user);
					if (user.room.numMembers == 0) {
						delete rooms[user.room.id];
					}
				}
				if (socketIdToUserId.hasOwnProperty(socket.id)) {
					delete socketIdToUserId[socket.id];
					delete users[user.id];
				}
			});
		},

		_getRooms: function () { return rooms; },

		_getUsers: function () { return users; },

		_getLobby: function () { return lobby; },

		getUser: function (id) { return users[id]; },

		replyTo: function (user, message, data) {
			user._socket.emit(message, data);
		}
	}

	return corridors;
	
})();