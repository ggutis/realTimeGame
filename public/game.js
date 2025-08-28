import { setupSocket } from './modules/socket.js';
import * as ui from './modules/ui.js';
import * as game from './modules/game.js';

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const startGameBtn = document.getElementById('start-game-btn');

    startGameBtn.addEventListener('click', () => {
        socket.emit('game:start', { userId: game.getUserId() });
        startGameBtn.style.display = 'none'; // Hide the button after starting
    });

    const onSummon = (animalId, position) => {
        socket.emit('game:summon', { animalId, position });
    };

    setupSocket(socket, ui, game, onSummon);
});