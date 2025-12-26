const socket = io();

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

  socket.on("players", (serverPlayers) => {
    players = serverPlayers;
    drawPlayers(this);
  });

  socket.on("spellCast", (data) => {
    createSpell(this, data.id, data.spell);
  });
}

function update() {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  if (this.cursors.left.isDown) myPlayer.x -= 2;
  if (this.cursors.right.isDown) myPlayer.x += 2;
  if (this.cursors.up.isDown) myPlayer.y -= 2;
  if (this.cursors.down.isDown) myPlayer.y += 2;

  socket.emit("move", { x: myPlayer.x, y: myPlayer.y });

  if (this.input.keyboard.checkDown(this.cursors.space, 250)) {
    socket.emit("castSpell", { x: myPlayer.x, y: myPlayer.y });
  }

  updatePlayerShapes();
  updateSpells();
}

// Player helpers
function drawPlayers(scene) {
  for (const id in playerShapes) {
    playerShapes[id].destroy();
  }
  playerShapes = {};

  Object.values(players).forEach((p) => {
    const color = p.id === socket.id ? 0x00ff00 : 0xff0000;
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

// Spell helpers
function createSpell(scene, id, spellData) {
  const circle = scene.add.circle(spellData.x, spellData.y, 8, 0x0000ff);
  scene.physics.add.existing(circle);
  spells.push(circle);

  scene.tweens.add({
    targets: circle,
    x: spellData.x + 200,
    duration: 600,
    onComplete: () => {
      circle.destroy();
      spells = spells.filter((s) => s !== circle);
    },
  });
}

function updateSpells() {}
