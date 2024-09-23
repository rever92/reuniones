import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ConsultoresTab = ({ project, userRole, consultant, onNewConsultant }) => {
  const [consultants, setConsultants] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConsultants();
  }, [project.id]);

  const fetchConsultants = async () => {
    const { data, error } = await supabase
      .from('project_consultants')
      .select(`
        consultant_id,
        consultants (id, name, email)
      `)
      .eq('project_id', project.id);

    if (error) {
      console.error('Error fetching consultants:', error);
    } else {
      setConsultants(data.map(item => item.consultants));
    }
  };

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
    console.log('Attempting to assign consultant. User role:', userRole);
    console.log('Project:', project);
    console.log('Consultant:', consultant);
  
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
      fetchConsultants();
      setSearchResults([]);
    } catch (error) {
      console.error('Error assigning consultant:', error);
      console.error('Error details:', error.details, error.hint, error.message);
      // Aquí puedes mostrar un mensaje de error al usuario
    }
  };

  return (
    <div>
      <h2>Consultores del Proyecto</h2>
      <p>User Role: {userRole}</p>
      {userRole === 'director' && (
        <>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar consultores..."
          />
          <button onClick={searchConsultants}>Buscar</button>
          <button onClick={onNewConsultant}>Nuevo Consultor</button>
        </>
      )}
      <ul>
        {consultants.map(c => (
          <li key={c.id}>{c.name} - {c.email}</li>
        ))}
      </ul>
      {searchResults.length > 0 && userRole === 'director' && (
        <div>
          <h3>Resultados de búsqueda:</h3>
          <ul>
            {searchResults.map(c => (
              <li key={c.id}>
                {c.name} - {c.email}
                <button onClick={() => assignConsultant(c.id)}>Asignar al proyecto</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConsultoresTab;