const GRID_SIZE = 16;
const TICK_MS = 140;
const STORAGE_KEY = "snake-best-score";

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function positionsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isOutOfBounds(position, gridSize = GRID_SIZE) {
  return (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= gridSize ||
    position.y >= gridSize
  );
}

function listFreeCells(snake, gridSize = GRID_SIZE) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const freeCells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        freeCells.push({ x, y });
      }
    }
  }

  return freeCells;
}

function spawnFood(snake, random = Math.random, gridSize = GRID_SIZE) {
  const freeCells = listFreeCells(snake, gridSize);

  if (freeCells.length === 0) {
    return null;
  }

  const index = Math.floor(random() * freeCells.length);
  return freeCells[index];
}

function createInitialState(random = Math.random) {
  const snake = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ];

  return {
    snake,
    direction: "right",
    queuedDirection: "right",
    food: spawnFood(snake, random),
    score: 0,
    started: false,
    paused: false,
    gameOver: false,
    won: false,
  };
}

function queueDirection(state, nextDirection) {
  if (!DIRECTIONS[nextDirection]) {
    return state;
  }

  const blockedDirection =
    state.started && OPPOSITES[state.direction] === nextDirection;

  if (blockedDirection) {
    return state;
  }

  return {
    ...state,
    queuedDirection: nextDirection,
    started: true,
    paused: false,
  };
}

function stepGame(state, random = Math.random, gridSize = GRID_SIZE) {
  if (state.gameOver || state.paused || !state.started) {
    return state;
  }

  const nextDirection = state.queuedDirection;
  const nextOffset = DIRECTIONS[nextDirection];
  const nextHead = {
    x: state.snake[0].x + nextOffset.x,
    y: state.snake[0].y + nextOffset.y,
  };

  if (isOutOfBounds(nextHead, gridSize)) {
    return {
      ...state,
      direction: nextDirection,
      gameOver: true,
    };
  }

  const ateFood = state.food && positionsEqual(nextHead, state.food);
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = collisionBody.some((segment) => positionsEqual(segment, nextHead));

  if (hitSelf) {
    return {
      ...state,
      direction: nextDirection,
      gameOver: true,
    };
  }

  const snake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];
  const score = ateFood ? state.score + 1 : state.score;
  const food = ateFood ? spawnFood(snake, random, gridSize) : state.food;
  const won = ateFood && !food;

  return {
    ...state,
    snake,
    direction: nextDirection,
    food,
    score,
    gameOver: won,
    won,
  };
}

function restartGame(random = Math.random) {
  return createInitialState(random);
}

function togglePause(state) {
  if (!state.started || state.gameOver) {
    return state;
  }

  return {
    ...state,
    paused: !state.paused,
  };
}

function loadBestScore() {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Ignore storage failures.
  }
}

const board = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const messageElement = document.querySelector("#message");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const controlButtons = Array.from(document.querySelectorAll("[data-direction]"));

const cells = [];
for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
  const cell = document.createElement("div");
  cell.className = "cell";
  board.append(cell);
  cells.push(cell);
}

let randomSource = Math.random;
let state = createInitialState(randomSource);
let bestScore = loadBestScore();

function cellIndex(position) {
  return position.y * GRID_SIZE + position.x;
}

function render(nextState) {
  for (const cell of cells) {
    cell.className = "cell";
  }

  nextState.snake.forEach((segment, index) => {
    const cell = cells[cellIndex(segment)];
    if (!cell) {
      return;
    }

    cell.classList.add("snake");
    if (index === 0) {
      cell.classList.add("head");
    }
  });

  if (nextState.food) {
    const foodCell = cells[cellIndex(nextState.food)];
    if (foodCell) {
      foodCell.classList.add("food");
    }
  }

  if (nextState.score > bestScore) {
    bestScore = nextState.score;
    saveBestScore(bestScore);
  }

  scoreElement.textContent = String(nextState.score);
  bestScoreElement.textContent = String(bestScore);

  if (nextState.won) {
    messageElement.textContent = "Board cleared. Press restart to play again.";
  } else if (nextState.gameOver) {
    messageElement.textContent = "Game over. Press restart to try again.";
  } else if (nextState.paused) {
    messageElement.textContent = "Paused. Press pause or move to continue.";
  } else if (!nextState.started) {
    messageElement.textContent = "Press any arrow key or WASD to start.";
  } else {
    messageElement.textContent = "Use arrow keys, WASD, or the buttons to move.";
  }

  pauseButton.textContent = nextState.paused ? "Resume" : "Pause";
}

function setState(nextState) {
  state = nextState;
  render(state);
}

function handleDirection(direction) {
  setState(queueDirection(state, direction));
}

document.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    a: "left",
    A: "left",
    s: "down",
    S: "down",
    d: "right",
    D: "right",
  };

  if (event.key === " ") {
    event.preventDefault();
    setState(togglePause(state));
    return;
  }

  const direction = keyMap[event.key];
  if (!direction) {
    return;
  }

  event.preventDefault();
  handleDirection(direction);
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleDirection(button.dataset.direction);
  });
});

pauseButton.addEventListener("click", () => {
  setState(togglePause(state));
});

restartButton.addEventListener("click", () => {
  setState(restartGame(randomSource));
});

window.setInterval(() => {
  setState(stepGame(state, randomSource));
}, TICK_MS);

render(state);

window.SnakeGame = {
  GRID_SIZE,
  DIRECTIONS,
  createInitialState,
  queueDirection,
  stepGame,
  spawnFood,
  restartGame,
  togglePause,
  listFreeCells,
  isOutOfBounds,
};
