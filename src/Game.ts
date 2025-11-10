import * as PIXI from "pixi.js";
import Matter from "matter-js";
import { Slingshot } from "./Slingshot";
import { Level } from "./Level";
import { Bird, type BirdType } from "./Bird";
import { AudioManager } from "./AudioManager";

export class Game {
  private app!: PIXI.Application;
  private engine!: Matter.Engine;
  private world!: Matter.World;

  private slingshot!: Slingshot;
  private level!: Level;
  private currentBird: Bird | null = null;
  private audioManager!: AudioManager;

  private pixiContainer!: PIXI.Container;

  private baseWidth = 1920;
  private baseHeight = 1080;
  private scale = 1;

  constructor() { }

  async init(): Promise<void> {
    // create application (v8)
    this.app = new PIXI.Application();
    await this.app.init({
      background: 0x87ceeb,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: window
    });

    // append canvas
    document.body.appendChild(this.app.canvas);

    this.pixiContainer = new PIXI.Container();
    this.app.stage.addChild(this.pixiContainer);

    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 2 }
    });
    this.world = this.engine.world;

    this.audioManager = new AudioManager();
    this.slingshot = new Slingshot(this);
    this.level = new Level(this);

    this.setupResponsiveViewport();
    window.addEventListener("resize", () => this.onResize());

    this.setupInputHandlers();
    this.app.ticker.add(() => this.update());

    await this.level.load(1);

    this.slingshot.setPosition(200, 800);
    this.spawnNextBird();
  }

  private setupResponsiveViewport(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scaleX = width / this.baseWidth;
    const scaleY = height / this.baseHeight;
    this.scale = Math.min(scaleX, scaleY);

    this.pixiContainer.scale.set(this.scale);
    this.pixiContainer.position.set(
      (width - this.baseWidth * this.scale) / 2,
      (height - this.baseHeight * this.scale) / 2
    );
  }

  private onResize(): void {
    this.setupResponsiveViewport();
  }

  private setupInputHandlers(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;
    if (!canvas) {
      console.error("[Game] ERROR: app.canvas is undefined");
      return;
    }
    canvas.addEventListener("mousedown", (e) => {
      this.onPointerDown(e.clientX, e.clientY);
    });
    canvas.addEventListener("mousemove", (e) => {
      this.onPointerMove(e.clientX, e.clientY);
    });
    canvas.addEventListener("mouseup", () => {
      this.onPointerUp();
    });
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) this.onPointerDown(t.clientX, t.clientY);
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) this.onPointerMove(t.clientX, t.clientY);
    }, { passive: false });
    canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });
    canvas.addEventListener("click", () => {
      this.onAbilityActivate();
    });
  }

  private worldToScreen(x: number, y: number) {
    return {
      x: (x - this.pixiContainer.position.x) / this.scale,
      y: (y - this.pixiContainer.position.y) / this.scale
    };
  }

  private onPointerDown(screenX: number, screenY: number): void {
    const worldPos = this.worldToScreen(screenX, screenY);
    if (this.currentBird && !this.currentBird.isLaunched) {
      const dx = worldPos.x - this.currentBird.body.position.x;
      const dy = worldPos.y - this.currentBird.body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        this.slingshot.startDrag(worldPos.x, worldPos.y);
        this.audioManager.play("slingshotStretch");
      }
    }
  }

  private onPointerMove(screenX: number, screenY: number): void {
    const worldPos = this.worldToScreen(screenX, screenY);
    if (this.slingshot.isDragging && this.currentBird) {
      this.slingshot.updateDrag(worldPos.x, worldPos.y);
      this.currentBird.updatePosition(
        this.slingshot.dragX,
        this.slingshot.dragY
      );
    }
  }

  private onPointerUp(): void {
    if (this.slingshot.isDragging && this.currentBird) {
      const force = this.slingshot.release();
      this.launchBird(force.x, force.y);
      this.audioManager.play("birdLaunch");
    }
  }

  private onAbilityActivate(): void {
    const bird = this.currentBird;
    if (!bird) return;
    if (!bird.isLaunched) return;
    if (bird.abilityUsed) return;
    if (bird.hasCollided) return;
    bird.activateAbility();
  }

  private launchBird(forceX: number, forceY: number): void {
    if (!this.currentBird) return;

    this.currentBird.launch(forceX, forceY);

    setTimeout(() => {
      if (this.currentBird && this.currentBird.isSettled()) {
        this.checkWinCondition();
        this.spawnNextBird();
      }
    }, 3000);
  }

  private spawnNextBird(): void {
    const types: BirdType[] = ["red", "blue", "yellow", "black", "white"];
    const random = types[Math.floor(Math.random() * types.length)];
    this.currentBird = new Bird(
      random,
      this.slingshot.anchorX,
      this.slingshot.anchorY,
      this
    );
  }

  private checkWinCondition(): void {
    const pigs = this.level.getPigs();
    const allDead = pigs.every(p => p.isDestroyed);
    if (allDead) {
      this.audioManager.play("levelComplete");
      setTimeout(() => {
        this.level.load(this.level.currentLevel + 1);
      }, 2000);
    }
  }

  private update(): void {
    Matter.Engine.update(this.engine, 1000 / 60);
    this.level.update();
    if (this.currentBird) this.currentBird.update();
    this.slingshot.update();
  }

  getApp() {
    return this.app;
  }
  getWorld() {
    return this.world;
  }
  getEngine() {
    return this.engine;
  }
  getContainer() {
    return this.pixiContainer;
  }
  getAudioManager() {
    return this.audioManager;
  }
  getSlingshot() {
    return this.slingshot;
  }
}
