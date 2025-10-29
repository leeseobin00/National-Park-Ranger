import { Game } from './game'

const canvas = document.getElementById('game') as HTMLCanvasElement
const game = new Game(canvas)

// iOS requires user gesture; start immediately for desktop
requestAnimationFrame(() => game.start())

// Expose for console debugging
// @ts-ignore
window.__game = game
