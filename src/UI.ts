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
  
  // State tracking for resizing
  private currentScore: number = 0;
  private currentBirdCount: number = 0;
  private currentWidth: number = 0;
  private currentHeight: number = 0;
  private activeEndScreenData: EndScreenData | null = null;

  constructor(game: Game, virtualWidth: number, virtualHeight: number) {
    this.game = game;
    this.container = new PIXI.Container();
    this.endScreenContainer = new PIXI.Container();
    
    // Initialize text with placeholders (styles will be set in resize)
    this.scoreText = new PIXI.Text('Score: 0');
    this.birdCountText = new PIXI.Text('Birds: 0');

    this.container.addChild(this.scoreText);
    this.container.addChild(this.birdCountText);
    this.container.addChild(this.endScreenContainer);
    this.endScreenContainer.visible = false;

    // Initial resize to set styles
    this.resize(window.innerWidth, window.innerHeight);
  }

  updateScore(score: number): void {
    this.currentScore = score;
    this.scoreText.text = `Score: ${score}`;
  }
  
  updateBirdCount(count: number): void {
    this.currentBirdCount = count;
    this.birdCountText.text = `Birds: ${count}`;
  }
  
  updateBirdTypes(birds: BirdType[]): void {
    this.updateBirdCount(birds.length);
  }

  updateLevel(lvl: number): void {} 

  showLevelComplete(level: number, score: number, stars: number, bonus: number): void {
    this.activeEndScreenData = {
      title: 'LEVEL CLEAR!',
      level,
      score,
      stars,
      isWin: true
    };
    this.drawEndPanel();
  }

  showGameOver(level: number, score: number, stars: number): void {
    this.activeEndScreenData = {
      title: 'LEVEL FAILED',
      level,
      score,
      stars,
      isWin: false
    };
    this.drawEndPanel();
  }

  /**
   * Completely responsive draw function for the end modal
   */
  private drawEndPanel(): void {
    if (!this.activeEndScreenData) return;

    this.endScreenContainer.removeChildren();
    this.endScreenContainer.visible = true;

    const vw = this.currentWidth;
    const vh = this.currentHeight;
    const data = this.activeEndScreenData;

    // 1. Dark Background Overlay
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, vw, vh);
    bg.eventMode = 'static'; // Blocks clicks to game behind
    this.endScreenContainer.addChild(bg);

    // 2. Calculate Panel Dimensions
    // Use a percentage of the smallest screen dimension to ensure it fits
    const isPortrait = vh > vw;
    const panelW = Math.min(600, vw * (isPortrait ? 0.85 : 0.5));
    const panelH = Math.min(500, vh * (isPortrait ? 0.5 : 0.7));
    const panelX = (vw - panelW) / 2;
    const panelY = (vh - panelH) / 2;

    // 3. Draw Panel Background
    const panel = new PIXI.Graphics();
    panel.beginFill(data.isWin ? 0x4CAF50 : 0xD32F2F);
    panel.lineStyle(4, 0xFFFFFF);
    panel.drawRoundedRect(panelX, panelY, panelW, panelH, 20);
    this.endScreenContainer.addChild(panel);

    // 4. Calculate Responsive Font Sizes
    const headerSize = Math.min(40, panelH * 0.12);
    const scoreSize = Math.min(30, panelH * 0.09);

    // 5. Title Text
    const title = new PIXI.Text(data.title, { 
        fontFamily: 'Arial', 
        fontSize: headerSize, 
        fontWeight: 'bold' as const, 
        fill: 0xFFFFFF,
        stroke: { color: 0x000000, width: 4 },
        // dropShadow: true,
        // dropShadowDistance: 2
    });
    title.anchor.set(0.5);
    title.position.set(vw / 2, panelY + panelH * 0.15);
    this.endScreenContainer.addChild(title);

    // 6. Stars (Visual representation)
    const starContainer = new PIXI.Container();
    const starSize = panelW * 0.15;
    const starSpacing = starSize * 1.2;
    
    for(let i = 0; i < 3; i++) {
        const isFilled = i < data.stars;
        const star = this.createStarGraphic(starSize, isFilled);
        star.x = (i - 1) * starSpacing;
        starContainer.addChild(star);
    }
    starContainer.position.set(vw / 2, panelY + panelH * 0.4);
    this.endScreenContainer.addChild(starContainer);

    // 7. Score Text
    const scoreTxt = new PIXI.Text(`Score: ${data.score}`, { 
        fontFamily: 'Arial', 
        fontSize: scoreSize, 
        fill: 0xFFFFFF,
        fontWeight: 'bold' as const
    });
    scoreTxt.anchor.set(0.5);
    scoreTxt.position.set(vw / 2, panelY + panelH * 0.65);
    this.endScreenContainer.addChild(scoreTxt);

    // 8. Buttons
    const btnHeight = Math.min(60, panelH * 0.15);
    const btnWidth = panelW * 0.35; 
    const btnY = panelY + panelH - btnHeight - 20;
    
    // Button Text Size
    const btnFontSize = Math.min(24, btnHeight * 0.5);

    this.createButton('MENU', panelX + (panelW * 0.25), btnY, btnWidth, btnHeight, btnFontSize, 0x2196F3, () => {
        this.hideEndScreen();
        this.game.goToMenu();
    });

    if (data.isWin) {
        this.createButton('NEXT', panelX + (panelW * 0.75), btnY, btnWidth, btnHeight, btnFontSize, 0xFF9800, () => {
            this.hideEndScreen();
            this.game.nextLevel();
        });
    } else {
        this.createButton('RETRY', panelX + (panelW * 0.75), btnY, btnWidth, btnHeight, btnFontSize, 0xFF9800, () => {
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
    g.drawStar(0, 0, 5, size, size/2); // PIXI has a native drawStar method
    g.endFill();
    return g;
  }

  private createButton(
    text: string, 
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    fontSize: number, 
    color: number, 
    cb: () => void
  ): void {
      const btn = new PIXI.Container();
      btn.position.set(x, y);
      
      const bg = new PIXI.Graphics();
      bg.beginFill(color);
      bg.drawRoundedRect(-w/2, -h/2, w, h, 10);
      bg.endFill();
      
      // Add a subtle shadow
      const shadow = new PIXI.Graphics();
      shadow.beginFill(0x000000, 0.2);
      shadow.drawRoundedRect(-w/2 + 4, -h/2 + 4, w, h, 10);
      shadow.endFill();
      
      const txt = new PIXI.Text(text, { 
          fontFamily: 'Arial', 
          fontSize: fontSize, 
          fontWeight: 'bold' as const, 
          fill: 0xFFFFFF 
      });
      txt.anchor.set(0.5);
      
      // Add shadow behind button
      btn.addChild(shadow);
      btn.addChild(bg);
      btn.addChild(txt);
      
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      
      // Simple press effect
      btn.on('pointerdown', () => { bg.tint = 0xDDDDDD; });
      btn.on('pointerup', () => { bg.tint = 0xFFFFFF; cb(); });
      btn.on('pointerupoutside', () => { bg.tint = 0xFFFFFF; });
      
      this.endScreenContainer.addChild(btn);
  }

  /**
   * REPLACES `updateScale`.
   * Called whenever the window resizes.
   * Recalculates positions and font sizes based on the new dimensions.
   */
  resize(vw: number, vh: number): void {
     this.currentWidth = vw;
     this.currentHeight = vh;

     // Calculate a "scale factor" based on diagonal size
     // This ensures text grows on larger screens but stays proportional on mobile
     const diagonal = Math.sqrt(vw * vw + vh * vh);
     const fontSize = Math.max(20, diagonal * 0.025); // Min 20px, otherwise dynamic

     // Update Score Text
     this.scoreText.style.fontSize = fontSize;
     this.scoreText.style.stroke = { color: 0x000000, width: fontSize * 0.1 };
     this.scoreText.position.set(vw * 0.02, vh * 0.02); // 2% padding

     // Update Bird Count Text
     this.birdCountText.style.fontSize = fontSize * 0.7; // Slightly smaller
     this.birdCountText.style.stroke = { color: 0x000000, width: (fontSize * 0.7) * 0.1 };
     
     // Position bird count below score
     this.birdCountText.position.set(
         vw * 0.02, 
         this.scoreText.y + this.scoreText.height + (vh * 0.01)
     );

     // If the end screen is currently open, redraw it to fit new screen size
     if (this.activeEndScreenData) {
         this.drawEndPanel();
     }
  }

  // Backward compatibility wrapper if Game.ts calls updateScale
  updateScale(scale: number, vw: number, vh: number): void {
      this.resize(vw, vh);
  }
  
  getContainer() { return this.container; }
  
  hideEndScreen() { 
      this.endScreenContainer.visible = false; 
      this.activeEndScreenData = null; // Clear state
  }
}