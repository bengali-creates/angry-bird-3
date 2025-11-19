import * as PIXI from 'pixi.js';
import type { Game } from './Game';
import type { BirdType } from './Bird';

export class UI {
  private game: Game;
  private container: PIXI.Container;
  private scoreText!: PIXI.Text;
  private levelText!: PIXI.Text;
  private birdCountText!: PIXI.Text;
  private birdIconsContainer: PIXI.Container;
  
  private endScreenContainer: PIXI.Container;
  
  private virtualWidth: number;
  private virtualHeight: number;
  
  private totalBirds: number = 0;
  private usedBirds: number = 0;
  
  // Responsive scaling
  private textScale: number = 1;

  constructor(game: Game, virtualWidth: number, virtualHeight: number) {
    this.game = game;
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;
    
    this.container = new PIXI.Container();
    this.birdIconsContainer = new PIXI.Container();
    this.endScreenContainer = new PIXI.Container();
    
    this.setupUI();
    
    this.container.addChild(this.birdIconsContainer);
    this.container.addChild(this.endScreenContainer);
    this.endScreenContainer.visible = false;
  }

  private setupUI(): void {
    // Base font sizes (will be scaled responsively)
    this.scoreText = new PIXI.Text('Score: 0', {
      fontFamily: 'Arial',
      fontSize: 32,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: 4 }
    });
    this.scoreText.x = 20;
    this.scoreText.y = 15;
    this.container.addChild(this.scoreText);

    this.levelText = new PIXI.Text('Level: 1', {
      fontFamily: 'Arial',
      fontSize: 28,
      fontWeight: 'bold',
      fill: 0xFFD700,
      stroke: { color: 0x000000, width: 3 }
    });
    this.levelText.x = 20;
    this.levelText.y = 55;
    this.container.addChild(this.levelText);

    this.birdCountText = new PIXI.Text('Birds: 0', {
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: 3 }
    });
    this.birdCountText.x = 20;
    this.birdCountText.y = 90;
    this.container.addChild(this.birdCountText);

    this.birdIconsContainer.x = 20;
    this.birdIconsContainer.y = 125;
  }

  updateScore(score: number): void {
    this.scoreText.text = `Score: ${score.toLocaleString()}`;
  }

  updateLevel(level: number): void {
    this.levelText.text = `Level: ${level}`;
  }

  updateBirdCount(count: number): void {
    this.birdCountText.text = `Birds: ${count}`;
    this.usedBirds = this.totalBirds - count;
    this.updateBirdIconsVisual();
  }

  updateBirdTypes(birds: BirdType[]): void {
    this.totalBirds = birds.length;
    this.usedBirds = 0;
    
    this.birdIconsContainer.removeChildren();

    birds.forEach((birdType, index) => {
      const icon = this.createBirdIcon(birdType, false);
      icon.x = index * 40;
      icon.y = 0;
      this.birdIconsContainer.addChild(icon);
    });
  }

  private updateBirdIconsVisual(): void {
    const children = this.birdIconsContainer.children;
    children.forEach((child, index) => {
      if (index < this.usedBirds) {
        child.alpha = 0.3;
      } else {
        child.alpha = 1.0;
      }
    });
  }

  private createBirdIcon(birdType: BirdType, isUsed: boolean = false): PIXI.Graphics {
    const icon = new PIXI.Graphics();
    const color = this.getBirdColor(birdType);
    
    icon.beginFill(color);
    icon.drawCircle(0, 0, 15);
    icon.endFill();
    
    icon.lineStyle(2, 0x000000);
    icon.drawCircle(0, 0, 15);
    
    icon.beginFill(0xFFFFFF, 0.3);
    icon.drawCircle(-4, -4, 6);
    icon.endFill();

    if (isUsed) {
      icon.alpha = 0.3;
    }

    return icon;
  }

  private getBirdColor(birdType: BirdType): number {
    switch (birdType) {
      case 'red': return 0xFF0000;
      case 'blue': return 0x0080FF;
      case 'yellow': return 0xFFFF00;
      case 'black': return 0x1a1a1a;
      case 'white': return 0xFFFFFF;
      default: return 0xFF0000;
    }
  }

  showLevelComplete(level: number, score: number, stars: number, birdBonus: number): void {
    this.endScreenContainer.removeChildren();
    this.endScreenContainer.visible = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, vw, vh);
    bg.endFill();
    bg.eventMode = 'static';
    this.endScreenContainer.addChild(bg);

    // Panel - responsive sizing
    const panelWidth = Math.min(600, vw * 0.9);
    const panelHeight = Math.min(500, vh * 0.7);
    const panelX = (vw - panelWidth) / 2;
    const panelY = (vh - panelHeight) / 2;

    const panel = new PIXI.Graphics();
    panel.beginFill(0x8B4513);
    panel.lineStyle(6, 0x654321);
    panel.drawRoundedRect(panelX, panelY, panelWidth, panelHeight, 15);
    panel.endFill();
    this.endScreenContainer.addChild(panel);

    // Responsive font sizes
    const titleSize = Math.min(48, vw * 0.08);
    const textSize = Math.min(32, vw * 0.05);
    const smallTextSize = Math.min(24, vw * 0.04);

    const title = new PIXI.Text('LEVEL COMPLETE!', {
      fontFamily: 'Arial',
      fontSize: titleSize,
      fontWeight: 'bold',
      fill: 0xFFD700,
      stroke: { color: 0x000000, width: Math.max(4, titleSize / 12) }
    });
    title.anchor.set(0.5);
    title.x = vw / 2;
    title.y = panelY + panelHeight * 0.15;
    this.endScreenContainer.addChild(title);

    const levelText = new PIXI.Text(`Level ${level}`, {
      fontFamily: 'Arial',
      fontSize: textSize,
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(3, textSize / 10) }
    });
    levelText.anchor.set(0.5);
    levelText.x = vw / 2;
    levelText.y = panelY + panelHeight * 0.3;
    this.endScreenContainer.addChild(levelText);

    this.drawStars(vw / 2, panelY + panelHeight * 0.45, stars, panelWidth);

    const scoreText = new PIXI.Text(`Score: ${score.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: textSize,
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(3, textSize / 10) }
    });
    scoreText.anchor.set(0.5);
    scoreText.x = vw / 2;
    scoreText.y = panelY + panelHeight * 0.6;
    this.endScreenContainer.addChild(scoreText);

    if (birdBonus > 0) {
      const bonusText = new PIXI.Text(`Bird Bonus: +${birdBonus.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: smallTextSize,
        fill: 0x00FF00,
        stroke: { color: 0x000000, width: Math.max(2, smallTextSize / 10) }
      });
      bonusText.anchor.set(0.5);
      bonusText.x = vw / 2;
      bonusText.y = panelY + panelHeight * 0.7;
      this.endScreenContainer.addChild(bonusText);
    }

    const buttonY = panelY + panelHeight * 0.85;
    const buttonSize = Math.min(180, panelWidth * 0.32);
    const buttonSpacing = buttonSize + 20;
    // Fixed: Better button spacing to prevent overlap
    this.createButton('NEXT', vw / 2 - buttonSpacing / 2, buttonY, buttonSize, () => {
      this.game.nextLevel();
    });

    this.createButton('RETRY', vw / 2 + 10, buttonY, buttonSize, () => {
      this.game.restartLevel();
    });
  }

  showGameOver(level: number, score: number, stars: number): void {
    this.endScreenContainer.removeChildren();
    this.endScreenContainer.visible = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, vw, vh);
    bg.endFill();
    bg.eventMode = 'static';
    this.endScreenContainer.addChild(bg);

    const panelWidth = Math.min(600, vw * 0.9);
    const panelHeight = Math.min(500, vh * 0.7);
    const panelX = (vw - panelWidth) / 2;
    const panelY = (vh - panelHeight) / 2;

    const panel = new PIXI.Graphics();
    panel.beginFill(0x8B0000);
    panel.lineStyle(6, 0x550000);
    panel.drawRoundedRect(panelX, panelY, panelWidth, panelHeight, 15);
    panel.endFill();
    this.endScreenContainer.addChild(panel);

    const titleSize = Math.min(48, vw * 0.08);
    const textSize = Math.min(32, vw * 0.05);
    const smallTextSize = Math.min(24, vw * 0.04);

    const title = new PIXI.Text('LEVEL FAILED', {
      fontFamily: 'Arial',
      fontSize: titleSize,
      fontWeight: 'bold',
      fill: 0xFF0000,
      stroke: { color: 0x000000, width: Math.max(4, titleSize / 12) }
    });
    title.anchor.set(0.5);
    title.x = vw / 2;
    title.y = panelY + panelHeight * 0.15;
    this.endScreenContainer.addChild(title);

    const message = new PIXI.Text('Out of Birds!', {
      fontFamily: 'Arial',
      fontSize: textSize,
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(3, textSize / 10) }
    });
    message.anchor.set(0.5);
    message.x = vw / 2;
    message.y = panelY + panelHeight * 0.3;
    this.endScreenContainer.addChild(message);

    const levelText = new PIXI.Text(`Level ${level}`, {
      fontFamily: 'Arial',
      fontSize: textSize,
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(3, textSize / 10) }
    });
    levelText.anchor.set(0.5);
    levelText.x = vw / 2;
    levelText.y = panelY + panelHeight * 0.42;
    this.endScreenContainer.addChild(levelText);

    if (stars > 0) {
      const starsLabel = new PIXI.Text('Stars Earned:', {
        fontFamily: 'Arial',
        fontSize: smallTextSize,
        fill: 0xFFFFFF,
        stroke: { color: 0x000000, width: Math.max(2, smallTextSize / 10) }
      });
      starsLabel.anchor.set(0.5);
      starsLabel.x = vw / 2;
      starsLabel.y = panelY + panelHeight * 0.52;
      this.endScreenContainer.addChild(starsLabel);
      
      this.drawStars(vw / 2, panelY + panelHeight * 0.62, stars, panelWidth);
    }

    const scoreText = new PIXI.Text(`Score: ${score.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: textSize,
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(3, textSize / 10) }
    });
    scoreText.anchor.set(0.5);
    scoreText.x = vw / 2;
    scoreText.y = stars > 0 ? panelY + panelHeight * 0.75 : panelY + panelHeight * 0.6;
    this.endScreenContainer.addChild(scoreText);

    const buttonY = stars > 0 ? panelY + panelHeight * 0.88 : panelY + panelHeight * 0.8;
    const buttonSize = Math.min(180, panelWidth * 0.32);
    const buttonSpacing = buttonSize + 20;
    // Fixed: Better button spacing to prevent overlap
    this.createButton('RETRY', vw / 2 - buttonSpacing / 2, buttonY, buttonSize, () => {
      this.game.restartLevel();
    });

    this.createButton('MENU', vw / 2 + 10, buttonY, buttonSize, () => {
      this.game.goToMenu();
    });
  }

  private drawStars(centerX: number, centerY: number, count: number, panelWidth: number): void {
    const starSize = Math.min(30, panelWidth * 0.08);
    const starSpacing = starSize * 2.5;
    const startX = centerX - starSpacing;

    for (let i = 0; i < 3; i++) {
      const star = this.createStar(i < count, starSize);
      star.x = startX + (i * starSpacing);
      star.y = centerY;
      this.endScreenContainer.addChild(star);
    }
  }

  private createStar(filled: boolean, size: number): PIXI.Graphics {
    const star = new PIXI.Graphics();
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.45;

    if (filled) {
      star.beginFill(0xFFD700);
      star.lineStyle(Math.max(2, size / 10), 0xFF8C00);
    } else {
      star.lineStyle(Math.max(2, size / 10), 0x666666);
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

  private createButton(text: string, x: number, y: number, width: number, onClick: () => void): void {
    const button = new PIXI.Container();
    const height = width * 0.35;
    button.x = x;
    button.y = y;
    button.eventMode = 'static';
    button.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(0x4CAF50);
    bg.lineStyle(3, 0x2E7D32);
    bg.drawRoundedRect(0, 0, width, height, 8);
    bg.endFill();
    button.addChild(bg);

    const fontSize = Math.min(24, width * 0.15);
    const buttonText = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: Math.max(2, fontSize / 8) }
    });
    buttonText.anchor.set(0.5);
    buttonText.x = width / 2;
    buttonText.y = height / 2;
    button.addChild(buttonText);

    button.on('pointerover', () => {
      bg.clear();
      bg.beginFill(0x66BB6A);
      bg.lineStyle(3, 0x2E7D32);
      bg.drawRoundedRect(0, 0, width, height, 8);
      bg.endFill();
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.beginFill(0x4CAF50);
      bg.lineStyle(3, 0x2E7D32);
      bg.drawRoundedRect(0, 0, width, height, 8);
      bg.endFill();
    });

    button.on('pointerdown', () => {
      bg.clear();
      bg.beginFill(0x388E3C);
      bg.lineStyle(3, 0x2E7D32);
      bg.drawRoundedRect(0, 0, width, height, 8);
      bg.endFill();
    });

    button.on('pointerup', () => {
      bg.clear();
      bg.beginFill(0x4CAF50);
      bg.lineStyle(3, 0x2E7D32);
      bg.drawRoundedRect(0, 0, width, height, 8);
      bg.endFill();
      onClick();
    });

    this.endScreenContainer.addChild(button);
  }

  hideEndScreen(): void {
    this.endScreenContainer.visible = false;
    this.endScreenContainer.removeChildren();
  }

  updateScale(scale: number, vw: number, vh: number): void {
    // Calculate responsive text scale based on screen size
    const minDimension = Math.min(vw, vh);
    this.textScale = Math.min(1.2, minDimension / 600);
    
    // Apply scale to UI elements
    this.scoreText.scale.set(this.textScale);
    this.levelText.scale.set(this.textScale);
    this.birdCountText.scale.set(this.textScale);
    this.birdIconsContainer.scale.set(this.textScale);
  }

  getContainer(): PIXI.Container {
    return this.container;
  }
}