import { getAssets } from '../init/assets';
import { GameSession } from '../models/game.session';
import { ActiveMonster } from '../types/data';
import { getStageData } from './stage.handler';
import { v4 as uuid } from 'uuid';

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
						score: monsterData.score,
						isBoss: false,
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

export const spawnBossForSession = (session: GameSession): void => {
    const stage = getStageData(session.currentStageId);
    if (!stage || !stage.boss) return;

    const bossData = getAssets().monsters[stage.boss.monsterId];
    if (!bossData) return;

    const bossId = uuid();
    const newBoss: ActiveMonster = {
        id: bossId,
        monsterId: bossData.id,
        health: bossData.health * stage.boss.healthMultiplier,
        damage: bossData.damage * stage.boss.damageMultiplier,
        moveSpeed: bossData.moveSpeed,
        attackSpeed: bossData.attackSpeed,
        goldDrop: bossData.goldDrop,
        score: bossData.score,
        isBoss: true,
        isAlive: true,
        isMoving: true,
        position: {
            x: 800,
            y: 450, // 중앙에 위치
        },
    };

    session.activeMonsters[bossId] = newBoss;
    session.bossSpawned = true;
};

