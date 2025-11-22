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
  public size: 'small' | 'medium' | 'large';
  
  private game: Game;
  private radius: number = 20;
  private lastVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private settleTime: number = 0;
  private collisionHandler: ((event: Matter.IEventCollision<Matter.Engine>) => void) | null = null;
  private isDestroyed: boolean = false;
  private isSplitBird: boolean = false; 

  constructor(type: BirdType, x: number, y: number, game: Game, isSplitBird: boolean = false) {
    this.type = type;
    this.game = game;
    this.size = 'medium';
    this.isSplitBird = isSplitBird;
    
    this.radius = this.getRadius();
    
    // Define default collision filter to prevent 'undefined' errors
    const defaultCollisionFilter = {
        group: 0,
        category: 1,
        mask: 0xFFFFFFFF
    };

    this.body = Matter.Bodies.circle(x, y, this.radius, {
      density: this.getDensity(),
      restitution: 0.4,
      friction: 0.3,
      frictionAir: 0.001, 
      // FIXED: Always provide a valid collisionFilter object
      collisionFilter: isSplitBird ? { group: -1, category: 1, mask: 0xFFFFFFFF } : defaultCollisionFilter
    });
    
    Matter.World.add(this.game.getWorld(), this.body);
    
    this.sprite = new PIXI.Graphics();
    this.drawBird();
    
    this.game.getContainer().addChild(this.sprite);
    
    if (!isSplitBird) {
        Matter.Body.setStatic(this.body, true);
    } else {
        Matter.Body.setStatic(this.body, false);
    }
    
    this.collisionHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
      this.handleCollision(event);
    };
    Matter.Events.on(this.game.getEngine(), 'collisionStart', this.collisionHandler);
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
      case 'red': return 0.0025;
      case 'blue': return 0.0015;
      case 'yellow': return 0.002;
      case 'black': return 0.004;
      case 'white': return 0.003;
      default: return 0.002;
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
    
    this.sprite.beginFill(color);
    this.sprite.drawCircle(0, 0, this.radius);
    this.sprite.endFill();
    
    const bellyColor = this.type === 'black' ? 0x444444 : 
                       this.type === 'white' ? 0xEEEEEE : 0xFFCCCC;
    this.sprite.beginFill(bellyColor);
    this.sprite.drawCircle(0, this.radius * 0.3, this.radius * 0.6);
    this.sprite.endFill();
    
    this.sprite.beginFill(0xFFFFFF);
    this.sprite.drawCircle(-this.radius * 0.35, -this.radius * 0.2, this.radius * 0.3);
    this.sprite.drawCircle(this.radius * 0.35, -this.radius * 0.2, this.radius * 0.3);
    this.sprite.endFill();
    
    this.sprite.beginFill(0x000000);
    this.sprite.drawCircle(-this.radius * 0.35, -this.radius * 0.15, this.radius * 0.15);
    this.sprite.drawCircle(this.radius * 0.35, -this.radius * 0.15, this.radius * 0.15);
    this.sprite.endFill();
    
    this.sprite.beginFill(0xFFA500);
    this.sprite.moveTo(0, this.radius * 0.1);
    this.sprite.lineTo(-this.radius * 0.25, this.radius * 0.3);
    this.sprite.lineTo(this.radius * 0.25, this.radius * 0.3);
    this.sprite.endFill();
    
    this.sprite.lineStyle(this.radius * 0.12, 0x000000);
    this.sprite.moveTo(-this.radius * 0.6, -this.radius * 0.4);
    this.sprite.lineTo(-this.radius * 0.2, -this.radius * 0.35);
    this.sprite.moveTo(this.radius * 0.6, -this.radius * 0.4);
    this.sprite.lineTo(this.radius * 0.2, -this.radius * 0.35);
    
    if (this.type === 'black') {
      this.sprite.lineStyle(3, 0x8B4513);
      this.sprite.moveTo(0, -this.radius);
      this.sprite.lineTo(0, -this.radius * 1.3);
      this.sprite.beginFill(0xFF6600);
      this.sprite.drawCircle(0, -this.radius * 1.3, 4);
      this.sprite.endFill();
    }
  }

  private handleCollision(event: Matter.IEventCollision<Matter.Engine>): void {
    if (this.isDestroyed) return;
    
    event.pairs.forEach(pair => {
      if (pair.bodyA === this.body || pair.bodyB === this.body) {
        if (!this.hasCollided && this.isLaunched) {
          this.hasCollided = true;
          
          if (this.type === 'black' && !this.abilityUsed) {
            setTimeout(() => {
              if (!this.isDestroyed) {
                this.explodeAbility();
              }
            }, 50);
          }
        }
      }
    });
  }

  updatePosition(x: number, y: number): void {
    if (!this.isLaunched && !this.isDestroyed) {
      Matter.Body.setPosition(this.body, { x, y });
    }
  }

  launch(forceX: number, forceY: number): void {
    if (this.isDestroyed) return;
    
    this.isLaunched = true;
    Matter.Body.setStatic(this.body, false);
    
    const mass = this.body.mass;
    Matter.Body.applyForce(this.body, this.body.position, {
      x: forceX * mass,
      y: forceY * mass
    });
  }

  activateAbility(): void {
    if (this.isDestroyed) return;
    if (this.hasCollided && this.type !== 'black') return;
    if (this.abilityUsed || !this.isLaunched) return;
    
    this.abilityUsed = true;
    this.game.getAudioManager().play('abilityActivate');
    
    switch (this.type) {
      case 'red':
        this.redAbility();
        break;
      case 'blue':
        this.splitAbility();
        break;
      case 'yellow':
        this.speedBoostAbility();
        break;
      case 'black':
        this.explodeAbility();
        break;
      case 'white':
        this.eggBombAbility();
        break;
    }
  }

  private redAbility(): void {
    if (this.isDestroyed) return;
    
    const shockwaveRadius = 100;
    const shockwaveForce = 0.02;
    
    const shockwave = new PIXI.Graphics();
    shockwave.lineStyle(4, 0xFF0000, 0.8);
    shockwave.drawCircle(0, 0, this.radius);
    shockwave.position.set(this.body.position.x, this.body.position.y);
    this.game.getContainer().addChild(shockwave);
    
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
    if (this.isDestroyed) return;
    
    const velocity = this.body.velocity;
    const position = this.body.position;
    
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const currentAngle = Math.atan2(velocity.y, velocity.x);
    
    const angles = [currentAngle - 0.3, currentAngle + 0.3];
    
    this.body.collisionFilter.group = -1;

    angles.forEach(angle => {
      const spawnOffset = 30; 
      const spawnX = position.x + Math.cos(angle) * spawnOffset;
      const spawnY = position.y + Math.sin(angle) * spawnOffset;

      const splitBird = new Bird('blue', spawnX, spawnY, this.game, true);
      splitBird.isLaunched = true;
      splitBird.hasCollided = false; 
      splitBird.abilityUsed = true; 
      
      Matter.Body.setStatic(splitBird.body, false);
      splitBird.body.collisionFilter.group = -1;
      
      Matter.Body.setVelocity(splitBird.body, {
        x: Math.cos(angle) * speed, 
        y: Math.sin(angle) * speed
      });
    });
    
     Matter.Body.setVelocity(this.body, {
        x: Math.cos(currentAngle) * speed, 
        y: Math.sin(currentAngle) * speed
      });
  }

  private speedBoostAbility(): void {
    if (this.isDestroyed) return;
    
    const velocity = this.body.velocity;
    const speedMultiplier = 3.0;
    
    Matter.Body.setVelocity(this.body, {
      x: velocity.x * speedMultiplier,
      y: velocity.y * 0.5
    });
    
    this.sprite.tint = 0xFFFF00;
    
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
      if (!this.isDestroyed) {
        this.sprite.tint = 0xFFFFFF;
      }
      this.game.getContainer().removeChild(speedLines);
    }, 300);
  }

  private explodeAbility(): void {
    if (this.isDestroyed) return;
    
    const explosionRadius = 200;
    const explosionForce = 0.08;
    
    const explosionPos = { x: this.body.position.x, y: this.body.position.y };
    
    const explosion = new PIXI.Graphics();
    explosion.beginFill(0xFF3300, 0.7);
    explosion.drawCircle(0, 0, explosionRadius);
    explosion.endFill();
    explosion.position.set(explosionPos.x, explosionPos.y);
    this.game.getContainer().addChild(explosion);
    
    const fireRing = new PIXI.Graphics();
    fireRing.lineStyle(8, 0xFF6600, 0.9);
    fireRing.drawCircle(0, 0, explosionRadius * 0.7);
    fireRing.position.set(explosionPos.x, explosionPos.y);
    this.game.getContainer().addChild(fireRing);
    
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
    
    const bodies = Matter.Composite.allBodies(this.game.getWorld());
    bodies.forEach(body => {
      if (body === this.body || body.isStatic) return;
      
      const dx = body.position.x - explosionPos.x;
      const dy = body.position.y - explosionPos.y;
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
    if (this.isDestroyed) return;
    
    const pos = this.body.position;
    const velocity = this.body.velocity;
    
    const eggRadius = 15;
    const eggBody = Matter.Bodies.circle(pos.x, pos.y + this.radius, eggRadius, {
      density: 0.003,
      restitution: 0.3,
      friction: 0.5
    });
    
    Matter.World.add(this.game.getWorld(), eggBody);
    
    const eggSprite = new PIXI.Graphics();
    eggSprite.beginFill(0xFFFFFF);
    eggSprite.drawEllipse(0, 0, eggRadius, eggRadius * 1.2);
    eggSprite.endFill();
    eggSprite.beginFill(0xFF6600);
    eggSprite.drawCircle(0, -eggRadius * 0.3, eggRadius * 0.3);
    eggSprite.endFill();
    this.game.getContainer().addChild(eggSprite);
    
    Matter.Body.setVelocity(eggBody, {
      x: velocity.x * 0.5,
      y: 5
    });
    
    Matter.Body.setVelocity(this.body, {
      x: velocity.x,
      y: -15
    });
    
    let eggExploded = false;
    const eggCollisionHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
      if (eggExploded) return;
      
      event.pairs.forEach(pair => {
        if (pair.bodyA === eggBody || pair.bodyB === eggBody) {
          eggExploded = true;
          
          Matter.Events.off(this.game.getEngine(), 'collisionStart', eggCollisionHandler);
          
          const explosionPos = { x: eggBody.position.x, y: eggBody.position.y };
          
          const explosionRadius = 120;
          const explosionForce = 0.05;
          
          const explosion = new PIXI.Graphics();
          explosion.beginFill(0xFF6600, 0.6);
          explosion.drawCircle(0, 0, explosionRadius);
          explosion.endFill();
          explosion.position.set(explosionPos.x, explosionPos.y);
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
          
          const bodies = Matter.Composite.allBodies(this.game.getWorld());
          bodies.forEach(body => {
            if (body === eggBody || body.isStatic) return;
            
            const dx = body.position.x - explosionPos.x;
            const dy = body.position.y - explosionPos.y;
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
          
          Matter.World.remove(this.game.getWorld(), eggBody);
          this.game.getContainer().removeChild(eggSprite);
        }
      });
    };
    
    Matter.Events.on(this.game.getEngine(), 'collisionStart', eggCollisionHandler);
    
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
    if (this.isDestroyed) return;
    
    this.sprite.position.set(this.body.position.x, this.body.position.y);
    this.sprite.rotation = this.body.angle;
    
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
    return this.settleTime > 60;
  }

  getRadiusOut(): number {
    return this.radius;
  }

  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    if (this.collisionHandler) {
      Matter.Events.off(this.game.getEngine(), 'collisionStart', this.collisionHandler);
      this.collisionHandler = null;
    }
    
    try {
      Matter.World.remove(this.game.getWorld(), this.body);
    } catch (e) {
      // Already removed
    }
    
    try {
      this.game.getContainer().removeChild(this.sprite);
    } catch (e) {
      // Already removed
    }
  }
}