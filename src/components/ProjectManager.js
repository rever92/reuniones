import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const ProjectManager = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.id) {
      fetchProjects();
      checkAdminStatus();
    } else {
      setError("Error: Usuario no válido");
      setIsLoading(false);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('consultants')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setIsAdmin(data.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let { data, error, status } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id);

      if (error && status !== 406) throw error;

      if (data === null) {
        setProjects([]);
      } else {
        setProjects(data);
      }
    } catch (error) {
      setError('No se pudieron cargar los proyectos. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim() || !isAdmin) return;
  
    setError(null);
    try {
      console.log('Creating project with:', { project_name: newProjectName, user_id: user.id });
      const { data, error } = await supabase.rpc('create_project_and_assign_director', {
        project_name: newProjectName,
        user_id: user.id
      });
  
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
  
      console.log('Project created successfully:', data);
      setNewProjectName('');
      setProjects(prevProjects => [...prevProjects, data]);
    } catch (error) {
      console.error('Error creating project:', error);
      setError('No se pudo crear el proyecto. Por favor, intenta de nuevo.');
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="project-manager">
      <h2>Mis Proyectos</h2>
      {isLoading ? (
        <p>Cargando proyectos...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div className="project-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card" onClick={() => handleProjectClick(project.id)}>
              <h3>{project.name}</h3>
              <p>Creado el: {new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
      {isAdmin && (
        <form onSubmit={createProject}>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Nombre del nuevo proyecto"
          />
          <button type="submit">Crear Proyecto</button>
        </form>
      )}
    </div>
  );
};

export default ProjectManager;