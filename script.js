/* =========================================================
   Student Productivity Hub — application logic (vanilla JavaScript, ES6+)

   How it works:
   1. All tasks live in one array: `tasks` (the app "state").
   2. Every change (add, move, delete) updates the array,
      saves it to localStorage, then calls render().
   3. render() rebuilds the board from the array, applying
      the current search text and category filter.
   ========================================================= */

// ---------- Constants ----------
const STORAGE_KEY = 'studentHub.tasks';
const THEME_KEY = 'studentHub.theme';

const STATUSES = ['todo', 'in-progress', 'completed'];
const STATUS_LABELS = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'completed': 'Completed'
};

// Example tasks shown only on the very first visit
const SAMPLE_TASKS = [
  {
    title: 'Deploy portfolio website',
    description: 'Publish the Bootstrap portfolio on GitHub Pages and send the link.',
    category: 'Internship',
    priority: 'High',
    status: 'completed'
  },
  {
    title: 'SQL assignment',
    description: 'Write the queries for the database systems coursework.',
    category: 'University',
    priority: 'High',
    status: 'in-progress'
  },
  {
    title: 'Build MoneyAgent AI prototype',
    description: 'First version of the budgeting dashboard in JavaScript.',
    category: 'Programming',
    priority: 'Medium',
    status: 'todo'
  },
  {
    title: 'Practise data visualisation',
    description: 'Recreate two charts from a public dataset.',
    category: 'Data Science',
    priority: 'Low',
    status: 'todo'
  },
  {
    title: 'Football training',
    description: 'Tuesday evening session.',
    category: 'Personal',
    priority: 'Low',
    status: 'todo'
  }
];

// ---------- DOM references ----------
const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-desc');
const categoryInput = document.getElementById('task-category');
const priorityInput = document.getElementById('task-priority');
const formError = document.getElementById('form-error');

const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const themeToggle = document.getElementById('theme-toggle');
const board = document.querySelector('.board');

const lists = {
  'todo': document.getElementById('list-todo'),
  'in-progress': document.getElementById('list-in-progress'),
  'completed': document.getElementById('list-completed')
};

const counts = {
  'todo': document.getElementById('count-todo'),
  'in-progress': document.getElementById('count-in-progress'),
  'completed': document.getElementById('count-completed')
};

// ---------- State ----------
let tasks = loadTasks();
let draggedTaskId = null;

// ---------- Storage helpers ----------

/** Read tasks from localStorage. On the first visit, use the sample tasks. */
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return SAMPLE_TASKS.map(createTask);
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // Storage blocked or data corrupted: start with an empty board
    console.warn('Could not load tasks:', error);
    return [];
  }
}

/** Write the current tasks array to localStorage. */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn('Could not save tasks:', error);
  }
}

// ---------- Task operations ----------

/** Build a complete task object with a unique id and creation date. */
function createTask({ title, description = '', category, priority, status = 'todo' }) {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    description,
    category,
    priority,
    status,
    createdAt: new Date().toISOString()
  };
}

/** Add a task from the form after validating it. */
function handleAddTask(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const category = categoryInput.value;
  const priority = priorityInput.value;

  // Simple validation with a friendly message
  if (!title || !category || !priority) {
    formError.textContent = 'Please add a title and choose a category and priority.';
    (!title ? titleInput : !category ? categoryInput : priorityInput).focus();
    return;
  }
  formError.textContent = '';

  tasks.push(createTask({ title, description, category, priority }));
  saveTasks();
  render();

  form.reset();
  titleInput.focus();
}

/** Move a task to another column. */
function moveTask(id, newStatus) {
  if (!STATUSES.includes(newStatus)) return;

  tasks = tasks.map(task => (task.id === id ? { ...task, status: newStatus } : task));
  saveTasks();
  render();
}

/** Remove a task after the user confirms. */
function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (window.confirm(`Delete "${task.title}"?`)) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
}

// ---------- Rendering ----------

/** Rebuild all three columns from the tasks array. */
function render() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  // Keep only the tasks that match the search and filter
  const visibleTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isFiltering = searchTerm !== '' || selectedCategory !== 'All';

  STATUSES.forEach(status => {
    const list = lists[status];
    const columnTasks = visibleTasks.filter(task => task.status === status);

    list.replaceChildren(...columnTasks.map(createTaskCard));

    if (columnTasks.length === 0) {
      list.appendChild(createEmptyState(isFiltering));
    }

    counts[status].textContent = columnTasks.length;
  });

  updateStats();
}

/** Counter in the header: active vs completed, based on ALL tasks. */
function updateStats() {
  const completed = tasks.filter(task => task.status === 'completed').length;
  const active = tasks.length - completed;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-done').textContent = completed;
  document.getElementById('progress-bar').style.width = `${percent}%`;
  document.getElementById('progress-text').textContent = `${percent}%`;
}

/** Placeholder shown in an empty column. */
function createEmptyState(isFiltering) {
  const empty = document.createElement('p');
  empty.className = 'empty-state';
  empty.textContent = isFiltering ? 'No matching tasks' : 'Drop tasks here';
  return empty;
}

/** Create the DOM element for one task card. */
function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = 'task-card';
  if (task.status === 'completed') card.classList.add('is-done');
  card.dataset.id = task.id;
  card.dataset.priority = task.priority;
  card.draggable = true;

  const statusOptions = STATUSES.map(status =>
    `<option value="${status}" ${task.status === status ? 'selected' : ''}>${STATUS_LABELS[status]}</option>`
  ).join('');

  card.innerHTML = `
    <div class="card-top">
      <h3 class="card-title">${escapeHtml(task.title)}</h3>
    </div>
    ${task.description ? `<p class="card-desc">${escapeHtml(task.description)}</p>` : ''}
    <div class="card-tags">
      <span class="tag tag-priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span>
      <span class="tag">${escapeHtml(task.category)}</span>
    </div>
    <div class="card-footer">
      <span class="card-date">${formatDate(task.createdAt)}</span>
      <div class="card-actions">
        <select class="status-select" aria-label="Move task">${statusOptions}</select>
        <button class="delete-btn" type="button" aria-label="Delete task" title="Delete task">✕</button>
      </div>
    </div>
  `;

  return card;
}

// ---------- Small helpers ----------

/** Prevent HTML injection when showing user text. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format an ISO date like "11 Nov". */
function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ---------- Card actions (event delegation) ----------
// One listener on the board handles every card, even ones added later.

board.addEventListener('change', event => {
  if (event.target.matches('.status-select')) {
    const card = event.target.closest('.task-card');
    moveTask(card.dataset.id, event.target.value);
  }
});

board.addEventListener('click', event => {
  if (event.target.closest('.delete-btn')) {
    const card = event.target.closest('.task-card');
    deleteTask(card.dataset.id);
  }
});

// ---------- Drag and drop (bonus, native HTML5 API) ----------

board.addEventListener('dragstart', event => {
  const card = event.target.closest('.task-card');
  if (!card) return;

  draggedTaskId = card.dataset.id;
  card.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedTaskId);
});

board.addEventListener('dragend', event => {
  const card = event.target.closest('.task-card');
  if (card) card.classList.remove('dragging');
  draggedTaskId = null;
  Object.values(lists).forEach(list => list.classList.remove('drag-over'));
});

Object.values(lists).forEach(list => {
  // Allow dropping by cancelling the default dragover behaviour
  list.addEventListener('dragover', event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    list.classList.add('drag-over');
  });

  list.addEventListener('dragleave', event => {
    // Only remove the highlight when the pointer really leaves the list
    if (!list.contains(event.relatedTarget)) {
      list.classList.remove('drag-over');
    }
  });

  list.addEventListener('drop', event => {
    event.preventDefault();
    list.classList.remove('drag-over');

    const id = event.dataTransfer.getData('text/plain') || draggedTaskId;
    if (id) moveTask(id, list.dataset.status);
  });
});

// ---------- Dark mode (bonus) ----------

/** Apply a theme and remember the choice. */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  themeToggle.querySelector('.theme-label').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (error) {
    // Ignore: fall back to the system preference
  }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (error) {
    // Ignore: theme just won't be remembered
  }
});

// ---------- Start the app ----------
form.addEventListener('submit', handleAddTask);
searchInput.addEventListener('input', render);
categoryFilter.addEventListener('change', render);

initTheme();
saveTasks(); // stores the sample tasks on the first visit
render();
