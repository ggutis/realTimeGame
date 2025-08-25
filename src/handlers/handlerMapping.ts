import { moveStageHandler } from './stage.handler.js';
import { endGame, startGame, summonUnit } from './game.handler.js';


const handlerMappings = {
    2: startGame,
    3: endGame,
    11: moveStageHandler,
};

export default handlerMappings;
