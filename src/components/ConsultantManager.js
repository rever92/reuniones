import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ConsultantManager = ({ user, onClose, onConsultantCreated }) => {
  const [newConsultantName, setNewConsultantName] = useState('');
  const [newConsultantEmail, setNewConsultantEmail] = useState('');
  const [error, setError] = useState(null);
  const [consultants, setConsultants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.id) {
      checkAdminStatus();
      fetchConsultants();
    } else {
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
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConsultants = async () => {
    try {
      const { data, error } = await supabase
        .from('consultants')
        .select('*');

      if (error) throw error;
      setConsultants(data);
    } catch (error) {
      console.error('Error fetching consultants:', error);
    }
  };

  const createConsultant = async (e) => {
    e.preventDefault();
    if (!newConsultantName.trim() || !newConsultantEmail.trim()) return;

    setError(null);
    try {
      // Crear un nuevo usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newConsultantEmail,
        password: Math.random().toString(36).slice(-8), // Contraseña temporal
      });

      if (authError) {
        if (authError.status === 429) {
          throw new Error('Se han realizado demasiadas solicitudes. Por favor, intenta más tarde.');
        }
        throw authError;
      }

      // Crear el consultor en la tabla de consultants
      const { data, error } = await supabase
        .from('consultants')
        .insert([
          { 
            user_id: authData.user.id,
            name: newConsultantName, 
            email: newConsultantEmail,
            role: 'consultant'
          }
        ])
        .select();

      if (error) throw error;

      console.log(`Correo de invitación enviado a ${newConsultantEmail}`);
      onConsultantCreated(data[0]);
      fetchConsultants();  // Actualizar la lista de consultores
      setNewConsultantName('');
      setNewConsultantEmail('');
    } catch (error) {
      console.error('Error creating consultant:', error);
      setError(error.message || 'No se pudo crear el consultor. Por favor, intenta de nuevo.');
    }
  };

  const deleteConsultant = async (id) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('consultants')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchConsultants();  // Actualizar la lista de consultores
    } catch (error) {
      console.error('Error deleting consultant:', error);
    }
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Gestión de Consultores</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {isAdmin && (
          <form onSubmit={createConsultant}>
            <input
              type="text"
              value={newConsultantName}
              onChange={(e) => setNewConsultantName(e.target.value)}
              placeholder="Nombre del consultor"
            />
            <input
              type="email"
              value={newConsultantEmail}
              onChange={(e) => setNewConsultantEmail(e.target.value)}
              placeholder="Email del consultor"
            />
            <button type="submit">Crear Consultor</button>
          </form>
        )}
        <h3>Lista de Consultores</h3>
        <ul>
          {consultants.map(consultant => (
            <li key={consultant.id}>
              {consultant.name} ({consultant.email})
              {isAdmin && (
                <button onClick={() => deleteConsultant(consultant.id)}>Eliminar</button>
              )}
            </li>
          ))}
        </ul>
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

export default ConsultantManager;