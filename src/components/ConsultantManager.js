import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ConsultantManager = ({ onClose, onConsultantCreated }) => {
  const [newConsultantName, setNewConsultantName] = useState('');
  const [newConsultantEmail, setNewConsultantEmail] = useState('');
  const [error, setError] = useState(null);

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

      if (authError) throw authError;

      // Crear el consultor en la tabla de consultants
      const { data, error } = await supabase
        .from('consultants')
        .insert([
          { 
            user_id: authData.user.id,
            name: newConsultantName, 
            email: newConsultantEmail
          }
        ])
        .select();

      if (error) throw error;

      console.log(`Correo de invitación enviado a ${newConsultantEmail}`);
      onConsultantCreated(data[0]);
      onClose();
    } catch (error) {
      setError('No se pudo crear el consultor. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Crear Nuevo Consultor</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
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
        <button onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
};

export default ConsultantManager;