// Connect to server (auto-detect or replace with your Render URL)
const socket = io();

// Phaser game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
  },
  scene: {
    create,
    update,
  },
};

const game = new Phaser.Game(config);

let players = {};
let playerShapes = {};
let spells = [];

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();

  // Receive all players from server
  socket.on("players", (serverPlayers) => {
    players = serverPlayers;
    drawPlayers(this);
  });

  // When a spell is cast
  socket.on("spellCast", (data) => {
    createSpell(this, data.id, data.spell);
  });
}

function update() {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  // Movement
  if (this.cursors.left.isDown) myPlayer.x -= 2;
  if (this.cursors.right.isDown) myPlayer.x += 2;
  if (this.cursors.up.isDown) myPlayer.y -= 2;
  if (this.cursors.down.isDown) myPlayer.y += 2;

  socket.emit("move", { x: myPlayer.x, y: myPlayer.y });

  // Cast a spell with SPACE
  if (this.input.keyboard.checkDown(this.cursors.space, 250)) {
    socket.emit("castSpell", { x: myPlayer.x, y: myPlayer.y });
  }

  updatePlayerShapes();
  updateSpells();
}
