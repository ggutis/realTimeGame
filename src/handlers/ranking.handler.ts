import { redisClient } from "../app";

const LEADERBOARD_KEY  = 'leaderboard';

//사용자 점수 순위표 업데이트
export const updateLeaderboard = async (userId: string, score: number): Promise<void> => {
    await redisClient.zadd(LEADERBOARD_KEY, score, userId );
    console.log(`순위표 업데이트: 유저${userId}, 점수${score}`);
}

// 순위표 조회
export const getLeaderboard = async(count:number): Promise<Array<[string, number]>> => {
    const leaderboard = await redisClient.zrevrange(LEADERBOARD_KEY, 0, count - 1, 'WITHSCORES')

    // Redis 클라이언트의 반환 값은 ['user1', 'score1', 'user2', 'score2', ...] 형태
    const result = [];
    for (let i = 0; i < leaderboard.length; i + 2) {
        result.push([leaderboard[i], parseInt(leaderboard[i + 1])]);
    }

    return result as Array<[string, number]>;
};

// 특정 유저의 랭킹 조회
export const getUserRank = async(userId: string): Promise<number | null> => {
    const rank = await redisClient.zrevrank(LEADERBOARD_KEY, userId);

    if(rank === null) {
        return null;
    }

    return rank + 1
};

