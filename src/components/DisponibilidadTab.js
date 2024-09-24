import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/DisponibilidadTab.css';
import AvailabilityTable from './AvailabilityTable';
import { Box, Typography } from '@mui/material';

const DisponibilidadTab = ({ project, userRole, consultant }) => {
  const [disponibilidad, setDisponibilidad] = useState({});
  const [consultants, setConsultants] = useState([]);
  const [selectedConsultants, setSelectedConsultants] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [selectedReuniones, setSelectedReuniones] = useState([]);
  const [semanaActual, setSemanaActual] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      console.log('Iniciando carga de datos...');
      await Promise.all([
        fetchConsultants(),
        fetchReuniones(),
        fetchDisponibilidad()
      ]);
      setIsLoading(false);
      console.log('Carga de datos completada.');
    };

    fetchAllData();
  }, [project.id, userRole, consultant]);

  const fetchConsultants = async () => {
    try {
      const { data, error } = await supabase
        .from('project_consultants')
        .select('consultant_id, consultants(id, name)')
        .eq('project_id', project.id);

      if (error) throw error;

      const consultantsData = data.map(item => ({
        id: item.consultants.id,
        name: item.consultants.name
      }));

      setConsultants(consultantsData);
      if (userRole !== 'director') {
        setSelectedConsultants([consultant.id]);
      } else {
        setSelectedConsultants(consultantsData.map(c => c.id));
      }
      console.log('Consultants cargados:', consultantsData);
    } catch (error) {
      console.error('Error fetching consultants:', error);
    }
  };

  const fetchReuniones = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, meeting_participants(consultant_id)')
        .eq('project_id', project.id);

      if (error) throw error;

      setReuniones(data || []);
      console.log('Reuniones cargadas:', data);
    } catch (error) {
      console.error('Error fetching reuniones:', error);
    }
  };

  const fetchDisponibilidad = async () => {
    try {
      let query = supabase
        .from('availabilities')
        .select('*')
        .eq('project_id', project.id);

      if (userRole !== 'director') {
        query = query.eq('consultant_id', consultant.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('Datos de disponibilidad crudos:', data);

      const disponibilidadFormateada = {};
      data.forEach(item => {
        if (!disponibilidadFormateada[item.consultant_id]) {
          disponibilidadFormateada[item.consultant_id] = {};
        }
        if (!disponibilidadFormateada[item.consultant_id][item.date]) {
          disponibilidadFormateada[item.consultant_id][item.date] = {};
        }
        disponibilidadFormateada[item.consultant_id][item.date][item.time] = item.is_available;
      });

      console.log('Disponibilidad formateada:', JSON.stringify(disponibilidadFormateada, null, 2));

      setDisponibilidad(disponibilidadFormateada);
    } catch (error) {
      console.error('Error fetching disponibilidad:', error);
    }
  };

  const actualizarDisponibilidad = async (consultantId, fecha, hora) => {
    if (userRole !== 'director' && consultantId !== consultant.id) {
      console.error('No tienes permiso para editar esta disponibilidad');
      return;
    }

    const { fechaFormateada, horaFormateada } = formatearFechaHora(fecha.toISOString(), formatearHora(hora));
    const isAvailable = !estaDisponible(consultantId, fechaFormateada, horaFormateada.slice(0, 5));

    try {
      const { error } = await supabase
        .from('availabilities')
        .upsert([
          {
            consultant_id: consultantId,
            project_id: project.id,
            date: fechaFormateada,
            time: horaFormateada,
            is_available: isAvailable
          }
        ]);

      if (error) throw error;

      setDisponibilidad(prev => ({
        ...prev,
        [consultantId]: {
          ...(prev[consultantId] || {}),
          [fechaFormateada]: {
            ...(prev[consultantId]?.[fechaFormateada] || {}),
            [horaFormateada]: isAvailable
          }
        }
      }));

      console.log(`Disponibilidad actualizada: consultantId=${consultantId}, fecha=${fechaFormateada}, hora=${horaFormateada}, isAvailable=${isAvailable}`);
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const formatearFechaHora = (fecha, hora) => {
    const fechaFormateada = fecha.split('T')[0]; // Extraer solo la parte de la fecha
    const horaFormateada = `${hora.padStart(5, '0')}:00`; // Asegurar que tenga 5 caracteres y agregar :00
    return { fechaFormateada, horaFormateada };
  };

  const estaDisponible = useCallback((consultantId, fecha, hora) => {
    const { fechaFormateada, horaFormateada } = formatearFechaHora(fecha, hora);
    const disponibleConsultant = disponibilidad[consultantId];
    const disponibleFecha = disponibleConsultant?.[fechaFormateada];
    const disponible = !!disponibleFecha?.[horaFormateada];

    console.log(`Verificando disponibilidad:
      consultantId=${consultantId}, 
      fecha=${fechaFormateada}, 
      hora=${horaFormateada}, 
      disponible=${disponible},
      disponibilidadConsultant=${JSON.stringify(disponibleConsultant)},
      disponibilidadFecha=${JSON.stringify(disponibleFecha)}
    `);

    return disponible;
  }, [disponibilidad]);


  const obtenerSemana = (fecha) => {
    const primerDia = new Date(fecha);
    primerDia.setDate(primerDia.getDate() - primerDia.getDay() + 1);
    return Array.from({ length: 5 }, (_, i) => {
      const dia = new Date(primerDia);
      dia.setDate(dia.getDate() + i);
      return dia;
    });
  };

  const cambiarSemana = (incremento) => {
    setSemanaActual(prev => {
      const nuevaFecha = new Date(prev);
      nuevaFecha.setDate(nuevaFecha.getDate() + incremento * 7);
      return nuevaFecha;
    });
  };

  const formatearHora = (hora) => {
    const horas = Math.floor(hora);
    const minutos = Math.round((hora % 1) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };



  const obtenerIniciales = (nombre) => {
    return nombre.split(' ').map(palabra => palabra[0]).join('');
  };

  const encontrarHorariosCompatibles = useMemo(() => {
    const horariosDisponibles = {};

    reuniones.forEach(reunion => {
      const participantes = reunion.meeting_participants.map(mp => mp.consultant_id);
      const bloquesDisponibles = [];

      const fechaActual = new Date(semanaActual);
      fechaActual.setDate(fechaActual.getDate() - fechaActual.getDay() + 1);

      for (let i = 0; i < 5; i++) {
        const fecha = new Date(fechaActual);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];

        for (let horaInicio = 8; horaInicio <= 17 - (reunion.duration / 60); horaInicio += 0.5) {
          let bloqueDisponible = true;
          for (let offset = 0; offset < reunion.duration / 30; offset++) {
            const horaActual = horaInicio + (offset * 0.5);
            const horaStr = formatearHora(horaActual);
            if (!participantes.every(consultantId => estaDisponible(consultantId, fechaStr, horaStr))) {
              bloqueDisponible = false;
              break;
            }
          }

          if (bloqueDisponible) {
            bloquesDisponibles.push({
              fecha: fechaStr,
              inicio: horaInicio,
              fin: horaInicio + (reunion.duration / 60)
            });
          }
        }
      }

      horariosDisponibles[reunion.id] = bloquesDisponibles;
    });

    return horariosDisponibles;
  }, [reuniones, disponibilidad, semanaActual, estaDisponible]);

  const handleReunionSelect = (reunionId) => {
    setSelectedReuniones(prev => {
      const isSelected = prev.includes(reunionId);
      const newSelection = isSelected
        ? prev.filter(id => id !== reunionId)
        : [...prev, reunionId];

      const reunion = reuniones.find(r => r.id === reunionId);
      if (reunion) {
        const participantes = reunion.meeting_participants.map(mp => mp.consultant_id);
        setSelectedConsultants(prevConsultants => {
          if (isSelected) {
            // Si se deselecciona la reunión, quitamos los consultantes que solo pertenecen a esta reunión
            return prevConsultants.filter(consultantId =>
              newSelection.some(selectedReunionId =>
                reuniones.find(r => r.id === selectedReunionId)
                  .meeting_participants.some(mp => mp.consultant_id === consultantId)
              )
            );
          } else {
            // Si se selecciona la reunión, añadimos los participantes que no estén ya seleccionados
            return [...new Set([...prevConsultants, ...participantes])];
          }
        });
      }

      return newSelection;
    });
  };

  const handleSelectAllConsultants = () => {
    setSelectedConsultants(consultants.map(c => c.id));
  };

  const handleDeselectAllConsultants = () => {
    setSelectedConsultants([]);
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="card disponibilidad-container">
      <h2>Disponibilidad</h2>
      {userRole === 'director' && (
        <div className="filtros">
          <h3>Filtros</h3>
          <div className="form-group">
            <h4>Consultores</h4>
            <button onClick={handleSelectAllConsultants} className="btn btn-secondary">Seleccionar todos</button>
            <button onClick={handleDeselectAllConsultants} className="btn btn-secondary">Deseleccionar todos</button>
            {consultants.map(c => (
              <label key={c.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedConsultants.includes(c.id)}
                  onChange={() => {
                    setSelectedConsultants(prev =>
                      prev.includes(c.id)
                        ? prev.filter(id => id !== c.id)
                        : [...prev, c.id]
                    );
                  }}
                />
                {c.name}
              </label>
            ))}
          </div>
          <div className="form-group">
            <h4>Reuniones</h4>
            {reuniones.map(r => (
              <label key={r.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedReuniones.includes(r.id)}
                  onChange={() => handleReunionSelect(r.id)}
                />
                {r.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="calendario">
        <div className="navegacion-semana">
          <button onClick={() => cambiarSemana(-1)} className="btn btn-primary">Semana Anterior</button>
          <span>{semanaActual.toDateString()}</span>
          <button onClick={() => cambiarSemana(1)} className="btn btn-primary">Semana Siguiente</button>
        </div>
        <AvailabilityTable
          week={obtenerSemana(semanaActual)}
          consultants={consultants}
          disponibilidad={disponibilidad}
          actualizarDisponibilidad={actualizarDisponibilidad}
          selectedConsultants={selectedConsultants}
        />
        {/* <table>
          <thead>
            <tr>
              <th>Hora</th>
              {obtenerSemana(semanaActual).map((dia, index) => (
                <th key={index}>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'][index]} {dia.getDate()}/{dia.getMonth() + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 19 }, (_, i) => i + 16).map(hora => (
              <tr key={hora}>
                <td>{formatearHora(hora / 2)}</td>
                {obtenerSemana(semanaActual).map((dia, index) => (
                  <td key={index}>
                    <div className="disponibilidad-celda">
                      {(userRole === 'director' ? selectedConsultants : [consultant.id]).map(consultantId => {
                        const consultantName = consultants.find(c => c.id === consultantId)?.name || '';
                        const fechaStr = dia.toISOString().split('T')[0];
                        const horaStr = formatearHora(hora / 2);
                        const isDisponible = estaDisponible(consultantId, fechaStr, horaStr);
                        return (
                          <button
                            key={consultantId}
                            onClick={() => actualizarDisponibilidad(consultantId, dia, hora / 2)}
                            className={`disponibilidad-boton ${isDisponible ? 'disponible' : 'no-disponible'}`}
                          >
                            {obtenerIniciales(consultantName)}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table> */}
      </div>
      {userRole === 'director' && (
        <div className="horarios-compatibles">
          <h3>Horarios Compatibles para Reuniones</h3>
          {reuniones.map(reunion => {
            const horarios = encontrarHorariosCompatibles[reunion.id] || [];
            return (
              <div key={reunion.id} className="reunion-horarios">
                <h4>{reunion.name} ({reunion.duration} minutos)</h4>
                {horarios.length > 0 ? (
                  <ul>
                    {horarios.map((horario, index) => (
                      <li key={index}>
                        {new Date(horario.fecha).toLocaleDateString()} de {formatearHora(horario.inicio)} a {formatearHora(horario.fin)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No hay horarios compatibles para esta reunión.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DisponibilidadTab;