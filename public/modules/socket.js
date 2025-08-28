
export function setupSocket(socket, ui, game, onSummon) {
    socket.on('connect', () => {
        console.log('서버에 연결되었습니다.');
        requestLeaderboard(); // 연결되자마자 랭킹 요청
    });

    socket.on('game:start_success', (payload) => {
        console.log('게임이 시작되었습니다.', payload);
        game.setGameAssets(payload.gameAssets);
        ui.updateGold(payload.userGold);
        ui.updateStage(payload.currentStageId || 1);
        ui.renderSummonButtons(payload.unlockedAnimals, game.getGameAssets(), onSummon);

        // Request leaderboard for the first time
        requestLeaderboard();

        // 10초마다 랭킹 업데이트 요청
        setInterval(requestLeaderboard, 10000);

        // 게임 루프 시작
        requestAnimationFrame(game.renderLoop);
    });

    socket.on('game:state_update', (gameState) => {
        ui.updateGold(gameState.gold);
        ui.updateBaseHealth(gameState.baseHealth);
        ui.updateScore(gameState.score);
        game.updateEntities(gameState.animals, 'unit');
        game.updateEntities(gameState.monsters, 'monster');

        if (gameState.damageEvents) {
            gameState.damageEvents.forEach((event) => {
                const isMonster = game.isMonster(event.targetId);
                ui.showDamageNumber(event.targetId, event.damage, isMonster);
            });
        }
    });

    socket.on('game:end', (payload) => {
        const startGameBtn = document.getElementById('start-game-btn');
        const closeAction = () => {
            ui.hideModal();
            startGameBtn.style.display = 'block';
        };

        if (payload.isGameOver) {
            ui.showModal(
                '게임 종료!',
                `점수: ${payload.score}`,
                '다시 시작',
                () => {
                    socket.emit('game:start', { userId: game.getUserId() });
                    ui.hideModal();
                },
                closeAction,
            );
        } else if (payload.isStageCompleted) {
            ui.showModal(
                '스테이지 클리어!',
                `점수: ${payload.score}`,
                '다음 스테이지',
                () => {
                    socket.emit('game:next_stage', { userId: game.getUserId() });
                    ui.hideModal();
                },
                closeAction,
            );
        }
    });

    socket.on('game:high_score', (payload) => {
        console.log('새로운 최고 점수 달성:', payload.message, payload.score);
        ui.showModal(
            '🎉 최고 점수 달성!',
            `축하합니다! 새로운 최고 점수: ${payload.score}`,
            '확인',
            ui.hideModal
        );
    });

    socket.on('game:stage_started', (payload) => {
        ui.updateStage(payload.currentStageId);
        ui.updateGold(payload.userGold);
        ui.renderSummonButtons(payload.unlockedAnimals, game.getGameAssets(), onSummon);
    });

    socket.on('game:error', (payload) => {
        console.error('게임 오류:', payload.message);
        ui.showModal('게임 오류', payload.message, '확인', ui.hideModal);
    });

    socket.on('ranking:update', (data) => {
        ui.updateLeaderboard(data.leaderboard);
    });

    socket.on('ranking:error', (error) => {
        console.error('Ranking error:', error.message);
    });

    function requestLeaderboard() {
        socket.emit('ranking:get');
    }
}
