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
    drawPlayers(this);   // **calls Player Rendering Helpers**
  });

  // When a spell is cast
  socket.on("spellCast", (data) => {
    createSpell(this, data.id, data.spell);  // **calls Spell Rendering Helpers**
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

  // Update positions of shapes every frame
  updatePlayerShapes();  
  updateSpells();
}

/* ------------------------- *
 *   PLAYER RENDERING HELPERS
 * ------------------------- */

function drawPlayers(scene) {
  // Remove old shapes
  for (const id in playerShapes) {
    playerShapes[id].destroy();
  }
  playerShapes = {};

  Object.values(players).forEach((p) => {
    const color = p.id === socket.id ? 0x00ff00 : 0xff0000; // green = you, red = others
    const circle = scene.add.circle(p.x, p.y, 16, color);
    playerShapes[p.id] = circle;
  });
}

function updatePlayerShapes() {
  for (const id in players) {
    const p = players[id];
    const shape = playerShapes[id];
    if (shape) {
      shape.x = p.x;
      shape.y = p.y;
    }
  }
}

/* ------------------------ *
 *   SPELL RENDERING HELPERS
 * ------------------------ */

function createSpell(scene, id, spellData) {
  const circle = scene.add.circle(spellData.x, spellData.y, 8, 0x0000ff);
  scene.physics.add.existing(circle);
  spells.push(circle);

  scene.tweens.add({
    targets: circle,
    x: spellData.x + 200,   // example travel distance
    duration: 600,
    onComplete: () => {
      circle.destroy();
      spells = spells.filter((s) => s !== circle);
    },
  });
}

function updateSpells() {
  // If you want collision or lifetime logic later, do it here
}
