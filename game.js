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
  playersList: document.getElementById('playersList'),
  playerName: document.getElementById('playerName'),
  addPlayerBtn: document.getElementById('addPlayerBtn'),
  resetScoresBtn: document.getElementById('resetScoresBtn'),
  timerSeconds: document.getElementById('timerSeconds'),
  categorySelect: document.getElementById('categorySelect'),
  modeSelect: document.getElementById('modeSelect'),
  startRoundBtn: document.getElementById('startRoundBtn'),
  revealBtn: document.getElementById('revealBtn'),
  stopTimerBtn: document.getElementById('stopTimerBtn'),
  nextQuestionBtn: document.getElementById('nextQuestionBtn'),
  roundCounter: document.getElementById('roundCounter'),
  timeDisplay: document.getElementById('timeDisplay'),
  questionCount: document.getElementById('questionCount'),
  questionNumber: document.getElementById('questionNumber'),
  questionText: document.getElementById('questionText'),
  categoryPill: document.getElementById('categoryPill'),
  modePill: document.getElementById('modePill'),
  timerFill: document.getElementById('timerFill'),
  timerMessage: document.getElementById('timerMessage'),
  roundNote: document.getElementById('roundNote'),
  answerValue: document.getElementById('answerValue'),
  toggleAnswerBtn: document.getElementById('toggleAnswerBtn'),
  markRoundDoneBtn: document.getElementById('markRoundDoneBtn'),
  searchInput: document.getElementById('searchInput'),
  questionsList: document.getElementById('questionsList'),
  jsonInput: document.getElementById('jsonInput'),
  importJsonBtn: document.getElementById('importJsonBtn'),
  restoreDefaultBtn: document.getElementById('restoreDefaultBtn'),
  importStatus: document.getElementById('importStatus'),
  themeToggle: document.querySelector('[data-theme-toggle]')
};

const html = document.documentElement;
let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function applyTheme() {
  html.setAttribute('data-theme', theme);
  el.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  el.themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Άλλαξε σε φωτεινό θέμα' : 'Άλλαξε σε σκοτεινό θέμα');
}

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

function renderPlayers() {
  if (players.length === 0) {
    el.playersList.innerHTML = '<div class="muted">Δεν έχεις βάλει ακόμα παίκτες. Βάλε τουλάχιστον δύο για να έχει νόημα το σκορ.</div>';
    return;
  }
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'el'));
  el.playersList.innerHTML = sorted.map((player, index) => `
    <div class="player-row">
      <div>
        <div class="player-name">${index + 1}. ${player.name}</div>
        <div class="muted" style="font-size: var(--text-xs);">host δίνει τον πόντο χειροκίνητα</div>
      </div>
      <div class="score-badge">${player.score}</div>
      <div class="inline-actions" style="gap: .4rem; justify-content:flex-end;">
        <button class="mini-btn" type="button" data-player-action="plus" data-player-id="${player.id}">+1</button>
        <button class="mini-btn" type="button" data-player-action="minus" data-player-id="${player.id}">-1</button>
        <button class="mini-btn" type="button" data-player-action="remove" data-player-id="${player.id}">✕</button>
      </div>
    </div>
  `).join('');
}

function updateCounters() {
  el.roundCounter.textContent = round;
  el.questionCount.textContent = questions.length;
  el.modePill.textContent = el.modeSelect.value === 'random' ? 'τυχαία ερώτηση' : 'σειριακή ροή';
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerUI() {
  el.timeDisplay.textContent = currentQuestionIndex === null ? '--' : `${timeLeft}s`;
  const width = currentDuration > 0 ? Math.max(0, (timeLeft / currentDuration) * 100) : 0;
  el.timerFill.style.width = `${width}%`;
  if (currentQuestionIndex === null) {
    el.timerMessage.textContent = 'Το timer θα ξεκινήσει με τον επόμενο γύρο.';
  } else if (timeLeft > 10) {
    el.timerMessage.textContent = 'Ο γύρος τρέχει κανονικά.';
  } else if (timeLeft > 0) {
    el.timerMessage.textContent = 'Τελευταία δευτερόλεπτα — κλείσε απαντήσεις.';
  } else {
    el.timerMessage.textContent = 'Ο χρόνος έληξε. Τώρα δείξε τη σωστή απάντηση και δώσε πόντο.';
  }
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

function loadQuestion(index) {
  if (index === null || !questions[index]) {
    el.questionNumber.textContent = 'Δεν βρέθηκε ερώτηση';
    el.questionText.textContent = 'Άλλαξε κατηγορία ή φόρτωσε νέο σετ ερωτήσεων.';
    el.categoryPill.textContent = '—';
    el.answerValue.textContent = '—';
    el.answerValue.classList.remove('revealed');
    currentQuestionIndex = null;
    updateTimerUI();
    return;
  }
  const item = questions[index];
  currentQuestionIndex = index;
  answerRevealed = false;
  el.questionNumber.textContent = `Ερώτηση #${index + 1}`;
  el.questionText.textContent = item.question;
  el.categoryPill.textContent = item.category;
  el.answerValue.textContent = item.answer;
  el.answerValue.classList.remove('revealed');
  el.roundNote.textContent = 'Οι παίκτες γράφουν τώρα απάντηση. Όταν τελειώσει ο χρόνος, πατάς εμφάνιση απάντησης και μετά απονέμεις πόντο στο scoreboard.';
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
}

function toggleAnswer() {
  if (currentQuestionIndex === null) return;
  answerRevealed = !answerRevealed;
  el.answerValue.classList.toggle('revealed', answerRevealed);
}

function closeRound() {
  stopTimer();
  el.roundNote.textContent = 'Ο γύρος έκλεισε. Αν θέλεις, δώσε πόντο στον νικητή και μετά πάτα επόμενη ερώτηση.';
  updateTimerUI();
}

function addPlayer() {
  const name = el.playerName.value.trim();
  if (!name) return;
  players.push({ id: crypto.randomUUID(), name, score: 0 });
  el.playerName.value = '';
  renderPlayers();
}

function adjustPlayerScore(id, delta) {
  players = players.map(player => player.id === id ? { ...player, score: Math.max(0, player.score + delta) } : player);
  renderPlayers();
}

function removePlayer(id) {
  players = players.filter(player => player.id !== id);
  renderPlayers();
}

function resetScores() {
  players = players.map(player => ({ ...player, score: 0 }));
  renderPlayers();
}

function renderQuestionBank() {
  const term = el.searchInput.value.trim().toLowerCase();
  const matches = questions.filter(item => (`${item.category} ${item.question} ${item.answer}`).toLowerCase().includes(term));
  if (matches.length === 0) {
    el.questionsList.innerHTML = '<div class="muted">Δεν βρέθηκαν ερωτήσεις.</div>';
    return;
  }
  el.questionsList.innerHTML = matches.map((item, idx) => `
    <div class="answer-box">
      <div class="question-number">${idx + 1} • ${item.category}</div>
      <div style="font-weight:700; margin:.35rem 0 .5rem;">${item.question}</div>
      <div class="muted">Απάντηση: ${item.answer}</div>
    </div>
  `).join('');
}

function validateImportedQuestions(data) {
  if (!Array.isArray(data) || data.length === 0) throw new Error('Το JSON πρέπει να είναι μη κενό array.');
  data.forEach((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Το στοιχείο ${index + 1} δεν είναι αντικείμενο.`);
    ['category', 'question', 'answer'].forEach(key => {
      if (typeof item[key] !== 'string' || item[key].trim() === '') throw new Error(`Το στοιχείο ${index + 1} θέλει έγκυρο πεδίο ${key}.`);
    });
  });
}

function importJson() {
  const raw = el.jsonInput.value.trim();
  if (!raw) {
    el.importStatus.textContent = 'Δεν έβαλες JSON.';
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    validateImportedQuestions(parsed);
    questions = parsed.map(item => ({ category: item.category.trim(), question: item.question.trim(), answer: item.answer.trim() }));
    usedQuestionIndexes = [];
    sequencePointer = 0;
    currentQuestionIndex = null;
    round = 0;
    stopTimer();
    populateCategories();
    updateCounters();
    renderQuestionBank();
    loadQuestion(null);
    el.importStatus.textContent = `Φορτώθηκαν ${questions.length} ερωτήσεις από JSON.`;
  } catch (error) {
    el.importStatus.textContent = `Σφάλμα JSON: ${error.message}`;
  }
}

function restoreDefaults() {
  questions = [...defaultQuestions];
  usedQuestionIndexes = [];
  sequencePointer = 0;
  currentQuestionIndex = null;
  round = 0;
  stopTimer();
  populateCategories();
  updateCounters();
  renderQuestionBank();
  loadQuestion(null);
  el.importStatus.textContent = 'Έγινε επαναφορά στο default σετ.';
}

el.themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
});
el.addPlayerBtn.addEventListener('click', addPlayer);
el.playerName.addEventListener('keydown', event => { if (event.key === 'Enter') addPlayer(); });
el.resetScoresBtn.addEventListener('click', resetScores);
el.startRoundBtn.addEventListener('click', startRound);
el.nextQuestionBtn.addEventListener('click', startRound);
el.revealBtn.addEventListener('click', toggleAnswer);
el.toggleAnswerBtn.addEventListener('click', toggleAnswer);
el.stopTimerBtn.addEventListener('click', stopTimer);
el.markRoundDoneBtn.addEventListener('click', closeRound);
el.searchInput.addEventListener('input', renderQuestionBank);
el.importJsonBtn.addEventListener('click', importJson);
el.restoreDefaultBtn.addEventListener('click', restoreDefaults);
el.modeSelect.addEventListener('change', updateCounters);

el.playersList.addEventListener('click', event => {
  const button = event.target.closest('[data-player-action]');
  if (!button) return;
  const { playerAction, playerId } = button.dataset;
  if (playerAction === 'plus') adjustPlayerScore(playerId, 1);
  if (playerAction === 'minus') adjustPlayerScore(playerId, -1);
  if (playerAction === 'remove') removePlayer(playerId);
});

applyTheme();
populateCategories();
updateCounters();
renderPlayers();
renderQuestionBank();
loadQuestion(null);
updateTimerUI();
