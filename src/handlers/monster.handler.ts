import { getAssets } from "../init/assets.js";
import { GameSession } from "../models/game.session.js";
import { ActiveMonster } from "../types/data.js";
import { getStageData } from "./stage.handler.js";
import { v4 as uuid } from 'uuid'





// 몬스터 웨이브 소환 로직
export const spawnMonstersForSession = (session: GameSession): void => {
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
						attackSpeed: monsterData.attackSpeed,
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
