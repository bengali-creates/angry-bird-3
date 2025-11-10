import { Game } from './Game';
import './style.css';

async function startGame() {
  const game = new Game();
  await game.init();       // Wait for async initialization
  (window as any).game = game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startGame();
  });
} else {
  startGame();
}
