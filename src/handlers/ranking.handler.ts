import { redisClient } from '../app';
import { Socket } from 'socket.io';

const LEADERBOARD_KEY = 'leaderboard';

//사용자 점수 순위표 업데이트
export const updateLeaderboard = async (userId: string, score: number): Promise<boolean> => {
  const currentScore = await redisClient.zscore(LEADERBOARD_KEY, userId);
  if (currentScore === null || score > parseInt(currentScore, 10)) {
    await redisClient.zadd(LEADERBOARD_KEY, score, userId);
    console.log(`순위표 업데이트: 유저${userId}, 점수${score}`);
    return true; // 점수가 업데이트되었음을 반환
  }
  return false; // 점수가 업데이트되지 않았음을 반환
};

// 순위표 조회
export const getLeaderboard = async (count: number): Promise<Array<[string, number]>> => {
	const leaderboard = await redisClient.zrevrange(LEADERBOARD_KEY, 0, count - 1, 'WITHSCORES');

	// Redis 클라이언트의 반환 값은 ['user1', 'score1', 'user2', 'score2', ...] 형태
	const result = [];
	for (let i = 0; i < leaderboard.length; i += 2) {
		result.push([leaderboard[i], parseInt(leaderboard[i + 1], 10)]);
	}

	return result as Array<[string, number]>;
};

// 특정 유저의 랭킹 조회
export const getUserRank = async (userId: string): Promise<number | null> => {
	const rank = await redisClient.zrevrank(LEADERBOARD_KEY, userId);

	if (rank === null) {
		return null;
	}

	return rank + 1;
};

// 순위표 조회 핸들러
export const getLeaderboardHandler = async (socket: Socket) => {
	try {
		const leaderboard = await getLeaderboard(10); // Top 10
		socket.emit('ranking:update', leaderboard);
	} catch (error) {
		console.error('Error getting leaderboard:', error);
		socket.emit('ranking:error', { message: 'Could not retrieve leaderboard.' });
	}
};

