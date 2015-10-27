var defaults = {
	roomKey: null,
	onConnect: function () {},
    onReject: function () {}
};

function corridorify (socket, options) {
    var settings = {};
    // Impose defaults
    for (var key in defaults) {
        settings[key] = defaults[key];
    }

    // Override defaults
    for (var i in options) {
        settings[i] = options[i];
    }

	socket.on('_corridors_connected', function (incoming) {
        socket.id = incoming.id;
        socket.emit('_corridors_register', {roomKey: settings.roomKey});
    });
    socket.on('_corridors_err_unique_room', function () {
        settings.onReject.call(socket);
    });

    socket.on('_corridors_registered', function () {
        settings.onConnect.call(socket);
    });
    socket.on('ready?', function () {
        socket.emit('ready', {});
    });
}