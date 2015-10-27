module.exports = (function () {
	function Room (id, members, io, config) {
		/* Apply settings */	
		for (var key in config) {
			this[key] = config[key];
		}
		
		this.id = id;
		this.members = members;
		this.numMembers = Object.keys(this.members).length;
		this.io = io;
		for (var i in this.members) { 
			this.members[i].room = this;
			this.members[i]._socket.join(this.id);
		}

		this._waitForAll(onFinish = this.begin.bind(this));
	}

	Room.prototype = {
		_removeMember: function (user) {
			if (this.members[user.id]) {
				//console.log("ROOM REMOVED USER FROM MEMBERS");
				this.removeMember(user);
				this.members[user.id]._socket.leave(this.id);
				delete this.members[user.id];
				this.numMembers -= 1;
			}
		},

		_waitForAll: function (onFinish) {
			var flags = 0;
			var collect = (function (dummy) {
				flags += 1;
				if (flags == this.numMembers) {
					for (var i in this.members) {
						this.members[i]._socket.removeListener('ready', collect);
					}
					onFinish();
				}
			}).bind(this);
			for (var i in this.members) {
				this.members[i]._socket.on('ready', collect);
			}
			this._tellRoom('ready?', {});
		},

		_tellRoom: function (message, data) {
			this.io.to(this.id).emit(message, data);
		}
	}
	return Room;
})();