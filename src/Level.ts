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

    // Create pigs
    config.structure.pigs.forEach(p => {
      const x = p.x * this.virtualWidth;
      const y = p.y * this.virtualHeight;
      const pig = new Pig(x, y, p.size, this.game);
      this.pigs.push(pig);
    });
  }

  private getLevelConfig(levelNumber: number): LevelConfig {
    const levels: LevelConfig[] = [
      // LEVEL 1 - Tutorial
      {
        levelNumber: 1,
        birds: ['red', 'red', 'red'],
        structure: {
          blocks: [
            { x: 1200 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'wood' },
            { x: 1350 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'wood' },
            { x: 1275 / 1920, y: 850 / 1080, width: 180 / 1920, height: 20 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1275 / 1920, y: 920 / 1080, size: 'small' }
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
            { x: 1150 / 1920, y: 950 / 1080, width: 20 / 1920, height: 150 / 1080, material: 'wood' },
            { x: 1400 / 1920, y: 950 / 1080, width: 20 / 1920, height: 150 / 1080, material: 'wood' },
            { x: 1275 / 1920, y: 875 / 1080, width: 280 / 1920, height: 20 / 1080, material: 'wood' },
            { x: 1200 / 1920, y: 820 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'wood' },
            { x: 1350 / 1920, y: 820 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'wood' },
            { x: 1275 / 1920, y: 750 / 1080, width: 180 / 1920, height: 20 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1275 / 1920, y: 950 / 1080, size: 'small' },
            { x: 1275 / 1920, y: 800 / 1080, size: 'small' }
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
            { x: 1100 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'stone' },
            { x: 1200 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'stone' },
            { x: 1300 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'stone' },
            { x: 1400 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'stone' },
            { x: 1250 / 1920, y: 850 / 1080, width: 320 / 1920, height: 20 / 1080, material: 'wood' },
            { x: 1150 / 1920, y: 800 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'stone' },
            { x: 1350 / 1920, y: 800 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'stone' },
            { x: 1250 / 1920, y: 740 / 1080, width: 220 / 1920, height: 20 / 1080, material: 'stone' },
          ],
          pigs: [
            { x: 1150 / 1920, y: 920 / 1080, size: 'small' },
            { x: 1350 / 1920, y: 920 / 1080, size: 'small' },
            { x: 1250 / 1920, y: 810 / 1080, size: 'medium' }
          ]
        },
        threeStarScore: 35000,
        twoStarScore: 25000,
        oneStarScore: 18000
      },

      // LEVEL 4 - Ice Palace
      {
        levelNumber: 4,
        birds: ['blue', 'blue', 'red', 'yellow', 'blue'],
        structure: {
          blocks: [
            { x: 1100 / 1920, y: 950 / 1080, width: 20 / 1920, height: 180 / 1080, material: 'ice' },
            { x: 1180 / 1920, y: 950 / 1080, width: 20 / 1920, height: 180 / 1080, material: 'ice' },
            { x: 1320 / 1920, y: 950 / 1080, width: 20 / 1920, height: 180 / 1080, material: 'ice' },
            { x: 1400 / 1920, y: 950 / 1080, width: 20 / 1920, height: 180 / 1080, material: 'ice' },
            { x: 1140 / 1920, y: 860 / 1080, width: 100 / 1920, height: 15 / 1080, material: 'ice' },
            { x: 1360 / 1920, y: 860 / 1080, width: 100 / 1920, height: 15 / 1080, material: 'ice' },
            { x: 1250 / 1920, y: 810 / 1080, width: 240 / 1920, height: 15 / 1080, material: 'wood' },
            { x: 1200 / 1920, y: 760 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'ice' },
            { x: 1300 / 1920, y: 760 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'ice' },
          ],
          pigs: [
            { x: 1140 / 1920, y: 920 / 1080, size: 'small' },
            { x: 1360 / 1920, y: 920 / 1080, size: 'small' },
            { x: 1250 / 1920, y: 780 / 1080, size: 'medium' }
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
            { x: 1080 / 1920, y: 950 / 1080, width: 20 / 1920, height: 220 / 1080, material: 'stone' },
            { x: 1180 / 1920, y: 950 / 1080, width: 20 / 1920, height: 220 / 1080, material: 'wood' },
            { x: 1320 / 1920, y: 950 / 1080, width: 20 / 1920, height: 220 / 1080, material: 'wood' },
            { x: 1420 / 1920, y: 950 / 1080, width: 20 / 1920, height: 220 / 1080, material: 'stone' },
            { x: 1250 / 1920, y: 840 / 1080, width: 360 / 1920, height: 20 / 1080, material: 'stone' },
            { x: 1150 / 1920, y: 780 / 1080, width: 20 / 1920, height: 120 / 1080, material: 'ice' },
            { x: 1250 / 1920, y: 780 / 1080, width: 20 / 1920, height: 120 / 1080, material: 'ice' },
            { x: 1350 / 1920, y: 780 / 1080, width: 20 / 1920, height: 120 / 1080, material: 'ice' },
            { x: 1250 / 1920, y: 720 / 1080, width: 220 / 1920, height: 20 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1130 / 1920, y: 920 / 1080, size: 'small' },
            { x: 1370 / 1920, y: 920 / 1080, size: 'small' },
            { x: 1250 / 1920, y: 760 / 1080, size: 'medium' },
            { x: 1250 / 1920, y: 700 / 1080, size: 'large' }
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
            { x: 1050 / 1920, y: 950 / 1080, width: 25 / 1920, height: 200 / 1080, material: 'wood' },
            { x: 1150 / 1920, y: 950 / 1080, width: 25 / 1920, height: 200 / 1080, material: 'wood' },
            { x: 1100 / 1920, y: 850 / 1080, width: 120 / 1920, height: 20 / 1080, material: 'stone' },
            { x: 1070 / 1920, y: 790 / 1080, width: 20 / 1920, height: 120 / 1080, material: 'ice' },
            { x: 1130 / 1920, y: 790 / 1080, width: 20 / 1920, height: 120 / 1080, material: 'ice' },
            { x: 1100 / 1920, y: 730 / 1080, width: 80 / 1920, height: 15 / 1080, material: 'wood' },
            // Right tower
            { x: 1350 / 1920, y: 950 / 1080, width: 25 / 1920, height: 200 / 1080, material: 'wood' },
            { x: 1450 / 1920, y: 950 / 1080, width: 25 / 1920, height: 200 / 1080, material: 'wood' },
            { x: 1400 / 1920, y: 850 / 1080, width: 120 / 1920, height: 20 / 1080, material: 'stone' },
            { x: 1370 / 1920, y: 790 / 1080, width: 20 / 1920, height: 120 / 1080, material: 'ice' },
            { x: 1430 / 1920, y: 790 / 1080, width: 20 / 1920, height: 120 / 1080, material: 'ice' },
            { x: 1400 / 1920, y: 730 / 1080, width: 80 / 1920, height: 15 / 1080, material: 'wood' },
            // Bridge
            { x: 1250 / 1920, y: 850 / 1080, width: 220 / 1920, height: 15 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1100 / 1920, y: 920 / 1080, size: 'medium' },
            { x: 1400 / 1920, y: 920 / 1080, size: 'medium' },
            { x: 1250 / 1920, y: 830 / 1080, size: 'large' },
            { x: 1100 / 1920, y: 780 / 1080, size: 'small' },
            { x: 1400 / 1920, y: 780 / 1080, size: 'small' }
          ]
        },
        threeStarScore: 55000,
        twoStarScore: 40000,
        oneStarScore: 30000
      },

      // LEVEL 7 - The Stronghold
      {
        levelNumber: 7,
        birds: ['red', 'blue', 'yellow', 'black', 'white', 'red'],
        structure: {
          blocks: [
            // Outer walls
            { x: 1000 / 1920, y: 950 / 1080, width: 30 / 1920, height: 250 / 1080, material: 'stone' },
            { x: 1500 / 1920, y: 950 / 1080, width: 30 / 1920, height: 250 / 1080, material: 'stone' },
            // Inner structure
            { x: 1150 / 1920, y: 950 / 1080, width: 25 / 1920, height: 180 / 1080, material: 'wood' },
            { x: 1250 / 1920, y: 950 / 1080, width: 25 / 1920, height: 180 / 1080, material: 'wood' },
            { x: 1350 / 1920, y: 950 / 1080, width: 25 / 1920, height: 180 / 1080, material: 'wood' },
            { x: 1250 / 1920, y: 860 / 1080, width: 250 / 1920, height: 25 / 1080, material: 'stone' },
            // Top layer
            { x: 1200 / 1920, y: 800 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'ice' },
            { x: 1300 / 1920, y: 800 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'ice' },
            { x: 1250 / 1920, y: 750 / 1080, width: 120 / 1920, height: 20 / 1080, material: 'stone' },
            // Protective platforms
            { x: 1050 / 1920, y: 880 / 1080, width: 80 / 1920, height: 15 / 1080, material: 'wood' },
            { x: 1450 / 1920, y: 880 / 1080, width: 80 / 1920, height: 15 / 1080, material: 'wood' },
          ],
          pigs: [
            { x: 1050 / 1920, y: 860 / 1080, size: 'small' },
            { x: 1450 / 1920, y: 860 / 1080, size: 'small' },
            { x: 1200 / 1920, y: 920 / 1080, size: 'medium' },
            { x: 1300 / 1920, y: 920 / 1080, size: 'medium' },
            { x: 1250 / 1920, y: 780 / 1080, size: 'large' }
          ]
        },
        threeStarScore: 65000,
        twoStarScore: 48000,
        oneStarScore: 35000
      },

      // LEVEL 8 - The Pyramid
      {
        levelNumber: 8,
        birds: ['yellow', 'yellow', 'black', 'white', 'red', 'blue'],
        structure: {
          blocks: [
            // Base layer
            { x: 1100 / 1920, y: 950 / 1080, width: 25 / 1920, height: 120 / 1080, material: 'stone' },
            { x: 1200 / 1920, y: 950 / 1080, width: 25 / 1920, height: 120 / 1080, material: 'stone' },
            { x: 1300 / 1920, y: 950 / 1080, width: 25 / 1920, height: 120 / 1080, material: 'stone' },
            { x: 1400 / 1920, y: 950 / 1080, width: 25 / 1920, height: 120 / 1080, material: 'stone' },
            // Second layer
            { x: 1150 / 1920, y: 870 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'wood' },
            { x: 1250 / 1920, y: 870 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'wood' },
            { x: 1350 / 1920, y: 870 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'wood' },
            // Third layer
            { x: 1200 / 1920, y: 800 / 1080, width: 18 / 1920, height: 80 / 1080, material: 'ice' },
            { x: 1300 / 1920, y: 800 / 1080, width: 18 / 1920, height: 80 / 1080, material: 'ice' },
            // Top
            { x: 1250 / 1920, y: 740 / 1080, width: 15 / 1920, height: 60 / 1080, material: 'ice' },
          ],
          pigs: [
            { x: 1150 / 1920, y: 920 / 1080, size: 'small' },
            { x: 1350 / 1920, y: 920 / 1080, size: 'small' },
            { x: 1200 / 1920, y: 840 / 1080, size: 'medium' },
            { x: 1300 / 1920, y: 840 / 1080, size: 'medium' },
            { x: 1250 / 1920, y: 720 / 1080, size: 'large' }
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
    const difficulty = levelNumber - 8; // Difficulty increases after level 8
    const numBirds = Math.min(5 + Math.floor(difficulty / 2), 8);
    const numPigs = Math.min(3 + Math.floor(difficulty / 2), 6);

    // Generate birds with variety - ensure strategic mix
    const birds: BirdType[] = [];
    const birdTypes: BirdType[] = ['red', 'blue', 'yellow', 'black', 'white'];
    
    // Start with at least one of each type for variety
    const minBirds = Math.min(numBirds, birdTypes.length);
    for (let i = 0; i < minBirds; i++) {
      birds.push(birdTypes[i]);
    }
    
    // Fill remaining slots randomly
    for (let i = minBirds; i < numBirds; i++) {
      birds.push(birdTypes[Math.floor(Math.random() * birdTypes.length)]);
    }
    
    // Shuffle for variety
    birds.sort(() => Math.random() - 0.5);

    // Generate structure
    const blocks: BlockDef[] = [];
    const pigs: PigDef[] = [];
    const materials: BlockMaterial[] = ['wood', 'stone', 'ice'];

    // Create towers with better positioning
    const numTowers = Math.min(2 + Math.floor(difficulty / 3), 3);
    const towerSpacing = 200;
    const startX = 1100;

    for (let t = 0; t < numTowers; t++) {
      const baseX = startX + t * towerSpacing;
      const towerHeight = Math.min(3 + Math.floor(difficulty / 2), 5);
      
      // Select material based on difficulty
      const towerMaterial = materials[Math.min(Math.floor(difficulty / 3), materials.length - 1)];

      // Tower pillars
      for (let h = 0; h < towerHeight; h++) {
        const yPos = 950 - h * 90;
        
        // Left pillar
        blocks.push({
          x: baseX / 1920,
          y: yPos / 1080,
          width: 25 / 1920,
          height: 120 / 1080,
          material: towerMaterial
        });

        // Right pillar
        blocks.push({
          x: (baseX + 100) / 1920,
          y: yPos / 1080,
          width: 25 / 1920,
          height: 120 / 1080,
          material: towerMaterial
        });

        // Cross beam (lighter material)
        if (h < towerHeight - 1) {
          const beamMaterial = h % 2 === 0 ? 'wood' : 'ice';
          blocks.push({
            x: (baseX + 50) / 1920,
            y: (yPos - 60) / 1080,
            width: 120 / 1920,
            height: 20 / 1080,
            material: beamMaterial
          });
        }
      }

      // Place pigs strategically in towers
      if (t < numPigs) {
        const pigLevel = Math.floor(towerHeight / 2);
        const pigY = 950 - pigLevel * 90;
        
        const pigSizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
        const pigSize = pigSizes[Math.min(Math.floor(difficulty / 3), 2)];
        
        pigs.push({
          x: (baseX + 50) / 1920,
          y: pigY / 1080,
          size: pigSize
        });
      }
    }

    // Add ground level pigs
    const remainingPigs = numPigs - numTowers;
    for (let i = 0; i < remainingPigs; i++) {
      const pigX = startX + 50 + (i * 80);
      pigs.push({
        x: pigX / 1920,
        y: 940 / 1080,
        size: i % 2 === 0 ? 'small' : 'medium'
      });
    }

    // Calculate star scores based on difficulty
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
    // Clear blocks
    this.blocks.forEach(block => {
      if (block && block.destroy) {
        block.destroy();
      }
    });
    this.blocks = [];
    
    // Clear pigs
    this.pigs.forEach(pig => {
      if (pig && pig.destroy) {
        pig.destroy();
      }
    });
    this.pigs = [];
  }

  update(): void {
    // Update blocks and award points
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

    // Update pigs and award points
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

  // Get star rating based on score
  getStarRating(score: number): number {
    const config = this.getLevelConfig(this.currentLevel);
    if (score >= config.threeStarScore) return 3;
    if (score >= config.twoStarScore) return 2;
    if (score >= config.oneStarScore) return 1;
    return 0;
  }

  // Get required score for stars
  getStarThresholds(): { one: number, two: number, three: number } {
    const config = this.getLevelConfig(this.currentLevel);
    return {
      one: config.oneStarScore,
      two: config.twoStarScore,
      three: config.threeStarScore
    };
  }
}