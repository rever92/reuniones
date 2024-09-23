import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ConsultantManager from './ConsultantManager';

const ConsultoresTab = ({ project, userRole, consultant }) => {
  const [consultants, setConsultants] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showNewConsultantModal, setShowNewConsultantModal] = useState(false);
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
    const { error } = await supabase
      .from('project_consultants')
      .insert({ project_id: project.id, consultant_id: consultantId, role: 'consultant' });

    if (error) {
      console.error('Error assigning consultant:', error);
    } else {
      fetchConsultants();
      setSearchResults([]);
    }
  };

  return (
    <div>
      <h2>Consultores del Proyecto</h2>
      {userRole === 'director' && (
        <>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar consultores..."
          />
          <button onClick={searchConsultants}>Buscar</button>
          <button onClick={() => setShowNewConsultantModal(true)}>Nuevo Consultor</button>
        </>
      )}
      <ul>
        {consultants.map(c => (
          <li key={c.id}>{c.name} - {c.email}</li>
        ))}
      </ul>
      {searchResults.length > 0 && (
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
      {showNewConsultantModal && (
        <ConsultantManager
          onClose={() => setShowNewConsultantModal(false)}
          onConsultantCreated={(newConsultant) => {
            assignConsultant(newConsultant.id);
            setShowNewConsultantModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ConsultoresTab;