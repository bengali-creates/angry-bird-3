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

export class Level {
  public currentLevel: number = 0;

  private game: Game;
  private blocks: Block[] = [];
  private pigs: Pig[] = [];
  private ground: Matter.Body;
  private groundGraphics: PIXI.Graphics;

  private virtualWidth: number;
  private virtualHeight: number;

  constructor(game: Game, virtualWidth = 2400, virtualHeight = 1080) {
    this.game = game;
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;

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
        restitution: 0.2
      }
    );
    Matter.World.add(this.game.getWorld(), this.ground);

    this.groundGraphics = new PIXI.Graphics();
    this.groundGraphics.beginFill(0x8B7355);
    const topY = this.virtualHeight - groundHeight;
    this.groundGraphics.drawRect(0, topY, this.virtualWidth, groundHeight);
    this.groundGraphics.endFill();
    this.game.getContainer().addChild(this.groundGraphics);
  }

  async load(levelNumber: number): Promise<void> {
    this.currentLevel = levelNumber;
    this.clear();

    const config = this.getLevelConfig(levelNumber);
    
    // Set birds for this level
    this.game.setAvailableBirds(config.birds);

    // Create blocks
    config.structure.blocks.forEach(b => {
      const x = b.x * this.virtualWidth;
      const y = b.y * this.virtualHeight;
      const width = b.width * this.virtualWidth;
      const height = b.height * this.virtualHeight;
      const angle = b.angle ?? 0;

      const block = new Block(x, y, width, height, b.material, this.game, angle);
      this.blocks.push(block);
    });

    // Create pigs - FIXED: Adjust spawn position to prevent ground collision death
    config.structure.pigs.forEach(p => {
      const x = p.x * this.virtualWidth;
      let y = p.y * this.virtualHeight;
      
      // Get pig size for radius calculation
      let pigRadius = 20;
      switch (p.size) {
        case 'small': pigRadius = 20; break;
        case 'medium': pigRadius = 30; break;
        case 'large': pigRadius = 40; break;
      }
      
      // Ensure pig spawns above ground with clearance
      const groundTop = this.virtualHeight * 0.91; // Ground starts here
      const minY = groundTop - pigRadius - 5; // Add 5px clearance
      
      if (y > minY) {
        y = minY;
      }
      
      const pig = new Pig(x, y, p.size, this.game);
      this.pigs.push(pig);
    });
  }

  getTotalLevels(): number {
    return 8; // We have 8 predefined levels
  }

  private getLevelConfig(levelNumber: number): LevelConfig {
    const levels: LevelConfig[] = [
      // LEVEL 1 - Tutorial (structures moved further from slingshot)
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

      // LEVEL 3 - Stone Castle
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

      // LEVEL 4 - Ice Palace (FIXED: Ice blocks now more visible)
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

      // LEVEL 5 - Fortress (introduces black bird)
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

      // LEVEL 6 - Twin Towers (introduces white bird)
      {
        levelNumber: 6,
        birds: ['yellow', 'white', 'blue', 'black', 'red'],
        structure: {
          blocks: [
            // Left tower
            { x: 1400 / 2400, y: 900 / 1080, width: 25 / 2400, height: 180 / 1080, material: 'stone' },
            { x: 1500 / 2400, y: 900 / 1080, width: 25 / 2400, height: 180 / 1080, material: 'stone' },
            { x: 1450 / 2400, y: 810 / 1080, width: 120 / 2400, height: 20 / 1080, material: 'wood' },
            { x: 1420 / 2400, y: 750 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1480 / 2400, y: 750 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            // Right tower
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

      // LEVEL 7 - The Pyramid
      {
        levelNumber: 7,
        birds: ['red', 'blue', 'yellow', 'black', 'white', 'red'],
        structure: {
          blocks: [
            // Base layer
            { x: 1400 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1470 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1540 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1610 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1680 / 2400, y: 920 / 1080, width: 25 / 2400, height: 150 / 1080, material: 'stone' },
            { x: 1505 / 2400, y: 845 / 1080, width: 320 / 2400, height: 20 / 1080, material: 'wood' },
            // Middle layer
            { x: 1450 / 2400, y: 800 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1540 / 2400, y: 800 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1630 / 2400, y: 800 / 1080, width: 25 / 2400, height: 120 / 1080, material: 'ice' },
            { x: 1540 / 2400, y: 740 / 1080, width: 200 / 2400, height: 20 / 1080, material: 'wood' },
            // Top layer
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

      // LEVEL 8 - The Ultimate Challenge
      {
        levelNumber: 8,
        birds: ['red', 'blue', 'yellow', 'black', 'white', 'red', 'blue'],
        structure: {
          blocks: [
            // Complex multi-level structure
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

    // For levels beyond defined, generate procedural levels
    if (levelNumber > levels.length) {
      return this.generateProceduralLevel(levelNumber);
    }

    return levels[levelNumber - 1];
  }

  private generateProceduralLevel(levelNumber: number): LevelConfig {
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
    const startX = 1400; // Adjusted for new wider world

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

    // Add ground level pigs with safe Y position
    const remainingPigs = numPigs - numTowers;
    for (let i = 0; i < remainingPigs; i++) {
      const pigX = startX + 50 + (i * 80);
      pigs.push({
        x: pigX / 2400,
        y: 880 / 1080, // Safe position above ground
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