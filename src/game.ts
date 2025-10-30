import { generateMap, TILE_SIZE, MAP_W, MAP_H, isWalkable } from "./tilemap";
import { Input } from "./input";
import { createEntity, distance, moveEntity } from "./entities";
import { TaskQueue } from "./tasks";
import type { GameState, Task } from "./types";
import { setHUD, showOverlay, hideOverlay } from "./ui";

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input = new Input();
  map = generateMap(3);
  player = createEntity(24, 24, 120);
  poacher = createEntity(760, 560, 100);
  poacherActive = false;
  safeZone = { x: 760, y: 40, r: 32 };
  tasks = new TaskQueue(this.map);
  state: GameState = {
    timeStart: performance.now(),
    timeNow: performance.now(),
    score: 0,
    poacherEscapes: 0,
    wins: false,
    loses: false,
    dayNightT: 0,
  };
  enablePoacher = false;
  finished = false;
  waterDrops: { x: number; y: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d")!;
    this.ctx = ctx;

    canvas.addEventListener("game:tap" as any, (e: any) =>
      this.handleTap(e.detail.x, e.detail.y)
    );

    // Initialize stage system
    this.startStage(1);
    this.generateWaterDrops();
  }

  start() {
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      this.update(dt);
      this.render();
      if (!this.finished) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt: number) {
    this.state.timeNow = performance.now();
    const elapsed = (this.state.timeNow - this.state.timeStart) / 1000;
    this.state.dayNightT = (elapsed % 60) / 60;

    const ax = this.input.getAxis();
    this.player.vel.x = ax.x;
    this.player.vel.y = ax.y;
    moveEntity(this.player, dt, this.map);

    // Task management
    this.tasks.ensure(5);

    // Poacher disabled during turn-based mode
    if (this.enablePoacher && !this.poacherActive && elapsed >= 45)
      this.poacherActive = true;

    if (this.enablePoacher && this.poacherActive) {
      // Poacher chases player along walkable tiles (simple steering)
      const dirx = this.player.pos.x - this.poacher.pos.x;
      const diry = this.player.pos.y - this.poacher.pos.y;
      const mag = Math.hypot(dirx, diry);
      if (mag > 1e-3) {
        this.poacher.vel.x = dirx / mag;
        this.poacher.vel.y = diry / mag;
      }
      moveEntity(this.poacher, dt, this.map);

      // If poacher reaches map edge (escape)
      if (
        this.poacher.pos.x < 4 ||
        this.poacher.pos.x > this.canvas.width - 4 ||
        this.poacher.pos.y < 4 ||
        this.poacher.pos.y > this.canvas.height - 4
      ) {
        this.state.poacherEscapes++;
        this.resetPoacher();
      }

      // If player tags poacher
      if (distance(this.player.pos, this.poacher.pos) < 18) {
        this.addScore(25);
        this.resetPoacher();
      }
    }

    // Win/Lose conditions (escape-based loss only; wins handled by stage rules)
    if (this.state.poacherEscapes >= 5) this.state.loses = true;

    // Global 60s session timer
    let timeLeft = 0;
    if (this.state.stageStartTime) {
      const elapsedStage =
        (this.state.timeNow - this.state.stageStartTime) / 1000;
      timeLeft = Math.max(0, 60 - elapsedStage);
      if (timeLeft === 0 && !this.finished) {
        this.finished = true;
        showOverlay(
          "Time Up",
          `Your score: ${this.state.score}`,
          "New Game",
          () => this.newGame()
        );
      }
    }

    // HUD
    setHUD(
      [
        `Score: ${this.state.score}`,
        `Tasks: ${this.tasks.tasks.filter((t) => t.active).length}`,
        `Time: ${Math.ceil(timeLeft)}`,
      ],
      [
        this.state.wins
          ? "Park Protected! 🏅"
          : this.state.loses
          ? "Poachers prevailed..."
          : this.poacherActive
          ? "Poacher active!"
          : "Patrol on",

        this.guidance(),
        this.dayNightLabel(),
        "",
        "Bird position + Space bar = +15",
        "Trash position + Space bar = +10",
        "Rescue at camp + Space bar = +20",
        "Tag poacher = +25",
      ]
    );
  }

  handleTap(x: number, y: number) {
    if (this.state.wins || this.state.loses) return;
    const t = this.tasks.nearest(this.player.pos, 20);
    if (!t) return;

    if (t.type === "trash") {
      t.active = false;
      this.addScore(10);
    } else if (t.type === "rescue") {
      // Toggle carry or deliver to safe zone
      if (!t.carried && distance(this.player.pos, t.pos) < 20) {
        t.carried = true;
      } else if (
        t.carried &&
        distance(this.player.pos, this.safeZone) < this.safeZone.r
      ) {
        t.active = false;
        this.addScore(20);
      }
    } else if (t.type === "bird") {
      // If nearby, take photo
      if (distance(this.player.pos, t.pos) < 80) {
        t.active = false;
        this.addScore(15);
      }
    }
  }

  resetPoacher() {
    this.poacherActive = false;
    this.poacher.pos.x = Math.random() < 0.5 ? 0 : this.canvas.width;
    this.poacher.pos.y = Math.random() * this.canvas.height;
    this.poacher.vel.x = 0;
    this.poacher.vel.y = 0;
  }

  render() {
    const g = this.ctx;
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Map tiles
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = this.map[y][x];
        const px = x * TILE_SIZE,
          py = y * TILE_SIZE;
        if (t === 0) {
          g.fillStyle = "#274227";
        } // grass
        else if (t === 1) {
          g.fillStyle = "#1f351f";
        } // trees
        else if (t === 2) {
          g.fillStyle = "#266e9c";
        } // river
        else {
          g.fillStyle = "#6b5e3b";
        } // trail
        g.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Emoji-style icons over tiles for vibe
        if (t === 1) drawEmoji(g, "🌲", px + TILE_SIZE / 2, py + TILE_SIZE / 2);
        if (false) drawEmoji(g, "💧", px + TILE_SIZE / 2, py + TILE_SIZE / 2);
      }
    }

    // Fixed water droplets
    for (const d of this.waterDrops) {
      drawEmoji(g, "💧", d.x, d.y);
    }

    // Safe zone
    g.fillStyle = "rgba(50,120,60,0.6)";
    g.beginPath();
    g.arc(this.safeZone.x, this.safeZone.y, this.safeZone.r, 0, Math.PI * 2);
    g.fill();
    drawEmoji(g, "🏕️", this.safeZone.x, this.safeZone.y);

    // Tasks
    for (const t of this.tasks.tasks) {
      if (!t.active) continue;
      drawEmoji(
        g,
        (t as any).emoji ||
          (t.type === "trash" ? "🗑️" : t.type === "rescue" ? "🦌" : "🐦"),
        t.pos.x,
        t.pos.y
      );
    }

    // Carried rescue follows player
    for (const t of this.tasks.tasks) {
      if (t.active && t.carried) {
        t.pos.x = this.player.pos.x;
        t.pos.y = this.player.pos.y - 18;
        drawEmoji(g, "🐾", t.pos.x, t.pos.y - 10);
      }
    }

    // Player
    drawAgent(g, this.player.pos.x, this.player.pos.y, "🧢", "#3da93d");

    // Poacher
    if (this.poacherActive)
      drawAgent(g, this.poacher.pos.x, this.poacher.pos.y, "🎒", "#d33");

    // Day-Night overlay
    const night = nightOpacity(this.state.dayNightT);
    if (night > 0) {
      g.fillStyle = `rgba(0,0,20,${night})`;
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Messages
    g.fillStyle = "#fff";
    g.font = "12px system-ui";
    g.fillText("Leave No Trace", 10, this.canvas.height - 10);

    if (this.state.wins) {
      banner(g, "Park Protected! 🏅");
    } else if (this.state.loses) {
      banner(g, "Too many poachers escaped...");
    }
  }

  dayNightLabel() {
    const t = this.state.dayNightT;
    if (t < 0.25) return "Morning";
    if (t < 0.5) return "Day";
    if (t < 0.75) return "Evening";
    return "Night";
  }

  guidance() {
    if (this.state.wins) return "You won! 🎉";
    if (this.state.loses) return "Try again: patrol and complete tasks";

    // If carrying a rescue
    for (const t of this.tasks.tasks) {
      if (t.active && t.carried) {
        return "Carry to camp (🏕️) and click/tap to deliver (+20)";
      }
    }

    // Nearby task guidance
    const near = this.tasks.nearest(this.player.pos, 60);
    if (near) {
      if (near.type === "trash") return "Near trash: click/tap to clean (+10)";
      if (near.type === "rescue") return "Near animal: click/tap to pick up";
      if (near.type === "bird")
        return "Near bird: click/tap to take photo (+15)";
    }

    // Poacher tip when active
    if (
      this.enablePoacher &&
      this.poacherActive &&
      distance(this.player.pos, this.poacher.pos) < 80
    ) {
      return "Close to poacher: tag to earn +25";
    }
    return "Patrol the park and complete tasks";
  }

  // Session helpers (single 60-second run)
  startStage(_n: number) {
    this.state.stage = 1;
    this.state.stageTargetScore = undefined;
    this.state.stageTimeLimitSec = 60;
    this.state.stageScore = 0;
    this.state.stageStartTime = performance.now();
  }

  addScore(points: number) {
    this.state.score += points;
    this.state.stageScore = (this.state.stageScore || 0) + points;
  }

  newGame() {
    hideOverlay();
    this.map = generateMap(3);
    this.tasks = new TaskQueue(this.map);
    this.player = createEntity(24, 24, 120);
    this.poacher = createEntity(760, 560, 100);
    this.poacherActive = false;
    this.state.score = 0;
    this.state.poacherEscapes = 0;
    this.state.wins = false;
    this.state.loses = false;
    this.state.timeStart = performance.now();
    this.state.timeNow = performance.now();
    this.finished = false;
    this.startStage(1);
    this.generateWaterDrops();
  }

  // Deterministic water droplet placement per map
  generateWaterDrops() {
    const drops: { x: number; y: number }[] = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = this.map[y][x];
        if (t === 2) {
          const h = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 25;
          if (h === 0) {
            drops.push({
              x: x * TILE_SIZE + TILE_SIZE / 2,
              y: y * TILE_SIZE + TILE_SIZE / 2,
            });
          }
        }
      }
    }
    this.waterDrops = drops;
  }
}

function drawAgent(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  hatEmoji: string,
  color: string
) {
  const r = Math.floor(TILE_SIZE * 0.45);
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  drawEmoji(g, hatEmoji, x, y - r + 2);
}

function drawEmoji(
  g: CanvasRenderingContext2D,
  e: string,
  x: number,
  y: number,
  size: number = Math.floor(TILE_SIZE * 0.9)
) {
  g.save();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${size}px serif`;
  g.fillText(e, x, y);
  g.restore();
}

function banner(g: CanvasRenderingContext2D, text: string) {
  g.save();
  const w = g.canvas.width;
  const h = g.canvas.height;
  const bh = 80;
  const by = Math.max(0, Math.floor(h / 2 - bh / 2));
  g.fillStyle = "rgba(0,0,0,0.5)";
  g.fillRect(0, by, w, bh);
  g.fillStyle = "#f0f0e8";
  g.font = "24px system-ui";
  g.textAlign = "center";
  g.fillText(text, Math.floor(w / 2), by + Math.floor(bh / 2) + 5);
  g.restore();
}

function nightOpacity(t: number) {
  // Full cycle 0..1 over 60s. Darkest near 0.85..1 and 0..0.15
  const d = Math.cos(t * Math.PI * 2) * 0.5 + 0.5; // 1..0..1
  return Math.max(0, 0.65 * (1 - d));
}
