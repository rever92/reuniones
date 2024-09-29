import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button, 
  TextField, 
  Tabs, 
  Tab, 
  Box, 
  Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  '& .MuiTableCell-head': {
    color: 'black', // Cambiado a negro para mayor legibilidad
    fontWeight: 'bold',
  },
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTab-root': {
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)', // Gris claro en hover
    },
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

const PinkButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#ff0099',
  color: 'white',
  '&:hover': {
    backgroundColor: '#e5008a',
  },
}));

const ConsultoresTab = ({ project, userRole, consultant, onNewConsultant, refreshTrigger }) => {
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('consultores');
  const [assignedConsultants, setAssignedConsultants] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, [project.id, refreshTrigger]);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('project_consultants')
      .select(`
        consultant_id,
        role,
        consultants (id, name, email, role, area)
      `)
      .eq('project_id', project.id);

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data.map(item => ({ ...item.consultants, projectRole: item.role })));
      setAssignedConsultants(data.map(item => item.consultant_id));
    }
  }, [project.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  const searchConsultants = async () => {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error('Error searching consultants:', error);
    } else {
      setSearchResults(data);
    }
  };

  const assignConsultant = async (consultantId) => {
    if (userRole !== 'director' && consultant.role !== 'admin') {
      console.error('Solo los directores o administradores pueden asignar consultores');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_consultants')
        .insert({ project_id: project.id, consultant_id: consultantId, role: 'consultant' })
        .select();

      if (error) throw error;

      console.log('Consultant assigned successfully:', data);
      fetchUsers();
      setSearchResults([]);
    } catch (error) {
      console.error('Error assigning consultant:', error);
      console.error('Error details:', error.details, error.hint, error.message);
    }
  };

  const removeUserFromProject = async (userId) => {
    try {
      const { error } = await supabase
        .from('project_consultants')
        .delete()
        .eq('consultant_id', userId)
        .eq('project_id', project.id);

      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error removing user from project:', error);
    }
  };


  const renderUserTable = (userType) => (
    <StyledTableContainer component={Paper}>
      <Table>
        <StyledTableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Área</TableCell>
            <TableCell>Rol en el proyecto</TableCell>
            <TableCell>Rol general</TableCell>
            {userRole === 'director' && <TableCell>Acciones</TableCell>}
          </TableRow>
        </StyledTableHead>
        <TableBody>
          {users
            .filter(user => {
              if (userType === 'consultores') {
                return ['consultant', 'admin', 'director'].includes(user.role);
              } else {
                return user.role === 'client';
              }
            })
            .map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.area}</TableCell>
                <TableCell>{user.projectRole}</TableCell>
                <TableCell>{user.role}</TableCell>
                {userRole === 'director' && (
                  <TableCell>
                    <Button 
                      onClick={() => removeUserFromProject(user.id)} 
                      variant="contained" 
                      color="error"
                      size="small"
                    >
                      Quitar del Proyecto
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </StyledTableContainer>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Consultores y Clientes del Proyecto</Typography>
      <StyledTabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label="Consultores" value="consultores" />
        <Tab label="Clientes" value="clientes" />
      </StyledTabs>
      <Box sx={{ mt: 2 }}>
        {renderUserTable(activeTab)}
      </Box>
      {userRole === 'director' && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <TextField
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar consultores..."
            variant="outlined"
            size="small"
            sx={{ mr: 1 }}
          />
          <StyledButton onClick={searchConsultants} variant="contained" color="primary">
            Buscar
          </StyledButton>
          <PinkButton onClick={onNewConsultant} variant="contained">
            Nuevo Usuario
          </PinkButton>
        </Box>
      )}
      {searchResults.map(c => (
        <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 1 }}>
          <Typography>{c.name} - {c.email}</Typography>
          <Button
            onClick={() => assignConsultant(c.id)}
            variant="contained"
            color={assignedConsultants.includes(c.id) ? "secondary" : "primary"}
            disabled={assignedConsultants.includes(c.id)}
          >
            {assignedConsultants.includes(c.id) ? 'Ya asignado' : 'Asignar al proyecto'}
          </Button>
        </Box>
      ))}
    </Box>
  );
};

export default ConsultoresTab;