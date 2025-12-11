
/** AUDIO ENGINE */
const Audio = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    masterGain: null,
    init: function () {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (!this.masterGain) {
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.startDrone();
        }
    },
    startDrone: function () {
        const bgOsc = this.ctx.createOscillator();
        bgOsc.type = 'sawtooth';
        bgOsc.frequency.value = 50;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 100;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        const bgGain = this.ctx.createGain();
        bgGain.gain.value = 0.05;
        bgOsc.connect(filter);
        filter.connect(bgGain);
        bgGain.connect(this.masterGain);
        bgOsc.start();
        lfo.start();
    },
    play: function (type, pitch = 1) {
        if (this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        const now = this.ctx.currentTime;
        if (type === 'shoot') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(400 * pitch, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now); osc.stop(now + 0.15);
        } else if (type === 'hit') {
            osc.type = 'square'; osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'powerup') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.3);
            gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'boss_warn') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
            gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0, now + 1);
            osc.start(now); osc.stop(now + 1);
        }
    }
};

/** ENGINE SETUP */
const container = document.getElementById('gameCanvas');
const ctx = container.getContext('2d');
let bounds = container.getBoundingClientRect();

function resize() {
    const parent = document.getElementById('game-container');
    bounds = parent.getBoundingClientRect();
    container.width = bounds.width;
    container.height = bounds.height;
    if (player) player.y = container.height - 100;
}
window.addEventListener('resize', resize);

/** STATE */
let gameState = 'MENU';
let frames = 0, score = 0, shards = 0, wave = 0, combo = 0, comboTimer = 0;
let xp = 0, level = 1, nextXp = 100;
let player, boss;
let entities = { balls: [], enemies: [], particles: [], text: [], powerups: [], drones: [], blackholes: [], hazards: [], stars: [], clouds: [], projectiles: [] };
let input = { x: 0, aimX: 0, aimY: 0, active: false, type: 'none' };
let formationQueue = [], spawnTimer = 0;
let touchState = { sliderX: null, joyStart: null, joyCurr: null, leftId: null, rightId: null };
let maxZoneReached = 0;
let maxWaveReached = 0;
let bgOffset = 0;
let currentZone = 0;
let warpSpeed = 0;
let shake = 0;
let hitStop = 0;

// -- SETTINGS & PERSISTENCE --
let settings = {
    volume: 1.0,
    shake: true,
    particles: 'HIGH'
};

function saveGame() {
    const data = {
        maxWave: maxWaveReached,
        settings: settings
    };
    localStorage.setItem('neonbreaker_save', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('neonbreaker_save');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.maxWave) maxWaveReached = data.maxWave;
            if (data.settings) {
                settings = { ...settings, ...data.settings };
                applySettings();
            }
        } catch (e) { console.error("Save load error", e); }
    }
}

function applySettings() {
    if (Audio.masterGain) Audio.masterGain.gain.value = settings.volume * 0.3;
}

function openOptions() {
    document.getElementById('class-screen').classList.remove('active');
    document.getElementById('options-screen').classList.add('active');

    // UI Sync
    document.getElementById('opt-volume').value = settings.volume;
    document.getElementById('vol-display').innerText = Math.round(settings.volume * 100) + "%";

    updateToggleUI('opt-shake', settings.shake);
    updateToggleUI('opt-particles', settings.particles === 'HIGH');
    document.getElementById('opt-particles').innerText = settings.particles;
}

function closeOptions() {
    document.getElementById('options-screen').classList.remove('active');
    document.getElementById('class-screen').classList.add('active');
    saveGame();
}

function toggleShake() {
    settings.shake = !settings.shake;
    updateToggleUI('opt-shake', settings.shake);
}

function toggleParticles() {
    settings.particles = settings.particles === 'HIGH' ? 'LOW' : 'HIGH';
    document.getElementById('opt-particles').innerText = settings.particles;
    updateToggleUI('opt-particles', settings.particles === 'HIGH');
}

function updateToggleUI(id, isActive) {
    const el = document.getElementById(id);
    if (isActive) {
        el.innerText = id === 'opt-shake' ? 'ON' : 'HIGH';
        el.classList.remove('opt-off');
    } else {
        el.innerText = id === 'opt-shake' ? 'OFF' : 'LOW';
        el.classList.add('opt-off');
    }
}

function resetData() {
    if (confirm("WIPE ALL DATA? THIS CANNOT BE UNDONE.")) {
        localStorage.removeItem('neonbreaker_save');
        location.reload();
    }
}

// Volume Slider Listener
setTimeout(() => {
    const vSlider = document.getElementById('opt-volume');
    if (vSlider) {
        vSlider.oninput = function () {
            settings.volume = parseFloat(this.value);
            document.getElementById('vol-display').innerText = Math.round(settings.volume * 100) + "%";
            applySettings();
        };
    }
}, 500);

// -- END SETTINGS --

function uiShake(amt) {
    if (settings.shake) shake = Math.max(shake, amt);
}

function initBackground() {
    entities.stars = [];
    entities.clouds = [];
    for (let i = 0; i < 80; i++) entities.stars.push(new Star());
    for (let i = 0; i < 5; i++) entities.clouds.push(new NebulaCloud());
    loadGame(); // Load save data
}

function updateBackground() {
    if (gameState === 'WARP') warpSpeed = Math.min(warpSpeed + 1, 40); else warpSpeed = Math.max(warpSpeed - 2, 0);
    entities.clouds.forEach(c => { c.update(); c.draw(); });
    entities.stars.forEach(s => { s.update(); s.draw(); });

    if (gameState !== 'WARP') {
        ctx.strokeStyle = ZONES[currentZone % ZONES.length].color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.03;
        const off = (frames * 0.5) % 50;
        for (let i = 0; i <= container.width; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, container.height); ctx.stroke(); }
        for (let i = off; i < container.height; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(container.width, i); ctx.stroke(); }
        ctx.globalAlpha = 1;
    }
}

/** INPUT HANDLING */
function mapInput(e, touch) {
    const rect = container.getBoundingClientRect();
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    return {
        x: (x - rect.left) * (container.width / rect.width),
        y: (y - rect.top) * (container.height / rect.height)
    };
}

window.addEventListener('mousedown', () => input.type = 'mouse');
window.addEventListener('mousemove', e => { const p = mapInput(e); input.aimX = p.x; input.aimY = p.y; });

// Robust Touch Logic
window.addEventListener('touchstart', e => {
    // 1. Always try to resume audio context on first physical interaction
    if (Audio.ctx.state === 'suspended') Audio.init();

    // 2. If we are in the MENU or SHOP, let the event propagate so 'click' handlers work
    if (gameState !== 'PLAYING' && gameState !== 'WARP') return;

    // 3. Only prevent default behavior during gameplay to stop scrolling/zooming
    if (!e.target.closest('#game-container')) return;
    e.preventDefault();
    input.type = 'touch';
    document.getElementById('mobile-controls-hint').style.opacity = 0;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const pos = mapInput(e, t);

        // Bottom Area check for initial grab
        if (pos.y > container.height * 0.6) {
            if (pos.x < container.width / 2 && touchState.leftId === null) {
                touchState.leftId = t.identifier;
                touchState.sliderX = pos.x;
            } else if (touchState.rightId === null) {
                touchState.rightId = t.identifier;
                touchState.joyStart = { x: pos.x, y: pos.y };
                touchState.joyCurr = { x: pos.x, y: pos.y };
            }
        }
    }
}, { passive: false });

window.addEventListener('touchmove', e => {
    if (gameState !== 'PLAYING' && gameState !== 'WARP') return;
    if (!input.type === 'touch') return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const pos = mapInput(e, t);

        if (t.identifier === touchState.leftId) {
            touchState.sliderX = pos.x;
        }
        if (t.identifier === touchState.rightId) {
            touchState.joyCurr = { x: pos.x, y: pos.y };
        }
    }
}, { passive: false });

function handleTouchEndOrCancel(e) {
    if (gameState !== 'PLAYING' && gameState !== 'WARP') return;
    e.preventDefault();

    // Check active touches to clean up state
    let leftStillActive = false;
    let rightStillActive = false;

    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === touchState.leftId) leftStillActive = true;
        if (t.identifier === touchState.rightId) rightStillActive = true;
    }

    if (!leftStillActive) {
        touchState.leftId = null;
        touchState.sliderX = null;
    }

    if (!rightStillActive) {
        touchState.rightId = null;
        touchState.joyStart = null;
        touchState.joyCurr = null;
    }
}

window.addEventListener('touchend', handleTouchEndOrCancel);
window.addEventListener('touchcancel', handleTouchEndOrCancel);

const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

/** GAME LOGIC */
function addDrone() { entities.drones.push(new Drone()); }
function addBlackHole() { entities.blackholes.push({ x: container.width / 2, y: container.height / 2, life: 400 }); }

function startGame(clsName) {
    player = new Player(CLASSES[clsName]);
    gameState = 'PLAYING';
    entities = { balls: [], enemies: [], particles: [], text: [], powerups: [], drones: [], blackholes: [], hazards: [], stars: [], clouds: [], projectiles: [] };
    initBackground();
    // Reset ALL game state
    score = 0; wave = 0; xp = 0; level = 1; currentZone = 0;
    frames = 0; shards = 0; combo = 0; comboTimer = 0;
    boss = null;
    warpSpeed = 0; shake = 0; hitStop = 0;
    // Clean inputs
    touchState = { sliderX: null, joyStart: null, joyCurr: null, leftId: null, rightId: null };
    for (let k in keys) keys[k] = false;

    formationQueue = [];
    document.querySelectorAll('.overlay-screen').forEach(el => el.classList.remove('active'));
    Audio.init();
    resize();
    startNextWave();
    // loop() removed from here to prevent stacking
}

function triggerWarp() {
    gameState = 'WARP';
    setTimeout(() => {
        currentZone = Math.min(ZONES.length - 1, Math.floor(wave / 5));
        if (currentZone > maxZoneReached) maxZoneReached = currentZone;
        gameState = 'PLAYING';
        const t = document.getElementById('wave-title');
        if (t) t.innerText = "ZONE " + (currentZone + 1);
        const n = document.getElementById('wave-notification');
        if (n) { n.style.opacity = 1; setTimeout(() => n.style.opacity = 0, 2000); }
        startNextWave(); // Ensure next wave starts after warp
    }, 2000);
}

function startBoss() {
    // Cycle through 6 boss types: 0=Construct, 1=Swarmer, 2=Siege, 3=Vortex, 4=Dynamo, 5=Shade
    const bossType = (Math.floor(wave / 5) - 1) % 6;

    // Safety check if Math returns negative modulo (handled by JS usually but good to be safe) or 0 index confusion
    const safeType = Math.max(0, bossType);

    boss = new Enemy(true, null, null, safeType);
    entities.enemies.push(boss);

    uiShake(20);
    document.getElementById('boss-warning').style.opacity = 1;
    Audio.play('boss_warn');

    // Optional: Set specific Boss Name notification if desired
    const names = ["THE CONSTRUCT", "THE SWARMER", "SIEGE UNIT", "VORTEX CORE", "DYNAMO", "THE SHADE"];
    // Not implemented in UI yet, but logic is ready

    setTimeout(() => document.getElementById('boss-warning').style.opacity = 0, 3000);
}

function spawnLogic() {
    if (boss || gameState === 'WARP') return;

    if (formationQueue.length > 0) {
        if (frames % 15 === 0) {
            let data = formationQueue.shift();
            entities.enemies.push(new Enemy(false, data.x, data.y, data.type));
        }
        return;
    }

    if (entities.enemies.length === 0) {
        startNextWave();
    }

    if (Math.random() < 0.005) entities.hazards.push(new Hazard());
}

function startNextWave() {
    wave++;

    const title = document.getElementById('wave-title');
    const notif = document.getElementById('wave-notification');
    if (title) title.innerText = "WAVE " + wave;
    if (notif) { notif.style.opacity = 1; setTimeout(() => notif.style.opacity = 0, 2000); }

    if (wave > maxWaveReached) maxWaveReached = wave;

    if (wave % 5 === 0) {
        startBoss();
    } else {
        generateFormation();
    }
}

function generateFormation() {
    const pattern = Math.floor(Math.random() * 5); // Increased patterns
    const cx = container.width / 2;
    // Enemy Pool based on wave:
    // Wave 1+: 0, 1
    // Wave 2+: 4 (Seeker)
    // Wave 3+: 5 (Dasher)
    // Wave 4+: 2 (Sniper - already handled elsewhere actually? No, sniper logic is in update, but type 2 needs to be spawned)
    // Wave 5+: 6 (Orbiter)
    // Wave 6+: 7 (Tank)

    let availableTypes = [0, 1];
    if (wave >= 2) availableTypes.push(4);
    if (wave >= 3) availableTypes.push(5);
    if (wave >= 4) availableTypes.push(2);
    if (wave >= 5) availableTypes.push(6);
    if (wave >= 6) availableTypes.push(7);

    for (let i = 0; i < 5 + wave; i++) {
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

        if (pattern === 0) { // V-Shape
            formationQueue.push({ x: cx - 100 + (i % 5) * 50, y: -50 - Math.floor(i / 5) * 50, type: type });
        }
        else if (pattern === 1) { // Random Rain
            formationQueue.push({ x: Math.random() * (container.width - 50), y: -50 - i * 60, type: type });
        }
        else if (pattern === 2) { // Line
            formationQueue.push({ x: (i % 6) * (container.width / 6), y: -50 - Math.floor(i / 6) * 60, type: type });
        }
        else if (pattern === 3) { // Alternating
            const x = i % 2 === 0 ? container.width * 0.2 : container.width * 0.8;
            formationQueue.push({ x: x, y: -50 - i * 40, type: type });
        }
        else { // Center Rush
            formationQueue.push({ x: cx - 20 + (Math.random() - 0.5) * 40, y: -50 - i * 50, type: type });
        }
    }
}

function gainXp(amt) {
    xp += amt;
    const req = 100 * Math.pow(1.2, level - 1);
    if (xp >= req) { xp -= req; level++; gameState = 'LEVELUP'; showLevelScreen(); }
    updateHud();
}

function showLevelScreen() {
    const el = document.getElementById('perk-container');
    el.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const p = PERKS[Math.floor(Math.random() * PERKS.length)];
        const btn = document.createElement('div');
        btn.className = `card-btn rarity-${p.rarity.id}`;
        btn.innerHTML = `<div class="text-3xl mb-1">${p.icon}</div><div class="font-bold text-sm">${p.name}</div><div class="rarity-badge" style="color:${p.rarity.color}">${p.rarity.id}</div><div class="text-xs text-gray-400">${p.desc}</div>`;
        btn.onclick = () => { p.apply(player); gameState = 'PLAYING'; document.getElementById('levelup-screen').classList.remove('active'); };
        el.appendChild(btn);
    }
    document.getElementById('levelup-screen').classList.add('active');
}

function updateHud() {
    document.getElementById('score-display').innerText = score;
    document.getElementById('hp-bar').style.width = (player.hp / player.maxHp) * 100 + '%';
    document.getElementById('hp-text').innerText = Math.ceil(player.hp) + '/' + Math.floor(player.maxHp);
    document.getElementById('xp-bar').style.width = (xp / (100 * Math.pow(1.2, level - 1))) * 100 + '%';
    document.getElementById('level-display').innerText = "LVL " + level;
}

function chainLightning(source, damage) {
    const candidates = entities.enemies.filter(e => e.active && e !== source && !e.boss);
    candidates.forEach(e => e._dist = Math.hypot(e.x - source.x, e.y - source.y));
    const targets = candidates.filter(e => e._dist < 250).sort((a, b) => a._dist - b._dist).slice(0, 3 + (source.player ? source.player.mods.chain : (player.mods.chain || 1)));

    targets.forEach(t => {
        entities.particles.push({
            life: 10, type: 'bolt',
            sx: source.x + source.w / 2, sy: source.y + source.h / 2,
            tx: t.x + t.w / 2, ty: t.y + t.h / 2,
            draw: function () {
                if (this.life <= 0) return;
                ctx.save();
                ctx.strokeStyle = `rgba(0, 255, 255, ${this.life / 10})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.sx, this.sy);
                const mx = (this.sx + this.tx) / 2 + (Math.random() - 0.5) * 20;
                const my = (this.sy + this.ty) / 2 + (Math.random() - 0.5) * 20;
                ctx.lineTo(mx, my);
                ctx.lineTo(this.tx, this.ty);
                ctx.stroke();
                ctx.restore();
                this.life--;
            },
            update: function () { }
        });
        createParticles(t.x + t.w / 2, t.y + t.h / 2, 5, '#0ff', 'spark');
        t.hit(damage * 0.5, { isChain: true });
    });
}

function createParticles(x, y, count, c, type = 'debris') {
    for (let i = 0; i < count; i++) entities.particles.push(new Particle(x, y, c, type));
}

function createExplosion(x, y, c, scale = 10) {
    if (scale >= 15) uiShake(scale * 0.3); // Screen shake on big explosions

    // Impact Flash
    entities.particles.push(new Particle(x, y, '#fff', 'impact'));
    if (scale > 10) entities.particles.push(new Particle(x, y, c || '#fff', 'flare'));
    entities.particles.push(new Particle(x, y, c || '#fff', 'ring'));

    // Sparks (high velocity)
    for (let i = 0; i < scale * 2; i++) entities.particles.push(new Particle(x, y, c || '#fff', 'spark'));
    // Smoke
    for (let i = 0; i < scale / 2; i++) entities.particles.push(new Particle(x, y, 'rgba(100,100,100,0.5)', 'smoke'));
    // Debris
    if (c) for (let i = 0; i < scale / 2; i++) entities.particles.push(new Particle(x, y, c, 'debris'));
}

function createHitEffect(x, y, c) {
    entities.particles.push(new Particle(x, y, '#fff', 'impact'));
    entities.particles.push(new Particle(x, y, c || '#fff', 'flare'));
    for (let i = 0; i < 4; i++) entities.particles.push(new Particle(x, y, c || '#fff', 'spark'));
}

function createShockwave(x, y, c, r = 30) {
    entities.particles.push({ x: x, y: y, life: 1, type: 'shock', r: 10, maxR: r, c: c, update: function () { this.r += this.maxR / 20; this.life -= 0.05; }, draw: function () { ctx.globalAlpha = Math.max(0, this.life); ctx.strokeStyle = this.c; ctx.lineWidth = 4 * this.life; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; } });
}

function triggerNuclearExplosion(source, damage) {
    uiShake(10 + (source.mods ? source.mods.explosive * 2 : 0));

    const cx = source.x + source.w / 2;
    const cy = source.y + source.h / 2;
    const scale = 1 + (source.mods ? source.mods.explosive * 0.2 : 0);

    // 1. Shockwave (Orange)
    createShockwave(cx, cy, '#ff8800', 150 * scale);

    // 2. Bright Central Flare
    entities.particles.push(new Particle(cx, cy, '#ffcc00', 'flare'));

    // 3. Expanding Rings (Orange & Red)
    entities.particles.push(new Particle(cx, cy, '#ff4400', 'ring'));
    entities.particles.push(new Particle(cx, cy, '#ff8800', 'ring'));

    // 4. Kinetic Sparks instead of Smoke (High velocity, short life)
    for (let i = 0; i < 30 * scale; i++) {
        const c = Math.random() > 0.5 ? '#ffaa00' : '#ffff00';
        entities.particles.push(new Particle(cx, cy, c, 'spark'));
    }

    // 5. Debris for impact feel
    for (let i = 0; i < 15 * scale; i++) {
        entities.particles.push(new Particle(cx, cy, '#884400', 'debris'));
    }

    const targets = entities.enemies.filter(e => e.active && e !== source);
    targets.forEach(e => {
        const dist = Math.hypot((e.x + e.w / 2) - cx, (e.y + e.h / 2) - cy);
        if (dist < 150 + (source.mods ? source.mods.explosive * 25 : 0)) {
            e.hit(damage * (0.5 + (source.mods ? source.mods.explosive * 0.2 : 0)), { explosion: true });
        }
    });
}

function deathEffect(e) {
    createShockwave(e.x + e.w / 2, e.y + e.h / 2, e.color, 50);
    createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 15);
}
function addCombo() { combo++; comboTimer = 180; const el = document.getElementById('combo-display'); el.innerText = `${combo}x COMBO`; el.style.opacity = 1; }
function collides(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function drawTouchControls() {
    if (input.type !== 'touch') return;
    const y = container.height - 60;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(container.width / 2 - 20, y); ctx.stroke();
    if (touchState.sliderX !== null) {
        ctx.fillStyle = '#0ff'; ctx.shadowBlur = 10; ctx.shadowColor = 'cyan';
        ctx.beginPath(); ctx.arc(touchState.sliderX, y, 15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    if (touchState.joyStart) {
        ctx.strokeStyle = 'rgba(255,0,255,0.3)'; ctx.beginPath(); ctx.arc(touchState.joyStart.x, touchState.joyStart.y, 40, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,0,255,0.5)'; ctx.beginPath(); ctx.arc(touchState.joyCurr.x, touchState.joyCurr.y, 20, 0, Math.PI * 2); ctx.fill();
    }
}

function loop() {
    requestAnimationFrame(loop);
    if (gameState !== 'PLAYING' && gameState !== 'WARP') return;
    frames++;

    if (hitStop > 0) {
        hitStop--;
        ctx.save();
        ctx.translate(Math.random() * 2 - 1, Math.random() * 2 - 1);
        player.draw();
        entities.enemies.forEach(e => e.draw());
        entities.balls.forEach(b => b.draw());
        entities.particles.forEach(p => { if (p.draw) p.draw(); });
        ctx.restore();
        return;
    }

    if (combo > 0) {
        comboTimer--;
        if (comboTimer <= 0) { combo = 0; document.getElementById('combo-display').style.opacity = 0; }
    }

    let sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; shake *= 0.9; }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = '#020202'; ctx.fillRect(0, 0, container.width, container.height);

    updateBackground();

    if (player && gameState !== 'WARP') { player.update(); player.draw(); }

    entities.drones.forEach(d => {
        const pos = d.update();
        ctx.shadowBlur = 10; ctx.shadowColor = '#0ff'; ctx.fillStyle = '#0ff'; ctx.fillRect(pos.x - 3, pos.y - 3, 6, 6); ctx.shadowBlur = 0;
    });

    entities.blackholes.forEach(bh => {
        bh.life--;
        ctx.fillStyle = 'rgba(100,0,255,0.2)'; ctx.beginPath(); ctx.arc(bh.x, bh.y, 60, 0, Math.PI * 2); ctx.fill();
        entities.enemies.forEach(e => { if (e.active) { e.x += (bh.x - e.x) * 0.05; e.y += (bh.y - e.y) * 0.05; } });
    });
    entities.blackholes = entities.blackholes.filter(bh => bh.life > 0);
    entities.hazards.forEach(h => { h.update(); h.draw(); });
    entities.hazards = entities.hazards.filter(h => h.active);

    entities.balls.forEach(b => {
        b.update(); b.draw();
        if (!b.active) return;
        const ballBox = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };

        entities.enemies.forEach(e => {
            if (e.active && collides(ballBox, e)) {
                b.vy *= -1; b.y += b.vy;

                if (b.mods && b.mods.splitOnHit > 0 && b.r > 2) {
                    for (let i = 0; i < 2; i++) {
                        let angle = Math.atan2(b.vy, b.vx) + (i === 0 ? 0.5 : -0.5);
                        let speed = Math.hypot(b.vx, b.vy);
                        let nb = new Ball(b.x, b.y, angle, speed, b.color, true, 0, { ...b.mods, splitOnHit: 0 }, b.r - 1);
                        nb.dmg = b.dmg * 0.5;
                        entities.balls.push(nb);
                    }
                }

                if (b.pierceCount > 0) { b.pierceCount--; }
                else if (b.bounces > 0) { b.bounces--; }
                else { b.active = false; }
                e.hit(b.dmg, b.mods);
            }
        });

        entities.hazards.forEach(h => {
            if (h.active && collides(ballBox, { x: h.x - h.r, y: h.y - h.r, w: h.r * 2, h: h.r * 2 })) {
                b.vy *= -1; b.y += b.vy;
                h.hit(b.dmg);
            }
        });
    });
    entities.balls = entities.balls.filter(b => b.active);

    entities.enemies.forEach(e => { e.update(); e.draw(); });
    entities.enemies = entities.enemies.filter(e => e.active);

    entities.particles.forEach(p => { if (p.update) p.update(); if (p.draw) p.draw(); });
    entities.particles = entities.particles.filter(p => p.life > 0);

    entities.text.forEach(t => { t.update(); t.draw(); });
    entities.text = entities.text.filter(t => t.life > 0);

    entities.projectiles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        ctx.shadowBlur = 10; ctx.shadowColor = p.color || '#f00'; ctx.fillStyle = p.color || '#f00';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r || 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

        if (collides({ x: p.x - (p.r || 5), y: p.y - (p.r || 5), w: (p.r || 5) * 2, h: (p.r || 5) * 2 }, player)) {
            if (player.mods.reflect) { p.vx *= -1; p.vy *= -1; p.x += p.vx * 2; }
            else { player.hit(10); p.active = false; }
        }
        if (p.y > container.height || p.y < 0 || p.x < 0 || p.x > container.width) p.active = false;
    });
    entities.projectiles = entities.projectiles.filter(p => p.active);

    spawnLogic();
    drawTouchControls();
    ctx.restore();
}

function tryStartPhantom() {
    if (maxWaveReached >= 6) startGame('Phantom');
    else {
        const el = document.getElementById('phantom-hint');
        el.style.color = '#f00';
        setTimeout(() => el.style.color = '#888', 500);
        Audio.play('hit');
    }
}
function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('shop-screen').classList.add('active');
    document.getElementById('shop-currency').innerText = score;
}
function restartGame() {
    document.getElementById('shop-screen').classList.remove('active');
    document.getElementById('class-screen').classList.add('active');

    // Check Unlock Status
    if (maxWaveReached >= 6) {
        const pCard = document.getElementById('phantom-card');
        if (pCard.classList.contains('locked')) {
            pCard.classList.remove('locked');
            pCard.classList.add('phantom-unlocked');
            pCard.onclick = () => startGame('Phantom');
            pCard.querySelector('.text-3xl').innerText = "☠";
            pCard.querySelector('.text-gray-400').innerText = "PHANTOM // ONLINE";
            pCard.querySelector('.text-gray-400').style.color = "#a855f7";
        }
    }

    gameState = 'MENU';
}
function addFloatingText(text, x, y, c) {
    entities.text.push({
        text, x, y, life: 40, color: c, update: function () { this.y -= 1; this.life--; }, draw: function () {
            ctx.globalAlpha = this.life / 40; ctx.fillStyle = this.color; ctx.font = "bold 16px Orbitron"; ctx.fillText(this.text, this.x, this.y); ctx.globalAlpha = 1;
        }
    });
}

resize();
player = new Player(CLASSES['Spark']);

// Start the game loop once globally
loop();
