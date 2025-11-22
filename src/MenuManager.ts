import * as PIXI from 'pixi.js';
import type { Game } from './Game';

export type MenuState = 'main' | 'levelSelect' | 'playing';

export class MenuManager {
  private game: Game;
  private container: PIXI.Container;
  private currentState: MenuState = 'main';
  
  // Level progress data
  private levelProgress: { [level: number]: { completed: boolean; stars: number; highScore: number } } = {};
  private maxUnlockedLevel: number = 1;
  
  constructor(game: Game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.loadProgress();
  }
  
  private loadProgress(): void {
    try {
      const saved = localStorage.getItem('angryBirdsProgress');
      if (saved) {
        const data = JSON.parse(saved);
        this.levelProgress = data.levelProgress || {};
        this.maxUnlockedLevel = data.maxUnlockedLevel || 1;
      }
    } catch (e) {
      console.warn('Could not load progress', e);
    }
  }
  
  private saveProgress(): void {
    try {
      const data = {
        levelProgress: this.levelProgress,
        maxUnlockedLevel: this.maxUnlockedLevel
      };
      localStorage.setItem('angryBirdsProgress', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save progress', e);
    }
  }
  
  public updateLevelProgress(level: number, stars: number, score: number): void {
    if (!this.levelProgress[level]) {
      this.levelProgress[level] = { completed: false, stars: 0, highScore: 0 };
    }
    
    this.levelProgress[level].completed = true;
    this.levelProgress[level].stars = Math.max(this.levelProgress[level].stars, stars);
    this.levelProgress[level].highScore = Math.max(this.levelProgress[level].highScore, score);
    
    if (level === this.maxUnlockedLevel) {
      this.maxUnlockedLevel = level + 1;
    }
    
    this.saveProgress();
  }
  
  public getLevelProgress(level: number): { completed: boolean; stars: number; highScore: number } | null {
    return this.levelProgress[level] || null;
  }
  
  public isLevelUnlocked(level: number): boolean {
    return level <= this.maxUnlockedLevel;
  }
  
  public showMainMenu(): void {
    this.currentState = 'main';
    this.show(); // FIXED: Ensure container is visible when returning to main menu
    this.container.removeChildren();
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isPortrait = vh > vw;
    
    // Use the smaller dimension to scale UI elements
    const minDim = Math.min(vw, vh);
    
    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x87CEEB);
    bg.drawRect(0, 0, vw, vh);
    bg.endFill();
    this.container.addChild(bg);
    
    // Responsive Title
    const titleScale = isPortrait ? 0.12 : 0.08;
    const titleSize = minDim * 0.15; 
    
    const title = new PIXI.Text('ANGRY BIRDS', {
      fontFamily: 'Arial',
      fontSize: titleSize,
      fontWeight: 'bold',
      fill: 0xFF0000,
      stroke: { color: 0x000000, width: titleSize * 0.05 },
      // dropShadow: true,
      // dropShadowDistance: 5
    });
    title.anchor.set(0.5);
    title.x = vw / 2;
    title.y = vh * 0.25;
    this.container.addChild(title);
    
    // Subtitle
    const subtitleSize = titleSize * 0.4;
    const subtitle = new PIXI.Text('Clone Edition', {
      fontFamily: 'Arial',
      fontSize: subtitleSize,
      fontStyle: 'italic',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: subtitleSize * 0.05 }
    });
    subtitle.anchor.set(0.5);
    subtitle.x = vw / 2;
    subtitle.y = vh * 0.35;
    this.container.addChild(subtitle);
    
    // Play Button
    const btnW = Math.min(300, vw * 0.5);
    const btnH = btnW * 0.35;
    
    this.createMainButton('PLAY', vw / 2, vh * 0.55, btnW, btnH, () => {
      this.showLevelSelect();
    });
    
    // Credits
    const creditsSize = Math.max(12, minDim * 0.03);
    const credits = new PIXI.Text('Created with PixiJS and Matter.js', {
      fontFamily: 'Arial',
      fontSize: creditsSize,
      fill: 0x666666
    });
    credits.anchor.set(0.5);
    credits.x = vw / 2;
    credits.y = vh * 0.92;
    this.container.addChild(credits);
  }
  
  public showLevelSelect(): void {
    this.currentState = 'levelSelect';
    this.show(); // FIXED: Ensure container is visible when returning to level select
    this.container.removeChildren();
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minDim = Math.min(vw, vh);
    
    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x87CEEB);
    bg.drawRect(0, 0, vw, vh);
    bg.endFill();
    this.container.addChild(bg);
    
    // Title
    const titleSize = minDim * 0.08;
    const title = new PIXI.Text('SELECT LEVEL', {
      fontFamily: 'Arial',
      fontSize: titleSize,
      fontWeight: 'bold',
      fill: 0xFFD700,
      stroke: { color: 0x000000, width: titleSize * 0.05 }
    });
    title.anchor.set(0.5);
    title.x = vw / 2;
    title.y = vh * 0.1;
    this.container.addChild(title);
    
    // Back button - Top Left
    const backBtnW = minDim * 0.15;
    const backBtnH = backBtnW * 0.5;
    this.createSmallButton('< BACK', 20 + backBtnW/2, 20 + backBtnH/2, backBtnW, backBtnH, () => {
      this.showMainMenu();
    });
    
    // Level Grid Logic
    const totalLevels = this.game.getLevel().getTotalLevels();
    const btnSize = Math.min(100, vw * 0.18); 
    const gap = 20;
    
    const availableWidth = vw * 0.9;
    const cols = Math.floor(availableWidth / (btnSize + gap));
    const actualCols = Math.min(cols, 4); 
    
    const rows = Math.ceil(totalLevels / actualCols);
    
    const gridWidth = (actualCols * btnSize) + ((actualCols - 1) * gap);
    
    const startX = (vw - gridWidth) / 2 + btnSize / 2;
    const startY = (vh * 0.25) + (btnSize / 2);
    
    for (let i = 1; i <= totalLevels; i++) {
      const col = (i - 1) % actualCols;
      const row = Math.floor((i - 1) / actualCols);
      
      const x = startX + col * (btnSize + gap);
      const y = startY + row * (btnSize + gap);
      
      this.createLevelButton(i, x, y, btnSize);
    }
  }
  
  private createLevelButton(level: number, x: number, y: number, size: number): void {
    const button = new PIXI.Container();
    button.x = x;
    button.y = y;
    
    const isUnlocked = this.isLevelUnlocked(level);
    const progress = this.getLevelProgress(level);
    
    // Button background
    const bg = new PIXI.Graphics();
    
    if (isUnlocked) {
      if (progress && progress.completed) bg.beginFill(0x4CAF50); // Green
      else bg.beginFill(0x2196F3); // Blue
    } else {
      bg.beginFill(0x757575); // Gray
    }
    
    bg.lineStyle(Math.max(2, size * 0.03), 0x000000);
    bg.drawRoundedRect(-size / 2, -size / 2, size, size, size * 0.15);
    bg.endFill();
    button.addChild(bg);
    
    if (isUnlocked) {
      button.eventMode = 'static';
      button.cursor = 'pointer';
      
      // Level number
      const levelText = new PIXI.Text(`${level}`, {
        fontFamily: 'Arial',
        fontSize: size * 0.4,
        fontWeight: 'bold',
        fill: 0xFFFFFF,
        stroke: { color: 0x000000, width: size * 0.03 }
      });
      levelText.anchor.set(0.5);
      levelText.y = -size * 0.1;
      button.addChild(levelText);
      
      // Stars
      if (progress && progress.stars > 0) {
        const starsContainer = new PIXI.Container();
        starsContainer.y = size * 0.25;
        const starSize = size * 0.25;
        for (let i = 0; i < 3; i++) {
          const star = this.createSmallStar(i < progress.stars, starSize / 2);
          star.x = (i - 1) * (starSize);
          starsContainer.addChild(star);
        }
        button.addChild(starsContainer);
      }
      
      button.on('pointerdown', () => { this.startLevel(level); });
      
    } else {
      const lockText = new PIXI.Text('🔒', {
        fontFamily: 'Arial',
        fontSize: size * 0.4
      });
      lockText.anchor.set(0.5);
      button.addChild(lockText);
    }
    
    this.container.addChild(button);
  }
  
  private createSmallStar(filled: boolean, radius: number): PIXI.Graphics {
    const star = new PIXI.Graphics();
    const points = 5;
    const innerRadius = radius * 0.45;
    if (filled) {
      star.beginFill(0xFFD700);
      star.lineStyle(1, 0xFF8C00);
    } else {
      star.lineStyle(1, 0x666666);
    }
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    star.closePath();
    if (filled) star.endFill();
    return star;
  }
  
  private createMainButton(text: string, x: number, y: number, width: number, height: number, onClick: () => void): void {
    const button = new PIXI.Container();
    button.x = x;
    button.y = y;
    button.eventMode = 'static';
    button.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(0x4CAF50);
    bg.lineStyle(4, 0x2E7D32);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, 15);
    bg.endFill();
    button.addChild(bg);

    const fontSize = Math.min(60, height * 0.6);
    const buttonText = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: 4 }
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);

    button.on('pointerdown', () => {
      bg.tint = 0xCCCCCC; // Press feedback
    });

    button.on('pointerup', () => {
      bg.tint = 0xFFFFFF;
      onClick();
    });
    
    button.on('pointerupoutside', () => {
      bg.tint = 0xFFFFFF;
    });

    this.container.addChild(button);
  }
  
  private createSmallButton(text: string, x: number, y: number, width: number, height: number, onClick: () => void): void {
    const button = new PIXI.Container();
    button.x = x;
    button.y = y;
    button.eventMode = 'static';
    button.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFF9800);
    bg.lineStyle(2, 0xE65100);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.endFill();
    button.addChild(bg);

    const fontSize = Math.min(24, height * 0.6);
    const buttonText = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: 2 }
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);
    
    button.on('pointerdown', () => {
        bg.tint = 0xCCCCCC;
    });

    button.on('pointerup', () => {
        bg.tint = 0xFFFFFF;
        onClick();
    });

    this.container.addChild(button);
  }
  
  private startLevel(level: number): void {
    this.currentState = 'playing';
    this.hide();
    this.game.startLevel(level);
  }
  
  public show(): void { this.container.visible = true; }
  public hide(): void { this.container.visible = false; }
  public getContainer(): PIXI.Container { return this.container; }
  public getCurrentState(): MenuState { return this.currentState; }
}