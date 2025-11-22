import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import type { Game } from './Game';

type PigSize = 'small' | 'medium' | 'large';

export class Pig {
  public body: Matter.Body;
  public sprite: PIXI.Graphics;
  public isDestroyed: boolean = false;
  public size: PigSize;
  
  private game: Game;
  private radius: number;
  private health: number;
  private maxHealth: number;
  private spawnTime: number;
  private lastDamageTime: number = 0;
  
  // FIXED: Store collision handler reference
  private collisionHandler: ((event: Matter.IEventCollision<Matter.Engine>) => void) | null = null;

  constructor(x: number, y: number, size: PigSize, game: Game) {
    this.game = game;
    this.size = size;
    this.spawnTime = Date.now();
    
    switch (size) {
      case 'small': this.radius = 20; this.maxHealth = 25; break;
      case 'medium': this.radius = 30; this.maxHealth = 50; break;
      case 'large': this.radius = 40; this.maxHealth = 100; break;
    }
    this.health = this.maxHealth;
    
    this.body = Matter.Bodies.circle(x, y, this.radius, {
      density: 0.001,
      friction: 0.5,
      restitution: 0.3,
      label: 'Pig',
      frictionAir: 0.08
    });
    
    Matter.World.add(this.game.getWorld(), this.body);
    
    this.sprite = new PIXI.Graphics();
    this.updateSprite();
    this.game.getContainer().addChild(this.sprite);
    
    // FIXED: Store listener for proper cleanup
    this.collisionHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
      this.handleCollision(event);
    };
    Matter.Events.on(this.game.getEngine(), 'collisionStart', this.collisionHandler);
    
    setTimeout(() => {
      if (this.body) {
        Matter.Body.set(this.body, { frictionAir: 0.01 });
      }
    }, 1200);
  }

  private updateSprite(): void {
    this.sprite.clear();
    const healthPct = this.health / this.maxHealth;
    
    // Main pig body with gradient effect
    this.sprite.beginFill(0x4CAF50);
    this.sprite.drawCircle(0, 0, this.radius);
    this.sprite.endFill();
    
    // Lighter belly
    this.sprite.beginFill(0x81C784);
    this.sprite.drawCircle(0, this.radius * 0.2, this.radius * 0.6);
    this.sprite.endFill();
    
    // Snout
    this.sprite.beginFill(0x66BB6A);
    this.sprite.drawCircle(0, this.radius * 0.1, this.radius * 0.35);
    this.sprite.endFill();
    
    // Nostrils
    this.sprite.beginFill(0x2E7D32);
    this.sprite.drawCircle(-5, this.radius * 0.1, 3);
    this.sprite.drawCircle(5, this.radius * 0.1, 3);
    this.sprite.endFill();
    
    // Eyes - white
    this.sprite.beginFill(0xFFFFFF);
    this.sprite.drawCircle(-this.radius * 0.3, -this.radius * 0.2, this.radius * 0.25);
    this.sprite.drawCircle(this.radius * 0.3, -this.radius * 0.2, this.radius * 0.25);
    this.sprite.endFill();
    
    // Pupils
    this.sprite.beginFill(0x000000);
    this.sprite.drawCircle(-this.radius * 0.3, -this.radius * 0.15, this.radius * 0.12);
    this.sprite.drawCircle(this.radius * 0.3, -this.radius * 0.15, this.radius * 0.12);
    this.sprite.endFill();
    
    // Eyebrows when damaged
    if (healthPct < 0.8) {
      this.sprite.lineStyle(2, 0x1B5E20);
      // Angry eyebrows
      this.sprite.moveTo(-this.radius * 0.45, -this.radius * 0.4);
      this.sprite.lineTo(-this.radius * 0.15, -this.radius * 0.3);
      this.sprite.moveTo(this.radius * 0.45, -this.radius * 0.4);
      this.sprite.lineTo(this.radius * 0.15, -this.radius * 0.3);
    }
    
    // Show cracks when very damaged
    if (healthPct < 0.5) {
      this.sprite.lineStyle(2, 0x1B5E20, 0.6);
      this.sprite.moveTo(-this.radius * 0.3, -this.radius * 0.5);
      this.sprite.lineTo(this.radius * 0.2, this.radius * 0.4);
      this.sprite.moveTo(this.radius * 0.3, -this.radius * 0.4);
      this.sprite.lineTo(-this.radius * 0.2, this.radius * 0.5);
    }
  }

  private handleCollision(event: Matter.IEventCollision<Matter.Engine>): void {
    // Grace period to prevent spawn death
    if (Date.now() - this.spawnTime < 1200) return;
    
    // Debounce damage to prevent multiple hits in same frame
    const now = Date.now();
    if (now - this.lastDamageTime < 50) return;
    
    event.pairs.forEach(pair => {
      if (pair.bodyA === this.body || pair.bodyB === this.body) {
        const other = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;
        
        // Ignore ground collisions
        if (other.label === 'Ground') {
          return;
        }
        
        // FIXED: Calculate damage based on collision impact
        const vA = pair.bodyA.velocity;
        const vB = pair.bodyB.velocity;
        const relativeSpeed = Math.sqrt(
          Math.pow(vA.x - vB.x, 2) + 
          Math.pow(vA.y - vB.y, 2)
        );
        
        // FIXED: Lowered threshold for better sensitivity
        // Birds and blocks will now damage pigs more reliably
        if (relativeSpeed > 1.5) {  // Was 3.5, now much more sensitive
          // Calculate damage based on:
          // 1. Collision speed
          // 2. Other object's mass (birds are heavier = more damage)
          // 3. Base damage multiplier
          const baseDamage = relativeSpeed * other.mass * 200;  // Increased from 100
          
          // FIXED: Extra damage multiplier for direct bird hits
          let damageMultiplier = 1.0;
          
          // Check if the collision is with a bird (birds have higher mass)
          if (other.mass > 0.0015) {  // Bird mass range
            damageMultiplier = 2.0;  // Double damage from direct bird hits
          }
          
          const finalDamage = baseDamage * damageMultiplier;
          
          this.takeDamage(finalDamage);
          this.lastDamageTime = now;
          
          // Visual feedback - flash red on hit
          this.sprite.tint = 0xFF4444;
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.sprite.tint = 0xFFFFFF;
            }
          }, 100);
        }
      }
    });
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDestroyed = true;
    }
    this.updateSprite();
  }

  update(): void {
    if (this.isDestroyed) return;
    this.sprite.position.set(this.body.position.x, this.body.position.y);
    this.sprite.rotation = this.body.angle;
  }

  destroy(): void {
    // FIXED: Remove the collision listener
    if (this.collisionHandler) {
      Matter.Events.off(this.game.getEngine(), 'collisionStart', this.collisionHandler);
      this.collisionHandler = null;
    }

    Matter.World.remove(this.game.getWorld(), this.body);
    this.sprite.destroy();
  }
}