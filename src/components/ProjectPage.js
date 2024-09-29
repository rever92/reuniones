import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ConsultoresTab from './ConsultoresTab';
import ReunionesTab from './ReunionesTab';
import DisponibilidadTab from './DisponibilidadTab';
import Popup from './Popup';
import UserManager from './UserManager';
import TabNavigation from './TabNavigation';
import { Typography, Container, Box, Paper, Snackbar } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
}));

const ProjectPage = ({ user }) => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [consultant, setConsultant] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('consultores');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

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

  const handleConsultantCreated = useCallback(() => {
    setIsPopupOpen(false);
    setRefreshTrigger(prev => prev + 1);
    setSnackbarMessage('Nuevo consultor añadido con éxito');
    setSnackbarOpen(true);
  }, []);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'consultores':
        return (
          <ConsultoresTab
            project={project}
            userRole={userRole}
            consultant={consultant}
            onNewConsultant={() => setIsPopupOpen(true)}
            refreshTrigger={refreshTrigger}
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

  if (isLoading) return <Typography>Cargando proyecto...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!project) return <Typography>No se encontró el proyecto.</Typography>;

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <StyledPaper elevation={3}>
          <Typography variant="h3" component="h1" gutterBottom>
            {project.name}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Creado el: {new Date(project.created_at).toLocaleDateString()}
          </Typography>
        </StyledPaper>
        
        <TabNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
        />
        
        <StyledPaper elevation={3}>
          {renderActiveTab()}
        </StyledPaper>
      </Box>

      <Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <UserManager
          project={project}
          onClose={() => setIsPopupOpen(false)}
          onUserCreated={handleConsultantCreated}
        />
      </Popup>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};
export default ProjectPage;