import express from 'express'
import { redisClient } from '../app';


const router = express.Router();

// 게임 캐시 초기화 함수
const resetGameCache = async (): Promise<void> => {
	const sessionKeys = await redisClient.keys('session:*');
	if (sessionKeys.length > 0) {
		const result = await redisClient.del(...sessionKeys);
		console.log(`모든 게임 세션 캐시가 초기화되었습니다. 삭제된 세션 수: ${result}`);
	} else {
		console.log('초기화할 게임 세션 캐시가 없습니다.');
	}
};


router.post('/reset-cache', async (req, res) => {
    try {
        await resetGameCache();
        res.status(200).send('게임 캐시가 성공적으로 초기화되었습니다.');
    } catch (error) {
        console.error('캐시 초기화 중 오류 발생:', error);
        res.status(500).send('캐시 초기화에 실패했습니다.');
    }
});

export default router;