import { Server } from 'socket.io';
import { endGame, getSession, saveSession } from './game.handler';
import { spawnMonstersForSession } from './monster.handler';
import { redisClient } from '../app';
import { handleAnimalLogic } from './gameLoop/gameLoopAnimal.handler';
import { handleMonsterLogic } from './gameLoop/gameLoopMonster.handler';
import { handleBattle } from './gameLoop/gameLoopBattle.handler';
import { handleStage } from './gameLoop/gameLoopStage.handler';
import { GameStateUpdate } from "../generated/game";
import { GameSession } from '../models/game.session';

// 게임 루프: 고정된 간격으로 게임 상태를 업데이트하고 클라이언트에 보냅니다.
export const gameLoop = async (io: Server): Promise<void> => {
    const sessionKeys = await redisClient.keys('session:*');

    for (const sessionKey of sessionKeys) {
        try {
            const sessionId = sessionKey.replace('session:', '');
            const session = await getSession(sessionId);

            if (!session) {
                continue;
            }

            if (session.isGameOver) {
                endGame(io, session);
                continue;
            }
            if (session.isStageCompleted) {
                continue;
            }

            spawnMonstersForSession(session);

            handleAnimalLogic(session);

            handleMonsterLogic(session);

            handleBattle(session);

            if (await handleStage(session, io)) {
                continue; // Stage is completed, so skip to next session
            }

            await saveSession(session);

            io.to(session.socketId).emit('game:state_update', {
                animals: Object.values(session.activeAnimals),
                monsters: Object.values(session.activeMonsters),
                gold: session.gold,
                baseHealth: session.baseHealth,
                score: session.score,
                damageEvents: session.damageEvents,
            });
            session.damageEvents = [];
        } catch (error) {
            console.error(`게임 루프 중 오류 발생: ${error}`);
        }
    }
};