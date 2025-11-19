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
  private maxStretch: number = 120; // Increased for better control
  private forceMultiplier: number = 0.0014;

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
    
    // Draw slingshot - Improved Angry Birds style design
    // Base/trunk with proper shading
    this.graphics.beginFill(0x5C4033);
    this.graphics.drawRect(this.anchorX - 30, this.anchorY, 60, 180);
    this.graphics.endFill();
    
    // Add wood texture shading
    this.graphics.beginFill(0x4A3326);
    this.graphics.drawRect(this.anchorX - 25, this.anchorY + 10, 50, 160);
    this.graphics.endFill();
    
    // Left branch - wider spacing for realistic look
    const leftBranchX = this.anchorX - 45;
    const leftBranchY = this.anchorY - 15;
    
    // Branch body
    this.graphics.beginFill(0x654321);
    this.graphics.drawCircle(leftBranchX, leftBranchY, 12);
    this.graphics.endFill();
    
    // Branch shading
    this.graphics.beginFill(0x4A3326);
    this.graphics.drawCircle(leftBranchX - 3, leftBranchY - 2, 8);
    this.graphics.endFill();
    
    // Right branch - wider spacing for realistic look
    const rightBranchX = this.anchorX + 45;
    const rightBranchY = this.anchorY - 15;
    
    // Branch body
    this.graphics.beginFill(0x654321);
    this.graphics.drawCircle(rightBranchX, rightBranchY, 12);
    this.graphics.endFill();
    
    // Branch shading
    this.graphics.beginFill(0x4A3326);
    this.graphics.drawCircle(rightBranchX - 3, rightBranchY - 2, 8);
    this.graphics.endFill();
    
    // Draw rubber bands when dragging
    if (this.isDragging) {
      // Rubber band style - darker brown
      this.graphics.lineStyle(6, 0x3E2723);
      
      // Left band
      this.graphics.moveTo(leftBranchX, leftBranchY);
      this.graphics.lineTo(this.dragX, this.dragY);
      
      // Right band
      this.graphics.moveTo(rightBranchX, rightBranchY);
      this.graphics.lineTo(this.dragX, this.dragY);
      
      // Add leather pouch at drag point
      this.graphics.lineStyle(0);
      this.graphics.beginFill(0x6D4C41);
      this.graphics.drawRect(this.dragX - 15, this.dragY - 8, 30, 16);
      this.graphics.endFill();
      
      // Pouch stitching
      this.graphics.lineStyle(2, 0x3E2723);
      this.graphics.moveTo(this.dragX - 12, this.dragY - 5);
      this.graphics.lineTo(this.dragX - 12, this.dragY + 5);
      this.graphics.moveTo(this.dragX + 12, this.dragY - 5);
      this.graphics.lineTo(this.dragX + 12, this.dragY + 5);
      
      // Draw smaller trajectory guide
      this.drawTrajectory();
    } else {
      // Draw resting rubber bands
      this.graphics.lineStyle(5, 0x4A2511);
      
      // Left resting band
      this.graphics.moveTo(leftBranchX, leftBranchY);
      this.graphics.lineTo(this.anchorX, this.anchorY);
      
      // Right resting band
      this.graphics.moveTo(rightBranchX, rightBranchY);
      this.graphics.lineTo(this.anchorX, this.anchorY);
    }
  }

  private drawTrajectory(): void {
    const points = this.getTrajectoryPreview(100); // Reduced from 25
    
    if (points.length < 2) return;
    
    // Draw smaller, more subtle trajectory line
    this.trajectoryGraphics.lineStyle(2, 0xFFFFFF, 1); // Thinner and more transparent
    
    for (let i = 0; i < points.length - 1; i++) {
      // Draw dashed line effect
      if (i % 2 === 0) {
        this.trajectoryGraphics.moveTo(points[i].x, points[i].y);
        this.trajectoryGraphics.lineTo(points[i + 1].x, points[i + 1].y);
      }
    }
    
    // Draw smaller dots along trajectory
    this.trajectoryGraphics.lineStyle(0);
    for (let i = 0; i < points.length; i += 1) { // Less frequent dots
      const alpha = 1 - (i / points.length) * 0.7; // More fade out
      this.trajectoryGraphics.beginFill(0xFFFFFF, alpha * 0.6);
      this.trajectoryGraphics.drawCircle(points[i].x, points[i].y, 2); // Smaller dots
      this.trajectoryGraphics.endFill();
    }
  }

  getDragDistance(): number {
    const dx = this.dragX - this.anchorX;
    const dy = this.dragY - this.anchorY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTrajectoryPreview(numPoints: number = 20): { x: number; y: number }[] {
    if (!this.isDragging) return [];
    
    const points: { x: number; y: number }[] = [];
    const force = {
      x: (this.anchorX - this.dragX) * this.forceMultiplier,
      y: (this.anchorY - this.dragY) * this.forceMultiplier
    };
    
    // Simulate bird mass
    const mass = 0.002;
    const gravityY = 2;
    
    // Calculate initial velocity from force
    let vx = (force.x / mass) * 1;
    let vy = (force.y / mass) * 1;
    
    let x = this.dragX;
    let y = this.dragY;
    
    const timeStep = 1 / 60;
    
    // Simulate trajectory with physics
    for (let i = 0; i < numPoints; i++) {
      points.push({ x, y });
      
      // Update position
      x += vx * timeStep * 60;
      y += vy * timeStep * 60;
      
      // Apply gravity
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