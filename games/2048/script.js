const SIZE = 4;
const BEST_SCORE_KEY = "2048-best-score";
const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const messageEl = document.getElementById("message");
const messageTextEl = document.getElementById("message-text");

let grid = [];
let score = 0;
let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
let hasWon = false;
let gameOver = false;
let mergeOccurred = false;
let achievedMilestones = new Set();

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

function playMoveSound() {
  playTone({ freq: 220, duration: 0.07, type: "sine", volume: 0.08 });
}

function playMergeSound(value) {
  const steps = Math.log2(value) - 2;
  const freq = 440 * Math.pow(2, steps / 12);
  playTone({ freq, duration: 0.14, type: "triangle", volume: 0.15 });
}

function playMilestoneSound() {
  playTone({ freq: 523.25, duration: 0.14, type: "square", volume: 0.18 });
  playTone({ freq: 783.99, duration: 0.18, type: "square", volume: 0.18, delay: 0.1 });
}

function playWinSound() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone({ freq, duration: 0.22, type: "triangle", volume: 0.2, delay: i * 0.13 });
  });
}

function playGameOverSound() {
  const notes = [392, 329.63, 261.63];
  notes.forEach((freq, i) => {
    playTone({ freq, duration: 0.3, type: "sine", volume: 0.15, delay: i * 0.15 });
  });
}

function playClickSound() {
  playTone({ freq: 600, duration: 0.05, type: "square", volume: 0.1 });
}

function createEmptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function getEmptyCells() {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

function spawnTile() {
  const empty = getEmptyCells();
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function startGame() {
  grid = createEmptyGrid();
  score = 0;
  hasWon = false;
  gameOver = false;
  achievedMilestones = new Set();
  messageEl.classList.add("hidden");
  spawnTile();
  spawnTile();
  render();
}

function render() {
  boardEl.innerHTML = "";

  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    boardEl.appendChild(cell);
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r][c];
      if (value === 0) continue;
      const tile = document.createElement("div");
      tile.className = `tile tile-${value > 2048 ? 2048 : value}`;
      tile.style.gridRow = r + 1;
      tile.style.gridColumn = c + 1;
      tile.textContent = value;
      boardEl.appendChild(tile);
    }
  }

  scoreEl.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
  }
  bestScoreEl.textContent = bestScore;
}

function slideRowLeft(row) {
  const nonZero = row.filter((v) => v !== 0);
  const merged = [];
  for (let i = 0; i < nonZero.length; i++) {
    if (nonZero[i] === nonZero[i + 1]) {
      const mergedValue = nonZero[i] * 2;
      merged.push(mergedValue);
      score += mergedValue;
      mergeOccurred = true;
      if (mergedValue === 2048 && !hasWon) {
        hasWon = true;
      } else if (mergedValue > 4 && !achievedMilestones.has(mergedValue)) {
        achievedMilestones.add(mergedValue);
        playMilestoneSound();
      }
      playMergeSound(mergedValue);
      i++;
    } else {
      merged.push(nonZero[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return merged;
}

function gridsEqual(a, b) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function cloneGrid(g) {
  return g.map((row) => row.slice());
}

function rotateGridLeft(g) {
  const newGrid = createEmptyGrid();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      newGrid[SIZE - 1 - c][r] = g[r][c];
    }
  }
  return newGrid;
}

function move(direction) {
  if (gameOver) return;

  const before = cloneGrid(grid);
  mergeOccurred = false;
  let rotations = 0;
  if (direction === "up") rotations = 1;
  else if (direction === "right") rotations = 2;
  else if (direction === "down") rotations = 3;

  for (let i = 0; i < rotations; i++) grid = rotateGridLeft(grid);

  grid = grid.map((row) => slideRowLeft(row));

  for (let i = 0; i < (4 - rotations) % 4; i++) grid = rotateGridLeft(grid);

  if (!gridsEqual(before, grid)) {
    spawnTile();
    render();

    if (!mergeOccurred) {
      playMoveSound();
    }

    if (hasWon) {
      playWinSound();
      showMessage("You reached 2048! 🎉");
    } else if (!canMove()) {
      gameOver = true;
      playGameOverSound();
      showMessage("Game Over! No more moves.");
    }
  }
}

function canMove() {
  if (getEmptyCells().length > 0) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r][c];
      if (c < SIZE - 1 && grid[r][c + 1] === value) return true;
      if (r < SIZE - 1 && grid[r + 1][c] === value) return true;
    }
  }
  return false;
}

function showMessage(text) {
  messageTextEl.textContent = text;
  messageEl.classList.remove("hidden");
}

const keyMap = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

document.addEventListener("keydown", (e) => {
  const direction = keyMap[e.key];
  if (direction) {
    e.preventDefault();
    move(direction);
  }
});

let touchStartX = 0;
let touchStartY = 0;

boardEl.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

boardEl.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? "right" : "left");
  } else {
    move(dy > 0 ? "down" : "up");
  }
});

document.getElementById("new-game").addEventListener("click", () => {
  playClickSound();
  startGame();
});
document.getElementById("try-again").addEventListener("click", () => {
  playClickSound();
  startGame();
});

startGame();
