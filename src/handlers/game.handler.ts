import { v4 as uuid } from 'uuid';
import { Server, Socket } from 'socket.io';
import { getAssets } from '../init/assets.js';
import { GameSession } from '../models/game.session.js';
import { GAME } from '../constants.js';
import {
	ActiveAnimal,
	ActiveMonster,
	Animal,
	StageUnlock,
	Stage,
	Monster,
} from '../types/data.d';
import { GameStartPayload, SummonUnitPayload } from '../types/payloads.d';
import { isMeet, battle } from '../handlers/helper.js'; // isMeet 함수 추가
import { isWaveCompleted, getStageData, completeStage } from './stage.handler.js';
import { moveStageHandler } from './stage.handler.js'; // stage.handler에서 moveStageHandler 가져오기

// 모든 활성 게임 세션을 저장합니다.
const activeSessions: Record<string, GameSession> = {};
let gameLoopInterval: NodeJS.Timeout | null = null;

// 게임 루프: 고정된 간격으로 게임 상태를 업데이트하고 클라이언트에 보냅니다.
const gameLoop = (io: Server): void => {
	// 모든 활성 세션을 순회합니다.
	for (const sessionId in activeSessions) {
		try {
			const session = activeSessions[sessionId];

			// 게임 종료 또는 스테이지 클리어 상태일 경우 로직 스킵하고 정리
			if (session.isGameOver || session.isStageCompleted) {
				endGame(io, session);
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
					const monsterData = getAssets().monsters[targetMonster.monsterId];

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
						animal.position.x += animalData.moveSpeed * GAME.TICK_RATE / 1000;
					}
				} else {
					// 주변에 몬스터가 없으면 이동
					animal.isMoving = true;
					animal.position.x += animalData.moveSpeed * GAME.TICK_RATE / 1000;
				}
			}

			// 몬스터 이동 및 기지 공격
			for (const monster of Object.values(session.activeMonsters)) {
				const monsterData = getAssets().monsters[monster.monsterId];
				if (!monsterData) continue;

				// 몬스터의 이동 방향 (기지쪽으로)
				// 유닛이 막고 있지 않으면 이동
				const isBlocked = Object.values(session.activeAnimals).some(animal =>
					isMeet(animal, monster)
				);

				if (!isBlocked) {
					monster.position.x -= monsterData.moveSpeed * GAME.TICK_RATE / 1000;
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
			const deadMonsters = Object.values(session.activeMonsters).filter(
				(m) => m.health <= 0,
			);
			for (const monster of deadMonsters) {
				delete session.activeMonsters[monster.id];
				const monsterData = getAssets().monsters[monster.monsterId];
				if (monsterData) {
					session.gold += monsterData.goldDrop;
					session.score += 10;
				}
			}

			// 유닛 사망 처리
			const deadAnimals = Object.values(session.activeAnimals).filter(
				(a) => a.health <= 0,
			);
			for (const animal of deadAnimals) {
				delete session.activeAnimals[animal.id];
			}

			// 기지 체력 확인
			if (session.baseHealth <= 0) {
				session.isGameOver = true;
				console.log('게임 오버!');
			}

			// 웨이브 완료 확인
			if (isWaveCompleted(session)) {
				const currentStage = getStageData(session.currentStageId);
				if (
					currentStage &&
					session.currentWaveIndex < currentStage.waves.length
				) {
					session.isSpawning = false;
					session.monsterSpawnQueue.push(
						currentStage.waves[session.currentWaveIndex],
					);
					session.currentWaveIndex++;
				} else {
					completeStage(session);
				}
			}

			// 클라이언트에 게임 상태 업데이트 전송
			io.to(session.socketId).emit('game:state_update', {
				animals: Object.values(session.activeAnimals),
				monsters: Object.values(session.activeMonsters),
				gold: session.gold,
				baseHealth: session.baseHealth,
				score: session.score,
			});
		} catch (error) {
			console.error(`게임 루프 중 오류 발생: ${error}`);
		}
	}
};

const spawnMonstersForSession = (session: GameSession): void => {
	const currentStage = getStageData(session.currentStageId);

	if (
		!session.isSpawning &&
		session.monsterSpawnQueue.length > 0 &&
		currentStage
	) {
		const wave = session.monsterSpawnQueue.shift();
		if (wave) {
			session.isSpawning = true;
			session.monstersSpawnedInWave = 0;
			session.spawnTimer = setInterval(() => {
				if (session.monstersSpawnedInWave >= wave.count) {
					clearInterval(session.spawnTimer);
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
						position: {
							x: 800,
							y: Math.random() * 400 + 100, // 게임 화면에 맞게 Y 위치 조정
						},
					};
					session.activeMonsters[monsterId] = newMonster;
					session.monstersSpawnedInWave++;
				}
			}, wave.delay);
		}
	}
};

export const startGame = (
	socket: Socket,
	io: Server,
	payload: GameStartPayload,
): void => {
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
		animals: assets.animals,
		monsters: assets.monsters
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
		position: {
			x: payload.position.x,
			y: payload.position.y,
		},
	};
	session.activeAnimals[unitId] = newUnit;

	console.log(
		`유닛 ${animalData.name} (ID: ${unitId})가 소환되었습니다. 남은 골드: ${session.gold}`,
	);
};

