#!/usr/bin/env node

/**
 * tui.js — A premium, zero-dependency Terminal User Interface (TUI) for the 'burn' utility.
 * Runs entirely inside the console with keyboard controls, arrow navigation, live TUI progress, 
 * animated ASCII stick dancer, flickering flames, and humorous corporate OKRs.
 */

const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors and Styling Escape Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';
const CLEAR_SCREEN = '\x1b[2J\x1b[H';
const CLEAR_TO_END = '\x1b[J';
const CURSOR_TO_TOP = '\x1b[H';

// 8-bit ANSI Colors for high fidelity (bright & vivid)
const ORANGE = '\x1b[38;5;208m';
const MAGENTA = '\x1b[38;5;165m';
const CYAN = '\x1b[38;5;45m';
const RED = '\x1b[38;5;196m';
const YELLOW = '\x1b[38;5;220m';
const GREEN = '\x1b[38;5;82m';
const VIOLET = '\x1b[38;5;99m';

// Configuration Database
const BACKEND_MODELS = {
  claude: [
    { id: 'haiku', name: 'Claude Haiku', desc: 'Cheap & Light (Intern tier) 🔥' },
    { id: 'sonnet', name: 'Claude Sonnet', desc: 'Heavy Padding (Manager pleaser) 💸' },
    { id: 'opus', name: 'Claude Opus', desc: 'Director Melter (Immediate review) 🌋' }
  ],
  codex: [
    { id: 'gpt-5.5', name: 'GPT 5.5 Turbo', desc: 'Sovereign Core (Premium burn) 🤖' },
    { id: 'gpt-5.4', name: 'GPT 5.4 High', desc: 'Aggressive Billing (VC Bait) 📈' },
    { id: 'gpt-5.4-nano', name: 'GPT 5.4 Nano', desc: 'Budget Combuster (Hobbyist) 🪵' }
  ]
};

const PRESETS = [10000, 50000, 100000, 500000, 'custom'];

const ACHIEVEMENTS = [
  "Master of Corporate Theater",
  "Lead Vibe Architect",
  "SVP Budget Destroyer",
  "OKR Padding Champion",
  "Vanity Metrics Titan",
  "Nihilism Promotion Pioneer"
];

// Application State
let activeScreen = 'config'; // 'config', 'burn', 'victory'
let focusedItem = 'backend'; // 'backend', 'model', 'tokens', 'ignite'
let backend = 'claude';
let activeModelIdx = 0;
let selectedPresetIdx = 1; // 50k default
let customTokens = 250000;
let isWarningNihilist = false;
let isSmallScreen = false;

// Burn Stats
let activeChild = null;
let burnedTokens = 0;
let targetTokens = 50000;
let burnPercentage = 0;
let costString = '$0.000000';
let iterationCalls = 0;
let burnSpeed = 0;
let telemetryLogs = [];
let burnCompletedSuccessfully = true;

// Timing metrics for speed calculations
let lastTime = 0;
let lastBurned = 0;

// Animation frames state
let dancerFrame = 0;
let renderTimer = null;
let pulseTimerCount = 0;
let cleanupComplete = false;
let initialRawMode = false;
let returnToConfigTimer = null;
let burnWasAborted = false;

// ASCII Dancer Poses (John Travolta sway postures)
const DANCER_POSES = [
  // Pose 0: Right hand pointing up-right, left on hip
  [
    `     *   🪩  *     `,
    `        /|\\        `,
    `           /       `,
    `         o/        `,
    `        <|         `,
    `         |         `,
    `        / \\        `,
    `  ▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓  `
  ],
  // Pose 1: Lean left Travolta
  [
    `  *      🪩      * `,
    `        \\|/        `,
    `       /           `,
    `     o/            `,
    `    <|             `,
    `     |             `,
    `    / \\            `,
    `  ▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒  `
  ],
  // Pose 2: Left hand pointing up-left, right on hip
  [
    `     *   🪩  *     `,
    `        /|\\        `,
    `       \\           `,
    `        \\o         `,
    `         |>        `,
    `         |         `,
    `        / \\        `,
    `  ▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓  `
  ],
  // Pose 3: Lean right Travolta
  [
    `  *      🪩      * `,
    `        \\|/        `,
    `           \\       `,
    `            \\o     `,
    `             |>    `,
    `             |     `,
    `            / \\    `,
    `  ▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒  `
  ]
];

function stripAnsi(value) {
  return String(value)
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[@-Z\\-_]/g, '')
    .replace(/\x9b[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x07/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function charWidth(char) {
  const code = char.codePointAt(0);
  if (!code || code < 32 || (code >= 0x7f && code < 0xa0)) return 0;
  if (
    code === 0x200d ||
    (code >= 0x0300 && code <= 0x036f) ||
    (code >= 0x1ab0 && code <= 0x1aff) ||
    (code >= 0x1dc0 && code <= 0x1dff) ||
    (code >= 0x20d0 && code <= 0x20ff) ||
    (code >= 0xfe00 && code <= 0xfe0f) ||
    (code >= 0xfe20 && code <= 0xfe2f)
  ) {
    return 0;
  }
  if (
    code >= 0x1100 && (
      code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    )
  ) {
    return 2;
  }
  if ((code >= 0x1f000 && code <= 0x1faff) || (code >= 0x2600 && code <= 0x27bf)) {
    return 2;
  }
  return 1;
}

function visibleWidth(value) {
  let width = 0;
  for (const char of Array.from(stripAnsi(value))) {
    width += charWidth(char);
  }
  return width;
}

function readAnsiSequence(value, index) {
  if (value[index] !== '\x1b') return null;
  const next = value[index + 1];
  if (!next) return { sequence: '', nextIndex: index + 1 };

  if (next === '[') {
    let end = index + 2;
    while (end < value.length && !/[@-~]/.test(value[end])) end++;
    return { sequence: value.slice(index, Math.min(end + 1, value.length)), nextIndex: Math.min(end + 1, value.length) };
  }

  if (next === ']') {
    let end = index + 2;
    while (end < value.length) {
      if (value[end] === '\x07') {
        end++;
        break;
      }
      if (value[end] === '\x1b' && value[end + 1] === '\\') {
        end += 2;
        break;
      }
      end++;
    }
    return { sequence: value.slice(index, end), nextIndex: end };
  }

  return { sequence: value.slice(index, index + 2), nextIndex: index + 2 };
}

function fitAnsiLine(value, maxWidth) {
  if (maxWidth <= 0) return '';
  const text = String(value);
  let output = '';
  let width = 0;
  let truncated = false;

  for (let i = 0; i < text.length;) {
    const ansi = readAnsiSequence(text, i);
    if (ansi) {
      output += ansi.sequence;
      i = ansi.nextIndex;
      continue;
    }

    const codePoint = text.codePointAt(i);
    const char = String.fromCodePoint(codePoint);
    const nextWidth = charWidth(char);
    if (width + nextWidth > maxWidth) {
      truncated = true;
      break;
    }
    output += char;
    width += nextWidth;
    i += char.length;
  }

  return truncated ? `${output}${RESET}` : output;
}

function truncateVisible(value, maxWidth) {
  if (maxWidth <= 0) return '';
  let output = '';
  let width = 0;
  for (const char of Array.from(stripAnsi(value))) {
    const nextWidth = charWidth(char);
    if (width + nextWidth > maxWidth) break;
    output += char;
    width += nextWidth;
  }
  return output;
}

function padVisible(value, maxWidth) {
  const truncated = truncateVisible(value, maxWidth);
  return truncated + ' '.repeat(Math.max(0, maxWidth - visibleWidth(truncated)));
}

function splitBufferedLines(buffer, data) {
  const next = buffer + data.toString('utf8');
  const lines = next.split(/\r\n|\r|\n/);
  return { lines: lines.slice(0, -1), rest: lines[lines.length - 1] };
}

function costDisplay() {
  return costString === 'cost n/a' ? costString : `${costString} USD`;
}

function isCoreVisualLine(line) {
  return (
    line.includes('▲') ||
    line.includes('░░░') ||
    line.includes('🪩') ||
    line.includes('┌───────') ||
    line.includes('└───────') ||
    line.includes('▓') ||
    line.includes('▒') ||
    (line.includes('│') && (
      line.includes('o/') ||
      line.includes('<|') ||
      line.includes('/ \\') ||
      line.includes('o\\') ||
      line.includes('|\\') ||
      line.includes('|<')
    ))
  );
}

function addTelemetryLine(line) {
  const cleanLine = stripAnsi(line).replace(/\t/g, ' ').trim();
  if (!cleanLine || isCoreVisualLine(cleanLine)) return;

  if (cleanLine.includes('[██') || cleanLine.includes('[░░') || cleanLine.startsWith('BURN_PROGRESS')) {
    return;
  }

  telemetryLogs.push(cleanLine);
  if (telemetryLogs.length > 5) {
    telemetryLogs.shift();
  }
}

// Clean scroll helper: adds sanitized lines and keeps the latest telemetry.
function appendTelemetry(text) {
  String(text).split(/\r\n|\r|\n/).forEach(addTelemetryLine);
}

function updateProgress(pct, burned, target, cost, calls) {
  if (!Number.isFinite(pct) || !Number.isFinite(burned) || !Number.isFinite(target) || !Number.isFinite(calls)) {
    return false;
  }

  burnPercentage = Math.max(0, Math.min(100, Math.trunc(pct)));
  burnedTokens = Math.max(0, Math.trunc(burned));
  targetTokens = Math.max(1, Math.trunc(target));
  costString = cost || 'cost n/a';
  iterationCalls = Math.max(0, Math.trunc(calls));

  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  const dTokens = burnedTokens - lastBurned;
  if (dt >= 0.5 && dTokens > 0) {
    burnSpeed = Math.round(dTokens / dt);
    lastTime = now;
    lastBurned = burnedTokens;
  }

  return true;
}

function parseProgressLine(rawLine) {
  const cleanLine = stripAnsi(rawLine).trim();
  if (!cleanLine) return false;

  if (cleanLine.startsWith('BURN_PROGRESS\t')) {
    const parts = cleanLine.split('\t');
    const parsed = updateProgress(
      Number(parts[1]),
      Number(parts[2]),
      Number(parts[3]),
      parts[4],
      Number(parts[5])
    );
    const status = parts.slice(6).join('\t').trim();
    if (status) appendTelemetry(`progress ${status}`);
    return parsed;
  }

  const match = cleanLine.match(/\[([█░]+)\]\s*(\d+)%\s*•\s*([\d,]+)\/([\d,]+)\s*tokens\s*•\s*(\$\d+(?:\.\d+)?|cost n\/a)\s*•\s*(\d+)\s*call\(s\)/);
  if (!match) return false;

  return updateProgress(
    Number(match[2]),
    Number(match[3].replace(/,/g, '')),
    Number(match[4].replace(/,/g, '')),
    match[5],
    Number(match[6])
  );
}

function handleChildStdoutLine(line) {
  if (!parseProgressLine(line)) {
    appendTelemetry(line);
  }
}

function handleChildStderrLine(line) {
  const cleanLine = stripAnsi(line).trim();
  if (cleanLine) appendTelemetry(`[stderr] ${cleanLine}`);
}

// Flickering flames strip generator
function getFlickeringFlames(width, tick) {
  const flameChars = ['▲', ' ', '▲', '▲', ' '];
  const colors = [RED, ORANGE, YELLOW];
  let strip = '';
  for (let i = 0; i < width; i++) {
    const char = flameChars[(i + tick) % flameChars.length];
    const color = colors[(i + tick) % colors.length];
    strip += `${color}${char}${RESET}`;
  }
  return strip;
}

// Manage TUI transitions and reset layout safely
function setScreen(newScreen) {
  activeScreen = newScreen;
  process.stdout.write(CLEAR_SCREEN);
}

// Initialization and keystroke capture
function startTUI() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('error: the TUI requires an interactive terminal.');
    process.exit(2);
  }

  initialRawMode = Boolean(process.stdin.isRaw);
  process.stdin.setRawMode(true);
  readline.emitKeypressEvents(process.stdin);
  process.stdin.resume();
  process.stdout.write(ENTER_ALT_SCREEN + HIDE_CURSOR + CLEAR_SCREEN);

  // Capture keystrokes
  process.stdin.on('keypress', (str, key) => {
    if ((key && key.ctrl && key.name === 'c') || str === '\u0003') {
      exitTUI(130);
    }

    if (activeScreen === 'config') {
      handleConfigKey(str, key);
    } else if (activeScreen === 'burn') {
      handleBurnKey(str, key);
    } else if (activeScreen === 'victory') {
      handleVictoryKey(str, key);
    }
  });

  // Start 150ms render loop for smooth flicker-free animations (6.6 FPS)
  renderTimer = setInterval(() => {
    pulseTimerCount++;
    drawScreen();
  }, 150);

  process.once('SIGINT', () => exitTUI(130));
  process.once('SIGTERM', () => exitTUI(143));
  process.once('uncaughtException', (error) => {
    cleanup();
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
  process.once('exit', () => {
    if (!cleanupComplete) {
      try {
        process.stdout.write(SHOW_CURSOR + RESET + EXIT_ALT_SCREEN);
      } catch (e) {}
    }
  });
}

function exitTUI(code = 0) {
  cleanup();
  process.exit(code);
}

function cleanup() {
  if (cleanupComplete) return;
  cleanupComplete = true;
  stopAudioFeed();
  if (returnToConfigTimer) {
    clearTimeout(returnToConfigTimer);
    returnToConfigTimer = null;
  }
  if (activeChild) {
    try {
      process.kill(-activeChild.pid, 'SIGINT');
    } catch (e) {}
    activeChild = null;
  }
  if (renderTimer) {
    clearInterval(renderTimer);
    renderTimer = null;
  }
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(initialRawMode);
    } catch (e) {}
    process.stdin.pause();
  }
  process.stdout.write(CLEAR_SCREEN + SHOW_CURSOR + RESET + EXIT_ALT_SCREEN);
}

// Config Screen Key Handlers
function handleConfigKey(str, key) {
  const isUp = (key && key.name === 'up') || str === '\u001b[A' || str === '\u001bOA';
  const isDown = (key && key.name === 'down') || str === '\u001b[B' || str === '\u001bOB';
  const isLeft = (key && key.name === 'left') || str === '\u001b[D' || str === '\u001bOD';
  const isRight = (key && key.name === 'right') || str === '\u001b[C' || str === '\u001bOC';
  const isEnter = (key && (key.name === 'return' || key.name === 'enter')) || str === '\r' || str === '\n';
  const isSpace = (key && key.name === 'space') || str === ' ';
  const isEscape = (key && key.name === 'escape') || str === '\u001b';

  if (isWarningNihilist) {
    if (isEnter || str === 'y' || str === 'Y') {
      isWarningNihilist = false;
      selectedPresetIdx = 4; // locks custom preset slider
      customTokens = 1000000;
      focusedItem = 'ignite';
    } else {
      isWarningNihilist = false;
      selectedPresetIdx = 1; // resets back to 50k
      focusedItem = 'tokens';
    }
    return;
  }

  // Standard Navigation
  if (isUp) {
    const fields = ['backend', 'model', 'tokens', 'ignite'];
    let idx = fields.indexOf(focusedItem) - 1;
    if (idx < 0) idx = fields.length - 1;
    focusedItem = fields[idx];
  } else if (isDown) {
    const fields = ['backend', 'model', 'tokens', 'ignite'];
    let idx = (fields.indexOf(focusedItem) + 1) % fields.length;
    focusedItem = fields[idx];
  }

  // Toggling options
  if (focusedItem === 'backend') {
    if (isLeft || isRight || isSpace) {
      backend = backend === 'claude' ? 'codex' : 'claude';
      activeModelIdx = 0; // reset model index
    }
  } else if (focusedItem === 'model') {
    const modelsCount = BACKEND_MODELS[backend].length;
    if (isLeft) {
      activeModelIdx = (activeModelIdx - 1 + modelsCount) % modelsCount;
    } else if (isRight || isSpace) {
      activeModelIdx = (activeModelIdx + 1) % modelsCount;
    }
  } else if (focusedItem === 'tokens') {
    if (isLeft) {
      if (selectedPresetIdx === 4 && customTokens > 10000) {
        customTokens -= 25000;
      } else if (selectedPresetIdx > 0) {
        selectedPresetIdx--;
      }
    } else if (isRight) {
      if (selectedPresetIdx === 4 && customTokens < 1000000) {
        customTokens += 25000;
        if (customTokens >= 1000000) {
          isWarningNihilist = true;
        }
      } else if (selectedPresetIdx < PRESETS.length - 1) {
        selectedPresetIdx++;
        if (PRESETS[selectedPresetIdx] === 'custom' && customTokens >= 1000000) {
          isWarningNihilist = true;
        }
      }
    } else if (isSpace) {
      selectedPresetIdx = (selectedPresetIdx + 1) % PRESETS.length;
      if (PRESETS[selectedPresetIdx] === 'custom' && customTokens >= 1000000) {
        isWarningNihilist = true;
      }
    }
  } else if (focusedItem === 'ignite') {
    if (isEnter || isSpace) {
      igniteCombustion();
    }
  }

  // Q/Esc exit triggers
  if (isEscape || str === 'q' || str === 'Q') {
    exitTUI(0);
  }
}

// Active Combustion Screen Key Handlers
function handleBurnKey(str, key) {
  const isSpace = (key && key.name === 'space') || str === ' ';
  const isEscape = (key && key.name === 'escape') || str === '\u001b';
  
  if (isSpace || isEscape) {
    appendTelemetry(`${RED}⚠️ Interrupted by user. Extinguishing core...${RESET}`);
    abortBurn();
  }
}

// Victory Screen Key Handlers
function handleVictoryKey(str, key) {
  // Return to configuration deck on any keypress
  setScreen('config');
  focusedItem = 'backend';
  isWarningNihilist = false;
}

// Spawning and Running the Burn Core
function igniteCombustion() {
  setScreen('burn');
  
  burnWasAborted = false;
  targetTokens = selectedPresetIdx === 4 ? customTokens : PRESETS[selectedPresetIdx];
  burnedTokens = 0;
  burnPercentage = 0;
  costString = 'cost n/a';
  iterationCalls = 0;
  burnSpeed = 0;
  telemetryLogs = [];
  lastTime = Date.now();
  lastBurned = 0;

  appendTelemetry(`🚀 [system] Charging token furnace. Target: ${targetTokens.toLocaleString()}...`);
  
  const modelsList = BACKEND_MODELS[backend];
  const modelId = modelsList[activeModelIdx].id;

  const scriptPath = path.join(__dirname, 'burn');
  if (!fs.existsSync(scriptPath)) {
    appendTelemetry(`❌ [system] Burn script not found: ${scriptPath}`);
    burnCompletedSuccessfully = false;
    returnToConfigTimer = setTimeout(() => {
      if (activeScreen === 'burn') setScreen('config');
    }, 2500);
    return;
  }
  
  // Start synthesizers
  startAudioFeed();

  // Spawn child script
  activeChild = spawn('bash', [scriptPath, targetTokens.toString(), '--backend', backend, '--model', modelId], {
    detached: true,
    env: {
      ...process.env,
      BURN_TUI_CHILD: '1',
      PAGER: 'cat'
    }
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';
  
  activeChild.stdout.on('data', (data) => {
    const parsed = splitBufferedLines(stdoutBuffer, data);
    stdoutBuffer = parsed.rest;
    parsed.lines.forEach(handleChildStdoutLine);
  });

  activeChild.stdout.on('end', () => {
    if (stdoutBuffer.trim()) handleChildStdoutLine(stdoutBuffer);
    stdoutBuffer = '';
  });

  activeChild.stderr.on('data', (data) => {
    const parsed = splitBufferedLines(stderrBuffer, data);
    stderrBuffer = parsed.rest;
    parsed.lines.forEach(handleChildStderrLine);
  });

  activeChild.stderr.on('end', () => {
    if (stderrBuffer.trim()) handleChildStderrLine(stderrBuffer);
    stderrBuffer = '';
  });

  activeChild.on('error', (error) => {
    activeChild = null;
    stopAudioFeed();
    burnCompletedSuccessfully = false;
    appendTelemetry(`❌ [system] Could not start burn process: ${error.message}`);
    returnToConfigTimer = setTimeout(() => {
      if (activeScreen === 'burn') setScreen('config');
    }, 3000);
  });

  activeChild.on('close', (code) => {
    activeChild = null;
    stopAudioFeed();
    if (returnToConfigTimer) {
      clearTimeout(returnToConfigTimer);
      returnToConfigTimer = null;
    }
    if (code === 0 && !burnWasAborted) {
      burnCompletedSuccessfully = true;
      setScreen('victory');
    } else {
      burnCompletedSuccessfully = false;
      appendTelemetry(
        burnWasAborted
          ? '🛑 [system] Combustion aborted.'
          : `❌ [system] Process terminated with exit code: ${code}`
      );
      returnToConfigTimer = setTimeout(() => {
        returnToConfigTimer = null;
        if (activeScreen === 'burn') setScreen('config');
      }, burnWasAborted ? 900 : 3000);
    }
  });
}

function abortBurn() {
  if (activeChild) {
    burnWasAborted = true;
    stopAudioFeed();
    try {
      process.kill(-activeChild.pid, 'SIGINT');
    } catch (e) {}
  }
}

// Web Audio API Synthesizer (Buzzer/Bleep simulation using raw stderr triggers)
// Hitting standard Mac terminal bells inside terminal TUIs is funny!
function startAudioFeed() {
  // Inside terminal, we can issue an audit bell using \x07!
  // It gives a delightful retro console beep on iterations. We'll beep!
  process.stdout.write('\x07');
}

function stopAudioFeed() {
  // No active timers to clear for shell beeping
}


// DOUBLE-BUFFER RENDERING SYSTEM
// Compiles full frame into buffer string and draws once to prevent flicker.
function drawScreen() {
  const rows = process.stdout.rows || 24;
  const cols = process.stdout.columns || 80;

  // Strict UI limits
  const minRows = 18;
  const minCols = 80;

  if (rows < minRows || cols < minCols) {
    if (!isSmallScreen) {
      process.stdout.write(CLEAR_SCREEN);
      isSmallScreen = true;
    }
    
    let s = CURSOR_TO_TOP;
    s += `\n${RED}${BOLD}  ⚠️  TERMINAL WINDOW TOO SMALL${RESET}\n\n`;
    s += `  Current size: ${BOLD}${cols}x${rows}${RESET}\n`;
    s += `  Required min: ${BOLD}${minCols}x${minRows}${RESET}\n\n`;
    s += `  ${DIM}Please enlarge your terminal window or decrease font size.${RESET}\n`;
    s += `  ${DIM}Or press [Q] to exit.${RESET}\n`;
    
    // Wipe visual trails in remaining window space
    for (let i = 8; i < rows; i++) {
      s += '\n';
    }
    
    const lines = s.split('\n');
    const cleaned = lines.map(line => fitAnsiLine(line, cols) + '\x1b[K').join('\n');
    process.stdout.write(cleaned + CLEAR_TO_END);
    return;
  }

  if (isSmallScreen) {
    process.stdout.write(CLEAR_SCREEN);
    isSmallScreen = false;
  }

  let buf = CURSOR_TO_TOP;
  let rawContent = '';

  if (activeScreen === 'config') {
    rawContent = compileConfigScreen();
  } else if (activeScreen === 'burn') {
    rawContent = compileBurnScreen();
  } else if (activeScreen === 'victory') {
    rawContent = compileVictoryScreen();
  }

  // Split and add \x1b[K to every line to wipe trailing characters, then write.
  const lines = rawContent.split('\n');
  const cleaned = lines.map(line => fitAnsiLine(line, cols) + '\x1b[K').join('\n');
  process.stdout.write(buf + cleaned + CLEAR_TO_END);
}

// 1. Compile Screen: Config
function compileConfigScreen() {
  let s = '';
  
  s += `${ORANGE}┌────────────────────────────────────────────────────────┐${RESET}\n`;
  s += `${ORANGE}│${RESET}  ${BOLD}${RED}🔥  B U R N ,   B A B Y ,   B U R N  (TUI CORE)  🔥${RESET}   ${ORANGE}│${RESET}\n`;
  s += `${ORANGE}└────────────────────────────────────────────────────────┘${RESET}\n`;

  // Section 1: Backend Selection
  const bSel = focusedItem === 'backend' ? `${ORANGE}▶${RESET} ` : '  ';
  const claudeBullet = backend === 'claude' ? `${ORANGE}●${RESET}` : ' ';
  const codexBullet = backend === 'codex' ? `${ORANGE}●${RESET}` : ' ';
  s += `${bSel}${BOLD}🌐 BACKEND:${RESET}   [${claudeBullet}] Claude Code (3.5)    [${codexBullet}] OpenAI Codex (GPT-5)\n`;

  // Section 2: Model Selection
  const mSel = focusedItem === 'model' ? `${ORANGE}▶${RESET} ` : '  ';
  s += `${mSel}${BOLD}🌋 MODEL:${RESET}     `;
  const models = BACKEND_MODELS[backend];
  models.forEach((m, idx) => {
    const isSelected = activeModelIdx === idx;
    const bullet = isSelected ? `${YELLOW}🔘${RESET}` : '⚪';
    const style = isSelected ? `${BOLD}${YELLOW}` : '';
    const shortName = m.name.replace('Claude ', '').replace('GPT ', '');
    s += `${bullet} ${style}${shortName}${RESET}   `;
  });
  s += '\n';

  // Section 3: Target Selection
  const tSel = focusedItem === 'tokens' ? `${ORANGE}▶${RESET} ` : '  ';
  s += `${tSel}${BOLD}💸 TARGET:${RESET}    `;
  PRESETS.forEach((p, idx) => {
    const isSelected = selectedPresetIdx === idx;
    let label = p === 'custom' ? '[Custom]' : `[${(p/1000)}k]`;
    const color = isSelected ? GREEN : (focusedItem === 'tokens' ? RESET : DIM);
    const wrap = isSelected ? `${BOLD}${color}` : `${DIM}`;
    s += `${wrap}${label}${RESET}  `;
  });
  s += '\n';

  // Description / Custom Slider
  if (selectedPresetIdx === 4) {
    const maxVal = 1000000;
    const minVal = 10000;
    const pct = (customTokens - minVal) / (maxVal - minVal);
    const sliderWidth = 15;
    const filled = Math.round(pct * sliderWidth);
    const empty = sliderWidth - filled;
    const sliderBar = `${RED}█${RESET}`.repeat(filled) + `${DIM}░${RESET}`.repeat(empty);
    
    let desc = '';
    if (customTokens <= 100000) desc = "Satisfactory OKR padding.";
    else if (customTokens <= 500000) desc = "Significant metrics!";
    else desc = "EXTREME nihilism! CEO promotion or fire. 🌋";
    
    s += `     ${BOLD}${ORANGE}Slider:${RESET} <─${sliderBar}─> ${BOLD}${GREEN}${customTokens.toLocaleString()}${RESET} tokens (${DIM}${desc}${RESET})\n`;
  } else {
    const modelsList = BACKEND_MODELS[backend];
    s += `     ${DIM}Desc: ${modelsList[activeModelIdx].desc}${RESET}\n`;
  }

  s += `${DIM}────────────────────────────────────────────────────────${RESET}\n`;
  s += `${DIM}[Arrow keys] Navigate & Tune  [Space/Enter] Cycle  [Q] Exit${RESET}\n`;

  // Action Button
  const igniteFocus = focusedItem === 'ignite';
  const igniteText = igniteFocus 
    ? `${BOLD}${RED}👉 [ IGNITE COMBUSTION ] 👈${RESET}` 
    : `${ORANGE}[ IGNITE COMBUSTION ]${RESET}`;
  s += `                ${igniteText}\n`;

  // Nihilist Warning Overlay (Drawn inline inside the TUI boundaries)
  if (isWarningNihilist) {
    s += `${RED}${BOLD}⚠️ WARNING: Proceed with audits? [Y]es / [N]o:${RESET}`;
  } else {
    s += '';
  }

  return s;
}

// 2. Compile Screen: Active Burn
function compileBurnScreen() {
  let s = '';

  s += `${RED}🔥 ${BOLD}${YELLOW}ACTIVE COMBUSTION ARENA${RESET} ${RED}•${RESET} ${CYAN}${backend.toUpperCase()} (${BACKEND_MODELS[backend][activeModelIdx].id})${RESET}\n`;

  // Two Column Layout
  const dancerLines = DANCER_POSES[dancerFrame];
  
  // Left Column (Disco Dancer + Fire)
  const leftCol = [];
  dancerLines.forEach(l => leftCol.push(l));
  leftCol.push(getFlickeringFlames(17, pulseTimerCount)); // ground fire

  // Right Column (Metrics & Odometer)
  const pct = Math.min(100, burnPercentage);
  const barWidth = 10;
  const filled = Math.round((pct / 100) * barWidth);
  const empty = barWidth - filled;
  const progressBar = `${GREEN}█${RESET}`.repeat(filled) + `${DIM}░${RESET}`.repeat(empty);

  const okrDraw = (val, maxRatio) => {
    const ratio = Math.min(100, Math.round(val * maxRatio));
    const width = 6;
    const f = Math.round((ratio / 100) * width);
    const e = width - f;
    return `[${`${GREEN}█${RESET}`.repeat(f)}${`${DIM}░${RESET}`.repeat(e)}] ${ratio}%`;
  };

  const rightCol = [];
  rightCol.push(`${BOLD}${CYAN}PROGRESS TELEMETRY:${RESET}`);
  rightCol.push(`${BOLD}Burned:${RESET} ${BOLD}${GREEN}${burnedTokens.toLocaleString()}${RESET} / ${targetTokens.toLocaleString()} tokens`);
  rightCol.push(`${BOLD}Pct:${RESET}    ${BOLD}${GREEN}${pct}%${RESET} [${progressBar}]`);
  rightCol.push(`${BOLD}Spent:${RESET}  ${BOLD}${GREEN}${costDisplay()}${RESET} | Speed: ${CYAN}${burnSpeed.toLocaleString()}${RESET} t/s`);
  rightCol.push(`${BOLD}Calls:${RESET}  ${BOLD}${VIOLET}${iterationCalls}${RESET} completed`);
  rightCol.push(`${BOLD}${YELLOW}OKRs:${RESET}   Ladder:  ${okrDraw(pct, 1.4)}`);
  rightCol.push(`       Manager: ${okrDraw(pct, 2.5)}`);
  rightCol.push(`       VC Depth:${okrDraw(pct, 4.0)}`);
  rightCol.push(`${DIM}Press [Space] to Extinguish Flames (Abort)${RESET}`);

  // Merge columns
  const maxLines = Math.max(leftCol.length, rightCol.length);
  for (let i = 0; i < maxLines; i++) {
    const leftPart = leftCol[i] || '                 ';
    const rightPart = rightCol[i] || '';
    s += `  ${leftPart}   ${rightPart}\n`;
  }

  // Bottom nested sub-console window
  s += `${DIM}┌── LIVE TELEMETRY STREAM ─────────────────────────────┐${RESET}\n`;
  
  // Render latest clean scrolling logs
  const displayLogs = [...telemetryLogs];
  while (displayLogs.length < 3) {
    displayLogs.push(' > awaiting next iteration telemetry...');
  }
  displayLogs.slice(-3).forEach(l => {
    s += `${DIM}│${RESET} ${padVisible(l, 52)} ${DIM}│${RESET}\n`;
  });
  s += `${DIM}└──────────────────────────────────────────────────────┘${RESET}\n`;

  return s;
}

// 3. Compile Screen: Victory
function compileVictoryScreen() {
  let s = '';

  s += `${GREEN}┌────────────────────────────────────────────────────────┐${RESET}\n`;
  s += `${GREEN}│${RESET}   ${BOLD}${GREEN}🏆   C O M B U S T I O N   C O M P L E T E D !   🏆${RESET}   ${GREEN}│${RESET}\n`;
  s += `${GREEN}└────────────────────────────────────────────────────────┘${RESET}\n`;

  let badgeIdx = targetTokens % ACHIEVEMENTS.length;
  const badgeName = ACHIEVEMENTS[badgeIdx];
  s += `  ${BOLD}${YELLOW}Achievement Unlocked:${RESET} 👉 "${BOLD}${ORANGE}${badgeName}${RESET}"\n`;

  s += `  ${CYAN}${BOLD}OFFICIAL RECEIPTS:${RESET}\n`;
  s += `  🔥 Tokens Torched: ${BOLD}${GREEN}${burnedTokens.toLocaleString()}${RESET}  💰 Cost: ${BOLD}${GREEN}${costDisplay()}${RESET}\n`;
  s += `  🕺 Vibes:          ${BOLD}Immaculate${RESET}     📈 OKRs: ${BOLD}+420% Ascent${RESET}\n`;

  s += `  ${DIM}Receipt has been charged directly to your corporate bill.${RESET}\n`;
  s += `  ${DIM}Copy these stats to your next weekly promotion request!${RESET}\n`;

  s += `${DIM}────────────────────────────────────────────────────────${RESET}\n`;
  s += `      ${BOLD}${GREEN}Press any key to return to Control Deck${RESET}\n`;

  return s;
}

// KICK IT OFF!
startTUI();
