import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server, Socket } from 'socket.io';

import { loadAssets } from './init/assets.js';
import { handleSocketEvents } from './init/socket.js';
import { GAME } from './constants.js';

// ESM에서 __dirname과 __filename을 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 디렉토리의 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

async function main() {
	try {
		// 서버 시작 시 모든 게임 자산(데이터)을 JSON 파일에서 로드합니다.
		// dist 폴더 안의 assets 폴더 경로를 생성하여 전달합니다.
		const assetsDir = path.join(__dirname, 'assets');
		await loadAssets(assetsDir);
		console.log('Game assets loaded into memory.');
		console.log(`Server started with version: ${GAME.VERSION}`);

		// 소켓 이벤트 핸들러를 연결합니다.
		handleSocketEvents(io);

		const PORT = process.env.PORT || 3000;
		server.listen(PORT, () => {
			console.log(`Server is running on http://localhost:${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

main();
