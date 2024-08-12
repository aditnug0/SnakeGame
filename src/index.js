const socket = io();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const usernameInput = document.getElementById('username');
const startButton = document.getElementById('startButton');
const leaderboard = document.getElementById('leaderboard');

let playerNumber;
let gameActive = false;
let gameState = {};

// Set up the canvas
canvas.width = 800;
canvas.height = 600;

// Handle username submission
startButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit('setUsername', username);
        startGame();
    } else {
        alert('Please enter a username.');
    }
});

function startGame() {
    socket.emit('startGame');
    gameActive = true;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
}

// Listen for initialization
socket.on('init', (number) => {
    playerNumber = number;
});

// Listen for game state updates
socket.on('gameState', (state) => {
    gameState = JSON.parse(state);
    if (gameActive) {
        drawGame(gameState);
    }
});

// Listen for leaderboard updates
socket.on('leaderboard', (data) => {
    updateLeaderboard(data.scores, data.usernames);
});

document.addEventListener('keydown', (event) => {
    const keyCode = event.keyCode;
    socket.emit('keydown', keyCode);
});

function drawGame(state) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { players, food } = state;

    // Ensure food is an array
    if (Array.isArray(food)) {
        // Draw food
        food.forEach(piece => {
            ctx.fillStyle = 'red';
            ctx.fillRect(piece.x, piece.y, 10, 10);
        });
    } else {
        console.error('Food is not an array:', food);
    }

    // Draw players
    players.forEach((player, index) => {
        ctx.fillStyle = index + 1 === playerNumber ? 'blue' : 'green';
        ctx.fillRect(player.pos.x, player.pos.y, 10, 10);
    });
}


function updateLeaderboard(scores, usernames) {
    leaderboard.innerHTML = '';
    scores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `${usernames[index]}: ${score} points`;
        leaderboard.appendChild(li);
    });
}
