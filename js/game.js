// Инициализация игры
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gameInfo = document.getElementById('gameInfo');
    const startScreen = document.getElementById('startScreen');
    const startButton = document.getElementById('startButton');
    const endScreen = document.createElement('div');
    endScreen.style.position = 'fixed';
    endScreen.style.top = '0';
    endScreen.style.left = '0';
    endScreen.style.width = '100%';
    endScreen.style.height = '100%';
    endScreen.style.display = 'none';
    endScreen.style.flexDirection = 'column';
    endScreen.style.justifyContent = 'center';
    endScreen.style.alignItems = 'center';
    endScreen.style.zIndex = '200';
    document.body.appendChild(endScreen);

    const endMessage = document.createElement('div');
    endMessage.style.fontSize = '24px';
    endMessage.style.fontWeight = 'bold';
    endMessage.style.textAlign = 'center';
    endMessage.style.padding = '20px';
    endMessage.style.borderRadius = '10px';
    endMessage.style.maxWidth = '80%';
    endScreen.appendChild(endMessage);

    const restartButton = document.createElement('button');
    restartButton.textContent = 'Играть снова';
    restartButton.style.marginTop = '20px';
    restartButton.style.padding = '10px 20px';
    restartButton.style.fontSize = '18px';
    restartButton.style.borderRadius = '5px';
    restartButton.style.backgroundColor = '#4CAF50';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.cursor = 'pointer';
    endScreen.appendChild(restartButton);

    restartButton.addEventListener('click', function() {
        endScreen.style.display = 'none';
        resetGame();
    });
    
    // Настройки игры
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 400;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Аудио элементы
    const coinSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2095/2095-preview.mp3');
    coinSound.volume = 0.3;
    
    const levelMusic = [
        new Audio('https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3'), // Уровень 1
        new Audio('https://assets.mixkit.co/music/preview/mixkit-adventure-game-loop-625.mp3'), // Уровень 2
        new Audio('https://assets.mixkit.co/music/preview/mixkit-sci-fi-game-loop-666.mp3') // Уровень 3 (космос)
    ];
    
    levelMusic.forEach(music => {
        music.loop = true;
        music.volume = 0.2;
    });
    
    // Игровые переменные
    let level = 1;
    let coins = 0;
    let gameOver = false;
    let gameStarted = false;
    let cameraOffset = 0;
    let lives = 6;
    let invincible = false;
    let invincibleTimer = 0;
    let currentMusic = null;
    
    // Игрок
    const player = {
        x: 50,
        y: 300,
        width: 32,
        height: 48,
        speed: 2.5,
        jumpPower: 7,
        gravity: 0.125,
        velX: 0,
        velY: 0,
        isJumping: false,
        direction: 1,
        canJump: true, // Новое свойство для контроля прыжка
        draw: function() {
            if (invincible && Math.floor(invincibleTimer / 5) % 2 === 0) {
                return;
            }
            
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(this.x - cameraOffset, this.y, this.width, this.height);
            
            ctx.fillStyle = '#3498db';
            ctx.fillRect(this.x - cameraOffset + 8, this.y - 5, 16, 10);
            
            ctx.fillStyle = 'white';
            const eyeOffset = this.direction === 1 ? 12 : 8;
            ctx.fillRect(this.x - cameraOffset + eyeOffset, this.y, 4, 4);
        }
    };
    
    // Монеты
    let coinsList = [];
    
    // Враги
    let enemies = [];
    
    // Платформы
    let platforms = [];
    
    // Флаг (конец уровня)
    let flag = null;
    
    // Уровни
    function loadLevel(levelNum) {
        // Остановить текущую музыку
        if (currentMusic) {
            currentMusic.pause();
            currentMusic.currentTime = 0;
        }
        
        // Запустить музыку для нового уровня
        currentMusic = levelMusic[levelNum - 1];
        currentMusic.play().catch(e => console.log("Автовоспроизведение заблокировано"));
        
        platforms = [];
        coinsList = [];
        enemies = [];
        flag = null;
        
        if (levelNum === 1) {
            // Уровень 1 (природа)
            ctx.fillStyle = '#6b8cff';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            platforms = [
                {x: 0, y: 350, width: 200, height: 20, color: '#2ecc71'},
                {x: 250, y: 300, width: 150, height: 20, color: '#2ecc71'},
                {x: 450, y: 250, width: 200, height: 20, color: '#2ecc71'},
                {x: 700, y: 350, width: 100, height: 20, color: '#2ecc71'}
            ];
            
            coinsList = [
                {x: 100, y: 310, width: 16, height: 16, collected: false},
                {x: 300, y: 260, width: 16, height: 16, collected: false},
                {x: 500, y: 210, width: 16, height: 16, collected: false}
            ];
            
            enemies = [
                {x: 350, y: 270, width: 32, height: 32, speed: 0.5, direction: -1},
                {x: 550, y: 220, width: 32, height: 32, speed: 0.75, direction: 1}
            ];
            
            flag = {x: 750, y: 290, width: 20, height: 60, color: '#e74c3c'};
            
        } else if (levelNum === 2) {
            // Уровень 2 (пещеры)
            ctx.fillStyle = '#34495e';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            platforms = [
                {x: 0, y: 350, width: 150, height: 20, color: '#e67e22'},
                {x: 200, y: 300, width: 100, height: 20, color: '#e67e22'},
                {x: 350, y: 250, width: 150, height: 20, color: '#e67e22'},
                {x: 550, y: 200, width: 100, height: 20, color: '#e67e22'},
                {x: 700, y: 300, width: 100, height: 20, color: '#e67e22'}
            ];
            
            coinsList = [
                {x: 50, y: 310, width: 16, height: 16, collected: false},
                {x: 250, y: 260, width: 16, height: 16, collected: false},
                {x: 400, y: 210, width: 16, height: 16, collected: false},
                {x: 600, y: 160, width: 16, height: 16, collected: false}
            ];
            
            enemies = [
                {x: 220, y: 270, width: 32, height: 32, speed: 1, direction: -1},
                {x: 400, y: 220, width: 32, height: 32, speed: 0.5, direction: 1},
                {x: 600, y: 170, width: 32, height: 32, speed: 0.75, direction: -1}
            ];
            
            flag = {x: 750, y: 250, width: 20, height: 60, color: '#e74c3c'};
            
        } else if (levelNum === 3) {
            // Уровень 3 (космос)
            ctx.fillStyle = '#0f0f1a';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            // Звезды на фоне
            for (let i = 0; i < 100; i++) {
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random()})`;
                ctx.fillRect(
                    Math.random() * GAME_WIDTH, 
                    Math.random() * GAME_HEIGHT, 
                    1 + Math.random() * 2, 
                    1 + Math.random() * 2
                );
            }
            
            platforms = [
                {x: 0, y: 350, width: 100, height: 20, color: '#8e44ad'},
                {x: 150, y: 300, width: 100, height: 20, color: '#8e44ad'},
                {x: 300, y: 250, width: 100, height: 20, color: '#8e44ad'},
                {x: 450, y: 200, width: 100, height: 20, color: '#8e44ad'},
                {x: 600, y: 150, width: 100, height: 20, color: '#8e44ad'},
                {x: 700, y: 250, width: 100, height: 20, color: '#8e44ad'}
            ];
            
            coinsList = [
                {x: 50, y: 310, width: 16, height: 16, collected: false},
                {x: 200, y: 260, width: 16, height: 16, collected: false},
                {x: 350, y: 210, width: 16, height: 16, collected: false},
                {x: 500, y: 160, width: 16, height: 16, collected: false},
                {x: 650, y: 110, width: 16, height: 16, collected: false}
            ];
            
            enemies = [
                {x: 180, y: 270, width: 32, height: 32, speed: 1.2, direction: -1},
                {x: 330, y: 220, width: 32, height: 32, speed: 1.5, direction: 1},
                {x: 480, y: 170, width: 32, height: 32, speed: 1, direction: -1},
                {x: 630, y: 120, width: 32, height: 32, speed: 1.3, direction: 1}
            ];
            
            flag = {x: 750, y: 110, width: 20, height: 60, color: '#3498db'};
        }
    }
    
    // Состояния кнопок
    const keys = {
        left: false,
        right: false,
        up: false,
        space: false
    };

    // Обработчики клавиш
    function handleKeyDown(e) {
        if (e.key === 'ArrowLeft') keys.left = true;
        if (e.key === 'ArrowRight') keys.right = true;
        if (e.key === 'ArrowUp') keys.up = true;
        if (e.key === ' ') keys.space = true;
        
        // Прыжок при нажатии
        if ((keys.up || keys.space) && !player.isJumping && player.canJump) {
            player.velY = -player.jumpPower;
            player.isJumping = true;
            player.canJump = false;
            setTimeout(() => player.canJump = true, 100); // Защита от спама прыжков
        }
    }

    function handleKeyUp(e) {
        if (e.key === 'ArrowLeft') keys.left = false;
        if (e.key === 'ArrowRight') keys.right = false;
        if (e.key === 'ArrowUp') keys.up = false;
        if (e.key === ' ') keys.space = false;
    }

    // Управление
    function setupControls() {
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const jumpBtn = document.getElementById('jumpBtn');
        
        // Мобильное управление
        leftBtn.addEventListener('touchstart', () => { 
            keys.left = true;
            player.direction = -1; 
        });
        leftBtn.addEventListener('touchend', () => { 
            keys.left = false;
            if (!keys.right) player.velX = 0;
        });
        
        rightBtn.addEventListener('touchstart', () => { 
            keys.right = true;
            player.direction = 1; 
        });
        rightBtn.addEventListener('touchend', () => { 
            keys.right = false;
            if (!keys.left) player.velX = 0;
        });
        
        jumpBtn.addEventListener('touchstart', () => {
            if (!player.isJumping && player.canJump) {
                player.velY = -player.jumpPower;
                player.isJumping = true;
                player.canJump = false;
                setTimeout(() => player.canJump = true, 100);
            }
        });
        
        // Управление с клавиатуры
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
    }
    
    // Проверка столкновений
      function checkCollisions() {
        player.isJumping = true;
        
        // Столкновение с платформами
        for (const platform of platforms) {
            if (player.x < platform.x + platform.width &&
                player.x + player.width > platform.x &&
                player.y + player.height > platform.y &&
                player.y + player.height < platform.y + platform.height + player.velY) {
                
                player.y = platform.y - player.height;
                player.velY = 0;
                player.isJumping = false;
            }
        }
        
        // Столкновение с врагами
        if (!invincible) {
            for (const enemy of enemies) {
                if (player.x < enemy.x + enemy.width &&
                    player.x + player.width > enemy.x &&
                    player.y < enemy.y + enemy.height &&
                    player.y + player.height > enemy.y) {
                    
                    lives--;
                    gameInfo.textContent = `Уровень: ${level} | Монеты: ${coins} | Жизни: ${lives}`;
                    
                    if (lives <= 0) {
                        gameOver = true;
                        resetGame();
                    } else {
                        invincible = true;
                        invincibleTimer = 120;
                    }
                }
            }
        }
        
        // Сбор монет
        for (const coin of coinsList) {
            if (!coin.collected &&
                player.x < coin.x + coin.width &&
                player.x + player.width > coin.x &&
                player.y < coin.y + coin.height &&
                player.y + player.height > coin.y) {
                
                coin.collected = true;
                coins++;
                coinSound.currentTime = 0;
                coinSound.play();
                gameInfo.textContent = `Уровень: ${level} | Монеты: ${coins} | Жизни: ${lives}`;
            }
        }
        
        // Проверка достижения флага
            if (flag &&
        player.x < flag.x + flag.width &&
        player.x + player.width > flag.x &&
        player.y < flag.y + flag.height &&
        player.y + player.height > flag.y) {
        
        if (level < 3) {
            level++;
            loadLevel(level);
            player.x = 50;
            player.y = 300;
            gameInfo.textContent = `Уровень: ${level} | Монеты: ${coins} | Жизни: ${lives}`;
        } else {
            gameOver = true;
            
            // Общее количество монет на всех уровнях
            const totalCoins = 
                (level === 1 ? 3 : 0) + // Монеты на уровне 1
                (level >= 2 ? 4 : 0) +  // Монеты на уровне 2
                (level >= 3 ? 5 : 0);   // Монеты на уровне 3
            
            // Проверяем, собраны ли все монеты
            const allCoinsCollected = coins >= totalCoins;
            
            if (allCoinsCollected) {
                endScreen.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                endMessage.style.color = '#000';
                endMessage.textContent = 'Ты собрал все шекели и тусишь на полную катушку!';
            } else {
                endScreen.style.backgroundColor = 'rgba(100, 100, 100, 0.9)';
                endMessage.style.color = '#fff';
                endMessage.textContent = 'Ты прошел, но не собрал всех шекелей, тусишь не на полную катушку';
            }
            
            endScreen.style.display = 'flex';
            gameInfo.textContent = `Игра окончена | Монеты: ${coins}`;
        }
    }

        // Падение за экран
        if (player.y > GAME_HEIGHT) {
            lives--;
            gameInfo.textContent = `Уровень: ${level} | Монеты: ${coins} | Жизни: ${lives}`;
            
            if (lives <= 0) {
                gameOver = true;
                resetGame();
            } else {
                player.y = 50;
                player.x = 50;
                player.velY = 0;
                invincible = true;
                invincibleTimer = 120;
            }
        }
    }
    
    // Обновление врагов
    function updateEnemies() {
        for (const enemy of enemies) {
            enemy.x += enemy.speed * enemy.direction;
            
            // Разворот при достижении края платформы
            let onPlatform = false;
            for (const platform of platforms) {
                if (enemy.x > platform.x && enemy.x < platform.x + platform.width &&
                    enemy.y + enemy.height >= platform.y && enemy.y + enemy.height <= platform.y + 5) {
                    onPlatform = true;
                    
                    if ((enemy.direction === -1 && enemy.x <= platform.x) ||
                        (enemy.direction === 1 && enemy.x + enemy.width >= platform.x + platform.width)) {
                        enemy.direction *= -1;
                    }
                }
            }
            
            if (!onPlatform) {
                enemy.direction *= -1;
            }
        }
    }
    
    // Отрисовка игры
    function draw() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Фон
        ctx.fillStyle = '#6b8cff';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Облака
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(100 - cameraOffset * 0.2, 50, 30, 0, Math.PI * 2);
        ctx.arc(130 - cameraOffset * 0.2, 50, 35, 0, Math.PI * 2);
        ctx.arc(80 - cameraOffset * 0.2, 70, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(400 - cameraOffset * 0.2, 80, 40, 0, Math.PI * 2);
        ctx.arc(430 - cameraOffset * 0.2, 80, 35, 0, Math.PI * 2);
        ctx.arc(380 - cameraOffset * 0.2, 100, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Платформы
        for (const platform of platforms) {
            ctx.fillStyle = platform.color;
            ctx.fillRect(platform.x - cameraOffset, platform.y, platform.width, platform.height);
        }
        
        // Монеты
        for (const coin of coinsList) {
            if (!coin.collected) {
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.arc(coin.x - cameraOffset + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#f39c12';
                ctx.beginPath();
                ctx.arc(coin.x - cameraOffset + coin.width/2, coin.y + coin.height/2, coin.width/3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Враги
        for (const enemy of enemies) {
            ctx.fillStyle = '#8e44ad';
            ctx.fillRect(enemy.x - cameraOffset, enemy.y, enemy.width, enemy.height);
            
            ctx.fillStyle = 'white';
            const eyeX = enemy.direction === 1 ? 
                enemy.x - cameraOffset + 8 : 
                enemy.x - cameraOffset + enemy.width - 12;
            ctx.fillRect(eyeX, enemy.y + 10, 4, 4);
        }
        
        // Флаг
        if (flag) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(flag.x - cameraOffset, flag.y, flag.width, flag.height);
            
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.moveTo(flag.x - cameraOffset + flag.width, flag.y);
            ctx.lineTo(flag.x - cameraOffset + flag.width + 30, flag.y + 15);
            ctx.lineTo(flag.x - cameraOffset + flag.width, flag.y + 30);
            ctx.closePath();
            ctx.fill();
        }
        
        // Игрок
        player.draw();
    }
    
    // Обновление игры
    function update() {
        if (gameOver) return;
        
        // Обновление движения
        player.velX = 0;
        if (keys.left) {
            player.velX = -player.speed;
            player.direction = -1;
        }
        if (keys.right) {
            player.velX = player.speed;
            player.direction = 1;
        }
        
        player.x += player.velX;
        player.y += player.velY;
        player.velY += player.gravity;
        
        // Ограничение движения
        if (player.x < 0) player.x = 0;
        if (player.x > GAME_WIDTH - player.width) {
            player.x = GAME_WIDTH - player.width;
        }
        
        cameraOffset = Math.max(0, player.x - GAME_WIDTH / 3);
        
        if (invincible) {
            invincibleTimer--;
            if (invincibleTimer <= 0) {
                invincible = false;
            }
        }
        
        checkCollisions();
        updateEnemies();
    }
    
    // Сброс игры
    function resetGame() {
        level = 1;
        coins = 0;
        lives = 6;
        gameOver = false;
        invincible = false;
        invincibleTimer = 0;
        player.x = 50;
        player.y = 300;
        player.velX = 0;
        player.velY = 0;
        loadLevel(1);
        gameInfo.textContent = `Уровень: ${level} | Монеты: ${coins} | Жизни: ${lives}`;
        
        // Сбрасываем состояние кнопок
        keys.left = false;
        keys.right = false;
        keys.up = false;
        keys.space = false;
    }
    
    // Игровой цикл
    function gameLoop() {
        if (!gameStarted) return;
        
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    // Начало игры
    startButton.addEventListener('click', function() {
        startScreen.style.display = 'none';
        gameStarted = true;
        resetGame();
        setupControls();
        gameLoop();
    });
});