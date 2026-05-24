import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../hooks/useProjects';
import ProjectCard from '../../components/ProjectCard';
import NewProjectModal from '../../components/NewProjectModal';
import TemplatesModal from '../../components/TemplatesModal';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { query, deleteProject } = useProjects();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const projects = query.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">My Projects</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={() => setShowTemplates(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium"
            >
              Templates
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
            >
              New Project
            </button>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {query.isLoading ? (
          <p>Loading...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">
              No projects yet
            </h2>
            <p className="text-gray-400 mb-6">
              Create your first project to get started
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded font-medium"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={() => navigate(`/editor/${project.id}`)}
                onDelete={() => deleteProject.mutate(project.id)}
              />
            ))}
          </div>
        )}
      </main>
      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
    </div>
  );
}
