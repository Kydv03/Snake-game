const board = document.querySelector(".board");
const startButton = document.querySelector(".btn-start");
const modal = document.querySelector(".modal");
const startGameModal = document.querySelector(".start-game");
const gameOverModal = document.querySelector(".game-over");
const restartButton = document.querySelector(".btn-restart");
const highScoreElement = document.querySelector("#high-score");
const scoreElement = document.querySelector("#score");
const timeElement = document.querySelector("#time");
const finalScoreElement = document.querySelector("#final-score");

const BLOCK_SIZE = 50;

let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let score = 0;
let seconds = 0;

highScoreElement.innerText = highScore;

const cols = Math.floor(board.clientWidth / BLOCK_SIZE);
const rows = Math.floor(board.clientHeight / BLOCK_SIZE);

let intervalId = null;
let timerIntervalId = null;

// Build block grid
const blocks = {};
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const block = document.createElement("div");
    block.classList.add("block");
    board.appendChild(block);
    blocks[`${row}-${col}`] = block;
  }
}

let snake = [];
let direction = "right";
let nextDirection = "right"; // buffer to avoid mid-frame direction change
let food = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function spawnFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * rows),
      y: Math.floor(Math.random() * cols),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function clearBoard() {
  // Remove food
  if (food.x !== undefined) {
    blocks[`${food.x}-${food.y}`]?.classList.remove("food");
  }
  // Remove snake
  snake.forEach((seg) => {
    blocks[`${seg.x}-${seg.y}`]?.classList.remove("fill", "head");
  });
}

function renderBoard() {
  // Draw food
  blocks[`${food.x}-${food.y}`]?.classList.add("food");

  // Draw snake — mark head separately
  snake.forEach((seg, i) => {
    const block = blocks[`${seg.x}-${seg.y}`];
    if (!block) return;
    block.classList.add("fill");
    if (i === 0) block.classList.add("head");
    else block.classList.remove("head");
  });
}

// ─── Game loop ────────────────────────────────────────────────────────────────

function render() {
  // Apply buffered direction
  direction = nextDirection;

  // Calculate new head position
  let head;
  if (direction === "left") head = { x: snake[0].x, y: snake[0].y - 1 };
  else if (direction === "right") head = { x: snake[0].x, y: snake[0].y + 1 };
  else if (direction === "down") head = { x: snake[0].x + 1, y: snake[0].y };
  else head = { x: snake[0].x - 1, y: snake[0].y };

  // Wall collision
  if (head.x < 0 || head.x >= rows || head.y < 0 || head.y >= cols) {
    triggerGameOver();
    return;
  }

  // Self collision — check against all segments except the tail (it's about to move)
  const bodyWithoutTail = snake.slice(0, snake.length - 1);
  if (bodyWithoutTail.some((s) => s.x === head.x && s.y === head.y)) {
    triggerGameOver();
    return;
  }

  // Erase current snake from board
  snake.forEach((seg) => {
    blocks[`${seg.x}-${seg.y}`]?.classList.remove("fill", "head");
  });

  const ateFood = head.x === food.x && head.y === food.y;

  if (ateFood) {
    // Remove food visually
    blocks[`${food.x}-${food.y}`]?.classList.remove("food");

    // Grow: add head, keep tail
    snake.unshift(head);

    // Update score
    score += 10;
    scoreElement.innerText = score;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore.toString());
      highScoreElement.innerText = highScore;
    }

    // Spawn new food
    food = spawnFood();
  } else {
    // Move: add head, remove tail
    snake.unshift(head);
    snake.pop();
  }

  // Redraw snake and food
  renderBoard();
}

// ─── Game over / restart ──────────────────────────────────────────────────────

function triggerGameOver() {
  clearInterval(intervalId);
  clearInterval(timerIntervalId);
  intervalId = null;
  timerIntervalId = null;

  // Flash board briefly
  board.classList.add("flash");
  setTimeout(() => board.classList.remove("flash"), 350);

  // Show modal
  finalScoreElement.innerText = score;
  modal.style.display = "flex";
  startGameModal.style.display = "none";
  gameOverModal.style.display = "flex";
}

function startTimer() {
  timerIntervalId = setInterval(() => {
    seconds++;
    timeElement.innerText = formatTime(seconds);
  }, 1000);
}

function initGame() {
  clearBoard();

  score = 0;
  seconds = 0;
  direction = "right";
  nextDirection = "right";

  scoreElement.innerText = score;
  timeElement.innerText = formatTime(seconds);
  highScoreElement.innerText = highScore;

  // Place snake in the middle-left area
  const startRow = Math.floor(rows / 2);
  snake = [
    { x: startRow, y: 3 },
    { x: startRow, y: 2 },
    { x: startRow, y: 1 },
  ];

  food = spawnFood();
  renderBoard();
}

// ─── Button handlers ──────────────────────────────────────────────────────────

startButton.addEventListener("click", () => {
  modal.style.display = "none";
  initGame();
  intervalId = setInterval(render, 200);
  startTimer();
});

restartButton.addEventListener("click", () => {
  clearInterval(intervalId);
  clearInterval(timerIntervalId);
  modal.style.display = "none";
  startGameModal.style.display = "flex";
  gameOverModal.style.display = "none";
  initGame();
  intervalId = setInterval(render, 200);
  startTimer();
});

// ─── Keyboard input ───────────────────────────────────────────────────────────

const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

addEventListener("keydown", (event) => {
  const map = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };
  const newDir = map[event.key];
  if (!newDir) return;

  // Prevent reversing into yourself
  if (newDir !== OPPOSITE[direction]) {
    nextDirection = newDir;
  }

  // Prevent page scroll with arrow keys during game
  event.preventDefault();
});
