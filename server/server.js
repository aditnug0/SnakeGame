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
const playerStatuses = {}; // Baru: Lacak status pemain

// Buat server HTTP
const server = http.createServer(app);

// Inisialisasi Socket.IO
const io = socketIo(server);

// Sajikan file statis dari direktori 'public'
app.use(express.static(path.join(__dirname, '../src')));

io.on('connection', (client) => {
    console.log('Klien terhubung');

    client.on('keydown', handleKeydown);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);

    client.on('disconnect', () => {
        console.log('Klien terputus');
        const roomName = clientRooms[client.id];
        if (roomName) {
            client.leave(roomName);
            delete clientRooms[client.id];
            const room = io.sockets.adapter.rooms.get(roomName);

            // Tangani kasus ketika semua pemain meninggalkan ruangan
            if (room && room.size === 0) {
                delete state[roomName];
                delete playerStatuses[roomName]; // Bersihkan status pemain
            }
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
        playerStatuses[roomName] = [true, true]; // Baru: Kedua pemain aktif pada awalnya

        client.join(roomName);
        client.number = 1;
        client.emit('init', 1);
        console.log(`Permainan baru dibuat: ${roomName}`);
    }

    function handleKeydown(keyCode) {
        const roomName = clientRooms[client.id];
        if (!roomName) {
            return;
        }

        let parsedKeyCode;
        try {
            parsedKeyCode = parseInt(keyCode);
            if (isNaN(parsedKeyCode)) throw new Error('Kode kunci tidak valid');
        } catch (e) {
            console.error('Kesalahan saat memparsing kode kunci:', e);
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
        if (!state[roomName]) return; // Periksa apakah status permainan masih ada

        try {
            const result = gameLoop(state[roomName]);
            const { winner, loser } = result;

            if (!winner) {
                emitGameState(roomName, state[roomName]);
            } else {
                emitGameState(roomName, state[roomName]);
                emitGameOver(roomName, winner, loser);

                // Opsional: mulai ulang permainan setelah penundaan singkat jika masih ada pemain
                // setTimeout(() => {
                //     if (playerStatuses[roomName].includes(true)) { // Periksa apakah ada pemain yang masih aktif
                //         state[roomName] = initGame(); // Inisialisasi ulang status permainan
                //         io.to(roomName).emit('gameState', JSON.stringify(state[roomName]));
                //     }
                // }, 5000); // Sesuaikan penundaan sesuai kebutuhan
            }
        } catch (error) {
            console.error('Kesalahan selama game loop:', error);
            clearInterval(intervalId);
        }
    }, 1000 / FRAME_RATE);
}

function emitGameState(room, gameState) {
    io.to(room).emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner, loser) {
    io.to(room).emit('gameOver', JSON.stringify({ winner, loser }));
    playerStatuses[room] = playerStatuses[room].map((status, index) => index + 1 === loser ? false : status); // Perbarui status pemain
}

// Sajikan file HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../src/index.html'));
});

// Mulai server
server.listen(PORT, () => {
    console.log(`Server mendengarkan di port ${PORT}`);
});
