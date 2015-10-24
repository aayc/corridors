var chai = require('chai'),
    mocha = require('mocha'),
    should = chai.should();

 
var io = require('socket.io-client');
var app = require('express')();
var express = require('express');
var server = require('http').Server(app);
var corridors = require("../index.js");
corridors.init(server);

app.use(express.static('public'));
server.listen(4004);
 
describe("SINGLE USER BASIC TESTS", function () {
    var socket;
    

    before(function () {
        corridors.configure({
            maxMembers: 2,
            messages: {
            },
            configureRoom: {
                /*begin: function () {
                    this._tellRoom("start room", {});
                }*/
            },
            configureUser: {}
        });
        corridors.run();
    })
    
    beforeEach(function (done) {
        socket = io.connect("http://localhost:4004", { multiplex: false });
        socket.on('connect', function () {
            done();
        });
    });

    afterEach(function(done) {
        if (socket.connected) {
            socket.once('disconnect', function () { done(); });
            socket.disconnect();
        }
        else done();
    });

    it("should create 0 rooms for 1 user on connect", function (done) {
        Object.keys(corridors._getRooms()).length.should.equal(0);
        done();
    });

    it("should create a user on connect", function (done) {
        Object.keys(corridors._getUsers()).length.should.equal(1);
        done();
    });

    it("should delete a user on disconnect", function (done) {
        socket.disconnect();
        setTimeout(function () {
            Object.keys(corridors._getUsers()).length.should.equal(0);
            done();
        }, 10);
    });
});

describe("MULTI USER BASIC TESTS", function () {
    var sockets = [null, null, null];

    before(function () {
        corridors.reset();
        corridors.configure({
            maxMembers: 3,
            messages: {
            },
            configureRoom: {
                begin: function () {
                    this._tellRoom("start room", {});
                }
            },
            configureUser: {}
        });
        corridors.run();
    })
    
    beforeEach(function (done) {
        for (var i = 0; i < sockets.length; i++) {
            sockets[i] = io.connect("http://localhost:4004", { multiplex: false});
            sockets[i].on('ready?', function () {
                this.emit("ready", {});
            }.bind(sockets[i]));
        }
        sockets[sockets.length - 1].on('connect', function () { 
            done();
        });
        
    });

    afterEach(function(done) {
        for (var i = 0; i < sockets.length; i++) {
            if (sockets[i].connected) {
                sockets[i].disconnect();
            }
        }
        done();
    });

    it("should create 1 room for 3 users", function(done) {
        Object.keys(corridors._getRooms()).length.should.equal(1);
        done();
    });

    it("should start the room and alert all users", function (done) {
        sockets[0].on('start room', function () {
            done();
        });
    });
});

describe("MULTI ROOM BASIC TESTS", function () {

    var sockets = [null, null, null, null, null, null, null];
    before(function () {
        corridors.reset();
        corridors.configure({
            maxMembers: 2,
            messages: {},
            configureRoom: {},
            configureUser: {}
        });
        corridors.run();
    });

    beforeEach(function (done) {
        var flags = 0;
        for(var i = 0; i < sockets.length; i++) {
            sockets[i] = io.connect("http://localhost:4004", {multiplex: false});
            sockets[i].on('ready?', function () {
                this.emit('ready', {});
            }.bind(sockets[i]));
            sockets[i].on('connect', function () {
                flags += 1;
                if (flags == sockets.length) done();
            });
        }
    });

    afterEach(function (done) {
        for (var i = 0; i < sockets.length; i++) {
            if (sockets[i].connected) sockets[i].disconnect();
        }
        done();
    });

    it("should create 3 rooms for 7 users", function (done) {
        Object.keys(corridors._getRooms()).length.should.equal(3);
        done();
    });

    it("should have 1 user left over in the lobby", function (done) {
       corridors._getLobby().numMembers.should.equal(1);
       done();
    });
});

describe("INTENSE CONCURRENCY TESTS", function () {
    var sockets = [];
    var numUsers = 41;
    before(function () {
        corridors.reset();
        corridors.configure({
            maxMembers: 2,
            messages: {},
            configureRoom: {},
            configureUser: {}
        });
        corridors.run();
    });

    beforeEach(function (done) {
        var flags = 0;
        for(var i = 0; i < numUsers; i++) {
            var socket = io.connect("http://localhost:4004", {multiplex: false});
            sockets.push(socket);
            sockets[i].on('ready?', function () {
                this.emit('ready', {});
            }.bind(sockets[i]));
            sockets[i].on('connect', function () {
                flags += 1;
                if (flags == numUsers) done();
            })
        }
    });

    afterEach(function (done) {
        for (var i = 0; i < sockets.length; i++) {
            if (sockets[i].connected) sockets[i].disconnect();
        }
        sockets = [];
        done();
    });

    it("should have 1 user left over in the lobby", function (done) {
       corridors._getLobby().numMembers.should.equal(1);
       done();
    });

    it("should have 20 rooms running concurrently", function (done) {
        Object.keys(corridors._getRooms()).length.should.equal(20);
        done();
    });
})


describe("ROOM COMMUNICATION TESTS", function () {

    var sockets = [null, null];
    before(function () {
        corridors.reset();
        corridors.configure({
            maxMembers: 2,
            messages: {
                "echo": function (user, data) {
                    corridors.replyTo(user, "echo", {secret: data.secret});
                },
                "tell everybody this": function (user, data) {
                    user.room._tellRoom("hey listen", {secret: data.secret});
                }
            },
            configureRoom: {},
            configureUser: {}
        });
        corridors.run();
    });

    beforeEach(function (done) {
        for(var i = 0; i < sockets.length; i++) {
            sockets[i] = io.connect("http://localhost:4004", {multiplex: false});
            sockets[i].on('ready?', function () {
                this.emit('ready', {});
            }.bind(sockets[i]));
        }
        sockets[sockets.length - 1].on('connect', function () { 
            done();
        });
    });

    afterEach(function (done) {
        for (var i = 0; i < sockets.length; i++) {
            if (sockets[i].connected) sockets[i].disconnect();
        }
        done();
    });

    it("should echo back hello", function (done) {
        sockets[0].on("echo", function (data) {
            data.secret.should.equal("hello");
            done();
        });
        sockets[0].emit("echo", {secret: "hello"});
    });

    it("should tell everybody in the room hey", function (done) {
        sockets[0].on("hey listen", function (data) {
            data.secret.should.equal("hey");
            done();
        });
        sockets[1].emit("tell everybody this", {secret: "hey"})
    });

    it("should echo back a message to tell everybody yo", function (done) {
        sockets[0].on("echo", function (data) {
            if (data.secret == "do it") {
                sockets[0].emit("tell everybody this", {secret: "yo"});
            }
        });
        sockets[1].on("hey listen", function (data) {
            data.secret.should.equal("yo");
            done();
        })
        sockets[0].emit("echo", {secret: "do it"});
    })
});

describe("ROOM DATA STORAGE TESTS", function () {
    var sockets = [null, null];
    before(function () {
        corridors.reset();
        corridors.configure({
            maxMembers: 2,
            messages: {
                "echo": function (user, data) {
                    corridors.replyTo(user, "echo", {secret: data.secret});
                },
                "broadcast": function (user, data) {
                    user.room._tellRoom("hey listen", {secret: data.secret});
                },
                "store this": function (user, data) {
                    user.room.storage.push(data.secret);
                    corridors.replyTo(user, "done storing", {numStored: user.room.storage.length});
                },
                "tell me your secrets": function (user, data) {
                    corridors.replyTo(user, "secrets", {secrets: user.room.storage});
                }
            },
            configureRoom: {
                storage: []
            },
            configureUser: {}
        });
        corridors.run();
    });

    beforeEach(function (done) {
        for(var i = 0; i < sockets.length; i++) {
            sockets[i] = io.connect("http://localhost:4004", {multiplex: false});
            sockets[i].on('ready?', function () {
                this.emit('ready', {});
            }.bind(sockets[i]));
        }
        sockets[sockets.length - 1].on('connect', function () { 
            done();
        });
    });

    afterEach(function (done) {
        for (var i = 0; i < sockets.length; i++) {
            if (sockets[i].connected) sockets[i].disconnect();
        }
        done();
    });

    it("should have 1 room", function (done) {
        Object.keys(corridors._getRooms()).length.should.equal(1);
        done();
    });

    it("should store something", function (done) {
        sockets[0].emit("store this", {secret: "secret 1"});
        sockets[0].on('done storing', function (data) {
            data.numStored.should.equal(1);
            done();
        });
    });

    it("should see no duplicates from last test", function (done) {
        sockets[0].emit("store this", {secret: "secret 2"});
        sockets[0].on('done storing', function (data) {
            data.numStored.should.equal(1);
            done();
        });
    });

    it("should have the roommate see storage", function (done) {
        sockets[0].emit("store this", {secret: "secret 1"});
        sockets[0].on('done storing', function (data) {
            sockets[1].emit("tell me your secrets", {});
            sockets[1].once('secrets', function (data) {
                data.secrets[0].should.equal("secret 1");
                sockets[0].emit("tell me your secrets", {});
                sockets[0].on("secrets", function (data) {
                    data.secrets[0].should.equal("secret 1");
                    done();
                });
            });
        });
    });
});

describe("USER DATA STORAGE TESTS", function () {
    var sockets = [null, null];
    before(function () {
        corridors.reset();
        corridors.configure({
            maxMembers: 2,
            messages: {
                "echo": function (user, data) {
                    corridors.replyTo(user, "echo", {secret: data.secret});
                },
                "broadcast": function (user, data) {
                    user.room._tellRoom("hey listen", {secret: data.secret});
                },
                "pocket": function (user, data) {
                    user.storage.push(data.secret);
                    corridors.replyTo(user, "done storing", {numStored: user.storage.length});
                },
                "my pocket": function (user, data) {
                    corridors.replyTo(user, "secrets", {secrets: user.storage});
                }
            },
            configureRoom: {
            },
            configureUser: {
                storage: []
            }
        });
        corridors.run();
    });

    beforeEach(function (done) {
        for(var i = 0; i < sockets.length; i++) {
            sockets[i] = io.connect("http://localhost:4004", {multiplex: false});
            sockets[i].on('ready?', function () {
                this.emit('ready', {});
            }.bind(sockets[i]));
        }
        sockets[sockets.length - 1].on('connect', function () { 
            done();
        });
    });

    afterEach(function (done) {
        for (var i = 0; i < sockets.length; i++) {
            if (sockets[i].connected) sockets[i].disconnect();
        }
        done();
    });

    it("should have 1 room", function (done) {
        Object.keys(corridors._getRooms()).length.should.equal(1);
        done();
    });

    it("should store something", function (done) {
        sockets[0].emit("pocket", {secret: "secret 1"});
        sockets[0].on('done storing', function (data) {
            data.numStored.should.equal(1);
            done();
        });
    });

    it("should let user see his/her pocket", function (done) {
        sockets[0].emit("pocket", {secret: "secret 2"});
        sockets[0].on('done storing', function (data) {
            sockets[0].on('secrets', function (data) {
                data.secrets[0].should.equal("secret 2");
                done();
            });
            sockets[0].emit("my pocket", {});
        });
    });

    it("should not let other guy see pocket", function (done) {
        sockets[0].emit("store this", {secret: "secret 1"});
        sockets[0].on('done storing', function (data) {
            sockets[1].emit("my pocket", {});
            sockets[1].once('secrets', function (data) {
                data.secrets.length.should.equal(0);
                done();
            });
        });
    });
});

describe("ROOM DATA MUTATION TESTS", function () {
    var sockets = [null, null];
    before(function () {
        corridors.reset();
        corridors.configure({
            maxMembers: 2,
            messages: {
                "echo": function (user, data) {
                    corridors.replyTo(user, "echo", {secret: data.secret});
                },
                "broadcast": function (user, data) {
                    user.room._tellRoom("hey listen", {secret: data.secret});
                },
                "store this": function (user, data) {
                    user.room.storage = data.secret;
                    corridors.replyTo(user, "done storing", {});
                },
                "what is it": function (user, data) {
                    corridors.replyTo(user, "secret", {secret: user.room.storage});
                }
            },
            configureRoom: {
            },
            configureUser: {
                storage: 0
            }
        });
        corridors.run();
    });

    beforeEach(function (done) {
        for(var i = 0; i < sockets.length; i++) {
            sockets[i] = io.connect("http://localhost:4004", {multiplex: false});
            sockets[i].on('ready?', function () {
                this.emit('ready', {});
            }.bind(sockets[i]));
        }
        sockets[sockets.length - 1].on('connect', function () { 
            done();
        });
    });

    afterEach(function (done) {
        for (var i = 0; i < sockets.length; i++) {
            if (sockets[i].connected) sockets[i].disconnect();
        }
        done();
    });

    it("should store something", function (done) {
        sockets[0].emit("store this", {secret: 3});
        sockets[0].on('done storing', function (data) {
            sockets[0].on('secret', function (data) {
                data.secret.should.equal(3);
                done();
            })
            sockets[0].emit('what is it', {});
        });
    });

    it("should have one change storage and other see changed", function (done) {
        sockets[0].emit("store this", {secret: 3});
        sockets[0].once('done storing', function (data) {
            sockets[1].emit("store this", {secret: 4});
            sockets[1].once('done storing', function (data) {
                sockets[0].emit('what is it');
                sockets[0].on('secret', function (data) {
                    data.secret.should.equal(4);
                    done();
                });
            });
        });
    });
});

