// Connect to server (auto‑detect or replace with your Render URL)
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
    preload,
    create,
    update,
  },
};

const game = new Phaser.Game(config);

let players = {};
let playerShapes = {};
let spells = [];

function preload() {
  this.input.mouse.disableContextMenu(); // prevent right‑click menu
}

function create() {
  // Movement keys
  this.keys = this.input.keyboard.addKeys({
    up: "W",
    down: "S",
    left: "A",
    right: "D",
  });

  // When server sends updated players
  socket.on("players", (serverPlayers) => {
    players = serverPlayers;
    drawPlayers(this);
  });

  // When someone casts a spell
  socket.on("spellCast", (data) => {
    createSpell(this, data.id, data.spell);
  });

  // On pointer click, cast a spell
  this.input.on("pointerdown", (pointer) => {
    const myP = players[socket.id];
    if (!myP) return;

    const dirX = pointer.worldX - myP.x;
    const dirY = pointer.worldY - myP.y;

    socket.emit("castSpell", {
      x: myP.x,
      y: myP.y,
      vx: dirX,
      vy: dirY,
    });
  });
}

function update() {
  const myPlayer = players[socket.id];
  if (!myPlayer) return;

  // WASD movement
  if (this.keys.left.isDown) myPlayer.x -= 3;
  if (this.keys.right.isDown) myPlayer.x += 3;
  if (this.keys.up.isDown) myPlayer.y -= 3;
  if (this.keys.down.isDown) myPlayer.y += 3;

  // send movement
  socket.emit("move", { x: myPlayer.x, y: myPlayer.y });

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

/* ------------------------ *
 *   SPELL RENDERING HELPERS
 * ------------------------ */

function createSpell(scene, id, spellData) {
  const circle = scene.add.circle(spellData.x, spellData.y, 8, 0x0000ff);
  scene.physics.add.existing(circle);
  spells.push(circle);

  const speed = 400;
  const mag = Math.sqrt(spellData.vx * spellData.vx + spellData.vy * spellData.vy);
  const velX = (spellData.vx / mag) * speed;
  const velY = (spellData.vy / mag) * speed;

  circle.body.setVelocity(velX, velY);

  // destroy after 1 second
  scene.time.addEvent({
    delay: 1000,
    callback: () => {
      circle.destroy();
      spells = spells.filter((s) => s !== circle);
    },
  });
}

function updateSpells() {
  // Could add collision or lifetime logic here
}
