/**
 * Main entry point for the Electron application.
 *
 * This script handles the initialization of the Electron app, the creation of the main browser window,
 * task management, IPC (Inter-Process Communication) handling, and tray functionality. The application
 * is designed to categorize, add, delete, and update tasks, as well as allow users to manage tasks
 * through IPC messages.
 *
 * Key functionalities:
 * - Electron app initialization and lifecycle handling (e.g., window creation, app quitting).
 * - Task management with categories (quadrants) based on task urgency and importance.
 * - Task persistence using `electron-store`.
 * - IPC handling for adding, deleting, updating tasks, and managing completed tasks.
 * - Global shortcut for showing the main window.
 * - Tray menu functionality for showing the main window or quitting the app.
 *
 * The app supports categorizing tasks into four quadrants based on the Eisenhower matrix:
 * - Quadrant 1 (Do): Urgent and important tasks.
 * - Quadrant 2 (Schedule): Important but not urgent tasks.
 * - Quadrant 3 (Delegate): Urgent but not important tasks.
 * - Quadrant 4 (Tasks to delete): Neither urgent nor important tasks.
 *
 * The app stores tasks in a persistent store using `electron-store`, allowing tasks to be saved
 * across application restarts. The tray menu offers convenient access to show or quit the app, and
 * the global shortcut provides an easy way to focus the main window.
 */

/**
 * @module MainElectronApp
 * @description Main entry point for the Electron Task Management Application
 * @requires electron
 * @requires path
 * @requires electron-store
 * This module initializes an Electron application for task management using the Eisenhower Matrix.
 * It provides functionality for creating, categorizing, storing, and managing tasks across four quadrants.
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
} = require('electron');
const path = require('node:path');

if (require('electron-squirrel-startup')) app.quit();

let Store;
(async () => {
  const module = await import('electron-store');
  Store = module.default;

  const store = new Store();

  let mainWindow;
  let isQuitting = false;

  /**
   * Represents the task storage and management system
   * @typedef {Object} tasks
   * @property {Task[]} quadrant1 - Urgent and important tasks (Do)
   * @property {Task[]} quadrant2 - Important but not urgent tasks (Schedule)
   * @property {Task[]} quadrant3 - Urgent but not important tasks (Delegate)
   * @property {Task[]} quadrant4 - Neither urgent nor important tasks
   * @property {Task[]} completed - Completed tasks
   */
  const tasks = store.get('tasks', {
    quadrant1: [],
    quadrant2: [],
    quadrant3: [],
    quadrant4: [],
    completed: [],
  });

  /**
   * Saves current tasks to persistent storage
   * @function saveTasks
   * @description Uses electron-store to persist tasks across application restarts
   * @private
   */
  function saveTasks() {
    store.set('tasks', tasks);
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/view.html'));
  }

  app.whenReady().then(() => {
    createWindow();

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    app.on('before-quit', () => {
      isQuitting = true;
    });

    /**
     * Categorizes a task into the appropriate quadrant
     * @function categorizeTask
     * @param {Task} task - The task to categorize
     * @returns {Object} An object containing the quadrant key and category name
     * @property {string} key - The storage key for the quadrant
     * @property {string} category - The human-readable category name
     * @private
     */
    function categorizeTask(task) {
      if (task.urgent && task.important) {
        return { key: 'quadrant1', category: 'Do' };
      }

      if (!task.urgent && task.important) {
        return { key: 'quadrant2', category: 'Schedule' };
      }

      if (task.urgent && !task.important) {
        return { key: 'quadrant3', category: 'Delegate' };
      }

      return { key: 'quadrant4', category: 'Tasks to delete' };
    }

    /**
     * IPC Handler for adding a new task
     * @event add-task
     * @param {Electron.IpcMainEvent} event - The IPC event
     * @param {Task} task - The task to be added
     * @returns {TaskStore} Updated tasks after adding the new task
     */
    ipcMain.handle('add-task', (event, task) => {
      const fullTask = { ...task, notes: task.notes || '' };
      const { key, category } = categorizeTask(fullTask);
      fullTask.category = category;
      tasks[key].push(fullTask);
      saveTasks();
      return tasks;
    });

    /**
     * IPC Handler for retrieving all tasks
     * @event get-tasks
     * @returns {TaskStore} Current tasks across all quadrants
     */
    ipcMain.handle('get-tasks', () => tasks);

    /**
     * IPC Handler for deleting a specific task
     * @event delete-task
     * @param {Electron.IpcMainEvent} event - The IPC event
     * @param {Object} taskLocation - Location of the task to delete
     * @param {string} taskLocation.quadrant - The quadrant containing the task
     * @param {number} taskLocation.index - The index of the task in the quadrant
     * @returns {TaskStore} Updated tasks after deletion
     */
    ipcMain.handle('delete-task', (event, { quadrant, index }) => {
      tasks[quadrant].splice(index, 1);
      saveTasks();
      return tasks;
    });

    /**
     * IPC Handler for retrieving task notes
     * @event get-notes
     * @param {Electron.IpcMainEvent} event - The IPC event
     * @param {Object} taskLocation - Location of the task
     * @param {string} taskLocation.quadrant - The quadrant containing the task
     * @param {number} taskLocation.index - The index of the task in the quadrant
     * @returns {string} The notes for the specified task
     */
    ipcMain.handle('get-notes', (event, { quadrant, index }) => {
      if (!tasks[quadrant]?.[index]) {
        console.error(`Invalid quadrant or index: ${quadrant}, ${index}`);
        return '';
      }
      return tasks[quadrant][index].notes || '';
    });

    /**
     * IPC Handler for updating task notes
     * @event update-notes
     * @param {Electron.IpcMainEvent} event - The IPC event
     * @param {Object} noteUpdate - Details for updating task notes
     * @param {string} noteUpdate.quadrant - The quadrant containing the task
     * @param {number} noteUpdate.index - The index of the task in the quadrant
     * @param {string} noteUpdate.notes - The new notes for the task
     * @returns {TaskStore} Updated tasks after note modification
     */
    ipcMain.handle('update-notes', (event, { quadrant, index, notes }) => {
      if (tasks[quadrant]?.[index]) {
        tasks[quadrant][index].notes = notes;
        saveTasks();
      } else {
        console.error(`Invalid quadrant or index: ${quadrant}, ${index}`);
      }
      return tasks;
    });

    /**
     * IPC Handler for marking tasks as completed
     * @event complete-task
     * @param {Electron.IpcMainEvent} event - The IPC event
     * @param {Object} selectedTasks - Tasks to be marked as completed
     * @param {number[][]} selectedTasks.quadrant - Indices of tasks to complete in each quadrant
     * @returns {TaskStore} Updated tasks after moving to completed
     */
    ipcMain.handle('complete-task', (event, selectedTasks) => {
      for (const [quadrant, indices] of Object.entries(selectedTasks)) {
        indices.sort((a, b) => b - a);
        for (const index of indices) {
          const completedTask = tasks[quadrant].splice(index, 1)[0];
          if (completedTask) {
            tasks.completed.push(completedTask);
          }
        }
      }
      saveTasks();
      return tasks;
    });

    /**
     * IPC Handler for retrieving completed tasks
     * @event get-completed-tasks
     * @returns {Task[]} List of completed tasks
     */
    ipcMain.handle('get-completed-tasks', () => {
      return tasks.completed || [];
    });

    /**
     * IPC Handler for deleting a completed task
     * @event delete-completed-task
     * @param {Electron.IpcMainEvent} event - The IPC event
     * @param {number} index - Index of the completed task to delete
     * @returns {Task[]} Updated list of completed tasks
     */
    ipcMain.handle('delete-completed-task', (event, index) => {
      tasks.completed.splice(index, 1);
      saveTasks();
      return tasks.completed;
    });

    const ret = globalShortcut.register('CmdOrCtrl+Alt+T', () => {
      mainWindow.show();
      mainWindow.focus();
    });
    if (!ret) {
      console.error('Failed to register global shortcut.');
    }

    // Tray formatted as linter suggests
    const trayIcon = new Tray(
      path.resolve(__dirname, 'icons/taskbar/icon.png'),
    );
    trayIcon.setContextMenu(
      Menu.buildFromTemplate([
        {
          role: 'unhide',
          click: () => {
            mainWindow.show();
            mainWindow.focus();
          },
        },
        { role: 'quit' },
      ]),
    );
  });
})();
