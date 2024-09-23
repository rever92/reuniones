import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ConsultoresTab from './ConsultoresTab';
import ReunionesTab from './ReunionesTab';
import DisponibilidadTab from './DisponibilidadTab';

const ProjectPage = ({ user }) => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [consultant, setConsultant] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('consultores');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchProject();
      fetchConsultant();
    }
  }, [projectId, user]);

  useEffect(() => {
    if (consultant) {
      fetchUserRole();
    }
  }, [consultant, projectId]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      console.log('Fetched project:', data);
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('No se pudo cargar el proyecto. Por favor, intenta de nuevo.');
    }
  };

  const fetchConsultant = async () => {
    try {
      const { data, error } = await supabase
        .from('consultants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('User is not a consultant');
          setConsultant(null);
        } else {
          throw error;
        }
      } else {
        console.log('Fetched consultant:', data);
        setConsultant(data);
      }
    } catch (error) {
      console.error('Error fetching consultant:', error);
      setError('No se pudo cargar la información del consultor.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRole = async () => {
    if (!consultant) {
      setUserRole('No es consultor');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('project_consultants')
        .select('role')
        .eq('project_id', projectId)
        .eq('consultant_id', consultant.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('User has no role in this project');
          setUserRole('No asignado');
        } else {
          throw error;
        }
      } else {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setError('Error al obtener el rol del usuario');
    }
  };

  if (isLoading) return <p>Cargando proyecto...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!project) return <p>No se encontró el proyecto.</p>;

  return (
    <div className="project-page">
      <h1>Proyecto: {project.name}</h1>
      <p>Creado el: {new Date(project.created_at).toLocaleDateString()}</p>
      
      <div className="tabs">
        <button onClick={() => setActiveTab('consultores')}>Consultores</button>
        <button onClick={() => setActiveTab('reuniones')}>Reuniones</button>
        <button onClick={() => setActiveTab('disponibilidad')}>Disponibilidad</button>
      </div>

      {activeTab === 'consultores' && (
        <ConsultoresTab 
          project={project} 
          userRole={userRole} 
          consultant={consultant}
        />
      )}
      {activeTab === 'reuniones' && (
        <ReunionesTab 
          project={project} 
          userRole={userRole} 
          consultant={consultant}
        />
      )}
      {activeTab === 'disponibilidad' && (
        <DisponibilidadTab 
          project={project} 
          userRole={userRole} 
          consultant={consultant}
        />
      )}
    </div>
  );
};

export default ProjectPage;