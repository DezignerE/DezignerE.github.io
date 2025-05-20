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
    let bubbleTimer = 0;
    let bubbleText = '';
    let bubbleIndex = 0;
    let bubbleVariants = ['Ай', 'Ой', 'Хорош', 'Бобо', 'Нет', 'эх'];
    function shuffleBubbleVariants() {
        for (let i = bubbleVariants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bubbleVariants[i], bubbleVariants[j]] = [bubbleVariants[j], bubbleVariants[i]];
        }
    }
    
    let coinBubbleTimer = 0;
    let coinBubbleText = '';
    let coinBubbleIndex = 0;
    let coinBubbleVariants = ['Да', 'Йес', 'Шикос', 'Шекелек', 'еще'];
    function shuffleCoinBubbleVariants() {
        for (let i = coinBubbleVariants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [coinBubbleVariants[i], coinBubbleVariants[j]] = [coinBubbleVariants[j], coinBubbleVariants[i]];
        }
    }
    
    let isSecretLevel = false;
    let boss = null;
    let bossDefeated = false;
    let bossVictoryTimer = 0;
    let bossTouch = false; // флаг для контроля однократного снятия жизни при касании босса
    
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
            let blinking = invincible && Math.floor(invincibleTimer / 25) % 2 === 0;
            ctx.save();
            if (blinking) ctx.globalAlpha = 0.4;
            ctx.translate(this.x - cameraOffset, this.y);
            
            // Анимация ходьбы
            if (this.velX !== 0 && !this.isJumping) {
                this.frame = (this.frame + Math.abs(this.velX) * 0.25) % (2 * Math.PI);
                // Ноги как дуги
                for (let i = 0; i < 2; i++) {
                    ctx.save();
                    ctx.translate(14 + i * 10, 32);
                    let phase = this.frame + (i === 0 ? 0 : Math.PI);
                    let angle = Math.sin(phase) * 0.7;
                    ctx.rotate(angle);
                    ctx.fillStyle = '#2980b9';
                    ctx.fillRect(-3, 0, 6, 16);
                    ctx.restore();
                }
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
        if (levelNum >= 1 && levelNum <= 3) {
            currentMusic = levelMusic[levelNum - 1];
            if (musicEnabled) {
                currentMusic.play().catch(e => console.log("Ошибка воспроизведения музыки:", e));
            }
        } else {
            currentMusic = null;
        }
        
        if (levelNum === 1) {
            isSecretLevel = false;
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
            isSecretLevel = false;
            // Уровень 2 (пещеры)
            platforms = [
                {x: 0, y: 350, width: 150, height: 20, color: '#e67e22'},
                {x: 200, y: 300, width: 100, height: 20, color: '#e67e22',
                 moving: true, dir: 1, speed: 1.5, minX: 200, maxX: 230},
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
            isSecretLevel = false;
            // Уровень 3 (космос)
            platforms = [
                {x: 0, y: 350, width: 100, height: 20, color: '#ffffff'},
                {x: 150, y: 300, width: 100, height: 20, color: '#ffffff', moving: true, dir: 1, speed: 1, minY: 250, maxY: 320},
                {x: 300, y: 250, width: 100, height: 20, color: '#ffffff', moving: true, dir: -1, speed: 1.2, minY: 200, maxY: 270},
                {x: 450, y: 200, width: 100, height: 20, color: '#ffffff', moving: true, dir: 1, speed: 0.8, minY: 170, maxY: 230},
                {x: 600, y: 150, width: 100, height: 20, color: '#ffffff', moving: true, dir: -1, speed: 1.1, minY: 120, maxY: 180},
                {x: 700, y: 250, width: 100, height: 20, color: '#ffffff'}
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
        } else if (levelNum === 99) { // секретный уровень
            isSecretLevel = true;
            platforms = [
                {x: 0, y: 350, width: BASE_WIDTH, height: 30, color: '#ffe066'}
            ];
            // 30 монет в 5 рядов по 6 штук, по центру экрана, рядом с надписью
            coinsList = Array.from({length: 30}, (_, i) => ({
                x: BASE_WIDTH/2 - 120 + (i % 6) * 48,
                y: BASE_HEIGHT/2 - 60 + Math.floor(i / 6) * 32,
                width: 16,
                height: 16,
                collected: false,
                bounce: 0,
                bounceDir: 1,
                collectAnim: 0
            }));
            enemies = [];
            teleport = null;
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
        // Быстрое переключение уровней для теста
        if (e.key === '1') {
            level = 1;
            loadLevel(1);
            player.x = 50;
            player.y = 300;
            player.velX = 0;
            player.velY = 0;
            gameInfo.textContent = `Уровень: 1 | Монеты: ${coins} | Жизни: ${lives}`;
        }
        if (e.key === '2') {
            level = 2;
            loadLevel(2);
            player.x = 50;
            player.y = 300;
            player.velX = 0;
            player.velY = 0;
            gameInfo.textContent = `Уровень: 2 | Монеты: ${coins} | Жизни: ${lives}`;
        }
        if (e.key === '3') {
            level = 3;
            loadLevel(3);
            player.x = 50;
            player.y = 300;
            player.velX = 0;
            player.velY = 0;
            gameInfo.textContent = `Уровень: 3 | Монеты: ${coins} | Жизни: ${lives}`;
        }
        if (e.key === '0') {
            level = 99;
            loadLevel(99);
            player.x = 100;
            player.y = 300;
            player.velX = 0;
            player.velY = 0;
            gameInfo.textContent = 'Секретный уровень!';
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
                    
                    // Показываем bubble
                    if (bubbleIndex % bubbleVariants.length === 0) {
                        shuffleBubbleVariants();
                    }
                    bubbleText = bubbleVariants[bubbleIndex % bubbleVariants.length];
                    bubbleIndex++;
                    bubbleTimer = 40; // ~0.7 сек
                    
                    if (lives <= 0) {
                        gameOver = true;
                        showEndScreen(false);
                    } else {
                        // Включаем моргание (неуязвимость) на 8 раз (40 кадров)
                        invincible = true;
                        invincibleTimer = 200;
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

                // Показываем bubble при сборе монеты
                if (coinBubbleIndex % coinBubbleVariants.length === 0) {
                    shuffleCoinBubbleVariants();
                }
                coinBubbleText = coinBubbleVariants[coinBubbleIndex % coinBubbleVariants.length];
                coinBubbleIndex++;
                coinBubbleTimer = 40;
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
            // Для 3 уровня: если враг стоит на движущейся платформе, двигаем его вместе с платформой
            if (level === 3) {
                for (let i = 1; i <= 4; i++) {
                    const p = platforms[i];
                    // Проверяем, стоит ли враг на платформе
                    if (
                        enemy.x + enemy.width/2 > p.x &&
                        enemy.x + enemy.width/2 < p.x + p.width &&
                        Math.abs(enemy.y + enemy.height - p.y) < 2
                    ) {
                        // Двигаем врага вместе с платформой
                        enemy.y += p.speed * p.dir;
                        // Корректируем, чтобы враг не "отставал" от платформы
                        enemy.y = p.y - enemy.height;
                    }
                }
            }
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
        
        if (isSecretLevel) {
            // Смешная заставка: радужный фон и смайлики
            let grad = ctx.createLinearGradient(0, 0, BASE_WIDTH, BASE_HEIGHT);
            grad.addColorStop(0, '#ff5e62');
            grad.addColorStop(0.2, '#ff9966');
            grad.addColorStop(0.4, '#f9d423');
            grad.addColorStop(0.6, '#a1ffce');
            grad.addColorStop(0.8, '#38d39f');
            grad.addColorStop(1, '#5e72eb');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
            // Смайлики
            ctx.font = '40px Arial';
            for (let i = 0; i < 8; i++) {
                ctx.fillText('😜', 60 + i * 90, 120 + Math.sin(animationFrame/10 + i) * 10);
            }
            // Монеты — рисуем ПЕРЕД надписью и платформой
            for (const coin of coinsList) {
                if (!coin.collected) {
                    ctx.fillStyle = '#f1c40f';
                    ctx.beginPath();
                    ctx.arc(
                        coin.x, 
                        coin.y - coin.bounce, 
                        coin.width/2, 
                        0, 
                        Math.PI * 2
                    );
                    ctx.fill();
                    ctx.fillStyle = '#f39c12';
                    ctx.beginPath();
                    ctx.arc(
                        coin.x, 
                        coin.y - coin.bounce, 
                        coin.width/3, 
                        0, 
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
            // Надпись
            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';
            ctx.fillText('Ты нашел секретный уровень', BASE_WIDTH/2, BASE_HEIGHT/2);
            // Платформа
            for (const platform of platforms) {
                ctx.fillStyle = platform.color;
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            }
            // Главарь
            if (boss && !bossDefeated) {
                ctx.save();
                ctx.fillStyle = '#8e44ad';
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Босс', boss.x + boss.width/2, boss.y + boss.height/2);
                ctx.restore();
            }
            if (bossDefeated) {
                ctx.save();
                ctx.font = 'bold 40px Arial';
                ctx.fillStyle = '#27ae60';
                ctx.textAlign = 'center';
                ctx.fillText('Победа!', BASE_WIDTH/2, BASE_HEIGHT/2 + 80);
                ctx.restore();
            }
            // Персонаж
            player.draw();
            animationFrame++;
            return;
        }
        
        // Фон
        if (level === 1) {
            ctx.fillStyle = '#87CEEB';
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
        
        // Bubble при уроне
        if (bubbleTimer > 0) {
            ctx.save();
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const text = bubbleText;
            const padding = 12;
            const textWidth = ctx.measureText(text).width;
            const bubbleWidth = textWidth + padding * 2;
            const bubbleHeight = 36;
            const px = player.x - cameraOffset + player.width + 10;
            const py = player.y - 20;
            // Bubble
            ctx.beginPath();
            ctx.ellipse(px + bubbleWidth/2, py + bubbleHeight/2, bubbleWidth/2, bubbleHeight/2, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.shadowColor = '#aaa';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Хвостик bubble
            ctx.beginPath();
            ctx.moveTo(px + 10, py + bubbleHeight - 2);
            ctx.lineTo(px - 8, py + bubbleHeight + 10);
            ctx.lineTo(px + 18, py + bubbleHeight - 6);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
            // Текст
            ctx.fillStyle = '#222';
            ctx.fillText(text, px + padding, py + bubbleHeight/2);
            ctx.restore();
        }
        // Bubble при сборе монеты
        if (coinBubbleTimer > 0) {
            ctx.save();
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            const text = coinBubbleText;
            const padding = 12;
            const textWidth = ctx.measureText(text).width;
            const bubbleWidth = textWidth + padding * 2;
            const bubbleHeight = 36;
            const px = player.x - cameraOffset - bubbleWidth - 10;
            const py = player.y - 20;
            // Bubble
            ctx.beginPath();
            ctx.ellipse(px + bubbleWidth/2, py + bubbleHeight/2, bubbleWidth/2, bubbleHeight/2, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.shadowColor = '#aaa';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Хвостик bubble
            ctx.beginPath();
            ctx.moveTo(px + bubbleWidth - 10, py + bubbleHeight - 2);
            ctx.lineTo(px + bubbleWidth + 8, py + bubbleHeight + 10);
            ctx.lineTo(px + bubbleWidth - 18, py + bubbleHeight - 6);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
            // Текст
            ctx.fillStyle = '#222';
            ctx.fillText(text, px + bubbleWidth - padding, py + bubbleHeight/2);
            ctx.restore();
        }
        
        animationFrame++;
    }
    
    // Обновление игры
    function update() {
        if (gameOver) return;
        
        if (bubbleTimer > 0) bubbleTimer--;
        if (coinBubbleTimer > 0) coinBubbleTimer--;
        
        // Секретный уровень: простая физика и управление
        if (isSecretLevel) {
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
            // Примитивная проверка платформы (чтобы не проваливался)
            const pf = platforms[0];
            if (pf && player.y + player.height > pf.y && player.y + player.height < pf.y + pf.height + player.velY) {
                player.y = pf.y - player.height;
                player.velY = 0;
                player.isJumping = false;
            }
            // Не даём выйти за низ экрана
            if (pf && player.y > BASE_HEIGHT) {
                player.y = pf.y - player.height;
                player.velY = 0;
            }
            cameraOffset = 0;
            // Ограничение движения по платформе
            if (pf) {
                if (player.x < pf.x) player.x = pf.x;
                if (player.x > pf.x + pf.width - player.width) player.x = pf.x + pf.width - player.width;
            }
            // Сбор монет на секретном уровне
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
                    gameInfo.textContent = `Секретный уровень | Монеты: ${coins}`;
                }
            }
            // Появление главаря
            if (!boss && coinsList.every(c => c.collected)) {
                boss = {
                    x: pf.x + 10, // слева, с небольшим отступом
                    y: pf.y - 60,
                    width: 80,
                    height: 60,
                    dir: 1,
                    speed: 2,
                    hits: 0 // количество попаданий на голову
                };
                bossDefeated = false;
                bossVictoryTimer = 0;
            }
            // Движение и проверка победы над главарём
            if (boss && !bossDefeated) {
                boss.x += boss.speed * boss.dir;
                if (boss.x < pf.x) { boss.x = pf.x; boss.dir = 1; }
                if (boss.x + boss.width > pf.x + pf.width) { boss.x = pf.x + pf.width - boss.width; boss.dir = -1; }
                // Победа: прыжок на голову
                if (
                    player.y + player.height <= boss.y + 10 &&
                    player.y + player.height >= boss.y - 10 &&
                    player.x + player.width > boss.x &&
                    player.x < boss.x + boss.width &&
                    player.velY > 0
                ) {
                    boss.hits = (boss.hits || 0) + 1;
                    player.velY = -player.jumpPower * 0.8;
                    if (boss.hits >= 2) {
                        bossDefeated = true;
                        bossVictoryTimer = 120;
                    }
                } else {
                    // Проверка обычного столкновения
                    const touchingBoss =
                        player.x < boss.x + boss.width &&
                        player.x + player.width > boss.x &&
                        player.y < boss.y + boss.height &&
                        player.y + player.height > boss.y &&
                        // не прыжок на голову
                        !(player.y + player.height <= boss.y + 10 && player.velY > 0);
                    if (touchingBoss) {
                        if (!bossTouch) {
                            lives--;
                            gameInfo.textContent = `Секретный уровень | Монеты: ${coins} | Жизни: ${lives}`;
                            // Показываем bubble
                            if (bubbleIndex % bubbleVariants.length === 0) {
                                shuffleBubbleVariants();
                            }
                            bubbleText = bubbleVariants[bubbleIndex % bubbleVariants.length];
                            bubbleIndex++;
                            bubbleTimer = 40;
                            if (lives <= 0) {
                                gameOver = true;
                                showEndScreen(false);
                            }
                            // Включаем моргание на 8 раз (40 кадров)
                            invincible = true;
                            invincibleTimer = 200;
                        }
                        bossTouch = true;
                    } else {
                        bossTouch = false;
                    }
                }
            }
            if (bossDefeated && bossVictoryTimer > 0) bossVictoryTimer--;
            return;
        }
        
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
        if (level !== 3 && !isSecretLevel && player.x < 0) player.x = 0;
        if (level !== 3 && !isSecretLevel && player.x > BASE_WIDTH - player.width) {
            player.x = BASE_WIDTH - player.width;
        }
        
        cameraOffset = 0;
        
        if (invincible) {
            invincibleTimer--;
            if (invincibleTimer <= 0) {
                invincible = false;
            }
        }
        
        // Движение платформы на 2 уровне
        if (level === 2 && platforms[1] && platforms[1].moving) {
            let p = platforms[1];
            p.x += p.speed * p.dir;
            if (p.x <= p.minX || p.x >= p.maxX) {
                p.dir *= -1;
                p.x = Math.max(p.minX, Math.min(p.x, p.maxX));
            }
        }
        // Движение платформ на 3 уровне (вверх-вниз)
        if (level === 3) {
            for (let i = 1; i <= 4; i++) {
                let p = platforms[i];
                if (p.moving) {
                    p.y += p.speed * p.dir;
                    if (p.y <= p.minY || p.y >= p.maxY) {
                        p.dir *= -1;
                        p.y = Math.max(p.minY, Math.min(p.y, p.maxY));
                    }
                }
            }
        }
        
        updateCoins();
        updateBirds();
        updateTeleport();
        checkCollisions();
        updateEnemies();
        
        // Переход в секретный уровень
        if (level === 3 && !isSecretLevel && player.x < -40) {
            isSecretLevel = true;
            level = 99;
            loadLevel(99);
            player.x = 100;
            player.y = 300;
            player.velX = 0;
            player.velY = 0;
            gameInfo.textContent = 'Секретный уровень!';
            return;
        }
    }
    
    // Показать экран завершения
    function showEndScreen(allCoinsCollected) {
        if (allCoinsCollected) {
            endScreen.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            endMessage.style.color = '#000';
            endMessage.textContent = 'Ты собрал все шекели — тусишь на полную катушку!';
        } else {
            endScreen.style.backgroundColor = 'rgba(100, 100, 100, 0.9)';
            endMessage.style.color = '#fff';
            endMessage.textContent = lives <= 0 ? 'Потрачено. Ты можешь лучше!' : 'Ты прошел, но не собрал всех шекелей — тусишь не на полную катушку';
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