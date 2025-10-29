import type { Tile } from './types'

export const TILE_SIZE = 24
export const MAP_W = 40 // 960 / 24
export const MAP_H = 30 // 720 / 24

export function generateMap(seed = 1): Tile[][] {
  const rnd = mulberry32(seed)
  const map: Tile[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0 as Tile))

  // Rivers: carve 1-2 meandering horizontal bands
  const rivers = 1 + Math.floor(rnd() * 2)
  for (let r = 0; r < rivers; r++) {
    let y = Math.floor(rnd() * MAP_H)
    for (let x = 0; x < MAP_W; x++) {
      y += Math.floor((rnd() - 0.5) * 2)
      y = Math.max(2, Math.min(MAP_H - 3, y))
      map[y][x] = 2
      if (rnd() < 0.5) map[y + 1][x] = 2
    }
  }

  // Trails: diagonal-ish from corners
  for (let i = 0; i < 3; i++) {
    let x = i === 0 ? 0 : i === 1 ? MAP_W - 1 : Math.floor(rnd() * MAP_W)
    let y = i === 2 ? 0 : Math.floor(rnd() * MAP_H)
    for (let k = 0; k < MAP_W + MAP_H; k++) {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H && map[y][x] !== 2) map[y][x] = 3
      x += rnd() < 0.5 ? 1 : -1
      y += rnd() < 0.5 ? 1 : -1
    }
  }

  // Trees: fill random grass with trees, sparing trails and rivers
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === 0 && Math.random() < 0.25) map[y][x] = 1
    }
  }

  // Ensure the player start area is connected to open ground
  ensureStartConnected(map)

  // Ensure a path to camp (top-right area) exists
  ensureCampConnected(map)

  return map
}

export function isWalkable(t: Tile) {
  return t === 0 || t === 3
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Carve a guaranteed corridor from start tile (1,1) to nearby open/trail
function ensureStartConnected(map: Tile[][]) {
  const sx = 1, sy = 1

  // 1) Clear a small safe pocket around start (5x5 box)
  for (let y = Math.max(0, sy - 2); y <= Math.min(MAP_H - 1, sy + 2); y++) {
    for (let x = Math.max(0, sx - 2); x <= Math.min(MAP_W - 1, sx + 2); x++) {
      if (map[y][x] !== 3) map[y][x] = 0 // keep existing trails; turn trees/water to grass
    }
  }

  // 2) Find nearest existing trail to connect to; if none, target a fallback tile
  let target: { x: number; y: number } | null = null
  let bestD = Infinity
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === 3) {
        const d = Math.hypot(x - sx, y - sy)
        if (d < bestD) { bestD = d; target = { x, y } }
      }
    }
  }
  if (!target) target = { x: Math.min(MAP_W - 1, sx + 10), y: Math.min(MAP_H - 1, sy + 6) }

  // 3) Carve a straight-ish corridor as trail from start to target (bridging trees/water)
  carveLineAsTrail(map, sx, sy, target.x, target.y)
}

function carveLineAsTrail(map: Tile[][], x0: number, y0: number, x1: number, y1: number) {
  // Bresenham's line algorithm, converting intervening tiles into trail (3)
  let dx = Math.abs(x1 - x0)
  let dy = -Math.abs(y1 - y0)
  let sx = x0 < x1 ? 1 : -1
  let sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0, y = y0
  while (true) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) map[y][x] = 3
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x += sx }
    if (e2 <= dx) { err += dx; y += sy }
  }
}

// Clear a pocket around camp and carve a corridor from start (1,1) to camp.
function ensureCampConnected(map: Tile[][]) {
  const sx = 1, sy = 1
  // Camp is drawn at approx (x=760px, y=40px) in game.ts; convert to tile
  let cx = Math.floor(760 / TILE_SIZE)
  let cy = Math.floor(40 / TILE_SIZE)
  cx = Math.max(0, Math.min(MAP_W - 1, cx))
  cy = Math.max(0, Math.min(MAP_H - 1, cy))

  // Clear a 5x5 around camp (keep existing trails)
  for (let y = Math.max(0, cy - 2); y <= Math.min(MAP_H - 1, cy + 2); y++) {
    for (let x = Math.max(0, cx - 2); x <= Math.min(MAP_W - 1, cx + 2); x++) {
      if (map[y][x] !== 3) map[y][x] = 0
    }
  }

  // Carve corridor from start to camp
  carveLineAsTrail(map, sx, sy, cx, cy)
}
