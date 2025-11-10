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
  private maxStretch: number = 120; // Reduced for better control
  private forceMultiplier: number = 0.0008; // Much lower for realistic speed

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
    this.dragX = x;
    this.dragY = y;
  }

  startDrag(x: number, y: number): void {
    this.isDragging = true;
    this.updateDrag(x, y);
  }

  updateDrag(x: number, y: number): void {
    if (!this.isDragging) return;
    
    // Calculate vector from anchor to drag point
    const dx = x - this.anchorX;
    const dy = y - this.anchorY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Limit stretch distance
    if (distance > this.maxStretch) {
      const ratio = this.maxStretch / distance;
      this.dragX = this.anchorX + dx * ratio;
      this.dragY = this.anchorY + dy * ratio;
    } else {
      this.dragX = x;
      this.dragY = y;
    }
  }

    release(): { x: number; y: number } {
    this.isDragging = false;

    // Calculate launch force (opposite of drag direction)
    // Increase multiplier so the physics engine actually notices it.
    // You can tune FORCE_MULTIPLIER between 0.005 and 0.06 depending on feel.
    const FORCE_MULTIPLIER = 0.0008;

    const forceX = (this.anchorX - this.dragX) * FORCE_MULTIPLIER;
    const forceY = (this.anchorY - this.dragY) * FORCE_MULTIPLIER;

    // Reset drag position
    this.dragX = this.anchorX;
    this.dragY = this.anchorY;

    return { x: forceX, y: forceY };
  }


  update(): void {
    this.graphics.clear();
    this.trajectoryGraphics.clear();
    
    // Draw slingshot base/tree trunk
    this.graphics.beginFill(0x654321);
    this.graphics.drawRect(this.anchorX - 25, this.anchorY, 50, 150);
    this.graphics.endFill();
    
    // Draw left branch
    this.graphics.beginFill(0x654321);
    this.graphics.drawCircle(this.anchorX - 20, this.anchorY - 10, 8);
    this.graphics.endFill();
    
    // Draw right branch
    this.graphics.beginFill(0x654321);
    this.graphics.drawCircle(this.anchorX + 20, this.anchorY - 10, 8);
    this.graphics.endFill();
    
    // Draw rubber bands when dragging
    if (this.isDragging) {
      this.graphics.lineStyle(5, 0x4A2511);
      
      // Left band
      this.graphics.moveTo(this.anchorX - 20, this.anchorY - 10);
      this.graphics.lineTo(this.dragX, this.dragY);
      
      // Right band
      this.graphics.moveTo(this.anchorX + 20, this.anchorY - 10);
      this.graphics.lineTo(this.dragX, this.dragY);
      
      // Draw trajectory guide
      this.drawTrajectory();
    }
  }

  private drawTrajectory(): void {
    const points = this.getTrajectoryPreview(25);
    
    if (points.length < 2) return;
    
    // Draw dotted trajectory line
    this.trajectoryGraphics.lineStyle(3, 0xFFFFFF, 0.7);
    
    for (let i = 0; i < points.length - 1; i++) {
      // Draw dashed line effect
      if (i % 2 === 0) {
        this.trajectoryGraphics.moveTo(points[i].x, points[i].y);
        this.trajectoryGraphics.lineTo(points[i + 1].x, points[i + 1].y);
      }
    }
    
    // Draw dots along trajectory
    this.trajectoryGraphics.lineStyle(0);
    for (let i = 0; i < points.length; i += 2) {
      const alpha = 1 - (i / points.length) * 0.5; // Fade out
      this.trajectoryGraphics.beginFill(0xFFFFFF, alpha);
      this.trajectoryGraphics.drawCircle(points[i].x, points[i].y, 3);
      this.trajectoryGraphics.endFill();
    }
  }

  getDragDistance(): number {
    const dx = this.dragX - this.anchorX;
    const dy = this.dragY - this.anchorY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTrajectoryPreview(numPoints: number = 25): { x: number; y: number }[] {
    if (!this.isDragging) return [];
    
    const points: { x: number; y: number }[] = [];
    const force = {
      x: (this.anchorX - this.dragX) * this.forceMultiplier,
      y: (this.anchorY - this.dragY) * this.forceMultiplier
    };
    
    // Simulate bird mass (approximate)
    const mass = 0.002;
    const gravityY = 2; // Match engine gravity
    
    // Initial velocity from force
    let vx = (force.x / mass) * 60; // Convert to velocity
    let vy = (force.y / mass) * 60;
    
    let x = this.dragX;
    let y = this.dragY;
    
    // Simulate trajectory with physics
    for (let i = 0; i < numPoints; i++) {
      points.push({ x, y });
      
      // Update position
      x += vx * 0.016; // 60 FPS timestep
      y += vy * 0.016;
      
      // Apply gravity
      vy += gravityY * 60 * 0.016;
      
      // Apply air resistance
      vx *= 0.99;
      vy *= 0.99;
      
      // Stop if trajectory goes off screen or hits ground
      if (y > 1000 || x > 2000 || x < 0) break;
    }
    
    return points;
  }
}