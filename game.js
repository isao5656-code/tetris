const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: '#45d9ff',
  O: '#ffd447',
  T: '#bb86fc',
  S: '#67e98a',
  Z: '#ff7575',
  J: '#5c8dff',
  L: '#ffb266'
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');

const state = {
  board: createBoard(),
  piece: null,
  score: 0,
  lines: 0,
  level: 1,
  dropCounter: 0,
  dropInterval: 700,
  lastTime: 0,
  running: false,
  gameOver: false,
  touchStart: null
};


let lastTouchEndAt = 0;

function shouldBlockBrowserGesture() {
  return state.running && !state.gameOver;
}

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  const shape = SHAPES[type].map((row) => [...row]);

  return {
    type,
    matrix: shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0
  };
}

function resetGame() {
  state.board = createBoard();
  state.piece = randomPiece();
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.dropInterval = 700;
  state.dropCounter = 0;
  state.lastTime = 0;
  state.running = true;
  state.gameOver = false;
  messageEl.textContent = '';
  updateHUD();
}

function collide(board, piece) {
  return piece.matrix.some((row, y) =>
    row.some((value, x) => {
      if (!value) return false;
      const boardY = y + piece.y;
      const boardX = x + piece.x;
      return boardY >= ROWS || boardX < 0 || boardX >= COLS || board[boardY]?.[boardX];
    })
  );
}

function merge(board, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        board[y + piece.y][x + piece.x] = piece.type;
      }
    });
  });
}

function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
}

function tryMove(dx, dy) {
  if (!state.running || state.gameOver) return;
  state.piece.x += dx;
  state.piece.y += dy;
  if (collide(state.board, state.piece)) {
    state.piece.x -= dx;
    state.piece.y -= dy;
    if (dy > 0) {
      lockPiece();
    }
  }
}

function rotatePiece() {
  if (!state.running || state.gameOver) return;
  const original = state.piece.matrix;
  state.piece.matrix = rotate(original);

  if (collide(state.board, state.piece)) {
    state.piece.x += 1;
    if (collide(state.board, state.piece)) {
      state.piece.x -= 2;
      if (collide(state.board, state.piece)) {
        state.piece.x += 1;
        state.piece.matrix = original;
      }
    }
  }
}

function lockPiece() {
  merge(state.board, state.piece);
  clearLines();
  state.piece = randomPiece();
  if (collide(state.board, state.piece)) {
    state.gameOver = true;
    state.running = false;
    messageEl.textContent = 'ゲームオーバー！ リスタートしてください';
  }
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (state.board[y].every((cell) => cell)) {
      state.board.splice(y, 1);
      state.board.unshift(Array(COLS).fill(0));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    const scoreTable = [0, 100, 300, 500, 800];
    state.score += scoreTable[cleared] * state.level;
    state.lines += cleared;
    state.level = Math.floor(state.lines / 10) + 1;
    state.dropInterval = Math.max(180, 700 - (state.level - 1) * 55);
    updateHUD();
  }
}

function softDrop() {
  tryMove(0, 1);
}

function hardDrop() {
  if (!state.running || state.gameOver) return;
  while (!collide(state.board, state.piece)) {
    state.piece.y += 1;
  }
  state.piece.y -= 1;
  lockPiece();
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1);
}

function draw() {
  ctx.fillStyle = '#070a16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  state.board.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawCell(x, y, COLORS[type]);
    });
  });

  if (state.piece) {
    state.piece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) drawCell(state.piece.x + x, state.piece.y + y, COLORS[state.piece.type]);
      });
    });
  }
}

function updateHUD() {
  scoreEl.textContent = String(state.score);
  linesEl.textContent = String(state.lines);
  levelEl.textContent = String(state.level);
}

function update(time = 0) {
  const delta = time - state.lastTime;
  state.lastTime = time;

  if (state.running && !state.gameOver) {
    state.dropCounter += delta;
    if (state.dropCounter > state.dropInterval) {
      softDrop();
      state.dropCounter = 0;
    }
  }

  draw();
  requestAnimationFrame(update);
}

function handleAction(action) {
  switch (action) {
    case 'left':
      tryMove(-1, 0);
      break;
    case 'right':
      tryMove(1, 0);
      break;
    case 'rotate':
      rotatePiece();
      break;
    case 'drop':
      hardDrop();
      break;
    default:
      break;
  }
}

window.addEventListener('keydown', (event) => {
  const map = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'rotate',
    ArrowDown: 'drop',
    ' ': 'drop'
  };
  const action = map[event.key];
  if (action) {
    event.preventDefault();
    handleAction(action);
  }
});

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => handleAction(btn.dataset.action));
});

canvas.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  state.touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

canvas.addEventListener('touchend', (event) => {
  if (!state.touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - state.touchStart.x;
  const dy = touch.clientY - state.touchStart.y;
  const threshold = 22;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > threshold) handleAction('right');
    if (dx < -threshold) handleAction('left');
  } else {
    if (dy < -threshold) handleAction('rotate');
    if (dy > threshold) softDrop();
  }

  state.touchStart = null;
}, { passive: true });

startBtn.addEventListener('click', () => {
  resetGame();
});


document.addEventListener('gesturestart', (event) => {
  if (shouldBlockBrowserGesture()) {
    event.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchmove', (event) => {
  if (shouldBlockBrowserGesture() && event.touches.length > 1) {
    event.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchend', (event) => {
  if (!shouldBlockBrowserGesture()) return;
  const now = Date.now();
  if (now - lastTouchEndAt < 300) {
    event.preventDefault();
  }
  lastTouchEndAt = now;
}, { passive: false });


resetGame();
requestAnimationFrame(update);
