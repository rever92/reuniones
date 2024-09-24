import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const UserManager = ({ project, onClose, onUserCreated }) => {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserArea, setNewUserArea] = useState('');
  const [newUserRole, setNewUserRole] = useState('consultant');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [project.id]);

  const fetchUsers = async () => {
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
  };

  const createUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserArea.trim()) return;
  
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: Math.random().toString(36).slice(-8),
        options: {
          data: {
            full_name: newUserName
          },
          emailRedirectTo: `${window.location.origin}/setup-password`
        }
      });
  
      if (authError) throw authError;
  
      const { error: insertError } = await supabase
        .from('consultants')
        .insert([
          { 
            user_id: authData.user.id, 
            name: newUserName, 
            email: newUserEmail, 
            role: newUserRole,
            area: newUserArea
          }
        ]);

      if (insertError) throw insertError;

      await supabase
        .from('project_consultants')
        .insert([
          { project_id: project.id, consultant_id: authData.user.id, role: newUserRole }
        ]);
  
      console.log(`Correo de invitación enviado a ${newUserEmail}`);
      fetchUsers();
      setNewUserName('');
      setNewUserEmail('');
      setNewUserArea('');
      setNewUserRole('consultant');
      if (onUserCreated) onUserCreated();
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message || 'No se pudo crear el usuario. Por favor, intenta de nuevo.');
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
    <div className="modal">
      <div className="modal-content">
        <h2>Gestión de Usuarios del Proyecto</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={createUser}>
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Nombre del usuario"
            required
          />
          <input
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="Email del usuario"
            required
          />
          <input
            type="text"
            value={newUserArea}
            onChange={(e) => setNewUserArea(e.target.value)}
            placeholder="Área del usuario"
            required
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            required
          >
            <option value="consultant">Consultor</option>
            <option value="client">Cliente</option>
          </select>
          <button type="submit">Crear Usuario</button>
        </form>
        <h3>Lista de Usuarios del Proyecto</h3>
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.name} ({user.email}) - {user.area} - {user.role}
              <button onClick={() => deleteUser(user.id)}>Eliminar del Proyecto</button>
            </li>
          ))}
        </ul>
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

export default UserManager;