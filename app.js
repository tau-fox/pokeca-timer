(() => {
  'use strict';

  const MATCH_LENGTH_MS = 25 * 60 * 1000;
  const WARNING_MS = 60 * 1000;

  const state = {
    mode: 'ready', // ready | running | paused | finished
    activePlayer: null,
    remainingMs: MATCH_LENGTH_MS,
    usedMs: [0, 0],
    lastTickAt: null,
    wakeLock: null,
  };

  const els = {
    mainTimer: document.getElementById('mainTimer'),
    statusText: document.getElementById('statusText'),
    resetBtn: document.getElementById('resetBtn'),
    swapNamesBtn: document.getElementById('swapNamesBtn'),
    rotateFlipBtn: document.getElementById('rotateFlipBtn'),
    usedTime: [document.getElementById('usedTime0'), document.getElementById('usedTime1')],
    pauseBtn: [document.getElementById('pauseBtn0'), document.getElementById('pauseBtn1')],
    actionBtn: [document.getElementById('actionBtn0'), document.getElementById('actionBtn1')],
    playerName: [document.getElementById('playerName0'), document.getElementById('playerName1')],
    playerPanel: Array.from(document.querySelectorAll('.player')),
  };

  function clampMs(value) {
    return Math.max(0, Math.round(value));
  }

  function formatTime(ms) {
    const totalSeconds = Math.ceil(clampMs(ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function formatUsedTime(ms) {
    const totalSeconds = Math.floor(clampMs(ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function getPlayerName(index) {
    const raw = els.playerName[index].value.trim();
    return raw || `プレイヤー${index === 0 ? 'A' : 'B'}`;
  }

  function setButtonLabel(button, label, hide = false) {
    const span = button.querySelector('.button-label');
    span.textContent = label;
    button.classList.toggle('label-hidden', hide);
  }

  function setAction(index, label, enabled, hidden = false, resume = false) {
    const button = els.actionBtn[index];
    button.disabled = !enabled;
    button.classList.toggle('is-resume', resume);
    setButtonLabel(button, label, hidden);
  }

  function setPause(index, enabled, hidden = false) {
    const button = els.pauseBtn[index];
    button.disabled = !enabled;
    setButtonLabel(button, '一時停止', hidden);
  }

  function render() {
    els.mainTimer.textContent = formatTime(state.remainingMs);
    els.mainTimer.classList.toggle('is-warning', state.remainingMs > 0 && state.remainingMs <= WARNING_MS);
    els.mainTimer.classList.toggle('is-finished', state.mode === 'finished');

    els.usedTime[0].textContent = formatUsedTime(state.usedMs[0]);
    els.usedTime[1].textContent = formatUsedTime(state.usedMs[1]);

    els.playerPanel.forEach((panel, index) => {
      panel.classList.toggle('is-active', state.activePlayer === index && state.mode === 'running');
    });

    if (state.mode === 'ready') {
      els.statusText.textContent = '先攻側の「対戦開始」を押してください';
      setAction(0, '対戦開始', true);
      setAction(1, '対戦開始', true);
      setPause(0, false);
      setPause(1, false);
      return;
    }

    if (state.mode === 'running') {
      const other = state.activePlayer === 0 ? 1 : 0;
      els.statusText.textContent = `${getPlayerName(state.activePlayer)}のターン中`;
      setAction(state.activePlayer, 'ターン終了', true);
      setAction(other, '対戦開始', false, true);
      setPause(0, true);
      setPause(1, true);
      return;
    }

    if (state.mode === 'paused') {
      const other = state.activePlayer === 0 ? 1 : 0;
      els.statusText.textContent = '一時停止中';
      setAction(state.activePlayer, '試合再開', true, false, true);
      setAction(other, '対戦開始', false, true);
      setPause(0, false, true);
      setPause(1, false, true);
      return;
    }

    if (state.mode === 'finished') {
      els.statusText.textContent = '試合時間終了';
      setAction(0, '対戦開始', false, true);
      setAction(1, '対戦開始', false, true);
      setPause(0, false, true);
      setPause(1, false, true);
    }
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      state.wakeLock = await navigator.wakeLock.request('screen');
      state.wakeLock.addEventListener('release', () => {
        state.wakeLock = null;
      });
    } catch (_) {
      state.wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    if (!state.wakeLock) return;
    try {
      await state.wakeLock.release();
    } catch (_) {
      // no-op
    } finally {
      state.wakeLock = null;
    }
  }

  function applyElapsed(now) {
    if (state.mode !== 'running' || state.lastTickAt == null || state.activePlayer == null) return;

    const elapsed = Math.max(0, now - state.lastTickAt);
    state.lastTickAt = now;

    state.remainingMs = clampMs(state.remainingMs - elapsed);
    state.usedMs[state.activePlayer] = clampMs(state.usedMs[state.activePlayer] + elapsed);

    if (state.remainingMs <= 0) {
      finishMatch();
    }
  }

  function tick() {
    applyElapsed(Date.now());
    render();
    requestAnimationFrame(tick);
  }

  function startMatch(playerIndex) {
    if (state.mode !== 'ready') return;
    state.mode = 'running';
    state.activePlayer = playerIndex;
    state.lastTickAt = Date.now();
    requestWakeLock();
    render();
  }

  function endTurn() {
    if (state.mode !== 'running' || state.activePlayer == null) return;
    applyElapsed(Date.now());
    if (state.mode === 'finished') return;
    state.activePlayer = state.activePlayer === 0 ? 1 : 0;
    state.lastTickAt = Date.now();
    render();
  }

  function pauseMatch() {
    if (state.mode !== 'running') return;
    applyElapsed(Date.now());
    if (state.mode === 'finished') return;
    state.mode = 'paused';
    state.lastTickAt = null;
    releaseWakeLock();
    render();
  }

  function resumeMatch() {
    if (state.mode !== 'paused') return;
    state.mode = 'running';
    state.lastTickAt = Date.now();
    requestWakeLock();
    render();
  }

  function finishMatch() {
    state.mode = 'finished';
    state.remainingMs = 0;
    state.lastTickAt = null;
    releaseWakeLock();
    if (navigator.vibrate) navigator.vibrate([180, 80, 180, 80, 260]);
  }

  function resetMatch() {
    const ok = state.mode === 'ready' || window.confirm('タイマーをリセットしますか？');
    if (!ok) return;
    state.mode = 'ready';
    state.activePlayer = null;
    state.remainingMs = MATCH_LENGTH_MS;
    state.usedMs = [0, 0];
    state.lastTickAt = null;
    releaseWakeLock();
    render();
  }

  function swapNames() {
    if (state.mode !== 'ready') return;
    const left = els.playerName[0].value;
    els.playerName[0].value = els.playerName[1].value;
    els.playerName[1].value = left;
  }

  function applyPseudoDirection() {
    const direction = localStorage.getItem('pokecaTimerPseudoDirection') || 'cw';
    document.body.classList.toggle('pseudo-ccw', direction === 'ccw');
  }

  function flipPseudoDirection() {
    const current = localStorage.getItem('pokecaTimerPseudoDirection') || 'cw';
    localStorage.setItem('pokecaTimerPseudoDirection', current === 'cw' ? 'ccw' : 'cw');
    applyPseudoDirection();
  }

  els.actionBtn.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (state.mode === 'ready') startMatch(index);
      else if (state.mode === 'running' && state.activePlayer === index) endTurn();
      else if (state.mode === 'paused' && state.activePlayer === index) resumeMatch();
    });
  });

  els.pauseBtn.forEach((button) => {
    button.addEventListener('click', pauseMatch);
  });

  els.resetBtn.addEventListener('click', resetMatch);
  els.swapNamesBtn.addEventListener('click', swapNames);
  els.rotateFlipBtn.addEventListener('click', flipPseudoDirection);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.mode === 'running') {
      requestWakeLock();
    } else if (document.visibilityState !== 'visible') {
      applyElapsed(Date.now());
      releaseWakeLock();
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  applyPseudoDirection();
  render();
  requestAnimationFrame(tick);
})();
