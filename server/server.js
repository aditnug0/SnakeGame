const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const PORT = process.env.PORT || 4000;

const { initGame, gameLoop, getUpdatedVelocity } = require('./game');
const { FRAME_RATE, GRID_SIZE } = require('./constants');

const state = {};
const clientRooms = {};
const usernames = {};

const GLOBAL_ROOM_NAME = 'global';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../src')));

io.on('connection', (client) => {
    console.log('Client connected');

    client.on('setUsername', handleSetUsername);
    client.on('keydown', handleKeydown);
    client.on('startGame', handleStartGame);

    client.on('disconnect', () => {
        console.log('Client disconnected');
        const roomName = clientRooms[client.id];
        if (roomName) {
            client.leave(roomName);
            delete clientRooms[client.id];
            delete usernames[client.id];
            const room = io.sockets.adapter.rooms.get(roomName);

            if (room && room.size === 0) {
                delete state[roomName];
            }
        }
    });

    function handleSetUsername(username) {
        usernames[client.id] = username;
        client.emit('usernameSet', username);
    }

    function handleStartGame() {
        clientRooms[client.id] = GLOBAL_ROOM_NAME;
        client.join(GLOBAL_ROOM_NAME);
        client.number = (io.sockets.adapter.rooms.get(GLOBAL_ROOM_NAME) || []).size;

        client.emit('init', client.number);

        if (!state[GLOBAL_ROOM_NAME]) {
            state[GLOBAL_ROOM_NAME] = initGame(GRID_SIZE, 4); // Initialize with 8 players
        }

        if (client.number === 1) {
            startGameInterval(GLOBAL_ROOM_NAME);
        }
    }

    function handleKeydown(keyCode) {
        const roomName = clientRooms[client.id];
        if (!roomName) return;

        const vel = getUpdatedVelocity(keyCode);
        if (vel) {
            state[roomName].players[client.number - 1].vel = vel;
        }
    }
});

function startGameInterval(roomName) {
    const intervalId = setInterval(() => {
        const winner = gameLoop(state[roomName]);

        if (winner) {
            io.to(roomName).emit('leaderboard', {
                scores: state[roomName].scores,
                usernames: usernames
            });
            io.to(roomName).emit('gameOver', winner);
            clearInterval(intervalId);
        } else {
            io.to(roomName).emit('gameState', JSON.stringify(state[roomName]));
        }
    }, 1000 / FRAME_RATE);
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../src/index.html'));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
