const { GRID_SIZE } = require('./constants');

module.exports = {
  initGame,
  gameLoop,
  getUpdatedVelocity,
};

function initGame(gridSize, numPlayers) {
  const state = createGameState(gridSize, numPlayers);
  addRandomFood(state);
  return state;
}

function createGameState(gridSize, numPlayers) {
  const players = [];

  for (let i = 0; i < numPlayers; i++) {
    players.push({
      pos: { x: Math.floor(Math.random()* gridSize), y: Math.floor(Math.random()* gridSize) },
      vel: { x: 1, y: 0 },
      snake: [{ x: Math.floor(Math.random() * GRID_SIZE) , y: Math.floor(Math.random() * GRID_SIZE) }],
    });
  }

  return {
    players,
    food: [],
    scores: Array(numPlayers).fill(0),
    gridSize: gridSize,
  };
}

function gameLoop(state) {
  if (!state) return;

  state.players.forEach((player, index) => {
    player.pos.x += player.vel.x;
    player.pos.y += player.vel.y;

    if (player.pos.x < 0 || player.pos.x >= state.gridSize || player.pos.y < 0 || player.pos.y >= state.gridSize) {
      return index + 1; // Player hits wall
    }

    const foodIndex = state.food.findIndex(f => f.x === player.pos.x && f.y === player.pos.y)
    if (foodIndex > -1) {
      player.snake.push({ ...player.pos });
      state.scores[index]++;
      state.food.splice(foodIndex , 1)
      addRandomFood(state);
    }

    for (let cell of player.snake) {
      if (cell.x === player.pos.x && cell.y === player.pos.y) {
        return index + 1; // Player collides with self
      }
    }

    if (player.vel.x || player.vel.y) {
      player.snake.push({ ...player.pos });
      player.snake.shift();
    }
  });

  return false;
}

function addRandomFood(state) {
  let food = {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  };

  if (state.players.some(p => p.snake.some(cell => cell.x === food.x && cell.y === food.y))) {
    return addRandomFood(state);
  }

  state.food.push(food);
}

function getUpdatedVelocity(keyCode) {
  switch (keyCode) {
    case 37: return { x: -1, y: 0 }; // Left
    case 38: return { x: 0, y: -1 }; // Up
    case 39: return { x: 1, y: 0 }; // Right
    case 40: return { x: 0, y: 1 }; // Down
  }
}
