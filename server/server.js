const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const PORT = process.env.PORT || 4000;

const { initGame, gameLoop, getUpdatedVelocity } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

const state = {};
const clientRooms = {};

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server); 

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../src')));

// Define socket events
io.on('connection', (client) => {
    console.log('Client connected');
  
    client.on('keydown', handleKeydown);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);

    client.on('disconnect', () => {
        console.log('Client disconnected');
        // Clean up client-related data
        const roomName = clientRooms[client.id];
        if (roomName) {
            // Remove the client from the room and cleanup if necessary
            client.leave(roomName);
            delete clientRooms[client.id];
            // Additional cleanup logic if needed
        }
    });

    function handleJoinGame(roomName) {
        const room = io.sockets.adapter.rooms.get(roomName);

        if (!room) {
            client.emit('unknownCode');
            return;
        }

        const numClients = room.size;

        if (numClients >= 2) {
            client.emit('tooManyPlayers');
            return;
        }

        clientRooms[client.id] = roomName;

        client.join(roomName);
        client.number = numClients + 1;
        client.emit('init', client.number);

        if (numClients === 1) {
            startGameInterval(roomName);
        }
    }

    function handleNewGame() {
        const roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        state[roomName] = initGame();

        client.join(roomName);
        client.number = 1;
        client.emit('init', 1);
        console.log(`New game created: ${roomName}`);
    }

    function handleKeydown(keyCode) {
        const roomName = clientRooms[client.id];
        if (!roomName) {
            return;
        }

        let parsedKeyCode;
        try {
            parsedKeyCode = parseInt(keyCode);
            if (isNaN(parsedKeyCode)) throw new Error('Invalid key code');
        } catch (e) {
            console.error('Error parsing key code:', e);
            return;
        }

        const vel = getUpdatedVelocity(parsedKeyCode);
        if (vel) {
            const player = state[roomName].players[client.number - 1];
            if (player) {
                player.vel = vel;
            }
        }
    }
});

function startGameInterval(roomName) {
    const intervalId = setInterval(() => {
        try {
            const winner = gameLoop(state[roomName]);

            if (!winner) {
                emitGameState(roomName, state[roomName]);
            } else {
                emitGameOver(roomName, winner);
                state[roomName] = null;
                clearInterval(intervalId);
            }
        } catch (error) {
            console.error('Error during game loop:', error);
            clearInterval(intervalId);
            // Optionally, notify clients of the error
        }
    }, 1000 / FRAME_RATE);
}

function emitGameState(room, gameState) {
    io.to(room).emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner) {
    io.to(room).emit('gameOver', JSON.stringify({ winner }));
}

// Serve the HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../src/index.html'));
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
