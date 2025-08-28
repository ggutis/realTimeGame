document.addEventListener('DOMContentLoaded', () => {
	const socket = io();
	const gameContainer = document.getElementById('game-container');
	const goldEl = document.getElementById('gold');
	const baseHealthEl = document.getElementById('base-health');
	const scoreEl = document.getElementById('score');
	const stageEl = document.getElementById('stage'); // 스테이지 표시 엘리먼트
	const unitButtonsContainer = document.getElementById('unit-buttons-container');
	const leaderboardList = document.getElementById('leaderboard-list');

	// Modal elements
	const modal = document.getElementById('game-modal');
	const modalTitle = document.getElementById('modal-title');
	const modalScore = document.getElementById('modal-score');
		const modalBtn = document.getElementById('modal-action-btn');
	const modalCloseBtn = document.getElementById('modal-close-btn');

	let isSummoning = false;
	let selectedAnimalId = null;
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
	function renderLoop(currentTime) {
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
				// 위치 보간
				const currentX = parseFloat(entityElement.style.left) || state.targetPos.x;
				const currentY = parseFloat(entityElement.style.top) || state.targetPos.y;
				const newX = currentX + (state.targetPos.x - currentX) * 0.1;
				const newY = currentY + (state.targetPos.y - currentY) * 0.1;
				entityElement.style.left = `${newX}px`;
				entityElement.style.top = `${newY}px`;

				// 애니메이션
				const now = Date.now();
				if (now > state.lastFrameTime + 150) {
					// 150ms 마다 프레임 변경
					state.currentFrame = (state.currentFrame + 1) % 4; // 4프레임 애니메이션으로 가정
					const frameNumber = state.currentFrame.toString().padStart(2, '0');
					const entityImg = entityElement.querySelector('img');
					if (entityImg) {
						const type = entityElement.classList.contains('unit') ? 'animals' : 'monster';
						// entityId는 animalId (e.g. 'snake') 또는 monsterId (e.g. 'orc')
						const entityId = getSpriteId(state.entityId);
						entityImg.src = `./images/${type}/${entityId}${frameNumber}.png`;
					}
					state.lastFrameTime = now;
				}
			}
		}

		requestAnimationFrame(renderLoop);
	}

		const startGameBtn = document.getElementById('start-game-btn');

    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = prompt('사용자 이름을 입력하세요:') || 'guest-user';
        localStorage.setItem('userId', userId);
    }

	socket.on('connect', () => {
		console.log('서버에 연결되었습니다.');
	});

	startGameBtn.addEventListener('click', () => {
		socket.emit('game:start', { userId });
		startGameBtn.style.display = 'none'; // Hide the button after starting
	});

	function requestLeaderboard() {
		socket.emit('ranking:get');
	}

	// 서버 연결 시 랭킹 데이터를 바로 요청
    socket.on('connect', () => {
        console.log('서버에 연결되었습니다.');
        requestLeaderboard(); // 연결되자마자 랭킹 요청
    });

	socket.on('game:start_success', (payload) => {
		console.log('게임이 시작되었습니다.', payload);
		gameAssets = payload.gameAssets;
		goldEl.textContent = payload.userGold;
		stageEl.textContent = payload.currentStageId || 1;
		renderSummonButtons(payload.unlockedAnimals);

		// Request leaderboard for the first time
		requestLeaderboard();

		// 10초마다 랭킹 업데이트 요청
		setInterval(requestLeaderboard, 10000);

		// 게임 루프 시작
		requestAnimationFrame(renderLoop);
	});

	socket.on('game:state_update', (gameState) => {
		goldEl.textContent = gameState.gold;
		baseHealthEl.textContent = gameState.baseHealth;
		scoreEl.textContent = gameState.score;
		updateEntities(gameState.animals, 'unit', currentEntities.animals);
		updateEntities(gameState.monsters, 'monster', currentEntities.monsters);

		if (gameState.damageEvents) {
			gameState.damageEvents.forEach((event) => {
				const isMonster = !!state.monsters[event.targetId];
				showDamageNumber(event.targetId, event.damage, isMonster);
			});
		}
	});

	socket.on('game:end', (payload) => {
		const startGameBtn = document.getElementById('start-game-btn');
		const closeAction = () => {
			hideModal();
			startGameBtn.style.display = 'block';
		};

		if (payload.isGameOver) {
			showModal(
				'게임 종료!',
				`점수: ${payload.score}`,
				'다시 시작',
				() => {
					socket.emit('game:start', { userId });
					hideModal();
				},
				closeAction,
			);
		} else if (payload.isStageCompleted) {
			showModal(
				'스테이지 클리어!',
				`점수: ${payload.score}`,
				'다음 스테이지',
				() => {
					socket.emit('game:next_stage', { userId });
					hideModal();
				},
				closeAction,
			);
		}
	});

	// 새로운 최고 점수 달성 이벤트를 수신합니다.
	socket.on('game:high_score', (payload) => {
		console.log('새로운 최고 점수 달성:', payload.message, payload.score);
		showModal(
			'🎉 최고 점수 달성!',
			`축하합니다! 새로운 최고 점수: ${payload.score}`,
			'확인',
			hideModal
		);
	});

	socket.on('game:stage_started', (payload) => {
		stageEl.textContent = payload.currentStageId;
		goldEl.textContent = payload.userGold;
		renderSummonButtons(payload.unlockedAnimals);
	});

	socket.on('game:error', (payload) => {
		console.error('게임 오류:', payload.message);
		showModal('게임 오류', payload.message, '확인', hideModal);
	});

	// Leaderboard
	function updateLeaderboard(leaderboardData) {
		if (!leaderboardList) return;

		leaderboardList.innerHTML = ''; // Clear existing list

		leaderboardData.forEach((entry, index) => {
			const [userId, score] = entry;
			const li = document.createElement('li');
			li.textContent = `${index + 1}. ${userId} - ${score}`;
			leaderboardList.appendChild(li);
		});
	}

	

	// Listen for leaderboard updates
	socket.on('ranking:update', (data) => {
		updateLeaderboard(data.leaderboard);
	});

	socket.on('ranking:error', (error) => {
		console.error('Ranking error:', error.message);
	});

	const renderSummonButtons = (unlockedAnimals) => {
		unitButtonsContainer.innerHTML = '';
		unlockedAnimals.forEach((animalId) => {
			const animalData = gameAssets.animals[animalId];
			if (animalData) {
				const button = document.createElement('button');
				button.className = 'summon-button';
				button.onclick = () => {
					const summonPosition = { x: 100, y: 550 }; // 소환 위치를 고정값으로 설정 (예시)
					socket.emit('game:summon', { animalId, position: summonPosition });
				};

				const img = document.createElement('img');
				// 버튼 이미지는 첫번째 프레임(00) 사용
				img.src = `./images/animals/${animalId}00.png`;
				img.alt = animalData.name;
				img.style.width = '40px';
				img.style.height = '40px';
				button.appendChild(img);

				const nameSpan = document.createElement('span');
				nameSpan.textContent = animalData.name;
				button.appendChild(nameSpan);

				const costSpan = document.createElement('span');
				costSpan.className = 'cost';
				costSpan.textContent = `${animalData.cost}💰`;
				button.appendChild(costSpan);

				unitButtonsContainer.appendChild(button);
			}
		});
	};

	const updateEntities = (entities, type, currentEntitiesMap) => {
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
	};

	const createEntityElement = (type, id, entityId) => {
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
	};

	const updateHealthBar = (element, currentHealth, maxHealth) => {
		const healthBar = element.querySelector('.health-bar');
		if (healthBar) {
			const percentage = Math.max(0, (currentHealth / maxHealth) * 100);
			healthBar.style.width = `${percentage}%`;
		}
	};

	function showDamageNumber(targetId, damage, isMonster) {
		const targetElement = document.getElementById(targetId);
		if (!targetElement) return;

		const damageElement = document.createElement('div');
		damageElement.className = 'damage-number';
		damageElement.textContent = damage;

		// 몬스터에게 입히는 데미지인지, 유닛이 입는 데미지인지 구분
		if (!isMonster) {
			damageElement.classList.add('unit-damage');
		}

		const targetRect = targetElement.getBoundingClientRect();
		const containerRect = gameContainer.getBoundingClientRect();

		// 숫자가 표시될 위치 계산
		damageElement.style.left = `${targetRect.left - containerRect.left + targetRect.width / 2}px`;
		damageElement.style.top = `${targetRect.top - containerRect.top}px`;

		gameContainer.appendChild(damageElement);

		// 애니메이션이 끝나면 요소 제거
		damageElement.addEventListener('animationend', () => {
			damageElement.remove();
		});
	}

	function showModal(title, score, buttonText, callback, closeCallback) {
		modalTitle.textContent = title;
		modalScore.textContent = score;
		modalBtn.textContent = buttonText;
		modalBtn.onclick = callback;

		if (closeCallback) {
			modalCloseBtn.style.display = 'inline-block';
			modalCloseBtn.onclick = closeCallback;
		} else {
			modalCloseBtn.style.display = 'none';
		}

		modal.style.display = 'flex';
	}

	function hideModal() {
		modal.style.display = 'none';
	}
});
