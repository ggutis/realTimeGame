import { Server, Socket } from 'socket.io';
import { GameStartPayload, SummonUnitPayload } from '../types/payloads.d';
import { startGame } from './game.handler';
import { summonUnit } from './unit.handler';
import { nextStageHandler } from './stage.handler';

// 이벤트 핸들러를 관리하는 중앙 집중식 매핑
export const handlerMapping = (io: Server, socket: Socket) => {
	// 게임 시작
	socket.on('game:start', (payload: GameStartPayload) => {
		startGame(socket, io, payload);
	});

	// 유닛 소환
	socket.on('game:summon', (payload: SummonUnitPayload) => {
		summonUnit(socket, payload);
	});

	// 다음 스테이지로 이동
	socket.on('game:next_stage', (payload) => {
		nextStageHandler(io, socket, payload);
	});

	// 다른 게임 관련 이벤트 핸들러들을 여기에 추가할 수 있습니다.
	// 예: socket.on('game:action', (payload) => { ... });
};

export default handlerMapping;
