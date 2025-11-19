import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import type { Game } from './Game';

type PigSize = 'small' | 'medium' | 'large';

export class Pig {
  public body: Matter.Body;
  public sprite: PIXI.Graphics;
  public isDestroyed: boolean = false;
  
  private game: Game;
  public size: PigSize;
  private radius: number;
  private health: number;
  private maxHealth: number;
  private lastImpactTime: number = 0;

  constructor(x: number, y: number, size: PigSize, game: Game) {
    this.game = game;
    this.size = size;
    
    // Set properties based on size
    switch (size) {
      case 'small':
        this.radius = 20;
        this.maxHealth = 30;
        break;
      case 'medium':
        this.radius = 30;
        this.maxHealth = 60;
        break;
      case 'large':
        this.radius = 40;
        this.maxHealth = 100;
        break;
    }
    
    this.health = this.maxHealth;
    
    // Create physics body
    this.body = Matter.Bodies.circle(x, y, this.radius, {
      density: 0.001,
      friction: 0.5,
      restitution: 0.4
    });
    
    Matter.World.add(this.game.getWorld(), this.body);
    
    // Create sprite
    this.sprite = new PIXI.Graphics();
    this.updateSprite();
    this.game.getContainer().addChild(this.sprite);
    
    // Listen for collisions
    Matter.Events.on(this.game.getEngine(), 'collisionStart', (event) => {
      this.handleCollision(event);
    });
  }

  private updateSprite(): void {
    this.sprite.clear();
    
    // Calculate health-based color (green to red)
    const healthPercent = this.health / this.maxHealth;
    const red = Math.floor((1 - healthPercent) * 255);
    const green = Math.floor(healthPercent * 200);
    const color = (red << 16) | (green << 8) | 0;
    
    // Draw pig body
    this.sprite.beginFill(color);
    this.sprite.drawCircle(0, 0, this.radius);
    this.sprite.endFill();
    
    // Draw snout
    this.sprite.beginFill(0x90EE90);
    this.sprite.drawCircle(0, this.radius * 0.4, this.radius * 0.4);
    this.sprite.endFill();
    
    // Draw nostrils
    this.sprite.beginFill(0x000000);
    this.sprite.drawCircle(-this.radius * 0.15, this.radius * 0.4, this.radius * 0.08);
    this.sprite.drawCircle(this.radius * 0.15, this.radius * 0.4, this.radius * 0.08);
    this.sprite.endFill();
    
    // Draw eyes
    this.sprite.beginFill(0xFFFFFF);
    this.sprite.drawCircle(-this.radius * 0.3, -this.radius * 0.2, this.radius * 0.25);
    this.sprite.drawCircle(this.radius * 0.3, -this.radius * 0.2, this.radius * 0.25);
    this.sprite.endFill();
    
    // Draw pupils
    this.sprite.beginFill(0x000000);
    this.sprite.drawCircle(-this.radius * 0.3, -this.radius * 0.15, this.radius * 0.12);
    this.sprite.drawCircle(this.radius * 0.3, -this.radius * 0.15, this.radius * 0.12);
    this.sprite.endFill();
    
    // Draw eyebrows (angry expression)
    this.sprite.lineStyle(this.radius * 0.1, 0x000000);
    this.sprite.moveTo(-this.radius * 0.5, -this.radius * 0.4);
    this.sprite.lineTo(-this.radius * 0.15, -this.radius * 0.3);
    this.sprite.moveTo(this.radius * 0.5, -this.radius * 0.4);
    this.sprite.lineTo(this.radius * 0.15, -this.radius * 0.3);
    
    // Draw crown for large pigs
    if (this.size === 'large') {
      this.sprite.lineStyle(2, 0xFFD700);
      this.sprite.beginFill(0xFFD700);
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI / 2.5) * i - Math.PI / 2 - 0.4;
        const x = Math.cos(angle) * this.radius;
        const y = Math.sin(angle) * this.radius - this.radius * 0.3;
        this.sprite.drawCircle(x, y, this.radius * 0.15);
      }
      this.sprite.endFill();
    }
  }

  private handleCollision(event: Matter.IEventCollision<Matter.Engine>): void {
    const now = Date.now();
    if (now - this.lastImpactTime < 100) return;
    
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
        
        // Apply damage based on impact and other body's mass
        if (impactSpeed > 2) {
          const damage = impactSpeed * otherBody.mass * 100;
          this.takeDamage(damage);
          this.lastImpactTime = now;
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
    
    // Update sprite to show damage
    this.updateSprite();
    
    // Damage animation (shake)
    const originalX = this.sprite.position.x;
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
      if (shakeCount < 6) {
        this.sprite.position.x = originalX + (shakeCount % 2 === 0 ? 5 : -5);
        shakeCount++;
      } else {
        clearInterval(shakeInterval);
      }
    }, 50);
  }

  update(): void {
    if (this.isDestroyed) return;
    
    // Sync sprite with physics body
    this.sprite.position.set(this.body.position.x, this.body.position.y);
    this.sprite.rotation = this.body.angle;
  }

  destroy(): void {
    // Create destruction effect
    const particles = new PIXI.Graphics();
    const particleCount = 10;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i;
      const speed = 3 + Math.random() * 3;
      const size = this.radius * 0.2;
      
      const particle = new PIXI.Graphics();
      particle.beginFill(0x90EE90);
      particle.drawCircle(0, 0, size);
      particle.endFill();
      particle.position.set(this.body.position.x, this.body.position.y);
      
      this.game.getContainer().addChild(particle);
      
      // Animate particle
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;
      let life = 30;
      
      const animateParticle = () => {
        if (life > 0) {
          particle.position.x += vx;
          particle.position.y += vy;
          vy += 0.3; // gravity
          particle.alpha = life / 30;
          life--;
          requestAnimationFrame(animateParticle);
        } else {
          this.game.getContainer().removeChild(particle);
        }
      };
      
      animateParticle();
    }
    
    Matter.World.remove(this.game.getWorld(), this.body);
    this.game.getContainer().removeChild(this.sprite);
  }
}