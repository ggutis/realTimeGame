type AnimalType = 'ranged' | 'melee';

// 동물(유닛) 데이터
export interface Animal {
	id: string;
	name: string;
	cost: number;
	health: number;
	damage: number;
	attackSpeed: number;
	moveSpeed: number;
	range: number;
	type: string;
}

// 몬스터(침략자) 데이터
export interface Monster {
	id: string;
	name: string;
	health: number;
	damage: number;
	moveSpeed: number;
	attackSpeed: number;
	goldDrop: number;
	range: number;
	score: number;
	isBoss: boolean;
}

export interface BossMonster {
	id: string;
	name: string;
	health: number;
	damage: number;
	moveSpeed: number;
	attackSpeed: number;
	goldDrop: number;
	range: number;
	score: number;
	isBoss: boolean;
}


// 스테이지 웨이브 데이터
export interface Wave {
	monsterId: string;
	count: number;
	delay: number;
}

// 스테이지 보스 데이터
export interface Boss {
	monsterId: string;
	healthMultiplier: number;
	damageMultiplier: number;
}

// 스테이지 데이터
export interface Stage {
	id: number;
	name: string;
	waves: Wave[];
	boss: Boss;
	startGold: number;
}

// 스테이지 해금 데이터
export interface StageUnlock {
	stageId: number;
	unlockedAnimals: string[];
}

// 모든 게임 자산의 구조
export interface GameAssets {
	animals: Record<string, Animal>;
	monsters: Record<string, Monster>;
	stages: Record<string, Stage>;
	animalUnlocks: animalUnlocks[]; // 변수명 변경: stageUnlocks -> animalUnlocks
}

// 게임 내에서 동적으로 생성되는 유닛/몬스터 객체
export interface Position {
	x: number;
	y: number;
}

export interface ActiveAnimal {
	id: string;
	animalId: string;
	health: number;
	position: Position;
	attackSpeed: number;
	isMoving: boolean;
	targetId: string | null;
	damage: number;
	type: string;
}

export interface ActiveMonster {
	id: string;
	monsterId: string;
	health: number;
	position: Position;
	moveSpeed: number;
	attackSpeed: number;
	goldDrop: number;
	isAlive: boolean;
	isMoving: boolean;
	damage: number;
	score: number;
	isBoss: boolean;
}

export interface ActiveBossMonster {
	id: string;
	monsterId: string;
	health: number;
	position: Position;
	moveSpeed: number;
	attackSpeed: number;
	goldDrop: number;
	isAlive: boolean;
	isMoving: boolean;
	damage: number;
	score: number;
	isBoss: boolean;
}

export interface DamageEvent {
	targetId: string;
	damage: number;
	position: Position;
}

export interface Damage {
	targetId: string;
	damage:number
}
export interface Damage {
	targetId: string;
	damage:number
}

