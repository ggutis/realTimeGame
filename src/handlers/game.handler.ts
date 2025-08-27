import { v4 as uuid } from 'uuid';
import { Server, Socket } from 'socket.io';
import { getAssets } from '../init/assets.js';
import { GameSession } from '../models/game.session.js';
import { GAME } from '../constants.js';
import { GameStartPayload } from '../types/payloads.d';
import { getStageData } from './stage.handler.js';
import { gameLoop } from './gameLoop.handler.js';

// 모든 활성 게임 세션을 저장합니다.
export const activeSessions: Record<string, GameSession> = {};
let gameLoopInterval: NodeJS.Timeout | null = null;

export const startGame = (socket: Socket, io: Server, payload: GameStartPayload): void => {
	if (gameLoopInterval) {
		clearInterval(gameLoopInterval);
		gameLoopInterval = null;
	}

	const newSession = new GameSession(payload.userId || uuid());
	newSession.socketId = socket.id;
	activeSessions[newSession.userId] = newSession;

	newSession.currentStageId = 0;

	const stage1 = getStageData(0);
	if (stage1) {
		newSession.monsterSpawnQueue.push(...stage1.waves);
		// 스테이지 1의 시작 골드 설정
		newSession.gold = stage1.startGold;
	}

	const assets = getAssets();
	const unlockedAnimals =
		assets.animalUnlocks.find((unlock) => unlock.stageId === 0)?.unlockedAnimals || [];
	newSession.unlockedAnimals = unlockedAnimals;

	socket.emit('game:start_success', {
		unlockedAnimals: newSession.unlockedAnimals,
		userGold: newSession.gold,
		gameAssets: getAssets(),
		currentStageId: newSession.currentStageId,
	});

	if (!gameLoopInterval) {
		gameLoopInterval = setInterval(() => gameLoop(io), GAME.TICK_RATE);
	}
};

export const endGame = (io: Server, session: GameSession): void => {
	io.to(session.socketId).emit('game:end', {
		score: session.score,
		isGameOver: session.isGameOver,
		isStageCompleted: session.isStageCompleted,
	});

	delete activeSessions[session.userId];
	console.log(`게임 세션 종료: ${session.userId}`);

	if (Object.keys(activeSessions).length === 0) {
		if (gameLoopInterval) {
			clearInterval(gameLoopInterval);
			gameLoopInterval = null;
			console.log('모든 게임 세션이 종료되어 게임 루프를 중단합니다.');
		}
	}
};
