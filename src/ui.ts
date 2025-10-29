export function setHUD(left: string[], right: string[]) {
  const l = document.getElementById('hud-left')!
  const r = document.getElementById('hud-right')!
  l.textContent = left.join('  |  ')
  r.textContent = right.join('  |  ')
}

export function showOverlay(title: string, text: string, buttonLabel?: string, onClick?: () => void) {
  const ov = document.getElementById('overlay') as HTMLDivElement
  const h2 = document.getElementById('overlay-title') as HTMLHeadingElement
  const p = document.getElementById('overlay-text') as HTMLParagraphElement
  const btn = document.getElementById('overlay-btn') as HTMLButtonElement
  h2.textContent = title
  p.textContent = text
  if (buttonLabel) {
    btn.textContent = buttonLabel
    btn.style.display = 'inline-block'
    btn.onclick = () => onClick && onClick()
  } else {
    btn.style.display = 'none'
    btn.onclick = null as any
  }
  ov.style.display = 'flex'
}

export function hideOverlay() {
  const ov = document.getElementById('overlay') as HTMLDivElement
  ov.style.display = 'none'
}
