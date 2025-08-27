import { Animal, Monster, Wave, ActiveAnimal, ActiveMonster, ActiveBossMonster } from '../types/data.d';

export class GameSession {
    public userId: string;
    public socketId: string;
    public score: number;
    public gold: number;
    public baseHealth: number;
    public activeAnimals: Record<string, ActiveAnimal>;
    public activeMonsters: Record<string, ActiveMonster>;
    public unlockedAnimals: string[];
    public currentStageId: number;
    public currentWaveIndex: number;
    public isSpawning: boolean;
    public monsterSpawnQueue: Wave[];
    public isGameOver: boolean;
    public isStageCompleted: boolean;
    public spawnTimer: NodeJS.Timeout | null;
    public monstersSpawnedInWave: number; // 현재 웨이브에서 소환된 몬스터 수
    public damageEvents: { targetId: string; damage: number }[];
    public bossMonsters: Record<string, ActiveBossMonster>;

    constructor(userId: string) {
        this.userId = userId;
        this.socketId = '';
        this.score = 0;
        this.gold = 100; // 임시 초기 골드
        this.baseHealth = 100;
        this.activeAnimals = {};
        this.activeMonsters = {};
        this.unlockedAnimals = []; // 해금된 동물들을 저장하는 배열
        this.currentStageId = 1;
        this.currentWaveIndex = 0;
        this.isSpawning = false;
        this.monsterSpawnQueue = [];
        this.isGameOver = false;
        this.isStageCompleted = false;
        this.spawnTimer = null;
        this.monstersSpawnedInWave = 0;
        this.damageEvents = [];
        this.bossMonsters = {};

    }
}
