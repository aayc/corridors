var uuid = require('node-uuid');
var LOBBY_LOG = false;

module.exports = (function () {
	function Lobby (maxMembers) {
		this.id = uuid();
		this.maxMembers = maxMembers;
		this.openRoomId = uuid();

		/* pseudo rooms are just arrays of users.  When a pseudo room reaches maximum capacity, 
		flush() returns it as a map of users, user.id => user.  This way, rooms can be accessed
		by key without touching the actual Room object. */
		this.pseudoRooms = {};
		this.pseudoRooms[this.openRoomId] = [];

		// Don't forget to test trying to force 4 people with the same key into a room that
		// only fits 3 people.  1 person should be left behind.
		this.fullRooms = [];
		this.members = {};
		this.userIdToPseudoRoomId = {};
	}

	Lobby.prototype = {
		addMember: function (user, roomKey) {
			this.members[user.id] = user;
			user.room = this;
			if (roomKey === null) {
				/* Assign the user to the "open room" */
				this.pseudoRooms[this.openRoomId].push(user);
				this.userIdToPseudoRoomId[user.id] = this.openRoomId;

				/* If the open room is full, create a different one */
				if (this.pseudoRooms[this.openRoomId].length == this.maxMembers) {
					this.fullRooms.push(this.openRoomId);
					this.openRoomId = uuid();
					this.pseudoRooms[this.openRoomId] = [];
				}
			}
			else {
				if (!this.pseudoRooms.hasOwnProperty(roomKey)) {
					this.pseudoRooms[roomKey] = [];
				}
				this.pseudoRooms[roomKey].push(user);
				this.userIdToPseudoRoomId[user.id] = roomKey;
				if (this.pseudoRooms[roomKey].length == this.maxMembers) {
					this.fullRooms.push(roomKey);;	}
			}
		},

		_removeMember: function (user) {
			if (!this.members[user.id]) return;
			usersRoom = this.pseudoRooms[this.userIdToPseudoRoomId[user.id]];
			usersRoomId = this.userIdToPseudoRoomId[user.id];
			for (var i = 0; i < usersRoom.length; i++) {
				if (usersRoom[i].id == user.id) {
					usersRoom.splice(i, 1);
					if (usersRoom.length == 0 && usersRoomId != this.openRoomId) {
						//console.log("Delete " + usersRoomId);
						delete this.pseudoRooms[this.userIdToPseudoRoomId[user.id]];
					}
					break;
				}
			}
			delete this.members[user.id];
		},

		flushFullRooms: function () {
			/* Format for flushed rooms is [roomId, [users]] */
			var ret = {};
			for (var i = 0; i < this.fullRooms.length; i++) {
				var flushedMembers = {};
				for (var j = 0; j < this.pseudoRooms[this.fullRooms[i]].length; j++) {
					flushedMembers[this.pseudoRooms[this.fullRooms[i]][j].id] = this.pseudoRooms[this.fullRooms[i]][j];
				}
				ret[this.fullRooms[i]] = flushedMembers;

				/* Delete users in flushed rooms from this membership */
				for (var k in flushedMembers) {
					delete this.members[k];
				}

				/* Delete flushed room */
				delete this.pseudoRooms[this.fullRooms[i]];
			}
			this.fullRooms = [];
			return ret;
		},

		_getOpenPseudoRoom: function () {
			return this.pseudoRooms[this.openRoomId];
		}
	}

	return Lobby;
})();