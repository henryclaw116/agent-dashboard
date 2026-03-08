import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { projectsApi } from '../api/api';
import { Project, Phase, Task, Blocker, Activity } from '../types';
import { Calendar, Target, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.getById(parseInt(id!));
      setProject(res.data.project);
      setPhases(res.data.phases);
      setTasks(res.data.tasks);
      setBlockers(res.data.blockers);
      setActivity(res.data.activity);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-2">{project.description}</p>
          </div>
          <span className={`px-3 py-1 rounded text-sm font-medium ${
            project.status === 'active' ? 'bg-green-100 text-green-800' :
            project.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            project.status === 'complete' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-lg font-bold text-rlt-blue">{project.percent_complete}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-rlt-blue h-3 rounded-full transition-all"
              style={{ width: `${project.percent_complete}%` }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          {project.start_date && (
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>Started {format(new Date(project.start_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {project.target_date && (
            <div className="flex items-center gap-2">
              <Target size={16} />
              <span>Target {format(new Date(project.target_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500" />
            Open Blockers
          </h2>
          <div className="space-y-3">
            {blockers.map((blocker) => (
              <div key={blocker.id} className="p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-semibold text-gray-900">{blocker.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{blocker.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phases */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Phases</h2>
        <div className="space-y-4">
          {phases.map((phase) => (
            <div key={phase.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Phase {phase.phase_number}: {phase.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  phase.status === 'complete' ? 'bg-green-100 text-green-800' :
                  phase.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {phase.status}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-rlt-blue h-2 rounded-full"
                    style={{ width: `${phase.percent_complete}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1 block">{phase.percent_complete}% complete</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Tasks</h2>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={task.status === 'complete'}
                readOnly
                className="h-4 w-4"
              />
              <div className="flex-1">
                <h4 className={`font-medium ${task.status === 'complete' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                task.status === 'complete' ? 'bg-green-100 text-green-800' :
                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {activity.map((act) => (
            <div key={act.id} className="text-sm">
              <p className="text-gray-900">{act.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(act.created_at), 'MMM d, yyyy h:mm a')}
                {act.agent_name && ` • ${act.agent_name}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail;
