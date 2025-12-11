
/** CONFIG */
const CONFIG = { baseHp: 100, baseDmg: 10, baseSpeed: 8, baseRate: 20 };

const CLASSES = {
    'Spark': { color: '#00f3ff', hp: 1.0, dmg: 1.0, rate: 1.0, width: 1.0 },
    'Vulcan': { color: '#ffea00', hp: 0.8, dmg: 0.5, rate: 0.5, width: 0.9 },
    'Titan': { color: '#ff3333', hp: 1.5, dmg: 3.0, rate: 2.5, width: 1.2 },
    'Phantom': { color: '#a855f7', hp: 0.6, dmg: 1.5, rate: 0.8, width: 0.8 }
};

const RARITY = {
    COMMON: { id: 'common', color: '#a0a0a0', weight: 60 },
    UNCOMMON: { id: 'uncommon', color: '#00f3ff', weight: 30 },
    RARE: { id: 'rare', color: '#00ff00', weight: 15 },
    EPIC: { id: 'epic', color: '#b026ff', weight: 4 },
    LEGENDARY: { id: 'legendary', color: '#ffd700', weight: 1 }
};

const PERKS = [
    { id: 'dmg_c', name: 'Damage Up', desc: '+15% Dmg', icon: '⚔', rarity: RARITY.COMMON, apply: p => p.mods.dmg += 0.15 },
    { id: 'rate_c', name: 'Rate Up', desc: '+10% Fire Rate', icon: '⚡', rarity: RARITY.COMMON, apply: p => p.mods.rate *= 0.9 },
    { id: 'spd_c', name: 'Speed Up', desc: '+10% Move Spd', icon: '➤', rarity: RARITY.COMMON, apply: p => p.mods.speed += 0.1 },
    { id: 'dmg_u', name: 'Plasma Core', desc: '+30% Dmg', icon: '⚔', rarity: RARITY.UNCOMMON, apply: p => p.mods.dmg += 0.3 },
    { id: 'multi_u', name: 'Splitter', desc: '+1 Projectile', icon: '✦', rarity: RARITY.UNCOMMON, apply: p => p.mods.multi++ },
    { id: 'crit_u', name: 'Scope', desc: '+10% Crit Chance', icon: '🎯', rarity: RARITY.UNCOMMON, apply: p => p.mods.critChance += 0.1 },
    { id: 'laser', name: 'Laser Sight', desc: 'Aim Guide', icon: '🔭', rarity: RARITY.UNCOMMON, apply: p => p.mods.laser = true },
    { id: 'ricochet', name: 'Ricochet', desc: 'Balls Bounce +1', icon: '↩', rarity: RARITY.RARE, apply: p => p.mods.ricochet++ },
    { id: 'pierce', name: 'Pierce', desc: 'Pierce +1 Foe', icon: '📌', rarity: RARITY.RARE, apply: p => p.mods.pierce++ },
    { id: 'drone', name: 'Drone', desc: 'Support Unit', icon: '🛸', rarity: RARITY.RARE, apply: p => addDrone() },
    { id: 'barrier', name: 'Shield Gen', desc: 'Block 1 Hit', icon: '🛡', rarity: RARITY.RARE, apply: p => p.mods.barrierMax++ },
    { id: 'chain', name: 'Tesla Coil', desc: 'Chain Lightning', icon: '🌩', rarity: RARITY.EPIC, apply: p => p.mods.chain++ },
    { id: 'vamp', name: 'Vampirism', desc: 'Heal on Kill', icon: '🩸', rarity: RARITY.EPIC, apply: p => p.mods.vamp++ },
    { id: 'time', name: 'Time Dilation', desc: 'Slow Enemies', icon: '⏳', rarity: RARITY.EPIC, apply: p => p.mods.timeSlow++ },
    { id: 'split', name: 'Quantum Split', desc: 'Split on Hit', icon: '💠', rarity: RARITY.EPIC, apply: p => p.mods.splitOnHit++ },
    { id: 'blackhole', name: 'Singularity', desc: 'Gravity Well', icon: '🌌', rarity: RARITY.LEGENDARY, apply: p => addBlackHole() },
    { id: 'exec', name: 'Executioner', desc: 'Kill <20% HP', icon: '☠', rarity: RARITY.LEGENDARY, apply: p => p.mods.execute++ },
    { id: 'nuke', name: 'Nuclear Core', desc: 'Explosive Balls', icon: '☢', rarity: RARITY.LEGENDARY, apply: p => p.mods.explosive++ }
];

const UPGRADES = {
    hpMax: { lvl: 1, cost: 100, inc: 50, name: "Hull", desc: "Max HP" },
    damage: { lvl: 1, cost: 150, inc: 5, name: "Core", desc: "Damage" },
    fireRate: { lvl: 1, cost: 200, inc: -1, name: "Cycle", desc: "Fire Rate" },
    speed: { lvl: 1, cost: 80, inc: 0.5, name: "Thruster", desc: "Speed" },
    multi: { lvl: 1, cost: 500, inc: 1, name: "Split", desc: "Multi-shot" },
    luck: { lvl: 1, cost: 300, inc: 0.05, name: "Luck", desc: "+Crit %" },
    magnet: { lvl: 1, cost: 150, inc: 40, name: "Magnet", desc: "Pickup Range" }
};

const ZONES = [
    { name: 'NEON CITY', color: '#00f3ff' }, { name: 'VOID SECTOR', color: '#b026ff' }, { name: 'SOLAR FLARE', color: '#ffaa00' }, { name: 'MATRIX', color: '#00ff00' }
];
