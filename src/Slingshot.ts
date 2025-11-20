import * as PIXI from 'pixi.js';
import type { Game } from './Game';

export class Slingshot {
  public anchorX: number = 0;
  public anchorY: number = 0;
  public dragX: number = 0;
  public dragY: number = 0;
  public isDragging: boolean = false;
  
  private game: Game;
  private graphics: PIXI.Graphics;
  private trajectoryGraphics: PIXI.Graphics;
  private maxStretch: number = 140;
  private forceMultiplier: number = 0.0015;
  
  // 1. EXTRACTED CONSTANTS TO PROPERTIES
  // This allows us to calculate the bird position accurately from outside the render loop
  private forkHeight: number = 90; 
  private forkSpread: number = 50;

  constructor(game: Game) {
    this.game = game;
    this.graphics = new PIXI.Graphics();
    this.trajectoryGraphics = new PIXI.Graphics();
    this.game.getContainer().addChild(this.graphics);
    this.game.getContainer().addChild(this.trajectoryGraphics);
  }

  setPosition(x: number, y: number): void {
    this.anchorX = x;
    this.anchorY = y;
    // Initially set drag position to the resting position (top of the Y)
    const resting = this.getRestingPosition();
    this.dragX = resting.x;
    this.dragY = resting.y;
  }

  /**
   * 2. NEW METHOD: Use this when spawning the bird!
   * Returns the exact coordinates where the bands sit at the top of the Y.
   */
  getRestingPosition(): { x: number, y: number } {
    return {
      x: this.anchorX,
      // We subtract forkHeight to go UP. 
      // We add 20 to simulate the slight "sag" of the band where the bird sits.
      y: this.anchorY - this.forkHeight + 20 
    };
  }

  startDrag(x: number, y: number): void {
    this.isDragging = true;
    this.updateDrag(x, y);
  }

  updateDrag(x: number, y: number): void {
    if (!this.isDragging) return;
    
    // Calculate distance from the RESTING position, not the anchor base
    const resting = this.getRestingPosition();
    const dx = x - resting.x; // anchorX is same as resting.x
    const dy = y - resting.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > this.maxStretch) {
      const ratio = this.maxStretch / distance;
      this.dragX = resting.x + dx * ratio;
      this.dragY = resting.y + dy * ratio;
    } else {
      this.dragX = x;
      this.dragY = y;
    }
  }

  release(): { x: number; y: number } {
    this.isDragging = false;
    
    // Calculate force based on distance from the resting point
    const resting = this.getRestingPosition();
    
    const forceX = (resting.x - this.dragX) * this.forceMultiplier;
    const forceY = (resting.y - this.dragY) * this.forceMultiplier;
    
    // Snap back visual to resting
    this.dragX = resting.x;
    this.dragY = resting.y;
    
    return { x: forceX, y: forceY };
  }

  update(): void {
    this.graphics.clear();
    this.trajectoryGraphics.clear();
    
    const groundLevel = 980;
    const baseY = groundLevel;
    
    // BACK RUBBER BAND (drawn first, behind bird)
    if (this.isDragging) {
      this.graphics.lineStyle(8, 0x2D1810, 1);
      // Right band (back)
      this.graphics.moveTo(this.anchorX + this.forkSpread, this.anchorY - this.forkHeight);
      this.graphics.lineTo(this.dragX, this.dragY);
    }
    
    // === WOODEN BASE (TRUNK) ===
    this.graphics.lineStyle(0);
    this.graphics.beginFill(0x6B4423);
    
    this.graphics.moveTo(this.anchorX - 18, this.anchorY);
    this.graphics.lineTo(this.anchorX + 18, this.anchorY);
    this.graphics.lineTo(this.anchorX + 22, baseY);
    this.graphics.lineTo(this.anchorX - 22, baseY);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Wood grain highlights
    this.graphics.beginFill(0x8B5A2B, 0.3);
    this.graphics.drawRect(this.anchorX - 15, this.anchorY + 10, 30, 85);
    this.graphics.endFill();
    
    // Wood texture lines
    this.graphics.lineStyle(2, 0x5A3A1A, 0.4);
    for (let i = 0; i < 4; i++) {
      const y = this.anchorY + 20 + (i * 20);
      this.graphics.moveTo(this.anchorX - 16, y);
      this.graphics.lineTo(this.anchorX + 16, y);
    }
    
    // === LEFT FORK (Y-SHAPE) ===
    this.graphics.lineStyle(0);
    this.graphics.beginFill(0x6B4423);
    
    this.graphics.moveTo(this.anchorX - 18, this.anchorY);
    this.graphics.lineTo(this.anchorX - this.forkSpread, this.anchorY - this.forkHeight);
    this.graphics.lineTo(this.anchorX - this.forkSpread + 14, this.anchorY - this.forkHeight + 8);
    this.graphics.lineTo(this.anchorX - 8, this.anchorY + 10);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Left fork knob
    this.graphics.beginFill(0x6B4423);
    this.graphics.drawCircle(this.anchorX - this.forkSpread + 7, this.anchorY - this.forkHeight + 4, 10);
    this.graphics.endFill();
    
    // Left fork shading
    this.graphics.beginFill(0x5A3A1A, 0.3);
    this.graphics.drawCircle(this.anchorX - this.forkSpread + 5, this.anchorY - this.forkHeight + 2, 7);
    this.graphics.endFill();
    
    // === RIGHT FORK (Y-SHAPE) ===
    this.graphics.lineStyle(0);
    this.graphics.beginFill(0x6B4423);
    
    this.graphics.moveTo(this.anchorX + 18, this.anchorY);
    this.graphics.lineTo(this.anchorX + this.forkSpread, this.anchorY - this.forkHeight);
    this.graphics.lineTo(this.anchorX + this.forkSpread - 14, this.anchorY - this.forkHeight + 8);
    this.graphics.lineTo(this.anchorX + 8, this.anchorY + 10);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Right fork knob
    this.graphics.beginFill(0x6B4423);
    this.graphics.drawCircle(this.anchorX + this.forkSpread - 7, this.anchorY - this.forkHeight + 4, 10);
    this.graphics.endFill();
    
    // Right fork shading
    this.graphics.beginFill(0x5A3A1A, 0.3);
    this.graphics.drawCircle(this.anchorX + this.forkSpread - 5, this.anchorY - this.forkHeight + 2, 7);
    this.graphics.endFill();
    
    // === RUBBER BANDS ===
    if (this.isDragging) {
      // FRONT RUBBER BAND
      this.graphics.lineStyle(8, 0x2D1810, 1);
      this.graphics.moveTo(this.anchorX - this.forkSpread, this.anchorY - this.forkHeight);
      this.graphics.lineTo(this.dragX, this.dragY);
      
      // LEATHER POUCH
      this.graphics.lineStyle(2, 0x1A0F08);
      this.graphics.beginFill(0x5D4037);
      this.graphics.drawRoundedRect(this.dragX - 18, this.dragY - 10, 36, 20, 4);
      this.graphics.endFill();
      
      // Stitching
      this.graphics.lineStyle(1, 0x3E2723);
      for (let i = 0; i < 5; i++) {
        const x = this.dragX - 15 + (i * 7.5);
        this.graphics.moveTo(x, this.dragY - 8);
        this.graphics.lineTo(x, this.dragY + 8);
      }
      
      this.drawTrajectory();
    } else {
      // RESTING RUBBER BANDS
      this.graphics.lineStyle(7, 0x2D1810, 0.9);
      this.graphics.moveTo(this.anchorX - this.forkSpread, this.anchorY - this.forkHeight);
      this.graphics.bezierCurveTo(
        this.anchorX - this.forkSpread + 15, this.anchorY - this.forkHeight + 40,
        this.anchorX + this.forkSpread - 15, this.anchorY - this.forkHeight + 40,
        this.anchorX + this.forkSpread, this.anchorY - this.forkHeight
      );
    }
    
    // === WOOD OUTLINE ===
    this.graphics.lineStyle(2, 0x4A2F1A, 1);
    this.graphics.moveTo(this.anchorX - 18, this.anchorY);
    this.graphics.lineTo(this.anchorX - 22, baseY);
    this.graphics.moveTo(this.anchorX + 18, this.anchorY);
    this.graphics.lineTo(this.anchorX + 22, baseY);
    this.graphics.moveTo(this.anchorX - 18, this.anchorY);
    this.graphics.lineTo(this.anchorX - this.forkSpread, this.anchorY - this.forkHeight);
    this.graphics.moveTo(this.anchorX + 18, this.anchorY);
    this.graphics.lineTo(this.anchorX + this.forkSpread, this.anchorY - this.forkHeight);
  }

  private drawTrajectory(): void {
    // 3. UPDATE: Increased number of points to 150 because the steps are smaller now
    const points = this.getTrajectoryPreview(150); 
    if (points.length < 2) return;
    
    this.trajectoryGraphics.lineStyle(0);
    for (let i = 0; i < points.length; i++) {
      const alpha = 1 - (i / points.length) * 0.6;
      const size = 5 - (i / points.length) * 2;
      
      this.trajectoryGraphics.beginFill(0xFFFFFF, alpha * 0.9);
      this.trajectoryGraphics.drawCircle(points[i].x, points[i].y, size);
      this.trajectoryGraphics.endFill();
      
      this.trajectoryGraphics.beginFill(0xFFFF00, alpha * 0.4);
      this.trajectoryGraphics.drawCircle(points[i].x, points[i].y, size * 0.6);
      this.trajectoryGraphics.endFill();
    }
  }

  getDragDistance(): number {
    const resting = this.getRestingPosition();
    const dx = this.dragX - resting.x;
    const dy = this.dragY - resting.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTrajectoryPreview(numPoints: number = 25): { x: number; y: number }[] {
    if (!this.isDragging) return [];
    
    const points: { x: number; y: number }[] = [];
    const resting = this.getRestingPosition();
    
    const force = {
      x: (resting.x - this.dragX) * this.forceMultiplier,
      y: (resting.y - this.dragY) * this.forceMultiplier
    };
    
    const mass = 0.002;
    let vx = (force.x / mass);
    let vy = (force.y / mass);
    let x = this.dragX;
    let y = this.dragY;
    const gravity = 0.5;
    
    const maxDistance = 600; 
    let totalDistance = 0;
    
    for (let i = 0; i < numPoints; i++) {
      points.push({ x, y });
      
      const prevX = x;
      const prevY = y;
      
      // 4. UPDATE: REMOVED MULTIPLIER
      // Previous: x += vx * 2; 
      // Now: x += vx; (this makes the dots much closer together)
      x += vx; 
      y += vy;
      vy += gravity;
      
      const stepDist = Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));
      totalDistance += stepDist;
      
      if (totalDistance > maxDistance || y > 980) break;
    }
    
    return points;
  }
}