import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import type { Game } from './Game';
import { Block, type BlockMaterial } from './Block';
import { Pig } from './Pig';
import type { BirdType } from './Bird';

interface BlockDef {
  x: number;
  y: number;
  width: number;
  height: number;
  material: BlockMaterial;
  angle?: number;
}

interface PigDef {
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
}

interface LevelStructure {
  blocks: BlockDef[];
  pigs: PigDef[];
}

interface LevelConfig {
  levelNumber: number;
  birds: BirdType[];
  structure: LevelStructure;
  threeStarScore: number;
  twoStarScore: number;
  oneStarScore: number;
}

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  graphics: PIXI.Graphics;
}

interface Bird {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  graphics: PIXI.Graphics;
}

export class Level {
  public currentLevel: number = 0;

  private game: Game;
  private blocks: Block[] = [];
  private pigs: Pig[] = [];
  private ground: Matter.Body;
  private groundGraphics: PIXI.Graphics;
  private backgroundGraphics: PIXI.Graphics;
  private terrainGraphics: PIXI.Graphics;
  private cloudsContainer: PIXI.Container;
  private animatedElementsContainer: PIXI.Container;

  private virtualWidth: number;
  private virtualHeight: number;
  
  // Animated elements
  private clouds: Cloud[] = [];
  private flyingBirds: Bird[] = [];
  private animationTime: number = 0;
  private grassWaveOffset: number = 0;

  constructor(game: Game, virtualWidth = 2400, virtualHeight = 1080) {
    this.game = game;
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;

    // Create layered containers for proper depth
    this.backgroundGraphics = new PIXI.Graphics();
    this.game.getContainer().addChildAt(this.backgroundGraphics, 0);
    
    this.cloudsContainer = new PIXI.Container();
    this.game.getContainer().addChildAt(this.cloudsContainer, 1);
    
    this.terrainGraphics = new PIXI.Graphics();
    this.game.getContainer().addChildAt(this.terrainGraphics, 2);
    
    this.animatedElementsContainer = new PIXI.Container();
    this.game.getContainer().addChildAt(this.animatedElementsContainer, 3);

    // Draw static background elements
    this.drawBackground();
    this.initializeClouds();
    this.initializeFlyingBirds();
    this.drawTerrain();

    // Create physics ground
    const groundHeight = Math.round(this.virtualHeight * 0.09);
    const groundY = this.virtualHeight - groundHeight / 2;

    this.ground = Matter.Bodies.rectangle(
      this.virtualWidth / 2,
      groundY,
      this.virtualWidth,
      groundHeight,
      {
        isStatic: true,
        friction: 1,
        restitution: 0.2,
        label: 'Ground'
      }
    );
    Matter.World.add(this.game.getWorld(), this.ground);

    this.groundGraphics = new PIXI.Graphics();
    this.game.getContainer().addChildAt(this.groundGraphics, 4);
    this.drawGround();
  }

  private drawBackground(): void {
    this.backgroundGraphics.clear();
    
    // SKY GRADIENT - Beautiful animated sky
    const skyHeight = this.virtualHeight * 0.91;
    const gradientSteps = 60;
    
    for (let i = 0; i < gradientSteps; i++) {
      const y = (skyHeight / gradientSteps) * i;
      const progress = i / gradientSteps;
      
      let color;
      if (progress < 0.4) {
        const t = progress / 0.4;
        color = this.interpolateColor(0x87CEEB, 0x9ED9F5, t);
      } else if (progress < 0.7) {
        const t = (progress - 0.4) / 0.3;
        color = this.interpolateColor(0x9ED9F5, 0xB8E5FA, t);
      } else {
        const t = (progress - 0.7) / 0.3;
        color = this.interpolateColor(0xB8E5FA, 0xD4F1FF, t);
      }
      
      this.backgroundGraphics.beginFill(color);
      this.backgroundGraphics.drawRect(0, y, this.virtualWidth, skyHeight / gradientSteps + 1);
      this.backgroundGraphics.endFill();
    }
    
    // SUN with animated glow
    this.drawSun();
    
    // DISTANT MOUNTAINS - Multiple layers for depth
    this.drawMountains();
    
    // DISTANT HILLS
    this.drawDistantHills();
  }

  private drawSun(): void {
    const sunX = this.virtualWidth * 0.15;
    const sunY = this.virtualHeight * 0.18;
    const sunRadius = 70;
    
    // Outer glow (largest)
    this.backgroundGraphics.beginFill(0xFFFFAA, 0.15);
    this.backgroundGraphics.drawCircle(sunX, sunY, sunRadius * 2.5);
    this.backgroundGraphics.endFill();
    
    // Middle glow
    this.backgroundGraphics.beginFill(0xFFFF99, 0.25);
    this.backgroundGraphics.drawCircle(sunX, sunY, sunRadius * 1.8);
    this.backgroundGraphics.endFill();
    
    // Inner glow
    this.backgroundGraphics.beginFill(0xFFFF88, 0.4);
    this.backgroundGraphics.drawCircle(sunX, sunY, sunRadius * 1.3);
    this.backgroundGraphics.endFill();
    
    // Sun body
    this.backgroundGraphics.beginFill(0xFFDD44);
    this.backgroundGraphics.drawCircle(sunX, sunY, sunRadius);
    this.backgroundGraphics.endFill();
    
    // Sun highlight
    this.backgroundGraphics.beginFill(0xFFFF88, 0.7);
    this.backgroundGraphics.drawCircle(sunX - 18, sunY - 18, sunRadius * 0.4);
    this.backgroundGraphics.endFill();
    
    // Secondary highlight
    this.backgroundGraphics.beginFill(0xFFFFCC, 0.5);
    this.backgroundGraphics.drawCircle(sunX - 25, sunY - 10, sunRadius * 0.25);
    this.backgroundGraphics.endFill();
  }

  private drawMountains(): void {
    const horizonY = this.virtualHeight * 0.65;
    
    // Far mountains (lightest, most distant)
    this.backgroundGraphics.beginFill(0x8FA8B8, 0.3);
    this.backgroundGraphics.moveTo(0, horizonY + 80);
    
    for (let x = 0; x <= this.virtualWidth; x += 200) {
      const height = 100 + Math.sin(x * 0.003) * 60 + Math.cos(x * 0.005) * 40;
      this.backgroundGraphics.lineTo(x, horizonY + 80 - height);
    }
    
    this.backgroundGraphics.lineTo(this.virtualWidth, this.virtualHeight);
    this.backgroundGraphics.lineTo(0, this.virtualHeight);
    this.backgroundGraphics.closePath();
    this.backgroundGraphics.endFill();
    
    // Mid mountains
    this.backgroundGraphics.beginFill(0x7F99A8, 0.5);
    this.backgroundGraphics.moveTo(0, horizonY + 120);
    
    for (let x = 0; x <= this.virtualWidth; x += 180) {
      const height = 120 + Math.sin(x * 0.004 + 1) * 70 + Math.cos(x * 0.006) * 50;
      this.backgroundGraphics.lineTo(x, horizonY + 120 - height);
    }
    
    this.backgroundGraphics.lineTo(this.virtualWidth, this.virtualHeight);
    this.backgroundGraphics.lineTo(0, this.virtualHeight);
    this.backgroundGraphics.closePath();
    this.backgroundGraphics.endFill();
  }

  private drawDistantHills(): void {
    const horizonY = this.virtualHeight * 0.72;
    
    // Far hills
    this.backgroundGraphics.beginFill(0x8FB99F, 0.5);
    this.backgroundGraphics.moveTo(0, horizonY);
    this.backgroundGraphics.bezierCurveTo(
      this.virtualWidth * 0.2, horizonY - 100,
      this.virtualWidth * 0.4, horizonY - 70,
      this.virtualWidth * 0.6, horizonY - 90
    );
    this.backgroundGraphics.bezierCurveTo(
      this.virtualWidth * 0.8, horizonY - 110,
      this.virtualWidth * 0.95, horizonY - 50,
      this.virtualWidth, horizonY - 20
    );
    this.backgroundGraphics.lineTo(this.virtualWidth, this.virtualHeight);
    this.backgroundGraphics.lineTo(0, this.virtualHeight);
    this.backgroundGraphics.closePath();
    this.backgroundGraphics.endFill();
    
    // Near hills
    this.backgroundGraphics.beginFill(0x7FA68F, 0.7);
    this.backgroundGraphics.moveTo(0, horizonY + 60);
    this.backgroundGraphics.bezierCurveTo(
      this.virtualWidth * 0.25, horizonY - 30,
      this.virtualWidth * 0.5, horizonY + 30,
      this.virtualWidth * 0.7, horizonY - 20
    );
    this.backgroundGraphics.bezierCurveTo(
      this.virtualWidth * 0.85, horizonY + 20,
      this.virtualWidth * 0.95, horizonY - 10,
      this.virtualWidth, horizonY + 40
    );
    this.backgroundGraphics.lineTo(this.virtualWidth, this.virtualHeight);
    this.backgroundGraphics.lineTo(0, this.virtualHeight);
    this.backgroundGraphics.closePath();
    this.backgroundGraphics.endFill();
  }

  private initializeClouds(): void {
    // Create 8 clouds at different positions and speeds for parallax effect
    const cloudConfigs = [
      { x: 0.10, y: 0.12, scale: 1.3, speed: 0.08 },
      { x: 0.25, y: 0.18, scale: 0.9, speed: 0.12 },
      { x: 0.40, y: 0.15, scale: 1.1, speed: 0.10 },
      { x: 0.55, y: 0.22, scale: 0.8, speed: 0.15 },
      { x: 0.68, y: 0.14, scale: 1.0, speed: 0.09 },
      { x: 0.78, y: 0.20, scale: 1.2, speed: 0.07 },
      { x: 0.88, y: 0.16, scale: 0.85, speed: 0.13 },
      { x: 0.95, y: 0.19, scale: 0.95, speed: 0.11 }
    ];
    
    cloudConfigs.forEach(config => {
      const cloud: Cloud = {
        x: this.virtualWidth * config.x,
        y: this.virtualHeight * config.y,
        scale: config.scale,
        speed: config.speed,
        graphics: new PIXI.Graphics()
      };
      
      this.drawCloud(cloud);
      this.cloudsContainer.addChild(cloud.graphics);
      this.clouds.push(cloud);
    });
  }

  private drawCloud(cloud: Cloud): void {
    cloud.graphics.clear();
    const baseSize = 45 * cloud.scale;
    
    // Cloud shadow
    cloud.graphics.beginFill(0xDDDDDD, 0.4);
    cloud.graphics.drawCircle(3, 3, baseSize);
    cloud.graphics.drawCircle(-baseSize * 0.7 + 3, 3, baseSize * 0.8);
    cloud.graphics.drawCircle(baseSize * 0.7 + 3, 3, baseSize * 0.8);
    cloud.graphics.drawCircle(3, -baseSize * 0.4 + 3, baseSize * 0.9);
    cloud.graphics.endFill();
    
    // Main cloud body
    cloud.graphics.beginFill(0xFFFFFF, 0.95);
    cloud.graphics.drawCircle(0, 0, baseSize);
    cloud.graphics.drawCircle(-baseSize * 0.7, 0, baseSize * 0.8);
    cloud.graphics.drawCircle(baseSize * 0.7, 0, baseSize * 0.8);
    cloud.graphics.drawCircle(0, -baseSize * 0.4, baseSize * 0.9);
    cloud.graphics.drawCircle(-baseSize * 0.35, -baseSize * 0.3, baseSize * 0.7);
    cloud.graphics.drawCircle(baseSize * 0.35, -baseSize * 0.3, baseSize * 0.7);
    cloud.graphics.endFill();
    
    // Cloud highlights
    cloud.graphics.beginFill(0xFFFFFF, 0.6);
    cloud.graphics.drawCircle(-baseSize * 0.3, -baseSize * 0.25, baseSize * 0.4);
    cloud.graphics.drawCircle(baseSize * 0.2, -baseSize * 0.15, baseSize * 0.35);
    cloud.graphics.endFill();
    
    cloud.graphics.position.set(cloud.x, cloud.y);
  }

  private initializeFlyingBirds(): void {
    // Create 3 small flying birds for animation
    for (let i = 0; i < 3; i++) {
      const bird: Bird = {
        x: Math.random() * this.virtualWidth,
        y: this.virtualHeight * (0.15 + Math.random() * 0.15),
        speedX: 0.3 + Math.random() * 0.2,
        speedY: (Math.random() - 0.5) * 0.1,
        graphics: new PIXI.Graphics()
      };
      
      this.drawFlyingBird(bird, 0);
      this.animatedElementsContainer.addChild(bird.graphics);
      this.flyingBirds.push(bird);
    }
  }

  private drawFlyingBird(bird: Bird, wingPhase: number): void {
    bird.graphics.clear();
    bird.graphics.position.set(bird.x, bird.y);
    
    const size = 8;
    const wingAngle = Math.sin(wingPhase) * 0.4;
    
    // Bird body (simple V shape)
    bird.graphics.lineStyle(2, 0x2C3E50, 0.8);
    
    // Left wing
    bird.graphics.moveTo(-size, 0);
    bird.graphics.lineTo(-size - 8, -6 + wingAngle * 3);
    
    // Right wing
    bird.graphics.moveTo(size, 0);
    bird.graphics.lineTo(size + 8, -6 + wingAngle * 3);
  }

  private drawTerrain(): void {
    this.terrainGraphics.clear();
    
    const groundTop = this.virtualHeight * 0.91;
    const terrainHeight = 200;
    
    // ANIMATED GRASS LAYER - Will update in animation loop
    this.updateGrassLayer(groundTop);
    
    // GRASS HIGHLIGHTS
    this.terrainGraphics.beginFill(0x9CCC65, 0.6);
    this.terrainGraphics.moveTo(0, groundTop);
    
    const hillPoints = 20;
    for (let i = 0; i <= hillPoints; i++) {
      const x = (this.virtualWidth / hillPoints) * i;
      const waveOffset = Math.sin(i * 0.6) * 12 + Math.cos(i * 1.0) * 8;
      this.terrainGraphics.lineTo(x, groundTop + waveOffset);
    }
    
    this.terrainGraphics.lineTo(this.virtualWidth, groundTop + 20);
    this.terrainGraphics.lineTo(0, groundTop + 20);
    this.terrainGraphics.closePath();
    this.terrainGraphics.endFill();
    
    // FLOWERS - Colorful dots on terrain
    this.drawFlowers(groundTop);
    
    // GRASS TUFTS
    this.drawGrassTufts(groundTop);
    
    // SOIL LAYER
    this.terrainGraphics.beginFill(0x8D6E63);
    this.terrainGraphics.drawRect(0, groundTop + 35, this.virtualWidth, terrainHeight - 35);
    this.terrainGraphics.endFill();
    
    // Soil texture
    this.terrainGraphics.beginFill(0x6D4C41, 0.3);
    this.terrainGraphics.drawRect(0, groundTop + 45, this.virtualWidth, terrainHeight - 45);
    this.terrainGraphics.endFill();
    
    // ROCKS AND PEBBLES
    this.drawRocks(groundTop);
  }

  private updateGrassLayer(groundTop: number): void {
    // This will be called in the animation loop
    this.terrainGraphics.beginFill(0x7CB342);
    this.terrainGraphics.moveTo(0, groundTop);
    
    const hillPoints = 20;
    for (let i = 0; i <= hillPoints; i++) {
      const x = (this.virtualWidth / hillPoints) * i;
      const baseWave = Math.sin(i * 0.6) * 12 + Math.cos(i * 1.0) * 8;
      const animatedWave = Math.sin(this.grassWaveOffset + i * 0.3) * 2;
      this.terrainGraphics.lineTo(x, groundTop + baseWave + animatedWave);
    }
    
    this.terrainGraphics.lineTo(this.virtualWidth, groundTop + 200);
    this.terrainGraphics.lineTo(0, groundTop + 200);
    this.terrainGraphics.closePath();
    this.terrainGraphics.endFill();
  }

  private drawFlowers(groundTop: number): void {
    const flowerCount = 30;
    const flowerColors = [0xFF6B9D, 0xFFC107, 0x9C27B0, 0x03A9F4, 0xFF5722];
    
    for (let i = 0; i < flowerCount; i++) {
      const x = Math.random() * this.virtualWidth;
      const baseY = groundTop + Math.sin((x / this.virtualWidth) * 20) * 12;
      const y = baseY + Math.random() * 15;
      const size = 3 + Math.random() * 3;
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      
      // Flower petals
      this.terrainGraphics.beginFill(color, 0.8);
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        const px = x + Math.cos(angle) * size;
        const py = y + Math.sin(angle) * size;
        this.terrainGraphics.drawCircle(px, py, size * 0.6);
      }
      this.terrainGraphics.endFill();
      
      // Flower center
      this.terrainGraphics.beginFill(0xFFEB3B, 0.9);
      this.terrainGraphics.drawCircle(x, y, size * 0.4);
      this.terrainGraphics.endFill();
    }
  }

  private drawGrassTufts(groundTop: number): void {
    const tuftCount = 150;
    this.terrainGraphics.lineStyle(2, 0x558B2F, 0.7);
    
    for (let i = 0; i < tuftCount; i++) {
      const x = (this.virtualWidth / tuftCount) * i + Math.random() * 15;
      const baseY = groundTop + Math.sin((x / this.virtualWidth) * 20) * 12;
      const height = 10 + Math.random() * 12;
      const angle = (Math.random() - 0.5) * 0.6;
      const sway = Math.sin(this.grassWaveOffset + i * 0.2) * 0.2;
      
      this.terrainGraphics.moveTo(x, baseY);
      this.terrainGraphics.lineTo(
        x + Math.sin(angle + sway) * height,
        baseY - height
      );
    }
  }

  private drawRocks(groundTop: number): void {
    const rockCount = 25;
    
    for (let i = 0; i < rockCount; i++) {
      const x = Math.random() * this.virtualWidth;
      const y = groundTop + 18 + Math.random() * 20;
      const size = 10 + Math.random() * 15;
      
      // Rock shadow
      this.terrainGraphics.beginFill(0x4E342E, 0.4);
      this.terrainGraphics.drawEllipse(x + 3, y + 3, size, size * 0.8);
      this.terrainGraphics.endFill();
      
      // Rock body
      this.terrainGraphics.beginFill(0x78909C);
      this.terrainGraphics.drawEllipse(x, y, size, size * 0.8);
      this.terrainGraphics.endFill();
      
      // Rock highlight
      this.terrainGraphics.beginFill(0xB0BEC5, 0.7);
      this.terrainGraphics.drawCircle(x - size * 0.3, y - size * 0.3, size * 0.35);
      this.terrainGraphics.endFill();
      
      // Rock detail
      this.terrainGraphics.beginFill(0x607D8B, 0.5);
      this.terrainGraphics.drawCircle(x + size * 0.2, y + size * 0.2, size * 0.2);
      this.terrainGraphics.endFill();
    }
  }

  private drawGround(): void {
    const groundHeight = Math.round(this.virtualHeight * 0.09);
    const topY = this.virtualHeight - groundHeight;
    
    this.groundGraphics.clear();
    
    // Main ground
    this.groundGraphics.beginFill(0x8B7355);
    this.groundGraphics.drawRect(0, topY, this.virtualWidth, groundHeight);
    this.groundGraphics.endFill();
  }

  // ANIMATION UPDATE - Called every frame
  public updateAnimations(): void {
    this.animationTime += 0.016; // ~60fps
    this.grassWaveOffset += 0.02;
    
    // Animate clouds (parallax effect)
    this.clouds.forEach(cloud => {
      cloud.x += cloud.speed;
      
      // Wrap around when cloud goes off screen
      if (cloud.x > this.virtualWidth + 100) {
        cloud.x = -100;
      }
      
      // Slight vertical bobbing
      const bob = Math.sin(this.animationTime * 0.5 + cloud.x * 0.001) * 2;
      cloud.graphics.position.set(cloud.x, cloud.y + bob);
    });
    
    // Animate flying birds
    this.flyingBirds.forEach(bird => {
      bird.x += bird.speedX;
      bird.y += bird.speedY;
      
      // Wave motion
      bird.y += Math.sin(this.animationTime * 2 + bird.x * 0.01) * 0.3;
      
      // Wrap around
      if (bird.x > this.virtualWidth + 50) {
        bird.x = -50;
        bird.y = this.virtualHeight * (0.15 + Math.random() * 0.15);
      }
      
      // Update wing animation
      this.drawFlyingBird(bird, this.animationTime * 8);
    });
    
    // Redraw animated grass
    const groundTop = this.virtualHeight * 0.91;
    this.terrainGraphics.clear();
    this.drawTerrain();
  }

  private interpolateColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xFF;
    const g1 = (color1 >> 8) & 0xFF;
    const b1 = color1 & 0xFF;
    
    const r2 = (color2 >> 16) & 0xFF;
    const g2 = (color2 >> 8) & 0xFF;
    const b2 = color2 & 0xFF;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return (r << 16) | (g << 8) | b;
  }

  async load(levelNumber: number): Promise<void> {
    this.currentLevel = levelNumber;
    this.clear();

    const config = this.getLevelConfig(levelNumber);
    
    this.game.setAvailableBirds(config.birds);

    config.structure.blocks.forEach(b => {
      const x = b.x * this.virtualWidth;
      const y = b.y * this.virtualHeight;
      const width = b.width * this.virtualWidth;
      const height = b.height * this.virtualHeight;
      const angle = b.angle ?? 0;

      const block = new Block(x, y, width, height, b.material, this.game, angle);
      this.blocks.push(block);
    });

    config.structure.pigs.forEach(p => {
      const x = p.x * this.virtualWidth;
      let y = p.y * this.virtualHeight;
      
      let pigRadius = 20;
      switch (p.size) {
        case 'small': pigRadius = 20; break;
        case 'medium': pigRadius = 30; break;
        case 'large': pigRadius = 40; break;
      }
      
      const groundTop = this.virtualHeight * 0.91;
      const minY = groundTop - pigRadius - 5;
      
      if (y > minY) {
        y = minY;
      }
      
      const pig = new Pig(x, y, p.size, this.game);
      this.pigs.push(pig);
    });
  }

  getTotalLevels(): number {
    return 8;
  }

  private getLevelConfig(levelNumber: number): LevelConfig {
    // Use your original level configurations from the document
    const levels: LevelConfig[] = [
      // LEVEL 1 - Tutorial
      {
        levelNumber: 1,
        birds: ['red', 'red', 'red'],
        structure: {
          blocks: [
            { x: 1500 / 2400, y: 920 / 1080, width: 20 / 2400, height: 160 / 1080, material: 'wood' },
            { x: 1650 / 2400, y: 920 / 1080, width: 20 / 2400, height: 160 / 1080, material: 'wood' },
            { x: 1575 / 2400, y: 840 / 1080, width: 180 / 2400, height: 20 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1575 / 2400, y: 880 / 1080, size: 'small' }
          ]
        },
        threeStarScore: 15000,
        twoStarScore: 10000,
        oneStarScore: 5000
      },

      // LEVEL 2 - Simple House
      {
        levelNumber: 2,
        birds: ['red', 'blue', 'red', 'blue'],
        structure: {
          blocks: [
            { x: 1450 / 2400, y: 920 / 1080, width: 20 / 2400, height: 150 / 1080, material: 'wood' },
            { x: 1700 / 2400, y: 920 / 1080, width: 20 / 2400, height: 150 / 1080, material: 'wood' },
            { x: 1575 / 2400, y: 845 / 1080, width: 280 / 2400, height: 20 / 1080, material: 'wood' },
            { x: 1500 / 2400, y: 790 / 1080, width: 20 / 2400, height: 100 / 1080, material: 'wood' },
            { x: 1650 / 2400, y: 790 / 1080, width: 20 / 2400, height: 100 / 1080, material: 'wood' },
            { x: 1575 / 2400, y: 720 / 1080, width: 180 / 2400, height: 20 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1575 / 2400, y: 880 / 1080, size: 'small' },
            { x: 1575 / 2400, y: 770 / 1080, size: 'small' }
          ]
        },
        threeStarScore: 25000,
        twoStarScore: 18000,
        oneStarScore: 12000
      },

      // Add remaining levels 3-8 from your original file...
      // (I'll include them all for completeness)
      
      // LEVEL 3
      {
        levelNumber: 3,
        birds: ['red', 'yellow', 'blue', 'red'],
        structure: {
          blocks: [
            { x: 1400 / 2400, y: 920 / 1080, width: 20 / 2400, height: 200 / 1080, material: 'stone' },
            { x: 1500 / 2400, y: 920 / 1080, width: 20 / 2400, height: 200 / 1080, material: 'stone' },
            { x: 1600 / 2400, y: 920 / 1080, width: 20 / 2400, height: 200 / 1080, material: 'stone' },
            { x: 1700 / 2400, y: 920 / 1080, width: 20 / 2400, height: 200 / 1080, material: 'stone' },
            { x: 1550 / 2400, y: 820 / 1080, width: 320 / 2400, height: 20 / 1080, material: 'wood' },
            { x: 1450 / 2400, y: 770 / 1080, width: 20 / 2400, height: 100 / 1080, material: 'stone' },
            { x: 1650 / 2400, y: 770 / 1080, width: 20 / 2400, height: 100 / 1080, material: 'stone' },
            { x: 1550 / 2400, y: 710 / 1080, width: 220 / 2400, height: 20 / 1080, material: 'stone' },
          ],
          pigs: [
            { x: 1450 / 2400, y: 870 / 1080, size: 'small' },
            { x: 1650 / 2400, y: 870 / 1080, size: 'small' },
            { x: 1550 / 2400, y: 780 / 1080, size: 'medium' }
          ]
        },
        threeStarScore: 35000,
        twoStarScore: 25000,
        oneStarScore: 18000
      },

      // LEVEL 4
      {
        levelNumber: 4,
        birds: ['blue', 'blue', 'red', 'yellow', 'blue'],
        structure: {
          blocks: [
            { x: 1400 / 2400, y: 920 / 1080, width: 20 / 2400, height: 180 / 1080, material: 'ice' },
            { x: 1480 / 2400, y: 920 / 1080, width: 20 / 2400, height: 180 / 1080, material: 'ice' },
            { x: 1620 / 2400, y: 920 / 1080, width: 20 / 2400, height: 180 / 1080, material: 'ice' },
            { x: 1700 / 2400, y: 920 / 1080, width: 20 / 2400, height: 180 / 1080, material: 'ice' },
            { x: 1440 / 2400, y: 830 / 1080, width: 100 / 2400, height: 15 / 1080, material: 'ice' },
            { x: 1660 / 2400, y: 830 / 1080, width: 100 / 2400, height: 15 / 1080, material: 'ice' },
            { x: 1550 / 2400, y: 780 / 1080, width: 240 / 2400, height: 15 / 1080, material: 'wood' },
            { x: 1500 / 2400, y: 730 / 1080, width: 20 / 2400, height: 100 / 1080, material: 'ice' },
            { x: 1600 / 2400, y: 730 / 1080, width: 20 / 2400, height: 100 / 1080, material: 'ice' },
          ],
          pigs: [
            { x: 1440 / 2400, y: 870 / 1080, size: 'small' },
            { x: 1660 / 2400, y: 870 / 1080, size: 'small' },
            { x: 1550 / 2400, y: 750 / 1080, size: 'medium' }
          ]
        },
        threeStarScore: 32000,
        twoStarScore: 23000,
        oneStarScore: 16000
      },

      // LEVEL 5
      {
        levelNumber: 5,
        birds: ['red', 'yellow', 'black', 'blue', 'red'],
        structure: {
          blocks: [
            { x: 1380 / 2400, y: 920 / 1080, width: 20 / 2400, height: 220 / 1080, material: 'stone' },
            { x: 1480 / 2400, y: 920 / 1080, width: 20 / 2400, height: 220 / 1080, material: 'wood' },
            { x: 1620 / 2400, y: 920 / 1080, width: 20 / 2400, height: 220 / 1080, material: 'wood' },
            { x: 1720 / 2400, y: 920 / 1080, width: 20 / 2400, height: 220 / 1080, material: 'stone' },
            { x: 1550 / 2400, y: 810 / 1080, width: 360 / 2400, height: 20 / 1080, material: 'stone' },
            { x: 1450 / 2400, y: 750 / 1080, width: 20 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1550 / 2400, y: 750 / 1080, width: 20 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1650 / 2400, y: 750 / 1080, width: 20 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1550 / 2400, y: 690 / 1080, width: 220 / 2400, height: 20 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1430 / 2400, y: 860 / 1080, size: 'small' },
            { x: 1670 / 2400, y: 860 / 1080, size: 'small' },
            { x: 1550 / 2400, y: 730 / 1080, size: 'medium' },
            { x: 1550 / 2400, y: 670 / 1080, size: 'large' }
          ]
        },
        threeStarScore: 45000,
        twoStarScore: 33000,
        oneStarScore: 24000
      },

      // LEVEL 6
      {
        levelNumber: 6,
        birds: ['yellow', 'white', 'blue', 'black', 'red'],
        structure: {
          blocks: [
            { x: 1400 / 2400, y: 900 / 1080, width: 25 / 2400, height: 180 / 1080, material: 'stone' },
            { x: 1500 / 2400, y: 900 / 1080, width: 25 / 2400, height: 180 / 1080, material: 'stone' },
            { x: 1450 / 2400, y: 810 / 1080, width: 120 / 2400, height: 20 / 1080, material: 'wood' },
            { x: 1420 / 2400, y: 750 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1480 / 2400, y: 750 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1600 / 2400, y: 900 / 1080, width: 25 / 2400, height: 180 / 1080, material: 'stone' },
            { x: 1700 / 2400, y: 900 / 1080, width: 25 / 2400, height: 180 / 1080, material: 'stone' },
            { x: 1650 / 2400, y: 810 / 1080, width: 120 / 2400, height: 20 / 1080, material: 'wood' },
            { x: 1620 / 2400, y: 750 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1680 / 2400, y: 750 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
          ],
          pigs: [
            { x: 1450 / 2400, y: 860 / 1080, size: 'small' },
            { x: 1650 / 2400, y: 860 / 1080, size: 'small' },
            { x: 1450 / 2400, y: 730 / 1080, size: 'medium' },
            { x: 1650 / 2400, y: 730 / 1080, size: 'medium' }
          ]
        },
        threeStarScore: 38000,
        twoStarScore: 28000,
        oneStarScore: 20000
      },

      // LEVEL 7
      {
        levelNumber: 7,
        birds: ['red', 'blue', 'yellow', 'black', 'white', 'red'],
        structure: {
          blocks: [
            { x: 1400 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1470 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1540 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1610 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1680 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1505 / 2400, y: 845 / 1080, width: 320 / 2400, height: 20 / 1080, material: 'wood' },
            { x: 1450 / 2400, y: 800 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1540 / 2400, y: 800 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1630 / 2400, y: 800 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1540 / 2400, y: 740 / 1080, width: 200 / 2400, height: 20 / 1080, material: 'wood' },
            { x: 1500 / 2400, y: 700 / 1080, width: 25 / 2400, height: 80 / 1080, material: 'wood' },
            { x: 1580 / 2400, y: 700 / 1080, width: 25 / 2400, height: 80 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1470 / 2400, y: 870 / 1080, size: 'small' },
            { x: 1610 / 2400, y: 870 / 1080, size: 'small' },
            { x: 1540 / 2400, y: 780 / 1080, size: 'medium' },
            { x: 1540 / 2400, y: 680 / 1080, size: 'large' }
          ]
        },
        threeStarScore: 50000,
        twoStarScore: 38000,
        oneStarScore: 28000
      },

      // LEVEL 8
      {
        levelNumber: 8,
        birds: ['red', 'blue', 'yellow', 'black', 'white', 'red', 'blue'],
        structure: {
          blocks: [
            { x: 1350 / 2400, y: 920 / 1080, width: 25 / 2400, height: 200 / 1080, material: 'stone' },
            { x: 1450 / 2400, y: 920 / 1080, width: 25 / 2400, height: 200 / 1080, material: 'wood' },
            { x: 1550 / 2400, y: 920 / 1080, width: 25 / 2400, height: 200 / 1080, material: 'ice' },
            { x: 1650 / 2400, y: 920 / 1080, width: 25 / 2400, height: 200 / 1080, material: 'wood' },
            { x: 1750 / 2400, y: 920 / 1080, width: 25 / 2400, height: 200 / 1080, material: 'stone' },
            { x: 1550 / 2400, y: 820 / 1080, width: 420 / 2400, height: 20 / 1080, material: 'stone' },
            { x: 1400 / 2400, y: 770 / 1080, width: 25 / 2400, height: 100 / 1080, material: 'ice' },
            { x: 1500 / 2400, y: 770 / 1080, width: 25 / 2400, height: 100 / 1080, material: 'ice' },
            { x: 1600 / 2400, y: 770 / 1080, width: 25 / 2400, height: 100 / 1080, material: 'ice' },
            { x: 1700 / 2400, y: 770 / 1080, width: 25 / 2400, height: 100 / 1080, material: 'ice' },
            { x: 1550 / 2400, y: 720 / 1080, width: 320 / 2400, height: 20 / 1080, material: 'wood' },
            { x: 1500 / 2400, y: 680 / 1080, width: 15 / 2400, height: 80 / 1080, material: 'stone' },
            { x: 1600 / 2400, y: 680 / 1080, width: 15 / 2400, height: 80 / 1080, material: 'stone' },
            { x: 1550 / 2400, y: 640 / 1080, width: 120 / 2400, height: 15 / 1080, material: 'ice' },
          ],
          pigs: [
            { x: 1400 / 2400, y: 870 / 1080, size: 'small' },
            { x: 1700 / 2400, y: 870 / 1080, size: 'small' },
            { x: 1500 / 2400, y: 790 / 1080, size: 'medium' },
            { x: 1600 / 2400, y: 790 / 1080, size: 'medium' },
            { x: 1550 / 2400, y: 660 / 1080, size: 'large' }
          ]
        },
        threeStarScore: 70000,
        twoStarScore: 52000,
        oneStarScore: 38000
      }
    ];

    if (levelNumber > levels.length) {
      return this.generateProceduralLevel(levelNumber);
    }

    return levels[levelNumber - 1];
  }

  private generateProceduralLevel(levelNumber: number): LevelConfig {
    // Your original procedural generation code
    const difficulty = levelNumber - 8;
    const numBirds = Math.min(5 + Math.floor(difficulty / 2), 8);
    const numPigs = Math.min(3 + Math.floor(difficulty / 2), 6);

    const birds: BirdType[] = [];
    const birdTypes: BirdType[] = ['red', 'blue', 'yellow', 'black', 'white'];
    
    const minBirds = Math.min(numBirds, birdTypes.length);
    for (let i = 0; i < minBirds; i++) {
      birds.push(birdTypes[i]);
    }
    
    for (let i = minBirds; i < numBirds; i++) {
      birds.push(birdTypes[Math.floor(Math.random() * birdTypes.length)]);
    }
    
    birds.sort(() => Math.random() - 0.5);

    const blocks: BlockDef[] = [];
    const pigs: PigDef[] = [];
    const materials: BlockMaterial[] = ['wood', 'stone', 'ice'];

    const numTowers = Math.min(2 + Math.floor(difficulty / 3), 3);
    const towerSpacing = 200;
    const startX = 1400;

    for (let t = 0; t < numTowers; t++) {
      const baseX = startX + t * towerSpacing;
      const towerHeight = Math.min(3 + Math.floor(difficulty / 2), 5);
      
      const towerMaterial = materials[Math.min(Math.floor(difficulty / 3), materials.length - 1)];

      for (let h = 0; h < towerHeight; h++) {
        const yPos = 920 - h * 90;
        
        blocks.push({
          x: baseX / 2400,
          y: yPos / 1080,
          width: 25 / 2400,
          height: 120 / 1080,
          material: towerMaterial
        });

        blocks.push({
          x: (baseX + 100) / 2400,
          y: yPos / 1080,
          width: 25 / 2400,
          height: 120 / 1080,
          material: towerMaterial
        });

        if (h < towerHeight - 1) {
          const beamMaterial = h % 2 === 0 ? 'wood' : 'ice';
          blocks.push({
            x: (baseX + 50) / 2400,
            y: (yPos - 60) / 1080,
            width: 120 / 2400,
            height: 20 / 1080,
            material: beamMaterial
          });
        }
      }

      if (t < numPigs) {
        const pigLevel = Math.floor(towerHeight / 2);
        const pigY = 920 - pigLevel * 90;
        
        const pigSizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
        const pigSize = pigSizes[Math.min(Math.floor(difficulty / 3), 2)];
        
        pigs.push({
          x: (baseX + 50) / 2400,
          y: pigY / 1080,
          size: pigSize
        });
      }
    }

    const remainingPigs = numPigs - numTowers;
    for (let i = 0; i < remainingPigs; i++) {
      const pigX = startX + 50 + (i * 80);
      pigs.push({
        x: pigX / 2400,
        y: 880 / 1080,
        size: i % 2 === 0 ? 'small' : 'medium'
      });
    }

    const baseScore = 10000 + (levelNumber * 5000);
    return {
      levelNumber,
      birds,
      structure: { blocks, pigs },
      threeStarScore: baseScore + 20000,
      twoStarScore: baseScore + 10000,
      oneStarScore: baseScore
    };
  }

  clear(): void {
    this.blocks.forEach(block => {
      if (block && block.destroy) {
        block.destroy();
      }
    });
    this.blocks = [];
    
    this.pigs.forEach(pig => {
      if (pig && pig.destroy) {
        pig.destroy();
      }
    });
    this.pigs = [];
  }

  update(): void {
    // Update animations every frame
    this.updateAnimations();
    
    this.blocks = this.blocks.filter(block => {
      if (!block) return false;
      
      block.update();
      
      if (block.shouldDestroy()) {
        const points = this.getBlockPoints(block.material);
        this.game.addScore(points);
        block.destroy();
        this.game.getAudioManager().play('blockDestroy');
        return false;
      }
      return true;
    });

    this.pigs = this.pigs.filter(pig => {
      if (!pig) return false;
      
      pig.update();
      
      if (pig.isDestroyed) {
        const points = this.getPigPoints(pig.size);
        this.game.addScore(points);
        pig.destroy();
        this.game.getAudioManager().play('pigDestroy');
        return false;
      }
      return true;
    });
  }

  private getBlockPoints(material: BlockMaterial): number {
    switch (material) {
      case 'wood': return 500;
      case 'ice': return 750;
      case 'stone': return 1000;
      default: return 500;
    }
  }

  private getPigPoints(size: 'small' | 'medium' | 'large'): number {
    switch (size) {
      case 'small': return 5000;
      case 'medium': return 7500;
      case 'large': return 10000;
      default: return 5000;
    }
  }

  getPigs(): Pig[] {
    return this.pigs;
  }

  getBlocks(): Block[] {
    return this.blocks;
  }

  getStarRating(score: number): number {
    const config = this.getLevelConfig(this.currentLevel);
    if (score >= config.threeStarScore) return 3;
    if (score >= config.twoStarScore) return 2;
    if (score >= config.oneStarScore) return 1;
    return 0;
  }

  getStarThresholds(): { one: number, two: number, three: number } {
    const config = this.getLevelConfig(this.currentLevel);
    return {
      one: config.oneStarScore,
      two: config.twoStarScore,
      three: config.threeStarScore
    };
  }
}