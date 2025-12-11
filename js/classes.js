
/** BACKGROUND SYSTEM */
class Star {
    constructor() { this.init(true); }
    init(first = false) {
        this.x = Math.random() * container.width;
        this.y = first ? Math.random() * container.height : -10;
        this.z = Math.random() * 2 + 0.5;
        this.size = Math.random() * 1.5;
        this.brightness = Math.random();
    }
    update() {
        let speed = (warpSpeed > 0 ? warpSpeed : 1) * (this.z / 2);
        this.y += speed;
        if (warpSpeed > 20) this.h = 20 + warpSpeed; else this.h = this.size;
        if (this.y > container.height + this.h) this.init();
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness * (this.z / 2)})`;
        if (warpSpeed > 10) ctx.fillRect(this.x, this.y - this.h, this.size / this.z, this.h);
        else { ctx.beginPath(); ctx.arc(this.x, this.y, this.size / (this.z / 2), 0, Math.PI * 2); ctx.fill(); }
    }
}

class NebulaCloud {
    constructor() { this.init(true); }
    init(first = false) {
        this.x = Math.random() * container.width;
        this.y = first ? Math.random() * container.height : -200;
        this.r = 150 + Math.random() * 250;
        this.vx = (Math.random() - 0.5) * 0.1;
        this.vy = 0.1 + Math.random() * 0.2;
        this.color = ZONES[currentZone % ZONES.length].color;
        this.opacity = Math.random() * 0.05 + 0.02;
    }
    update() {
        this.y += this.vy + (warpSpeed * 0.2);
        this.x += this.vx;
        if (this.y - this.r > container.height) this.init();
    }
    draw() {
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
        g.addColorStop(0, this.color + Math.floor(this.opacity * 255).toString(16).padStart(2, '0'));
        g.addColorStop(1, '#00000000');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    }
}

/** CLASSES */
class Player {
    constructor(cls) {
        this.cls = cls;
        this.w = container.width * 0.25 * cls.width;
        this.h = 20;
        this.x = container.width / 2 - this.w / 2;
        this.y = container.height - 100;
        this.mods = { dmg: 1, rate: 1, multi: 1, chain: 0, vamp: 0, barrier: 0, barrierMax: 0, reflect: 0, ricochet: 0, pierce: 0, timeSlow: 0, laser: false, critChance: 0, overload: false, splitOnHit: 0, execute: 0, explosive: 0 };
        this.hp = CONFIG.baseHp * cls.hp;
        this.maxHp = this.hp;
        this.lastShot = 0;
        this.iframe = 0;
        this.prevX = this.x;
        this.vx = 0;
    }
    update() {
        if (this.iframe > 0) this.iframe--;
        this.prevX = this.x;
        if (touchState.sliderX !== null) this.x += (touchState.sliderX - this.w / 2 - this.x) * 0.25;
        if (keys['ArrowLeft'] || keys['a']) this.x -= 8; if (keys['ArrowRight'] || keys['d']) this.x += 8;
        this.x = Math.max(0, Math.min(container.width - this.w, this.x));
        this.vx = this.x - this.prevX;

        if (this.mods.barrier < this.mods.barrierMax && frames % 600 === 0) this.mods.barrier++;
        if (frames - this.lastShot > (CONFIG.baseRate * this.cls.rate) * this.mods.rate) { this.shoot(); this.lastShot = frames; }
    }
    shoot() {
        let aimAngle = -Math.PI / 2;
        if (touchState.joyCurr && touchState.joyStart) {
            const dx = touchState.joyCurr.x - touchState.joyStart.x;
            const dy = touchState.joyCurr.y - touchState.joyStart.y;
            if (Math.hypot(dx, dy) > 10) aimAngle = Math.atan2(dy, dx);
        } else if (input.type === 'mouse') {
            aimAngle = Math.atan2(input.aimY - this.y, input.aimX - (this.x + this.w / 2));
        }
        Audio.play('shoot');
        const count = this.mods.multi;
        for (let i = 0; i < count; i++) {
            const spread = count > 1 ? -0.2 + (0.4 / (count - 1)) * i : 0;
            entities.balls.push(new Ball(this.x + this.w / 2, this.y - 10, aimAngle + spread, CONFIG.baseDmg * this.cls.dmg * this.mods.dmg, this.cls.color, false, this.mods.critChance, this.mods));
        }
    }
    draw() {
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = this.cls.color; ctx.fillStyle = this.iframe > 0 && Math.floor(frames / 4) % 2 === 0 ? '#fff' : this.cls.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = this.cls.color; ctx.globalAlpha = 0.5; ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);
        if (this.mods.laser) {
            let aimAngle = -Math.PI / 2;
            if (touchState.joyCurr) aimAngle = Math.atan2(touchState.joyCurr.y - touchState.joyStart.y, touchState.joyCurr.x - touchState.joyStart.x);
            else if (input.type === 'mouse') aimAngle = Math.atan2(input.aimY - this.y, input.aimX - (this.x + this.w / 2));
            ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.beginPath();
            ctx.moveTo(this.x + this.w / 2, this.y); ctx.lineTo(this.x + this.w / 2 + Math.cos(aimAngle) * 800, this.y + Math.sin(aimAngle) * 800);
            ctx.stroke();
        }
        if (this.mods.barrier > 0) {
            ctx.strokeStyle = `rgba(0,255,255,${0.3 + Math.sin(frames * 0.1) * 0.2})`; ctx.lineWidth = 2;
            ctx.strokeRect(this.x - 5, this.y - 5, this.w + 10, this.h + 10);
        }
        ctx.restore();
    }
    hit(dmg) {
        if (this.iframe > 0) return;
        if (this.mods.barrier > 0) { this.mods.barrier--; this.iframe = 30; createParticles(this.x + this.w / 2, this.y, 10, '#00ffff'); return; }
        this.hp -= dmg; this.iframe = 30; uiShake(15); Audio.play('hit');
        document.body.classList.add('chromatic-aberration');
        setTimeout(() => document.body.classList.remove('chromatic-aberration'), 200);
        if (this.hp <= 0) gameOver();
        updateHud();
    }
}

class Ball {
    constructor(x, y, angle, dmg, color, homing = false, critChance = 0, mods = {}, r = 4) {
        this.x = x; this.y = y; this.r = r;
        this.vx = Math.cos(angle) * 12; this.vy = Math.sin(angle) * 12;
        this.dmg = dmg; this.color = color;
        this.active = true; this.homing = homing; this.mods = mods;
        this.isCrit = Math.random() < critChance;
        this.bounces = mods.ricochet || 0;
        this.pierceCount = mods.pierce || 0;
        if (this.isCrit) { this.dmg *= 2; this.r += 2; this.color = '#fff'; }
        this.trail = [];
    }
    update() {
        if (frames % 2 === 0) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 10) this.trail.shift();
        }

        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > container.width) { this.vx *= -1; this.x += this.vx; }
        if (this.y < 0) { this.vy *= -1; this.y += this.vy; }
        if (this.y > container.height) this.active = false;
        if (this.vy > 0 && player && this.x > player.x && this.x < player.x + player.w && this.y > player.y && this.y < player.y + player.h) {
            this.y = player.y - this.r - 2; this.vy *= -1;
            this.vx += player.vx * 0.4;
            const s = Math.hypot(this.vx, this.vy);
            if (s > 20) { this.vx = (this.vx / s) * 20; this.vy = (this.vy / s) * 20; }
            Audio.play('shoot');
        }
    }
    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.trail.length > 1) {
            ctx.lineCap = 'round';
            for (let i = 0; i < this.trail.length - 1; i++) {
                const p1 = this.trail[i];
                const p2 = this.trail[i + 1];
                const ratio = i / this.trail.length;
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = ratio * 0.4;
                ctx.lineWidth = 1 + (ratio * this.r * 1.5);
                ctx.stroke();
            }
        }

        ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor(boss = false, x = null, y = null, type = 0) {
        this.boss = boss;
        this.type = type; // If boss: 0=Construct, 1=Swarmer, 2=Siege, 3=Vortex, 4=Dynamo, 5=Shade

        this.w = boss ? 120 : 40; this.h = boss ? 120 : 40; // Standardize boss size slightly
        if (this.boss && this.type === 2) { this.w = 160; this.h = 140; } // Siege is big
        if (this.boss && this.type === 5) { this.w = 80; this.h = 80; } // Shade is small

        this.x = x !== null ? x : Math.random() * (container.width - this.w);
        this.y = y !== null ? y : -250;

        // HP Scaling
        let baseBossHp = 1500; // Increased base for durability
        if (this.type === 1) baseBossHp = 1200; // Swarmer less hp
        if (this.type === 2) baseBossHp = 2500; // Siege tanky
        if (this.type === 5) baseBossHp = 800; // Shade squishy

        this.hp = (boss ? baseBossHp : 30) * (1 + wave * 0.15);
        this.maxHp = this.hp;
        this.active = true;

        // Colors
        if (boss) {
            const colors = ['#f00', '#00ff88', '#4444ff', '#9900ff', '#ffff00', '#aaffff'];
            this.color = colors[this.type % colors.length];
        } else {
            this.color = `hsl(${Math.random() * 60 + 180}, 100%, 60%)`;
        }

        this.speed = (0.5 + Math.random()) * 0.8;
        if (player && player.mods.timeSlow) this.speed *= 0.7;

        // Custom stats for minions
        if (!boss) {
            if (this.type === 4) { this.speed *= 1.2; this.hp *= 0.8; } // Seeker
            if (this.type === 5) { this.dashTimer = 0; this.speed = 0.5; } // Dasher
            if (this.type === 6) { this.startX = this.x; this.age = 0; } // Orbiter
            if (this.type === 7) { this.hp *= 2.5; this.speed *= 0.4; this.w = 50; this.h = 50; } // Tank
        } else {
            // Boss specific init
            this.attackFrame = 0;
            this.flash = 0;
            this.state = 0; // For multi-phase patterns
            this.subTimer = 0;
            if (this.type === 4) { this.tx = this.x; this.ty = 80; } // Dynamo target
        }
    }

    update() {
        const speedMod = player && player.mods.timeSlow ? (1.0 / (1 + player.mods.timeSlow * 0.5)) : 1;

        if (this.boss) {
            // General Boss Movement (Entrance)
            if (this.y < 80) this.y += this.speed * speedMod;

            // Construct (Type 0): Bullet Hell
            if (this.type === 0) {
                this.attackFrame++;
                const cx = this.x + this.w / 2;
                const cy = this.y + this.h / 2;
                const cycle = this.attackFrame % 360;

                if (cycle < 120 && cycle % 8 === 0) {
                    const angle = cycle * 0.1;
                    entities.projectiles.push({ x: cx, y: cy, vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, active: true, color: '#f00', r: 4 });
                    entities.projectiles.push({ x: cx, y: cy, vx: Math.cos(angle + Math.PI) * 4, vy: Math.sin(angle + Math.PI) * 4, active: true, color: '#f00', r: 4 });
                }
                if (cycle === 180 || cycle === 210) {
                    const baseAngle = Math.atan2(player.y - cy, (player.x + player.w / 2) - cx);
                    for (let i = -2; i <= 2; i++) {
                        const a = baseAngle + (i * 0.2);
                        entities.projectiles.push({ x: cx, y: cy, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, active: true, color: '#ffaa00', r: 6 });
                    }
                    Audio.play('shoot');
                }
                if (cycle === 300) {
                    for (let i = 0; i < 16; i++) {
                        const a = (Math.PI * 2 / 16) * i;
                        entities.projectiles.push({ x: cx, y: cy, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, active: true, color: '#ff0000', r: 8 });
                    }
                    uiShake(5); Audio.play('boss_warn');
                }
            }
            // Swarmer (Type 1): Minions
            else if (this.type === 1) {
                this.attackFrame++;
                const cx = this.x + this.w / 2;
                const cy = this.y + this.h / 2;

                // Spawn Minions
                if (this.attackFrame % 180 === 0) {
                    entities.enemies.push(new Enemy(false, cx, cy, 4)); // Seeker
                    if (Math.random() > 0.5) entities.enemies.push(new Enemy(false, cx, cy, 1)); // Basic
                    Audio.play('boss_warn', 1.5);
                }
                // Chaos Spray
                if (this.attackFrame % 10 === 0) {
                    const a = Math.random() * Math.PI; // Downward cone
                    entities.projectiles.push({ x: cx, y: cy + 30, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, active: true, color: '#0f8', r: 3 });
                }
            }
            // Siege (Type 2): Beam & Missiles
            else if (this.type === 2) {
                this.attackFrame++;
                const cx = this.x + this.w / 2;
                const cy = this.y + this.h;

                // Tracking Missile
                if (this.attackFrame % 240 === 0) {
                    const m = { x: cx, y: cy, vx: 0, vy: 2, active: true, color: '#44f', r: 12, homing: true, hp: 30 };
                    // Homing logic needs projectile update support, simplified here as slow mover
                    m.update = function () {
                        const ang = Math.atan2(player.y - this.y, player.x - this.x);
                        this.vx += Math.cos(ang) * 0.1; this.vy += Math.sin(ang) * 0.1;
                        // Drag
                        this.vx *= 0.98; this.vy *= 0.98;
                    };
                    entities.projectiles.push(m);
                    Audio.play('shoot', 0.5);
                }

                // Wall Sweep
                if (this.attackFrame % 120 === 60) {
                    for (let i = 0; i < container.width; i += 60) {
                        entities.projectiles.push({ x: i, y: -50, vx: 0, vy: 4, active: true, color: '#88f', r: 8 });
                    }
                }
            }
            // Vortex (Type 3): Gravity
            else if (this.type === 3) {
                this.attackFrame++;
                const cx = this.x + this.w / 2;
                const cy = this.y + this.h / 2;

                // Gravity Pull
                if (this.attackFrame % 300 > 200) {
                    // Pull player
                    const dx = cx - (player.x + player.w / 2);
                    const dy = cy - (player.y + player.h / 2);
                    player.x += dx * 0.01; player.y += dy * 0.01;
                    createParticles(player.x + player.w / 2, player.y + player.h / 2, 1, '#90f', 'smoke');
                }

                // Burst
                if (this.attackFrame % 60 === 0) {
                    const angle = Math.atan2(player.y - cy, (player.x + player.w / 2) - cx);
                    entities.projectiles.push({
                        x: cx, y: cy, vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
                        active: true, color: '#90f', r: 6,
                        curve: (Math.random() - 0.5) * 0.5 // Curving projectile
                    });
                }
            }
            // Dynamo (Type 4): Lightning Speed
            else if (this.type === 4) {
                this.attackFrame++;
                // Movement Dash
                this.subTimer++;
                if (this.subTimer > 120) {
                    this.subTimer = 0;
                    this.tx = Math.random() * (container.width - this.w);
                    this.ty = 50 + Math.random() * 150;
                    // Teleport effect
                    createExplosion(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 5);
                }
                this.x += (this.tx - this.x) * 0.1;
                this.y += (this.ty - this.y) * 0.1;

                // Static Discharge
                if (this.attackFrame % 40 === 0) {
                    entities.projectiles.push({ x: this.x + this.w / 2, y: this.y + this.h, vx: (Math.random() - 0.5) * 4, vy: 8, active: true, color: '#ff0', r: 5 });
                }
            }
            // Shade (Type 5): Stealth
            else if (this.type === 5) {
                this.attackFrame++;
                // Cloak
                if (this.attackFrame % 240 === 0) {
                    this.flash = -100; // Special flag for invisible
                    createParticles(this.x + this.w / 2, this.y + this.h / 2, 20, '#aff', 'smoke');
                    // Teleport
                    this.x = Math.random() * (container.width - this.w);
                }
                if (this.attackFrame % 240 === 120) {
                    this.flash = 0; // Reappear
                    createParticles(this.x + this.w / 2, this.y + this.h / 2, 20, '#aff', 'flare');
                    // Snipe
                    const cx = this.x + this.w / 2; const cy = this.y + this.h / 2;
                    const ang = Math.atan2(player.y - cy, (player.x + player.w / 2) - cx);
                    entities.projectiles.push({ x: cx, y: cy, vx: Math.cos(ang) * 15, vy: Math.sin(ang) * 15, active: true, color: '#fff', r: 5 });
                    Audio.play('shoot', 2);
                }
            }

        } else {
            // -- REGULAR MINION UPDATES --
            if (this.type === 4) { // Seeker
                this.y += this.speed * speedMod;
                if (player) {
                    const center = this.x + this.w / 2;
                    const pCenter = player.x + player.w / 2;
                    if (center < pCenter - 10) this.x += 1 * speedMod;
                    else if (center > pCenter + 10) this.x -= 1 * speedMod;
                }
            } else if (this.type === 5) { // Dasher
                this.dashTimer++;
                if (this.dashTimer > 120) {
                    this.y += 8 * speedMod;
                    if (this.dashTimer > 150) this.dashTimer = 0;
                } else {
                    this.y += 0.5 * speedMod;
                }
            } else if (this.type === 6) { // Orbiter
                this.age++;
                this.y += this.speed * speedMod;
                this.x = this.startX + Math.sin(this.age * 0.05) * 60;
            } else { // Standard
                this.y += this.speed * speedMod;
            }

            // Sniper Minion
            if (this.type === 2 && this.y > 0 && this.y < container.height / 2) {
                this.shootTimer--;
                if (this.shootTimer <= 0) {
                    this.shootTimer = 180;
                    let ang = Math.atan2(player.y - this.y, (player.x + player.w / 2) - (this.x + this.w / 2));
                    entities.projectiles.push({ x: this.x + this.w / 2, y: this.y + this.h, vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5, active: true });
                }
            }

            if (!this.boss && this.active && collides(this, player)) { player.hit(15); this.active = false; deathEffect(this); }
        }

        // Cleanup
        if (this.y > container.height) { this.active = false; if (!this.boss) player.hit(10); }

        // Hack for custom projectile updates within projectiles array update loop if needed, 
        // but game.js main loop handles simple physics. Specialized stuff (homing) needs attention in game.js logic or hacked here.
        // Actually game.js just does x+=vx, y+=vy. I added 'curve' to Vortex projectiles, need to handle that in game.js or just assume linear for now.
    }

    draw() {
        if (this.flash === -100) return; // Invisible Shade

        ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = this.color;

        if (this.flash > 0) {
            ctx.fillStyle = '#ffffff';
            this.flash--;
        } else {
            ctx.fillStyle = this.color;
        }

        if (this.boss) {
            // Boss Visuals
            ctx.fillRect(this.x, this.y, this.w, this.h);

            // Badge/Icon
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center'; ctx.font = 'bold 20px Orbitron';
            let icon = '⚠';
            if (this.type === 1) icon = '✥'; // Swarm
            if (this.type === 2) icon = '⛨'; // Siege
            if (this.type === 3) icon = '◎'; // Vortex
            if (this.type === 4) icon = '⚡'; // Dynamo
            if (this.type === 5) icon = '?'; // Shade
            ctx.fillText(icon, this.x + this.w / 2, this.y + this.h / 2 + 7);

            // Health Bar
            const hpP = this.hp / this.maxHp;
            ctx.fillStyle = '#300'; ctx.fillRect(this.x, this.y - 15, this.w, 10);
            ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y - 15, this.w * hpP, 10);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(this.x, this.y - 15, this.w, 10);

        } else {
            // Minion Visuals
            if (this.type === 1) { // Triangle
                ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.w, this.y); ctx.lineTo(this.x + this.w / 2, this.y + this.h); ctx.fill();
            } else if (this.type === 3) { // Box with border
                ctx.fillRect(this.x, this.y, this.w, this.h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(this.x + 5, this.y + 5, this.w - 10, this.h - 10);
            } else if (this.type === 4) { // Seeker (Diamond)
                ctx.beginPath(); ctx.moveTo(this.x + this.w / 2, this.y); ctx.lineTo(this.x + this.w, this.y + this.h / 2); ctx.lineTo(this.x + this.w / 2, this.y + this.h); ctx.lineTo(this.x, this.y + this.h / 2); ctx.fill();
            } else if (this.type === 5) { // Dasher (Arrow/Chevron)
                ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.w, this.y); ctx.lineTo(this.x + this.w / 2, this.y + this.h); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(this.x + 10, this.y); ctx.lineTo(this.x + this.w - 10, this.y); ctx.lineTo(this.x + this.w / 2, this.y + this.h - 10); ctx.fill();
            } else if (this.type === 6) { // Orbiter (Circle)
                ctx.beginPath(); ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 3, 0, Math.PI * 2); ctx.stroke();
            } else if (this.type === 7) { // Tank (Solid Hexagon-ish or Heavy Box)
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.fillStyle = '#000'; ctx.fillRect(this.x + 10, this.y + 10, this.w - 20, this.h - 20);
                ctx.fillStyle = this.color; ctx.fillRect(this.x + 15, this.y + 15, this.w - 30, this.h - 30);
            } else { // Default (0, 2)
                ctx.fillRect(this.x, this.y, this.w, this.h);
            }

            // Minion HP Bar (small)
            if (this.hp < this.maxHp) { ctx.fillStyle = '#300'; ctx.fillRect(this.x, this.y - 6, this.w, 4); ctx.fillStyle = '#f00'; ctx.fillRect(this.x, this.y - 6, this.w * (this.hp / this.maxHp), 4); }
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }
    hit(dmg, mods = {}) {
        this.flash = 4;
        if (mods.execute && this.hp < this.maxHp * 0.2 && !this.boss) dmg = this.hp + 1;
        this.hp -= dmg;
        addFloatingText(Math.floor(dmg), this.x + this.w / 2, this.y, '#fff');
        createHitEffect(this.x + this.w / 2, this.y + this.h / 2, this.color);
        if (this.hp <= 0) {
            this.active = false; deathEffect(this); score += 10; shards++; gainXp(15); addCombo(); Audio.play('hit');
            if (player.mods.vamp > 0 && Math.random() < (0.1 * player.mods.vamp)) player.hp = Math.min(player.maxHp, player.hp + 2);

            // Logic For Chain Lightning
            if (player.mods.chain > 0 && !mods.isChain) {
                chainLightning(this, dmg);
            }

            if (mods.explosive > 0) triggerNuclearExplosion(this, dmg);
            if (this.boss) { boss = null; wave++; document.getElementById('boss-warning').style.opacity = 0; triggerWarp(); hitStop = 20; }
            else hitStop = 3;
        }
    }
}

class Hazard {
    constructor() {
        this.r = 20 + Math.random() * 30;
        this.x = Math.random() * container.width;
        this.y = -this.r * 2;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = 1 + Math.random() * 2;
        this.active = true;
        this.angle = 0;
        this.spin = (Math.random() - 0.5) * 0.1;
        this.hp = 50;
        this.flash = 0;

        // Jagged Geometry Generation
        this.points = [];
        const numPoints = 8 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numPoints; i++) {
            const angle = (Math.PI * 2 * i) / numPoints;
            const rMod = 0.8 + Math.random() * 0.4; // 80% to 120% radius
            this.points.push({ x: Math.cos(angle) * this.r * rMod, y: Math.sin(angle) * this.r * rMod });
        }
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.angle += this.spin;
        if (this.y > container.height + 100) this.active = false;
        if (collides({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, player)) {
            player.hit(20); this.active = false; createParticles(this.x, this.y, 10, '#aaa');
        }
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);

        if (this.flash > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ffffff';
            this.flash--;
        } else {
            // Rock Gradient
            const g = ctx.createRadialGradient(-this.r * 0.3, -this.r * 0.3, this.r * 0.1, 0, 0, this.r);
            g.addColorStop(0, '#777');
            g.addColorStop(1, '#333');
            ctx.fillStyle = g;
            ctx.strokeStyle = '#555';
        }

        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.points && this.points.length) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
        } else {
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctx.lineTo(Math.cos(a) * this.r, Math.sin(a) * this.r);
            }
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Internal Detail (Craters/Ridges)
        if (this.flash === 0) {
            ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(this.r * 0.2, this.r * 0.2); ctx.lineTo(-this.r * 0.1, this.r * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.arc(-this.r * 0.3, -this.r * 0.3, this.r * 0.15, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.restore();
    }
    hit(dmg) {
        this.flash = 4;
        this.hp -= dmg;
        createHitEffect(this.x, this.y, '#aaa');
        if (this.hp <= 0) {
            this.active = false;
            createExplosion(this.x, this.y, '#aaa', 15);
            Audio.play('explode');
        }
    }
}

class Particle {
    constructor(x, y, c, type = 'debris') {
        this.x = x; this.y = y; this.c = c; this.type = type;
        const angle = Math.random() * Math.PI * 2;
        this.gravity = 0; this.friction = 0.95;

        if (type === 'spark') {
            const speed = Math.random() * 12 + 8;
            this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
            this.life = 0.6 + Math.random() * 0.4;
            this.decay = 0.02 + Math.random() * 0.03;
            this.gravity = 0.25;
            this.r = 2;
        } else if (type === 'flare') {
            this.vx = 0; this.vy = 0;
            this.life = 1.0; this.decay = 0.2; // Fast decay
            this.r = 10; this.maxR = 50;
            this.rotation = Math.random() * Math.PI;
        } else if (type === 'ring') {
            this.vx = 0; this.vy = 0;
            this.life = 1.0; this.decay = 0.08;
            this.r = 5; this.maxR = 60;
        } else if (type === 'impact') {
            this.vx = 0; this.vy = 0;
            this.life = 1.0; this.decay = 0.15;
            this.r = 1; this.maxR = 30;
            this.c = '#fff';
        } else if (type === 'smoke') {
            const speed = Math.random() * 2 + 0.5;
            this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed - 1;
            this.life = 1.0; this.decay = 0.015;
            this.r = 10 + Math.random() * 10;
        } else { // debris
            const speed = Math.random() * 6 + 2;
            this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
            this.life = 1.0; this.decay = Math.random() * 0.03 + 0.02;
            this.r = 4;
            this.rotation = Math.random() * Math.PI;
            this.rotSpeed = (Math.random() - 0.5) * 0.2;
        }
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= this.friction; this.vy *= this.friction;
        this.life -= this.decay;

        if (this.type === 'impact' || this.type === 'ring' || this.type === 'flare') {
            this.r += (this.maxR - this.r) * 0.2;
        } else if (this.type === 'smoke') {
            this.r += 0.1;
        } else if (this.type === 'debris') {
            this.rotation += this.rotSpeed;
            this.r *= 0.98;
        } else {
            this.r *= 0.95;
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        if (this.type !== 'smoke') ctx.globalCompositeOperation = 'lighter'; // Additive blending for neon look

        if (this.type === 'spark') {
            // Core hot white line
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx, this.y - this.vy);
            ctx.stroke();

            // Outer colored glow
            ctx.shadowBlur = 10; ctx.shadowColor = this.c;
            ctx.lineWidth = 3;
            ctx.strokeStyle = this.c;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 1.5, this.y - this.vy * 1.5);
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (this.type === 'flare') {
            // Lens flare shape
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.c;
            ctx.shadowBlur = 20; ctx.shadowColor = this.c;

            // Horizontal
            ctx.beginPath();
            ctx.ellipse(0, 0, this.r * 2, this.r * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Vertical
            ctx.beginPath();
            ctx.ellipse(0, 0, this.r * 0.2, this.r * 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
        } else if (this.type === 'ring') {
            ctx.strokeStyle = this.c;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
        } else if (this.type === 'impact') {
            ctx.shadowBlur = 30; ctx.shadowColor = this.c;
            ctx.fillStyle = this.c;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        } else if (this.type === 'debris') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.c;
            ctx.fillRect(-this.r / 2, -this.r / 2, this.r, this.r);
        } else {
            ctx.fillStyle = this.c;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class Drone {
    constructor() {
        this.x = player.x; this.y = player.y;
        this.angle = 0; this.target = null;
        this.lastShot = 0;
    }
    update() {
        // Follow player
        const destX = player.x + (player.w / 2) + Math.cos(frames * 0.05) * 60;
        const destY = player.y + Math.sin(frames * 0.05) * 20 - 20;
        this.x += (destX - this.x) * 0.1;
        this.y += (destY - this.y) * 0.1;

        // Shoot
        if (frames - this.lastShot > 60) {
            let closest = null; let minDist = 400;
            entities.enemies.forEach(e => {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < minDist) { minDist = d; closest = e; }
            });
            if (closest) {
                const ang = Math.atan2(closest.y - this.y, closest.x - this.x);
                // Drone shoots reduced damage balls
                entities.balls.push(new Ball(this.x, this.y, ang, 5, '#0ff', true));
                this.lastShot = frames;
            }
        }
        return { x: this.x, y: this.y };
    }
}
