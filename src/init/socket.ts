import { Server, Socket } from 'socket.io';
import { startGame, endGame, getSession } from '../handlers/game.handler';
import { summonUnit } from '../handlers/unit.handler';
import { nextStageHandler } from '../handlers/stage.handler';
import { getLeaderboard } from '../handlers/ranking.handler';

export function handleSocketEvents(io: Server) {
	io.on('connection', (socket: Socket) => {
		console.log(`새로운 소켓이 연결되었습니다: ${socket.id}`);

		socket.on('game:start', (payload) => {
			startGame(socket, io, payload);
		});

		socket.on('game:summon', (payload) => summonUnit(socket, payload));

		socket.on('game:next_stage', async (payload) => {
			// 다음 스테이지로 이동
			const session = await getSession(socket.id);
			if (session) {
				const nextStageId = payload.nextStageId;
				nextStageHandler(io, socket, { userId: session.userId });
			}
		});

        // 랭킹 조회 이벤트 핸들러
        socket.on('ranking:get', async (payload) => {
                        const leaderboard = await getLeaderboard(payload?.count || 10);
                        socket.emit('ranking:update', { leaderboard });
        });

		socket.on('disconnect', async () => {
			console.log(`소켓 연결이 끊어졌습니다: ${socket.id}`);
			// 연결이 끊긴 소켓에 해당하는 세션 찾기
			const session = await getSession(socket.id);
			if (session) {
				// 세션 종료 처리
				endGame(io, session);
			}
		});
	});
}
