import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const ProjectManager = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.id) {
      console.log("User detected, fetching data...");
      fetchProjects();
      checkUserRole();
    } else {
      console.log("No user detected");
      setError("Error: Usuario no válido");
      setIsLoading(false);
    }
  }, [user]);

  const checkUserRole = async () => {
    try {
      console.log("Checking user role...");
      const { data, error } = await supabase
        .from('consultants')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log("Error checking user role:", error);
        throw error;
      }

      console.log("User role data:", data);
      setIsAdmin(data.role === 'admin');
      setUserRole(data.role);
    } catch (error) {
      console.error('Error checking user role:', error);
      setError('Error al verificar el rol del usuario');
    }
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching projects...");
      const { data: consultantData, error: consultantError } = await supabase
        .from('consultants')
        .select('id')
        .eq('user_id', user.id)
        .single();
  
      if (consultantError) {
        console.log("Error fetching consultant data:", consultantError);
        if (consultantError.code !== 'PGRST116') {
          throw consultantError;
        } else {
          console.log("User is not a consultant");
        }
      }
  
      let projectsData;
      if (consultantData) {
        console.log("Fetching projects for consultant");
        const { data, error } = await supabase
          .from('project_consultants')
          .select(`
            project_id,
            projects:project_id (
              id,
              name,
              created_at
            )
          `)
          .eq('consultant_id', consultantData.id);
  
        if (error) throw error;
        projectsData = data.map(item => item.projects).filter(Boolean);
      } else {
        console.log("Fetching all projects");
        const { data, error } = await supabase
          .from('projects')
          .select('*');
  
        if (error) throw error;
        projectsData = data;
      }
  
      console.log("Projects data:", projectsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching projects:', error);
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
      const { data, error } = await supabase.rpc('create_project_and_assign_director', {
        project_name: newProjectName,
        auth_user_id: user.id  // Cambiado de user_id a auth_user_id
      });
  
      if (error) throw error;
  
      console.log('Project created successfully:', data);
      setNewProjectName('');
      fetchProjects();  // Actualizar la lista de proyectos
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
          {projects.length === 0 ? (
            <p>No tienes proyectos asignados.</p>
          ) : (
            projects.map(project => (
              <div key={project.id} className="project-card" onClick={() => handleProjectClick(project.id)}>
                <h3>{project.name}</h3>
                <p>Creado el: {new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
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
      {/* <p>Role del usuario: {userRole || 'No definido'}</p> */}
    </div>
  );
};

export default ProjectManager;