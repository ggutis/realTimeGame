
import { GameSession } from '../../models/game.session';
import { spawnBossForSession } from '../monster.handler';
import { completeStage } from '../stage.handler';
import { saveSession } from '../game.handler';
import { Server } from 'socket.io';

export async function handleStage(session: GameSession, io: Server) {
    const allWavesDone = session.monsterSpawnQueue.length === 0 && !session.isSpawning;

    if (allWavesDone && !session.bossSpawned && Object.keys(session.activeMonsters).length === 0) {
        spawnBossForSession(session);
    }

    // 스테이지 완료 확인
    const isStageDone =
        !session.isSpawning &&
        session.monsterSpawnQueue.length === 0 &&
        Object.keys(session.activeMonsters).length === 0;

    if (isStageDone && session.currentWaveIndex > 0 && !session.isStageCompleted) {
        completeStage(session);

        // 스테이지 완료 후 Redis에 세션 저장
        await saveSession(session);

        io.to(session.socketId).emit('game:end', {
            score: session.score,
            isGameOver: false,
            isStageCompleted: true,
        });
        return true; // Stage is completed
    }
    return false; // Stage is not completed
}
