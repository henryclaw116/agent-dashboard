import { Link } from 'react-router-dom';
import { Project } from '../types';
import { Calendar, Target } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  const priorityColors = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-gray-100 text-gray-800',
  };

  const priorityLabels = {
    1: 'High',
    2: 'Medium',
    3: 'Low',
  };

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ml-4 ${priorityColors[project.priority as keyof typeof priorityColors]}`}>
          {priorityLabels[project.priority as keyof typeof priorityLabels]}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-semibold text-rlt-blue">{project.percent_complete}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-rlt-blue h-2 rounded-full transition-all"
            style={{ width: `${project.percent_complete}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {project.start_date && (
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>Started {format(new Date(project.start_date), 'MMM d')}</span>
          </div>
        )}
        {project.target_date && (
          <div className="flex items-center gap-1">
            <Target size={14} />
            <span>Target {format(new Date(project.target_date), 'MMM d')}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default ProjectCard;
