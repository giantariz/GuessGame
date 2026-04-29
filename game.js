let questions = [...defaultQuestions];
let players = [];
let round = 0;
let usedQuestionIndexes = [];
let currentQuestionIndex = null;
let timerInterval = null;
let timeLeft = 0;
let currentDuration = 30;
let answerRevealed = false;
let sequencePointer = 0;

const el = {
  // Players tab
  playersList: document.getElementById('playersList'),
  playerName: document.getElementById('playerName'),
  addPlayerBtn: document.getElementById('addPlayerBtn'),
  resetScoresBtn: document.getElementById('resetScoresBtn'),
  newGameBtn: document.getElementById('newGameBtn'),
  tabBadgePlayers: document.getElementById('tabBadgePlayers'),
  // Game settings
  timerSeconds: document.getElementById('timerSeconds'),
  categorySelect: document.getElementById('categorySelect'),
  modeSelect: document.getElementById('modeSelect'),
  // Game controls
  startRoundBtn: document.getElementById('startRoundBtn'),
  revealBtn: document.getElementById('revealBtn'),
  nextQuestionBtn: document.getElementById('nextQuestionBtn'),
  gameScoreboardPanel: document.getElementById('gameScoreboardPanel'),
  gameScoreboard: document.getElementById('gameScoreboard'),
  // Status
  roundCounter: document.getElementById('roundCounter'),
  questionCount: document.getElementById('questionCount'),
  // Question card
  questionNumber: document.getElementById('questionNumber'),
  questionText: document.getElementById('questionText'),
  categoryPill: document.getElementById('categoryPill'),
  modePill: document.getElementById('modePill'),
  timerFill: document.getElementById('timerFill'),
  answerValue: document.getElementById('answerValue'),
  // Questions tab
  searchInput: document.getElementById('searchInput'),
  questionsList: document.getElementById('questionsList'),
  // Create tab
  createJsonInput: document.getElementById('createJsonInput'),
  loadCreatedQuestionsBtn: document.getElementById('loadCreatedQuestionsBtn'),
  restoreDefaultBtn: document.getElementById('restoreDefaultBtn'),
  createImportStatus: document.getElementById('createImportStatus'),
  categoryCheckboxesContainer: document.getElementById('categoryCheckboxesContainer'),
  createQuestionCount: document.getElementById('createQuestionCount'),
  generatePromptBtn: document.getElementById('generatePromptBtn'),
  promptOutput: document.getElementById('promptOutput'),
  copyPromptBtn: document.getElementById('copyPromptBtn'),
  promptSection: document.getElementById('promptSection'),
  newGameInlineBtn: document.getElementById('newGameInlineBtn'),
  // Tabs
  tabTriggers: document.querySelectorAll('[data-tab-trigger]'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  // Theme
  themeToggle: document.querySelector('[data-theme-toggle]')
};

const html = document.documentElement;
let theme = 'light';

// ── Theme ─────────────────────────────────────────
function applyTheme() {
  html.setAttribute('data-theme', theme);
  el.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  el.themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Άλλαξε σε φωτεινό θέμα' : 'Άλλαξε σε σκοτεινό θέμα');
}

// ── Tab system ────────────────────────────────────
function switchTab(tabName) {
  el.tabTriggers.forEach(btn => {
    const active = btn.dataset.tabTrigger === tabName;
    btn.classList.toggle('tab-btn--active', active);
    btn.setAttribute('aria-selected', active);
  });
  el.tabPanels.forEach(panel => {
    panel.classList.toggle('tab-panel--active', panel.id === `panel-${tabName}`);
  });
}

// ── Categories ────────────────────────────────────
function populateCategories() {
  const categories = [...new Set(questions.map(q => q.category))].sort((a, b) => a.localeCompare(b, 'el'));
  el.categorySelect.innerHTML = '<option value="all">Όλες</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    el.categorySelect.appendChild(option);
  });
}

// ── Players ───────────────────────────────────────
function renderPlayers() {
  if (players.length === 0) {
    el.playersList.innerHTML = '<div class="muted" style="padding:var(--space-4) 0; font-size:var(--text-sm);">Δεν έχεις βάλει ακόμα παίκτες. Βάλε τουλάχιστον δύο για να έχει νόημα το σκορ.</div>';
    el.tabBadgePlayers.textContent = 0;
    renderGameScoreboard();
    return;
  }
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'el'));
  el.playersList.innerHTML = sorted.map((player, index) => `
    <div class="player-row">
      <div>
        <div class="player-name">${index + 1}. ${player.name}</div>
      </div>
      <div class="score-badge">${player.score}</div>
      <div class="inline-actions" style="gap:.4rem; justify-content:flex-end;">
        <button class="mini-btn" type="button" data-player-action="plus" data-player-id="${player.id}">+1</button>
        <button class="mini-btn" type="button" data-player-action="minus" data-player-id="${player.id}">-1</button>
        <button class="mini-btn" type="button" data-player-action="remove" data-player-id="${player.id}">✕</button>
      </div>
    </div>
  `).join('');
  el.tabBadgePlayers.textContent = players.length;
  renderGameScoreboard();
}

function renderGameScoreboard() {
  if (players.length === 0) {
    el.gameScoreboardPanel.style.display = 'none';
    return;
  }
  el.gameScoreboardPanel.style.display = '';
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'el'));
  el.gameScoreboard.innerHTML = sorted.map((player, index) => `
    <div class="game-score-item">
      <span class="game-score-rank">${index + 1}.</span>
      <span class="game-score-name">${player.name}</span>
      <span class="game-score-badge">${player.score}</span>
      <div class="game-score-actions">
        <button class="mini-btn" type="button" data-player-action="plus" data-player-id="${player.id}">+1</button>
        <button class="mini-btn" type="button" data-player-action="minus" data-player-id="${player.id}">-1</button>
      </div>
    </div>
  `).join('');
}

function updateCounters() {
  el.roundCounter.textContent = round;
  el.questionCount.textContent = questions.length;
  el.modePill.textContent = el.modeSelect.value === 'random' ? 'τυχαία' : 'σειριακή';
}

// ── Timer ─────────────────────────────────────────
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerUI() {
  const width = currentDuration > 0 ? Math.max(0, (timeLeft / currentDuration) * 100) : 0;
  el.timerFill.style.width = `${width}%`;
}

function startTimer(duration) {
  stopTimer();
  currentDuration = duration;
  timeLeft = duration;
  updateTimerUI();
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      stopTimer();
    }
    updateTimerUI();
  }, 1000);
}

// ── Question selection ────────────────────────────
function getFilteredIndexes() {
  const category = el.categorySelect.value;
  return questions.map((item, index) => ({ item, index }))
    .filter(({ item }) => category === 'all' || item.category === category)
    .map(({ index }) => index);
}

function pickNextQuestionIndex() {
  const eligible = getFilteredIndexes();
  if (eligible.length === 0) return null;
  if (el.modeSelect.value === 'sequence') {
    const ordered = eligible.sort((a, b) => a - b);
    let found = ordered.find(idx => idx >= sequencePointer);
    if (found === undefined) {
      sequencePointer = 0;
      found = ordered[0];
    }
    sequencePointer = found + 1;
    return found;
  }
  let pool = eligible.filter(index => !usedQuestionIndexes.includes(index));
  if (pool.length === 0) {
    usedQuestionIndexes = [];
    pool = eligible;
  }
  const randomIndex = pool[Math.floor(Math.random() * pool.length)];
  usedQuestionIndexes.push(randomIndex);
  return randomIndex;
}

function updateGameControlsVisibility() {
  const hasQuestion = currentQuestionIndex !== null;
  el.startRoundBtn.style.display = hasQuestion ? 'none' : '';
  el.nextQuestionBtn.style.display = hasQuestion ? '' : 'none';
  el.revealBtn.style.display = (hasQuestion && !answerRevealed) ? '' : 'none';
}

function hideAnswerInstantly() {
  el.answerValue.classList.add('no-transition');
  el.answerValue.classList.remove('revealed');
  // Force reflow ώστε να εφαρμοστεί το blur χωρίς animation πριν αλλάξει κείμενο.
  void el.answerValue.offsetWidth;
  requestAnimationFrame(() => {
    el.answerValue.classList.remove('no-transition');
  });
}

function loadQuestion(index) {
  hideAnswerInstantly();

  if (index === null || !questions[index]) {
    el.questionNumber.textContent = 'Πάτα «Ας παίξουμε!» για να ξεκινήσεις';
    el.questionText.textContent = 'Δεν έχει φορτωθεί ακόμα ερώτηση.';
    el.categoryPill.textContent = '—';
    el.answerValue.textContent = '—';
    currentQuestionIndex = null;
    updateTimerUI();
    updateGameControlsVisibility();
    return;
  }
  const item = questions[index];
  currentQuestionIndex = index;
  answerRevealed = false;
  el.questionNumber.textContent = `Ερώτηση #${index + 1}`;
  el.questionText.textContent = item.question;
  el.categoryPill.textContent = item.category;
  el.answerValue.textContent = item.answer;
  updateGameControlsVisibility();
}

function startRound() {
  const duration = Number(el.timerSeconds.value);
  if (!Number.isFinite(duration) || duration < 5) {
    alert('Βάλε τουλάχιστον 5 δευτερόλεπτα για το timer.');
    return;
  }
  const nextIndex = pickNextQuestionIndex();
  loadQuestion(nextIndex);
  if (nextIndex === null) return;
  round += 1;
  updateCounters();
  startTimer(duration);
  saveSession();
}

function revealAnswer() {
  if (currentQuestionIndex === null || answerRevealed) return;
  answerRevealed = true;
  stopTimer();
  el.answerValue.classList.add('revealed');
  updateGameControlsVisibility();
}

// ── Players ───────────────────────────────────────
function addPlayer() {
  const name = el.playerName.value.trim();
  if (!name) return;
  players.push({ id: crypto.randomUUID(), name, score: 0 });
  el.playerName.value = '';
  renderPlayers();
  saveSession();
}

function adjustPlayerScore(id, delta) {
  players = players.map(player => player.id === id ? { ...player, score: Math.max(0, player.score + delta) } : player);
  renderPlayers();
  saveSession();
}

function removePlayer(id) {
  players = players.filter(player => player.id !== id);
  renderPlayers();
  saveSession();
}

function resetScores() {
  clearSession();
  players = players.map(player => ({ ...player, score: 0 }));
  renderPlayers();
}

// ── Question bank ─────────────────────────────────
function renderQuestionBank() {
  const term = el.searchInput.value.trim().toLowerCase();
  const matches = questions.filter(item => (`${item.category} ${item.question} ${item.answer}`).toLowerCase().includes(term));
  if (matches.length === 0) {
    el.questionsList.innerHTML = '<div class="muted">Δεν βρέθηκαν ερωτήσεις.</div>';
    return;
  }
  el.questionsList.innerHTML = matches.map((item, idx) => `
    <div class="answer-box">
      <div class="question-number">${idx + 1} · ${item.category}</div>
      <div style="font-weight:700; margin:.35rem 0 .5rem;">${item.question}</div>
      <div class="muted" style="font-size:var(--text-sm);">Απάντηση: ${item.answer}</div>
    </div>
  `).join('');
}

// ── JSON validation ───────────────────────────────
function validateImportedQuestions(data) {
  if (!Array.isArray(data) || data.length === 0) throw new Error('Το JSON πρέπει να είναι μη κενό array.');
  data.forEach((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Το στοιχείο ${index + 1} δεν είναι αντικείμενο.`);
    ['category', 'question', 'answer'].forEach(key => {
      if (typeof item[key] !== 'string' || item[key].trim() === '') throw new Error(`Το στοιχείο ${index + 1} θέλει έγκυρο πεδίο ${key}.`);
    });
  });
}

function restoreDefaults() {
  clearSession();
  questions = [...defaultQuestions];
  usedQuestionIndexes = [];
  sequencePointer = 0;
  currentQuestionIndex = null;
  round = 0;
  stopTimer();
  populateCategories();
  populateCreatorCategories();
  updateCounters();
  renderQuestionBank();
  loadQuestion(null);
  el.createImportStatus.textContent = 'Έγινε επαναφορά στο default σετ (50 ερωτήσεις).';
}

// ── Session ───────────────────────────────────────
const SESSION_KEY = 'quizGameSession';

function saveSession() {
  const isCustom = questions !== defaultQuestions;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      players,
      round,
      usedQuestionIndexes,
      sequencePointer,
      isCustomQuestions: isCustom,
      customQuestions: isCustom ? questions : null
    }));
  } catch (e) { /* quota/security — δεν κρασάρει το παιχνίδι */ }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw);
    if (!Array.isArray(p.players)) return false;
    for (const pl of p.players) {
      if (typeof pl.id !== 'string' || typeof pl.name !== 'string' || !pl.name.trim()) return false;
      pl.score = Math.max(0, Number(pl.score) || 0);
    }
    if (typeof p.round !== 'number' || p.round < 0) return false;
    if (!Array.isArray(p.usedQuestionIndexes)) return false;
    if (typeof p.sequencePointer !== 'number') return false;
    if (p.isCustomQuestions) {
      if (!Array.isArray(p.customQuestions)) return false;
      validateImportedQuestions(p.customQuestions);
      questions = p.customQuestions;
    }
    if (p.usedQuestionIndexes.some(i => i >= questions.length)) {
      p.usedQuestionIndexes = [];
      p.sequencePointer = 0;
    }
    players = p.players;
    round = p.round;
    usedQuestionIndexes = p.usedQuestionIndexes;
    sequencePointer = p.sequencePointer;
    return true;
  } catch (e) {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function showSessionBanner(playerCount, roundNumber) {
  const banner = document.createElement('div');
  banner.id = 'sessionRestoreBanner';
  banner.setAttribute('role', 'status');
  banner.innerHTML = `<span>Η συνεδρία αποκαταστάθηκε — ${playerCount} παίκτες, γύρος ${roundNumber}.</span><button type="button" id="sessionBannerClose" aria-label="Κλείσιμο">✕</button>`;
  banner.style.cssText = 'position:fixed;bottom:var(--space-4,1rem);left:50%;transform:translateX(-50%);z-index:9000;display:flex;align-items:center;gap:var(--space-3,.75rem);padding:.75rem 1rem;border-radius:var(--radius-lg,1rem);background:var(--color-primary);color:white;font-size:var(--text-sm,.875rem);font-weight:700;box-shadow:0 4px 20px rgba(0,0,0,.18);animation:tabFadeIn 200ms ease;max-width:calc(100vw - 2rem);';
  document.body.appendChild(banner);
  document.getElementById('sessionBannerClose').addEventListener('click', () => banner.remove());
  setTimeout(() => { if (banner.isConnected) banner.remove(); }, 5000);
}

function newGame() {
  if (!confirm('Ξεκίνα νέο παιχνίδι; Θα χαθεί το τρέχον σκορ.')) return;
  players = [];
  round = 0;
  usedQuestionIndexes = [];
  sequencePointer = 0;
  currentQuestionIndex = null;
  stopTimer();
  clearSession();
  renderPlayers();
  renderGameScoreboard();
  updateCounters();
  loadQuestion(null);
  updateTimerUI();
}

// ── Question creator ──────────────────────────────
function populateCreatorCategories() {
  const categories = [...new Set(questions.map(q => q.category))].sort((a, b) => a.localeCompare(b, 'el'));
  el.categoryCheckboxesContainer.innerHTML = categories.map(cat => `
    <label class="category-checkbox-label">
      <input type="checkbox" value="${cat}" checked />
      ${cat}
    </label>
  `).join('');
}

function getCheckedCategories() {
  return [...el.categoryCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked')]
    .map(cb => cb.value);
}

function generateAIPrompt() {
  const categories = getCheckedCategories();
  const count = parseInt(el.createQuestionCount.value, 10) || 20;
  if (categories.length === 0) {
    el.createImportStatus.textContent = 'Επίλεξε τουλάχιστον μία κατηγορία.';
    return;
  }
  el.createImportStatus.textContent = '';
  const categoryList = categories.map(c => `"${c}"`).join(', ');
  const prompt = `Δημιούργησε ${count} ερωτήσεις τύπου "closest answer" στα Ελληνικά.

Ο παίκτης πρέπει να μαντέψει έναν αριθμό ή ποσότητα — κερδίζει όποιος απαντήσει πιο κοντά.

Κατηγορίες που θέλω: ${categoryList}

Κανόνες:
- Κάθε ερώτηση να έχει αριθμητική ή εκτιμητική απάντηση
- Οι ερωτήσεις να είναι ενδιαφέρουσες και κατάλληλες για παρέα ή τάξη
- Μοιράσε τις ερωτήσεις ισόποσα ανάμεσα στις κατηγορίες
- Σύντομη απάντηση (π.χ. "≈ 150 km", "42", "≈ 3.000 χρόνια")

Επέστρεψε ΜΟΝΟ ένα JSON array χωρίς επεξήγηση και χωρίς markdown, με αυτή τη μορφή:
[
  {
    "category": "Κατηγορία",
    "question": "Κείμενο ερώτησης;",
    "answer": "Απάντηση"
  }
]`;
  el.promptOutput.value = prompt;
  el.promptSection.style.display = 'block';
}

function copyPrompt() {
  if (!el.promptOutput.value) return;
  const original = el.copyPromptBtn.textContent;
  navigator.clipboard.writeText(el.promptOutput.value).then(() => {
    el.copyPromptBtn.textContent = '✓ Αντιγράφηκε!';
    setTimeout(() => { el.copyPromptBtn.textContent = original; }, 2000);
  }).catch(() => {
    el.promptOutput.select();
    document.execCommand('copy');
  });
}

function loadCreatedQuestions() {
  const raw = el.createJsonInput.value.trim();
  if (!raw) {
    el.createImportStatus.textContent = 'Δεν έβαλες JSON.';
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    validateImportedQuestions(parsed);
    questions = parsed.map(item => ({
      category: item.category.trim(),
      question: item.question.trim(),
      answer: item.answer.trim()
    }));
    usedQuestionIndexes = [];
    sequencePointer = 0;
    currentQuestionIndex = null;
    round = 0;
    stopTimer();
    populateCategories();
    populateCreatorCategories();
    updateCounters();
    renderQuestionBank();
    loadQuestion(null);
    el.createImportStatus.textContent = `✓ Φορτώθηκαν ${questions.length} ερωτήσεις. Πήγαινε στην καρτέλα Παιχνίδι!`;
    saveSession();
  } catch (error) {
    el.createImportStatus.textContent = `Σφάλμα JSON: ${error.message}`;
  }
}

// ── Event listeners ───────────────────────────────
el.themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
});

el.tabTriggers.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tabTrigger));
});

el.addPlayerBtn.addEventListener('click', addPlayer);
el.playerName.addEventListener('keydown', event => { if (event.key === 'Enter') addPlayer(); });
el.resetScoresBtn.addEventListener('click', resetScores);
el.newGameBtn.addEventListener('click', newGame);

el.startRoundBtn.addEventListener('click', startRound);
el.nextQuestionBtn.addEventListener('click', startRound);
el.revealBtn.addEventListener('click', revealAnswer);

el.searchInput.addEventListener('input', renderQuestionBank);
el.modeSelect.addEventListener('change', updateCounters);

el.playersList.addEventListener('click', event => {
  const button = event.target.closest('[data-player-action]');
  if (!button) return;
  const { playerAction, playerId } = button.dataset;
  if (playerAction === 'plus') adjustPlayerScore(playerId, 1);
  if (playerAction === 'minus') adjustPlayerScore(playerId, -1);
  if (playerAction === 'remove') removePlayer(playerId);
});

el.gameScoreboard.addEventListener('click', event => {
  const button = event.target.closest('[data-player-action]');
  if (!button) return;
  const { playerAction, playerId } = button.dataset;
  if (playerAction === 'plus') adjustPlayerScore(playerId, 1);
  if (playerAction === 'minus') adjustPlayerScore(playerId, -1);
});

el.newGameInlineBtn.addEventListener('click', newGame);

el.generatePromptBtn.addEventListener('click', generateAIPrompt);
el.copyPromptBtn.addEventListener('click', copyPrompt);
el.loadCreatedQuestionsBtn.addEventListener('click', loadCreatedQuestions);
el.restoreDefaultBtn.addEventListener('click', restoreDefaults);

// ── Init ──────────────────────────────────────────
applyTheme();
const sessionRestored = loadSession();
populateCategories();
populateCreatorCategories();
updateCounters();
renderPlayers();
renderGameScoreboard();
renderQuestionBank();
loadQuestion(null);
updateTimerUI();
switchTab('game');
if (sessionRestored) showSessionBanner(players.length, round);
