const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const box = 20;
const canvasSize = 400;
let snake = [{ x: 9 * box, y: 10 * box }];
let direction = 'RIGHT';
let food = randomFood();
let score = 0;
let gameInterval;
const eatSound = document.getElementById('eatSound');
const gameOverSound = document.getElementById('gameOverSound');
let lastMoveTime = 0;
let moveInterval = 100; // ms
const minMoveInterval = 40; // Fastest speed
let nextDirection = direction;
let highScore = localStorage.getItem('snakeHighScore') || 0;
document.getElementById('highscore').innerText = 'High Score: ' + highScore;
const bgMusic = document.getElementById('bgMusic');
const musicVolume = document.getElementById('music-volume');
let musicStarted = false;
musicVolume.addEventListener('input', () => {
    bgMusic.volume = musicVolume.value;
});
bgMusic.volume = musicVolume.value;

function startMusic() {
    if (!musicStarted) {
        bgMusic.currentTime = 0;
        bgMusic.play();
        musicStarted = true;
    }
}

document.addEventListener('keydown', startMusic, { once: true });

// Particle system
let particles = [];
function spawnParticles(x, y, color = '#f00') {
    for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * 2 * Math.PI;
        particles.push({
            x: x + box / 2,
            y: y + box / 2,
            vx: Math.cos(angle) * (2 + Math.random() * 2),
            vy: Math.sin(angle) * (2 + Math.random() * 2),
            alpha: 1,
            color
        });
    }
}
function updateParticles() {
    for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.alpha *= 0.93;
    }
    particles = particles.filter(p => p.alpha > 0.05);
}
function drawParticles() {
    for (let p of particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

function randomFood() {
    return {
        x: Math.floor(Math.random() * (canvasSize / box)) * box,
        y: Math.floor(Math.random() * (canvasSize / box)) * box
    };
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function drawSnake(interp) {
    // Interpolate head
    let head = snake[0];
    let prevHead = snake[1] || head;
    const headX = lerp(prevHead.x, head.x, interp);
    const headY = lerp(prevHead.y, head.y, interp);
    ctx.save();
    ctx.shadowColor = '#0f0';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.roundRect(headX + 2, headY + 2, box - 4, box - 4, 8);
    ctx.fill();
    ctx.restore();
    // Draw eyes on the head
    ctx.save();
    let eyeOffsetX = 0, eyeOffsetY = 0, pupilOffsetX = 0, pupilOffsetY = 0;
    if (direction === 'LEFT') { eyeOffsetX = -4; pupilOffsetX = -2; }
    if (direction === 'RIGHT') { eyeOffsetX = 4; pupilOffsetX = 2; }
    if (direction === 'UP') { eyeOffsetY = -4; pupilOffsetY = -2; }
    if (direction === 'DOWN') { eyeOffsetY = 4; pupilOffsetY = 2; }
    // Left eye
    ctx.beginPath();
    ctx.arc(headX + box/2 - 4 + eyeOffsetX, headY + box/2 - 4 + eyeOffsetY, 3.2, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + box/2 - 4 + eyeOffsetX + pupilOffsetX, headY + box/2 - 4 + eyeOffsetY + pupilOffsetY, 1.3, 0, 2 * Math.PI);
    ctx.fillStyle = '#222';
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(headX + box/2 + 4 + eyeOffsetX, headY + box/2 - 4 + eyeOffsetY, 3.2, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + box/2 + 4 + eyeOffsetX + pupilOffsetX, headY + box/2 - 4 + eyeOffsetY + pupilOffsetY, 1.3, 0, 2 * Math.PI);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.restore();
    // Draw the rest of the body (no interpolation)
    for (let i = 1; i < snake.length; i++) {
        ctx.save();
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(snake[i].x + 2, snake[i].y + 2, box - 4, box - 4, 8);
        ctx.fill();
        ctx.restore();
    }
}

function render(now) {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Interpolation factor
    let interp = Math.min(1, (now - lastMoveTime) / moveInterval);
    drawSnake(interp);
    drawParticles();

    // Draw food as a circle with shadow
    ctx.save();
    ctx.shadowColor = '#f00';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(food.x + box / 2, food.y + box / 2, box / 2.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    updateParticles();
    requestAnimationFrame(render);
}

function gameStep() {
    let head = { ...snake[0] };
    direction = nextDirection;
    if (direction === 'LEFT') head.x -= box;
    if (direction === 'UP') head.y -= box;
    if (direction === 'RIGHT') head.x += box;
    if (direction === 'DOWN') head.y += box;

    // Check collision with wall
    if (
        head.x < 0 || head.x >= canvasSize ||
        head.y < 0 || head.y >= canvasSize ||
        collision(head, snake)
    ) {
        clearInterval(gameInterval);
        gameOverSound.currentTime = 0;
        gameOverSound.play();
        showGameOver();
        return;
    }

    // Check if snake eats food
    if (head.x === food.x && head.y === food.y) {
        score++;
        document.getElementById('score').innerText = 'Score: ' + score;
        food = randomFood();
        eatSound.currentTime = 0;
        eatSound.play();
        spawnParticles(head.x, head.y, '#f00');
        // Increase speed every 3 points
        let newInterval = Math.max(minMoveInterval, 100 - Math.floor(score / 3) * 8);
        if (newInterval !== moveInterval) {
            moveInterval = newInterval;
            clearInterval(gameInterval);
            gameInterval = setInterval(gameStep, moveInterval);
        }
    } else {
        snake.pop();
    }

    snake.unshift(head);
    lastMoveTime = performance.now();
}

function collision(head, array) {
    for (let i = 0; i < array.length; i++) {
        if (head.x === array[i].x && head.y === array[i].y) {
            return true;
        }
    }
    return false;
}

function showGameOver() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('gameover-screen').style.display = 'flex';
    document.getElementById('final-score').innerText = 'Your Score: ' + score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('highscore').innerText = 'High Score: ' + highScore;
    }
}

document.getElementById('restart-btn').onclick = function() {
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    startGame();
};

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' && direction !== 'RIGHT') nextDirection = 'LEFT';
    if (e.key === 'ArrowUp' && direction !== 'DOWN') nextDirection = 'UP';
    if (e.key === 'ArrowRight' && direction !== 'LEFT') nextDirection = 'RIGHT';
    if (e.key === 'ArrowDown' && direction !== 'UP') nextDirection = 'DOWN';
});

function startGame() {
    direction = 'RIGHT';
    nextDirection = 'RIGHT';
    snake = [{ x: 9 * box, y: 10 * box }];
    food = randomFood();
    score = 0;
    document.getElementById('score').innerText = 'Score: 0';
    document.getElementById('highscore').innerText = 'High Score: ' + highScore;
    clearInterval(gameInterval);
    moveInterval = 100;
    lastMoveTime = performance.now();
    gameInterval = setInterval(gameStep, moveInterval);
    requestAnimationFrame(render);
}

startGame(); 
