const BOARD_SIZE = 8;
const Player = {
  BLACK: "B",
  WHITE: "W",
};

const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

let boardState = [];
let currentPlayer = Player.BLACK;
let consecutivePasses = 0;
let isGameOver = false;
let validMoveMap = new Map();
let pendingPassTimeout = null;

const boardElement = document.getElementById("board");
const turnIndicatorElement = document.getElementById("turn-indicator");
const statusMessageElement = document.getElementById("status-message");
const blackScoreElement = document.getElementById("black-score");
const whiteScoreElement = document.getElementById("white-score");
const resetButton = document.getElementById("reset-button");

// Build the grid once so that only disk nodes need to be updated later.
function buildBoardGrid() {
  boardElement.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Row ${row + 1}, Column ${col + 1}`);
      cell.addEventListener("click", handleCellClick);
      boardElement.appendChild(cell);
    }
  }
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function initializeBoardState() {
  boardState = createEmptyBoard();
  const mid = BOARD_SIZE / 2;
  boardState[mid - 1][mid - 1] = Player.WHITE;
  boardState[mid][mid] = Player.WHITE;
  boardState[mid - 1][mid] = Player.BLACK;
  boardState[mid][mid - 1] = Player.BLACK;
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getOpponent(player) {
  return player === Player.BLACK ? Player.WHITE : Player.BLACK;
}

function findFlips(row, col, player) {
  if (boardState[row][col] !== null) {
    return [];
  }

  const opponent = getOpponent(player);
  const flips = [];

  for (const [dx, dy] of directions) {
    let r = row + dx;
    let c = col + dy;
    const potential = [];

    while (inBounds(r, c) && boardState[r][c] === opponent) {
      potential.push([r, c]);
      r += dx;
      c += dy;
    }

    if (potential.length === 0) {
      continue;
    }

    if (inBounds(r, c) && boardState[r][c] === player) {
      flips.push(...potential);
    }
  }

  return flips;
}

function calculateValidMoves(player) {
  const map = new Map();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const flips = findFlips(row, col, player);
      if (flips.length > 0) {
        map.set(`${row}-${col}`, flips);
      }
    }
  }

  return map;
}

function applyMove(row, col, flips) {
  boardState[row][col] = currentPlayer;
  for (const [r, c] of flips) {
    boardState[r][c] = currentPlayer;
  }
}

function updateScores() {
  let black = 0;
  let white = 0;

  for (const row of boardState) {
    for (const cell of row) {
      if (cell === Player.BLACK) {
        black += 1;
      } else if (cell === Player.WHITE) {
        white += 1;
      }
    }
  }

  blackScoreElement.textContent = `Black: ${black}`;
  whiteScoreElement.textContent = `White: ${white}`;
}

function renderBoard() {
  const cells = boardElement.querySelectorAll(".cell");

  cells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const key = `${row}-${col}`;
    const disk = boardState[row][col];
    cell.innerHTML = "";

    if (validMoveMap.has(key) && !isGameOver) {
      cell.dataset.valid = "true";
    } else {
      cell.dataset.valid = "false";
    }

    if (disk) {
      const diskElement = document.createElement("div");
      diskElement.className = `disk ${disk === Player.BLACK ? "black" : "white"}`;
      cell.appendChild(diskElement);
    }
  });
}

function isBoardFull() {
  return boardState.every((row) => row.every((cell) => cell !== null));
}

function finalizeGame() {
  isGameOver = true;
  validMoveMap = new Map();
  renderBoard();
  updateScores();

  let black = 0;
  let white = 0;
  for (const row of boardState) {
    for (const cell of row) {
      if (cell === Player.BLACK) {
        black += 1;
      } else if (cell === Player.WHITE) {
        white += 1;
      }
    }
  }

  let message = "Draw game.";
  if (black > white) {
    message = "Black wins!";
  } else if (white > black) {
    message = "White wins!";
  }

  turnIndicatorElement.textContent = "Game over";
  statusMessageElement.textContent = message;
}

function prepareTurn() {
  if (isGameOver) {
    return;
  }

  validMoveMap = calculateValidMoves(currentPlayer);
  renderBoard();
  updateScores();
  turnIndicatorElement.textContent = `${currentPlayer === Player.BLACK ? "Black" : "White"} to play`;

  if (validMoveMap.size === 0) {
    consecutivePasses += 1;

    if (consecutivePasses >= 2 || isBoardFull()) {
      finalizeGame();
      return;
    }

    statusMessageElement.textContent = `${currentPlayer === Player.BLACK ? "Black" : "White"} has no moves and must pass.`;
    currentPlayer = getOpponent(currentPlayer);

    if (pendingPassTimeout) {
      window.clearTimeout(pendingPassTimeout);
    }

    pendingPassTimeout = window.setTimeout(() => {
      prepareTurn();
    }, 600);
    return;
  }

  consecutivePasses = 0;
  statusMessageElement.textContent = "";
}

function handleCellClick(event) {
  if (isGameOver) {
    return;
  }

  const target = event.currentTarget;
  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);
  const key = `${row}-${col}`;

  if (!validMoveMap.has(key)) {
    return;
  }

  const flips = validMoveMap.get(key) ?? [];
  applyMove(row, col, flips);
  consecutivePasses = 0;
  currentPlayer = getOpponent(currentPlayer);
  prepareTurn();
}

function resetGame() {
  if (pendingPassTimeout) {
    window.clearTimeout(pendingPassTimeout);
    pendingPassTimeout = null;
  }

  consecutivePasses = 0;
  isGameOver = false;
  currentPlayer = Player.BLACK;
  initializeBoardState();
  prepareTurn();
}

resetButton.addEventListener("click", () => {
  // Resetting the board requires refreshing the state and redraw.
  resetGame();
});

buildBoardGrid();
resetGame();
