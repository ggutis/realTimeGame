import { getAssets } from '../init/assets.js';
import { Stage } from '../types/data.d';
import { GameSession } from '../models/game.session.js';


export function getStageData(stageId: number | string): Stage | undefined {
    const assets = getAssets();
    return assets.stages[stageId.toString()];
}



// 스테이지 완료 처리
export function completeStage(session: GameSession) {
    session.isStageCompleted = true;
    console.log(`스테이지 ${session.currentStageId} 완료!`);
}

// 스테이지 이동 처리
export function moveStageHandler(session: GameSession, nextStageId: number | string): boolean {
    const nextStage = getStageData(nextStageId);
    if (!nextStage) {
        console.warn(`스테이지 데이터를 찾을 수 없습니다: ${nextStageId}`);
        return false;
    }
    session.currentStageId = typeof nextStageId === 'string' ? parseInt(nextStageId, 10) : nextStageId;
    session.currentWaveIndex = 0;
    session.monsterSpawnQueue = [...nextStage.waves];
    session.isStageCompleted = false;
    session.isSpawning = false;
    session.activeMonsters = {};
    session.activeAnimals = {};
    console.log(`스테이지가 ${session.currentStageId}로 이동되었습니다.`);
    return true;
}