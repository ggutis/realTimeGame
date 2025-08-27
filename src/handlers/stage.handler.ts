import { getAssets } from '../init/assets.js';
import { Stage } from '../types/data.d';
import { GameSession } from '../models/game.session.js';
import { activeSessions, endGame } from './game.handler.js';
import { Server, Socket } from 'socket.io';

export function getStageData(stageId: number | string): Stage | undefined {
	const assets = getAssets();
	return assets.stages[stageId.toString()];
}

// 스테이지 완료 처리
export function completeStage(session: GameSession) {
	session.isStageCompleted = true;
	console.log(`스테이지 ${session.currentStageId} 완료!`);
}

// 다음 스테이지로 이동하는 핸들러
export const nextStageHandler = (io: Server, socket: Socket, payload: { userId: string }) => {
	const session = activeSessions[payload.userId];
	if (!session) {
		socket.emit('game:error', { message: '세션을 찾을 수 없습니다.' });
		return;
	}

	if (!session.isStageCompleted) {
		socket.emit('game:error', { message: '현재 스테이지가 아직 완료되지 않았습니다.' });
		return;
	}

	// 다음 스테이지로 이동
	session.currentStageId++;
	const nextStageData = getStageData(session.currentStageId);

	if (!nextStageData) {
		// 모든 스테이지를 클리어한 경우
		session.isGameOver = true; // 또는 다른 게임 종료 상태로 처리
		endGame(io, session);
		socket.emit('game:end', {
			message: '모든 스테이지를 클리어했습니다! 축하합니다!',
			isGameOver: true,
			score: session.score,
		});
		return;
	}

	const assets = getAssets();
	const newUnlocks = assets.animalUnlocks.find(
		(unlock) => unlock.stageId === session.currentStageId,
	);
	if (newUnlocks) {
		// 기존 해금된 동물 목록에 새로운 동물 추가
		session.unlockedAnimals = Array.from(
			new Set([...session.unlockedAnimals, ...newUnlocks.unlockedAnimals]),
		);
	}

	// 스테이지 시작 골드 초기화
	session.gold = nextStageData.startGold || 0;

	// 게임판 초기화: 몬스터와 유닛 제거
	session.activeMonsters = {};
	session.activeAnimals = {};

	// 세션 상태 초기화
	session.isStageCompleted = false;
	session.monsterSpawnQueue = [...nextStageData.waves];
	session.currentWaveIndex = 0;
	session.monstersSpawnedInWave = 0;

	// 클라이언트에게 다음 스테이지 시작을 알림 (선택적)
	socket.emit('game:stage_started', {
		currentStageId: session.currentStageId,
		userGold: session.gold,
		unlockedAnimals: session.unlockedAnimals,
	});

	console.log(`${payload.userId}가 다음 스테이지(${session.currentStageId})로 이동합니다.`);
};
