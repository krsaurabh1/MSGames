const SCORE_KEY = "tic-tac-toe-scores";
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const boardEl = document.getElementById("board");
const turnIndicatorEl = document.getElementById("turn-indicator");
const scoreXEl = document.getElementById("score-x");
const scoreOEl = document.getElementById("score-o");
const scoreDrawEl = document.getElementById("score-draw");
const messageEl = document.getElementById("message");
const messageTextEl = document.getElementById("message-text");

let cells = [];
let board = Array(9).fill(null);
let currentPlayer = "X";
let roundOver = false;
let scores = loadScores();

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone({ freq, duration = 0.15, type = "sine", volume = 0.2, delay = 0 }) {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playPlaceSound(player) {
  playTone({ freq: player === "X" ? 440 : 349.23, duration: 0.1, type: "triangle", volume: 0.15 });
}

function playWinSound() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone({ freq, duration: 0.2, type: "triangle", volume: 0.2, delay: i * 0.12 });
  });
}

function playDrawSound() {
  playTone({ freq: 392, duration: 0.3, type: "sine", volume: 0.15 });
}

function playClickSound() {
  playTone({ freq: 600, duration: 0.05, type: "square", volume: 0.1 });
}

function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY)) || { X: 0, O: 0, draw: 0 };
  } catch {
    return { X: 0, O: 0, draw: 0 };
  }
}

function saveScores() {
  localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
}

function renderScores() {
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
  scoreDrawEl.textContent = scores.draw;
}

function buildBoard() {
  boardEl.innerHTML = "";
  cells = board.map((_, i) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.addEventListener("click", () => handleCellClick(i));
    boardEl.appendChild(cell);
    return cell;
  });
}

function startRound() {
  board = Array(9).fill(null);
  currentPlayer = "X";
  roundOver = false;
  messageEl.classList.add("hidden");
  buildBoard();
  updateTurnIndicator();
}

function updateTurnIndicator() {
  turnIndicatorEl.textContent = `${currentPlayer}'s turn`;
}

function findWinningLine() {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

function handleCellClick(index) {
  if (roundOver || board[index]) return;

  board[index] = currentPlayer;
  const cell = cells[index];
  cell.textContent = currentPlayer;
  cell.classList.add("mark", currentPlayer === "X" ? "x-mark" : "o-mark");
  cell.disabled = true;
  playPlaceSound(currentPlayer);

  const winningLine = findWinningLine();
  if (winningLine) {
    roundOver = true;
    winningLine.forEach((i) => cells[i].classList.add("win"));
    scores[currentPlayer]++;
    saveScores();
    renderScores();
    playWinSound();
    showMessage(`${currentPlayer} wins!`);
    return;
  }

  if (board.every((v) => v)) {
    roundOver = true;
    scores.draw++;
    saveScores();
    renderScores();
    playDrawSound();
    showMessage("It's a draw!");
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateTurnIndicator();
}

function showMessage(text) {
  messageTextEl.textContent = text;
  messageEl.classList.remove("hidden");
}

document.getElementById("new-game").addEventListener("click", () => {
  playClickSound();
  startRound();
});
document.getElementById("try-again").addEventListener("click", () => {
  playClickSound();
  startRound();
});

renderScores();
startRound();
