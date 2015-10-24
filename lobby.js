var uuid = require('node-uuid');
var LOBBY_LOG = false;

module.exports = (function () {
	function Lobby (maxMembers) {
		this.id = uuid();
		this.maxMembers = maxMembers;
		this.numMembers = 0;
		this.members = {};
	}

	Lobby.prototype = {
		addMember: function (user) {
			this.members[user.id] = user;
			this.numMembers += 1;
		},

		_removeMember: function (user) {
			if (!this.members[user.id]) return;
			this.numMembers -= 1;
			delete this.members[user.id];
		},

		full: function () {
			return this.numMembers >= this.maxMembers;
		},

		flush: function () {
			var numFlushed = 0;
			var output = {};
			for (var i in this.members) { 
				this.numMembers -= 1;
				var user = this.members[i];
				numFlushed += 1;
				user.room = null;
				output[user.id] = user;
				delete this.members[user.id];
				if (numFlushed == this.maxMembers) break;
			}
			return output;
		}
	}

	return Lobby;
})();