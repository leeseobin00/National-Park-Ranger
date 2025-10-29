import type { Task, TaskType, Vec2 } from './types'
import { randomTask } from './entities'

export class TaskQueue {
  tasks: Task[] = []
  nextId = 1

  constructor(private map: number[][]) {}

  ensure(count: number) {
    while (this.tasks.filter(t => t.active).length < count) {
      const type: TaskType = pick(['trash', 'rescue', 'bird'])
      this.tasks.push(randomTask(this.nextId++, type, this.map))
    }
  }

  nearest(pos: Vec2, radius = 18) {
    let best: Task | null = null
    let bestD = Infinity
    for (const t of this.tasks) {
      if (!t.active) continue
      const d = Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y)
      if (d < bestD) { best = t; bestD = d }
    }
    return best && bestD <= radius ? best : null
  }
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
