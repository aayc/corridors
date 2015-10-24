var socket;
var _io_lib; 
var settings = {
	messages: {}
};

var corridors = {
	init: function (io) {
		_io_lib = io;
		console.log("CORRIDORS SETUP: SUCCESS");
	},

	configure: function (options) {
		// Override settings
		for (var i in options) {
			//console.log("CORRIDORS CONFIGURE: set " + i + " to " + options[i]);
			if (typeof options[i] === 'object' && options[i] !== null && settings.hasOwnProperty(i)) {
				for (var j in options[i]) {
					settings[i][j] = options[i][j];
				}
			}
			else settings[key] = options[key];
		}
	},

	run: function () {
		socket = _io_lib();
		for (var i in settings.messages) {
			//console.log("SOCKET CONFIGURE: on " + i + " do as specified");
			socket.on(i, settings.messages[i]);
		}

		socket.on('ready?', function (d) { socket.emit('ready', {}); })
	},

	emit: function (message, dat) {
		socket.emit(message, dat);
	}
}