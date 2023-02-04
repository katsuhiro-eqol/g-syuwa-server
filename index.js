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
		//change 2/4
		if (!currentUsers.some(
			b => b.socketId === data.socketId
		)){
			currentUsers.push(data);
			console.log('currentUser', currentUsers)
		}
    });

	socket.on("callUser", ({ userToCall, signalData, from, name }) => {
		io.to(userToCall).emit("callUser", { signal: signalData, from, name });
	});

	socket.on("offeredInfo", (data) => {
		offeringConnections[data.site] = data.interpreters;
	});

	socket.on("answerCall", (data) => {
		io.to(data.to).emit("callAccepted", data.signal);
		console.log(offeringConnections);
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

    socket.on("callEnded", (data) => {
        io.to(data).emit("callEnded", data);
    })
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));