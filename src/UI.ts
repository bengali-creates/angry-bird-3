import * as PIXI from 'pixi.js';
import type { Game } from './Game';
import type { BirdType } from './Bird';

export class UI {
  private game: Game;
  private container: PIXI.Container;
  private scoreText!: PIXI.Text;
  private birdCountText!: PIXI.Text;
  private endScreenContainer: PIXI.Container;
  private textScale: number = 1;

  constructor(game: Game, virtualWidth: number, virtualHeight: number) {
    this.game = game;
    this.container = new PIXI.Container();
    this.endScreenContainer = new PIXI.Container();
    
    this.scoreText = new PIXI.Text('Score: 0', {
        fontFamily: 'Arial', fontSize: 36, fill: 0xFFFFFF, stroke: { color: 0x000000, width: 4 }
    });
    this.scoreText.position.set(20, 20);
    
    this.birdCountText = new PIXI.Text('Birds: 0', {
        fontFamily: 'Arial', fontSize: 24, fill: 0xFFFFFF, stroke: { color: 0x000000, width: 3 }
    });
    this.birdCountText.position.set(20, 70);

    this.container.addChild(this.scoreText);
    this.container.addChild(this.birdCountText);
    this.container.addChild(this.endScreenContainer);
    this.endScreenContainer.visible = false;
  }

  updateScore(score: number): void {
    this.scoreText.text = `Score: ${score}`;
  }
  
  updateBirdCount(count: number): void {
    this.birdCountText.text = `Birds: ${count}`;
  }
  
  updateBirdTypes(birds: BirdType[]): void {
    this.birdCountText.text = `Birds: ${birds.length}`;
  }

  updateLevel(lvl: number): void {} 

  showLevelComplete(level: number, score: number, stars: number, bonus: number): void {
    this.createEndPanel('LEVEL CLEAR!', level, score, stars, true);
  }

  showGameOver(level: number, score: number, stars: number): void {
    this.createEndPanel('LEVEL FAILED', level, score, stars, false);
  }

  private createEndPanel(titleStr: string, level: number, score: number, stars: number, isWin: boolean): void {
    this.endScreenContainer.removeChildren();
    this.endScreenContainer.visible = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, vw, vh);
    bg.eventMode = 'static'; 
    this.endScreenContainer.addChild(bg);

    const panelW = Math.min(500, vw * 0.85);
    const panelH = Math.min(400, vh * 0.7);
    const panelX = (vw - panelW) / 2;
    const panelY = (vh - panelH) / 2;

    const panel = new PIXI.Graphics();
    panel.beginFill(isWin ? 0x4CAF50 : 0xD32F2F);
    panel.lineStyle(4, 0xFFFFFF);
    panel.drawRoundedRect(panelX, panelY, panelW, panelH, 20);
    this.endScreenContainer.addChild(panel);

    // FIX: Added 'as const' to ensure fontWeight is treated as a literal type
    const titleStyle = { 
        fontFamily: 'Arial', 
        fontSize: 40, 
        fontWeight: 'bold' as const, 
        fill: 0xFFFFFF 
    };
    
    const scoreStyle = { 
        fontFamily: 'Arial', 
        fontSize: 30, 
        fill: 0xFFFFFF 
    };

    const title = new PIXI.Text(titleStr, titleStyle);
    title.anchor.set(0.5);
    title.position.set(vw / 2, panelY + 50);
    this.endScreenContainer.addChild(title);

    const scoreTxt = new PIXI.Text(`Score: ${score}`, scoreStyle);
    scoreTxt.anchor.set(0.5);
    scoreTxt.position.set(vw / 2, panelY + 120);
    this.endScreenContainer.addChild(scoreTxt);

    const btnWidth = panelW * 0.35; 
    const btnHeight = 60;
    const btnY = panelY + panelH - 90;
    
    this.createButton('MENU', panelX + (panelW * 0.25), btnY, btnWidth, btnHeight, 0x2196F3, () => {
        this.game.goToMenu();
    });

    if (isWin) {
        this.createButton('NEXT', panelX + (panelW * 0.75), btnY, btnWidth, btnHeight, 0xFF9800, () => {
            this.game.nextLevel();
        });
    } else {
        this.createButton('RETRY', panelX + (panelW * 0.75), btnY, btnWidth, btnHeight, 0xFF9800, () => {
            this.game.restartLevel();
        });
    }
  }

  private createButton(text: string, x: number, y: number, w: number, h: number, color: number, cb: () => void): void {
      const btn = new PIXI.Container();
      btn.position.set(x, y);
      
      const bg = new PIXI.Graphics();
      bg.beginFill(color);
      bg.drawRoundedRect(-w/2, -h/2, w, h, 10);
      bg.endFill();
      
      // FIX: Added 'as const' here as well for safety
      const txt = new PIXI.Text(text, { 
          fontFamily: 'Arial', 
          fontSize: 24, 
          fontWeight: 'bold' as const, 
          fill: 0xFFFFFF 
      });
      txt.anchor.set(0.5);
      
      btn.addChild(bg, txt);
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerdown', cb);
      
      this.endScreenContainer.addChild(btn);
  }

  updateScale(scale: number, vw: number, vh: number): void {
     this.textScale = Math.min(1, vw / 800);
     this.scoreText.scale.set(this.textScale);
     this.birdCountText.scale.set(this.textScale);
  }
  
  getContainer() { return this.container; }
  hideEndScreen() { this.endScreenContainer.visible = false; }
}