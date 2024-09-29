import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Typography, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledForm = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const UserManager = ({ project, onClose, onUserCreated }) => {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserArea, setNewUserArea] = useState('');
  const [newUserRole, setNewUserRole] = useState('consultant');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('project_consultants')
        .select('consultant_id, consultants(id, name, email, area, role)')
        .eq('project_id', project.id);

      if (error) throw error;
      setUsers(data.map(item => item.consultants));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const checkEmailExists = useCallback(async (email) => {
    const { data, error } = await supabase
      .from('consultants')
      .select('email')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking email:', error);
      return false;
    }

    return !!data;
  }, []);

  const handleEmailChange = async (e) => {
    const email = e.target.value;
    setNewUserEmail(email);
    setEmailError(null);

    if (email) {
      const exists = await checkEmailExists(email);
      if (exists) {
        setEmailError('Este email ya está registrado');
      }
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserArea.trim()) return;
    if (emailError) return;

    setError(null);
    setIsLoading(true);
    try {
      // Verificar una vez más si el email existe
      const exists = await checkEmailExists(newUserEmail);
      if (exists) {
        setEmailError('Este email ya está registrado');
        setIsLoading(false);
        return;
      }

      // 1. Crear el usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: Math.random().toString(36).slice(-8),
        options: {
          data: {
            full_name: newUserName,
            area: newUserArea,
            role: newUserRole
          }
        }
      });

      if (authError) throw authError;

      console.log('Auth Data:', authData);

      // 2. Esperar un momento para que el trigger cree el consultor
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Obtener el consultor recién creado
      let { data: consultantData, error: consultantError } = await supabase
        .from('consultants')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (consultantError) {
        console.error('Error fetching consultant:', consultantError);
        throw consultantError;
      }

      if (!consultantData) {
        console.error('Consultant not found after creation');
        throw new Error('Consultant not found after creation');
      }

      // 4. Actualizar el rol del consultor si es necesario
      if (consultantData.role !== newUserRole) {
        const { data: updatedConsultantData, error: updateError } = await supabase
          .from('consultants')
          .update({ role: newUserRole })
          .eq('id', consultantData.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating consultant role:', updateError);
          throw updateError;
        }
        consultantData = updatedConsultantData;
      }

      // 5. Asignar el consultor al proyecto
      const { error: assignError } = await supabase
        .from('project_consultants')
        .insert({
          project_id: project.id,
          consultant_id: consultantData.id,
          role: newUserRole
        });

      if (assignError) {
        console.error('Error assigning consultant to project:', assignError);
        throw assignError;
      }

      console.log(`Usuario creado y asignado al proyecto: ${newUserEmail}`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserArea('');
      setNewUserRole('consultant');
      if (onUserCreated) onUserCreated();
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message || 'No se pudo crear el usuario. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (id) => {
    try {
      const { error } = await supabase
        .from('project_consultants')
        .delete()
        .eq('consultant_id', id)
        .eq('project_id', project.id);

      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom color="primary">
        Agregar Nuevo Usuario al Proyecto
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <StyledForm onSubmit={createUser}>
        <TextField
          label="Nombre del usuario"
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Email del usuario"
          type="email"
          value={newUserEmail}
          onChange={handleEmailChange}
          required
          fullWidth
          error={!!emailError}
          helperText={emailError}
        />
        <TextField
          label="Área del usuario"
          value={newUserArea}
          onChange={(e) => setNewUserArea(e.target.value)}
          required
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Rol del usuario</InputLabel>
          <Select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            required
          >
            <MenuItem value="consultant">Consultor</MenuItem>
            <MenuItem value="client">Cliente</MenuItem>
          </Select>
        </FormControl>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={isLoading || !!emailError}
          startIcon={isLoading && <CircularProgress size={20} color="inherit" />}
        >
          {isLoading ? 'Creando...' : 'Crear Usuario'}
        </Button>
      </StyledForm>
      <Button onClick={onClose} variant="outlined" color="secondary">
        Cancelar
      </Button>
    </Box>
  );
};

export default UserManager;