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
  private maxStretch: number = 100; // Reduced for better control
  private forceMultiplier: number = 0.0014; // Much lower for realistic speed

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
    const forceX = (this.anchorX - this.dragX) * this.forceMultiplier;
    const forceY = (this.anchorY - this.dragY) * this.forceMultiplier;
    
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
    
    // Simulate bird mass
    const mass = 0.002;
    const gravityY = 2; // Match engine gravity
    
    // Calculate initial velocity from force
    // Force = mass * acceleration, so acceleration = force / mass
    // Velocity = acceleration * time (we apply force over 1 frame at 60fps)
    let vx = (force.x / mass) * 1;
    let vy = (force.y / mass) * 1;
    
    let x = this.dragX;
    let y = this.dragY;
    
    const timeStep = 1 / 60; // 60 FPS
    
    // Simulate trajectory with physics
    for (let i = 0; i < numPoints; i++) {
      points.push({ x, y });
      
      // Update position (velocity * time)
      x += vx * timeStep * 60;
      y += vy * timeStep * 60;
      
      // Apply gravity (acceleration)
      vy += gravityY;
      
      // Apply air resistance
      vx *= 0.995;
      vy *= 0.995;
      
      // Stop if trajectory goes off screen or hits ground
      if (y > 1000 || x > 2000 || x < 0) break;
    }
    
    return points;
  }
}