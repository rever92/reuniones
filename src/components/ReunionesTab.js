import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Popup from './Popup';
import '../styles/ReunionesTab.css';

const ReunionesTab = ({ project, userRole, consultant }) => {
  const [reuniones, setReuniones] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentReunion, setCurrentReunion] = useState(null);

  useEffect(() => {
    fetchReuniones();
    fetchConsultants();
  }, [project.id, consultant?.id, userRole]);

  const fetchReuniones = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('meetings')
        .select(`
          *,
          meeting_participants (consultant_id, consultants(id, name))
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

  const fetchConsultants = async () => {
    try {
      const { data, error } = await supabase
        .from('project_consultants')
        .select('consultant_id, consultants(id, name)')
        .eq('project_id', project.id);

      if (error) throw error;

      setConsultants(data.map(item => item.consultants));
    } catch (error) {
      console.error('Error fetching consultants:', error);
    }
  };

  const handleEditReunion = (reunion) => {
    setCurrentReunion(reunion);
    setIsPopupOpen(true);
  };

  const handleSaveReunion = async (updatedReunion) => {
    try {
      let savedReunion;
      if (updatedReunion.id) {
        // Actualizar reunión existente
        const { data, error } = await supabase
          .from('meetings')
          .update({ name: updatedReunion.name, duration: updatedReunion.duration })
          .eq('id', updatedReunion.id)
          .select();
        if (error) throw error;
        savedReunion = data[0];
      } else {
        // Crear nueva reunión
        const { data, error } = await supabase
          .from('meetings')
          .insert([{ name: updatedReunion.name, duration: updatedReunion.duration, project_id: project.id }])
          .select();
        if (error) throw error;
        savedReunion = data[0];
      }

      // Actualizar participantes
      if (savedReunion.id) {
        await supabase
          .from('meeting_participants')
          .delete()
          .eq('meeting_id', savedReunion.id);

        const newParticipants = updatedReunion.participants.map(consultantId => ({
          meeting_id: savedReunion.id,
          consultant_id: consultantId
        }));

        if (newParticipants.length > 0) {
          const { error: insertError } = await supabase
            .from('meeting_participants')
            .insert(newParticipants);

          if (insertError) throw insertError;
        }
      }

      setIsPopupOpen(false);
      fetchReuniones();
    } catch (error) {
      console.error('Error saving reunion:', error);
      setError('No se pudo guardar la reunión. Por favor, intenta de nuevo.');
    }
  };

  const handleDeleteReunion = async (reunionId) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', reunionId);

      if (error) throw error;

      fetchReuniones();
    } catch (error) {
      console.error('Error deleting reunion:', error);
      setError('No se pudo eliminar la reunión. Por favor, intenta de nuevo.');
    }
  };

  if (isLoading) return <p>Cargando reuniones...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="card reuniones-container">
      <h2>Reuniones del Proyecto</h2>
      {userRole === 'director' && (
        <button className="btn btn-primary" onClick={() => handleEditReunion({ name: '', duration: 30, participants: [] })}>
          Crear Nueva Reunión
        </button>
      )}
      <table className="reuniones-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Duración</th>
            <th>Participantes</th>
            {userRole === 'director' && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {reuniones.map(reunion => (
            <tr key={reunion.id}>
              <td>{reunion.name}</td>
              <td>{reunion.duration} minutos</td>
              <td>
                {reunion.meeting_participants.map(mp => mp.consultants.name).join(', ')}
              </td>
              {userRole === 'director' && (
                <td>
                  <button className="btn btn-secondary" onClick={() => handleEditReunion(reunion)}>Editar</button>
                  <button className="btn btn-secondary" onClick={() => handleDeleteReunion(reunion.id)}>Eliminar</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <EditReunionForm
          reunion={currentReunion || { name: '', duration: 30, participants: [] }}
          consultants={consultants}
          onSave={handleSaveReunion}
          onCancel={() => setIsPopupOpen(false)}
          project={project}
        />
      </Popup>
    </div>
  );
};

const EditReunionForm = ({ reunion, consultants, onSave, onCancel, project }) => {
  const [name, setName] = useState(reunion.name);
  const [duration, setDuration] = useState(reunion.duration);
  const [participants, setParticipants] = useState(
    reunion.meeting_participants?.map(mp => mp.consultant_id) || []
  );
  const [selectedDateTime, setSelectedDateTime] = useState(reunion.scheduled_at || null);
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [participants, duration]);

  const fetchAvailableSlots = async () => {
    if (participants.length === 0 || !duration) return;

    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 4);

      const { data: availabilities, error } = await supabase
        .from('availabilities')
        .select('*')
        .in('consultant_id', participants)
        .eq('project_id', project.id)
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0]);

      if (error) throw error;

      const availabilityMap = {};
      availabilities.forEach(av => {
        if (!availabilityMap[av.date]) availabilityMap[av.date] = {};
        if (!availabilityMap[av.date][av.consultant_id]) availabilityMap[av.date][av.consultant_id] = {};
        availabilityMap[av.date][av.consultant_id][av.time] = av.is_available;
      });

      const slots = [];
      for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        for (let hour = 8; hour < 18; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            let isAvailable = true;
            for (let i = 0; i < duration / 30; i++) {
              const checkTime = new Date(d.getTime() + (hour * 60 + minute + i * 30) * 60000);
              const checkTimeStr = `${checkTime.getHours().toString().padStart(2, '0')}:${checkTime.getMinutes().toString().padStart(2, '0')}`;
              if (checkTime.getHours() >= 18) {
                isAvailable = false;
                break;
              }
              for (const participantId of participants) {
                if (!availabilityMap[dateStr]?.[participantId]?.[checkTimeStr]) {
                  isAvailable = false;
                  break;
                }
              }
              if (!isAvailable) break;
            }
            if (isAvailable) {
              slots.push({
                datetime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).toISOString()
              });
            }
          }
        }
      }

      setAvailableSlots(slots);
      console.log('Available slots:', slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...reunion, name, duration, participants, scheduled_at: selectedDateTime });
  };

  const toggleParticipant = (consultantId) => {
    setParticipants(prev =>
      prev.includes(consultantId)
        ? prev.filter(id => id !== consultantId)
        : [...prev, consultantId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="edit-reunion-form">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la reunión"
        required
        className="form-control"
      />
      <select
        value={duration}
        onChange={(e) => setDuration(parseInt(e.target.value))}
        className="form-control"
      >
        {[30, 60, 90, 120].map(d => (
          <option key={d} value={d}>{d} minutos</option>
        ))}
      </select>
      <h4>Participantes:</h4>
      <div className="participants-list">
        {consultants.map(consultant => (
          <label key={consultant.id} className="checkbox-label">
            <input
              type="checkbox"
              checked={participants.includes(consultant.id)}
              onChange={() => toggleParticipant(consultant.id)}
            />
            {consultant.name}
          </label>
        ))}
      </div>
      <h4>Horarios disponibles:</h4>
      <select
        value={selectedDateTime}
        onChange={(e) => setSelectedDateTime(e.target.value)}
        className="form-control"
      >
        <option value="">Seleccione un horario</option>
        {availableSlots.map((slot, index) => (
          <option key={index} value={slot.datetime}>
            {new Date(slot.datetime).toLocaleString()}
          </option>
        ))}
      </select>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Guardar</button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancelar</button>
      </div>
    </form>
  );
};

export default ReunionesTab;