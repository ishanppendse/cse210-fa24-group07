const taskForm = document.getElementById('task-form');
const addTaskButton = document.getElementById('add-task-button');
const deleteSelectedButton = document.getElementById('delete-selected-button');
const backButton = document.getElementById('back-button');
const quadrants = document.querySelectorAll('.quadrant');
const helpButton = document.getElementById('help');
const backFromHelpButton = document.getElementById('back');

let selectedTasks = {}; // Track selected tasks for deletion

function updateDeleteButtonVisibility() {
  const hasSelectedTasks = Object.keys(selectedTasks).length > 0;
  deleteSelectedButton.style.display = hasSelectedTasks
    ? 'inline-block'
    : 'none';
}

async function loadMatrix() {
  const tasks = await window.electronAPI.getTasks();
  selectedTasks = {}; // Reset selected tasks
  updateDeleteButtonVisibility(); // Ensure button is hidden initially

  for (const [quadrant, taskList] of Object.entries(tasks)) {
    const quadrantEl = document.getElementById(quadrant)?.querySelector('ul');
    if (quadrantEl) {
      quadrantEl.innerHTML = ''; // Clear existing tasks

      // Sort tasks by deadline (earliest first)
      const sortedTasks = taskList.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });

      sortedTasks.forEach((task, index) => {
        const taskItem = document.createElement('li');

        // Checkbox for task
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            if (!selectedTasks[quadrant]) selectedTasks[quadrant] = [];
            selectedTasks[quadrant].push(index);
          } else {
            selectedTasks[quadrant] = selectedTasks[quadrant].filter(
              (i) => i !== index,
            );
            if (selectedTasks[quadrant].length === 0)
              delete selectedTasks[quadrant];
          }
          updateDeleteButtonVisibility(); // Update button visibility on checkbox change
        });

        // Task name with deadline
        const taskText = document.createElement('span');
        const deadline = task.deadline
          ? ` (${(new Date(task.deadline).getMonth() + 1)
              .toString()
              .padStart(
                2,
                '0',
              )}/${new Date(task.deadline).getDate().toString().padStart(2, '0')})`
          : '';
        taskText.textContent = `${task.name}${deadline}`;

        // Notes button for editing task notes
        const notesButton = document.createElement('button');
        notesButton.textContent = 'Edit Notes';
        notesButton.style.marginLeft = '10px'; // Add spacing
        notesButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          window.location.href = `./notes.html?quadrant=${quadrant}&index=${index}`;
        });

        taskItem.appendChild(checkbox);
        taskItem.appendChild(taskText);
        taskItem.appendChild(notesButton); // Attach notes button
        quadrantEl.appendChild(taskItem);
      });
    }
  }
}

// Delete selected tasks
if (deleteSelectedButton) {
  deleteSelectedButton.addEventListener('click', async () => {
    for (const [quadrant, indices] of Object.entries(selectedTasks)) {
      // Sort indices in descending order to avoid index shifting during deletion
      for (const index of indices.sort((a, b) => b - a)) {
        await window.electronAPI.deleteTask(quadrant, index);
      }
    }
    await loadMatrix(); // Reload matrix after deletion
  });
}

// Navigate to add task page
if (addTaskButton) {
  addTaskButton.addEventListener('click', () => {
    window.location.href = './add-task.html';
  });
}

if (helpButton) {
  helpButton.addEventListener('click', () => {
    window.location.href = './help.html';
  });
}

if (backFromHelpButton) {
  backFromHelpButton.addEventListener('click', () => {
    window.location.href = './view.html';
  });
}

// Add task and return to matrix view
if (taskForm) {
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('task-name').value;
    const notes = document.getElementById('markdown-input').value; // New notes field
    const urgent = document.getElementById('urgent').checked;
    const important = document.getElementById('important').checked;
    const deadline = document.getElementById('deadline').value;

    await window.electronAPI.addTask({
      name,
      notes,
      urgent,
      important,
      deadline,
    });
    window.location.href = './view.html'; // Return to matrix view
  });
}

// Load matrix tasks on matrix page
if (document.getElementById('matrix')) {
  loadMatrix();
}

for (const quadrant of quadrants) {
  quadrant.addEventListener('click', (event) => {
    if (event.target.tagName.toLowerCase() === 'input') {
      return;
    }

    const sectionId = quadrant.getAttribute('id');
    const targetPage = `section.html?id=${encodeURIComponent(sectionId)}`;
    window.location.href = targetPage;
  });
}
