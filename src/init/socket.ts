import { Server, Socket } from 'socket.io';
import { startGame, summonUnit, endGame, activeSessions, nextStageHandler } from '../handlers/game.handler.js';
import { moveStageHandler } from '../handlers/stage.handler.js';

export function handleSocketEvents(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log(`새로운 소켓이 연결되었습니다: ${socket.id}`);

        socket.on('game:start', (payload) => {
            startGame(socket, io, payload);
        });

        socket.on('game:summon', (payload) => summonUnit(socket, payload));

        socket.on('game:next_stage', (payload) => {
            // 다음 스테이지로 이동
            const session = Object.values(activeSessions).find(s => s.socketId === socket.id);
            if (session) {
                const nextStageId = payload.nextStageId;
                nextStageHandler(io, socket, { userId: session.userId });
            }
        });

        socket.on('disconnect', () => {
            console.log(`소켓 연결이 끊어졌습니다: ${socket.id}`);
            // 연결이 끊긴 소켓에 해당하는 세션 찾기
            const session = Object.values(activeSessions).find(s => s.socketId === socket.id);
            if (session) {
                // 세션 종료 처리
                endGame(io, session);
            }
        });
    });
}
