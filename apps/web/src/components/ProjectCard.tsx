import type { Project } from '../hooks/useProjects';

interface Props {
  project: Project;
  onSelect: () => void;
  onDelete: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  live: 'bg-green-100 text-green-700',
  deleted: 'bg-red-100 text-red-700',
};

export default function ProjectCard({ project, onSelect, onDelete }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg truncate">{project.name}</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            statusColors[project.status] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {project.status}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('Delete this project?')) onDelete();
        }}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Delete
      </button>
    </div>
  );
}
