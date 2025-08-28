
const gameContainer = document.getElementById('game-container');

const entityStates = {}; // 애니메이션과 위치 보간을 위한 상태 저장

const bossSpriteMapping = {
    general: 'human',
    bigOrc: 'orc',
    deathKnight: 'skeleton',
    highElf: 'elf',
    bloodTroll: 'troll',
    theKing: 'troll',
};

const getSpriteId = (monsterId) => {
    return bossSpriteMapping[monsterId] || monsterId;
};

let lastTime = 0;
export function renderLoop(currentTime, currentEntities) {
    if (lastTime === 0) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    const allEntities = { ...currentEntities.animals, ...currentEntities.monsters };

    for (const id in allEntities) {
        const entityElement = allEntities[id];
        const state = entityStates[id];

        if (entityElement && state && state.targetPos) {
            const currentX = parseFloat(entityElement.style.left) || state.targetPos.x;
            const currentY = parseFloat(entityElement.style.top) || state.targetPos.y;
            const newX = currentX + (state.targetPos.x - currentX) * 0.1;
            const newY = currentY + (state.targetPos.y - currentY) * 0.1;
            entityElement.style.left = `${newX}px`;
            entityElement.style.top = `${newY}px`;

            const now = Date.now();
            if (now > state.lastFrameTime + 150) {
                state.currentFrame = (state.currentFrame + 1) % 4;
                const frameNumber = state.currentFrame.toString().padStart(2, '0');
                const entityImg = entityElement.querySelector('img');
                if (entityImg) {
                    const type = entityElement.classList.contains('unit') ? 'animals' : 'monster';
                    const entityId = getSpriteId(state.entityId);
                    entityImg.src = `./images/${type}/${entityId}${frameNumber}.png`;
                }
                state.lastFrameTime = now;
            }
        }
    }

    requestAnimationFrame((time) => renderLoop(time, currentEntities));
}

export function updateEntities(entities, type, currentEntitiesMap, gameAssets) {
    const updatedIds = new Set();
    entities.forEach((entity) => {
        updatedIds.add(entity.id);
        const entityId = type === 'unit' ? entity.animalId : entity.monsterId;

        let el = currentEntitiesMap[entity.id];
        if (!el) {
            el = createEntityElement(type, entity.id, entityId);
            currentEntitiesMap[entity.id] = el;
        }

        if (type === 'monster' && entity.isBoss) {
            el.classList.add('boss');
        }

        if (!entityStates[entity.id]) {
            entityStates[entity.id] = {
                targetPos: {},
                currentFrame: 0,
                lastFrameTime: 0,
                entityId: entityId,
            };
        }
        entityStates[entity.id].targetPos = entity.position;

        const maxHealth =
            type === 'unit'
                ? gameAssets.animals[entityId].health
                : gameAssets.monsters[entityId].health;
        updateHealthBar(el, entity.health, maxHealth);
    });

    for (const id in currentEntitiesMap) {
        if (!updatedIds.has(id)) {
            currentEntitiesMap[id].remove();
            delete currentEntitiesMap[id];
            delete entityStates[id];
        }
    }
}

function createEntityElement(type, id, entityId) {
    const element = document.createElement('div');
    element.className = type; // 'unit' or 'monster'
    element.id = id;

    const img = document.createElement('img');
    const folder = type === 'unit' ? 'animals' : 'monster';
    const spriteId = getSpriteId(entityId);
    img.src = `./images/${folder}/${spriteId}00.png`; // 초기 이미지
    element.appendChild(img);

    const healthBarContainer = document.createElement('div');
    healthBarContainer.className = 'health-bar-container';
    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    healthBarContainer.appendChild(healthBar);
    element.appendChild(healthBarContainer);

    gameContainer.appendChild(element);
    return element;
}

function updateHealthBar(element, currentHealth, maxHealth) {
    const healthBar = element.querySelector('.health-bar');
    if (healthBar) {
        const percentage = Math.max(0, (currentHealth / maxHealth) * 100);
        healthBar.style.width = `${percentage}%`;
    }
}
