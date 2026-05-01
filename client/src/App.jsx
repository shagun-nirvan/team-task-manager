import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Filter,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Save,
  Search,
  Shield,
  Sun,
  Trash2,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import { api } from './api.js';

const emptyProject = { name: '', description: '', status: 'active', members: [] };
const emptyTask = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', project: '', assignedTo: '' };
const emptyUser = { name: '', email: '', password: '', role: 'member' };
const statuses = ['todo', 'in-progress', 'done'];
const priorities = ['low', 'medium', 'high'];

function tomorrowInput() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : tomorrowInput();
}

function displayStatus(status) {
  return status.replace('-', ' ');
}

function isOverdue(task) {
  return task.status !== 'done' && new Date(task.dueDate) < new Date();
}

function daysUntil(date) {
  const start = new Date();
  const end = new Date(date);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - start) / 86400000);
}

function memberIds(project) {
  return project?.members?.map((member) => member.id || member) || [];
}

export function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'admin@example.com', password: 'Admin@123' });
  const [tokenReady, setTokenReady] = useState(false);
  const [message, setMessage] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState({ ...emptyTask, dueDate: tomorrowInput() });
  const [editingProjectId, setEditingProjectId] = useState('');
  const [projectEditForm, setProjectEditForm] = useState(emptyProject);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [taskEditForm, setTaskEditForm] = useState({ ...emptyTask, dueDate: tomorrowInput() });
  const [userForm, setUserForm] = useState(emptyUser);
  const [filters, setFilters] = useState({ query: '', status: 'all', priority: 'all', project: 'all', assignee: 'all' });
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const isAdmin = user?.role === 'admin';
  const isNight = theme === 'night';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  async function loadApp() {
    const [dashboardData, projectData, taskData, userData] = await Promise.all([
      api('/dashboard'),
      api('/projects'),
      api('/tasks'),
      api('/users')
    ]);

    setDashboard(dashboardData);
    setProjects(projectData.projects);
    setTasks(taskData.tasks);
    setUsers(userData.users);
  }

  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('token');
      if (!token) {
        setTokenReady(true);
        return;
      }

      try {
        const data = await api('/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('token');
      } finally {
        setTokenReady(true);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadApp().catch((error) => setMessage(error.message));
    }
  }, [user]);

  const filteredTasks = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return tasks.filter((task) => {
      const text = `${task.title} ${task.description} ${task.project?.name || ''} ${task.assignedTo?.name || ''}`.toLowerCase();
      return (!query || text.includes(query))
        && (filters.status === 'all' || task.status === filters.status)
        && (filters.priority === 'all' || task.priority === filters.priority)
        && (filters.project === 'all' || task.project?.id === filters.project)
        && (filters.assignee === 'all' || task.assignedTo?.id === filters.assignee);
    });
  }, [filters, tasks]);

  const grouped = useMemo(() => ({
    todo: filteredTasks.filter((task) => task.status === 'todo'),
    'in-progress': filteredTasks.filter((task) => task.status === 'in-progress'),
    done: filteredTasks.filter((task) => task.status === 'done')
  }), [filteredTasks]);

  const upcomingTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'done').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 4),
    [tasks]
  );

  const createAssigneeOptions = useMemo(() => {
    return users;
  }, [users]);

  const editAssigneeOptions = useMemo(() => {
    return users;
  }, [users]);

  async function submitAuth(event) {
    event.preventDefault();
    setMessage('');

    try {
      const payload = authMode === 'signup' ? authForm : { email: authForm.email, password: authForm.password };
      const data = await api(`/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createProject(event) {
    event.preventDefault();
    setMessage('');

    try {
      await api('/projects', {
        method: 'POST',
        body: JSON.stringify(projectForm)
      });
      setProjectForm(emptyProject);
      await loadApp();
      setMessage('Project created.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createTeamUser(event) {
    event.preventDefault();
    setMessage('');

    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify(userForm)
      });
      setUserForm(emptyUser);
      await loadApp();
      setMessage(`${userForm.role === 'admin' ? 'Admin' : 'Member'} user created.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function beginEditProject(project) {
    setEditingProjectId(project.id);
    setProjectEditForm({
      name: project.name,
      description: project.description || '',
      status: project.status,
      members: memberIds(project)
    });
  }

  async function updateProject(event) {
    event.preventDefault();
    setMessage('');

    try {
      await api(`/projects/${editingProjectId}`, {
        method: 'PATCH',
        body: JSON.stringify(projectEditForm)
      });
      setEditingProjectId('');
      await loadApp();
      setMessage('Project updated.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeProject(project) {
    if (!window.confirm(`Delete "${project.name}" and all its tasks?`)) return;
    setMessage('');

    try {
      await api(`/projects/${project.id}`, { method: 'DELETE' });
      await loadApp();
      setMessage('Project deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setMessage('');

    try {
      await api('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskForm)
      });
      setTaskForm({ ...emptyTask, dueDate: tomorrowInput() });
      await loadApp();
      setMessage('Task created.');
    } catch (error) {
      setMessage(error.message);
    }
  }
  function beginEditTask(task) {
   const id = task._id || task.id;
setEditingTaskId(id);
    setTaskEditForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: toDateInput(task.dueDate),
      project: task.project?.id || '',
      assignedTo: task.assignedTo?.id || ''
    });
  }

  async function updateTask(event) {
    event.preventDefault();
    setMessage('');

    try {
      const payload = isAdmin ? taskEditForm : { status: taskEditForm.status };
      await api(`/tasks/${editingTaskId || taskEditForm._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      setEditingTaskId('');
      await loadApp();
      setMessage('Task updated.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateTaskStatus(task, status) {
    setMessage('');

    try {
      await api(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      await loadApp();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeTask(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    setMessage('');

    try {
      await api(`/tasks/${task._id || task.id}`, { method: 'DELETE' });
      await loadApp();
      setMessage('Task deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setDashboard(null);
  }

  if (!tokenReady) {
    return <div className="center-screen">Loading workspace...</div>;
  }

  if (!user) {
    return (
      <main className="auth-page">
        <button className="theme-toggle auth-theme-toggle" type="button" onClick={() => setTheme(isNight ? 'light' : 'night')} aria-label={isNight ? 'Switch to light mode' : 'Switch to night mode'}>
          {isNight ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isNight ? 'Light' : 'Night'}</span>
        </button>
        <section className="auth-hero">
          <div>
            <span className="eyebrow"><Shield size={16} /> Full-stack RBAC</span>
            <h1>Team Task Manager</h1>
            <p>Create projects, assign work, and keep every task moving with a clean Admin and Member workflow.</p>
          </div>
          <div className="hero-metrics">
            <div><strong>REST</strong><span>API</span></div>
            <div><strong>JWT</strong><span>Auth</span></div>
            <div><strong>NoSQL</strong><span>Data</span></div>
          </div>
        </section>

        <section className="auth-card">
          <div className="tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Signup</button>
          </div>
          <form onSubmit={submitAuth}>
            {authMode === 'signup' && (
              <>
                <label>Name<input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></label>
              </>
            )}
            <label>Email<input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
            <label>Password<input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
            {message && <p className="message error">{message}</p>}
            <button className="primary" type="submit">{authMode === 'login' ? 'Login' : 'Create account'}</button>
          </form>
          <p className="demo-note">Public signup creates a member account. Admins are added by existing admins.</p>
          <p className="demo-note">Demo: admin@example.com / Admin@123</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><FolderKanban /> TaskFlow</div>
        <nav>
          <a href="#dashboard"><LayoutDashboard size={18} /> Dashboard</a>
          <a href="#projects"><UsersRound size={18} /> Projects</a>
          <a href="#tasks"><BarChart3 size={18} /> Tasks</a>
        </nav>
        <button className="logout" onClick={logout}><LogOut size={18} /> Logout</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow"><UserRound size={16} /> {user.role}</span>
            <h1>Welcome, {user.name}</h1>
          </div>
          <div className="topbar-actions">
            <button className="theme-toggle" type="button" onClick={() => setTheme(isNight ? 'light' : 'night')} aria-label={isNight ? 'Switch to light mode' : 'Switch to night mode'}>
              {isNight ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isNight ? 'Light' : 'Night'}</span>
            </button>
            <div className="profile-chip">{user.email}</div>
          </div>
        </header>

        {message && <p className="message">{message}</p>}

        <section id="dashboard" className="stats-grid">
          <Stat icon={<FolderKanban />} label="Projects" value={dashboard?.projectCount ?? 0} />
          <Stat icon={<Clock3 />} label="To do" value={dashboard?.stats?.todo ?? 0} />
          <Stat icon={<BarChart3 />} label="In progress" value={dashboard?.stats?.inProgress ?? 0} />
          <Stat icon={<CheckCircle2 />} label="Done" value={dashboard?.stats?.done ?? 0} />
          <Stat icon={<AlertTriangle />} label="Overdue" value={dashboard?.stats?.overdue ?? 0} danger />
        </section>

        <section className="operations-grid">
          <div className="panel">
            <div className="panel-title">
              <h2>Due Soon</h2>
              <CalendarDays size={18} />
            </div>
            <div className="due-list">
              {upcomingTasks.length === 0 && <p className="empty-state">No active task deadlines.</p>}
              {upcomingTasks.map((task) => (
                <div className="due-item" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.project?.name} - {task.assignedTo?.name}</span>
                  </div>
                  <b className={isOverdue(task) ? 'late' : ''}>
                    {isOverdue(task) ? 'Overdue' : `${daysUntil(task.dueDate)}d`}
                  </b>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">
              <h2>Workload</h2>
              <UsersRound size={18} />
            </div>
            <div className="workload-list">
              {users.map((member) => {
                const count = tasks.filter((task) => task.assignedTo?.id === member.id && task.status !== 'done').length;
                return (
                  <div className="workload-row" key={member.id}>
                    <span>{member.name}</span>
                    <div><i style={{ width: `${Math.min(count * 28, 100)}%` }} /></div>
                    <b>{count}</b>
                  </div>
                );
              })}
            </div>
          </div>

          {isAdmin && (
            <form className="panel user-form" onSubmit={createTeamUser}>
              <div className="panel-title">
                <h2>Add User</h2>
                <Shield size={18} />
              </div>
              <div className="form-row">
                <label>Name<input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></label>
                <label>Role
                  <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>Email<input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></label>
                <label>Password<input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} /></label>
              </div>
              <button className="primary" type="submit">Add user</button>
            </form>
          )}
        </section>

        <section className="workspace-grid">
          <div id="projects" className="panel">
            <div className="panel-title">
              <h2>Projects</h2>
              <span>{projects.length} total</span>
            </div>
            <div className="project-list">
              {projects.map((project) => (
                <article className="project-card" key={project.id}>
                  {editingProjectId === project.id ? (
                    <form className="inline-form" onSubmit={updateProject}>
                      <label>Name<input value={projectEditForm.name} onChange={(event) => setProjectEditForm({ ...projectEditForm, name: event.target.value })} /></label>
                      <label>Description<textarea value={projectEditForm.description} onChange={(event) => setProjectEditForm({ ...projectEditForm, description: event.target.value })} /></label>
                      <div className="form-row">
                        <label>Status
                          <select value={projectEditForm.status} onChange={(event) => setProjectEditForm({ ...projectEditForm, status: event.target.value })}>
                            <option value="planning">Planning</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                          </select>
                        </label>
                        <label>Team
                          <select multiple value={projectEditForm.members} onChange={(event) => setProjectEditForm({ ...projectEditForm, members: Array.from(event.target.selectedOptions, (option) => option.value) })}>
                            {users.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.role})</option>)}
                          </select>
                        </label>
                      </div>
                      <div className="action-row">
                        <button className="primary compact" type="submit"><Save size={16} /> Save</button>
                        <button className="ghost compact" type="button" onClick={() => setEditingProjectId('')}><X size={16} /> Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <h3>{project.name}</h3>
                        <p>{project.description || 'No description added.'}</p>
                      </div>
                      <span className={`status ${project.status}`}>{project.status}</span>
                      <div className="avatars">
                        {project.members?.map((member) => <span title={member.name} key={member.id || member}>{member.name?.slice(0, 1) || '?'}</span>)}
                      </div>
                      {isAdmin && (
                        <div className="card-actions">
                          <button className="icon-button" title="Edit project" onClick={() => beginEditProject(project)}><Edit3 size={16} /></button>
                          <button className="icon-button danger" title="Delete project" onClick={() => removeProject(project)}><Trash2 size={16} /></button>
                        </div>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>

          {isAdmin && (
            <form className="panel form-panel" onSubmit={createProject}>
              <div className="panel-title">
                <h2>New Project</h2>
                <Plus size={18} />
              </div>
              <label>Name<input value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} /></label>
              <label>Description<textarea value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} /></label>
              <label>Status
                <select value={projectForm.status} onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value })}>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label>Team
                <select multiple value={projectForm.members} onChange={(event) => setProjectForm({ ...projectForm, members: Array.from(event.target.selectedOptions, (option) => option.value) })}>
                  {users.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.role})</option>)}
                </select>
              </label>
              <button className="primary" type="submit">Create project</button>
            </form>
          )}
        </section>

        <section id="tasks" className="task-section">
          {isAdmin && (
            <form className="panel task-form" onSubmit={createTask}>
              <div className="panel-title">
                <h2>Create Task</h2>
                <Plus size={18} />
              </div>
              <label>Title<input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} /></label>
              <label>Description<textarea value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></label>
              <div className="form-row">
                <label>Project
                  <select value={taskForm.project} onChange={(event) => setTaskForm({ ...taskForm, project: event.target.value, assignedTo: '' })}>
                    <option value="">Choose project</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </label>
                <label>Assign To
                  <select value={taskForm.assignedTo} onChange={(event) => setTaskForm({ ...taskForm, assignedTo: event.target.value })}>
                    <option value="">Choose member</option>
                    {createAssigneeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              </div>
              <p className="form-hint">Assigning a user to a project task automatically adds them to that project team.</p>
              <div className="form-row">
                <label>Priority
                  <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                    {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </label>
                <label>Due Date<input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></label>
              </div>
              <button className="primary" type="submit">Create task</button>
            </form>
          )}

          <div className="panel filter-panel">
            <div className="panel-title">
              <h2>Task Board</h2>
              <Filter size={18} />
            </div>
            <div className="filters">
              <label className="search-box"><Search size={18} /><input placeholder="Search tasks, projects, assignees" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /></label>
              <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="all">All statuses</option>
                {statuses.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
              </select>
              <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
                <option value="all">All priorities</option>
                {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              <select value={filters.project} onChange={(event) => setFilters({ ...filters, project: event.target.value })}>
                <option value="all">All projects</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              {isAdmin && (
                <select value={filters.assignee} onChange={(event) => setFilters({ ...filters, assignee: event.target.value })}>
                  <option value="all">All assignees</option>
                  {users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="kanban">
            {statuses.map((status) => (
              <div className="column" key={status}>
                <div className="column-title">
                  <h2>{displayStatus(status)}</h2>
                  <span>{grouped[status].length}</span>
                </div>
                {grouped[status].length === 0 && <p className="empty-state">No matching tasks.</p>}
                {grouped[status].map((task) => (
                  <article className={`task-card ${task.priority} ${isOverdue(task) ? 'overdue' : ''}`} key={task.id}>
                    {editingTaskId === task.id ? (
                      <form className="inline-form" onSubmit={updateTask}>
                        {isAdmin && (
                          <>
                            <label>Title<input value={taskEditForm.title} onChange={(event) => setTaskEditForm({ ...taskEditForm, title: event.target.value })} /></label>
                            <label>Description<textarea value={taskEditForm.description} onChange={(event) => setTaskEditForm({ ...taskEditForm, description: event.target.value })} /></label>
                            <div className="form-row">
                              <label>Project
                                <select value={taskEditForm.project} onChange={(event) => setTaskEditForm({ ...taskEditForm, project: event.target.value, assignedTo: '' })}>
                                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                                </select>
                              </label>
                              <label>Assignee
                                <select value={taskEditForm.assignedTo} onChange={(event) => setTaskEditForm({ ...taskEditForm, assignedTo: event.target.value })}>
                                  {editAssigneeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                              </label>
                            </div>
                          </>
                        )}
                        <div className="form-row">
                          <label>Status
                            <select value={taskEditForm.status} onChange={(event) => setTaskEditForm({ ...taskEditForm, status: event.target.value })}>
                              {statuses.map((item) => <option key={item} value={item}>{displayStatus(item)}</option>)}
                            </select>
                          </label>
                          {isAdmin && (
                            <label>Priority
                              <select value={taskEditForm.priority} onChange={(event) => setTaskEditForm({ ...taskEditForm, priority: event.target.value })}>
                                {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
                              </select>
                            </label>
                          )}
                        </div>
                        {isAdmin && <label>Due Date<input type="date" value={taskEditForm.dueDate} onChange={(event) => setTaskEditForm({ ...taskEditForm, dueDate: event.target.value })} /></label>}
                        <div className="action-row">
                          <button className="primary compact" type="submit"><Save size={16} /> Save</button>
                          <button className="ghost compact" type="button" onClick={() => setEditingTaskId('')}><X size={16} /> Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="task-head">
                          <span className={`priority ${task.priority}`}>{task.priority}</span>
                          {isOverdue(task) && <span className="overdue-pill">Overdue</span>}
                        </div>
                        <div>
                          <h3>{task.title}</h3>
                          <p>{task.description || 'No description.'}</p>
                        </div>
                        <div className="task-meta">
                          <span>{task.project?.name}</span>
                          <span>{task.assignedTo?.name}</span>
                        </div>
                        <div className="task-footer">
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          <select value={task.status} onChange={(event) => updateTaskStatus(task, event.target.value)}>
                            {statuses.map((item) => <option key={item} value={item}>{displayStatus(item)}</option>)}
                          </select>
                        </div>
                        <div className="card-actions">
                          <button className="icon-button" title="Edit task" onClick={() => beginEditTask(task)}><Edit3 size={16} /></button>
                          {isAdmin && <button className="icon-button danger" title="Delete task" onClick={() => removeTask(task)}><Trash2 size={16} /></button>}
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ icon, label, value, danger = false }) {
  return (
    <article className={`stat ${danger ? 'danger' : ''}`}>
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}
