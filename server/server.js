const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

// Store all players
const players = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Add new player
  players[socket.id] = { x: 100, y: 100, id: socket.id };

  // Tell all clients about all players
  io.emit("players", players);

  // Player movement
  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit("players", players);
    }
  });

  // Handle spell casting
  socket.on("castSpell", (spell) => {
    io.emit("spellCast", { id: socket.id, spell });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("players", players);
    console.log("Player disconnected:", socket.id);
  });
});

server.listen(port, () => {
  console.log("Server listening on port", port);
});
