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

export function findClosestTarget(source: Position, targets: ActiveAnimal[]): ActiveAnimal | null {
	let closestTarget: ActiveAnimal | null = null;
	let minDistance = Infinity;

	// 유닛 중에서 가장 가까운 타겟 찾기
	for (const target of targets) {
		const distance = calcDistance(source, target.position);
		if (distance < minDistance) {
			minDistance = distance;
			closestTarget = target;
		}
	}

	return closestTarget;
}
