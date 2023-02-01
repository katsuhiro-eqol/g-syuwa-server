const app = require("express")();
//const server = require("https").createServer(app);
const cors = require("cors");

var fs = require('fs');
var https = require('https');
var options = {
  key: fs.readFileSync('./localhost-key.pem'),
  cert: fs.readFileSync('./localhost.pem')
};
var server = https.createServer(options, app);

const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: [ "GET", "POST" ]
	}
});

app.use(cors());

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
	res.send('Running');
});

app.get('/currentUsers', (req, res) => {
	res.json(currentUsers);
});

let currentUsers = []; //[{socketId: me, userId: userId, role: role}]
let offeringConnections = {}; //add 1/31 どれか１つacceptされたらそれ以外接続できなくするために準備する配列[{site: socketId, interpreters:[socketId(interpreters)]}]
io.on("connection", (socket) => {
    console.log('connected' + socket.id);
	socket.emit("me", socket.id);

	socket.on("disconnect", () => {
        socket.emit("destroyPeer");
        currentUsers = currentUsers.filter((item) => item.socketId !== socket.id);
		//add 1/31 siteからのdisconnectでofferingConnectionから削除する。
		if (socket.id in offeringConnections){
			delete offeringConnections[socket.id];
		}
	});

    socket.on('sharingUserInfo', (data) => {
        currentUsers.push(data);
    });

	socket.on("callUser", ({ userToCall, signalData, from, name }) => {
		io.to(userToCall).emit("callUser", { signal: signalData, from, name });
	});

	//add 1/31 offerした時のconnection.どれか１つacceptされたらそれ以外接続できなくするための配列
	socket.on("offeredInfo", (data) => {
		offeringConnections[data.site] = data.interpreters;
	});

	socket.on("answerCall", (data) => {
		io.to(data.to).emit("callAccepted", data.signal);
		//add 1/31 data.from:interpreter, data.to:site
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