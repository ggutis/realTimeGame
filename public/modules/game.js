
import * as renderer from './renderer.js';

let currentEntities = {
    animals: {},
    monsters: {},
};
let damageIndicators = [];

let gameAssets = {
    animals: {},
    monsters: {},
    stages: {},
    animalUnlocks: [],
};

let userId = localStorage.getItem('userId');
if (!userId) {
    userId = prompt('사용자 이름을 입력하세요:') || 'guest-user';
    localStorage.setItem('userId', userId);
}

export function getUserId() {
    return userId;
}

export function setGameAssets(assets) {
    gameAssets = assets;
}

export function getGameAssets() {
    return gameAssets;
}

export function addDamageIndicator(event) {
    damageIndicators.push({ ...event, lifetime: 60 }); // 60 frames lifetime
}

export function isMonster(entityId) {
    return !!currentEntities.monsters[entityId];
}

export function getCurrentEntities() {
    return currentEntities;
}

export function updateEntities(entities, type) {
    const currentEntitiesMap = type === 'unit' ? currentEntities.animals : currentEntities.monsters;
    renderer.updateEntities(entities, type, currentEntitiesMap, gameAssets);
}

export function renderLoop(currentTime) {
    // Update and filter damage indicators
    damageIndicators = damageIndicators.filter((indicator) => indicator.lifetime > 0);
    damageIndicators.forEach((indicator) => indicator.lifetime--);

    renderer.renderLoop(currentTime, currentEntities, damageIndicators);
}
