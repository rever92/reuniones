import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ReunionesTab = ({ project, userRole, consultant }) => {
  const [reuniones, setReuniones] = useState([]);
  const [nuevaReunion, setNuevaReunion] = useState({ nombre: '', duracion: 30 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReuniones();
  }, [project.id, consultant?.id, userRole]);

  const fetchReuniones = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('meetings')
        .select(`
          *,
          meeting_participants (consultant_id)
        `)
        .eq('project_id', project.id);

      if (userRole !== 'director' && consultant) {
        query = query.filter('meeting_participants.consultant_id', 'eq', consultant.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReuniones(data || []);
    } catch (error) {
      console.error('Error fetching reuniones:', error);
      setError('No se pudieron cargar las reuniones. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const crearReunion = async () => {
    if (userRole !== 'director') return;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert([
          { name: nuevaReunion.nombre, duration: nuevaReunion.duracion, project_id: project.id }
        ])
        .select();

      if (error) throw error;

      setReuniones(prevReuniones => [...prevReuniones, data[0]]);
      setNuevaReunion({ nombre: '', duracion: 30 });
    } catch (error) {
      console.error('Error creating reunion:', error);
      setError('No se pudo crear la reunión. Por favor, intenta de nuevo.');
    }
  };

  if (isLoading) return <p>Cargando reuniones...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Reuniones del Proyecto</h2>
      {userRole === 'director' && (
        <div>
          <input
            type="text"
            value={nuevaReunion.nombre}
            onChange={(e) => setNuevaReunion({ ...nuevaReunion, nombre: e.target.value })}
            placeholder="Nombre de la reunión"
          />
          <select
            value={nuevaReunion.duracion}
            onChange={(e) => setNuevaReunion({ ...nuevaReunion, duracion: parseInt(e.target.value) })}
          >
            {[30, 60, 90, 120].map(duracion => (
              <option key={duracion} value={duracion}>{duracion / 60} hora(s)</option>
            ))}
          </select>
          <button onClick={crearReunion}>Crear Reunión</button>
        </div>
      )}
      {reuniones.length > 0 ? (
        <ul>
          {reuniones.map(reunion => (
            <li key={reunion.id}>
              {reunion.name} - {reunion.duration} minutos
              {userRole === 'director' && (
                <button onClick={() => { /* Lógica para asignar consultores */ }}>
                  Asignar Consultores
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay reuniones programadas para este proyecto.</p>
      )}
    </div>
  );
};

export default ReunionesTab;