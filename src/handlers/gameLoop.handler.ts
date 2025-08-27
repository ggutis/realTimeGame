import { Server } from 'socket.io';
import { activeSessions, endGame } from './game.handler';
import { spawnBossForSession, spawnMonstersForSession } from './monster.handler';
import { getAssets } from '../init/assets';
import { ActiveAnimal, ActiveMonster } from '../types/data';
import { GAME } from '../constants';
import { calcDistance, findClosestTarget, isMeet } from './helper';
import { completeStage, getStageData } from './stage.handler';

// 게임 루프: 고정된 간격으로 게임 상태를 업데이트하고 클라이언트에 보냅니다.
export const gameLoop = (io: Server): void => {
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

			const UNIT_BUFFER_DISTANCE = 10;
			// 몬스터 간의 최소 간격을 정의합니다.
			const MONSTER_BUFFER_DISTANCE = 10;

			// 2. 유닛과 몬스터 전투 로직
			for (const animal of Object.values(session.activeAnimals)) {
				const animalData = getAssets().animals[animal.animalId];
				if (!animalData) continue;

				// 공격 쿨타임 감소
				animal.attackSpeed -= GAME.TICK_RATE;

				// 가장 가까운 몬스터 찾기
				let nearestMonster: ActiveMonster | null = null;
				let minDistanceToMonster = Infinity;

				for (const monster of Object.values(session.activeMonsters)) {
					const distance = calcDistance(animal.position, monster.position);
					if (distance < minDistanceToMonster) {
						minDistanceToMonster = distance;
						nearestMonster = monster;
					}
				}

				// 가장 가까운 아군 유닛 찾기
				let nearestFriendlyAnimal: ActiveAnimal | null = null;
				let minDistanceToFriendly = Infinity;

				for (const otherAnimal of Object.values(session.activeAnimals)) {
					if (otherAnimal.id === animal.id) continue; // 자기 자신 제외

					const distance = calcDistance(animal.position, otherAnimal.position);
					// 몬스터와 더 가까운 다른 유닛을 찾음
					if (distance < minDistanceToFriendly && otherAnimal.position.x > animal.position.x) {
						minDistanceToFriendly = distance;
						nearestFriendlyAnimal = otherAnimal;
					}
				}

				if (nearestMonster) {
					// 몬스터가 유닛 사정거리 안에 있는지 확인
					if (minDistanceToMonster <= animalData.range) {
						// 사정거리 안에 들어오면 유닛의 이동을 멈춥니다.
						animal.isMoving = false;
						// 공격 쿨타임이 0 이하가 되면 공격
						if (animal.attackSpeed <= 0) {
							// 몬스터 공격
							// battle(animal, nearestMonster)
							nearestMonster.health -= animalData.damage;

							animal.attackSpeed = animalData.attackSpeed; // 공격 쿨타임 재설정
						}
					} else if (nearestFriendlyAnimal?.type === animal.type && minDistanceToFriendly < UNIT_BUFFER_DISTANCE) {
						// 앞에 다른 유닛이 있고 너무 가까우면 이동 멈춤
						animal.isMoving = false;
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
					const containerWidth = 700;
					if (animal.position.x > containerWidth) {
						animal.position.x = containerWidth;
						animal.isMoving = false;
					}
				}
			}

			// 몬스터 이동 및  공격
			for (const monster of Object.values(session.activeMonsters)) {
				const monsterData = getAssets().monsters[monster.monsterId];
				if (!monsterData) continue;

				monster.attackSpeed -= GAME.TICK_RATE;

				const closestTarget = findClosestTarget(
					monster.position,
					Object.values(session.activeAnimals),
				);
				if (closestTarget) {
					const distance = calcDistance(monster.position, closestTarget.position);
					if (distance <= monsterData.range) {
						if (monster.attackSpeed <= 0) {
							closestTarget.health -= monsterData.damage;
						}
					}
				} else {
					// 공격할 유닛이 없는 경우, 기지를 향해 이동
					monster.position.x -= (monsterData.moveSpeed * GAME.TICK_RATE) / 1000;
				}

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
				// 가장 가까운 유닛 찾기
				let nearestAnimal: ActiveAnimal | null = null;
				let minDistanceToAnimal = Infinity;
				for (const animal of Object.values(session.activeAnimals)) {
					const distance = calcDistance(monster.position, animal.position);
					if (distance < minDistanceToAnimal) {
						minDistanceToAnimal = distance;
						nearestAnimal = animal;
					}
				}
				// 가장 가까운 아군 몬스터 찾기
				let nearestFriendlyMonster: ActiveMonster | null = null;
				let minDistanceToFriendly = Infinity;
				for (const otherMonster of Object.values(session.activeMonsters)) {
					if (otherMonster.id === monster.id) continue; // 자기 자신 제외

					const distance = calcDistance(monster.position, otherMonster.position);
					// 기지(왼쪽)에 더 가까운 다른 몬스터를 찾음
					if (distance < minDistanceToFriendly && otherMonster.position.x < monster.position.x) {
						minDistanceToFriendly = distance;
						nearestFriendlyMonster = otherMonster;
					}
				}
				if (nearestAnimal) {
					// 유닛이 몬스터의 공격 범위 내에 있으면 이동 멈춤
					if (minDistanceToAnimal <= monsterData.range) {
						// 공격 범위 내에 있으면 공격
						// ...
					} else if (nearestFriendlyMonster && minDistanceToFriendly < MONSTER_BUFFER_DISTANCE) {
						// 앞에 다른 몬스터가 있고 너무 가까우면 이동 멈춤
						monster.isMoving = false;
					} else {
						// 유닛을 향해 이동
						const directionX = nearestAnimal.position.x - monster.position.x;
						const directionY = nearestAnimal.position.y - monster.position.y;
						const angle = Math.atan2(directionY, directionX);

						monster.position.x += (monsterData.moveSpeed * Math.cos(angle) * GAME.TICK_RATE) / 1000;
						monster.position.y += (monsterData.moveSpeed * Math.sin(angle) * GAME.TICK_RATE) / 1000;
					}
				} else {
					// 주변에 유닛이 없으면 기지로 이동
					if (nearestFriendlyMonster && minDistanceToFriendly < MONSTER_BUFFER_DISTANCE) {
						// 앞에 다른 몬스터가 있고 너무 가까우면 이동 멈춤
						monster.isMoving = false;
					} else {
						monster.position.x -= (monsterData.moveSpeed * GAME.TICK_RATE) / 1000;
					}
				}
			}

			// 몬스터 사망 처리 및 골드/점수 획득
			const deadMonsters = Object.values(session.activeMonsters).filter((m) => m.health <= 0);
			for (const monster of deadMonsters) {
				delete session.activeMonsters[monster.id];
				const monsterData = getAssets().monsters[monster.monsterId];
				if (monsterData) {
					session.gold += monsterData.goldDrop;
					session.score += monsterData.score;
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

			const stage = getStageData(session.currentStageId);
			const allWavesDone = session.monsterSpawnQueue.length === 0 && !session.isSpawning;

			if (allWavesDone && !session.bossSpawned && Object.keys(session.activeMonsters).length === 0) {
				spawnBossForSession(session);
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
