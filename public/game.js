document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameContainer = document.getElementById('game-container');
    const goldEl = document.getElementById('gold');
    const baseHealthEl = document.getElementById('base-health');
    const scoreEl = document.getElementById('score');
    const unitButtonsContainer = document.getElementById('unit-buttons-container');

    // Modal elements
    const modal = document.getElementById('game-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalScore = document.getElementById('modal-score');
    const modalBtn = document.getElementById('modal-action-btn');

    let isSummoning = false;
    let selectedAnimalId = null;
    let currentEntities = {
        animals: {},
        monsters: {}
    };
    let gameAssets = {
        animals: {},
        monsters: {},
        stages: {},
        animalUnlocks: [],
    };
    
    const targetPositions = {};
    
    let lastTime = 0;
    function renderLoop(currentTime) {
        if (lastTime === 0) {
            lastTime = currentTime;
        }
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        for (const id in currentEntities.monsters) {
            const monsterElement = currentEntities.monsters[id];
            const targetPos = targetPositions[id];

            if (monsterElement && targetPos) {
                const speed = 150; 
                const currentX = parseFloat(monsterElement.style.left) || targetPos.x;
                const currentY = parseFloat(monsterElement.style.top) || targetPos.y;

                const dx = targetPos.x - currentX;
                const dy = targetPos.y - currentY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 1) {
                    const moveAmount = Math.min(distance, speed * deltaTime);
                    monsterElement.style.left = `${currentX + (dx / distance) * moveAmount}px`;
                    monsterElement.style.top = `${currentY + (dy / distance) * moveAmount}px`;
                }
            }
        }

        for (const id in currentEntities.animals) {
            const animalElement = currentEntities.animals[id];
            const targetPos = targetPositions[id];

            if (animalElement && targetPos) {
                const speed = 150;
                const currentX = parseFloat(animalElement.style.left) || targetPos.x;
                const currentY = parseFloat(animalElement.style.top) || targetPos.y;

                const dx = targetPos.x - currentX;
                const dy = targetPos.y - currentY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 1) {
                    const moveAmount = Math.min(distance, speed * deltaTime);
                    animalElement.style.left = `${currentX + (dx / distance) * moveAmount}px`;
                    animalElement.style.top = `${currentY + (dy / distance) * moveAmount}px`;
                }
            }
        }

        requestAnimationFrame(renderLoop);
    }
    
    requestAnimationFrame(renderLoop);

    socket.on('connect', () => {
        console.log('서버에 연결되었습니다.');
        socket.emit('game:start', { userId: 'guest-user' });
    });

    socket.on('game:start_success', (payload) => {
        console.log('게임이 시작되었습니다.', payload);
        if (payload.gameAssets) {
            gameAssets = payload.gameAssets;
        }
        goldEl.textContent = payload.userGold;
        renderSummonButtons(payload.unlockedAnimals);
    });

    socket.on('game:state_update', (gameState) => {
        goldEl.textContent = gameState.gold;
        baseHealthEl.textContent = gameState.baseHealth;
        scoreEl.textContent = gameState.score;
        updateTargetPositions(gameState.animals, 'unit', currentEntities.animals);
        updateTargetPositions(gameState.monsters, 'monster', currentEntities.monsters);
    });

    socket.on('game:end', (payload) => {
        if (payload.isGameOver) {
            showModal('게임 종료!', `점수: ${payload.score}`, '다시 시작', () => {
                socket.emit('game:start', { userId: 'guest-user' });
                hideModal();
            });
        } else if (payload.isStageCompleted) {
            showModal('스테이지 클리어!', `점수: ${payload.score}`, '다음 스테이지', () => {
                socket.emit('game:next_stage', { userId: 'guest-user' });
                hideModal();
            });
        }
    });

    socket.on('game:error', (payload) => {
        console.error('게임 오류:', payload.message);
        showModal('게임 오류', payload.message, '확인', hideModal);
    });

    const renderSummonButtons = (unlockedAnimals) => {
        unitButtonsContainer.innerHTML = '';
        unlockedAnimals.forEach((animalId) => {
            const animalData = gameAssets.animals[animalId];
            if (animalData) {
                const button = document.createElement('button');
                button.className = 'summon-button';
                button.dataset.animalId = animalId;
                button.innerHTML = `
                    <img src="/images/${animalData.image}" alt="${animalData.name}" style="width: 40px; height: 40px;">
                    <span>${animalData.name}</span>
                    <span class="cost">${animalData.cost}💰</span>
                `;
                button.addEventListener('click', () => {
                    isSummoning = true;
                    selectedAnimalId = animalId;
                    console.log(`'${animalData.name}' 소환 모드 활성화`);
                });
                unitButtonsContainer.appendChild(button);
            }
        });
    };
    
    const updateTargetPositions = (entities, className, currentEntitiesMap) => {
        const updatedIds = new Set();
        
        entities.forEach((entity) => {
            const id = entity.id;
            updatedIds.add(id);
            targetPositions[id] = entity.position;

            let el = currentEntitiesMap[id];
            
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                el.className = className;
                el.innerHTML = getEntityIcon(className, entity);
                gameContainer.appendChild(el);
                
                el.style.left = `${entity.position.x}px`;
                el.style.top = `${entity.position.y}px`;

                const healthBarContainer = document.createElement('div');
                healthBarContainer.className = 'health-bar-container';
                const healthBar = document.createElement('div');
                healthBar.className = 'health-bar';
                healthBarContainer.appendChild(healthBar);
                el.appendChild(healthBarContainer);
                
                currentEntitiesMap[id] = el;
            }
            
            const healthBar = el.querySelector('.health-bar');
            if (healthBar) {
                const maxHealth = getInitialHealth(entity);
                const healthPercentage = (entity.health / maxHealth) * 100;
                healthBar.style.width = `${Math.max(0, healthPercentage)}%`;
            }
        });
        
        for (const id in currentEntitiesMap) {
            if (!updatedIds.has(id)) {
                if (currentEntitiesMap[id]) {
                    gameContainer.removeChild(currentEntitiesMap[id]);
                }
                delete currentEntitiesMap[id];
                delete targetPositions[id];
            }
        }
    };

    const getEntityIcon = (className, entity) => {
        let data;
        if (className === 'unit') {
            data = gameAssets.animals[entity.animalId];
        } else {
            data = gameAssets.monsters[entity.monsterId];
        }
        if (data && data.image) {
            return `<img src="/images/${data.image}" alt="${data.name}">`;
        }
        return '❓'; // Fallback icon
    };

    const getInitialHealth = (entity) => {
        if (entity.animalId && gameAssets.animals[entity.animalId]) {
            return gameAssets.animals[entity.animalId].health;
        }
        if (entity.monsterId && gameAssets.monsters[entity.monsterId]) {
            return gameAssets.monsters[entity.monsterId].health;
        }
        return 100;
    };

    gameContainer.addEventListener('click', (event) => {
        if (!isSummoning || !selectedAnimalId) {
            return;
        }

        const rect = gameContainer.getBoundingClientRect();
        const position = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };

        socket.emit('game:summon', { animalId: selectedAnimalId, position });

        isSummoning = false;
        selectedAnimalId = null;
    });

    // Modal helper functions
    function showModal(title, score, buttonText, callback) {
        modalTitle.textContent = title;
        modalScore.textContent = score;
        modalBtn.textContent = buttonText;
        modalBtn.onclick = callback; // Assign new callback
        modal.style.display = 'flex';
    }

    function hideModal() {
        modal.style.display = 'none';
    }
});