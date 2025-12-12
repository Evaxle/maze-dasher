class Cell {
  constructor(x, xIndex, yIndex, size) {
    this.x = xIndex;
    this.y = yIndex;
    this.size = size;
    this.visited = false;
    this.walls = { left: true, right: true, top: true, bottom: true };
  }

  draw(playerIndex, goalIndex, index, playerColor, goalColor) {
    const classes = Object.entries(this.walls)
      .filter(([, v]) => v)
      .map(([k]) => `${k}-wall`)
      .join(" ");
    const visited = this.visited ? "visited" : "";
    const sizeStyle = `width:${this.size}px;height:${this.size}px;`;
    const isPlayer = index === playerIndex;
    const isGoal = index === goalIndex;
    const cellStart = `<span style="${sizeStyle}" class="cell ${classes} ${visited}">`;
    const cellEnd = `</span>`;
    if (!isPlayer && !isGoal) return `${cellStart}${cellEnd}`;
    const wrapperStart = `<div class="wrapper">`;
    const wrapperEnd = `</div>`;
    const stylePlayer = `style="background:${playerColor};box-shadow:0 0 14px ${playerColor}66;"`;
    const styleGoal = `style="background:${goalColor};box-shadow:0 0 18px ${goalColor}aa;"`;
    const playerClass = `point player-color`;
    const goalClass = `point goal-color`;
    const pointMarkup = isPlayer
      ? `<div class="${playerClass}" ${stylePlayer}></div>`
      : `<div class="${goalClass}" ${styleGoal}></div>`;
    return `${cellStart}${wrapperStart}${pointMarkup}${wrapperEnd}${cellEnd}`;
  }

  visit() {
    this.visited = true;
  }

  randomNeighbor(grid) {
    const { x, y } = this;
    return [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ]
      .filter(([nx, ny]) => grid[ny] && grid[ny][nx] && !grid[ny][nx].visited)
      .map(([nx, ny]) => grid[ny][nx])
      .sort(() => Math.random() - 0.5)[0];
  }
}

// Adjust the container size based on difficulty so cell sizes feel appropriate
function adjustMazeContainer(sizeN) {
  const container = document.querySelector(".maze-container");
  if (!container) return;
  const base = Math.min(window.innerWidth, window.innerHeight) * 0.78;
  const n = sizeN || currentSize || 30;
  const scale = Math.max(0.6, Math.min(1.6, 1 + (30 - n) / 60));
  const dim = Math.floor(base * scale);
  container.style.width = dim + "px";
  container.style.height = dim + "px";
}

function removeWall(cell1, cell2) {
  const xDiff = cell1.x - cell2.x;
  const yDiff = cell1.y - cell2.y;
  if (xDiff === -1) {
    cell1.walls.right = false;
    cell2.walls.left = false;
  } else if (xDiff === 1) {
    cell1.walls.left = false;
    cell2.walls.right = false;
  } else if (yDiff === -1) {
    cell1.walls.bottom = false;
    cell2.walls.top = false;
  } else if (yDiff === 1) {
    cell1.walls.top = false;
    cell2.walls.bottom = false;
  }
}

let currentGrid = null;
let currentSize = 30;
let currentPlayerX = 0;
let currentPlayerY = 0;
let currentGoalX = 0;
let currentGoalY = 0;
let movementMode = "increment";
let playerColor = "#f97373";
let goalColor = "#60a5fa";
let timer = null;
let startTime = 0;
let elapsedTime = 0;
let timerState = "idle";
let armed = false;
let currentMapId = null;
let currentMapMeta = null;
let isKeyHandlingEnabled = true;

const mazeInner = document.querySelector(".maze-inner");
const timerDisplay = document.getElementById("timerDisplay");
const timerStatusIndicator = document.getElementById("timerStatusIndicator");
const generateMapBtn = document.getElementById("generateMapBtn");
const generateMapFooterBtn = document.getElementById("generateMapFooterBtn");
const resetMapBtn = document.getElementById("resetMapBtn");
const hardResetBtn = document.getElementById("hardResetBtn");
const startRunBtn = document.getElementById("startRunBtn");
const fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn");
const difficultySelect = document.getElementById("difficultySelect");
const movementModePills = document.getElementById("movementModePills");
const playerColorPicker = document.getElementById("playerColorPicker");
const goalColorPicker = document.getElementById("goalColorPicker");
const mapJsonOutput = document.getElementById("mapJsonOutput");
const copyMapJsonBtn = document.getElementById("copyMapJsonBtn");
const clearMapJsonBtn = document.getElementById("clearMapJsonBtn");
const mapJsonInput = document.getElementById("mapJsonInput");
const loadMapFromJsonBtn = document.getElementById("loadMapFromJsonBtn");
const savedMapsList = document.getElementById("savedMapsList");
const leaderboardList = document.getElementById("leaderboardList");
const currentMapLabel = document.getElementById("currentMapLabel");
const statusToast = document.getElementById("statusToast");
const instructionsPopup = document.getElementById("instructionsPopup");
const hideInstructionsCheckbox = document.getElementById("hideInstructionsCheckbox");
const closeInstructionsBtn = document.getElementById("closeInstructionsBtn");
const mazeShell = document.getElementById("mazeShell");

const openSettingsPanelBtn = document.getElementById("openSettingsPanelBtn");
const openSavedPanelBtn = document.getElementById("openSavedPanelBtn");
const openLeaderboardPanelBtn = document.getElementById("openLeaderboardPanelBtn");
const openJsonPanelBtn = document.getElementById("openJsonPanelBtn");
const settingsPanel = document.getElementById("settingsPanel");
const savedPanel = document.getElementById("savedPanel");
const leaderboardPanelFloating = document.getElementById("leaderboardPanelFloating");
const jsonPanel = document.getElementById("jsonPanel");
const closeSettingsPanelBtn = document.getElementById("closeSettingsPanelBtn");
const closeSavedPanelBtn = document.getElementById("closeSavedPanelBtn");
const closeLeaderboardPanelBtn = document.getElementById("closeLeaderboardPanelBtn");
const closeJsonPanelBtn = document.getElementById("closeJsonPanelBtn");

function showToast(text, duration = 1400) {
  statusToast.textContent = text;
  statusToast.classList.add("show");
  setTimeout(() => {
    statusToast.classList.remove("show");
  }, duration);
}

function generateEmptyGrid(n) {
  return Array.from({ length: n }).map(() =>
    Array.from({ length: n }).map(() => 0)
  );
}

function generateMazeGrid(n) {
  const rect = mazeInner.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width, rect.height) / n);
  const grid = generateEmptyGrid(n).map((row, y) =>
    row.map((_, x) => new Cell(null, x, y, size))
  );
  const initialCell = grid[0][0];
  initialCell.visit();
  const stack = [initialCell];
  while (stack.length) {
    const currentCell = stack.pop();
    const neighbor = currentCell.randomNeighbor(grid);
    if (neighbor) {
      stack.push(currentCell);
      removeWall(currentCell, neighbor);
      neighbor.visit();
      stack.push(neighbor);
    }
  }
  return grid;
}

function gridToData(grid) {
  const n = grid.length;
  return {
    size: n,
    cells: grid.map(row =>
      row.map(cell => ({
        x: cell.x,
        y: cell.y,
        walls: { ...cell.walls }
      }))
    )
  };
}

function dataToGrid(data) {
  const n = data.size;
  const rect = mazeInner.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width, rect.height) / n);
  return data.cells.map((row, y) =>
    row.map((cellData, x) => {
      const c = new Cell(null, x, y, size);
      c.walls = { ...cellData.walls };
      c.visited = true;
      return c;
    })
  );
}

function drawGrid(grid, playerX, playerY, goalX, goalY) {
  if (!grid) return;
  const n = grid.length;
  const playerIndex = playerY * n + playerX;
  const goalIndex = goalY * n + goalX;
  const template = grid
    .map((row, y) =>
      `<div class="row">${row
        .map((cell, x) => {
          const idx = y * n + x;
          return cell.draw(playerIndex, goalIndex, idx, playerColor, goalColor);
        })
        .join("")}</div>`
    )
    .join("");
  mazeInner.innerHTML = template;
}

function resetPlayerPosition() {
  currentPlayerX = 0;
  currentPlayerY = 0;
  currentGoalX = currentSize - 1;
  currentGoalY = currentSize - 1;
  if (currentGrid) drawGrid(currentGrid, currentPlayerX, currentPlayerY, currentGoalX, currentGoalY);
}

function setTimerStatus(status) {
  if (status === "ready") {
    timerStatusIndicator.textContent = "Ready";
  } else if (status === "running") {
    timerStatusIndicator.textContent = "Running";
  } else {
    timerStatusIndicator.textContent = "Stopped";
  }
}

function resetTimerDisplay() {
  elapsedTime = 0;
  timerDisplay.textContent = "0.000";
}

function armTimer() {
  if (!currentGrid) return;
  if (timerState === "running") return;
  armed = true;
  timerState = "armed";
  setTimerStatus("ready");
  showToast("Ready – first move starts");
}

function startTimer() {
  if (!armed || timerState === "running") return;
  startTime = performance.now();
  timerState = "running";
  setTimerStatus("running");
  timer = setInterval(() => {
    elapsedTime = performance.now() - startTime;
    timerDisplay.textContent = (elapsedTime / 1000).toFixed(3);
  }, 16);
}

function stopTimer(finished) {
  if (timer) clearInterval(timer);
  timer = null;
  if (finished) {
    timerState = "stopped";
    setTimerStatus("stopped");
  } else {
    timerState = "idle";
    setTimerStatus("ready");
  }
  armed = false;
}

function handleReset(softOnly = false) {
  if (!currentGrid) return;
  stopTimer(false);
  resetTimerDisplay();
  resetPlayerPosition();
  timerState = "idle";
  armed = false;
  if (!softOnly) showToast("Map reset");
}

// storage helpers are provided from /Scripts/data.js: getMapsFromStorage, setMapsToStorage, createMapId

function updateSavedMapsList() {
  const maps = getMapsFromStorage();
  const entries = Object.entries(maps);
  if (!entries.length) {
    savedMapsList.innerHTML = `<div style="font-size:13px;color:#9ca3af;">No saved maps yet.</div>`;
    return;
  }
  savedMapsList.innerHTML = entries
    .map(([id, value]) => {
      const label = value.meta?.label || id;
      const size = value.data?.size || "?";
      const bestTime = value.leaderboard && value.leaderboard.length
        ? (value.leaderboard[0].time / 1000).toFixed(3) + "s"
        : "—";
      return `<div class="saved-map-row" data-id="${id}">
        <span>${label}</span>
        <span>${size}×${size} · ${bestTime}</span>
      </div>`;
    })
    .join("");
}

function updateLeaderboardView() {
  if (!currentMapId) {
    leaderboardList.innerHTML = `<div class="leaderboard-empty">Generate or load a map to start tracking times.</div>`;
    currentMapLabel.textContent = "No map loaded";
    return;
  }
  const maps = getMapsFromStorage();
  const mapData = maps[currentMapId];
  currentMapLabel.textContent = mapData?.meta?.label || currentMapId;
  const entries = mapData?.leaderboard || [];
  if (!entries.length) {
    leaderboardList.innerHTML = `<div class="leaderboard-empty">No runs yet. Set the first time.</div>`;
    return;
  }
  const sorted = [...entries].sort((a, b) => a.time - b.time).slice(0, 20);
  leaderboardList.innerHTML = sorted
    .map((entry, idx) => {
      const isBest = idx === 0;
      return `<div class="leaderboard-row ${isBest ? "best" : ""}">
        <span>#${idx + 1}</span>
        <span>${(entry.time / 1000).toFixed(3)}s</span>
      </div>`;
    })
    .join("");
}

function saveCurrentMapToStorage(source = "Generated") {
  if (!currentGrid) return;
  const data = gridToData(currentGrid);
  const mapId = currentMapId || createMapId(data);
  const maps = getMapsFromStorage();
  const now = new Date().toLocaleString();
  const existingLeaderboard = maps[mapId]?.leaderboard || [];
  const difficulty = currentSize;
  const label = `${source} · ${difficulty}×${difficulty}`;
  maps[mapId] = {
    data,
    leaderboard: existingLeaderboard,
    meta: { label, createdAt: maps[mapId]?.meta?.createdAt || now }
  };
  setMapsToStorage(maps);
  currentMapId = mapId;
  currentMapMeta = maps[mapId].meta;
  updateSavedMapsList();
  updateLeaderboardView();
}

function exportCurrentMapToJson() {
  if (!currentGrid) {
    mapJsonOutput.textContent = "No map generated yet.";
    mapJsonOutput.classList.add("empty");
    return;
  }
  const data = gridToData(currentGrid);
  const maps = getMapsFromStorage();
  const mapId = currentMapId || createMapId(data);
  const leaderboard = maps[mapId]?.leaderboard || [];
  const payload = { id: mapId, size: data.size, cells: data.cells, leaderboard };
  const json = JSON.stringify(payload);
  mapJsonOutput.classList.remove("empty");
  mapJsonOutput.textContent = json;
}

function importMapFromJson(json) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.size || !parsed.cells) return false;
    const data = { size: parsed.size, cells: parsed.cells };
    currentGrid = dataToGrid(data);
    currentSize = parsed.size;
    currentMapId = parsed.id || createMapId(data);
    currentMapMeta = { label: `Imported · ${currentSize}×${currentSize}`, createdAt: new Date().toLocaleString() };
    currentPlayerX = 0;
    currentPlayerY = 0;
    currentGoalX = currentSize - 1;
    currentGoalY = currentSize - 1;
    drawGrid(currentGrid, currentPlayerX, currentPlayerY, currentGoalX, currentGoalY);
    const maps = getMapsFromStorage();
    const existingLeaderboard = parsed.leaderboard || maps[currentMapId]?.leaderboard || [];
    maps[currentMapId] = {
      data,
      leaderboard: existingLeaderboard,
      meta: currentMapMeta
    };
    setMapsToStorage(maps);
    updateSavedMapsList();
    updateLeaderboardView();
    exportCurrentMapToJson();
    resetTimerDisplay();
    setTimerStatus("ready");
    timerState = "idle";
    armed = false;
    showToast("Map loaded");
    return true;
  } catch {
    return false;
  }
}

function recordFinish() {
  if (!currentMapId) return;
  const maps = getMapsFromStorage();
  if (!maps[currentMapId]) return;
  const now = new Date().toLocaleString();
  const time = elapsedTime;
  const entry = { time, date: now };
  const lb = maps[currentMapId].leaderboard || [];
  lb.push(entry);
  lb.sort((a, b) => a.time - b.time);
  maps[currentMapId].leaderboard = lb;
  setMapsToStorage(maps);
  updateLeaderboardView();
  exportCurrentMapToJson();
  showToast(`Run: ${(time / 1000).toFixed(3)}s`);
}

function generateNewMaze() {
  const n = parseInt(difficultySelect.value, 10);
  currentSize = n;
  // adjust container so cells are sized pleasantly for the difficulty
  adjustMazeContainer(n);
  currentGrid = generateMazeGrid(n);
  currentPlayerX = 0;
  currentPlayerY = 0;
  currentGoalX = n - 1;
  currentGoalY = n - 1;
  drawGrid(currentGrid, currentPlayerX, currentPlayerY, currentGoalX, currentGoalY);
  resetTimerDisplay();
  setTimerStatus("ready");
  timerState = "idle";
  armed = false;
  saveCurrentMapToStorage("Generated");
  exportCurrentMapToJson();
  showToast("New maze generated");
}

function canMoveTo(x, y) {
  return x >= 0 && y >= 0 && x < currentSize && y < currentSize;
}

function moveIncrement(direction) {
  let x = currentPlayerX;
  let y = currentPlayerY;
  const cell = currentGrid[y][x];
  if (direction === "up") {
    if (cell.walls.top) return;
    if (!canMoveTo(x, y - 1)) return;
    y -= 1;
  } else if (direction === "down") {
    if (cell.walls.bottom) return;
    if (!canMoveTo(x, y + 1)) return;
    y += 1;
  } else if (direction === "left") {
    if (cell.walls.left) return;
    if (!canMoveTo(x - 1, y)) return;
    x -= 1;
  } else if (direction === "right") {
    if (cell.walls.right) return;
    if (!canMoveTo(x + 1, y)) return;
    x += 1;
  }
  currentPlayerX = x;
  currentPlayerY = y;
}

function moveSliding(direction) {
  let x = currentPlayerX;
  let y = currentPlayerY;
  while (true) {
    const cell = currentGrid[y][x];
    if (direction === "up") {
      if (cell.walls.top || !canMoveTo(x, y - 1)) break;
      y -= 1;
    } else if (direction === "down") {
      if (cell.walls.bottom || !canMoveTo(x, y + 1)) break;
      y += 1;
    } else if (direction === "left") {
      if (cell.walls.left || !canMoveTo(x - 1, y)) break;
      x -= 1;
    } else if (direction === "right") {
      if (cell.walls.right || !canMoveTo(x + 1, y)) break;
      x += 1;
    } else {
      break;
    }
  }
  currentPlayerX = x;
  currentPlayerY = y;
}

function handleMovement(direction) {
  if (!currentGrid || !isKeyHandlingEnabled) return;
  if (!armed && timerState === "idle") return;
  if (armed && timerState !== "running") startTimer();
  if (movementMode === "sliding") moveSliding(direction);
  else moveIncrement(direction);
  drawGrid(currentGrid, currentPlayerX, currentPlayerY, currentGoalX, currentGoalY);
  if (currentPlayerX === currentGoalX && currentPlayerY === currentGoalY && timerState === "running") {
    stopTimer(true);
    recordFinish();
  }
}

document.body.addEventListener("keydown", e => {
  if (!currentGrid) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (timerState === "idle") armTimer();
    return;
  }
  if (e.code === "KeyR") {
    e.preventDefault();
    handleReset(true);
    return;
  }
  if (!e.key.startsWith("Arrow")) return;
  const dir = e.key.slice(5).toLowerCase();
  if (["up", "down", "left", "right"].includes(dir)) {
    e.preventDefault();
    handleMovement(dir);
  }
});

generateMapBtn.addEventListener("click", () => {
  generateNewMaze();
});

if (generateMapFooterBtn) {
  generateMapFooterBtn.addEventListener("click", () => {
    generateNewMaze();
  });
}

resetMapBtn.addEventListener("click", () => {
  handleReset(true);
});

hardResetBtn.addEventListener("click", () => {
  handleReset(false);
});

startRunBtn.addEventListener("click", () => {
  if (!currentGrid) return;
  if (timerState === "idle") armTimer();
});

movementModePills.addEventListener("click", e => {
  const target = e.target.closest(".pill-option");
  if (!target) return;
  movementModePills.querySelectorAll(".pill-option").forEach(p => {
    p.classList.remove("active");
    p.style.transform = "scale(1)";
    p.style.boxShadow = "none";
  });
  target.classList.add("active");
  target.style.transform = "scale(1.02)";
  target.style.boxShadow = "0 0 10px rgba(99,102,241,0.6)";
  movementMode = target.dataset.mode;
  showToast(movementMode === "sliding" ? "Sliding mode" : "Increment mode");
});

playerColorPicker.addEventListener("input", () => {
  playerColor = playerColorPicker.value;
  if (currentGrid) drawGrid(currentGrid, currentPlayerX, currentPlayerY, currentGoalX, currentGoalY);
});

goalColorPicker.addEventListener("input", () => {
  goalColor = goalColorPicker.value;
  if (currentGrid) drawGrid(currentGrid, currentPlayerX, currentPlayerY, currentGoalX, currentGoalY);
});

copyMapJsonBtn.addEventListener("click", () => {
  const text = mapJsonOutput.textContent.trim();
  if (!text || mapJsonOutput.classList.contains("empty")) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("JSON copied");
    });
  } else {
    showToast("Copy not supported");
  }
});

clearMapJsonBtn.addEventListener("click", () => {
  mapJsonOutput.classList.add("empty");
  mapJsonOutput.textContent = "No map generated yet.";
});

loadMapFromJsonBtn.addEventListener("click", () => {
  const json = mapJsonInput.value.trim();
  if (!json) return;
  const ok = importMapFromJson(json);
  if (!ok) showToast("Invalid JSON");
});

savedMapsList.addEventListener("click", e => {
  const row = e.target.closest(".saved-map-row");
  if (!row) return;
  const id = row.dataset.id;
  const maps = getMapsFromStorage();
  const mapData = maps[id];
  if (!mapData || !mapData.data) return;
  currentGrid = dataToGrid(mapData.data);
  currentSize = mapData.data.size;
  currentMapId = id;
  currentMapMeta = mapData.meta;
  currentPlayerX = 0;
  currentPlayerY = 0;
  currentGoalX = currentSize - 1;
  currentGoalY = currentSize - 1;
  drawGrid(currentGrid, currentPlayerX, currentPlayerY, currentGoalX, currentGoalY);
  resetTimerDisplay();
  setTimerStatus("ready");
  timerState = "idle";
  armed = false;
  exportCurrentMapToJson();
  updateLeaderboardView();
  showToast("Map loaded");
});

window.addEventListener("resize", () => {
  if (!currentGrid) return;
  adjustMazeContainer(currentSize);
  const data = gridToData(currentGrid);
  currentGrid = dataToGrid(data);
  drawGrid(currentGrid, currentPlayerX, currentPlayerY, currentGoalX, currentGoalY);
});

if (localStorage.getItem(STORAGE_KEYS.HIDE_INSTRUCTIONS) === "true") {
  instructionsPopup.style.display = "none";
}

closeInstructionsBtn.addEventListener("click", () => {
  if (hideInstructionsCheckbox.checked) {
    localStorage.setItem(STORAGE_KEYS.HIDE_INSTRUCTIONS, "true");
  }
  instructionsPopup.style.display = "none";
});

fullscreenToggleBtn.addEventListener("click", () => {
  mazeShell.classList.toggle("fullscreen");
  const ev = new Event("resize");
  window.dispatchEvent(ev);
});

const floatPanels = [
  { panel: settingsPanel, openBtn: openSettingsPanelBtn, closeBtn: closeSettingsPanelBtn },
  { panel: savedPanel, openBtn: openSavedPanelBtn, closeBtn: closeSavedPanelBtn },
  { panel: leaderboardPanelFloating, openBtn: openLeaderboardPanelBtn, closeBtn: closeLeaderboardPanelBtn },
  { panel: jsonPanel, openBtn: openJsonPanelBtn, closeBtn: closeJsonPanelBtn }
];

floatPanels.forEach(cfg => {
  const panel = cfg.panel;
  const openBtn = cfg.openBtn;
  const closeBtn = cfg.closeBtn;
  if (openBtn && panel) {
    openBtn.addEventListener("click", () => {
      panel.classList.add("visible");
      panel.style.zIndex = String(3500 + Date.now() % 1000);
    });
  }
  if (closeBtn && panel) {
    closeBtn.addEventListener("click", () => {
      panel.classList.remove("visible");
    });
  }
  const handle = panel ? panel.querySelector(".float-panel-drag-handle") : null;
  if (panel && handle) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    handle.addEventListener("mousedown", e => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      document.body.style.userSelect = "none";
      panel.style.zIndex = String(4000);
    });
    window.addEventListener("mousemove", e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = startLeft + dx;
      const newTop = startTop + dy;
      panel.style.left = newLeft + "px";
      panel.style.top = newTop + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });
    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = "";
    });
  }
});

function init() {
  updateSavedMapsList();
  updateLeaderboardView();
  setTimerStatus("ready");
  generateNewMaze();
}

init();