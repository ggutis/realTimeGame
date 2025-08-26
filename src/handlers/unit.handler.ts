import { Socket } from 'socket.io';
import { activeSessions } from './game.handler.js';
import { SummonUnitPayload } from '../types/payloads';
import { getAssets } from '../init/assets.js';
import { v4 as uuid } from 'uuid';
import { ActiveAnimal } from '../types/data';


// 유닛 소환 로직
export const summonUnit = async (socket: Socket, payload: SummonUnitPayload): Promise<void> => {
	const sessionId = Object.keys(activeSessions).find(
		(key) => activeSessions[key].socketId === socket.id,
	);
	if (!sessionId) {
		socket.emit('game:error', { message: '유효한 게임 세션을 찾을 수 없습니다.' });
		return;
	}

	const session = activeSessions[sessionId];
	const animalData = getAssets().animals[payload.animalId];

	if (!animalData) {
		socket.emit('game:error', { message: '존재하지 않는 유닛입니다.' });
		return;
	}

	if (session.gold < animalData.cost) {
		socket.emit('game:error', { message: '골드가 부족합니다.' });
		return;
	}
	// 골드 차감
	session.gold -= animalData.cost;

	// 유닛 소환
	const unitId = uuid();
	const newUnit: ActiveAnimal = {
		id: unitId,
		animalId: animalData.id,
		health: animalData.health,
		damage: animalData.damage,
		attackSpeed: 0,
		isMoving: true,
		targetId: null,
		position: {
			x: 100, // 고정된 x 위치
			y: 500,
		},
	};
	session.activeAnimals[unitId] = newUnit;

	console.log(
		`유닛 ${animalData.name} (ID: ${unitId})가 소환되었습니다. 남은 골드: ${session.gold}`,
	);
};
