// GRID 8 x 8 = 64 KOTAK
const GRID_SIZE = 8;
const TOTAL_CELLS = 64;
const QUESTION_TIMEOUT = 30; // Detik per soal

const playerColors = ['#00ffcc', '#ff0055', '#ffd700', '#0099ff', '#ff6600', '#a600ff', '#00ff66', '#ff3399'];

// TEPAT 4 TANGGA & 4 ULAR (DIADAPTASI UNTUK PAPAN 64 PETAK)
const ladders = { 
    5: 22,   // Tangga 1
    14: 31,  // Tangga 2
    27: 46,  // Tangga 3
    40: 59   // Tangga 4
};

const snakes = { 
    24: 8,   // Ular 1
    38: 15,  // Ular 2
    51: 29,  // Ular 3
    62: 44   // Ular 4
};

let numPlayers = 3;
let playerPositions = [];
let playerScores = [];
let playerShields = [];
let playerBoosts = [];
let playerSkipped = []; 
let playerFinished = []; // Menandai jika pemain sudah FINISH
let rankings = [];       // Urutan peringkat pemenang
let mines = new Array(TOTAL_CELLS + 1).fill(false);

let currentPlayer = 0;
let isRolling = false;

let availableQuestions = [];
let currentQuestionIndex = 0;

// --- VARIABEL TIMER ---
let quizTimer = null;
let timeLeft = QUESTION_TIMEOUT;

function resetQuestionDeck() {
    availableQuestions = quizBank.map((_, index) => index);
}

function selectPlayerCount(count) {
    numPlayers = count;
    document.querySelectorAll('.player-opt-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.innerText) === count) btn.classList.add('selected');
    });
}

function openPlayerSetup() {
    document.getElementById('setup-modal').classList.add('active');
}

function startGame() {
    document.getElementById('setup-modal').classList.remove('active');
    
    playerPositions = new Array(numPlayers).fill(1);
    playerScores = new Array(numPlayers).fill(0);
    playerShields = new Array(numPlayers).fill(false);
    playerBoosts = new Array(numPlayers).fill(false);
    playerSkipped = new Array(numPlayers).fill(false);
    playerFinished = new Array(numPlayers).fill(false);
    rankings = [];
    mines = new Array(TOTAL_CELLS + 1).fill(false);
    
    currentPlayer = 0;
    isRolling = false;

    resetQuestionDeck();
    createBoard(); 

    const container = document.getElementById('players-container');
    container.innerHTML = '';
    for (let i = 0; i < numPlayers; i++) {
        const pawn = document.createElement('div');
        pawn.id = `pawn-${i}`;
        pawn.className = 'player-pawn';
        pawn.style.backgroundColor = playerColors[i];
        pawn.style.boxShadow = `0 0 8px ${playerColors[i]}`;
        pawn.innerText = `P${i + 1}`;
        container.appendChild(pawn);
    }

    updateTurnDisplay();
    updateStatsDisplay();
    updatePawnPositions();
    drawOverlay();
    document.getElementById('dice-display').innerText = '?';
    document.getElementById('roll-btn').disabled = false;
}

function updateStatsDisplay() {
    const statsBox = document.getElementById('stats-box');
    statsBox.innerHTML = '';
    for (let i = 0; i < numPlayers; i++) {
        const row = document.createElement('div');
        row.className = 'stat-row';
        let statusIcons = '';
        if (playerFinished[i]) {
            const rankIndex = rankings.indexOf(i) + 1;
            statusIcons += ` 🏆 #${rankIndex}`;
        } else {
            if (playerShields[i]) statusIcons += ' 🛡️';
            if (playerBoosts[i]) statusIcons += ' 🚀';
            if (playerSkipped[i]) statusIcons += ' 🛑';
        }

        row.innerHTML = `
            <span style="color:${playerColors[i]}; font-weight:bold;">P${i + 1} (User_0${i + 1})${statusIcons}</span>
            <span style="color:#ffd700; font-family:monospace;">${playerScores[i]} PTS</span>
        `;
        statsBox.appendChild(row);
    }

    const currentPts = playerScores[currentPlayer];
    const mineBtn = document.getElementById('pu-mine');
    if (mineBtn) {
        mineBtn.disabled = currentPts < 120 || playerFinished[currentPlayer];
    }
    
    document.getElementById('pu-shield').disabled = currentPts < 150 || playerShields[currentPlayer] || playerFinished[currentPlayer];
    document.getElementById('pu-boost').disabled = currentPts < 120 || playerBoosts[currentPlayer] || playerFinished[currentPlayer];
}

function buyPowerUp(type) {
    if (playerFinished[currentPlayer]) return;

    if (type === 'mine' && playerScores[currentPlayer] >= 120) {
        const currentCell = playerPositions[currentPlayer];
        
        if (mines[currentCell]) {
            alert(`⚠️ Kotak ${currentCell} sudah ada ranjaunya!`);
            return;
        }

        playerScores[currentPlayer] -= 120;
        mines[currentCell] = true;
        
        const cellEl = document.getElementById(`cell-${currentCell}`);
        if (cellEl) {
            let mineIndicator = cellEl.querySelector('.mine-indicator');
            if (!mineIndicator) {
                mineIndicator = document.createElement('span');
                mineIndicator.className = 'mine-indicator';
                mineIndicator.innerText = '💣';
                mineIndicator.style.fontSize = '12px';
                cellEl.appendChild(mineIndicator);
            }
        }

        alert(`💣 Ranjau dipasang di Kotak ${currentCell}! Pemain lain yang menginjak kotak ini akan kehilangan 1 giliran.`);
    } else if (type === 'shield' && playerScores[currentPlayer] >= 150) {
        playerScores[currentPlayer] -= 150;
        playerShields[currentPlayer] = true;
        alert(`🛡️ Perisai Virus diaktifkan!`);
    } else if (type === 'boost' && playerScores[currentPlayer] >= 120) {
        playerScores[currentPlayer] -= 120;
        playerBoosts[currentPlayer] = true;
        alert(`🚀 Bonus +2 Langkah diaktifkan!`);
    }
    updateStatsDisplay();
}

function startQuizTimer() {
    clearInterval(quizTimer);
    timeLeft = QUESTION_TIMEOUT;
    
    const timerText = document.getElementById('timer-text');
    const timerProgress = document.getElementById('timer-progress');

    timerText.innerText = timeLeft;
    timerProgress.style.width = '100%';
    timerProgress.style.backgroundColor = '#ffd700';

    quizTimer = setInterval(() => {
        timeLeft--;
        timerText.innerText = timeLeft;
        
        const percentage = (timeLeft / QUESTION_TIMEOUT) * 100;
        timerProgress.style.width = `${percentage}%`;

        if (timeLeft <= 10) {
            timerProgress.style.backgroundColor = '#ff0055';
        }

        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            handleTimeOut();
        }
    }, 1000);
}

function stopQuizTimer() {
    clearInterval(quizTimer);
}

function handleTimeOut() {
    const optionsBtns = document.querySelectorAll('.option-btn');
    const feedbackEl = document.getElementById('quiz-feedback');
    const modal = document.getElementById('quiz-modal');
    const qData = quizBank[currentQuestionIndex];

    optionsBtns.forEach(btn => btn.disabled = true);
    optionsBtns[qData.answer].classList.add('correct');

    feedbackEl.innerText = '⏰ WAKTU HABIS! -20 POIN. GILIRAN DILEWATI.';
    feedbackEl.style.color = '#ff0055';
    playerScores[currentPlayer] = Math.max(0, playerScores[currentPlayer] - 20);
    updateStatsDisplay();

    setTimeout(() => {
        modal.classList.remove('active');
        finishTurn();
    }, 1800);
}

function triggerQuiz() {
    if (isRolling || playerFinished[currentPlayer]) return;

    if (availableQuestions.length === 0) {
        resetQuestionDeck();
    }

    const randomIndexInDeck = Math.floor(Math.random() * availableQuestions.length);
    currentQuestionIndex = availableQuestions[randomIndexInDeck];
    availableQuestions.splice(randomIndexInDeck, 1);

    const modal = document.getElementById('quiz-modal');
    const questionEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    const feedbackEl = document.getElementById('quiz-feedback');

    const qData = quizBank[currentQuestionIndex];

    questionEl.innerText = qData.q;
    optionsEl.innerHTML = '';
    feedbackEl.innerText = '';

    qData.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = `${String.fromCharCode(65 + idx)}. ${optText}`;
        btn.onclick = () => handleAnswer(idx);
        optionsEl.appendChild(btn);
    });

    modal.classList.add('active');
    startQuizTimer();
}

function handleAnswer(selectedIndex) {
    stopQuizTimer();

    const qData = quizBank[currentQuestionIndex];
    const optionsBtns = document.querySelectorAll('.option-btn');
    const feedbackEl = document.getElementById('quiz-feedback');
    const modal = document.getElementById('quiz-modal');

    optionsBtns.forEach(btn => btn.disabled = true);

    if (selectedIndex === qData.answer) {
        optionsBtns[selectedIndex].classList.add('correct');
        feedbackEl.innerText = '✓ BENAR! +100 POIN. MEMPROSES DADU...';
        feedbackEl.style.color = '#00ffcc';
        playerScores[currentPlayer] += 100;

        setTimeout(() => {
            modal.classList.remove('active');
            rollDice();
        }, 1000);
    } else {
        optionsBtns[selectedIndex].classList.add('wrong');
        optionsBtns[qData.answer].classList.add('correct');
        feedbackEl.innerText = '✗ SALAH! -20 POIN. GILIRAN DILEWATI.';
        feedbackEl.style.color = '#ff0055';
        playerScores[currentPlayer] = Math.max(0, playerScores[currentPlayer] - 20);

        setTimeout(() => {
            modal.classList.remove('active');
            finishTurn();
        }, 1500);
    }
    updateStatsDisplay();
}

function rollDice() {
    isRolling = true;
    document.getElementById('roll-btn').disabled = true;
    const diceBox = document.getElementById('dice-display');
    diceBox.classList.add('dice-rolling');

    let count = 0;
    const interval = setInterval(() => {
        diceBox.innerText = Math.floor(Math.random() * 6) + 1;
        count++;
        if (count > 8) {
            clearInterval(interval);
            diceBox.classList.remove('dice-rolling');
            let diceVal = Math.floor(Math.random() * 6) + 1;

            if (playerBoosts[currentPlayer]) {
                diceVal += 2;
                playerBoosts[currentPlayer] = false;
                alert(`🚀 Bonus +2 Langkah Digunakan! Total: ${diceVal}`);
            }

            diceBox.innerText = diceVal;
            processTurn(diceVal);
        }
    }, 50);
}

function processTurn(diceValue) {
    let currentPos = playerPositions[currentPlayer];
    let nextPos = currentPos + diceValue;

    // Jika melebihi 64, langkah tidak valid (harus pas)
    if (nextPos > TOTAL_CELLS) {
        alert(`🎲 Angka dadu (${diceValue}) melebihi kotak FINISH! Giliran berakhir.`);
        finishTurn();
        return;
    }

    playerPositions[currentPlayer] = nextPos;
    updatePawnPositions();

    setTimeout(() => {
        // 1. Pengecekan Ranjau
        if (mines[nextPos]) {
            mines[nextPos] = false;
            playerSkipped[currentPlayer] = true;
            
            const cellEl = document.getElementById(`cell-${nextPos}`);
            if (cellEl) {
                const mineIndicator = cellEl.querySelector('.mine-indicator');
                if (mineIndicator) mineIndicator.remove();
            }

            alert(`💥 BOOM! P${currentPlayer + 1} menginjak ranjau di Kotak ${nextPos}! Giliran berikutnya akan dilewati.`);
        }

        // 2. Pengecekan Tangga & Ular
        if (ladders[nextPos]) {
            playerPositions[currentPlayer] = ladders[nextPos];
            updatePawnPositions();
            alert(`🚀 P${currentPlayer + 1} naik tangga ke Kotak ${ladders[nextPos]}!`);
        } 
        else if (snakes[nextPos]) {
            if (playerShields[currentPlayer]) {
                playerShields[currentPlayer] = false;
                alert(`🛡️ Perisai Berhasil Melindungi P${currentPlayer + 1}!`);
            } else {
                playerPositions[currentPlayer] = snakes[nextPos];
                updatePawnPositions();
                alert(`🦠 P${currentPlayer + 1} terkena virus/ular dan turun ke Kotak ${snakes[nextPos]}!`);
            }
        }

        // 3. Pengecekan Kondisi FINISH (Petak 64)
        if (playerPositions[currentPlayer] === TOTAL_CELLS) {
            playerFinished[currentPlayer] = true;
            rankings.push(currentPlayer);
            alert(`🎉 PEMAIN P${currentPlayer + 1} BERHASIL FINISH DI URUTAN KE-${rankings.length}!`);
        }

        // 4. Selesaikan giliran
        finishTurn();
    }, 400);
}

function finishTurn() {
    // Hitung berapa pemain yang belum finish
    const activePlayersCount = playerFinished.filter(finished => !finished).length;

    // Permainan selesai jika sisa 1 pemain aktif (atau semua sudah finish)
    if (activePlayersCount <= 1 && numPlayers > 1) {
        // Masukkan pemain terakhir yang belum finish ke peringkat akhir
        for (let i = 0; i < numPlayers; i++) {
            if (!playerFinished[i]) {
                playerFinished[i] = true;
                rankings.push(i);
            }
        }

        let summaryMessage = "🏁 PERMAINAN SELESAI! PERINGKAT AKHIR:\n\n";
        rankings.forEach((pIdx, rank) => {
            summaryMessage += `Juara ${rank + 1}: P${pIdx + 1} (${playerScores[pIdx]} PTS)\n`;
        });

        alert(summaryMessage);
        document.getElementById('turn-display').innerText = "GAME OVER";
        document.getElementById('roll-btn').disabled = true;
        updateStatsDisplay();
        return;
    }

    // Jika pemain yang baru saja main belum finish tapi permainan belum beres, atau jika sudah finish,
    // cari pemain berikutnya yang BELUM FINISH.
    let nextPlayer = (currentPlayer + 1) % numPlayers;
    while (playerFinished[nextPlayer]) {
        nextPlayer = (nextPlayer + 1) % numPlayers;
    }
    currentPlayer = nextPlayer;

    // Pengecekan status skip akibat ranjau untuk pemain berikutnya
    if (playerSkipped[currentPlayer]) {
        playerSkipped[currentPlayer] = false;
        alert(`🛑 P${currentPlayer + 1} kehilangan gilirannya karena ranjau!`);
        
        // Pindah lagi ke pemain aktif berikutnya
        nextPlayer = (currentPlayer + 1) % numPlayers;
        while (playerFinished[nextPlayer]) {
            nextPlayer = (nextPlayer + 1) % numPlayers;
        }
        currentPlayer = nextPlayer;
    }

    updateTurnDisplay();
    updateStatsDisplay();
    isRolling = false;
    document.getElementById('roll-btn').disabled = false;
}

function updateTurnDisplay() {
    const turnDisplay = document.getElementById('turn-display');
    const turnCard = document.getElementById('turn-card');
    turnDisplay.innerText = `User_0${currentPlayer + 1} (P${currentPlayer + 1})`;
    turnDisplay.style.color = playerColors[currentPlayer];
    turnCard.style.borderLeftColor = playerColors[currentPlayer];
}

function createBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
        const isEven = row % 2 === 0;
        for (let col = 0; col < GRID_SIZE; col++) {
            const actualCol = isEven ? col : (GRID_SIZE - 1) - col;
            const cellNum = row * GRID_SIZE + actualCol + 1;

            const cell = document.createElement('div');
            cell.id = `cell-${cellNum}`;
            cell.className = `cell ${(row + col) % 2 === 0 ? 'cell-even' : 'cell-odd'}`;
            
            if (cellNum === 1) cell.classList.add('cell-special-start');
            if (cellNum === TOTAL_CELLS) cell.classList.add('cell-special-finish');

            const numDiv = document.createElement('span');
            numDiv.className = 'cell-num';
            numDiv.innerText = cellNum === 1 ? 'START' : (cellNum === TOTAL_CELLS ? 'FINISH' : cellNum);
            cell.appendChild(numDiv);
            board.appendChild(cell);
        }
    }
}

function getCellCenter(cellNum) {
    const index = cellNum - 1;
    const rowFromBottom = Math.floor(index / GRID_SIZE);
    const colInRow = index % GRID_SIZE;
    const col = (rowFromBottom % 2 === 0) ? colInRow : (GRID_SIZE - 1) - colInRow;
    const row = (GRID_SIZE - 1) - rowFromBottom;
    const cellSize = 491 / GRID_SIZE;
    return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
}

function drawOverlay() {
    const svg = document.getElementById('game-svg');
    const defs = svg.querySelector('defs');
    svg.innerHTML = ''; svg.appendChild(defs);

    for (let [start, end] of Object.entries(ladders)) {
        const p1 = getCellCenter(parseInt(start));
        const p2 = getCellCenter(parseInt(end));
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
        line.setAttribute('stroke', '#00ffcc'); line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '5 3'); line.setAttribute('marker-end', 'url(#arrow)');
        svg.appendChild(line);
    }

    for (let [start, end] of Object.entries(snakes)) {
        const p1 = getCellCenter(parseInt(start));
        const p2 = getCellCenter(parseInt(end));
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${p1.x} ${p1.y} Q ${(p1.x+p2.x)/2 + 20} ${(p1.y+p2.y)/2 - 20} ${p2.x} ${p2.y}`);
        path.setAttribute('fill', 'none'); path.setAttribute('stroke', '#ff0055');
        path.setAttribute('stroke-width', '3'); path.setAttribute('marker-end', 'url(#virus-head)');
        svg.appendChild(path);
    }
}

function updatePawnPositions() {
    if (playerPositions.length === 0) return;
    for (let i = 0; i < numPlayers; i++) {
        const pawn = document.getElementById(`pawn-${i}`);
        if (!pawn) continue;
        const pos = getCellCenter(playerPositions[i]);
        const sameCell = playerPositions.map((p, idx) => p === playerPositions[i] ? idx : null).filter(v => v !== null);
        const rank = sameCell.indexOf(i);
        const offset = sameCell.length > 1 ? 6 : 0;
        const angle = (rank / sameCell.length) * 2 * Math.PI;

        pawn.style.left = `${pos.x + Math.cos(angle) * offset}px`;
        pawn.style.top = `${pos.y + Math.sin(angle) * offset}px`;
    }
}

window.onload = () => { createBoard(); drawOverlay(); openPlayerSetup(); };
window.onresize = () => { drawOverlay(); updatePawnPositions(); };
