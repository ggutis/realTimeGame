
import * as renderer from './renderer.js';

let currentEntities = {
    animals: {},
    monsters: {},
};

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

export function isMonster(entityId) {
    return !!currentEntities.monsters[entityId];
}

export function updateEntities(entities, type) {
    const currentEntitiesMap = type === 'unit' ? currentEntities.animals : currentEntities.monsters;
    renderer.updateEntities(entities, type, currentEntitiesMap, gameAssets);
}

export function renderLoop(currentTime) {
    renderer.renderLoop(currentTime, currentEntities);
}
