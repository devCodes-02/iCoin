const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

canvas.width = 740;
canvas.height = 500;

let gameState = {
    score: 0,
    highScore: localStorage.getItem('coinCollectorHighScore') || 0,
    level: 1,
    lives: 3,
    gameActive: false,
    powerUpActive: false,
    powerUpTimer: 0
};

let player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    width: 60,
    height: 60,
    speed: 8
};

let coins = [];
let bombs = [];
let particles = [];
let keys = {};
let coinSpawnTimer = 0;
let bombSpawnTimer = 0;
let animationId;
let frameCount = 0;

document.getElementById('highScore').textContent = gameState.highScore;

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

leftBtn.addEventListener('mousedown', () => keys['ArrowLeft'] = true);
leftBtn.addEventListener('mouseup', () => keys['ArrowLeft'] = false);
leftBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['ArrowLeft'] = true;
});
leftBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['ArrowLeft'] = false;
});

rightBtn.addEventListener('mousedown', () => keys['ArrowRight'] = true);
rightBtn.addEventListener('mouseup', () => keys['ArrowRight'] = false);
rightBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['ArrowRight'] = true;
});
rightBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['ArrowRight'] = false;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

function startGame() {
    startScreen.classList.add('hidden');
    gameState.gameActive = true;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    coins = [];
    bombs = [];
    particles = [];
    player.x = canvas.width / 2;
    updateUI();
    gameLoop();
}

function restartGame() {
    gameOverScreen.classList.add('hidden');
    startGame();
}

function gameLoop() {
    if (!gameState.gameActive) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    update();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    frameCount++;
    
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    
    coinSpawnTimer++;
    bombSpawnTimer++;
    
    let coinSpawnRate = Math.max(60 - gameState.level * 5, 30);
    let bombSpawnRate = 80;
    
    if (coinSpawnTimer > coinSpawnRate) {
        spawnCoin();
        coinSpawnTimer = 0;
    }
    
    if (bombSpawnTimer > bombSpawnRate) {
        spawnBomb();
        bombSpawnTimer = 0;
    }
    
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].y += 3 + gameState.level * 0.5;
        coins[i].rotation += 0.1;
        
        if (checkCollision(player, coins[i])) {
            let coin = coins.splice(i, 1)[0];
            collectCoin(coin);
        } else if (coins[i].y > canvas.height) {
            coins.splice(i, 1);
            missedCoin();
        }
    }
    
    for (let i = bombs.length - 1; i >= 0; i--) {
        bombs[i].y += 4 + gameState.level * 0.5;
        bombs[i].rotation += 0.15;
        
        if (checkCollision(player, bombs[i])) {
            bombs.splice(i, 1);
            hitBomb();
        } else if (bombs[i].y > canvas.height) {
            bombs.splice(i, 1);
        }
    }
    
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.3;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
    
    if (gameState.powerUpActive) {
        gameState.powerUpTimer--;
        if (gameState.powerUpTimer <= 0) {
            gameState.powerUpActive = false;
        }
    }
    
    if (gameState.score > 0 && gameState.score % 100 === 0 && coins.length === 0) {
        gameState.level++;
        updateUI();
    }
}

function draw() {
    if (gameState.powerUpActive) {
        ctx.save();
        ctx.strokeStyle = 'rgba(79, 172, 254, 0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    drawPlayer();
    
    coins.forEach(coin => drawCoin(coin));
    bombs.forEach(bomb => drawBomb(bomb));
    particles.forEach(particle => drawParticle(particle));
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-player.width / 2, -10, player.width, 20);
    
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.arc(0, -15, 20, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-8, -18, 3, 0, Math.PI * 2);
    ctx.arc(8, -18, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -12, 8, 0, Math.PI);
    ctx.stroke();
    
    ctx.restore();
}

function drawCoin(coin) {
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.rotate(coin.rotation);
    
    let gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size);
    
    if (coin.type === 'power') {
        gradient.addColorStop(0, '#4facfe');
        gradient.addColorStop(1, '#00f2fe');
    } else if (coin.type === 'golden') {
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(1, '#ff9a00');
    } else {
        gradient.addColorStop(0, '#ffed4e');
        gradient.addColorStop(1, '#ffd700');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-5, -5, coin.size / 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawBomb(bomb) {
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.rotate(bomb.rotation);
    
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(0, 0, bomb.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-3, -bomb.size - 8, 6, 8);
    
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(-3, -bomb.size - 8);
    ctx.lineTo(0, -bomb.size - 15);
    ctx.lineTo(3, -bomb.size - 8);
    ctx.fill();
    
    ctx.restore();
}

function drawParticle(particle) {
    ctx.save();
    ctx.globalAlpha = particle.life / 30;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function spawnCoin() {
    let type = 'normal';
    let rand = Math.random();
    
    if (rand > 0.95) {
        type = 'power';
    } else if (rand > 0.8) {
        type = 'golden';
    }
    
    coins.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: -20,
        size: type === 'power' ? 18 : 15,
        type: type,
        rotation: 0
    });
}

function spawnBomb() {
    bombs.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: -30,
        size: 18,
        rotation: 0
    });
}

function checkCollision(obj1, obj2) {
    let dx = (obj1.x + obj1.width / 2) - obj2.x;
    let dy = (obj1.y + obj1.height / 2) - obj2.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (obj1.width / 2 + obj2.size);
}

function collectCoin(coin) {
    let points = 1;
    let color = '#ffd700';
    
    if (coin.type === 'power') {
        points = 50;
        color = '#4facfe';
        gameState.powerUpActive = true;
        gameState.powerUpTimer = 300;
    } else if (coin.type === 'golden') {
        points = 10;
        color = '#ff9a00';
    }
    
    gameState.score += points;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('coinCollectorHighScore', gameState.highScore);
    }
    
    createParticles(coin.x, coin.y, color);
    updateUI();
}

function hitBomb() {
    if (gameState.powerUpActive) {
        createParticles(player.x + player.width / 2, player.y + player.height / 2, '#4facfe');
        return;
    }
    
    gameState.lives--;
    createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff6b6b');
    updateUI();
    
    if (gameState.lives <= 0) {
        gameOver();
    }
}

function missedCoin() {
    if (gameState.powerUpActive) return;
    
    gameState.lives--;
    updateUI();
    
    if (gameState.lives <= 0) {
        gameOver();
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 3,
            size: Math.random() * 5 + 2,
            color: color,
            life: 30
        });
    }
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('highScore').textContent = gameState.highScore;
    document.getElementById('level').textContent = gameState.level;
    
    let hearts = '';
    for (let i = 0; i < gameState.lives; i++) {
        hearts += '❤️';
    }
    document.getElementById('lives').textContent = hearts || '💀';
}

function gameOver() {
    gameState.gameActive = false;
    cancelAnimationFrame(animationId);
    document.getElementById('finalScore').textContent = gameState.score;
    gameOverScreen.classList.remove('hidden');
}
