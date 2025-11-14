import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import type { Game } from './Game';

export type BirdType = 'red' | 'blue' | 'yellow' | 'black' | 'white';

export class Bird {
  public body: Matter.Body;
  public sprite: PIXI.Graphics;
  public type: BirdType;
  public isLaunched: boolean = false;
  public abilityUsed: boolean = false;
  public hasCollided: boolean = false;
  
  private game: Game;
  private radius: number = 20;
  private lastVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private settleTime: number = 0;

  constructor(type: BirdType, x: number, y: number, game: Game) {
    this.type = type;
    this.game = game;
    
    // Adjust radius based on bird type
    this.radius = this.getRadius();
    
    // Create physics body
    this.body = Matter.Bodies.circle(x, y, this.radius, {
      density: this.getDensity(),
      restitution: 0.29,
      friction: 0.3
    });
    
    Matter.World.add(this.game.getWorld(), this.body);
    
    // Create sprite
    this.sprite = new PIXI.Graphics();
    this.drawBird();
    
    this.game.getContainer().addChild(this.sprite);
    
    // Start as kinematic (not affected by physics) until launched
    Matter.Body.setStatic(this.body, true);
    
    // Listen for collisions
    Matter.Events.on(this.game.getEngine(), 'collisionStart', (event) => {
      this.handleCollision(event);
    });
  }

  private getRadius(): number {
    switch (this.type) {
      case 'red': return 22;
      case 'blue': return 16;
      case 'yellow': return 20;
      case 'black': return 28;
      case 'white': return 24;
      default: return 20;
    }
  }

  private getDensity(): number {
    switch (this.type) {
      case 'red': return 0.025;   // Strong and heavy
      case 'blue': return 0.015;   // Light (splits into 3)
      case 'yellow': return 0.02; // Medium (speed)
      case 'black': return 0.04;   // Very heavy (explosive)
      case 'white': return 0.03;   // Heavy (drops egg)
      default: return 0.02;
    }
  }

  private getColor(): number {
    switch (this.type) {
      case 'red': return 0xFF0000;
      case 'blue': return 0x0099FF;
      case 'yellow': return 0xFFDD00;
      case 'black': return 0x222222;
      case 'white': return 0xFFFFFF;
      default: return 0xFF0000;
    }
  }

  private drawBird(): void {
    this.sprite.clear();
    
    const color = this.getColor();
    
    // Draw body
    this.sprite.beginFill(color);
    this.sprite.drawCircle(0, 0, this.radius);
    this.sprite.endFill();
    
    // Draw belly (lighter shade)
    const bellyColor = this.type === 'black' ? 0x444444 : 
                       this.type === 'white' ? 0xEEEEEE : 0xFFCCCC;
    this.sprite.beginFill(bellyColor);
    this.sprite.drawCircle(0, this.radius * 0.3, this.radius * 0.6);
    this.sprite.endFill();
    
    // Draw eyes
    this.sprite.beginFill(0xFFFFFF);
    this.sprite.drawCircle(-this.radius * 0.35, -this.radius * 0.2, this.radius * 0.3);
    this.sprite.drawCircle(this.radius * 0.35, -this.radius * 0.2, this.radius * 0.3);
    this.sprite.endFill();
    
    // Draw pupils
    this.sprite.beginFill(0x000000);
    this.sprite.drawCircle(-this.radius * 0.35, -this.radius * 0.15, this.radius * 0.15);
    this.sprite.drawCircle(this.radius * 0.35, -this.radius * 0.15, this.radius * 0.15);
    this.sprite.endFill();
    
    // Draw beak
    this.sprite.beginFill(0xFFA500);
    this.sprite.moveTo(0, this.radius * 0.1);
    this.sprite.lineTo(-this.radius * 0.25, this.radius * 0.3);
    this.sprite.lineTo(this.radius * 0.25, this.radius * 0.3);
    this.sprite.endFill();
    
    // Draw eyebrows (angry expression)
    this.sprite.lineStyle(this.radius * 0.12, 0x000000);
    this.sprite.moveTo(-this.radius * 0.6, -this.radius * 0.4);
    this.sprite.lineTo(-this.radius * 0.2, -this.radius * 0.35);
    this.sprite.moveTo(this.radius * 0.6, -this.radius * 0.4);
    this.sprite.lineTo(this.radius * 0.2, -this.radius * 0.35);
    
    // Special features per bird
    if (this.type === 'black') {
      // Draw fuse
      this.sprite.lineStyle(3, 0x8B4513);
      this.sprite.moveTo(0, -this.radius);
      this.sprite.lineTo(0, -this.radius * 1.3);
      // Fuse tip
      this.sprite.beginFill(0xFF6600);
      this.sprite.drawCircle(0, -this.radius * 1.3, 4);
      this.sprite.endFill();
    }
    
    if (this.type === 'yellow') {
      // Draw speed lines (when ability is active)
      this.sprite.lineStyle(2, 0xFFAA00, 0);
    }
  }

  private handleCollision(event: Matter.IEventCollision<Matter.Engine>): void {
    event.pairs.forEach(pair => {
      if (pair.bodyA === this.body || pair.bodyB === this.body) {
        if (!this.hasCollided && this.isLaunched) {
          this.hasCollided = true;
          
          // Black bird explodes on impact automatically
          if (this.type === 'black' && !this.abilityUsed) {
            this.explodeAbility();
          }
        }
      }
    });
  }

  updatePosition(x: number, y: number): void {
    if (!this.isLaunched) {
      Matter.Body.setPosition(this.body, { x, y });
    }
  }

  launch(forceX: number, forceY: number): void {
    this.isLaunched = true;
    Matter.Body.setStatic(this.body, false);
    
    // Apply impulse for more realistic launch
    const mass = this.body.mass;
    Matter.Body.applyForce(this.body, this.body.position, {
      x: forceX * mass,
      y: forceY * mass
    });
  }

  activateAbility(): void {
    // Don't allow ability after collision (except black bird which auto-triggers)
    if (this.hasCollided && this.type !== 'black') return;
    if (this.abilityUsed || !this.isLaunched) return;
    
    this.abilityUsed = true;
    this.game.getAudioManager().play('abilityActivate');
    
    switch (this.type) {
      case 'red':
        this.redAbility(); // War cry - pushes nearby objects
        break;
      case 'blue':
        this.splitAbility(); // Splits into 3
        break;
      case 'yellow':
        this.speedBoostAbility(); // Speed boost
        break;
      case 'black':
        this.explodeAbility(); // Explodes
        break;
      case 'white':
        this.eggBombAbility(); // Drops explosive egg
        break;
    }
  }

  private redAbility(): void {
    // RED BIRD: War cry - creates shockwave pushing nearby objects
    const shockwaveRadius = 100;
    const shockwaveForce = 0.02;
    
    // Visual effect - red shockwave ring
    const shockwave = new PIXI.Graphics();
    shockwave.lineStyle(4, 0xFF0000, 0.8);
    shockwave.drawCircle(0, 0, this.radius);
    shockwave.position.set(this.body.position.x, this.body.position.y);
    this.game.getContainer().addChild(shockwave);
    
    // Animate shockwave expanding
    let radius = this.radius;
    const interval = setInterval(() => {
      radius += 15;
      shockwave.clear();
      shockwave.lineStyle(4, 0xFF0000, 1 - (radius / shockwaveRadius));
      shockwave.drawCircle(0, 0, radius);
      
      if (radius >= shockwaveRadius) {
        clearInterval(interval);
        this.game.getContainer().removeChild(shockwave);
      }
    }, 30);
    
    // Apply force to nearby bodies
    const bodies = Matter.Composite.allBodies(this.game.getWorld());
    bodies.forEach(body => {
      if (body === this.body || body.isStatic) return;
      
      const dx = body.position.x - this.body.position.x;
      const dy = body.position.y - this.body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < shockwaveRadius && distance > 0) {
        const force = shockwaveForce * (1 - distance / shockwaveRadius);
        const angle = Math.atan2(dy, dx);
        
        Matter.Body.applyForce(body, body.position, {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force
        });
      }
    });
  }

  private splitAbility(): void {
    // BLUE BIRD: Splits into 3 birds
    const velocity = this.body.velocity;
    const pos = this.body.position;
    
    // Split into 3 directions
    const angles = [-0.3, 0, 0.3]; // Left, center, right
    
    angles.forEach(angleOffset => {
      const bird = new Bird('blue', pos.x, pos.y, this.game);
      bird.isLaunched = true;
      bird.hasCollided = this.hasCollided; // Inherit collision state
      Matter.Body.setStatic(bird.body, false);
      
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      const currentAngle = Math.atan2(velocity.y, velocity.x);
      const newAngle = currentAngle + angleOffset;
      
      Matter.Body.setVelocity(bird.body, {
        x: Math.cos(newAngle) * speed,
        y: Math.sin(newAngle) * speed
      });
      
      bird.abilityUsed = true;
    });
  }

  private speedBoostAbility(): void {
    // YELLOW BIRD: Accelerates forward dramatically
    const velocity = this.body.velocity;
    const speedMultiplier = 3.0;
    
    Matter.Body.setVelocity(this.body, {
      x: velocity.x * speedMultiplier,
      y: velocity.y * 0.5 // Reduce vertical component for more horizontal speed
    });
    
    // Visual effect: speed lines and color change
    this.sprite.tint = 0xFFFF00;
    
    // Draw speed lines
    const speedLines = new PIXI.Graphics();
    speedLines.lineStyle(3, 0xFFAA00, 0.8);
    for (let i = 0; i < 5; i++) {
      const offset = (i + 1) * 20;
      speedLines.moveTo(-offset, -5);
      speedLines.lineTo(-offset - 15, -5);
      speedLines.moveTo(-offset, 5);
      speedLines.lineTo(-offset - 15, 5);
    }
    speedLines.position.set(this.body.position.x, this.body.position.y);
    this.game.getContainer().addChild(speedLines);
    
    setTimeout(() => {
      this.sprite.tint = 0xFFFFFF;
      this.game.getContainer().removeChild(speedLines);
    }, 300);
  }

  private explodeAbility(): void {
    // BLACK BIRD: Massive explosion
    const explosionRadius = 200;
    const explosionForce = 0.08;
    
    // Visual explosion effect
    const explosion = new PIXI.Graphics();
    explosion.beginFill(0xFF3300, 0.7);
    explosion.drawCircle(0, 0, explosionRadius);
    explosion.endFill();
    explosion.position.set(this.body.position.x, this.body.position.y);
    this.game.getContainer().addChild(explosion);
    
    // Add fire ring
    const fireRing = new PIXI.Graphics();
    fireRing.lineStyle(8, 0xFF6600, 0.9);
    fireRing.drawCircle(0, 0, explosionRadius * 0.7);
    fireRing.position.set(this.body.position.x, this.body.position.y);
    this.game.getContainer().addChild(fireRing);
    
    // Animate explosion
    let scale = 0;
    const interval = setInterval(() => {
      scale += 0.2;
      explosion.scale.set(scale);
      fireRing.scale.set(scale);
      explosion.alpha -= 0.12;
      fireRing.alpha -= 0.12;
      
      if (explosion.alpha <= 0) {
        clearInterval(interval);
        this.game.getContainer().removeChild(explosion);
        this.game.getContainer().removeChild(fireRing);
      }
    }, 30);
    
    // Apply force to nearby bodies
    const bodies = Matter.Composite.allBodies(this.game.getWorld());
    bodies.forEach(body => {
      if (body === this.body || body.isStatic) return;
      
      const dx = body.position.x - this.body.position.x;
      const dy = body.position.y - this.body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < explosionRadius && distance > 0) {
        const force = explosionForce * (1 - distance / explosionRadius);
        const angle = Math.atan2(dy, dx);
        
        Matter.Body.applyForce(body, body.position, {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force
        });
      }
    });
  }

  private eggBombAbility(): void {
    // WHITE BIRD: Drops explosive egg bomb and flies upward
    const pos = this.body.position;
    const velocity = this.body.velocity;
    
    // Create egg bomb
    const eggRadius = 15;
    const eggBody = Matter.Bodies.circle(pos.x, pos.y + this.radius, eggRadius, {
      density: 0.003,
      restitution: 0.3,
      friction: 0.5
    });
    
    Matter.World.add(this.game.getWorld(), eggBody);
    
    // Egg graphic
    const eggSprite = new PIXI.Graphics();
    eggSprite.beginFill(0xFFFFFF);
    eggSprite.drawEllipse(0, 0, eggRadius, eggRadius * 1.2);
    eggSprite.endFill();
    eggSprite.beginFill(0xFF6600);
    eggSprite.drawCircle(0, -eggRadius * 0.3, eggRadius * 0.3);
    eggSprite.endFill();
    this.game.getContainer().addChild(eggSprite);
    
    // Egg inherits horizontal velocity, drops down
    Matter.Body.setVelocity(eggBody, {
      x: velocity.x * 0.5,
      y: 5 // Drop down
    });
    
    // White bird flies upward
    Matter.Body.setVelocity(this.body, {
      x: velocity.x,
      y: -15 // Fly up
    });
    
    // Egg explodes on impact
    let eggExploded = false;
    Matter.Events.on(this.game.getEngine(), 'collisionStart', (event) => {
      if (eggExploded) return;
      
      event.pairs.forEach(pair => {
        if (pair.bodyA === eggBody || pair.bodyB === eggBody) {
          eggExploded = true;
          
          // Explosion effect
          const explosionRadius = 120;
          const explosionForce = 0.05;
          
          const explosion = new PIXI.Graphics();
          explosion.beginFill(0xFF6600, 0.6);
          explosion.drawCircle(0, 0, explosionRadius);
          explosion.endFill();
          explosion.position.set(eggBody.position.x, eggBody.position.y);
          this.game.getContainer().addChild(explosion);
          
          let scale = 0;
          const interval = setInterval(() => {
            scale += 0.15;
            explosion.scale.set(scale);
            explosion.alpha -= 0.1;
            
            if (explosion.alpha <= 0) {
              clearInterval(interval);
              this.game.getContainer().removeChild(explosion);
            }
          }, 30);
          
          // Apply force
          const bodies = Matter.Composite.allBodies(this.game.getWorld());
          bodies.forEach(body => {
            if (body === eggBody || body.isStatic) return;
            
            const dx = body.position.x - eggBody.position.x;
            const dy = body.position.y - eggBody.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < explosionRadius && distance > 0) {
              const force = explosionForce * (1 - distance / explosionRadius);
              const angle = Math.atan2(dy, dx);
              
              Matter.Body.applyForce(body, body.position, {
                x: Math.cos(angle) * force,
                y: Math.sin(angle) * force
              });
            }
          });
          
          // Remove egg
          Matter.World.remove(this.game.getWorld(), eggBody);
          this.game.getContainer().removeChild(eggSprite);
        }
      });
    });
    
    // Update egg sprite position
    const updateEgg = () => {
      if (!eggExploded && eggBody) {
        eggSprite.position.set(eggBody.position.x, eggBody.position.y);
        eggSprite.rotation = eggBody.angle;
        requestAnimationFrame(updateEgg);
      }
    };
    updateEgg();
  }

  update(): void {
    // Sync sprite position with physics body
    this.sprite.position.set(this.body.position.x, this.body.position.y);
    this.sprite.rotation = this.body.angle;
    
    // Check if bird has settled
    if (this.isLaunched) {
      const velocity = this.body.velocity;
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      if (speed < 0.5) {
        this.settleTime++;
      } else {
        this.settleTime = 0;
      }
    }
    
    this.lastVelocity = { ...this.body.velocity };
  }

  isSettled(): boolean {
    return this.settleTime > 60; // Settled for 1 second at 60 FPS
  }
  getRadiusOut(): number {
    return this.radius;
  }

  destroy(): void {
    Matter.World.remove(this.game.getWorld(), this.body);
    this.game.getContainer().removeChild(this.sprite);
  }
}