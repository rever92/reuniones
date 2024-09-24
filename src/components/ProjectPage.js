import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ConsultoresTab from './ConsultoresTab';
import ReunionesTab from './ReunionesTab';
import DisponibilidadTab from './DisponibilidadTab';
import Popup from './Popup';
import ConsultantManager from './ConsultantManager';
import TabNavigation from './TabNavigation';

const ProjectPage = ({ user }) => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [consultant, setConsultant] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('consultores');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

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
        console.log('User role fetched:', data.role);
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setError('Error al obtener el rol del usuario');
    }
  };

  const handleConsultantCreated = (newConsultant) => {
    setIsPopupOpen(false);
    // Aquí puedes agregar lógica adicional si es necesario
  };


  const renderActiveTab = () => {
    switch (activeTab) {
      case 'consultores':
        return (
          <ConsultoresTab
            project={project}
            userRole={userRole}
            consultant={consultant}
            onNewConsultant={() => setIsPopupOpen(true)}
          />
        );
      case 'reuniones':
        return (
          <ReunionesTab
            project={project}
            userRole={userRole}
            consultant={consultant}
          />
        );
      case 'disponibilidad':
        return (
          <DisponibilidadTab
            project={project}
            userRole={userRole}
            consultant={consultant}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) return <p>Cargando proyecto...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!project) return <p>No se encontró el proyecto.</p>;

  return (
    <div className="project-page">
      <h1>{project.name}</h1>
      <p className="project-date">Creado el: {new Date(project.created_at).toLocaleDateString()}</p>
      <TabNavigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
      />
      <div className="tab-content">
        {renderActiveTab()}
      </div>

      <Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <ConsultantManager
          user={user}
          onClose={() => setIsPopupOpen(false)}
          onConsultantCreated={handleConsultantCreated}
        />
      </Popup>
    </div>
  );
};

export default ProjectPage;