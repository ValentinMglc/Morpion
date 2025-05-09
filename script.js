const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const restartBtn = document.getElementById('restart');
const backToMenuBtn = document.getElementById('backToMenu');
const menu = document.getElementById('menu');
const board = document.getElementById('board');

let boardState = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let isGameActive = false;
let gameMode = "";
let difficulty = "";
let isAIPlaying = false;

const winningConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// Sound Management
let isSoundEnabled = true;
const sounds = {
  click: document.getElementById('clickSound'),
  win: document.getElementById('winSound'),
  draw: document.getElementById('drawSound')
};

// Précharger les sons
function preloadSounds() {
  for (let sound of Object.values(sounds)) {
    sound.load();
    // Ajouter un petit son silencieux pour iOS
    sound.volume = 0.7; // Réduire légèrement le volume
  }
}

// Initialiser les sons au premier clic utilisateur
document.addEventListener('touchstart', function() {
  preloadSounds();
}, { once: true });

function playSound(soundName) {
  if (isSoundEnabled && sounds[soundName]) {
    try {
      const sound = sounds[soundName];
      sound.currentTime = 0;
      const playPromise = sound.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Playback prevented:", error);
        });
      }
    } catch (error) {
      console.log("Sound play error:", error);
    }
  }
}

document.getElementById('toggleSound').addEventListener('click', function() {
  isSoundEnabled = !isSoundEnabled;
  this.querySelector('i').className = isSoundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
});

// Theme Management
let currentTheme = 'default';
document.getElementById('themeSelect').addEventListener('change', function() {
  const newTheme = this.value;
  document.body.dataset.theme = newTheme;
  currentTheme = newTheme;
});

// Player Customization
let playerSymbols = { X: 'X', O: 'O' };
let playerColors = { X: '#e74c3c', O: '#27ae60' };

document.getElementById('symbolX').addEventListener('input', function() {
  if (this.value) {
    playerSymbols.X = this.value;
    updateBoard();
  }
});

document.getElementById('symbolO').addEventListener('input', function() {
  if (this.value) {
    playerSymbols.O = this.value;
    updateBoard();
  }
});

document.getElementById('colorX').addEventListener('input', function() {
  playerColors.X = this.value;
  updateStyles();
});

document.getElementById('colorO').addEventListener('input', function() {
  playerColors.O = this.value;
  updateStyles();
});

function updateStyles() {
  document.documentElement.style.setProperty('--player-x-color', playerColors.X);
  document.documentElement.style.setProperty('--player-o-color', playerColors.O);
}

// Appeler updateStyles au chargement initial
updateStyles();

function updateBoard() {
  cells.forEach((cell, index) => {
    if (boardState[index] === 'X') {
      cell.textContent = playerSymbols.X;
    } else if (boardState[index] === 'O') {
      cell.textContent = playerSymbols.O;
    }
  });
}

// Victory Animation
function celebrateVictory() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
  playSound('win');
}

function startGame(mode) {
  if (mode.startsWith('ai-')) {
    gameMode = 'ai';
    difficulty = mode.split('-')[1];
  } else {
    gameMode = mode;
    difficulty = '';
  }

  menu.style.display = 'none';
  board.style.display = 'grid';
  restartBtn.style.display = 'block';
  backToMenuBtn.style.display = 'block';

  resetGameState();
  
  if (gameMode === 'ai' && currentPlayer === 'O') {
    isAIPlaying = true;
    setTimeout(aiPlay, 1000);
  }
}

function resetGameState() {
  boardState = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";
  isGameActive = true;
  isAIPlaying = false;
  cells.forEach(cell => {
    cell.textContent = "";
    cell.style.pointerEvents = "all";
    cell.classList.remove("x", "o", "victory-animation");
  });
  statusText.textContent = `C'est au tour de ${playerSymbols[currentPlayer]}`;
}

function handleClick(e) {
  if (!isGameActive || isAIPlaying) return;

  const index = e.target.dataset.index;
  if (boardState[index] !== "") return;

  playSound('click');
  
  boardState[index] = currentPlayer;
  e.target.textContent = playerSymbols[currentPlayer];
  e.target.classList.add(currentPlayer.toLowerCase());
  e.target.style.pointerEvents = "none";

  checkResult();

  if (gameMode === "ai" && isGameActive && currentPlayer === "O") {
    isAIPlaying = true;
    setTimeout(aiPlay, 500);
  }
}

function checkResult() {
  let roundWon = false;

  for (const condition of winningConditions) {
    const [a, b, c] = condition;
    if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
      roundWon = true;
      cells[a].classList.add('victory-animation');
      cells[b].classList.add('victory-animation');
      cells[c].classList.add('victory-animation');
      break;
    }
  }

  if (roundWon) {
    statusText.textContent = `Joueur ${playerSymbols[currentPlayer]} a gagné !`;
    isGameActive = false;
    celebrateVictory();
    return;
  }

  if (!boardState.includes("")) {
    statusText.textContent = "Match nul !";
    isGameActive = false;
    playSound('draw');
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  statusText.textContent = `C'est au tour de ${playerSymbols[currentPlayer]}`;
}

function aiPlay() {
  if (!isGameActive || !isAIPlaying) return;

  let index;

  if (difficulty === "easy") {
    const empty = boardState
      .map((val, idx) => val === "" ? idx : null)
      .filter(v => v !== null);
    index = empty[Math.floor(Math.random() * empty.length)];
  }
  else if (difficulty === "medium") {
    index = getMediumAIMove();
  }
  else if (difficulty === "hard") {
    const best = minimax(boardState, "O");
    index = best.index;
  }

  makeMove(index, "O");
  isAIPlaying = false;
}

function getMediumAIMove() {
  // 1. Vérifier victoire possible
  for (let i = 0; i < 9; i++) {
    if (boardState[i] === "") {
      boardState[i] = "O";
      if (checkWinner(boardState, "O")) {
        boardState[i] = "";
        return i;
      }
      boardState[i] = "";
    }
  }

  // 2. Bloquer adversaire
  for (let i = 0; i < 9; i++) {
    if (boardState[i] === "") {
      boardState[i] = "X";
      if (checkWinner(boardState, "X")) {
        boardState[i] = "";
        return i;
      }
      boardState[i] = "";
    }
  }

  // 3. Sinon coup aléatoire
  const empty = boardState
    .map((val, idx) => val === "" ? idx : null)
    .filter(v => v !== null);
  return empty[Math.floor(Math.random() * empty.length)];
}

function makeMove(index, player) {
  if (boardState[index] === "") {
    boardState[index] = player;
    cells[index].textContent = playerSymbols[player];
    cells[index].classList.add(player.toLowerCase());
    cells[index].style.pointerEvents = "none";
    playSound('click');
    checkResult();
  }
}

function minimax(newBoard, player) {
  let availSpots = newBoard
    .map((val, idx) => val === "" ? idx : null)
    .filter(v => v !== null);

  if (checkWinner(newBoard, "X")) return { score: -10 };
  if (checkWinner(newBoard, "O")) return { score: 10 };
  if (availSpots.length === 0) return { score: 0 };

  let moves = [];

  for (let i = 0; i < availSpots.length; i++) {
    let move = {};
    move.index = availSpots[i];
    newBoard[availSpots[i]] = player;

    let result = minimax(newBoard, player === "O" ? "X" : "O");
    move.score = result.score;

    newBoard[availSpots[i]] = "";
    moves.push(move);
  }

  let bestMove;
  if (player === "O") {
    let bestScore = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score > bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score < bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  }

  return moves[bestMove];
}

function checkWinner(board, player) {
  return winningConditions.some(([a, b, c]) =>
    board[a] === player && board[b] === player && board[c] === player
  );
}

function restartGame() {
  resetGameState();
  if (gameMode === "ai" && currentPlayer === "O") {
    isAIPlaying = true;
    setTimeout(aiPlay, 500);
  }
}

function backToMenu() {
  menu.style.display = 'block';
  board.style.display = 'none';
  restartBtn.style.display = 'none';
  backToMenuBtn.style.display = 'none';
  resetGameState();
  gameMode = "";
  isGameActive = false;
  statusText.textContent = "Choisis un mode de jeu !";
}

cells.forEach(cell => cell.addEventListener('click', handleClick)); 