
import { ActiveAnimal, ActiveMonster } from '../../types/data';
import { getAssets } from '../../init/assets';
import { GAME } from '../../constants';
import { calcDistance, findClosestTarget, isMeet } from '../helper';

export function handleMonsterLogic(session: {
    activeAnimals: { [key: string]: ActiveAnimal };
    activeMonsters: { [key: string]: ActiveMonster };
    baseHealth: number;
}) {
    const MONSTER_BUFFER_DISTANCE = 10;

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
            monster.position.x -= (monsterData.moveSpeed * GAME.TICK_RATE) / 1000;
        }

        const isBlocked = Object.values(session.activeAnimals).some((animal) =>
            isMeet(animal, monster),
        );

        if (!isBlocked) {
            monster.position.x -= (monsterData.moveSpeed * GAME.TICK_RATE) / 1000;
        }

        if (monster.position.x <= 50) {
            session.baseHealth -= monsterData.damage;
            delete session.activeMonsters[monster.id];
            console.log(`몬스터 ${monster.id}가 기지에 도달. 남은 기지 체력: ${session.baseHealth}`);
        }

        let nearestAnimal: ActiveAnimal | null = null;
        let minDistanceToAnimal = Infinity;
        for (const animal of Object.values(session.activeAnimals)) {
            const distance = calcDistance(monster.position, animal.position);
            if (distance < minDistanceToAnimal) {
                minDistanceToAnimal = distance;
                nearestAnimal = animal;
            }
        }

        let nearestFriendlyMonster: ActiveMonster | null = null;
        let minDistanceToFriendly = Infinity;
        for (const otherMonster of Object.values(session.activeMonsters)) {
            if (otherMonster.id === monster.id) continue;

            const distance = calcDistance(monster.position, otherMonster.position);
            if (distance < minDistanceToFriendly && otherMonster.position.x < monster.position.x) {
                minDistanceToFriendly = distance;
                nearestFriendlyMonster = otherMonster;
            }
        }

        if (nearestAnimal) {
            if (minDistanceToAnimal <= monsterData.range) {
                // Attack
            } else if (nearestFriendlyMonster && minDistanceToFriendly < MONSTER_BUFFER_DISTANCE) {
                monster.isMoving = false;
            } else {
                const directionX = nearestAnimal.position.x - monster.position.x;
                const directionY = nearestAnimal.position.y - monster.position.y;
                const angle = Math.atan2(directionY, directionX);

                monster.position.x += (monsterData.moveSpeed * Math.cos(angle) * GAME.TICK_RATE) / 1000;
                monster.position.y += (monsterData.moveSpeed * Math.sin(angle) * GAME.TICK_RATE) / 1000;
            }
        } else {
            if (nearestFriendlyMonster && minDistanceToFriendly < MONSTER_BUFFER_DISTANCE) {
                monster.isMoving = false;
            } else {
                monster.position.x -= (monsterData.moveSpeed * GAME.TICK_RATE) / 1000;
            }
        }
    }
}
