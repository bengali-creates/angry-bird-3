import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import type { Game } from './Game';

export type BlockMaterial = 'wood' | 'stone' | 'ice';

interface MaterialProperties {
  density: number;
  friction: number;
  restitution: number;
  color: number;
  durability: number;
}

export class Block {
  public body: Matter.Body;
  public sprite: PIXI.Graphics;
  public material: BlockMaterial;
  
  private game: Game;
  private width: number;
  private height: number;
  private health: number;
  private maxHealth: number;
  private lastImpactTime: number = 0;
  
  // FIXED: Store reference to the collision handler so we can remove it later
  private collisionHandler: ((event: Matter.IEventCollision<Matter.Engine>) => void) | null = null;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    material: BlockMaterial,
    game: Game,
    angle: number = 0
  ) {
    this.game = game;
    this.width = width;
    this.height = height;
    this.material = material;
    
    const props = this.getMaterialProperties();
    this.maxHealth = props.durability;
    this.health = this.maxHealth;
    
    // Create physics body
    this.body = Matter.Bodies.rectangle(x, y, width, height, {
      density: props.density,
      friction: props.friction,
      restitution: props.restitution,
      angle: angle
    });
    
    Matter.World.add(this.game.getWorld(), this.body);
    
    // Create sprite
    this.sprite = new PIXI.Graphics();
    this.updateSprite(props.color);
    this.game.getContainer().addChild(this.sprite);
    
    // FIXED: Store the bound function so we can remove the listener in destroy()
    this.collisionHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
      this.handleCollision(event);
    };
    Matter.Events.on(this.game.getEngine(), 'collisionStart', this.collisionHandler);
  }

  private getMaterialProperties(): MaterialProperties {
    switch (this.material) {
      case 'wood':
        return {
          density: 0.0006,
          friction: 0.5,
          restitution: 0.3,
          color: 0x8B4513,
          durability: 50
        };
      case 'stone':
        return {
          density: 0.002,
          friction: 0.8,
          restitution: 0.1,
          color: 0x808080,
          durability: 150
        };
      case 'ice':
        return {
          density: 0.0009,
          friction: 0.05,
          restitution: 0.8,
          color: 0x4DB8E8, // Brighter, more visible cyan/blue color
          durability: 30
        };
      default:
        return {
          density: 0.001,
          friction: 0.5,
          restitution: 0.3,
          color: 0x8B4513,
          durability: 50
        };
    }
  }

  private updateSprite(baseColor: number): void {
    this.sprite.clear();
    
    // Calculate damage tint (darker as health decreases)
    const healthPercent = this.health / this.maxHealth;
    
    // For ice blocks, use special rendering for better visibility
    if (this.material === 'ice') {
      // Draw bright ice base with better visibility
      this.sprite.beginFill(0x8FDBF5, 0.9); // Very light blue, almost opaque
      this.sprite.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
      this.sprite.endFill();
      
      // Add darker blue tint based on health
      const darknessFactor = healthPercent * 0.4 + 0.6;
      this.sprite.beginFill(baseColor, darknessFactor * 0.7);
      this.sprite.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
      this.sprite.endFill();
      
      // Add strong border for ice blocks
      this.sprite.lineStyle(3, 0x1E90FF, 0.9); // Bright blue border
      this.sprite.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
      
      // Ice crystal pattern for better visibility
      this.sprite.lineStyle(2, 0xFFFFFF, 0.6);
      // Diagonal lines for ice crystal effect
      this.sprite.moveTo(-this.width / 2, -this.height / 2);
      this.sprite.lineTo(this.width / 2, this.height / 2);
      this.sprite.moveTo(this.width / 2, -this.height / 2);
      this.sprite.lineTo(-this.width / 2, this.height / 2);
      // Center snowflake
      this.sprite.moveTo(0, -this.height / 4);
      this.sprite.lineTo(0, this.height / 4);
      this.sprite.moveTo(-this.width / 4, 0);
      this.sprite.lineTo(this.width / 4, 0);
    } else {
      // Normal rendering for wood and stone
      const darkenFactor = healthPercent * 0.6 + 0.4;
      this.sprite.beginFill(baseColor, darkenFactor);
      this.sprite.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
      this.sprite.endFill();
      
      // Add texture lines
      this.sprite.lineStyle(2, 0x000000, 0.2);
      if (this.material === 'wood') {
        // Wood grain
        for (let i = 0; i < 3; i++) {
          const y = -this.height / 2 + (this.height / 4) * (i + 1);
          this.sprite.moveTo(-this.width / 2, y);
          this.sprite.lineTo(this.width / 2, y);
        }
      } else if (this.material === 'stone') {
        // Stone cracks
        this.sprite.moveTo(0, -this.height / 2);
        this.sprite.lineTo(-this.width / 4, 0);
        this.sprite.lineTo(this.width / 4, this.height / 2);
      }
    }
    
    // Show cracks when damaged
    if (healthPercent < 0.5) {
      this.sprite.lineStyle(3, 0xFF0000, 0.5);
      this.sprite.moveTo(-this.width / 3, -this.height / 3);
      this.sprite.lineTo(this.width / 3, this.height / 3);
    }
  }

  private handleCollision(event: Matter.IEventCollision<Matter.Engine>): void {
    const now = Date.now();
    if (now - this.lastImpactTime < 100) return; // Debounce
    
    event.pairs.forEach(pair => {
      if (pair.bodyA === this.body || pair.bodyB === this.body) {
        const otherBody = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;
        
        // Calculate impact force
        const relativeVelocity = {
          x: this.body.velocity.x - otherBody.velocity.x,
          y: this.body.velocity.y - otherBody.velocity.y
        };
        
        const impactSpeed = Math.sqrt(
          relativeVelocity.x * relativeVelocity.x +
          relativeVelocity.y * relativeVelocity.y
        );
        
        // Apply damage based on impact
        if (impactSpeed > 2) {
          const damage = impactSpeed * 5;
          this.takeDamage(damage);
          this.lastImpactTime = now;
          
          // Play sound
          this.game.getAudioManager().play('blockHit');
        }
      }
    });
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
    }
    
    // Update sprite to show damage
    const props = this.getMaterialProperties();
    this.updateSprite(props.color);
  }

  shouldDestroy(): boolean {
    return this.health <= 0;
  }

  update(): void {
    // Sync sprite with physics body
    this.sprite.position.set(this.body.position.x, this.body.position.y);
    this.sprite.rotation = this.body.angle;
  }

  destroy(): void {
    // FIXED: Clean up the event listener to prevent memory leaks and game freezing
    if (this.collisionHandler) {
      Matter.Events.off(this.game.getEngine(), 'collisionStart', this.collisionHandler);
      this.collisionHandler = null;
    }

    Matter.World.remove(this.game.getWorld(), this.body);
    this.game.getContainer().removeChild(this.sprite);
  }
}