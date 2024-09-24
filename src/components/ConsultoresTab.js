import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/ConsultoresTab.css';

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
    <div className="card consultores-container">
      <h2>Consultores del Proyecto</h2>
      <ul className="consultores-list">
        {consultants.map(c => (
          <li key={c.id} className="consultor-item">
            <span>{c.name} - {c.email}</span>
          </li>
        ))}
      </ul>
      {userRole === 'director' && (
        <div className="search-bar">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar consultores..."
            className="form-control"
          />
          <button onClick={searchConsultants} className="btn btn-primary">Buscar</button>
          <button onClick={onNewConsultant} className="btn btn-secondary">Nuevo Consultor</button>
        </div>
      )}
      {searchResults.length > 0 && userRole === 'director' && (
        <div className="search-results">
          <h3>Resultados de búsqueda:</h3>
          <ul className="consultores-list">
            {searchResults.map(c => (
              <li key={c.id} className="consultor-item">
                <span>{c.name} - {c.email}</span>
                <button onClick={() => assignConsultant(c.id)} className="btn btn-primary">Asignar al proyecto</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConsultoresTab;