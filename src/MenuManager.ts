import * as PIXI from 'pixi.js';
import type { Game } from './Game';

export type MenuState = 'main' | 'levelSelect' | 'playing';

export class MenuManager {
  private game: Game;
  private container: PIXI.Container;
  private currentState: MenuState = 'main';
  
  // Level progress data (saved in localStorage)
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
    
    // Unlock next level
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
  
  public getMaxUnlockedLevel(): number {
    return this.maxUnlockedLevel;
  }
  
  public showMainMenu(): void {
    this.currentState = 'main';
    this.container.removeChildren();
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x87CEEB);
    bg.drawRect(0, 0, vw, vh);
    bg.endFill();
    this.container.addChild(bg);
    
    // Title
    const titleSize = Math.min(120, vw * 0.15);
    const title = new PIXI.Text('ANGRY BIRDS', {
      fontFamily: 'Arial',
      fontSize: titleSize,
      fontWeight: 'bold',
      fill: 0xFF0000,
      stroke: { color: 0x000000, width: Math.max(8, titleSize / 15) }
    });
    title.anchor.set(0.5);
    title.x = vw / 2;
    title.y = vh * 0.25;
    this.container.addChild(title);
    
    // Subtitle
    const subtitleSize = Math.min(40, vw * 0.05);
    const subtitle = new PIXI.Text('Clone Edition', {
      fontFamily: 'Arial',
      fontSize: subtitleSize,
      fontStyle: 'italic',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(3, subtitleSize / 13) }
    });
    subtitle.anchor.set(0.5);
    subtitle.x = vw / 2;
    subtitle.y = vh * 0.35;
    this.container.addChild(subtitle);
    
    // Play Button
    const buttonWidth = Math.min(400, vw * 0.6);
    const buttonHeight = buttonWidth * 0.25;
    this.createMainButton('PLAY', vw / 2, vh * 0.55, buttonWidth, buttonHeight, () => {
      this.showLevelSelect();
    });
    
    // Credits
    const creditsSize = Math.min(24, vw * 0.03);
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
    this.container.removeChildren();
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x87CEEB);
    bg.drawRect(0, 0, vw, vh);
    bg.endFill();
    this.container.addChild(bg);
    
    // Title
    const titleSize = Math.min(60, vw * 0.08);
    const title = new PIXI.Text('SELECT LEVEL', {
      fontFamily: 'Arial',
      fontSize: titleSize,
      fontWeight: 'bold',
      fill: 0xFFD700,
      stroke: { color: 0x000000, width: Math.max(5, titleSize / 12) }
    });
    title.anchor.set(0.5);
    title.x = vw / 2;
    title.y = vh * 0.12;
    this.container.addChild(title);
    
    // Back button
    const backBtnSize = Math.min(150, vw * 0.25);
    this.createSmallButton('< BACK', backBtnSize * 0.6, vh * 0.12, backBtnSize, backBtnSize * 0.4, () => {
      this.showMainMenu();
    });
    
    // Level grid
    const totalLevels = this.game.getLevel().getTotalLevels();
    const cols = Math.min(4, Math.floor(vw / 180));
    const rows = Math.ceil(totalLevels / cols);
    
    const gridWidth = cols * 160;
    const gridHeight = rows * 160;
    const startX = (vw - gridWidth) / 2 + 80;
    const startY = Math.max(vh * 0.25, (vh - gridHeight) / 2);
    
    for (let i = 1; i <= totalLevels; i++) {
      const col = (i - 1) % cols;
      const row = Math.floor((i - 1) / cols);
      const x = startX + col * 160;
      const y = startY + row * 160;
      
      this.createLevelButton(i, x, y);
    }
  }
  
  private createLevelButton(level: number, x: number, y: number): void {
    const button = new PIXI.Container();
    button.x = x;
    button.y = y;
    
    const isUnlocked = this.isLevelUnlocked(level);
    const progress = this.getLevelProgress(level);
    
    // Button background
    const size = 120;
    const bg = new PIXI.Graphics();
    
    if (isUnlocked) {
      if (progress && progress.completed) {
        bg.beginFill(0x4CAF50); // Green for completed
      } else {
        bg.beginFill(0x2196F3); // Blue for unlocked
      }
    } else {
      bg.beginFill(0x757575); // Gray for locked
    }
    
    bg.lineStyle(4, 0x000000);
    bg.drawRoundedRect(-size / 2, -size / 2, size, size, 10);
    bg.endFill();
    button.addChild(bg);
    
    if (isUnlocked) {
      button.eventMode = 'static';
      button.cursor = 'pointer';
      
      // Level number
      const levelText = new PIXI.Text(`${level}`, {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 'bold',
        fill: 0xFFFFFF,
        stroke: { color: 0x000000, width: 4 }
      });
      levelText.anchor.set(0.5);
      levelText.y = -10;
      button.addChild(levelText);
      
      // Stars
      if (progress && progress.stars > 0) {
        const starsContainer = new PIXI.Container();
        starsContainer.y = 30;
        
        for (let i = 0; i < 3; i++) {
          const star = this.createSmallStar(i < progress.stars, 12);
          star.x = -30 + i * 30;
          starsContainer.addChild(star);
        }
        
        button.addChild(starsContainer);
      }
      
      // Hover effect
      button.on('pointerover', () => {
        bg.clear();
        if (progress && progress.completed) {
          bg.beginFill(0x66BB6A); // Lighter green
        } else {
          bg.beginFill(0x42A5F5); // Lighter blue
        }
        bg.lineStyle(4, 0x000000);
        bg.drawRoundedRect(-size / 2, -size / 2, size, size, 10);
        bg.endFill();
      });
      
      button.on('pointerout', () => {
        bg.clear();
        if (progress && progress.completed) {
          bg.beginFill(0x4CAF50);
        } else {
          bg.beginFill(0x2196F3);
        }
        bg.lineStyle(4, 0x000000);
        bg.drawRoundedRect(-size / 2, -size / 2, size, size, 10);
        bg.endFill();
      });
      
      button.on('pointerdown', () => {
        this.startLevel(level);
      });
    } else {
      // Lock icon for locked levels
      const lockText = new PIXI.Text('🔒', {
        fontFamily: 'Arial',
        fontSize: 48
      });
      lockText.anchor.set(0.5);
      button.addChild(lockText);
    }
    
    this.container.addChild(button);
  }
  
  private createSmallStar(filled: boolean, size: number): PIXI.Graphics {
    const star = new PIXI.Graphics();
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.45;

    if (filled) {
      star.beginFill(0xFFD700);
      star.lineStyle(1, 0xFF8C00);
    } else {
      star.lineStyle(1, 0x666666);
    }

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        star.moveTo(x, y);
      } else {
        star.lineTo(x, y);
      }
    }
    star.closePath();

    if (filled) {
      star.endFill();
    }

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
    bg.lineStyle(5, 0x2E7D32);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, 15);
    bg.endFill();
    button.addChild(bg);

    const fontSize = Math.min(60, width * 0.18);
    const buttonText = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(4, fontSize / 15) }
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);

    button.on('pointerover', () => {
      bg.clear();
      bg.beginFill(0x66BB6A);
      bg.lineStyle(5, 0x2E7D32);
      bg.drawRoundedRect(-width / 2, -height / 2, width, height, 15);
      bg.endFill();
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.beginFill(0x4CAF50);
      bg.lineStyle(5, 0x2E7D32);
      bg.drawRoundedRect(-width / 2, -height / 2, width, height, 15);
      bg.endFill();
    });

    button.on('pointerdown', () => {
      bg.clear();
      bg.beginFill(0x388E3C);
      bg.lineStyle(5, 0x2E7D32);
      bg.drawRoundedRect(-width / 2, -height / 2, width, height, 15);
      bg.endFill();
    });

    button.on('pointerup', () => {
      bg.clear();
      bg.beginFill(0x4CAF50);
      bg.lineStyle(5, 0x2E7D32);
      bg.drawRoundedRect(-width / 2, -height / 2, width, height, 15);
      bg.endFill();
      onClick();
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
    bg.lineStyle(3, 0xE65100);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.endFill();
    button.addChild(bg);

    const fontSize = Math.min(24, width * 0.15);
    const buttonText = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(2, fontSize / 12) }
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);

    button.on('pointerover', () => {
      bg.clear();
      bg.beginFill(0xFFB74D);
      bg.lineStyle(3, 0xE65100);
      bg.drawRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.endFill();
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.beginFill(0xFF9800);
      bg.lineStyle(3, 0xE65100);
      bg.drawRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.endFill();
    });

    button.on('pointerup', onClick);

    this.container.addChild(button);
  }
  
  private startLevel(level: number): void {
    this.currentState = 'playing';
    this.hide();
    this.game.startLevel(level);
  }
  
  public show(): void {
    this.container.visible = true;
  }
  
  public hide(): void {
    this.container.visible = false;
  }
  
  public getContainer(): PIXI.Container {
    return this.container;
  }
  
  public getCurrentState(): MenuState {
    return this.currentState;
  }
}