const socket = io();
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let playerNumber;
    let gameActive = false;

    socket.on('init', number => {
      playerNumber = number;
    });

    socket.on('gameState', gameState => {
      if (!gameActive) return;
      gameState = JSON.parse(gameState);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawFood(gameState.food);
      drawPlayers(gameState.players);
    });

    socket.on('leaderboard', ({ scores, usernames }) => {
      const leaderboard = document.getElementById('leaderboard')
      scores.forEach((score, index) => {
        leaderboard.innerHTML += `<p>${usernames[index] || 'Player ' + (index + 1)}: ${score}</p>`;
      });
    });

    socket.on('gameOver', () => {
      gameActive = false;
      alert('Game over! Returning to main page...');
      document.getElementById('main').style.display = 'block';
      canvas.style.display = 'none';
    });

    function drawFood(food) {
      food.forEach(piece => {
        ctx.fillStyle = 'red';
        ctx.fillRect(piece.x * 20, piece.y * 20, 20, 20);
      });
    }

    function drawPlayers(players) {
      players.forEach((player, index) => {
        ctx.fillStyle = index + 1 === playerNumber ? 'blue' : 'green';
        player.snake.forEach(cell => {
          ctx.fillRect(cell.x * 20, cell.y * 20, 20, 20);
        });
      });
    }

    function startGame() {
      const username = document.getElementById('usernameInput').value;
      if (!username) return alert('Please enter a username');

      socket.emit('setUsername', username);
      socket.emit('startGame');

      document.getElementById('main').style.display = 'none';
      canvas.style.display = 'block';
      document.getElementById('leaderboard').style.display = 'block'
      gameActive = true;
    }

    document.addEventListener('keydown', event => {
      socket.emit('keydown', event.keyCode);
    });