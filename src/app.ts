import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server, Socket } from 'socket.io';

import { loadAssets } from './init/assets';
import { handleSocketEvents } from './init/socket';
import { GAME } from './constants';
import Redis from 'ioredis';

// ESM에서 __dirname과 __filename을 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Redis 클라이언트 생성 (ESM에서는 const를 사용하여 변수를 선언하고 export 함)
const redisClient = new Redis();

// redis 연결 성공 이벤트
redisClient.on('connect', () => {
	console.log('Redis에 연결 성공');
});

// redis 연결 실패 이벤트
redisClient.on('error', (err) => {
	console.error('Redis 연결 오류:', err);
});

// Redis 클라이언트를 외부에 노출 (다른 파일에서 import 가능하도록)
export { redisClient };



// public 디렉토리의 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// Redis 연결 상태를 확인하고 서버를 시작하는 함수
async function main() {
    try {
        // ... (기존 코드 유지)
        const assetsDir = path.join(__dirname, 'assets');
        await loadAssets(assetsDir);
        console.log('Game assets loaded into memory.');
        console.log(`Server started with version: ${GAME.VERSION}`);

        // 소켓 이벤트 핸들러를 연결합니다.
        handleSocketEvents(io);

        // Redis 연결 상태 확인
        await redisClient.ping();
        console.log('Redis 서버가 정상적으로 응답합니다.');

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('서버 시작 실패:', error);
        // Redis 연결이 실패한 경우에도 종료
        redisClient.disconnect();
        process.exit(1);
    }
}

main();

