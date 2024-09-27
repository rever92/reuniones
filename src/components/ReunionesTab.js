import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Popup from './Popup';


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
      let { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_participants (
            consultant_id,
            consultants (id, name, role)
          )
        `)
        .eq('project_id', project.id);

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
      let { data, error } = await supabase
        .from('project_consultants')
        .select(`
          consultant_id,
          role,
          consultants (id, name, role, email, area)
        `)
        .eq('project_id', project.id);

      if (error) throw error;

      const formattedConsultants = data.map(item => ({
        id: item.consultants.id,
        name: item.consultants.name,
        role: item.consultants.role,
        email: item.consultants.email,
        area: item.consultants.area,
        projectRole: item.role
      }));

      console.log('Fetched consultants:', formattedConsultants);
      setConsultants(formattedConsultants);
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
          .update({
            name: updatedReunion.name,
            duration: updatedReunion.duration,
            scheduled_at: updatedReunion.scheduled_at
          })
          .eq('id', updatedReunion.id)
          .select();
        if (error) throw error;
        savedReunion = data[0];
      } else {
        // Crear nueva reunión
        const { data, error } = await supabase
          .from('meetings')
          .insert([{
            name: updatedReunion.name,
            duration: updatedReunion.duration,
            scheduled_at: updatedReunion.scheduled_at,
            project_id: project.id
          }])
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
            <th>Clientes</th>
            <th>Consultores</th>
            <th>Fecha y hora</th>
            {userRole === 'director' && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {reuniones.map(reunion => (
            <tr key={reunion.id}>
              <td>{reunion.name}</td>
              <td>{reunion.duration} minutos</td>
              <td>
                {reunion.meeting_participants
                  .filter(mp => consultants.find(c => c.id === mp.consultant_id && c.role === 'client'))
                  .map(mp => {
                    const consultant = consultants.find(c => c.id === mp.consultant_id);
                    return `${consultant.name} (${consultant.area})`;
                  })
                  .join(', ')}
              </td>
              <td>
                {reunion.meeting_participants
                  .filter(mp => consultants.find(c => c.id === mp.consultant_id && c.role === 'consultant'))
                  .map(mp => {
                    const consultant = consultants.find(c => c.id === mp.consultant_id);
                    return `${consultant.name} (${consultant.area})`;
                  })
                  .join(', ')}
              </td>
              <td>
                {reunion.scheduled_at ? new Date(reunion.scheduled_at).toLocaleString() : "Sin definir"}
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
  const [selectedDateTime, setSelectedDateTime] = useState(reunion.scheduled_at || '');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  

  const toggleParticipant = (consultantId) => {
    setParticipants(prev => {
      const newParticipants = prev.includes(consultantId)
        ? prev.filter(id => id !== consultantId)
        : [...prev, consultantId];
      return newParticipants;
    });
  };

  // const fetchAvailableSlots = async () => {
  //   console.log('fetchAvailableSlots called');
  //   console.log('Current participants:', participants);
  //   console.log('Current duration:', duration);

  //   if (participants.length === 0 || !duration) {
  //     console.log('No participants or duration set, clearing available slots');
  //     setAvailableSlots([]);
  //     return;
  //   }

  //   setIsLoading(true);
  //   try {
  //     const startDate = new Date();
  //     startDate.setHours(0, 0, 0, 0);
  //     const endDate = new Date(startDate);
  //     endDate.setFullYear(endDate.getFullYear() + 1); // Buscar disponibilidad hasta un año en el futuro

  //     console.log('Fetching availabilities for date range:', startDate, 'to', endDate);

  //     const { data: availabilities, error } = await supabase
  //       .from('availabilities')
  //       .select('*')
  //       .in('consultant_id', participants)
  //       .eq('project_id', project.id)
  //       .gte('date', startDate.toISOString().split('T')[0])
  //       .lte('date', endDate.toISOString().split('T')[0]);

  //     if (error) throw error;

  //     console.log('Fetched availabilities:', availabilities);

  //     const availabilityMap = {};
  //     availabilities.forEach(av => {
  //       if (!availabilityMap[av.date]) availabilityMap[av.date] = {};
  //       if (!availabilityMap[av.date][av.consultant_id]) availabilityMap[av.date][av.consultant_id] = {};
  //       availabilityMap[av.date][av.consultant_id][av.time] = av.is_available;
  //     });

  //     console.log('Availability map:', availabilityMap);

  //     const slots = [];
  //     for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  //       const dateStr = d.toISOString().split('T')[0];
  //       // console.log('Checking date:', dateStr);
  //       for (let hour = 8; hour < 18; hour++) {
  //         for (let minute = 0; minute < 60; minute += 30) {
  //           const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  //           // console.log('Checking time:', timeStr);
  //           let isAvailable = true;
  //           for (let i = 0; i < duration / 30; i++) {
  //             const checkTime = new Date(d.getTime() + (hour * 60 + minute + i * 30) * 60000);
  //             const checkTimeStr = `${checkTime.getHours().toString().padStart(2, '0')}:${checkTime.getMinutes().toString().padStart(2, '0')}:00`;
  //             if (checkTime.getHours() >= 18) {
  //               // console.log('Time exceeds 18:00, not available');
  //               isAvailable = false;
  //               break;
  //             }
  //             for (const participantId of participants) {
  //               if (!availabilityMap[dateStr]?.[participantId]?.[checkTimeStr]) {
  //                 // console.log(`Not available: date=${dateStr}, time=${checkTimeStr}, participant=${participantId}`);
  //                 isAvailable = false;
  //                 break;
  //               }
  //             }
  //             if (!isAvailable) break;
  //           }
  //           if (isAvailable) {
  //             console.log(`Available slot found: date=${dateStr}, time=${timeStr}`);
  //             slots.push({
  //               datetime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).toISOString()
  //             });
  //           }
  //         }
  //       }
  //     }

  //     console.log('Final available slots:', slots);
  //     setAvailableSlots(slots);
  //   } catch (error) {
  //     console.error('Error fetching available slots:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const fetchAvailableSlots = async () => {
    console.log('fetchAvailableSlots called');
    console.log('Current participants:', participants);
    console.log('Current duration:', duration);
  
    if (participants.length === 0 || !duration) {
      console.log('No participants or duration set, clearing available slots');
      setAvailableSlots([]);
      return;
    }
  
    setIsLoading(true);
    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1); // Buscar disponibilidad hasta un año en el futuro
  
      console.log('Fetching availabilities for date range:', startDate, 'to', endDate);
  
      // Fetch availabilities
      const { data: availabilities, error: availabilitiesError } = await supabase
        .from('availabilities')
        .select('*')
        .in('consultant_id', participants)
        .eq('project_id', project.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
  
      if (availabilitiesError) throw availabilitiesError;
  
      // Fetch existing meetings for the participants
      const { data: existingMeetings, error: meetingsError } = await supabase
        .from('meetings')
        .select(`
          id,
          scheduled_at,
          duration,
          meeting_participants (consultant_id)
        `)
        .eq('project_id', project.id)
        .gte('scheduled_at', startDate.toISOString())
        .lt('scheduled_at', endDate.toISOString())
        .in('meeting_participants.consultant_id', participants);
  
      if (meetingsError) throw meetingsError;
  
      console.log('Fetched availabilities:', availabilities);
      console.log('Fetched existing meetings:', existingMeetings);
  
      const availabilityMap = {};
      availabilities.forEach(av => {
        if (!availabilityMap[av.date]) availabilityMap[av.date] = {};
        if (!availabilityMap[av.date][av.consultant_id]) availabilityMap[av.date][av.consultant_id] = {};
        availabilityMap[av.date][av.consultant_id][av.time] = av.is_available;
      });
  
      // Create a map of existing meetings
      const meetingsMap = {};
      existingMeetings.forEach(meeting => {
        const meetingStart = new Date(meeting.scheduled_at);
        const meetingEnd = new Date(meetingStart.getTime() + meeting.duration * 60000);
        meeting.meeting_participants.forEach(participant => {
          if (!meetingsMap[participant.consultant_id]) {
            meetingsMap[participant.consultant_id] = [];
          }
          meetingsMap[participant.consultant_id].push({ start: meetingStart, end: meetingEnd });
        });
      });
  
      console.log('Availability map:', availabilityMap);
      console.log('Meetings map:', meetingsMap);
  
      const slots = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        for (let hour = 8; hour < 18; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            let isAvailable = true;
            for (let i = 0; i < duration / 30; i++) {
              const checkTime = new Date(d.getTime() + (hour * 60 + minute + i * 30) * 60000);
              const checkTimeStr = `${checkTime.getHours().toString().padStart(2, '0')}:${checkTime.getMinutes().toString().padStart(2, '0')}:00`;
              if (checkTime.getHours() >= 18) {
                isAvailable = false;
                break;
              }
              for (const participantId of participants) {
                if (!availabilityMap[dateStr]?.[participantId]?.[checkTimeStr]) {
                  isAvailable = false;
                  break;
                }
                // Check if the participant has a meeting at this time
                const participantMeetings = meetingsMap[participantId] || [];
                if (participantMeetings.some(meeting => 
                  checkTime >= meeting.start && checkTime < meeting.end
                )) {
                  isAvailable = false;
                  break;
                }
              }
              if (!isAvailable) break;
            }
            if (isAvailable) {
              console.log(`Available slot found: date=${dateStr}, time=${timeStr}`);
              slots.push({
                datetime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).toISOString()
              });
            }
          }
        }
      }
  
      console.log('Final available slots:', slots);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered');
    console.log('Current participants:', participants);
    console.log('Current duration:', duration);
    fetchAvailableSlots();
  }, [participants, duration]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...reunion, name, duration, participants, scheduled_at: selectedDateTime });
  };

  // console.log("Consultants EditReunion: ", consultants)

  const clientes = consultants.filter(c => c.role === 'client');
  const consultoresInternos = consultants.filter(c => c.role === 'consultant');

  console.log('Clientes:', clientes);
  console.log('Consultores internos:', consultoresInternos);

  return (
    <form onSubmit={handleSubmit} className="edit-reunion-form">
      <div className="form-group">
        <label htmlFor="reunion-name">Nombre de la reunión:</label>
        <input
          id="reunion-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la reunión"
          required
          className="form-control"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="reunion-duration">Duración:</label>
        <select
          id="reunion-duration"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          className="form-control"
        >
          {[30, 60, 90, 120].map(d => (
            <option key={d} value={d}>{d} minutos</option>
          ))}
        </select>
      </div>

      <div className="participants-section">
        <h4>Clientes:</h4>
        <div className="participants-list">
          {clientes.map(cliente => (
            <label key={cliente.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={participants.includes(cliente.id)}
                onChange={() => toggleParticipant(cliente.id)}
              />
              {cliente.name} ({cliente.area})
            </label>
          ))}
        </div>

        <h4>Consultores:</h4>
        <div className="participants-list">
          {consultoresInternos.map(consultor => (
            <label key={consultor.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={participants.includes(consultor.id)}
                onChange={() => toggleParticipant(consultor.id)}
              />
              {consultor.name} ({consultor.area})
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <h4>Horarios disponibles:</h4>
        {isLoading ? (
          <p>Cargando horarios disponibles...</p>
        ) : (
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
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Guardar</button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancelar</button>
      </div>
    </form>
  );
};

export default ReunionesTab;