
import { getAssets } from '../../init/assets';
import { GameSession } from '../../models/game.session';

export function handleBattle(session: GameSession) {
    // 몬스터 사망 처리 및 골드/점수 획득
    const deadMonsters = Object.values(session.activeMonsters).filter((m) => m.health <= 0);
    for (const monster of deadMonsters) {
        delete session.activeMonsters[monster.id];
        const monsterData = getAssets().monsters[monster.monsterId];
        if (monsterData) {
            session.gold += monsterData.goldDrop;
            session.score += monsterData.score;
        }
    }

    // 유닛 사망 처리
    const deadAnimals = Object.values(session.activeAnimals).filter((a) => a.health <= 0);
    for (const animal of deadAnimals) {
        delete session.activeAnimals[animal.id];
    }

    // 기지 체력 확인
    if (session.baseHealth <= 0) {
        session.isGameOver = true;
        console.log('게임 오버!');
    }
}
