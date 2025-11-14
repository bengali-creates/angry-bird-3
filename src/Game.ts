import { Application, Container } from "pixi.js";
import Matter from "matter-js";
import { Slingshot } from "./Slingshot";
import { Level } from "./Level";
import { Bird, type BirdType } from "./Bird";
import { AudioManager } from "./AudioManager";

export class Game {
  private app: Application;
  private engine: Matter.Engine;
  private world: Matter.World;
  private slingshot: Slingshot;
  private level: Level;
  private currentBird: Bird | null = null;
  private audioManager: AudioManager;
  private pixiContainer: Container;

  // Virtual playable area (change these if you want a bigger world)
  private baseWidth = 2400;
  private baseHeight = 1080;

  // Scaling clamps (tweak if you want different min/max zoom)
  private minScale = 0.4; // don't let content become smaller than this
  private maxScale = 1;    // never upscale beyond 1 (prevents "too big" on phones)

  private scale = 1;

  constructor() {
    this.app = new Application();
    this.pixiContainer = new Container();

    // Recommended world gravity (tweak as needed for feel)
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.5 } // sweet spot for arcade-style arcs
    });
    this.world = this.engine.world;

    this.audioManager = new AudioManager();
    this.slingshot = new Slingshot(this);
    // pass virtual world to Level so level uses same coords
    this.level = new Level(this, this.baseWidth, this.baseHeight);
  }

  async init(): Promise<void> {
    // clamp device pixel ratio for performance
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // PIXI v8 async init + resizeTo: window ensures canvas fills viewport
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      background: 0x87CEEB,
      resolution: dpr,
      autoDensity: true,
      resizeTo: window
    });

    // style canvas for consistent layout
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.touchAction = "none"; // prevents browser gestures interfering
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    document.body.style.margin = "0";
    document.body.appendChild(canvas);

    // stage setup
    this.app.stage.addChild(this.pixiContainer);

    // initial viewport
    this.setupResponsiveViewport();
    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("orientationchange", () => this.onResize());

    // game loop
    this.app.ticker.add(() => this.update());

    // input
    this.setupInputHandlers();

    // load level & position slingshot relative to virtual world
    await this.level.load(1);
    this.slingshot.setPosition(this.baseWidth * 0.08, this.baseHeight * 0.78); // normalized placement
    this.spawnNextBird();
  }

  private setupResponsiveViewport(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 'contain' scaling: entire virtual area visible; preserves aspect ratio
    const rawScale = Math.min(vw / this.baseWidth, vh / this.baseHeight);

    // Clamp to prevent too small or (important) prevent upscaling > 1 which causes "too big" zoom
    const clamped = Math.max(Math.min(rawScale, this.maxScale), this.minScale);

    this.scale = clamped;
    this.pixiContainer.scale.set(this.scale);

    // center horizontally, anchor to bottom so ground & sling remain visible
    const offsetX = (vw - this.baseWidth * this.scale) / 2;
    const offsetY = vh - this.baseHeight * this.scale; // bottom aligned

    this.pixiContainer.position.set(offsetX, offsetY);
  }

  private onResize(): void {
    // Ensure renderer matches CSS size, update DPR clamp if needed
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.app.renderer.resolution = dpr;
    this.setupResponsiveViewport();
  }

  // Robust client -> virtual world conversion (accounts for CSS size, DPR, and container offset)
  private screenToWorld(clientX: number, clientY: number) {
    const canvas = this.app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();

    // convert client coords to canvas pixels
    const canvasX = (clientX - rect.left) * (this.app.renderer.width / rect.width);
    const canvasY = (clientY - rect.top) * (this.app.renderer.height / rect.height);

    // convert canvas (renderer) pixels into virtual world coords
    const worldX = (canvasX - this.pixiContainer.position.x) / this.scale;
    const worldY = (canvasY - this.pixiContainer.position.y) / this.scale;

    return { x: worldX, y: worldY };
  }

  private setupInputHandlers(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;

    // pointer events unify mouse/touch/stylus
    canvas.addEventListener(
      "pointerdown",
      (e: PointerEvent) => {
        if (!e.isPrimary) return;
        const p = this.screenToWorld(e.clientX, e.clientY);
        this.onPointerDown(p.x, p.y);
      },
      { passive: false }
    );

    canvas.addEventListener(
      "pointermove",
      (e: PointerEvent) => {
        if (!e.isPrimary) return;
        const p = this.screenToWorld(e.clientX, e.clientY);
        this.onPointerMove(p.x, p.y);
      },
      { passive: false }
    );

    canvas.addEventListener(
      "pointerup",
      (e: PointerEvent) => {
        if (!e.isPrimary) return;
        const p = this.screenToWorld(e.clientX, e.clientY);
        this.onPointerUp(p.x, p.y);
      },
      { passive: false }
    );

    // click/tap for ability activation (we still use client coords, ability logic checks speed)
    canvas.addEventListener("click", (e: MouseEvent) => {
      // convert to world if you need positions; we're using speed threshold so coords not needed
      this.onAbilityActivate(e.clientX, e.clientY);
    });
  }

  private onPointerDown(worldX: number, worldY: number): void {
    if (this.currentBird && !this.currentBird.isLaunched) {
      const dx = worldX - this.currentBird.body.position.x;
      const dy = worldY - this.currentBird.body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // bigger grab area on mobile helps usability
      if (dist < Math.max(80, this.currentBird.getRadiusOut() * 2.5)) {
        this.slingshot.startDrag(worldX, worldY);
        this.audioManager.play("slingshotStretch");
      }
    }
  }

  private onPointerMove(worldX: number, worldY: number): void {
    if (this.slingshot.isDragging && this.currentBird) {
      this.slingshot.updateDrag(worldX, worldY);
      this.currentBird.updatePosition(this.slingshot.dragX, this.slingshot.dragY);
    }
  }

  private onPointerUp(worldX: number, worldY: number): void {
    if (this.slingshot.isDragging && this.currentBird) {
      const force = this.slingshot.release();
      // apply a launch multiplier tuned against virtual world size
      const worldScaleFactor = this.baseWidth / 1920; // if you changed baseWidth, this preserves feel
      const launchMultiplier = 0.6 * worldScaleFactor;
      this.launchBird(force.x * launchMultiplier, force.y * launchMultiplier);
      this.audioManager.play("birdLaunch");
    }
  }

  private onAbilityActivate(_: number, __: number): void {
    if (!this.currentBird) return;

    const v = this.currentBird.body.velocity;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y);

    // require the bird to be moving in the "sweet spot" (not too fast, not fully stopped)
    const minSpeed = 0.3;
    const maxSpeed = 6; // tweak to make ability easier/harder to trigger
    if (speed < minSpeed || speed > maxSpeed) return;

    if (this.currentBird.isLaunched && !this.currentBird.abilityUsed) {
      this.currentBird.activateAbility();
    }
  }

  private launchBird(forceX: number, forceY: number): void {
    if (!this.currentBird) return;

    this.currentBird.launch(forceX, forceY);

    // after a short delay we check settled state and spawn next bird
    setTimeout(() => {
      if (this.currentBird?.isSettled()) {
        this.checkWinCondition();
        this.spawnNextBird();
      }
    }, 3000);
  }

  private spawnNextBird(): void {
    const types: BirdType[] = ["red", "blue", "yellow", "black", "white"];
    const random = types[Math.floor(Math.random() * types.length)];

    this.currentBird = new Bird(random, this.slingshot.anchorX, this.slingshot.anchorY, this);
  }

  private checkWinCondition(): void {
    const pigs = this.level.getPigs();
    const allDead = pigs.every((p) => p.isDestroyed);

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
    this.currentBird?.update();
    this.slingshot.update();
  }

  // getters
  getApp() { return this.app; }
  getEngine() { return this.engine; }
  getWorld() { return this.world; }
  getContainer() { return this.pixiContainer; }
  getAudioManager() { return this.audioManager; }
  getSlingshot() { return this.slingshot; }
}
