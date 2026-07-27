/* ======================================================================
   ROUTINEX — Daily Activity Tracker
   Vanilla JS. All state lives in localStorage. No frameworks.
   ====================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------
     CONSTANTS
     --------------------------------------------------------------- */
  const CATEGORIES = [
    { name: 'Study',     var: '--cat-study'     },
    { name: 'College',   var: '--cat-college'   },
    { name: 'Gym',       var: '--cat-gym'       },
    { name: 'Badminton', var: '--cat-badminton' },
    { name: 'Coding',    var: '--cat-coding'    },
    { name: 'DSA',       var: '--cat-dsa'       },
    { name: 'Reading',   var: '--cat-reading'   },
    { name: 'Personal',  var: '--cat-personal'  },
    { name: 'Health',    var: '--cat-health'    },
    { name: 'Sleep',     var: '--cat-sleep'     },
  ];

  const ACCENTS = ['#6c8eff', '#ff6b6b', '#3ddc97', '#ffb454', '#a78bfa', '#38bdf8'];

  const QUOTES = [
    "Small steps, done daily, outrun giant leaps done rarely.",
    "Discipline is choosing what you want most over what you want now.",
    "The plan doesn't have to be perfect. It just has to start.",
    "You don't rise to the level of your goals, you fall to the level of your systems.",
    "Progress is a series of ordinary days stacked on top of each other.",
    "Energy flows where attention goes.",
    "One focused hour beats four distracted ones.",
    "Consistency turns effort into identity.",
    "The best time to start was earlier. The next best time is now.",
    "Momentum is built quietly, one checkbox at a time.",
    "Rest is part of the routine, not a break from it.",
    "Small wins compound faster than big plans.",
    "Your future is built in the margins of an ordinary Tuesday.",
    "Show up even when the motivation doesn't.",
    "Clarity comes from action, not thought.",
    "A tidy schedule is a quiet mind.",
    "Do the hard task first — everything after feels lighter.",
    "Track it, and it improves. Ignore it, and it drifts.",
    "Habits are the compound interest of self-improvement.",
    "You are one plan away from a very different week.",
    "Focus is a muscle — today is a rep.",
    "What gets scheduled gets done.",
    "Small disciplines repeated daily lead to great achievements.",
    "The days are long, but the years are short — make today count.",
    "Every checked box is a promise kept to yourself.",
    "Don't count the days, make the days count.",
    "Slow progress is still progress.",
    "Structure creates freedom.",
    "Your only competition is who you were yesterday.",
    "Start before you're ready.",
    "Finish what you start, then start something better.",
    "A calm plan beats a rushed scramble.",
    "Growth is uncomfortable by design — lean in.",
    "Today's routine is tomorrow's result.",
    "Keep the streak alive — momentum is a gift you give yourself.",
  ];

  const ROUTINE_TEMPLATE = [
    { time: '06:00', name: 'Wake Up',           category: 'Personal', priority: 'Medium' },
    { time: '06:30', name: 'Exercise',          category: 'Gym',      priority: 'High'   },
    { time: '07:30', name: 'Breakfast',         category: 'Health',   priority: 'Medium' },
    { time: '09:00', name: 'College',           category: 'College',  priority: 'High'   },
    { time: '17:00', name: 'Badminton',         category: 'Badminton',priority: 'Medium' },
    { time: '19:30', name: 'DSA Practice',      category: 'DSA',      priority: 'High'   },
    { time: '21:00', name: 'Julia Programming', category: 'Coding',   priority: 'Medium' },
    { time: '22:30', name: 'Sleep',             category: 'Sleep',    priority: 'High'   },
  ];

  const LS_KEYS = {
    tasks: 'routinex_tasks',
    settings: 'routinex_settings',
    notes: 'routinex_notes',
    reminders: 'routinex_reminders',
    streak: 'routinex_streak',
    seeded: 'routinex_seeded_dates',
  };

  /* ---------------------------------------------------------------
     STATE
     --------------------------------------------------------------- */
  let tasks = loadJSON(LS_KEYS.tasks, []);
  let settings = loadJSON(LS_KEYS.settings, { theme: 'dark', accent: ACCENTS[0], fontSize: 15 });
  let notesStore = loadJSON(LS_KEYS.notes, {});
  let reminders = loadJSON(LS_KEYS.reminders, []);
  let streakData = loadJSON(LS_KEYS.streak, { count: 0, lastDate: null });
  let seededDates = loadJSON(LS_KEYS.seeded, []);

  let calendarViewDate = new Date();          // month currently shown in calendar
  let calendarSelectedDate = todayStr();      // date selected in calendar detail panel
  let charts = {};                             // Chart.js instances

  /* ---------------------------------------------------------------
     HELPERS
     --------------------------------------------------------------- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  let storageWarned = false;
  function saveJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      // Storage can fail (private/incognito mode, quota exceeded, browser
      // privacy settings, some file:// contexts). Never let that stop the
      // UI from updating — the app keeps working in-memory for the session.
      console.warn('Routinex: could not save to localStorage', e);
      if (!storageWarned) {
        storageWarned = true;
        setTimeout(() => showToast('Storage is unavailable — changes won\'t be saved after you close this tab.', 'warn', 'fa-triangle-exclamation'), 300);
      }
    }
  }
  function saveTasks() { saveJSON(LS_KEYS.tasks, tasks); }
  function saveSettings() { saveJSON(LS_KEYS.settings, settings); }
  function saveReminders() { saveJSON(LS_KEYS.reminders, reminders); }
  function saveStreak() { saveJSON(LS_KEYS.streak, streakData); }

  function todayStr(d = new Date()) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function catVar(catName) {
    const c = CATEGORIES.find(c => c.name === catName);
    return c ? `var(${c.var})` : 'var(--text-3)';
  }
  function dayOfYear(d = new Date()) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / 86400000);
  }
  function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  function formatTime12(t) {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }

  function showToast(msg, type = 'info', icon = 'fa-circle-info') {
    const stack = document.getElementById('toastStack');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  /* ---------------------------------------------------------------
     SEEDING — preload routine template for a date if not already seeded
     --------------------------------------------------------------- */
  function seedRoutineFor(dateStr) {
    if (seededDates.includes(dateStr)) return;
    ROUTINE_TEMPLATE.forEach(item => {
      tasks.push({
        id: uid(),
        name: item.name,
        time: item.time,
        date: dateStr,
        category: item.category,
        priority: item.priority,
        completed: false,
        createdAt: Date.now(),
      });
    });
    seededDates.push(dateStr);
    saveJSON(LS_KEYS.seeded, seededDates);
    saveTasks();
  }

  /* ---------------------------------------------------------------
     THEME / SETTINGS
     --------------------------------------------------------------- */
  function applySettings() {
    document.body.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--font-scale', settings.fontSize + 'px');
    const [r, g, b] = hexToRgb(settings.accent);
    document.documentElement.style.setProperty('--accent', settings.accent);
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);

    // Update theme toggle icons state (handled purely by CSS via data-theme)
    document.querySelectorAll('.theme-toggle i.fa-moon').forEach(i => {});
    document.getElementById('mobileThemeBtn').innerHTML =
      settings.theme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  }
  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toggleTheme() {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings();
    applySettings();
  }

  function renderAccentSwatches() {
    const wrap = document.getElementById('accentSwatches');
    wrap.innerHTML = '';
    ACCENTS.forEach(hex => {
      const sw = document.createElement('div');
      sw.className = 'swatch' + (hex === settings.accent ? ' active' : '');
      sw.style.background = hex;
      sw.addEventListener('click', () => {
        settings.accent = hex;
        saveSettings();
        applySettings();
        renderAccentSwatches();
        renderAll(); // ring color etc depends on accent
      });
      wrap.appendChild(sw);
    });
  }

  /* ---------------------------------------------------------------
     NAVIGATION
     --------------------------------------------------------------- */
  function goToPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    closeSidebarMobile();
    if (page === 'stats') renderCharts();
    if (page === 'calendar') renderCalendar();
  }

  function closeSidebarMobile() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarScrim').classList.remove('show');
  }

  /* ---------------------------------------------------------------
     DASHBOARD
     --------------------------------------------------------------- */
  function renderClockAndDate() {
    const now = new Date();
    document.getElementById('dashDate').textContent = now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    document.getElementById('liveClock').textContent = now.toLocaleTimeString();

    const h = now.getHours();
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Working late?';
    document.getElementById('welcomeMsg').textContent = `${greeting} 👋`;

    document.getElementById('dailyQuote').textContent = QUOTES[dayOfYear(now) % QUOTES.length];
  }

  function computeStreak() {
    const today = todayStr();
    const todaysTasks = tasks.filter(t => t.date === today);
    const allDoneToday = todaysTasks.length > 0 && todaysTasks.every(t => t.completed);

    if (allDoneToday && streakData.lastDate !== today) {
      const yesterday = todayStr(new Date(Date.now() - 86400000));
      streakData.count = (streakData.lastDate === yesterday) ? streakData.count + 1 : 1;
      streakData.lastDate = today;
      saveStreak();
    }
    return streakData.count;
  }

  function renderDashboard() {
    const today = todayStr();
    const todaysTasks = tasks.filter(t => t.date === today);
    const completed = todaysTasks.filter(t => t.completed).length;
    const pending = todaysTasks.length - completed;
    const pct = todaysTasks.length ? Math.round((completed / todaysTasks.length) * 100) : 0;

    // ring
    const circumference = 2 * Math.PI * 86;
    const ring = document.getElementById('ringFill');
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    document.getElementById('ringPercent').textContent = `${pct}%`;
    document.getElementById('legendDone').textContent = completed;
    document.getElementById('legendPending').textContent = pending;

    document.getElementById('statTotal').textContent = todaysTasks.length;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statPercent').textContent = `${pct}%`;

    const streak = computeStreak();
    document.getElementById('statStreak').textContent = streak;
    document.getElementById('sidebarStreak').textContent = streak;

    // productivity score: completion% weighted + bonus for high-priority completions, capped 100
    const highDone = todaysTasks.filter(t => t.priority === 'High' && t.completed).length;
    const highTotal = todaysTasks.filter(t => t.priority === 'High').length;
    const highBonus = highTotal ? (highDone / highTotal) * 20 : 0;
    const score = Math.min(100, Math.round(pct * 0.8 + highBonus));
    document.getElementById('statProductivity').textContent = score;

    // upcoming list: pending tasks today, sorted by time
    const upcoming = todaysTasks.filter(t => !t.completed).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const list = document.getElementById('upcomingList');
    list.innerHTML = '';
    if (!upcoming.length) {
      list.innerHTML = `<p class="empty-state"><i class="fa-regular fa-circle-check"></i>All caught up for today.</p>`;
    } else {
      upcoming.slice(0, 8).forEach(t => {
        const row = document.createElement('div');
        row.className = 'upcoming-item';
        row.innerHTML = `
          <span class="time">${formatTime12(t.time)}</span>
          <span class="cat-dot" style="background:${catVar(t.category)}"></span>
          <span>${escapeHtml(t.name)}</span>
        `;
        list.appendChild(row);
      });
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------------------------------------------------------
     TASK TABLE (Today's Tasks page)
     --------------------------------------------------------------- */
  function populateCategoryFilters() {
    const filterSel = document.getElementById('filterCategory');
    const taskSel = document.getElementById('taskCategory');
    filterSel.innerHTML = '<option value="all">All categories</option>';
    taskSel.innerHTML = '';
    CATEGORIES.forEach(c => {
      filterSel.insertAdjacentHTML('beforeend', `<option value="${c.name}">${c.name}</option>`);
      taskSel.insertAdjacentHTML('beforeend', `<option value="${c.name}">${c.name}</option>`);
    });
  }

  function getFilteredTodayTasks() {
    const today = todayStr();
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const catF = document.getElementById('filterCategory').value;
    const priF = document.getElementById('filterPriority').value;
    const statF = document.getElementById('filterStatus').value;

    let list = tasks.filter(t => t.date === today);
    if (search) list = list.filter(t => t.name.toLowerCase().includes(search));
    if (catF !== 'all') list = list.filter(t => t.category === catF);
    if (priF !== 'all') list = list.filter(t => t.priority === priF);
    if (statF === 'completed') list = list.filter(t => t.completed);
    if (statF === 'pending') list = list.filter(t => !t.completed);

    // sort by time, completed tasks pushed to bottom
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
    return list;
  }

  function renderTaskTable() {
    const tbody = document.getElementById('taskTableBody');
    const list = getFilteredTodayTasks();
    tbody.innerHTML = '';
    document.getElementById('taskEmptyState').style.display = list.length ? 'none' : 'block';

    list.forEach(t => {
      const tr = document.createElement('tr');
      tr.dataset.id = t.id;
      tr.innerHTML = `
        <td>${formatTime12(t.time)}</td>
        <td><span class="activity-name ${t.completed ? 'done' : ''}">${escapeHtml(t.name)}</span></td>
        <td><span class="cat-badge" style="background:color-mix(in srgb, ${catVar(t.category)} 18%, transparent); color:${catVar(t.category)}"><span class="cat-dot" style="background:${catVar(t.category)}"></span>${t.category}</span></td>
        <td><span class="pri-badge ${t.priority}">${t.priority}</span></td>
        <td>
          <button class="status-toggle ${t.completed ? 'completed' : 'pending'}" data-action="toggle" data-id="${t.id}">
            <i class="fa-solid ${t.completed ? 'fa-circle-check' : 'fa-circle-dot'}"></i> ${t.completed ? 'Done' : 'Pending'}
          </button>
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="edit" data-id="${t.id}" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn delete-btn" data-action="delete" data-id="${t.id}" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function toggleComplete(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.completed = !t.completed;
    saveTasks();
    renderAll();
    showToast(t.completed ? 'Marked as completed' : 'Marked as pending', t.completed ? 'success' : 'info', t.completed ? 'fa-circle-check' : 'fa-rotate-left');
  }

  function deleteTask(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const finish = () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderAll();
      showToast('Activity deleted', 'warn', 'fa-trash');
    };
    if (row) {
      row.classList.add('removing');
      setTimeout(finish, 280);
    } else finish();
  }

  /* ---------------------------------------------------------------
     TASK MODAL (Add / Edit)
     --------------------------------------------------------------- */
  function openModal(taskId = null) {
    const overlay = document.getElementById('taskModalOverlay');
    const form = document.getElementById('taskForm');
    form.reset();
    if (taskId) {
      const t = tasks.find(x => x.id === taskId);
      document.getElementById('modalTitle').textContent = 'Edit activity';
      document.getElementById('taskFormSubmit').textContent = 'Save changes';
      document.getElementById('taskId').value = t.id;
      document.getElementById('taskName').value = t.name;
      document.getElementById('taskTime').value = t.time;
      document.getElementById('taskDate').value = t.date;
      document.getElementById('taskCategory').value = t.category;
      document.getElementById('taskPriority').value = t.priority;
    } else {
      document.getElementById('modalTitle').textContent = 'Add activity';
      document.getElementById('taskFormSubmit').textContent = 'Add activity';
      document.getElementById('taskId').value = '';
      document.getElementById('taskDate').value = calendarSelectedDate || todayStr();
      document.getElementById('taskTime').value = '09:00';
    }
    overlay.classList.add('open');
  }
  function closeModal() {
    document.getElementById('taskModalOverlay').classList.remove('open');
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const payload = {
      name: document.getElementById('taskName').value.trim(),
      time: document.getElementById('taskTime').value,
      date: document.getElementById('taskDate').value,
      category: document.getElementById('taskCategory').value,
      priority: document.getElementById('taskPriority').value,
    };
    if (!payload.name) return;

    if (id) {
      const t = tasks.find(x => x.id === id);
      Object.assign(t, payload);
      showToast('Activity updated', 'success', 'fa-pen');
    } else {
      tasks.push({ id: uid(), completed: false, createdAt: Date.now(), ...payload });
      showToast('Activity added', 'success', 'fa-plus');
    }
    saveTasks();
    closeModal();
    renderAll();
  }

  /* ---------------------------------------------------------------
     CALENDAR
     --------------------------------------------------------------- */
  function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    document.getElementById('calMonthLabel').textContent =
      calendarViewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayStr();

    for (let i = 0; i < firstDay; i++) {
      grid.insertAdjacentHTML('beforeend', `<div class="cal-day empty"></div>`);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = todayStr(dateObj);
      const dayTasks = tasks.filter(t => t.date === dateStr);
      const cats = [...new Set(dayTasks.map(t => t.category))].slice(0, 4);
      const dotHtml = cats.map(c => `<span style="background:${catVar(c)}"></span>`).join('');

      const cell = document.createElement('div');
      cell.className = 'cal-day' + (dateStr === today ? ' today' : '') + (dateStr === calendarSelectedDate ? ' selected' : '');
      cell.innerHTML = `<span>${d}</span><span class="dots">${dotHtml}</span>`;
      cell.addEventListener('click', () => {
        calendarSelectedDate = dateStr;
        renderCalendar();
        renderCalendarDetail();
      });
      grid.appendChild(cell);
    }
  }

  function renderCalendarDetail() {
    const label = document.getElementById('calSelectedDate');
    const list = document.getElementById('calTaskList');
    if (!calendarSelectedDate) {
      label.textContent = 'Select a date';
      list.innerHTML = '';
      return;
    }
    const d = new Date(calendarSelectedDate + 'T00:00:00');
    label.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    const dayTasks = tasks.filter(t => t.date === calendarSelectedDate).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    list.innerHTML = '';
    if (!dayTasks.length) {
      list.innerHTML = `<p class="empty-state"><i class="fa-regular fa-calendar"></i>No activities planned for this day.</p>`;
      return;
    }
    dayTasks.forEach(t => {
      const row = document.createElement('div');
      row.className = 'upcoming-item';
      row.innerHTML = `
        <span class="time">${formatTime12(t.time)}</span>
        <span class="cat-dot" style="background:${catVar(t.category)}"></span>
        <span class="${t.completed ? 'activity-name done' : ''}" style="flex:1">${escapeHtml(t.name)}</span>
        <span class="pri-badge ${t.priority}">${t.priority}</span>
      `;
      list.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------
     STATISTICS / CHARTS
     --------------------------------------------------------------- */
  function chartTheme() {
    const styles = getComputedStyle(document.body);
    const rootStyles = getComputedStyle(document.documentElement);
    return {
      text: styles.getPropertyValue('--text-2').trim(),
      grid: styles.getPropertyValue('--track-bg').trim(),
      accent: rootStyles.getPropertyValue('--accent').trim(),
      accentRgb: rootStyles.getPropertyValue('--accent-rgb').trim(),
    };
  }

  function renderCharts() {
    const theme = chartTheme();
    Chart.defaults.color = theme.text;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // ---- Weekly completion (last 7 days) ----
    const weekLabels = [], weekData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const ds = todayStr(d);
      const dayTasks = tasks.filter(t => t.date === ds);
      const pct = dayTasks.length ? Math.round((dayTasks.filter(t => t.completed).length / dayTasks.length) * 100) : 0;
      weekLabels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
      weekData.push(pct);
    }
    renderChart('chartWeekly', 'bar', {
      labels: weekLabels,
      datasets: [{ label: 'Completion %', data: weekData, backgroundColor: theme.accent, borderRadius: 8, maxBarThickness: 34 }],
    }, { scales: { y: { beginAtZero: true, max: 100, grid: { color: theme.grid } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } });

    // ---- Monthly completion (this month, by day) ----
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthLabels = [], monthData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = todayStr(new Date(now.getFullYear(), now.getMonth(), d));
      const dayTasks = tasks.filter(t => t.date === ds);
      monthLabels.push(d);
      monthData.push(dayTasks.length ? Math.round((dayTasks.filter(t => t.completed).length / dayTasks.length) * 100) : 0);
    }
    renderChart('chartMonthly', 'line', {
      labels: monthLabels,
      datasets: [{
        label: 'Completion %', data: monthData, borderColor: theme.accent,
        backgroundColor: `rgba(${theme.accentRgb},0.15)`, tension: 0.35, fill: true, pointRadius: 2,
      }],
    }, { scales: { y: { beginAtZero: true, max: 100, grid: { color: theme.grid } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } });

    // ---- Category distribution (all-time) ----
    const catCounts = CATEGORIES.map(c => tasks.filter(t => t.category === c.name).length);
    const catColors = CATEGORIES.map(c => getComputedStyle(document.documentElement).getPropertyValue(c.var).trim());
    renderChart('chartCategory', 'doughnut', {
      labels: CATEGORIES.map(c => c.name),
      datasets: [{ data: catCounts, backgroundColor: catColors, borderWidth: 0 }],
    }, { plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } });

    // ---- Productivity trend (last 14 days) ----
    const prodLabels = [], prodData = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const ds = todayStr(d);
      const dayTasks = tasks.filter(t => t.date === ds);
      const pct = dayTasks.length ? (dayTasks.filter(t => t.completed).length / dayTasks.length) * 100 : 0;
      const highTotal = dayTasks.filter(t => t.priority === 'High').length;
      const highDone = dayTasks.filter(t => t.priority === 'High' && t.completed).length;
      const bonus = highTotal ? (highDone / highTotal) * 20 : 0;
      prodLabels.push(d.getDate());
      prodData.push(Math.round(Math.min(100, pct * 0.8 + bonus)));
    }
    renderChart('chartProductivity', 'line', {
      labels: prodLabels,
      datasets: [{
        label: 'Score', data: prodData, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.15)',
        tension: 0.35, fill: true, pointRadius: 2,
      }],
    }, { scales: { y: { beginAtZero: true, max: 100, grid: { color: theme.grid } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } });
  }

  function renderChart(canvasId, type, data, options) {
    if (charts[canvasId]) charts[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    charts[canvasId] = new Chart(ctx, { type, data, options: { responsive: true, maintainAspectRatio: false, ...options } });
  }

  /* ---------------------------------------------------------------
     NOTES
     --------------------------------------------------------------- */
  let notesSaveTimer = null;
  function loadNotesForToday() {
    document.getElementById('notesArea').value = notesStore[todayStr()] || '';
  }
  function handleNotesInput() {
    const indicator = document.getElementById('notesSaveIndicator');
    indicator.textContent = 'Saving…';
    indicator.classList.add('show');
    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(() => {
      notesStore[todayStr()] = document.getElementById('notesArea').value;
      saveJSON(LS_KEYS.notes, notesStore);
      indicator.textContent = 'Saved';
      setTimeout(() => indicator.classList.remove('show'), 1500);
    }, 500);
  }

  /* ---------------------------------------------------------------
     REMINDERS
     --------------------------------------------------------------- */
  function renderReminderList() {
    const list = document.getElementById('reminderList');
    list.innerHTML = '';
    if (!reminders.length) {
      list.innerHTML = `<p class="empty-state" style="padding:14px 0;">No reminders set.</p>`;
      return;
    }
    reminders.sort((a, b) => a.time.localeCompare(b.time)).forEach(r => {
      const row = document.createElement('div');
      row.className = 'reminder-item';
      row.innerHTML = `
        <span><span class="rem-time">${formatTime12(r.time)}</span>${escapeHtml(r.text)}</span>
        <button class="icon-btn delete-btn" data-remid="${r.id}" aria-label="Remove reminder"><i class="fa-solid fa-xmark"></i></button>
      `;
      list.appendChild(row);
    });
  }

  function handleReminderSubmit(e) {
    e.preventDefault();
    const text = document.getElementById('reminderText').value.trim();
    const time = document.getElementById('reminderTime').value;
    if (!text || !time) return;
    reminders.push({ id: uid(), text, time, firedOn: null });
    saveReminders();
    renderReminderList();
    document.getElementById('reminderForm').reset();
    showToast('Reminder set', 'success', 'fa-bell');
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function checkReminders() {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = todayStr();
    reminders.forEach(r => {
      if (r.time === hhmm && r.firedOn !== today) {
        r.firedOn = today;
        showToast(r.text, 'warn', 'fa-bell');
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('Routinex reminder', { body: r.text }); } catch (e) { console.warn('Routinex: notification failed', e); }
        }
      }
    });
    saveReminders();
  }

  /* ---------------------------------------------------------------
     RESET DATA
     --------------------------------------------------------------- */
  function resetAllData() {
    if (!confirm('This will permanently delete all tasks, notes, reminders, and stats. Continue?')) return;
    Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
    tasks = []; notesStore = {}; reminders = []; streakData = { count: 0, lastDate: null }; seededDates = [];
    settings = { theme: 'dark', accent: ACCENTS[0], fontSize: 15 };
    seedRoutineFor(todayStr());
    applySettings();
    renderAll();
    showToast('All data has been reset', 'warn', 'fa-trash');
  }

  /* ---------------------------------------------------------------
     MASTER RENDER
     --------------------------------------------------------------- */
  function renderAll() {
    renderClockAndDate();
    renderDashboard();
    renderTaskTable();
    if (document.getElementById('page-calendar').classList.contains('active')) {
      renderCalendar();
      renderCalendarDetail();
    }
    if (document.getElementById('page-stats').classList.contains('active')) renderCharts();
  }

  /* ---------------------------------------------------------------
     EVENT WIRING
     --------------------------------------------------------------- */
  function wireEvents() {
    // Nav
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', () => goToPage(btn.dataset.page));
    });
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebarScrim').classList.add('show');
    });
    document.getElementById('sidebarScrim').addEventListener('click', closeSidebarMobile);

    // Theme
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('settingsThemeToggle').addEventListener('click', toggleTheme);
    document.getElementById('mobileThemeBtn').addEventListener('click', toggleTheme);

    // FAB + modal
    document.getElementById('fabAdd').addEventListener('click', () => openModal());
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('taskModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'taskModalOverlay') closeModal();
    });
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);

    // Table delegation
    document.getElementById('taskTableBody').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'toggle') toggleComplete(id);
      if (action === 'edit') openModal(id);
      if (action === 'delete') deleteTask(id);
    });

    // Filters
    ['searchInput', 'filterCategory', 'filterPriority', 'filterStatus'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderTaskTable);
    });

    // Calendar nav
    document.getElementById('calPrev').addEventListener('click', () => {
      calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
      renderCalendar();
    });
    document.getElementById('calNext').addEventListener('click', () => {
      calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
      renderCalendar();
    });

    // Notes
    document.getElementById('notesArea').addEventListener('input', handleNotesInput);

    // Settings
    document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
      settings.fontSize = Number(e.target.value);
      saveSettings();
      applySettings();
    });
    document.getElementById('resetDataBtn').addEventListener('click', resetAllData);

    // Reminders
    document.getElementById('reminderForm').addEventListener('submit', handleReminderSubmit);
    document.getElementById('reminderList').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-remid]');
      if (!btn) return;
      reminders = reminders.filter(r => r.id !== btn.dataset.remid);
      saveReminders();
      renderReminderList();
    });

    // Keyboard: Escape closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  /* ---------------------------------------------------------------
     INIT
     --------------------------------------------------------------- */
  function init() {
    seedRoutineFor(todayStr());
    applySettings();
    renderAccentSwatches();
    populateCategoryFilters();
    document.getElementById('fontSizeSlider').value = settings.fontSize;
    calendarSelectedDate = todayStr();

    wireEvents();
    loadNotesForToday();
    renderReminderList();
    renderAll();

    setInterval(renderClockAndDate, 1000);
    setInterval(checkReminders, 20000);
    checkReminders();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
