import { Position, ActiveAnimal, ActiveMonster } from '../types/data.d'; // 실제 타입 경로에 맞게 수정
import { getAssets } from '../init/assets.js';

export function calcDistance(posA: Position, posB: Position): number {
    return Math.hypot(posA.x - posB.x, posA.y - posB.y);
}

// 유닛과 몬스터가 만났는지 판정 (이제 공격 범위 내에 들어왔는지 확인)
export function isMeet(animal: ActiveAnimal, monster: ActiveMonster): boolean {
    const animalData = getAssets().animals[animal.animalId];
    if (!animalData) return false;
    
    // 유닛의 공격 범위(range) 안에 몬스터가 들어왔는지 확인
    const distance = calcDistance(animal.position, monster.position);
    return distance <= animalData.range;
}

// 전투 처리
export function battle(animal: ActiveAnimal, monster: ActiveMonster): void {

    if (isMeet(animal, monster)) {
        animal.health -= monster.damage;
        monster.health -= animal.damage;
    }
}
