import { getAssets } from '../init/assets';
import { GameSession } from '../models/game.session';
import { ActiveMonster } from '../types/data';
import { getStageData } from './stage.handler';
import { v4 as uuid } from 'uuid';

// 몬스터 웨이브 소환 로직
export const spawnMonstersForSession = (session: GameSession): void => {
	const currentStage = getStageData(session.currentStageId);

	  if (!currentStage) {
        return;
    }


	if (!session.isSpawning && session.monsterSpawnQueue.length > 0 && currentStage) {
		const wave = session.monsterSpawnQueue.shift();
		if (wave) {
			session.isSpawning = true;
			session.currentWaveIndex++;
			session.monstersSpawnedInWave = 0;
			session.lastMonsterSpawnTime = Date.now(); // 첫 소환 시간 기록
		}
	}

	// 현재 웨이브가 진행 중일 때만 몬스터 소환 로직 실행
	if (session.isSpawning) {
		const currentWave = currentStage.waves[session.currentWaveIndex - 1];

		// 다음 몬스터를 소환할 시간이 되었는지 확인
		if (Date.now() - session.lastMonsterSpawnTime >= currentWave.delay) {
			if (session.monstersSpawnedInWave >= currentWave.count) {
				session.isSpawning = false;
				return;
			}
			const monsterData = getAssets().monsters[currentWave.monsterId];
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
						y: 500,
					},
				};
				session.activeMonsters[monsterId] = newMonster;
				session.monstersSpawnedInWave++;
				session.lastMonsterSpawnTime = Date.now(); // 몬스터 소환 후 시간 업데이트
			}
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
            y: 480,
        },
    };

    session.activeMonsters[bossId] = newBoss;
    session.bossSpawned = true;
};

