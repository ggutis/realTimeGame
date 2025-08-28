
const goldEl = document.getElementById('gold');
const baseHealthEl = document.getElementById('base-health');
const scoreEl = document.getElementById('score');
const stageEl = document.getElementById('stage');
const unitButtonsContainer = document.getElementById('unit-buttons-container');
const leaderboardList = document.getElementById('leaderboard-list');
const gameContainer = document.getElementById('game-container');

// Modal elements
const modal = document.getElementById('game-modal');
const modalTitle = document.getElementById('modal-title');
const modalScore = document.getElementById('modal-score');
const modalBtn = document.getElementById('modal-action-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

export function updateGold(gold) {
    goldEl.textContent = gold;
}

export function updateBaseHealth(health) {
    baseHealthEl.textContent = health;
}

export function updateScore(score) {
    scoreEl.textContent = score;
}

export function updateStage(stage) {
    stageEl.textContent = stage;
}

export function renderSummonButtons(unlockedAnimals, gameAssets, onSummon) {
    unitButtonsContainer.innerHTML = '';
    unlockedAnimals.forEach((animalId) => {
        const animalData = gameAssets.animals[animalId];
        if (animalData) {
            const button = document.createElement('button');
            button.className = 'summon-button';
            button.onclick = () => {
                const summonPosition = { x: 100, y: 550 }; // 소환 위치를 고정값으로 설정 (예시)
                onSummon(animalId, summonPosition);
            };

            const img = document.createElement('img');
            img.src = `./images/animals/${animalId}00.png`;
            img.alt = animalData.name;
            img.style.width = '40px';
            img.style.height = '40px';
            button.appendChild(img);

            const nameSpan = document.createElement('span');
            nameSpan.textContent = animalData.name;
            button.appendChild(nameSpan);

            const costSpan = document.createElement('span');
            costSpan.className = 'cost';
            costSpan.textContent = `${animalData.cost}💰`;
            button.appendChild(costSpan);

            unitButtonsContainer.appendChild(button);
        }
    });
}

export function updateLeaderboard(leaderboardData) {
    if (!leaderboardList) return;

    leaderboardList.innerHTML = ''; // Clear existing list

    leaderboardData.forEach((entry, index) => {
        const [userId, score] = entry;
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${userId} - ${score}`;
        leaderboardList.appendChild(li);
    });
}

export function showDamageNumber(targetId, damage, isMonster) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    const damageElement = document.createElement('div');
    damageElement.className = 'damage-number';
    damageElement.textContent = damage;

    if (!isMonster) {
        damageElement.classList.add('unit-damage');
    }

    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();

    damageElement.style.left = `${targetRect.left - containerRect.left + targetRect.width / 2}px`;
    damageElement.style.top = `${targetRect.top - containerRect.top}px`;

    gameContainer.appendChild(damageElement);

    damageElement.addEventListener('animationend', () => {
        damageElement.remove();
    });
}

export function showModal(title, score, buttonText, callback, closeCallback) {
    modalTitle.textContent = title;
    modalScore.textContent = score;
    modalBtn.textContent = buttonText;
    modalBtn.onclick = callback;

    if (closeCallback) {
        modalCloseBtn.style.display = 'inline-block';
        modalCloseBtn.onclick = closeCallback;
    } else {
        modalCloseBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
}

export function hideModal() {
    modal.style.display = 'none';
}
