import type { Entity, Task, TaskType, Vec2 } from './types'
import { isWalkable, MAP_H, MAP_W, TILE_SIZE } from './tilemap'

export function createEntity(x: number, y: number, speed = 100): Entity {
  return { pos: { x, y }, vel: { x: 0, y: 0 }, speed }
}

export function moveEntity(e: Entity, dt: number, map: number[][]) {
  const nx = e.pos.x + e.vel.x * e.speed * dt
  const ny = e.pos.y + e.vel.y * e.speed * dt
  const tx = Math.floor(nx / TILE_SIZE)
  const ty = Math.floor(ny / TILE_SIZE)
  if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H && isWalkable(map[ty][tx] as any)) {
    e.pos.x = nx
    e.pos.y = ny
  }
}

export function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function randomTask(id: number, type: TaskType, map: number[][]): Task {
  for (let tries = 0; tries < 200; tries++) {
    const x = Math.floor(Math.random() * MAP_W)
    const y = Math.floor(Math.random() * MAP_H)
    if (isWalkable(map[y][x] as any)) {
      return { id, type, pos: { x: x * TILE_SIZE + 8, y: y * TILE_SIZE + 8 }, active: true }
    }
  }
  return { id, type, pos: { x: 24, y: 24 }, active: true }
}
