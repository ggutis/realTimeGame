import { v4 as uuid } from 'uuid';
import { Server, Socket } from 'socket.io';
import { getAssets } from '../init/assets.js';
import { GameSession } from '../models/game.session.js';
import { GAME } from '../constants.js';
import { ActiveAnimal, ActiveMonster } from '../types/data.d';
import { GameStartPayload, SummonUnitPayload } from '../types/payloads.d';
import { isMeet } from '../handlers/helper.js';
import { getStageData, completeStage, moveStageHandler } from './stage.handler.js';

// 모든 활성 게임 세션을 저장합니다.
export const activeSessions: Record<string, GameSession> = {};
let gameLoopInterval: NodeJS.Timeout | null = null;

// 게임 루프: 고정된 간격으로 게임 상태를 업데이트하고 클라이언트에 보냅니다.
const gameLoop = (io: Server): void => {
	// 모든 활성 세션을 순회합니다.
	for (const sessionId in activeSessions) {
		try {
			const session = activeSessions[sessionId];

			// 게임 종료 또는 스테이지 클리어 상태일 경우 로직 스킵하고 정리
			if (session.isGameOver) {
				endGame(io, session);
				continue;
			}
			if (session.isStageCompleted) {
				continue;
			}

			// 1. 몬스터 소환 로직
			spawnMonstersForSession(session);

			// 2. 유닛과 몬스터 전투 로직
			for (const animal of Object.values(session.activeAnimals)) {
				const animalData = getAssets().animals[animal.animalId];
				if (!animalData) continue;

				// 공격 쿨타임 감소
				animal.attackCooldown -= GAME.TICK_RATE;

				// 가장 가까운 몬스터 찾기
				let targetMonster: ActiveMonster | null = null;
				let minDistance = Infinity;

				for (const monster of Object.values(session.activeMonsters)) {
					const distance = Math.hypot(
						animal.position.x - monster.position.x,
						animal.position.y - monster.position.y,
					);
					if (distance < minDistance) {
						minDistance = distance;
						targetMonster = monster;
					}
				}

				if (targetMonster) {
					// 몬스터가 유닛 사정거리 안에 있는지 확인
					if (minDistance <= animalData.range) {
						// 사정거리 안에 들어오면 유닛의 이동을 멈춥니다.
						animal.isMoving = false;
						// 공격 쿨타임이 0 이하가 되면 공격
						if (animal.attackCooldown <= 0) {
							// 몬스터 공격
							targetMonster.health -= animalData.damage;
							animal.attackCooldown = animalData.attackSpeed; // 공격 쿨타임 재설정
						}
					} else {
						// 사정거리 밖에 있으면 다시 이동
						animal.isMoving = true;
						// 몬스터를 향해 이동
						animal.position.x += (animalData.moveSpeed * GAME.TICK_RATE) / 1000;
					}
				} else {
					// 주변에 몬스터가 없으면 이동
					animal.isMoving = true;
					animal.position.x += (animalData.moveSpeed * GAME.TICK_RATE) / 1000;
                    
                    // 유닛이 컨테이너를 벗어나지 않도록 x 좌표 제한
                    const containerWidth = 900;
                    if (animal.position.x > containerWidth){
                        animal.position.x = containerWidth;
                        animal.isMoving = false;
                    }
				}
			}

			// 몬스터 이동 및 기지 공격
			for (const monster of Object.values(session.activeMonsters)) {
				const monsterData = getAssets().monsters[monster.monsterId];
				if (!monsterData) continue;

				// 몬스터의 이동 방향 (기지쪽으로)
				// 유닛이 막고 있지 않으면 이동
				const isBlocked = Object.values(session.activeAnimals).some((animal) =>
					isMeet(animal, monster),
				);

				if (!isBlocked) {
					monster.position.x -= (monsterData.moveSpeed * GAME.TICK_RATE) / 1000;
				}

				// 기지에 도달했는지 확인
				if (monster.position.x <= 50) {
					// 기지 x 좌표 50
					session.baseHealth -= monsterData.damage;
					delete session.activeMonsters[monster.id];
					console.log(`몬스터 ${monster.id}가 기지에 도달. 남은 기지 체력: ${session.baseHealth}`);
				}
			}

			// 몬스터 사망 처리 및 골드/점수 획득
			const deadMonsters = Object.values(session.activeMonsters).filter((m) => m.health <= 0);
			for (const monster of deadMonsters) {
				delete session.activeMonsters[monster.id];
				const monsterData = getAssets().monsters[monster.monsterId];
				if (monsterData) {
					session.gold += monsterData.goldDrop;
					session.score += 10;
				}
			}

			// 유닛 사망 처리
			const deadAnimals = Object.values(session.activeAnimals).filter((a) => a.health <= 0);
			for (const animal of deadAnimals) {
				delete session.activeAnimals[animal.id];
			}

			// 기지 체력 확인
			if (session.baseHealth <= 0) {
				session.isGameOver = true;
				console.log('게임 오버!');
			}

			// 스테이지 완료 확인
			const isStageDone =
				!session.isSpawning &&
				session.monsterSpawnQueue.length === 0 &&
				Object.keys(session.activeMonsters).length === 0;

			if (isStageDone && session.currentWaveIndex > 0 && !session.isStageCompleted) {
				completeStage(session);
				io.to(session.socketId).emit('game:end', {
					score: session.score,
					isGameOver: false,
					isStageCompleted: true,
				});
				continue;
			}

			// 클라이언트에 게임 상태 업데이트 전송
			io.to(session.socketId).emit('game:state_update', {
				animals: Object.values(session.activeAnimals),
				monsters: Object.values(session.activeMonsters),
				gold: session.gold,
				baseHealth: session.baseHealth,
				score: session.score,
				damageEvents: session.damageEvents,
			});
			session.damageEvents = []; // 이벤트 전송 후 초기화
		} catch (error) {
			console.error(`게임 루프 중 오류 발생: ${error}`);
		}
	}
};

// 몬스터 웨이브 소환 로직
const spawnMonstersForSession = (session: GameSession): void => {
	const currentStage = getStageData(session.currentStageId);

	if (!session.isSpawning && session.monsterSpawnQueue.length > 0 && currentStage) {
		const wave = session.monsterSpawnQueue.shift();
		if (wave) {
			session.isSpawning = true;
			session.currentWaveIndex++; // 웨이브 인덱스 증가
			session.monstersSpawnedInWave = 0;
			session.spawnTimer = setInterval(() => {
				if (session.monstersSpawnedInWave >= wave.count) {
					if (session.spawnTimer) {
						clearInterval(session.spawnTimer);
					}
					session.isSpawning = false;
					return;
				}

				const monsterData = getAssets().monsters[wave.monsterId];
				if (monsterData) {
					const monsterId = uuid();
					const newMonster: ActiveMonster = {
						id: monsterId,
						monsterId: monsterData.id,
						health: monsterData.health,
						damage: monsterData.damage,
						moveSpeed: monsterData.moveSpeed,
						goldDrop: monsterData.goldDrop,
						isAlive: true,
						isMoving: true,
						position: {
							x: 800,
							y: 500, // 게임 화면에 맞게 Y 위치 조정
						},
					};
					session.activeMonsters[monsterId] = newMonster;
					session.monstersSpawnedInWave++;
				}
			}, wave.delay);
		}
	}
};

// 유닛 소환 로직
export const summonUnit = async (socket: Socket, payload: SummonUnitPayload): Promise<void> => {
	const sessionId = Object.keys(activeSessions).find(
		(key) => activeSessions[key].socketId === socket.id,
	);
	if (!sessionId) {
		socket.emit('game:error', { message: '유효한 게임 세션을 찾을 수 없습니다.' });
		return;
	}

	const session = activeSessions[sessionId];
	const animalData = getAssets().animals[payload.animalId];

	if (!animalData) {
		socket.emit('game:error', { message: '존재하지 않는 유닛입니다.' });
		return;
	}

	if (session.gold < animalData.cost) {
		socket.emit('game:error', { message: '골드가 부족합니다.' });
		return;
	}

	// 골드 차감
	session.gold -= animalData.cost;

	// 유닛 소환
	const unitId = uuid();
	const newUnit: ActiveAnimal = {
		id: unitId,
		animalId: animalData.id,
		health: animalData.health,
		damage: animalData.damage,
		attackCooldown: 0,
		isMoving: true,
		targetId: null,
		position: {
			x: 100, // 고정된 x 위치
			y: 500,
		},
	};
	session.activeAnimals[unitId] = newUnit;

	console.log(
		`유닛 ${animalData.name} (ID: ${unitId})가 소환되었습니다. 남은 골드: ${session.gold}`,
	);
};

export const startGame = (socket: Socket, io: Server, payload: GameStartPayload): void => {
	if (gameLoopInterval) {
		clearInterval(gameLoopInterval);
		gameLoopInterval = null;
	}

	const newSession = new GameSession(payload.userId || uuid());
	newSession.socketId = socket.id;
	activeSessions[newSession.userId] = newSession;

	const stage1 = getStageData(1);
	if (stage1) {
		newSession.monsterSpawnQueue.push(...stage1.waves);
	}

	const assets = getAssets();
	const unlockedAnimals =
		assets.animalUnlocks.find((unlock) => unlock.stageId === 0)?.unlockedAnimals || [];
	newSession.unlockedAnimals = unlockedAnimals;

	socket.emit('game:start_success', {
		unlockedAnimals: newSession.unlockedAnimals,
		userGold: newSession.gold,
		gameAssets: getAssets(),
		currentStageId: newSession.currentStageId,
	});

	if (!gameLoopInterval) {
		gameLoopInterval = setInterval(() => gameLoop(io), GAME.TICK_RATE);
	}
};

export const endGame = (io: Server, session: GameSession): void => {
	io.to(session.socketId).emit('game:end', {
		score: session.score,
		isGameOver: session.isGameOver,
		isStageCompleted: session.isStageCompleted,
	});

	delete activeSessions[session.userId];
	console.log(`게임 세션 종료: ${session.userId}`);

	if (Object.keys(activeSessions).length === 0) {
		if (gameLoopInterval) {
			clearInterval(gameLoopInterval);
			gameLoopInterval = null;
			console.log('모든 게임 세션이 종료되어 게임 루프를 중단합니다.');
		}
	}
};

// 다음 스테이지로 이동하는 핸들러
export const nextStageHandler = (io: Server, socket: Socket, payload: { userId: string }) => {
	const session = activeSessions[payload.userId];
	if (!session) {
		socket.emit('game:error', { message: '세션을 찾을 수 없습니다.' });
		return;
	}

	if (!session.isStageCompleted) {
		socket.emit('game:error', { message: '현재 스테이지가 아직 완료되지 않았습니다.' });
		return;
	}

	// 다음 스테이지로 이동
	session.currentStageId++;
	const nextStageData = getStageData(session.currentStageId);

	if (!nextStageData) {
		// 모든 스테이지를 클리어한 경우
		session.isGameOver = true; // 또는 다른 게임 종료 상태로 처리
		endGame(io, session);
		socket.emit('game:end', {
			message: '모든 스테이지를 클리어했습니다! 축하합니다!',
			isGameOver: true,
			score: session.score,
		});
		return;
	}

	const assets = getAssets();
	const newUnlocks = assets.animalUnlocks.find(
		(unlock) => unlock.stageId === session.currentStageId,
	);
	if (newUnlocks) {
		// 기존 해금된 동물 목록에 새로운 동물 추가
		session.unlockedAnimals = Array.from(
			new Set([...session.unlockedAnimals, ...newUnlocks.unlockedAnimals]),
		);
	}

	// 세션 상태 초기화
	session.isStageCompleted = false;
	session.monsterSpawnQueue = [...nextStageData.waves];
	session.currentWaveIndex = 0;
	session.monstersSpawnedInWave = 0;

	// 클라이언트에게 다음 스테이지 시작을 알림 (선택적)
	socket.emit('game:stage_started', {
		currentStageId: session.currentStageId,
		userGold: session.gold,
	});

	console.log(`${payload.userId}가 다음 스테이지(${session.currentStageId})로 이동합니다.`);
};
