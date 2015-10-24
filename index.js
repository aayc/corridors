var io = require('socket.io')
var User = require('./user.js');
var Room = require('./room.js');
var Lobby = require('./lobby.js');

var clone = function (obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    var temp = obj.constructor(); // give temp the original obj's constructor
    for (var key in obj) temp[key] = clone(obj[key]);
    return temp;
}

module.exports = (function () {
	
	var users = {};
	var socketIdToUserId = {};
	var rooms = {};
	var lobby;
	var connectionHandler;
	var defaults = {
		maxMembers: 1,
		messages: {},
		configureRoom: {
			// Default settings:
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

			connectionHandler = function (socket) {
				/* Create user and apply settings */
				var user = new User(socket, clone(settings.configureUser));
				users[user.id] = user;
				socketIdToUserId[socket.id] = user.id;

				/* Add user to the lobby */
				lobby.addMember(user);
				user.room = lobby;

				/* If the lobby is now full, then flush to room */
				if (lobby.full()) {
					var createdRoom = new Room(corridors, lobby.flush(), io, clone(settings.configureRoom));
					rooms[createdRoom.id] = createdRoom;
				}

				corridors._setupHandlers(socket);
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
				user.room._removeMember(user);
				if (user.room.numMembers == 0) {
					//console.log("ROOM " + user.room.id + " DESTROYED");
					delete rooms[user.room.id];
				}
				delete socketIdToUserId[socket.id];
				delete users[user.id];
				//console.log("REMOVE USER, # of users: " + Object.keys(users).length);
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