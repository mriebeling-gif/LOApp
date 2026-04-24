const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRAVITY = 0.38;
const FLAP_VELOCITY = -7.2;
const PIPE_SPEED = 2.6;
const PIPE_WIDTH = 64;
const PIPE_GAP = 165;
const PIPE_SPAWN_MS = 1250;
const GROUND_HEIGHT = 90;

const bird = {
  x: 95,
  y: canvas.height / 2,
  r: 15,
  velocity: 0,
  tilt: 0,
};

let pipes = [];
let lastSpawn = 0;
let score = 0;
let bestScore = Number(localStorage.getItem("flappyBest") || 0);
let isGameOver = false;
let isStarted = false;
let prevFrame = performance.now();

function resetGame() {
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.tilt = 0;
  pipes = [];
  score = 0;
  lastSpawn = 0;
  isGameOver = false;
  isStarted = false;
  prevFrame = performance.now();
}

function flap() {
  if (isGameOver) return;
  if (!isStarted) isStarted = true;
  bird.velocity = FLAP_VELOCITY;
}

function spawnPipe() {
  const minTop = 80;
  const maxTop = canvas.height - GROUND_HEIGHT - PIPE_GAP - 80;
  const topHeight = Math.random() * (maxTop - minTop) + minTop;

  pipes.push({
    x: canvas.width,
    topHeight,
    bottomY: topHeight + PIPE_GAP,
    scored: false,
  });
}

function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= r * r;
}

function update(deltaMs, now) {
  if (!isStarted || isGameOver) return;

  bird.velocity += GRAVITY * (deltaMs / 16.67);
  bird.y += bird.velocity * (deltaMs / 16.67);
  bird.tilt = Math.max(-0.55, Math.min(1.1, bird.velocity / 8));

  if (now - lastSpawn > PIPE_SPAWN_MS) {
    spawnPipe();
    lastSpawn = now;
  }

  for (const pipe of pipes) {
    pipe.x -= PIPE_SPEED * (deltaMs / 16.67);

    if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x - bird.r) {
      pipe.scored = true;
      score += 1;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("flappyBest", String(bestScore));
      }
    }

    const hitTop = circleRectCollision(
      bird.x,
      bird.y,
      bird.r,
      pipe.x,
      0,
      PIPE_WIDTH,
      pipe.topHeight
    );

    const hitBottom = circleRectCollision(
      bird.x,
      bird.y,
      bird.r,
      pipe.x,
      pipe.bottomY,
      PIPE_WIDTH,
      canvas.height - GROUND_HEIGHT - pipe.bottomY
    );

    if (hitTop || hitBottom) {
      isGameOver = true;
    }
  }

  pipes = pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -5);

  if (bird.y - bird.r <= 0 || bird.y + bird.r >= canvas.height - GROUND_HEIGHT) {
    isGameOver = true;
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#6ed6ff");
  gradient.addColorStop(0.65, "#b8f0ff");
  gradient.addColorStop(1, "#dbf7ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(60, 90, 24, 0, Math.PI * 2);
  ctx.arc(85, 95, 20, 0, Math.PI * 2);
  ctx.arc(105, 90, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(290, 150, 18, 0, Math.PI * 2);
  ctx.arc(310, 155, 15, 0, Math.PI * 2);
  ctx.arc(326, 150, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawPipes() {
  for (const pipe of pipes) {
    ctx.fillStyle = "#2ba84a";
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.fillRect(
      pipe.x,
      pipe.bottomY,
      PIPE_WIDTH,
      canvas.height - GROUND_HEIGHT - pipe.bottomY
    );

    ctx.fillStyle = "#1d7a35";
    ctx.fillRect(pipe.x - 4, pipe.topHeight - 16, PIPE_WIDTH + 8, 16);
    ctx.fillRect(pipe.x - 4, pipe.bottomY, PIPE_WIDTH + 8, 16);
  }
}

function drawGround() {
  ctx.fillStyle = "#d2bc6f";
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

  ctx.fillStyle = "#9ac24b";
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 18);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.tilt);

  ctx.fillStyle = "#ffd34f";
  ctx.beginPath();
  ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(11, -1);
  ctx.lineTo(24, 4);
  ctx.lineTo(11, 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(5, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(7, -5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(score), canvas.width / 2, 65);

  ctx.font = "16px sans-serif";
  ctx.fillText(`Best: ${bestScore}`, canvas.width / 2, 92);

  if (!isStarted && !isGameOver) {
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("Click or Press Space", canvas.width / 2, canvas.height / 2 - 16);
    ctx.font = "16px sans-serif";
    ctx.fillText("to start flying", canvas.width / 2, canvas.height / 2 + 12);
  }

  if (isGameOver) {
    ctx.fillStyle = "rgba(15,23,42,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 18);
    ctx.font = "18px sans-serif";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 18);
  }
}

function frame(now) {
  const deltaMs = Math.min(34, now - prevFrame);
  prevFrame = now;

  update(deltaMs, now);

  drawBackground();
  drawPipes();
  drawGround();
  drawBird();
  drawHUD();

  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  } else if ((event.key === "r" || event.key === "R") && isGameOver) {
    resetGame();
  }
});

canvas.addEventListener("pointerdown", flap);

resetGame();
requestAnimationFrame(frame);
