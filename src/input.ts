export class Input {
  keys = new Set<string>()
  touchStart: { x: number; y: number } | null = null
  touchDelta = { x: 0, y: 0 }

  constructor(private el: HTMLElement | Window = window) {
    this.el.addEventListener('keydown', (e: Event) => this.keys.add((e as KeyboardEvent).key.toLowerCase()))
    this.el.addEventListener('keyup', (e: Event) => this.keys.delete((e as KeyboardEvent).key.toLowerCase()))

    const canvas = document.getElementById('game') as HTMLCanvasElement
    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0]
      this.touchStart = { x: t.clientX, y: t.clientY }
    }, { passive: true })
    canvas.addEventListener('touchmove', e => {
      if (!this.touchStart) return
      const t = e.touches[0]
      this.touchDelta.x = t.clientX - this.touchStart.x
      this.touchDelta.y = t.clientY - this.touchStart.y
    }, { passive: true })
    canvas.addEventListener('touchend', () => {
      this.touchStart = null
      this.touchDelta.x = 0
      this.touchDelta.y = 0
    })

    canvas.addEventListener('pointerdown', e => {
      const ev = new CustomEvent('game:tap', { detail: { x: e.offsetX, y: e.offsetY } })
      canvas.dispatchEvent(ev)
    })
  }

  getAxis() {
    let x = 0, y = 0
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1

    if (this.touchStart) {
      const dx = this.touchDelta.x, dy = this.touchDelta.y
      const mag = Math.hypot(dx, dy)
      if (mag > 8) { x += dx / mag; y += dy / mag }
    }
    const mag = Math.hypot(x, y)
    if (mag > 1e-3) { x /= mag; y /= mag }
    return { x, y }
  }
}
