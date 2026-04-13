const app = require("./app");
const http = require("http");
const config = require("./config/config");
const connectDB = require('./config/database');

let serverPort = config.port;


connectDB();


// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const socketService = require('./utils/socketService');
socketService.init(io);

server.listen(serverPort, '0.0.0.0', () => console.log("Listening at PORT: ", serverPort));