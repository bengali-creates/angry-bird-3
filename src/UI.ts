import * as PIXI from 'pixi.js';
import type { Game } from './Game';
import type { BirdType } from './Bird';

interface EndScreenData {
  title: string;
  level: number;
  score: number;
  stars: number;
  isWin: boolean;
}

export class UI {
  private game: Game;
  private container: PIXI.Container;
  private scoreText!: PIXI.Text;
  private birdCountText!: PIXI.Text;
  private endScreenContainer: PIXI.Container;
  
  // State tracking
  private activeEndScreenData: EndScreenData | null = null;

  constructor(game: Game, virtualWidth: number, virtualHeight: number) {
    this.game = game;
    this.container = new PIXI.Container();
    this.endScreenContainer = new PIXI.Container();
    
    // Initialize with empty text
    this.scoreText = new PIXI.Text('');
    this.birdCountText = new PIXI.Text('');

    this.container.addChild(this.scoreText);
    this.container.addChild(this.birdCountText);
    this.container.addChild(this.endScreenContainer);
    this.endScreenContainer.visible = false;

    // Force an initial resize to set styles
    this.resize(window.innerWidth, window.innerHeight);
  }

  updateScore(score: number): void {
    this.scoreText.text = `Score: ${score}`;
  }
  
  updateBirdCount(count: number): void {
    // We don't strictly need to show text count now that we show the visual bird queue
    // But we keep it small just in case
    this.birdCountText.text = `Birds: ${count}`;
  }
  
  updateBirdTypes(birds: BirdType[]): void {}
  updateLevel(lvl: number): void {} 

  showLevelComplete(level: number, score: number, stars: number, bonus: number): void {
    this.activeEndScreenData = { title: 'LEVEL CLEAR!', level, score, stars, isWin: true };
    this.drawEndPanel();
  }

  showGameOver(level: number, score: number, stars: number): void {
    this.activeEndScreenData = { title: 'LEVEL FAILED', level, score, stars, isWin: false };
    this.drawEndPanel();
  }

  private drawEndPanel(): void {
    if (!this.activeEndScreenData) return;

    this.endScreenContainer.removeChildren();
    this.endScreenContainer.visible = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const data = this.activeEndScreenData;

    // 1. Background Overlay (Blocks clicks)
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, vw, vh);
    bg.eventMode = 'static'; // CRITICAL: Prevents clicks passing through to the game
    bg.cursor = 'default';
    this.endScreenContainer.addChild(bg);

    // 2. Responsive Panel Sizing
    // We use the SMALLEST dimension to ensure it fits on mobile in portrait or landscape
    const minDim = Math.min(vw, vh);
    const isPortrait = vh > vw;

    const panelW = isPortrait ? vw * 0.85 : minDim * 0.8; 
    const panelH = isPortrait ? vh * 0.45 : minDim * 0.6;
    
    const panelX = (vw - panelW) / 2;
    const panelY = (vh - panelH) / 2;

    // 3. Draw Panel Body
    const panel = new PIXI.Graphics();
    panel.beginFill(data.isWin ? 0x4CAF50 : 0xD32F2F);
    panel.lineStyle(4, 0xFFFFFF);
    panel.drawRoundedRect(panelX, panelY, panelW, panelH, 20);
    this.endScreenContainer.addChild(panel);

    // 4. Dynamic Font Sizes (Based on panel height)
    const titleSize = Math.floor(panelH * 0.12);
    const scoreSize = Math.floor(panelH * 0.08);
    const btnTextSize = Math.floor(panelH * 0.06);

    // 5. Title
    const title = new PIXI.Text(data.title, { 
        fontFamily: 'Arial', fontSize: titleSize, fontWeight: 'bold', 
        fill: 0xFFFFFF, stroke: { color: 0x000000, width: 4 }
    });
    title.anchor.set(0.5);
    title.position.set(vw / 2, panelY + panelH * 0.15);
    this.endScreenContainer.addChild(title);

    // 6. Stars
    const starContainer = new PIXI.Container();
    const starSize = panelW * 0.1; // Relative star size
    const starSpacing = starSize * 1.2;
    
    for(let i = 0; i < 3; i++) {
        const isFilled = i < data.stars;
        const star = this.createStarGraphic(starSize, isFilled);
        star.x = (i - 1) * starSpacing;
        starContainer.addChild(star);
    }
    starContainer.position.set(vw / 2, panelY + panelH * 0.4);
    this.endScreenContainer.addChild(starContainer);

    // 7. Score
    const scoreTxt = new PIXI.Text(`Score: ${data.score}`, { 
        fontFamily: 'Arial', fontSize: scoreSize, fill: 0xFFFFFF, 
        fontWeight: 'bold', stroke: { color: 0x000000, width: 2 }
    });
    scoreTxt.anchor.set(0.5);
    scoreTxt.position.set(vw / 2, panelY + panelH * 0.65);
    this.endScreenContainer.addChild(scoreTxt);

    // 8. Buttons
    const btnHeight = panelH * 0.15;
    const btnWidth = panelW * 0.35; 
    const btnY = panelY + panelH - btnHeight - (panelH * 0.05);

    this.createButton('MENU', panelX + (panelW * 0.25), btnY, btnWidth, btnHeight, btnTextSize, 0x2196F3, () => {
        this.hideEndScreen();
        this.game.goToMenu();
    });

    if (data.isWin) {
        this.createButton('NEXT', panelX + (panelW * 0.75), btnY, btnWidth, btnHeight, btnTextSize, 0xFF9800, () => {
            this.hideEndScreen();
            this.game.nextLevel();
        });
    } else {
        this.createButton('RETRY', panelX + (panelW * 0.75), btnY, btnWidth, btnHeight, btnTextSize, 0xFF9800, () => {
            this.hideEndScreen();
            this.game.restartLevel();
        });
    }
  }

  private createStarGraphic(size: number, filled: boolean): PIXI.Graphics {
    const g = new PIXI.Graphics();
    const color = filled ? 0xFFD700 : 0x333333;
    const alpha = filled ? 1 : 0.5;
    g.beginFill(color, alpha);
    g.lineStyle(2, 0xFFFFFF);
    g.drawStar(0, 0, 5, size, size/2);
    g.endFill();
    return g;
  }

  private createButton(text: string, x: number, y: number, w: number, h: number, fontSize: number, color: number, cb: () => void): void {
      const btn = new PIXI.Container();
      btn.position.set(x, y);
      
      const bg = new PIXI.Graphics();
      bg.beginFill(color);
      bg.drawRoundedRect(-w/2, -h/2, w, h, 10);
      bg.endFill();
      
      const txt = new PIXI.Text(text, { 
          fontFamily: 'Arial', fontSize: fontSize, fontWeight: 'bold', fill: 0xFFFFFF 
      });
      txt.anchor.set(0.5);
      
      btn.addChild(bg, txt);
      btn.eventMode = 'static'; // Ensures it receives clicks
      btn.cursor = 'pointer';
      
      btn.on('pointerdown', () => { bg.tint = 0xDDDDDD; });
      btn.on('pointerup', () => { bg.tint = 0xFFFFFF; cb(); });
      
      this.endScreenContainer.addChild(btn);
  }

  resize(vw: number, vh: number): void {
     // Scale logic: Use the smaller dimension to drive font size
     // This keeps text readable on small phones without taking up the whole screen
     const minDim = Math.min(vw, vh);
     const baseFontSize = Math.max(14, Math.floor(minDim * 0.04)); 

     // Position Score Top-Right with padding
     this.scoreText.style.fontSize = baseFontSize;
     this.scoreText.style.stroke = { color: 0x000000, width: 3 };
     this.scoreText.anchor.set(1, 0); 
     this.scoreText.position.set(vw - 20, 20);

     // Position Bird Count below score
     this.birdCountText.style.fontSize = baseFontSize * 0.8;
     this.birdCountText.style.stroke = { color: 0x000000, width: 3 };
     this.birdCountText.anchor.set(1, 0); 
     this.birdCountText.position.set(vw - 20, this.scoreText.y + this.scoreText.height + 5);

     if (this.activeEndScreenData) {
         this.drawEndPanel();
     }
  }

  updateScale(scale: number, vw: number, vh: number): void {
      this.resize(vw, vh);
  }
  
  getContainer() { return this.container; }
  
  hideEndScreen() { 
      this.endScreenContainer.visible = false; 
      this.activeEndScreenData = null; 
  }
}