export type Tile = 0 | 1 | 2 | 3 // 0 grass, 1 tree, 2 river, 3 trail

export interface Vec2 { x: number; y: number }

export type TaskType = 'trash' | 'rescue' | 'bird'

export interface Task {
  id: number
  type: TaskType
  pos: Vec2
  active: boolean
  carried?: boolean
  emoji?: string
}

export interface Entity {
  pos: Vec2
  vel: Vec2
  speed: number
}

export interface GameState {
  timeStart: number
  timeNow: number
  score: number
  poacherEscapes: number
  wins: boolean
  loses: boolean
  dayNightT: number // 0..1 cycles every 60s
  // Stage system
  stage?: number
  stageStartTime?: number
  stageTimeLimitSec?: number
  stageTargetScore?: number
  stageScore?: number
}

export {}
