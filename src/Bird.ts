import * as PIXI from "pixi.js";
import Matter from "matter-js";
import type { Game } from "./Game";

export type BirdType = "red" | "blue" | "yellow" | "black" | "white";

export class Bird {
    public type: BirdType;
    public sprite: PIXI.Sprite;
    public body: Matter.Body;

    public isLaunched = false;
    public abilityUsed = false;
    public hasCollided = false;

    private game: Game;

    constructor(type: BirdType, x: number, y: number, game: Game) {
        this.type = type;
        this.game = game;

        // Simple colored textures
        const tex = PIXI.Texture.WHITE;
        this.sprite = new PIXI.Sprite(tex);
        this.sprite.tint = this.getColor();
        this.sprite.width = 50;
        this.sprite.height = 50;
        this.sprite.anchor.set(0.5);

        game.getContainer().addChild(this.sprite);

        // Matter.js body
        this.body = Matter.Bodies.circle(x, y, 25, {
            restitution: 0.4,
            friction: 0.6,
            density: 0.8
        });

        Matter.World.add(game.getWorld(), this.body);

        // Collision handler
        Matter.Events.on(game.getEngine(), "collisionStart", (event) => {
            for (const pair of event.pairs) {
                if (pair.bodyA === this.body || pair.bodyB === this.body) {
                    this.handleCollision();
                }
            }
        });
    }

    private getColor(): number {
        switch (this.type) {
            case "red": return 0xff4a4a;
            case "blue": return 0x4ab4ff;
            case "yellow": return 0xffe44a;
            case "black": return 0x333333;
            case "white": return 0xffffff;
        }
    }

    update(): void {
        if (this.body) {
            this.sprite.position.set(this.body.position.x, this.body.position.y);
            this.sprite.rotation = this.body.angle;
        }
    }

    updatePosition(x: number, y: number): void {
        Matter.Body.setPosition(this.body, { x, y });
        this.update();
    }

    launch(forceX: number, forceY: number): void {
        this.isLaunched = true;
        Matter.Body.setStatic(this.body, false);
        Matter.Body.applyForce(this.body, this.body.position, { x: forceX, y: forceY });
    }

    isSettled(): boolean {
        const speed = Math.sqrt(
            this.body.velocity.x ** 2 + this.body.velocity.y ** 2
        );
        return speed < 0.1;
    }

    // ----------------------------
    // Ability activation dispatcher
    // ----------------------------

    activateAbility(): void {
        if (!this.isLaunched) return;
        if (this.abilityUsed) return;
        if (this.hasCollided) return; // ability disabled when bird hits something

        this.abilityUsed = true;
        this.game.getAudioManager().play("abilityActivate");

        switch (this.type) {
            case "red": this.redAbility(); break;
            case "blue": this.blueSplitAbility(); break;
            case "yellow": this.yellowBoostAbility(); break;
            case "white": this.whiteEggAbility(); break;
            case "black": this.blackExplosionAbility(); break;
        }
    }

    // ----------------------------
    // Ability implementations
    // ----------------------------

    private redAbility(): void {
        const bodies = Matter.Composite.allBodies(this.game.getWorld());
        const origin = this.body.position;

        bodies.forEach(b => {
            if (b === this.body) return;
            const dx = b.position.x - origin.x;
            const dy = b.position.y - origin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
                Matter.Body.applyForce(b, b.position, {
                    x: dx * 0.0015,
                    y: dy * 0.0015
                });
            }
        });
    }

    private blueSplitAbility(): void {
        const game = this.game;
        const originalVel = { ...this.body.velocity };
        const x = this.body.position.x;
        const y = this.body.position.y;

        const angles = [-0.25, 0, 0.25];

        angles.forEach((offset, i) => {
            const body = Matter.Bodies.circle(x, y, 20, {
                restitution: 0.4,
                friction: 0.6
            });

            Matter.World.add(game.getWorld(), body);

            Matter.Body.setVelocity(body, {
                x: originalVel.x * (1 + offset),
                y: originalVel.y
            });

            const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            sprite.tint = 0x4ab4ff;
            sprite.width = 30;
            sprite.height = 30;
            sprite.anchor.set(0.5);
            game.getContainer().addChild(sprite);

            Matter.Events.on(game.getEngine(), "beforeUpdate", () => {
                sprite.position.set(body.position.x, body.position.y);
                sprite.rotation = body.angle;
            });
        });
    }

    private yellowBoostAbility(): void {
        const v = this.body.velocity;
        Matter.Body.setVelocity(this.body, {
            x: v.x * 3,
            y: v.y * 3
        });
    }

    private whiteEggAbility(): void {
        const game = this.game;
        const x = this.body.position.x;
        const y = this.body.position.y;

        const egg = Matter.Bodies.circle(x, y + 10, 20, {
            restitution: 0.2,
            isStatic: true
        });

        Matter.World.add(game.getWorld(), egg);

        const bodies = Matter.Composite.allBodies(game.getWorld());

        bodies.forEach(b => {
            const dx = b.position.x - x;
            const dy = b.position.y - (y + 10);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 160) {
                Matter.Body.applyForce(b, b.position, {
                    x: dx * 0.003,
                    y: dy * 0.003
                });
            }
        });

        Matter.Body.setVelocity(this.body, {
            x: this.body.velocity.x,
            y: -10
        });
    }

    private blackExplosionAbility(): void {
        const bodies = Matter.Composite.allBodies(this.game.getWorld());
        const cx = this.body.position.x;
        const cy = this.body.position.y;

        bodies.forEach(b => {
            if (b === this.body) return;
            const dx = b.position.x - cx;
            const dy = b.position.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 250) {
                Matter.Body.applyForce(b, b.position, {
                    x: dx * 0.004,
                    y: dy * 0.004
                });
            }
        });

        Matter.World.remove(this.game.getWorld(), this.body);
        this.sprite.visible = false;
    }

    // ----------------------------
    // Collision
    // ----------------------------

    private handleCollision(): void {
        if (this.hasCollided) return;
        this.hasCollided = true;

        // Black bird auto-explodes on impact
        if (this.type === "black" && !this.abilityUsed) {
            this.abilityUsed = true;
            this.blackExplosionAbility();
        }
    }
}
