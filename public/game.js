document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameContainer = document.getElementById('game-container');
    const goldEl = document.getElementById('gold');
    const baseHealthEl = document.getElementById('base-health');
    const scoreEl = document.getElementById('score');
    const unitButtonsContainer = document.getElementById('unit-buttons-container');

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
    
    // An object to store the target positions for each entity, used for interpolation.
    // 보간을 위한 목표 위치를 저장하는 객체입니다.
    const targetPositions = {};
    
    // The main rendering loop using requestAnimationFrame.
    // requestAnimationFrame을 사용하는 주 렌더링 루프입니다.
    let lastTime = 0;
    function renderLoop(currentTime) {
        if (lastTime === 0) {
            lastTime = currentTime;
        }
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Update and draw each monster
        // 몬스터 위치를 업데이트하고 그립니다.
        for (const id in currentEntities.monsters) {
            const monsterElement = currentEntities.monsters[id];
            const targetPos = targetPositions[id];

            if (monsterElement && targetPos) {
                // Use Linear Interpolation (Lerp) to smoothly move the monster towards its target position.
                // deltaTime을 사용하여 보간 속도를 프레임 간 시간에 비례하도록 만듭니다.
                // 이는 몬스터의 움직임을 훨씬 부드럽게 만듭니다.
                const speed = 150; // 픽셀/초 단위의 속도
                
                // Read the current position. If not a valid number (e.g., first frame), use the target position.
                // 현재 위치를 읽습니다. 유효한 숫자가 아니면(예: 첫 프레임), 목표 위치를 사용합니다.
                const currentX = parseFloat(monsterElement.style.left) || targetPos.x;
                const currentY = parseFloat(monsterElement.style.top) || targetPos.y;

                const dx = targetPos.x - currentX;
                const dy = targetPos.y - currentY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 1) { // 목표 위치에 충분히 가깝지 않으면 이동
                    const moveAmount = Math.min(distance, speed * deltaTime);
                    monsterElement.style.left = `${currentX + (dx / distance) * moveAmount}px`;
                    monsterElement.style.top = `${currentY + (dy / distance) * moveAmount}px`;
                }
            }
        }

        // Update and draw each animal
        // 유닛(동물) 위치를 업데이트하고 그립니다.
        for (const id in currentEntities.animals) {
            const animalElement = currentEntities.animals[id];
            const targetPos = targetPositions[id];

            if (animalElement && targetPos) {
                const speed = 150; // 픽셀/초
                
                const currentX = parseFloat(animalElement.style.left) || targetPos.x;
                const currentY = parseFloat(animalElement.style.top) || targetPos.y;

                const dx = targetPos.x - currentX;
                const dy = targetPos.y - currentY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 1) { // 목표 위치에 충분히 가깝지 않으면 이동
                    const moveAmount = Math.min(distance, speed * deltaTime);
                    animalElement.style.left = `${currentX + (dx / distance) * moveAmount}px`;
                    animalElement.style.top = `${currentY + (dy / distance) * moveAmount}px`;
                }
            }
        }

        requestAnimationFrame(renderLoop);
    }
    
    // Start the rendering loop.
    // 렌더링 루프를 시작합니다.
    requestAnimationFrame(renderLoop);


    // 게임 시작 이벤트
    socket.on('connect', () => {
        console.log('서버에 연결되었습니다.');
        socket.emit('game:start', { userId: 'guest-user' });
    });

    // 게임 시작 성공 이벤트 핸들러
    socket.on('game:start_success', (payload) => {
        console.log('게임이 시작되었습니다.');
        // 서버에서 받아온 게임 자산 데이터를 저장
        if (payload.gameAssets) {
            gameAssets = payload.gameAssets;
        }
        if (payload.animals) {
            gameAssets.animals = payload.animals, payload.unlockedAnimals;
        }
        if (payload.monsters) {
            gameAssets.monsters = payload.monsters;
        }

        // UI 업데이트
        goldEl.textContent = payload.userGold;

        // 해금된 동물들로 소환 버튼 생성
        renderSummonButtons(payload.unlockedAnimals);
    });

    // 게임 상태 업데이트 이벤트 핸들러
    socket.on('game:state_update', (gameState) => {
        goldEl.textContent = gameState.gold;
        baseHealthEl.textContent = gameState.baseHealth;
        scoreEl.textContent = gameState.score;

        // Update target positions for smooth rendering
        // 부드러운 렌더링을 위해 목표 위치를 업데이트합니다.
        updateTargetPositions(gameState.animals, 'unit', currentEntities.animals);
        updateTargetPositions(gameState.monsters, 'monster', currentEntities.monsters);
    });

    // 게임 종료 이벤트 핸들러
    socket.on('game:end', (payload) => {
        if (payload.isGameOver) {
            // Using a custom modal or message box is better than alert()
            // alert() 대신 커스텀 모달이나 메시지 박스를 사용하는 것이 좋습니다.
            // You can replace this with a custom modal UI.
            alert('게임 종료! 점수: ' + payload.score);
        } else if (payload.isStageCompleted) {
            alert('스테이지 클리어! 다음 스테이지로!');
            // TODO: 다음 스테이지 시작 로직 추가
        }
    });

    // 게임 오류 이벤트 핸들러
    socket.on('game:error', (payload) => {
        console.error('게임 오류:', payload.message);
        // Using a custom modal or message box is better than alert()
        alert('게임 오류: ' + payload.message);
    });

    // 유닛 소환 버튼 렌더링 함수
    const renderSummonButtons = (unlockedAnimals) => {
        unitButtonsContainer.innerHTML = ''; // 기존 버튼 초기화
        unlockedAnimals.forEach((animalId) => {
            const animalData = gameAssets.animals[animalId];
            if (animalData) {
                const button = document.createElement('button');
                button.className = 'summon-button';
                button.dataset.animalId = animalId;
                button.innerHTML = `
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
    
    // New function to update target positions and manage DOM elements.
    // 목표 위치를 업데이트하고 DOM 요소를 관리하는 새로운 함수입니다.
    const updateTargetPositions = (entities, className, currentEntities) => {
        const updatedIds = new Set();
        
        entities.forEach((entity) => {
            const id = entity.id;
            updatedIds.add(id);

            // Update the target position for interpolation.
            // 보간을 위한 목표 위치를 업데이트합니다.
            targetPositions[id] = entity.position;

            let el = currentEntities[id];
            
            if (!el) {
                // Create a new entity if it doesn't exist.
                // 엔티티가 없으면 새로 생성합니다.
                el = document.createElement('div');
                el.id = id;
                el.className = className;
                el.textContent = getEntityIcon(className, entity);
                gameContainer.appendChild(el);
                
                // Set the initial position to the target position.
                // 첫 위치를 목표 위치로 즉시 설정합니다.
                el.style.left = `${entity.position.x}px`;
                el.style.top = `${entity.position.y}px`;

                // Add health bar.
                // 체력 바를 추가합니다.
                const healthBarContainer = document.createElement('div');
                healthBarContainer.className = 'health-bar-container';
                const healthBar = document.createElement('div');
                healthBar.className = 'health-bar';
                healthBarContainer.appendChild(healthBar);
                el.appendChild(healthBarContainer);
                
                currentEntities[id] = el;
            }
            
            // Update health bar.
            // 체력 바를 업데이트합니다.
            const healthBar = el.querySelector('.health-bar');
            if (healthBar) {
                const maxHealth = getInitialHealth(entity);
                const healthPercentage = (entity.health / maxHealth) * 100;
                healthBar.style.width = `${Math.max(0, healthPercentage)}%`;
            }
        });
        
        // Remove entities that no longer exist on the server.
        // 서버에 더 이상 존재하지 않는 엔티티를 제거합니다.
        for (const id in currentEntities) {
            if (!updatedIds.has(id)) {
                if (currentEntities[id]) {
                    gameContainer.removeChild(currentEntities[id]);
                }
                delete currentEntities[id];
                delete targetPositions[id];
            }
        }
    };


    // 유닛/몬스터 아이콘 가져오기 (이모지 사용)
    const getEntityIcon = (className, entity) => {
        if (className === 'unit') {
            const animalIcons = {
                animal1: '🐻',
                animal2: '�',
                animal3: '🦁',
            };
            return animalIcons[entity.animalId] || '❓';
        } else {
            const monsterIcons = {
                monster1: '👺',
                monster2: '👹',
                monster3: '👻',
            };
            return monsterIcons[entity.monsterId] || '💀';
        }
    };

    // 초기 체력 값을 가져오는 함수
    const getInitialHealth = (entity) => {
        if (entity.animalId) {
            return gameAssets.animals[entity.animalId]?.health || 100;
        }
        if (entity.monsterId) {
            return gameAssets.monsters[entity.monsterId]?.health || 50;
        }
        return 100; // 기본값
    };

    // 게임 컨테이너 클릭 시 유닛 소환
    gameContainer.addEventListener('click', (event) => {
        if (!isSummoning || !selectedAnimalId) {
            return;
        }

        const rect = gameContainer.getBoundingClientRect();
        const position = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };

        // 유닛 소환 요청
        socket.emit('game:summon', { animalId: selectedAnimalId, position });

        // 소환 모드 비활성화
        isSummoning = false;
        selectedAnimalId = null;
    });
});