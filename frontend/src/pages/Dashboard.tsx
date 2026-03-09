import { useEffect, useState } from 'react';
import { dashboardApi, blockersApi } from '../api/api';
import { Project, Blocker, Task, Notification, DashboardStats } from '../types';
import ProjectCard from '../components/ProjectCard';
import StatsCard from '../components/StatsCard';
import BlockerCard from '../components/BlockerCard';
import WaitingOnTony from '../components/WaitingOnTony';
import Modal from '../components/Modal';
import ProjectForm from '../components/ProjectForm';
import { FolderKanban, CheckCircle2, AlertCircle, Bell, Plus } from 'lucide-react';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [tasksInProgress, setTasksInProgress] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [overviewRes, statsRes] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getStats(),
      ]);

      setProjects(overviewRes.data.projects);
      setBlockers(overviewRes.data.blockers);
      setTasksInProgress(overviewRes.data.tasks_in_progress);
      setNotifications(overviewRes.data.notifications);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveBlocker = async (id: number) => {
    try {
      await blockersApi.resolve(id);
      loadDashboard(); // Refresh
    } catch (error) {
      console.error('Failed to resolve blocker:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Active Projects"
            value={stats.active_projects}
            icon={FolderKanban}
            color="blue"
          />
          <StatsCard
            title="Tasks Completed Today"
            value={stats.tasks_completed_today}
            icon={CheckCircle2}
            color="green"
          />
          <StatsCard
            title="In Progress"
            value={stats.tasks_in_progress}
            icon={CheckCircle2}
            color="yellow"
            subtitle="tasks currently active"
          />
          <StatsCard
            title="Open Blockers"
            value={stats.open_blockers}
            icon={AlertCircle}
            color={stats.open_blockers > 0 ? 'red' : 'green'}
          />
        </div>
      )}

      {/* Waiting on Tony Section */}
      <WaitingOnTony />

      {/* Blockers Section */}
      {blockers.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🚧 Project Blockers
          </h2>
          <div className="space-y-3">
            {blockers.map((blocker) => (
              <BlockerCard
                key={blocker.id}
                blocker={blocker}
                onResolve={handleResolveBlocker}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Active Projects</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowProjectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
            <a href="/projects" className="text-sm text-rlt-blue hover:underline flex items-center">
              View all
            </a>
          </div>
        </div>
        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No active projects</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Tasks In Progress */}
      {tasksInProgress.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Currently Working On</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {tasksInProgress.map((task) => (
                <li key={task.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">{task.project_name}</span>
                        {task.assigned_to && (
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                            {task.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="Create New Project"
      >
        <ProjectForm
          onSuccess={() => {
            setShowProjectModal(false);
            loadDashboard();
          }}
          onCancel={() => setShowProjectModal(false)}
        />
      </Modal>
    </div>
  );
}

export default Dashboard;
