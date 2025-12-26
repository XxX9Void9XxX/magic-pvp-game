const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve everything in client folder statically
app.use(express.static(path.join(__dirname, "../client")));

// Fallback route — any unknown request serves index.html so SPA works
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Multiplayer state
const players = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  players[socket.id] = { x: 100, y: 100, id: socket.id };
  io.emit("players", players);

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit("players", players);
    }
  });

  socket.on("castSpell", (spell) => {
    io.emit("spellCast", { id: socket.id, spell });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("players", players);
    console.log("Player disconnected:", socket.id);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server listening on port", port);
});

