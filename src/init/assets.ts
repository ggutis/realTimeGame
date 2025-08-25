import fs from 'fs/promises';
import path from 'path';
import { GameAssets, Animal, Monster, Stage, StageUnlock } from '../types/data.d';

// ESM에서 __dirname을 더 이상 사용하지 않고, app.ts에서 경로를 전달받습니다.

let gameAssets: GameAssets = {
	animals: {},
	monsters: {},
	stages: {},
	animalUnlocks: [], // 변수명 변경
};

// assetsDir 매개변수를 추가하여 경로를 명확하게 전달받도록 수정합니다.
export async function loadAssets(assetsDir: string): Promise<void> {
	try {
		const animalData = await fs.readFile(path.join(assetsDir, 'animal.json'), 'utf-8');
		const monsterData = await fs.readFile(path.join(assetsDir, 'monster.json'), 'utf-8');
		const stageData = await fs.readFile(path.join(assetsDir, 'stage.json'), 'utf-8');
		const animalUnlockData = await fs.readFile(path.join(assetsDir, 'animal_unlock.json'), 'utf-8'); // 파일명 변경

		// 데이터를 ID 기반의 맵(map) 형태로 변환하여 빠른 접근을 가능하게 합니다.
		// JSON.parse의 결과가 배열인지 확인하고 처리 로직을 분기합니다.
		const parsedAnimals = JSON.parse(animalData);
		if (parsedAnimals.data && Array.isArray(parsedAnimals.data)) {
			gameAssets.animals = Object.fromEntries(
				parsedAnimals.data.map((animal: any) => [animal.id.toString(), animal]),
			);
		} else {
			console.warn('animal.json is not in the expected { "data": [...] } format.');
			gameAssets.animals = {};
		}

		const parsedMonsters = JSON.parse(monsterData);
		if (parsedMonsters.data && Array.isArray(parsedMonsters.data)) {
			gameAssets.monsters = Object.fromEntries(
				parsedMonsters.data.map((monster: any) => [monster.id.toString(), monster]),
			);
		} else {
			console.warn('monster.json is not in the expected { "data": [...] } format.');
			gameAssets.monsters = {};
		}

		const parsedStages = JSON.parse(stageData);
		if (parsedStages.data && Array.isArray(parsedStages.data)) {
			// console.log('parsedStages.data:', parsedStages.data); // 배열 내용 확인
			parsedStages.data.forEach((stage: any, idx: number) => {
				// console.log(`stage[${idx}].id:`, stage.id);
			});
			gameAssets.stages = Object.fromEntries(
				parsedStages.data
					.filter((stage: any) => stage && stage.id !== undefined)
					.map((stage: any) => [stage.id.toString(), stage]),
			);
			// console.log('Loaded stages:', Object.keys(gameAssets.stages)); // 실제 키 확인
		} else {
			console.warn('stage.json is not in the expected { "data": [...] } format.');
			gameAssets.stages = {};
		}

		const parsedAnimalUnlocks = JSON.parse(animalUnlockData);
		if (parsedAnimalUnlocks.data && Array.isArray(parsedAnimalUnlocks.data)) {
			gameAssets.animalUnlocks = parsedAnimalUnlocks.data;
		} else {
			console.warn('animal_unlock.json is not in the expected { "data": [...] } format.');
			gameAssets.animalUnlocks = [];
		}

		console.log('Game assets loaded successfully.');
		console.log(`Loaded ${Object.keys(gameAssets.animals).length} animals.`);
		console.log(`Loaded ${Object.keys(gameAssets.monsters).length} monsters.`);
		console.log(`Loaded ${Object.keys(gameAssets.stages).length} stages.`);
		console.log(`Loaded ${gameAssets.animalUnlocks.length} animal unlock entries.`);
	} catch (error) {
		console.error('Failed to load game assets:', error);
	}
}

export function getAssets(): GameAssets {
	return gameAssets;
}
