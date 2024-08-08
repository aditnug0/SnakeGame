const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');  // Import Socket.IO

const app = express();
const PORT = process.env.PORT || 4000;

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server); 

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../src')));

// Define socket events

io.on('connection', (socket) => {
    console.log('Client connected');
  
    // // Access the transport method used
    // const transportMethod = socket.request.headers['sec-websocket-version'] ? 'WebSocket' : 'Other';
    // console.log(`Client connected using ${transportMethod}`);


});

// Serve the HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../src/index.html'));
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
