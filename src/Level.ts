import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import type { Game } from './Game';
import { Block, type BlockMaterial } from './Block';

import { Pig } from './Pig';

interface LevelStructure {
  blocks: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    material: BlockMaterial;
    angle?: number;
  }>;
  pigs: Array<{
    x: number;
    y: number;
    size: 'small' | 'medium' | 'large';
  }>;
}

export class Level {
  public currentLevel: number = 0;
  
  private game: Game;
  private blocks: Block[] = [];
  private pigs: Pig[] = [];
  private ground: Matter.Body;
  private groundGraphics: PIXI.Graphics;

  constructor(game: Game) {
    this.game = game;
    
    // Create ground
    this.ground = Matter.Bodies.rectangle(960, 1050, 1920, 100, {
      isStatic: true,
      friction: 1,
      restitution: 0.2
    });
    Matter.World.add(this.game.getWorld(), this.ground);
    
    // Create ground graphics
    this.groundGraphics = new PIXI.Graphics();
    this.groundGraphics.beginFill(0x8B7355);
    this.groundGraphics.drawRect(0, 1000, 1920, 100);
    this.groundGraphics.endFill();
    this.game.getContainer().addChild(this.groundGraphics);
  }

  async load(levelNumber: number): Promise<void> {
    this.currentLevel = levelNumber;
    this.clear();
    
    const structure = this.generateLevel(levelNumber);
    
    // Create blocks
    structure.blocks.forEach(blockData => {
      const block = new Block(
        blockData.x,
        blockData.y,
        blockData.width,
        blockData.height,
        blockData.material,
        this.game,
        blockData.angle
      );
      this.blocks.push(block);
    });
    
    // Create pigs
    structure.pigs.forEach(pigData => {
      const pig = new Pig(pigData.x, pigData.y, pigData.size, this.game);
      this.pigs.push(pig);
    });
  }

  private generateLevel(level: number): LevelStructure {
    // Progressive difficulty system
    const structures: LevelStructure[] = [
      // Level 1: Simple tower
      {
        blocks: [
          { x: 1200, y: 950, width: 20, height: 200, material: 'wood' },
          { x: 1350, y: 950, width: 20, height: 200, material: 'wood' },
          { x: 1275, y: 850, width: 180, height: 20, material: 'wood' },
        ],
        pigs: [
          { x: 1275, y: 920, size: 'small' }
        ]
      },
      // Level 2: Simple house
      {
        blocks: [
          { x: 1150, y: 950, width: 20, height: 150, material: 'wood' },
          { x: 1400, y: 950, width: 20, height: 150, material: 'wood' },
          { x: 1275, y: 875, width: 280, height: 20, material: 'wood' },
          { x: 1200, y: 820, width: 20, height: 100, material: 'stone' },
          { x: 1350, y: 820, width: 20, height: 100, material: 'stone' },
          { x: 1275, y: 750, width: 180, height: 20, material: 'stone', angle: 0 },
        ],
        pigs: [
          { x: 1275, y: 950, size: 'small' },
          { x: 1275, y: 800, size: 'medium' }
        ]
      },
      // Level 3: Castle with ice
      {
        blocks: [
          { x: 1100, y: 950, width: 20, height: 200, material: 'stone' },
          { x: 1200, y: 950, width: 20, height: 200, material: 'ice' },
          { x: 1300, y: 950, width: 20, height: 200, material: 'ice' },
          { x: 1400, y: 950, width: 20, height: 200, material: 'stone' },
          { x: 1250, y: 850, width: 320, height: 20, material: 'wood' },
          { x: 1150, y: 800, width: 20, height: 100, material: 'stone' },
          { x: 1350, y: 800, width: 20, height: 100, material: 'stone' },
          { x: 1250, y: 740, width: 220, height: 20, material: 'stone' },
        ],
        pigs: [
          { x: 1150, y: 920, size: 'small' },
          { x: 1350, y: 920, size: 'small' },
          { x: 1250, y: 810, size: 'large' }
        ]
      }
    ];
    
    // Cycle through structures or generate increasingly complex ones
    const index = (level - 1) % structures.length;
    return structures[index];
  }

  clear(): void {
    // Remove all blocks
    this.blocks.forEach(block => block.destroy());
    this.blocks = [];
    
    // Remove all pigs
    this.pigs.forEach(pig => pig.destroy());
    this.pigs = [];
  }

  update(): void {
    // Update blocks (check for damage)
    this.blocks = this.blocks.filter(block => {
      block.update();
      if (block.shouldDestroy()) {
        block.destroy();
        this.game.getAudioManager().play('blockDestroy');
        return false;
      }
      return true;
    });
    
    // Update pigs (check for damage)
    this.pigs = this.pigs.filter(pig => {
      pig.update();
      if (pig.isDestroyed) {
        pig.destroy();
        this.game.getAudioManager().play('pigDestroy');
        return false;
      }
      return true;
    });
  }

  getPigs(): Pig[] {
    return this.pigs;
  }

  getBlocks(): Block[] {
    return this.blocks;
  }
}