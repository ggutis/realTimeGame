import { Server, Socket } from 'socket.io';
import { startGame, summonUnit } from '../handlers/game.handler.js';
import { moveStageHandler } from '../handlers/stage.handler.js';

export function handleSocketEvents(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log(`새로운 소켓이 연결되었습니다: ${socket.id}`);

        socket.on('game:start', (payload) => {
            // 게임 시작 요청을 받으면 게임 루프를 시작하도록 수정
            startGame(socket, io, payload);
        });
        socket.on('game:summon', (payload) => summonUnit(socket, payload));
        socket.on('game:next_stage', (payload) => {
            // 다음 스테이지로 이동
            const session = Object.values(activeSessions).find(s => s.socketId === socket.id);
            if (session) {
                const nextStageId = payload.nextStageId;
                moveStageHandler(session, nextStageId);
            }
        });

        socket.on('disconnect', () => {
            console.log(`소켓이 연결이 끊어졌습니다: ${socket.id}`);
        });
    });
}
