const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../client")));
app.get("*", (req,res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

const players = {};

io.on("connection", socket => {
  players[socket.id] = {
    x: 100, y: 100, id: socket.id,
    health: 100
  };
  io.emit("players", players);

  socket.on("move", d => {
    if (players[socket.id]) {
      players[socket.id].x = d.x;
      players[socket.id].y = d.y;
      io.emit("players", players);
    }
  });

  socket.on("castSpell", s => {
    io.emit("spellCast", { id: socket.id, spell: s });
  });

  socket.on("hitPlayer", id => {
    if (players[id]) {
      players[id].health -= 10;
      if (players[id].health <= 0) {
        io.emit("playerDied", id);
        delete players[id];
      }
      io.emit("players", players);
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("players", players);
  });
});

server.listen(process.env.PORT || 3000);
