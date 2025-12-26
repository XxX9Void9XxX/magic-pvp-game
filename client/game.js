const socket = io();

// Bigger world size
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

// Player settings
const PLAYER_SPEED = 5;
const MAX_HEALTH = 100;

// Phaser game config
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: { default: "arcade" },
  scene: { create, update },
};

const game = new Phaser.Game(config);

let players = {};
let playerShapes = {};
let healthTexts = {};
let spells = [];

function create() {
  this.cursors = this.input.keyboard.addKeys({
    up: "W", down: "S", left: "A", right: "D"
  });

  // Set world bounds
  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  socket.on("players", serverPlayers => {
    players = serverPlayers;
    drawPlayers(this);
  });

  socket.on("spellCast", data => {
    createSpell(this, data.id, data.spell);
  });

  socket.on("playerDied", id => {
    if (playerShapes[id]) {
      playerShapes[id].destroy();
      healthTexts[id].destroy();
      delete playerShapes[id];
      delete healthTexts[id];
      delete players[id];
    }
  });

  this.input.on("pointerdown", pointer => {
    const me = players[socket.id];
    if (!me) return;

    const dx = pointer.worldX - me.x;
    const dy = pointer.worldY - me.y;
    socket.emit("castSpell", {
      x: me.x, y: me.y, vx: dx, vy: dy
    });
  });
}

function update() {
  const me = players[socket.id];
  if (!me) return;

  let moved = false;
  if (this.cursors.left.isDown) { me.x -= PLAYER_SPEED; moved = true; }
  if (this.cursors.right.isDown) { me.x += PLAYER_SPEED; moved = true; }
  if (this.cursors.up.isDown) { me.y -= PLAYER_SPEED; moved = true; }
  if (this.cursors.down.isDown) { me.y += PLAYER_SPEED; moved = true; }

  if (moved) socket.emit("move", { x: me.x, y: me.y });

  // Camera follows this player
  this.cameras.main.startFollow(playerShapes[socket.id], true);

  updatePlayerShapes();
  updateHealthText();
  updateSpells();
}

// Draw players + health
function drawPlayers(scene) {
  for (const id in playerShapes) {
    playerShapes[id].destroy();
    healthTexts[id].destroy();
  }
  playerShapes = {};
  healthTexts = {};

  Object.values(players).forEach(p => {
    const color = (p.id === socket.id) ? 0x00ff00 : 0xff0000;
    const shape = scene.add.circle(p.x, p.y, 16, color);
    playerShapes[p.id] = shape;

    const text = scene.add.text(p.x, p.y - 30, `HP: ${p.health}`, {
      fontSize: "16px",
      fill: "#ffffff"
    });
    healthTexts[p.id] = text;
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

function updateHealthText() {
  for (const id in players) {
    const p = players[id];
    const text = healthTexts[id];
    if (text) {
      text.setText(`HP: ${p.health}`);
      text.x = p.x - 20;
      text.y = p.y - 30;
    }
  }
}

function createSpell(scene, id, s) {
  const circle = scene.add.circle(s.x, s.y, 8, 0x0000ff);
  scene.physics.add.existing(circle);
  spells.push(circle);

  const speed = 500;
  const mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
  circle.body.setVelocity((s.vx / mag) * speed, (s.vy / mag) * speed);

  scene.time.addEvent({
    delay: 1000,
    callback: () => {
      circle.destroy();
      spells = spells.filter(s2 => s2 !== circle);
    }
  });
}

function updateSpells() {
  spells.forEach(spell => {
    for (const id in players) {
      if (id !== socket.id) {
        const p = playerShapes[id];
        if (Phaser.Math.Distance.Between(spell.x, spell.y, p.x, p.y) < 20) {
          socket.emit("hitPlayer", id);
          spell.destroy();
        }
      }
    }
    spells = spells.filter(s => s.active);
  });
}
