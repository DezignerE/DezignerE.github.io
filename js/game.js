document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы DOM
    const gameContainer = document.getElementById('gameContainer');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gameInfo = document.getElementById('gameInfo');
    const startScreen = document.getElementById('startScreen');
    const startButton = document.getElementById('startButton');
    const endScreen = document.getElementById('endScreen');
    const endMessage = document.getElementById('endMessage');
    const restartButton = document.getElementById('restartButton');
    const soundBtn = document.getElementById('soundBtn');
    let musicEnabled = true;
    
    // Размеры игры (базовые, будут масштабироваться)
    const BASE_WIDTH = 800;
    const BASE_HEIGHT = 400;
    let scaleRatio = 1;
    let gameWidth = BASE_WIDTH;
    let gameHeight = BASE_HEIGHT;
    
    // Функция для масштабирования игры
    function resizeGame() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Рассчитываем соотношение сторон
        const windowRatio = windowWidth / windowHeight;
        const gameRatio = BASE_WIDTH / BASE_HEIGHT;
        
        if (windowRatio < gameRatio) {
            // Окно уже, чем игра - масштабируем по ширине
            scaleRatio = windowWidth / BASE_WIDTH;
            gameWidth = windowWidth;
            gameHeight = gameWidth / gameRatio;
        } else {
            // Окно шире, чем игра - масштабируем по высоте
            scaleRatio = windowHeight / BASE_HEIGHT;
            gameHeight = windowHeight;
            gameWidth = gameHeight * gameRatio;
        }
        
        // Устанавливаем размеры canvas
        canvas.width = BASE_WIDTH;
        canvas.height = BASE_HEIGHT;
        canvas.style.width = gameWidth + 'px';
        canvas.style.height = gameHeight + 'px';
        
        // Обновляем размеры игрового контейнера
        gameContainer.style.width = gameWidth + 'px';
        gameContainer.style.height = gameHeight + 'px';
    }
    
    // Инициализируем размеры при загрузке и при изменении окна
    resizeGame();
    window.addEventListener('resize', resizeGame);
    
    // Аудио элементы
    const coinSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2095/2095-preview.mp3');
    coinSound.volume = 0.3;
    
    const levelMusic = [
        new Audio('https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3'),
        new Audio('https://assets.mixkit.co/music/preview/mixkit-adventure-game-loop-625.mp3'),
        new Audio('https://assets.mixkit.co/music/preview/mixkit-sci-fi-game-loop-666.mp3')
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
    let animationFrame = 0;
    let birds = [];
    
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
        canJump: true,
        frame: 0,
        draw: function() {
            if (invincible && Math.floor(invincibleTimer / 5) % 2 === 0) {
                return;
            }
            
            ctx.save();
            ctx.translate(this.x - cameraOffset, this.y);
            
            // Анимация ходьбы
            if (this.velX !== 0 && !this.isJumping) {
                this.frame = (this.frame + 0.2) % 4;
                const legOffset = Math.floor(this.frame) < 2 ? 0 : 2;
                
                // Ноги
                ctx.fillStyle = '#2980b9';
                ctx.fillRect(8, 38 - legOffset, 6, 10 + legOffset);
                ctx.fillRect(18, 38 - (2 - legOffset), 6, 10 + (2 - legOffset));
            } else {
                // Стоячая поза
                ctx.fillStyle = '#2980b9';
                ctx.fillRect(8, 38, 6, 10);
                ctx.fillRect(18, 38, 6, 10);
            }
            
            // Тело
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(0, 0, this.width, this.height - 10);
            
            // Голова
            ctx.fillStyle = '#3498db';
            ctx.fillRect(8, -5, 16, 10);
            
            // Глаз
            ctx.fillStyle = 'white';
            const eyeOffset = this.direction === 1 ? 12 : 8;
            ctx.fillRect(eyeOffset, 0, 4, 4);
            
            ctx.restore();
        }
    };
    
    // Монеты, враги, платформы, телепорты
    let coinsList = [];
    let enemies = [];
    let platforms = [];
    let teleport = null;
    let teleportAnimation = 0;
    
    // Уровни
    function loadLevel(levelNum) {
        // Остановить текущую музыку
        if (currentMusic) {
            currentMusic.pause();
            currentMusic.currentTime = 0;
        }
        
        // Запустить музыку для нового уровня, если музыка включена
        currentMusic = levelMusic[levelNum - 1];
        if (musicEnabled) {
            currentMusic.play().catch(e => console.log("Ошибка воспроизведения музыки:", e));
        }
        
        if (levelNum === 1) {
            // Уровень 1 (природа)
            platforms = [
                {x: 0, y: 350, width: 200, height: 20, color: '#2ecc71'},
                {x: 250, y: 300, width: 150, height: 20, color: '#2ecc71'},
                {x: 450, y: 250, width: 200, height: 20, color: '#2ecc71'},
                {x: 700, y: 350, width: 100, height: 20, color: '#2ecc71'}
            ];
            
            coinsList = [
                {x: 100, y: 310, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 300, y: 260, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 500, y: 210, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0}
            ];
            
            enemies = [
                {x: 350, y: 270, width: 32, height: 32, speed: 0.5, direction: -1},
                {x: 550, y: 220, width: 32, height: 32, speed: 0.75, direction: 1}
            ];
            
            teleport = {x: 750, y: 290, width: 40, height: 60, color: '#9b59b6', particles: []};
            
            // Создаем птичек для фона
            birds = [];
            for (let i = 0; i < 3; i++) {
                birds.push({
                    x: Math.random() * BASE_WIDTH,
                    y: 50 + Math.random() * 100,
                    speed: 0.5 + Math.random() * 1,
                    frame: Math.floor(Math.random() * 4),
                    size: 10 + Math.random() * 10
                });
            }
            
        } else if (levelNum === 2) {
            // Уровень 2 (пещеры)
            platforms = [
                {x: 0, y: 350, width: 150, height: 20, color: '#e67e22'},
                {x: 200, y: 300, width: 100, height: 20, color: '#e67e22'},
                {x: 350, y: 250, width: 150, height: 20, color: '#e67e22'},
                {x: 550, y: 200, width: 100, height: 20, color: '#e67e22'},
                {x: 700, y: 300, width: 100, height: 20, color: '#e67e22'}
            ];
            
            coinsList = [
                {x: 50, y: 310, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 250, y: 260, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 400, y: 210, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 600, y: 160, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0}
            ];
            
            enemies = [
                {x: 220, y: 270, width: 32, height: 32, speed: 1, direction: -1},
                {x: 400, y: 220, width: 32, height: 32, speed: 0.5, direction: 1},
                {x: 600, y: 170, width: 32, height: 32, speed: 0.75, direction: -1}
            ];
            
            teleport = {x: 750, y: 250, width: 40, height: 60, color: '#3498db', particles: []};
            
        } else if (levelNum === 3) {
            // Уровень 3 (космос)
            platforms = [
                {x: 0, y: 350, width: 100, height: 20, color: '#8e44ad'},
                {x: 150, y: 300, width: 100, height: 20, color: '#8e44ad'},
                {x: 300, y: 250, width: 100, height: 20, color: '#8e44ad'},
                {x: 450, y: 200, width: 100, height: 20, color: '#8e44ad'},
                {x: 600, y: 150, width: 100, height: 20, color: '#8e44ad'},
                {x: 700, y: 250, width: 100, height: 20, color: '#8e44ad'}
            ];
            
            coinsList = [
                {x: 50, y: 310, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 200, y: 260, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 350, y: 210, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 500, y: 160, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0},
                {x: 650, y: 110, width: 16, height: 16, collected: false, bounce: 0, bounceDir: 1, collectAnim: 0}
            ];
            
            enemies = [
                {x: 180, y: 270, width: 32, height: 32, speed: 1.2, direction: -1},
                {x: 330, y: 220, width: 32, height: 32, speed: 1.5, direction: 1},
                {x: 480, y: 170, width: 32, height: 32, speed: 1, direction: -1},
                {x: 630, y: 120, width: 32, height: 32, speed: 1.3, direction: 1}
            ];
            
            teleport = {x: 750, y: 110, width: 40, height: 60, color: '#e74c3c', particles: []};
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
        
        if ((keys.up || keys.space) && !player.isJumping) {
            player.velY = -player.jumpPower;
            player.isJumping = true;
            player.canJump = false;
            setTimeout(() => player.canJump = true, 100);
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
        const handleTouchStart = (btn, key) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                keys[key] = true;
                if (key === 'left') player.direction = -1;
                if (key === 'right') player.direction = 1;
            }, { passive: false });
        };
        
        const handleTouchEnd = (btn, key) => {
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                keys[key] = false;
                if (!keys.left && !keys.right) player.velX = 0;
            }, { passive: false });
        };
        
        handleTouchStart(leftBtn, 'left');
        handleTouchEnd(leftBtn, 'left');
        handleTouchStart(rightBtn, 'right');
        handleTouchEnd(rightBtn, 'right');
        
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!player.isJumping) {
                player.velY = -player.jumpPower;
                player.isJumping = true;
                player.canJump = false;
                setTimeout(() => player.canJump = true, 100);
            }
        }, { passive: false });
        
        // Управление с клавиатуры
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        
        // Отключаем контекстное меню на кнопках
        [leftBtn, rightBtn, jumpBtn].forEach(btn => {
            btn.addEventListener('contextmenu', (e) => e.preventDefault());
        });
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
                        showEndScreen(false);
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
                coin.collectAnim = 15; // Начальное значение для анимации сбора
                coins++;
                coinSound.currentTime = 0;
                coinSound.play();
                gameInfo.textContent = `Уровень: ${level} | Монеты: ${coins} | Жизни: ${lives}`;
            }
        }
        
        // Проверка достижения телепорта
        if (teleport &&
            player.x < teleport.x + teleport.width &&
            player.x + player.width > teleport.x &&
            player.y < teleport.y + teleport.height &&
            player.y + player.height > teleport.y) {
            
            if (level < 3) {
                level++;
                loadLevel(level);
                player.x = 50;
                player.y = 300;
                gameInfo.textContent = `Уровень: ${level} | Монеты: ${coins} | Жизни: ${lives}`;
            } else {
                gameOver = true;
                const totalCoins = 3 + 4 + 5; // Все монеты на всех уровнях
                showEndScreen(coins >= totalCoins);
            }
        }

        // Падение за экран
        if (player.y > BASE_HEIGHT) {
            lives--;
            gameInfo.textContent = `Уровень: ${level} | Монеты: ${coins} | Жизни: ${lives}`;
            
            if (lives <= 0) {
                gameOver = true;
                showEndScreen(false);
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
    
    // Обновление монет
    function updateCoins() {
        for (const coin of coinsList) {
            if (!coin.collected) {
                // Анимация подпрыгивания монет
                coin.bounce += 0.1 * coin.bounceDir;
                if (coin.bounce > 3 || coin.bounce < 0) {
                    coin.bounceDir *= -1;
                }
            } else if (coin.collectAnim > 0) {
                // Анимация сбора монеты
                coin.collectAnim--;
            }
        }
    }
    
    // Обновление птичек (для уровня 1)
    function updateBirds() {
        if (level !== 1) return;
        
        for (let i = 0; i < birds.length; i++) {
            const bird = birds[i];
            bird.x += bird.speed;
            bird.frame = (bird.frame + 0.1) % 4;
            
            // Если птичка улетела за экран, перемещаем её в начало
            if (bird.x > BASE_WIDTH + 50) {
                bird.x = -50;
                bird.y = 50 + Math.random() * 100;
            }
        }
    }
    
    // Обновление телепорта
    function updateTeleport() {
        if (!teleport) return;
        
        teleportAnimation = (teleportAnimation + 0.1) % (Math.PI * 2);
        
        // Добавляем частицы для телепорта
        if (Math.random() < 0.3) {
            teleport.particles.push({
                x: teleport.x + Math.random() * teleport.width,
                y: teleport.y + Math.random() * teleport.height,
                size: 2 + Math.random() * 4,
                alpha: 0.7 + Math.random() * 0.3,
                speedX: -1 + Math.random() * 2,
                speedY: -1 + Math.random() * 2,
                life: 30 + Math.random() * 30
            });
        }
        
        // Обновляем частицы
        for (let i = teleport.particles.length - 1; i >= 0; i--) {
            const p = teleport.particles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            p.life--;
            
            if (p.life <= 0) {
                teleport.particles.splice(i, 1);
            }
        }
    }
    
    // Отрисовка игры
    function draw() {
        // Очистка canvas
        ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        
        // Фон
        if (level === 1) {
            ctx.fillStyle = '#6b8cff';
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
            
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
            
            // Птички
            for (const bird of birds) {
                ctx.save();
                ctx.translate(bird.x - cameraOffset * 0.1, bird.y);
                
                // Тело птички
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.ellipse(0, 0, bird.size, bird.size/2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Крылья (анимированные)
                ctx.fillStyle = '#c0392b';
                const wingY = Math.sin(bird.frame) * 3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(-bird.size, wingY, -bird.size/2, wingY - bird.size/2);
                ctx.quadraticCurveTo(0, wingY, 0, 0);
                ctx.fill();
                
                ctx.restore();
            }
            
        } else if (level === 2) {
            // Фон для уровня 2 (катакомбы)
            ctx.fillStyle = '#34495e';
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
            
            // Рисуем катакомбы
            ctx.fillStyle = '#2c3e50';
            for (let i = 0; i < 10; i++) {
                // Арки
                const x = (i * 150 - cameraOffset * 0.3) % (BASE_WIDTH + 300) - 150;
                ctx.beginPath();
                ctx.arc(x + 75, 350, 75, 0, Math.PI, true);
                ctx.fill();
                
                // Колонны
                ctx.fillRect(x, 0, 30, 350);
                ctx.fillRect(x + 120, 0, 30, 350);
            }
            
            // Камни (уменьшаем частоту мерцания в 5 раз)
            for (let i = 0; i < 20; i++) {
                const x = (i * 100 - cameraOffset * 0.2) % (BASE_WIDTH + 200) - 100;
                const y = 100 + Math.sin(i) * 50;
                const size = 10 + Math.random() * 20;
                const alpha = 0.2 + Math.sin(animationFrame / 50 + i) * 0.1; // Медленное мерцание
                ctx.fillStyle = `rgba(127, 140, 141, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (level === 3) {
            ctx.fillStyle = '#0f0f1a';
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
            
            // Звезды
            for (let i = 0; i < 100; i++) {
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random()})`;
                ctx.fillRect(
                    Math.random() * BASE_WIDTH, 
                    Math.random() * BASE_HEIGHT, 
                    1 + Math.random() * 2, 
                    1 + Math.random() * 2
                );
            }
        }
        
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
                ctx.arc(
                    coin.x - cameraOffset + coin.width/2, 
                    coin.y + coin.height/2 - coin.bounce, 
                    coin.width/2, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
                
                ctx.fillStyle = '#f39c12';
                ctx.beginPath();
                ctx.arc(
                    coin.x - cameraOffset + coin.width/2, 
                    coin.y + coin.height/2 - coin.bounce, 
                    coin.width/3, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
            } else if (coin.collectAnim > 0) {
                // Анимация сбора монеты
                const size = coin.collectAnim;
                ctx.fillStyle = `rgba(241, 196, 15, ${coin.collectAnim / 15})`;
                ctx.beginPath();
                ctx.arc(
                    coin.x - cameraOffset + coin.width/2, 
                    coin.y + coin.height/2 - size, 
                    size, 
                    0, 
                    Math.PI * 2
                );
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
        
        // Телепорт
        if (teleport) {
            // Основание телепорта
            ctx.fillStyle = teleport.color;
            ctx.fillRect(teleport.x - cameraOffset, teleport.y, teleport.width, teleport.height);
            
            // Анимированный портал
            ctx.save();
            ctx.translate(teleport.x - cameraOffset + teleport.width/2, teleport.y + teleport.height/2);
            
            // Внешнее кольцо
            ctx.strokeStyle = `rgba(255, 255, 255, 0.7)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, teleport.width/2 + Math.sin(teleportAnimation) * 3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Внутренний портал
            const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, teleport.width/3);
            gradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0.1)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, teleport.width/3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            
            // Частицы телепорта
            for (const p of teleport.particles) {
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.fillRect(
                    p.x - cameraOffset - p.size/2,
                    p.y - p.size/2,
                    p.size,
                    p.size
                );
            }
        }
        
        // Игрок
        player.draw();
        
        animationFrame++;
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
        if (player.x > BASE_WIDTH - player.width) {
            player.x = BASE_WIDTH - player.width;
        }
        
        cameraOffset = Math.max(0, player.x - BASE_WIDTH / 3);
        
        if (invincible) {
            invincibleTimer--;
            if (invincibleTimer <= 0) {
                invincible = false;
            }
        }
        
        updateCoins();
        updateBirds();
        updateTeleport();
        checkCollisions();
        updateEnemies();
    }
    
    // Показать экран завершения
    function showEndScreen(allCoinsCollected) {
        if (allCoinsCollected) {
            endScreen.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            endMessage.style.color = '#000';
            endMessage.textContent = 'Ты собрал все шекели и тусишь на полную катушку!';
        } else {
            endScreen.style.backgroundColor = 'rgba(100, 100, 100, 0.9)';
            endMessage.style.color = '#fff';
            endMessage.textContent = lives <= 0 ? 'Ты можешь лучше!' : 'Ты прошел, но не собрал всех шекелей, тусишь не на полную катушку';
        }
        
        endScreen.style.display = 'flex';
        gameInfo.textContent = `Игра окончена | Монеты: ${coins}`;
        
        // Остановить музыку при завершении игры
        if (currentMusic) {
            currentMusic.pause();
            currentMusic.currentTime = 0;
        }
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
        
        // Убедимся, что музыка играет, если включена
        if (musicEnabled && currentMusic) {
            currentMusic.play().catch(e => console.log("Ошибка воспроизведения музыки при сбросе:", e));
        }
    }
    
    // Переключение звука
    soundBtn.addEventListener('click', function() {
        musicEnabled = !musicEnabled;
        soundBtn.textContent = musicEnabled ? '🔊' : '🔇';
        
        if (musicEnabled && currentMusic) {
            currentMusic.play().catch(e => console.log("Ошибка воспроизведения музыки:", e));
        } else if (currentMusic) {
            currentMusic.pause();
        }
    });
    
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
    
    // Перезапуск игры
    restartButton.addEventListener('click', function() {
        endScreen.style.display = 'none';
        resetGame();
    });
    
    // Предотвращаем скролл страницы при касании элементов управления
    document.body.addEventListener('touchmove', function(e) {
        if (gameStarted) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Автозапуск музыки после взаимодействия пользователя
    document.addEventListener('click', function initAudio() {
        if (!musicEnabled) return;
        
        levelMusic.forEach(music => {
            music.play().then(() => {
                music.pause();
                music.currentTime = 0;
            }).catch(e => console.log("Аудио инициализировано"));
        });
        
        document.removeEventListener('click', initAudio);
    }, { once: true });
});