const socket = io();

// World settings
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;
const PLAYER_SPEED = 200;
const RESPAWN_DELAY = 2000;

// Phaser config
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: { default: "arcade" },
  scene: { preload, create, update },
};

const game = new Phaser.Game(config);

let players = {};
let playerSprites = {};
let healthTexts = {};
let spells = [];

function preload() {
  this.input.mouse.disableContextMenu();
}

function create() {
  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  this.keys = this.input.keyboard.addKeys({
    W: "W", A: "A", S: "S", D: "D"
  });

  socket.on("players", serverPlayers => {
    players = serverPlayers;
    drawPlayers(this);
  });

  socket.on("spellCast", data => {
    createSpell(this, data.id, data.spell);
  });

  socket.on("respawnPlayer", playerData => {
    players[playerData.id] = playerData;
    drawPlayers(this);
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

function update(time, delta) {
  const me = players[socket.id];
  if (!me) return;

  const sprite = playerSprites[socket.id];
  if (!sprite) return;

  sprite.body.setVelocity(0);

  if (this.keys.A.isDown) sprite.body.setVelocityX(-PLAYER_SPEED);
  if (this.keys.D.isDown) sprite.body.setVelocityX(PLAYER_SPEED);
  if (this.keys.W.isDown) sprite.body.setVelocityY(-PLAYER_SPEED);
  if (this.keys.S.isDown) sprite.body.setVelocityY(PLAYER_SPEED);

  if (sprite.body.velocity.length() > 0) {
    socket.emit("move", { x: sprite.x, y: sprite.y });
  }

  this.cameras.main.startFollow(sprite);

  updatePlayers();
  updateHealth();
  updateSpells();
}

// Draw all players
function drawPlayers(scene) {
  for (const id in playerSprites) {
    playerSprites[id].destroy();
    healthTexts[id].destroy();
  }
  playerSprites = {};
  healthTexts = {};

  Object.values(players).forEach(p => {
    const sprite = scene.physics.add.circle(p.x, p.y, 20,
      p.id === socket.id ? 0x00ff00 : 0xff0000);
    sprite.body.setCollideWorldBounds(true);
    playerSprites[p.id] = sprite;

    const text = scene.add.text(p.x, p.y - 30, "HP: " + p.health, {
      fontSize: "16px", fill: "#fff"
    });
    healthTexts[p.id] = text;
  });
}

function updatePlayers() {
  for (const id in players) {
    const p = players[id];
    const sprite = playerSprites[id];
    if (sprite) {
      sprite.x = p.x;
      sprite.y = p.y;
    }
  }
}

function updateHealth() {
  for (const id in players) {
    const p = players[id];
    const text = healthTexts[id];
    if (text) {
      text.setText("HP: " + p.health);
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

  circle.body.setVelocity((s.vx / mag) * speed,
                          (s.vy / mag) * speed);

  scene.time.addEvent({
    delay: 1000,
    callback: () => {
      circle.destroy();
      spells = spells.filter(x => x !== circle);
    }
  });
}

function updateSpells() {
  spells.forEach(spell => {
    for (const id in playerSprites) {
      if (id !== socket.id) {
        const target = playerSprites[id];
        if (Phaser.Math.Distance.Between(spell.x, spell.y,
            target.x, target.y) < 24) {
          socket.emit("hitPlayer", id);
          spell.destroy();
        }
      }
    }
  });
}
