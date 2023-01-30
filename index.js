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

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
	res.send('Running yarn');
});

app.get('/currentUsers', (req, res) => {
	res.json(currentUsers);
});

let currentUsers = [];
io.on("connection", (socket) => {
	socket.emit("me", socket.id);

	socket.on("disconnect", () => {
        socket.emit("destroyPeer");
        currentUsers = currentUsers.filter((item) => item.socketId !== socket.id);
        console.log(currentUsers);
	});

    socket.on('sharingUserInfo', (data) => {
        currentUsers.push(data);
        console.log(currentUsers);
    });

	socket.on("callUser", ({ userToCall, signalData, from, name }) => {
		io.to(userToCall).emit("callUser", { signal: signalData, from, name });
	});

	socket.on("answerCall", (data) => {
		io.to(data.to).emit("callAccepted", data.signal)
	});

    socket.on("callEnded", (data) => {
        io.to(data).emit("callEnded", data);
    })
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));