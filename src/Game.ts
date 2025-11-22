import { Application, Container } from "pixi.js";
import Matter from "matter-js";
import { Slingshot } from "./Slingshot";
import { Level } from "./Level";
import { Bird, type BirdType } from "./Bird";
import { AudioManager } from "./AudioManager";
import { UI } from "./UI";
import { MenuManager } from "./MenuManager";

export class Game {
  private app: Application;
  private engine: Matter.Engine;
  private world: Matter.World;
  private slingshot: Slingshot;
  private level: Level;
  
  // -- BIRD MANAGEMENT --
  private currentBird: Bird | null = null;
  private birdQueue: Bird[] = []; 
  private availableBirds: BirdType[] = [];
  private birdsUsed: number = 0;
  // ---------------------

  private audioManager: AudioManager;
  private pixiContainer: Container;
  private ui: UI;
  private menuManager: MenuManager;

  private score: number = 0;
  private isLevelComplete: boolean = false;
  private isGameOver: boolean = false;
  private isPlaying: boolean = false;
  private musicStarted: boolean = false;

  private baseWidth = 3000;
  private baseHeight = 1080;
  private scale = 1;

  private gameStateCheckInterval: number | null = null;
  private lastCheckTime: number = 0;
  
  private canActivateAbility: boolean = false;
  private abilityActivationDelay: number = 300;

  constructor() {
    this.app = new Application();
    this.pixiContainer = new Container();

    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.5 }
    });
    this.world = this.engine.world;

    this.audioManager = new AudioManager();
    this.slingshot = new Slingshot(this);
    this.level = new Level(this, this.baseWidth, this.baseHeight);
    this.ui = new UI(this, this.baseWidth, this.baseHeight);
    this.menuManager = new MenuManager(this);
  }

  async init(): Promise<void> {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      resolution: dpr,
      autoDensity: true,
      resizeTo: window,
      antialias: true
    });

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.touchAction = "none";
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.backgroundColor = "#87CEEB";
    document.body.appendChild(canvas);

    await this.audioManager.loadAssets();

    this.app.stage.addChild(this.pixiContainer);
    this.app.stage.addChild(this.ui.getContainer());
    this.app.stage.addChild(this.menuManager.getContainer());

    this.setupResponsiveViewport();
    
    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.onResize(), 150);
    });
    
    window.visualViewport?.addEventListener("resize", () => {
      setTimeout(() => this.onResize(), 100);
    });

    this.app.ticker.add(() => this.update());
    this.setupInputHandlers();

    this.slingshot.setPosition(this.baseWidth * 0.12, this.baseHeight * 0.78);
    
    this.menuManager.showMainMenu();
    this.pixiContainer.visible = false;
    this.ui.getContainer().visible = false;
  }

  private setupResponsiveViewport(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaleX = vw / this.baseWidth;
    const scaleY = vh / this.baseHeight;
    const isMobile = vw < 768;
    const isPortrait = vh > vw;
    
    if (isMobile && isPortrait) {
      this.scale = scaleX;
    } else if (isMobile && !isPortrait) {
      this.scale = Math.min(scaleX, scaleY);
    } else {
      this.scale = Math.min(scaleX, scaleY * 0.95);
    }
    
    this.pixiContainer.scale.set(this.scale);
    const scaledWidth = this.baseWidth * this.scale;
    const scaledHeight = this.baseHeight * this.scale;
    const offsetX = Math.max(0, (vw - scaledWidth) / 2);
    const offsetY = isMobile && isPortrait ? 
      Math.max(0, (vh - scaledHeight) / 2) :
      Math.max(0, vh - scaledHeight);

    this.pixiContainer.position.set(offsetX, offsetY);
    this.ui.updateScale(this.scale, vw, vh);
  }

  private onResize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.app.renderer.resolution = dpr;
    this.setupResponsiveViewport();
    
    if (this.menuManager.getContainer().visible) {
        if (this.menuManager.getCurrentState() === 'main') {
            this.menuManager.showMainMenu();
        } else if (this.menuManager.getCurrentState() === 'levelSelect') {
            this.menuManager.showLevelSelect();
        }
    }
  }

  private screenToWorld(clientX: number, clientY: number) {
    const canvas = this.app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * (this.app.renderer.width / rect.width);
    const canvasY = (clientY - rect.top) * (this.app.renderer.height / rect.height);
    const worldX = (canvasX - this.pixiContainer.position.x) / this.scale;
    const worldY = (canvasY - this.pixiContainer.position.y) / this.scale;
    return { x: worldX, y: worldY };
  }

  private setupInputHandlers(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;
    let isDraggingSlingshot = false;

    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      if (!e.isPrimary) return;
      if (!this.musicStarted) {
        this.musicStarted = true;
        this.audioManager.setEnabled(true);
        this.audioManager.playMusic('bgm');
      }
      e.preventDefault();
      if (!this.isPlaying) return;
      
      const p = this.screenToWorld(e.clientX, e.clientY);
      if (this.currentBird && !this.currentBird.isLaunched) {
        const dx = p.x - this.currentBird.body.position.x;
        const dy = p.y - this.currentBird.body.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const touchRadius = Math.max(100, this.currentBird.getRadiusOut() * 3);
        if (dist < touchRadius) {
          isDraggingSlingshot = true;
        }
      }
      this.onPointerDown(p.x, p.y);
      if (!isDraggingSlingshot) {
        this.onAbilityActivate();
      }
    }, { passive: false });

    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      if (!e.isPrimary) return;
      e.preventDefault();
      if (!this.isPlaying) return;
      const p = this.screenToWorld(e.clientX, e.clientY);
      this.onPointerMove(p.x, p.y);
    }, { passive: false });

    canvas.addEventListener("pointerup", (e: PointerEvent) => {
      if (!e.isPrimary) return;
      e.preventDefault();
      if (!this.isPlaying) return;
      const p = this.screenToWorld(e.clientX, e.clientY);
      this.onPointerUp(p.x, p.y);
      isDraggingSlingshot = false;
    }, { passive: false });
  }

  private onPointerDown(worldX: number, worldY: number): void {
    if (this.isLevelComplete || this.isGameOver) return;
    if (this.currentBird && !this.currentBird.isLaunched) {
      const dx = worldX - this.currentBird.body.position.x;
      const dy = worldY - this.currentBird.body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const touchRadius = Math.max(100, this.currentBird.getRadiusOut() * 3);
      if (dist < touchRadius) {
        this.slingshot.startDrag(worldX, worldY);
        this.audioManager.play("slingshotStretch");
      }
    }
  }

  private onPointerMove(worldX: number, worldY: number): void {
    if (this.slingshot.isDragging && this.currentBird && !this.currentBird.isLaunched) {
      this.slingshot.updateDrag(worldX, worldY);
      this.currentBird.updatePosition(this.slingshot.dragX, this.slingshot.dragY);
    }
  }

  private onPointerUp(worldX: number, worldY: number): void {
    if (this.slingshot.isDragging && this.currentBird && !this.currentBird.isLaunched) {
      const force = this.slingshot.release();
      const worldScaleFactor = this.baseWidth / 3000;
      const launchMultiplier = 0.6 * worldScaleFactor;
      this.launchBird(force.x * launchMultiplier, force.y * launchMultiplier);
      this.audioManager.play("birdLaunch");
    }
  }

  private onAbilityActivate(): void {
    if (!this.currentBird) return;
    if (!this.canActivateAbility) return;
    if (!this.currentBird.isLaunched) return;
    if (this.currentBird.abilityUsed) return;
    this.currentBird.activateAbility();
  }

  private launchBird(forceX: number, forceY: number): void {
    if (!this.currentBird) return;
    this.currentBird.launch(forceX, forceY);
    this.birdsUsed++;
    
    this.ui.updateBirdCount(this.getRemainingBirds());
    
    this.canActivateAbility = false;
    setTimeout(() => { this.canActivateAbility = true; }, this.abilityActivationDelay);

    if (this.gameStateCheckInterval !== null) {
      clearInterval(this.gameStateCheckInterval);
    }
    this.lastCheckTime = Date.now();
    this.gameStateCheckInterval = window.setInterval(() => { this.checkGameState(); }, 500);
  }

  private spawnNextBird(): void {
    if (this.isLevelComplete || this.isGameOver) return;
    
    if (this.gameStateCheckInterval !== null) {
      clearInterval(this.gameStateCheckInterval);
      this.gameStateCheckInterval = null;
    }
    
    if (this.currentBird) {
      this.currentBird = null;
    }
    this.canActivateAbility = false;

    if (this.birdQueue.length > 0) {
      const nextBird = this.birdQueue.shift(); 
      if (nextBird) {
          this.currentBird = nextBird;
          
          this.currentBird.body.collisionFilter.group = 0;
          this.currentBird.body.collisionFilter.category = 1;
          this.currentBird.body.collisionFilter.mask = 0xFFFFFFFF;
          
          const resting = this.slingshot.getRestingPosition();
          Matter.Body.setPosition(this.currentBird.body, {
              x: resting.x,
              y: resting.y
          });
          
          this.currentBird.update();
      }
    } else if (this.birdsUsed < this.availableBirds.length) {
       const birdType = this.availableBirds[this.birdsUsed];
       const resting = this.slingshot.getRestingPosition();
       this.currentBird = new Bird(birdType, resting.x, resting.y, this);
    }

    this.birdQueue.forEach((bird, index) => {
        const targetX = this.slingshot.anchorX - 100 - (index * 60);
        Matter.Body.setPosition(bird.body, { x: targetX, y: bird.body.position.y });
        bird.update();
    });
  }

  private checkGameState(): void {
    if (this.isLevelComplete || this.isGameOver) {
      if (this.gameStateCheckInterval !== null) {
        clearInterval(this.gameStateCheckInterval);
        this.gameStateCheckInterval = null;
      }
      return;
    }
    const pigs = this.level.getPigs();
    const allPigsDead = pigs.length === 0 || pigs.every((p) => p.isDestroyed);

    if (allPigsDead) {
      this.handleLevelComplete();
      return;
    }

    const birdSettled = this.currentBird?.isSettled() || false;
    const waitingBirdsCount = this.birdQueue.length;

    if (birdSettled) {
      // FIXED LOGIC: Check if we have any birds waiting in the queue.
      // If queue is empty AND we used all available birds, then it is game over.
      // (Note: this.birdsUsed counts the current bird, so we check if that equals total)
      if (waitingBirdsCount === 0 && this.birdsUsed >= this.availableBirds.length) {
        this.handleGameOver();
      } else {
        this.spawnNextBird();
      }
    } else {
      // Fallback timeout check
      const timeSinceLaunch = Date.now() - this.lastCheckTime;
      if (timeSinceLaunch > 15000) {
        if (waitingBirdsCount === 0 && this.birdsUsed >= this.availableBirds.length) {
          this.handleGameOver();
        } else {
          this.spawnNextBird();
        }
      }
    }
  }

  private handleLevelComplete(): void {
    if (this.isLevelComplete) return;
    this.isLevelComplete = true;
    this.canActivateAbility = false;
    if (this.gameStateCheckInterval !== null) {
      clearInterval(this.gameStateCheckInterval);
      this.gameStateCheckInterval = null;
    }
    const remainingBirds = this.getRemainingBirds();
    const birdBonus = remainingBirds * 10000;
    this.addScore(birdBonus);

    const stars = this.level.getStarRating(this.score);
    this.audioManager.play("levelComplete");
    this.menuManager.updateLevelProgress(this.level.currentLevel, stars, this.score);
    setTimeout(() => {
      this.ui.showLevelComplete(this.level.currentLevel, this.score, stars, birdBonus);
    }, 500);
  }

  private handleGameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.canActivateAbility = false;
    if (this.gameStateCheckInterval !== null) {
      clearInterval(this.gameStateCheckInterval);
      this.gameStateCheckInterval = null;
    }
    const stars = this.level.getStarRating(this.score);
    if (stars > 0) {
      this.menuManager.updateLevelProgress(this.level.currentLevel, stars, this.score);
    }
    setTimeout(() => {
      this.ui.showGameOver(this.level.currentLevel, this.score, stars);
    }, 500);
  }

  public restartLevel(): void {
    this.startLevel(this.level.currentLevel);
  }

  public nextLevel(): void {
    this.resetGameState();
    const nextLevelNum = this.level.currentLevel + 1;
    if (nextLevelNum <= this.level.getTotalLevels()) {
      this.startLevel(nextLevelNum);
    } else {
      this.goToMenu();
    }
  }

  public goToMenu(): void {
    this.resetGameState();
    this.isPlaying = false;
    this.pixiContainer.visible = false;
    this.ui.getContainer().visible = false;
    this.menuManager.showLevelSelect();
  }

  public startLevel(levelNumber: number): void {
    this.resetGameState();
    this.isPlaying = true;
    this.pixiContainer.visible = true;
    this.ui.getContainer().visible = true;
    this.level.load(levelNumber);
    
    this.birdQueue = [];
    
    if (this.availableBirds.length > 0) {
      const firstBirdType = this.availableBirds[0];
      const resting = this.slingshot.getRestingPosition();
      this.currentBird = new Bird(firstBirdType, resting.x, resting.y, this);
      
      const groundY = this.baseHeight - 118; 
      
      for(let i = 1; i < this.availableBirds.length; i++) {
          const birdType = this.availableBirds[i];
          const waitX = this.slingshot.anchorX - 100 - ((i-1) * 60);
          
          const waitingBird = new Bird(birdType, waitX, groundY, this);
          waitingBird.body.collisionFilter = { group: -1, category: 0, mask: 0 };
          
          this.birdQueue.push(waitingBird);
      }
    }
  }

  private resetGameState(): void {
    if (this.gameStateCheckInterval !== null) {
      clearInterval(this.gameStateCheckInterval);
      this.gameStateCheckInterval = null;
    }
    this.score = 0;
    this.birdsUsed = 0;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.lastCheckTime = 0;
    this.canActivateAbility = false;
    
    if (this.currentBird) {
      this.currentBird.destroy();
      this.currentBird = null;
    }
    
    this.birdQueue.forEach(b => b.destroy());
    this.birdQueue = [];
    
    this.ui.updateScore(this.score);
    this.ui.hideEndScreen();
  }

  public addScore(points: number): void {
    this.score += points;
    this.ui.updateScore(this.score);
  }

  public setAvailableBirds(birds: BirdType[]): void {
    this.availableBirds = [...birds];
    this.birdsUsed = 0;
    this.ui.updateBirdCount(this.getRemainingBirds());
    this.ui.updateBirdTypes(birds);
    this.ui.updateLevel(this.level.currentLevel);
  }

  public getRemainingBirds(): number {
    return Math.max(0, this.availableBirds.length - this.birdsUsed);
  }

  private update(): void {
    if (this.isPlaying) {
      if (!this.isLevelComplete && !this.isGameOver) {
         Matter.Engine.update(this.engine, 1000 / 60);
         this.level.update();
         this.slingshot.update();
         
         if (this.currentBird) this.currentBird.update();
         this.birdQueue.forEach(b => b.update());
      }
    }
  }

  getApp() { return this.app; }
  getEngine() { return this.engine; }
  getWorld() { return this.world; }
  getContainer() { return this.pixiContainer; }
  getAudioManager() { return this.audioManager; }
  getSlingshot() { return this.slingshot; }
  getScore() { return this.score; }
  getLevel() { return this.level; }
  getScale() { return this.scale; }
  getMenuManager() { return this.menuManager; }
}