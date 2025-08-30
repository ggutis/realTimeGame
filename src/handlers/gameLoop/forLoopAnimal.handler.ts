
import { ActiveAnimal, ActiveMonster, DamageEvent } from '../../types/data';
import { getAssets } from '../../init/assets';
import { GAME } from '../../constants';
import { calcDistance } from '../helper';

export function handleAnimalLogic(session: {
    activeAnimals: { [key: string]: ActiveAnimal };
    activeMonsters: { [key: string]: ActiveMonster };
    damageEvents: DamageEvent[];
}) {
    const UNIT_BUFFER_DISTANCE = 10;

    for (const animal of Object.values(session.activeAnimals)) {
        const animalData = getAssets().animals[animal.animalId];
        if (!animalData) continue;

        animal.attackSpeed -= GAME.TICK_RATE;

        let nearestMonster: ActiveMonster | null = null;
        let minDistanceToMonster = Infinity;

        for (const monster of Object.values(session.activeMonsters)) {
            const distance = calcDistance(animal.position, monster.position);
            if (distance < minDistanceToMonster) {
                minDistanceToMonster = distance;
                nearestMonster = monster;
            }
        }

        let nearestFriendlyAnimal: ActiveAnimal | null = null;
        let minDistanceToFriendly = Infinity;

        for (const otherAnimal of Object.values(session.activeAnimals)) {
            if (otherAnimal.id === animal.id) continue;

            const distance = calcDistance(animal.position, otherAnimal.position);
            if (distance < minDistanceToFriendly && otherAnimal.position.x > animal.position.x) {
                minDistanceToFriendly = distance;
                nearestFriendlyAnimal = otherAnimal;
            }
        }

        if (nearestMonster) {
            if (minDistanceToMonster <= animalData.range) {
                animal.isMoving = false;
                if (animal.attackSpeed <= 0) {
                    nearestMonster.health -= animalData.damage;
                    const damageEvent: DamageEvent = {
                        targetId: nearestMonster.id,
                        damage: animalData.damage,
                        position: nearestMonster.position,
                    };
                    session.damageEvents.push(damageEvent);
                    animal.attackSpeed = animalData.attackSpeed;
                }
            } else if (nearestFriendlyAnimal?.type === animal.type && minDistanceToFriendly < UNIT_BUFFER_DISTANCE) {
                animal.isMoving = false;
            } else {
                animal.isMoving = true;
                animal.position.x += (animalData.moveSpeed * GAME.TICK_RATE) / 1000;
            }
        } else {
            animal.isMoving = true;
            animal.position.x += (animalData.moveSpeed * GAME.TICK_RATE) / 1000;

            const containerWidth = 700;
            if (animal.position.x > containerWidth) {
                animal.position.x = containerWidth;
                animal.isMoving = false;
            }
        }
    }
}
