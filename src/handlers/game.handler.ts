import { v4 as uuid } from 'uuid';
import { Server, Socket } from 'socket.io';
import { getAssets } from '../init/assets';
import { GameSession } from '../models/game.session';
import { GAME } from '../constants';
import { GameStartPayload } from '../types/payloads.d';
import { getStageData } from './stage.handler';
import { gameLoop } from './gameLoop.handler';
import { redisClient } from '../app';
import { updateLeaderboard } from './ranking.handler';

// 모든 활성 게임 세션을 저장합니다.
// export const activeSessions: Record<string, GameSession> = {};
let gameLoopInterval: NodeJS.Timeout | null = null;

// Redis에서 모든 활성 세션의 개수를 가져오는 함수
export const getActiveSessionCount = async(): Promise<number> => {
	const sessionKey = await redisClient.keys('session:*');
	return sessionKey.length;
};

// Redis에 게임 세션 정보 저장
export const saveSession =  async (session : GameSession): Promise<void> => {
	const sessionData = { ...session, spawnTimer: undefined };
	await redisClient.set(`session:${session.socketId}`, JSON.stringify(sessionData));
};

// Redis에서 게임 세션 정보 불러오기
export const getSession = async (socketId: string): Promise<GameSession | null> => {
	const sessionData = await redisClient.get(`session:${socketId}`);
	if (sessionData) {
		const parsedData = JSON.parse(sessionData);
		// GameSession 객체를 재구성하여 반환
		const session = new GameSession(parsedData.userId);

		// JSON으로 저장된 나머지 속성들을 복원
		Object.assign(session, parsedData);
		
		return session;
	}
	return null;
};

// Redis에서 게임 세션 정보 삭제
export const deleteSession = async (socketId: string): Promise<void> => {
	await redisClient.del(`session:${socketId}`);
};



export const startGame = async (socket: Socket, io: Server, payload: GameStartPayload): Promise<void> => {
	if (gameLoopInterval) {
		clearInterval(gameLoopInterval);
		gameLoopInterval = null;
	}

	const newSession = new GameSession(payload.userId || uuid());
	newSession.socketId = socket.id;
	
	// 메모리 대신 Redis에 세션 정보 저장
	await saveSession(newSession);

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

	// Redis에 업데이트된 세션 정보 다시 저장
	await saveSession(newSession);

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

export const endGame = async (io: Server, session: GameSession): Promise<void> => {
	io.to(session.socketId).emit('game:end', {
		score: session.score,
		isGameOver: session.isGameOver,
		isStageCompleted: session.isStageCompleted,
	});

	// 게임 종료 시 최종 점수를 순위표에 업데이트합니다.
	await updateLeaderboard(session.userId, session.score); // <-- 추가

	// Redis에서 세션 정보 삭제
	await deleteSession(session.socketId);
	console.log(`게임 세션 종료: ${session.userId}`);

	// Redis에서 활성 세션 수를 확인하여 게임 루프 중단
	const activeSessionCount = await getActiveSessionCount();
	if (activeSessionCount === 0) {
		if (gameLoopInterval) {
			clearInterval(gameLoopInterval);
			gameLoopInterval = null;
			console.log('모든 게임 세션이 종료되어 게임 루프를 중단합니다.');
		}
	}
};
