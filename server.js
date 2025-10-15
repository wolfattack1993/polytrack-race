// filepath: /workspaces/polytrack-game/server.js
require('dotenv').config();
// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Initialize io here

app.use(express.static('public'));

let players = {}; // Stores all connected player data

io.on('connection', (socket) => {
    console.log('A user connected with ID:', socket.id);

    // Secure admin code check
    socket.on('adminCodeAttempt', (code) => {
        if (code === process.env.ADMIN_CODE) {
            socket.emit('adminAccessGranted');
        } else {
            socket.emit('adminAccessDenied');
        }
    });

    // Create a new player object
    players[socket.id] = {
        id: socket.id,
        username: 'Guest',
        position: { x: Math.random() * 4 - 2, y: 0, z: Math.random() * 4 - 2 },
        rotation: { x: 0, y: 0, z: 0 }
    };

    socket.emit('init', { id: socket.id, players });
    socket.broadcast.emit('playerJoined', players[socket.id]);

    socket.on('login', (username) => {
        if (players[socket.id]) {
            players[socket.id].username = username;
            console.log(`${socket.id} is now known as ${username}`);
        }
    });

    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            players[socket.id].rotation = data.rotation;
            socket.broadcast.emit('playerUpdate', players[socket.id]);
        }
    });

    socket.on('adminBroadcast', (message) => {
        console.log(`Admin broadcast: ${message}`);
        io.emit('broadcastMessage', message);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
