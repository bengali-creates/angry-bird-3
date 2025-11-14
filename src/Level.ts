import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import type { Game } from './Game';
import { Block, type BlockMaterial } from './Block';
import { Pig } from './Pig';

interface BlockDef {
  // normalized values [0..1] relative to virtual width/height
  x: number;        // fraction of virtual width (0..1)
  y: number;        // fraction of virtual height (0..1)
  width: number;    // fraction of virtual width
  height: number;   // fraction of virtual height
  material: BlockMaterial;
  angle?: number;   // in radians (optional)
}

interface PigDef {
  x: number;        // fraction of virtual width
  y: number;        // fraction of virtual height
  size: 'small' | 'medium' | 'large';
}

interface LevelStructure {
  blocks: BlockDef[];
  pigs: PigDef[];
}

export class Level {
  public currentLevel: number = 0;

  private game: Game;
  private blocks: Block[] = [];
  private pigs: Pig[] = [];
  private ground: Matter.Body;
  private groundGraphics: PIXI.Graphics;

  // Virtual world size (defaults to classic 1920x1080)
  private virtualWidth: number;
  private virtualHeight: number;

  constructor(game: Game, virtualWidth = 3500, virtualHeight = 2000) {
    this.game = game;
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;

    // Ground parameters in virtual coords
    const groundHeight = Math.round(this.virtualHeight * 0.09); // ~100 @1080
    const groundY = this.virtualHeight - groundHeight / 2;       // center y of ground

    // Create ground body (centered)
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

    // Ground graphics (positioned using virtual coords)
    this.groundGraphics = new PIXI.Graphics();
    this.groundGraphics.beginFill(0x8B7355);
    // drawRect uses top-left, so compute top-left y
    const topY = this.virtualHeight - groundHeight;
    this.groundGraphics.drawRect(0, topY, this.virtualWidth, groundHeight);
    this.groundGraphics.endFill();
    this.game.getContainer().addChild(this.groundGraphics);
  }

  async load(levelNumber: number): Promise<void> {
    this.currentLevel = levelNumber;
    this.clear();

    const structure = this.generateLevel(levelNumber);

    // Create blocks — convert normalized -> virtual pixel coords
    structure.blocks.forEach(b => {
      const x = b.x * this.virtualWidth;
      const y = b.y * this.virtualHeight;
      const width = b.width * this.virtualWidth;
      const height = b.height * this.virtualHeight;
      const angle = b.angle ?? 0;

      const block = new Block(x, y, width, height, b.material, this.game, angle);
      this.blocks.push(block);
    });

    // Create pigs — convert normalized -> virtual pixel coords
    structure.pigs.forEach(p => {
      const x = p.x * this.virtualWidth;
      const y = p.y * this.virtualHeight;
      const pig = new Pig(x, y, p.size, this.game);
      this.pigs.push(pig);
    });
  }

  private generateLevel(level: number): LevelStructure {
    // Define structures with normalized coordinates (fractions of virtual size).
    // These keep the same visual proportions across devices.
    const structures: LevelStructure[] = [
      // Level 1: simple tower (roughly located right side)
      {
        blocks: [
          { x: 1200 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'wood' },
          { x: 1350 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'wood' },
          { x: 1275 / 1920, y: 850 / 1080, width: 180 / 1920, height: 20 / 1080, material: 'wood' },
        ],
        pigs: [
          { x: 1275 / 1920, y: 920 / 1080, size: 'small' }
        ]
      },

      // Level 2: simple house
      {
        blocks: [
          { x: 1150 / 1920, y: 950 / 1080, width: 20 / 1920, height: 150 / 1080, material: 'wood' },
          { x: 1400 / 1920, y: 950 / 1080, width: 20 / 1920, height: 150 / 1080, material: 'wood' },
          { x: 1275 / 1920, y: 875 / 1080, width: 280 / 1920, height: 20 / 1080, material: 'wood' },
          { x: 1200 / 1920, y: 820 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'stone' },
          { x: 1350 / 1920, y: 820 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'stone' },
          { x: 1275 / 1920, y: 750 / 1080, width: 180 / 1920, height: 20 / 1080, material: 'stone' },
        ],
        pigs: [
          { x: 1275 / 1920, y: 950 / 1080, size: 'small' },
          { x: 1275 / 1920, y: 800 / 1080, size: 'medium' }
        ]
      },

      // Level 3: castle
      {
        blocks: [
          { x: 1100 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'stone' },
          { x: 1200 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'ice' },
          { x: 1300 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'ice' },
          { x: 1400 / 1920, y: 950 / 1080, width: 20 / 1920, height: 200 / 1080, material: 'stone' },
          { x: 1250 / 1920, y: 850 / 1080, width: 320 / 1920, height: 20 / 1080, material: 'wood' },
          { x: 1150 / 1920, y: 800 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'stone' },
          { x: 1350 / 1920, y: 800 / 1080, width: 20 / 1920, height: 100 / 1080, material: 'stone' },
          { x: 1250 / 1920, y: 740 / 1080, width: 220 / 1920, height: 20 / 1080, material: 'stone' },
        ],
        pigs: [
          { x: 1150 / 1920, y: 920 / 1080, size: 'small' },
          { x: 1350 / 1920, y: 920 / 1080, size: 'small' },
          { x: 1250 / 1920, y: 810 / 1080, size: 'large' }
        ]
      }
    ];

    // Choose structure based on level number
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
