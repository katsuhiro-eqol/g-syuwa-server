const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");

const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: [ "GET", "POST" ]
	}
});

app.use(cors());

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
	res.send('Running yarn');
});

let currentUsers = []; //[{socketId: me, userId: userId, role: role}]
app.get('/currentUsers', (req, res) => {
	res.json(currentUsers);
});

app.get('/currentUsers/initialize', (req, res) => {
	currentUsers = [];
	res.send('currentUsers initialized');
});

let offeringConnections = {};
io.on("connection", (socket) => {
    console.log('connected' + socket.id);
	socket.emit("me", socket.id);

	socket.on("disconnect", () => {
		console.log('disconnected' + socket.id);
        socket.emit("destroyPeer");
        currentUsers = currentUsers.filter((item) => item.socketId !== socket.id);
		console.log('currentUsers: ',currentUsers);
		//add 2/3 site/deafがdisconnectしたとき、offer先をdisusedする
		console.log('offeringConnections[socket.id]: ', offeringConnections[socket.id])

		if (socket.id in offeringConnections){
		const interpreters = offeringConnections[socket.id];
			interpreters.map(interpreter => {
				io.to(interpreter).emit("disusedConnection", socket.id);
				console.log('disused', interpreter);
			})
		}
		if (socket.id in offeringConnections){
			delete offeringConnections[socket.id];
		}
	});

    socket.on('sharingUserInfo', (data) => {
		//add 2/14
		currentUsers = currentUsers.filter((item) => !(item.userId === data.userId && item.role === data.role));
		//change 2/4
		if (!currentUsers.some(
			b => b.socketId === data.socketId
		)){
			currentUsers.push(data);
			console.log('currentUser', currentUsers)
		}

    });

	socket.on("callUser1", ({ userToCall, signalData, from, name, service }) => {
		io.to(userToCall).emit("callUser1", { signal: signalData, from, name, service });
	});
	socket.on("callUser2", ({ userToCall, signalData, from, name }) => {
		io.to(userToCall).emit("callUser2", { signal: signalData, from, name });
	});
	socket.on("callUser3", ({ userToCall, signalData, from, name }) => {
		io.to(userToCall).emit("callUser3", { signal: signalData, from, name });
	});

	socket.on("offeredInfo", (data) => {
		offeringConnections[data.site] = data.interpreters;
	});

	socket.on("answerCall1", (data) => {
		io.to(data.to).emit("callAccepted1", data.signal);
		console.log('offeringConnections', offeringConnections);
		if (data.to in offeringConnections){
			const interpreters = offeringConnections[data.to];
			const disusedInterpreters = interpreters.filter((item) => item !== data.from);
			if (disusedInterpreters.length !== 0){
				disusedInterpreters.map(interpreter => {
					io.to(interpreter).emit("disusedConnection", data.to);
					console.log('disused', interpreter);
				})
			}
		}
	});

	socket.on("answerCall2", (data) => {
		io.to(data.to).emit("callAccepted2", data.signal);
	});
	socket.on("answerCall3", (data) => {
		io.to(data.to).emit("callAccepted3", data.signal);
	});

    socket.on("callEnded1", (data) => {
        io.to(data).emit("callEnded1", data);
    });
    socket.on("callEnded2", (data) => {
        io.to(data).emit("callEnded2", data);
    });
    socket.on("callEnded3", (data) => {
        io.to(data).emit("callEnded3", data);
    });
	//2/11
	socket.on("startRecord", (data) => {
		io.to(data).emit("startRecord", data);
	});
	socket.on("stopRecord", (data) => {
		io.to(data).emit("stopRecord", data);
	});
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));