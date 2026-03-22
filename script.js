const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 20;
const GRID_SIZE = 20;
const BASE_SPEED = 120;
const SPEED_UP_EVERY = 5;

let snake;
let direction;
let food;
let score;
let level;
let game;
let paused = false;
let speed = BASE_SPEED;
let isMuted = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function ensureAudioContext() {
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(e => console.warn("Audio resume failed", e));
  }
}

function playBeep(frequency, duration, volume = 0.14) {
  if (isMuted) return;
  ensureAudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}

function playEatSound() {
  playBeep(790, 90, 0.15);
  setTimeout(() => playBeep(1046, 80, 0.12), 90 / 2);
}

function playCrashSound() {
  playBeep(160, 180, 0.24);
  setTimeout(() => playBeep(120, 220, 0.2), 90);
}

function getHighScore() {
  return Number(localStorage.getItem("snakeHighScore") || 0);
}

function setHighScore(value) {
  localStorage.setItem("snakeHighScore", value);
  document.getElementById("highScore").innerText = value;
}

function updateHud() {
  document.getElementById("score").innerText = score;
  document.getElementById("speedLevel").innerText = level;
}

function getIntervalFromLevel() {
  return Math.max(40, BASE_SPEED - (level - 1) * 10);
}

function randomFoodPosition() {
  const x = Math.floor(Math.random() * GRID_SIZE) * box;
  const y = Math.floor(Math.random() * GRID_SIZE) * box;
  const overlap = snake.some(segment => segment.x === x && segment.y === y);
  return overlap ? randomFoodPosition() : { x, y };
}

function initGame() {
  snake = [{ x: 200, y: 200 }];
  direction = "RIGHT";
  score = 0;
  level = 1;
  paused = false;
  speed = getIntervalFromLevel();

  document.getElementById("restartBtn").style.display = "none";
  document.getElementById("pauseBtn").innerText = "Pause";

  const highScore = getHighScore();
  document.getElementById("highScore").innerText = highScore;

  food = randomFoodPosition();

  if (game) clearInterval(game);
  game = setInterval(draw, speed);

  updateHud();
}

function setSpeed(newSpeed) {
  speed = newSpeed;
  clearInterval(game);
  game = setInterval(draw, speed);
  updateHud();
}

function changeDirection(event) {
  ensureAudioContext();
  if (event.key === "p" || event.key === "P") {
    togglePause();
    return;
  }

  const key = event.key;
  if ((key === "ArrowUp" || key === "w" || key === "W") && direction !== "DOWN") direction = "UP";
  else if ((key === "ArrowDown" || key === "s" || key === "S") && direction !== "UP") direction = "DOWN";
  else if ((key === "ArrowLeft" || key === "a" || key === "A") && direction !== "RIGHT") direction = "LEFT";
  else if ((key === "ArrowRight" || key === "d" || key === "D") && direction !== "LEFT") direction = "RIGHT";
}

document.addEventListener("keydown", changeDirection);

function changeDirectionKeyboard(newDir) {
  const opposite = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
  if (newDir !== opposite[direction]) direction = newDir;
}

function togglePause() {
  paused = !paused;
  document.getElementById("pauseBtn").innerText = paused ? "Resume" : "Pause";
}

function toggleMute() {
  isMuted = !isMuted;
  const muteBtn = document.getElementById("muteBtn");
  muteBtn.innerText = isMuted ? "🔇" : "🔊";
}

function draw() {
  if (paused) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText("Paused", canvas.width / 2 - 30, canvas.height / 2);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawCurvySnake();

  ctx.fillStyle = "red";
  ctx.fillRect(food.x, food.y, box, box);

  let headX = snake[0].x;
  let headY = snake[0].y;

  if (direction === "UP") headY -= box;
  if (direction === "DOWN") headY += box;
  if (direction === "LEFT") headX -= box;
  if (direction === "RIGHT") headX += box;

  const newHead = { x: headX, y: headY };

  const hitWall = headX < 0 || headX >= canvas.width || headY < 0 || headY >= canvas.height;
  if (hitWall || collision(newHead, snake)) {
    clearInterval(game);
    document.getElementById("restartBtn").style.display = "block";
    setHighScore(Math.max(score, getHighScore()));
    playCrashSound();
    return;
  }

  if (headX === food.x && headY === food.y) {
    score += 1;
    food = randomFoodPosition();
    playEatSound();

    if (score % SPEED_UP_EVERY === 0) {
      level += 1;
      setSpeed(getIntervalFromLevel());
    }

    updateHud();
  } else {
    snake.pop();
  }

  snake.unshift(newHead);

  if (score > getHighScore()) {
    setHighScore(score);
  }
}

function collision(head, body) {
  return body.some(segment => segment.x === head.x && segment.y === head.y);
}

function roundRect(ctx, x, y, width, height, radius) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawSegment(segment, head) {
  const radius = 5;
  ctx.fillStyle = head ? "#ccff33" : "#39a64a";
  ctx.strokeStyle = head ? "#e8ff80" : "#1f7a2e";
  ctx.lineWidth = head ? 2 : 1;
  roundRect(ctx, segment.x + 1, segment.y + 1, box - 2, box - 2, radius);
  ctx.fill();
  ctx.stroke();
}

function drawCurvySnake() {
  if (snake.length === 0) return;

  const centers = snake.map(seg => ({ x: seg.x + box / 2, y: seg.y + box / 2 }));

  ctx.save();
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#7fff00";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(centers[0].x, centers[0].y);
  for (let i = 1; i < centers.length; i++) {
    const px = centers[i - 1].x;
    const py = centers[i - 1].y;
    const cx = centers[i].x;
    const cy = centers[i].y;
    const midX = (px + cx) / 2;
    const midY = (py + cy) / 2;
    ctx.quadraticCurveTo(px, py, midX, midY);
  }
  ctx.stroke();

  // body circles for shiny mobile style
  centers.forEach((center, index) => {
    ctx.beginPath();
    ctx.arc(center.x, center.y, box / 2 - 2, 0, 2 * Math.PI);
    ctx.fillStyle = index === 0 ? "#e8ff80" : "#39a64a";
    ctx.fill();
    ctx.strokeStyle = index === 0 ? "#ccff33" : "#1f7a2e";
    ctx.lineWidth = index === 0 ? 2 : 1;
    ctx.stroke();
  });

  ctx.restore();
}

function restartGame() {
  initGame();
}

window.addEventListener("mousedown", ensureAudioContext);
window.addEventListener("touchstart", ensureAudioContext);

initGame();