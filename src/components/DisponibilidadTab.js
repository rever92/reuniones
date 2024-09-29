import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AvailabilityTable from './AvailabilityTable';
import { 
  Box, 
  Typography, 
  Button, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const DisponibilidadTab = ({ project, userRole, consultant }) => {
  const [disponibilidad, setDisponibilidad] = useState({});
  const [consultants, setConsultants] = useState([]);
  const [selectedConsultants, setSelectedConsultants] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [selectedReuniones, setSelectedReuniones] = useState([]);
  const [semanaActual, setSemanaActual] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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
        .select('consultant_id, consultants(id, name, role)')
        .eq('project_id', project.id);
  
      if (error) throw error;
  
      const consultantsData = data.map(item => ({
        id: item.consultants.id,
        name: item.consultants.name,
        role: item.consultants.role
      }));
  
      setConsultants(consultantsData);
      if (userRole !== 'director') {
        setSelectedConsultants([consultant.id]);
      } else {
        setSelectedConsultants(consultantsData.map(c => c.id));
      }
      console.log('Consultants y clientes cargados:', consultantsData);
    } catch (error) {
      console.error('Error fetching consultants and clients:', error);
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


  const obtenerSemana = useCallback((fecha) => {
    const primerDia = getWeekStartDate(fecha);
    return Array.from({ length: 5 }, (_, i) => {
      const dia = new Date(primerDia);
      dia.setDate(dia.getDate() + i);
      return dia;
    });
  }, []);

  const getWeekStartDate = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
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

  // const handleReunionSelect = (reunionId) => {
  //   setSelectedReuniones(prev => {
  //     const isSelected = prev.includes(reunionId);
  //     const newSelection = isSelected
  //       ? prev.filter(id => id !== reunionId)
  //       : [...prev, reunionId];

  //     const reunion = reuniones.find(r => r.id === reunionId);
  //     if (reunion) {
  //       const participantes = reunion.meeting_participants.map(mp => mp.consultant_id);
  //       setSelectedConsultants(prevConsultants => {
  //         if (isSelected) {
  //           // Si se deselecciona la reunión, quitamos los consultantes que solo pertenecen a esta reunión
  //           return prevConsultants.filter(consultantId =>
  //             newSelection.some(selectedReunionId =>
  //               reuniones.find(r => r.id === selectedReunionId)
  //                 .meeting_participants.some(mp => mp.consultant_id === consultantId)
  //             )
  //           );
  //         } else {
  //           // Si se selecciona la reunión, añadimos los participantes que no estén ya seleccionados
  //           return [...new Set([...prevConsultants, ...participantes])];
  //         }
  //       });
  //     }

  //     return newSelection;
  //   });
  // };

  const handleSelectAllConsultants = () => {
    setSelectedConsultants(consultants.map(c => c.id));
  };

  const handleDeselectAllConsultants = () => {
    setSelectedConsultants([]);
  };

  const handleSelectAllReuniones = () => {
    const newSelectedReuniones = reuniones.map(r => r.id);
    setSelectedReuniones(newSelectedReuniones);
    updateSelectedConsultantsBasedOnReuniones(newSelectedReuniones);
  };

  const handleDeselectAllReuniones = () => {
    setSelectedReuniones([]);
    setSelectedConsultants([]);
  };


  const updateSelectedConsultantsBasedOnReuniones = (selectedReunionesIds) => {
    const consultantsToSelect = new Set();
    selectedReunionesIds.forEach(reunionId => {
      const reunion = reuniones.find(r => r.id === reunionId);
      if (reunion) {
        reunion.meeting_participants.forEach(participant => {
          consultantsToSelect.add(participant.consultant_id);
        });
      }
    });
    setSelectedConsultants(Array.from(consultantsToSelect));
  };

  const handleReunionSelect = (reunionId) => {
    setSelectedReuniones(prev => {
      const isSelected = prev.includes(reunionId);
      const newSelection = isSelected
        ? prev.filter(id => id !== reunionId)
        : [...prev, reunionId];

      updateSelectedConsultantsBasedOnReuniones(newSelection);
      return newSelection;
    });
  };

  useEffect(() => {
    // Inicializar semanaActual con la fecha actual
    setSemanaActual(new Date());
  }, []);

  if (isLoading) {
    return <Typography>Cargando...</Typography>;
  }

  const weekStartDate = getWeekStartDate(semanaActual);

  return (
    <Box sx={{ maxWidth: '100%', overflowX: 'auto' }}>
      <Typography variant="h4" gutterBottom>Disponibilidad</Typography>
      
      {userRole === 'director' && (
        <Accordion 
          expanded={filtersExpanded} 
          onChange={() => setFiltersExpanded(!filtersExpanded)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Filtros</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom>Consultores</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button variant="outlined" size="small" onClick={handleSelectAllConsultants}>
                    Seleccionar todos
                  </Button>
                  <Button variant="outlined" size="small" onClick={handleDeselectAllConsultants}>
                    Deseleccionar todos
                  </Button>
                </Box>
                <FormGroup>
                  {consultants.map(c => (
                    <FormControlLabel
                      key={c.id}
                      control={
                        <Checkbox
                          checked={selectedConsultants.includes(c.id)}
                          onChange={() => {
                            setSelectedConsultants(prev =>
                              prev.includes(c.id)
                                ? prev.filter(id => id !== c.id)
                                : [...prev, c.id]
                            );
                          }}
                        />
                      }
                      label={c.name}
                    />
                  ))}
                </FormGroup>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom>Reuniones</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button variant="outlined" size="small" onClick={handleSelectAllReuniones}>
                    Seleccionar todas
                  </Button>
                  <Button variant="outlined" size="small" onClick={handleDeselectAllReuniones}>
                    Deseleccionar todas
                  </Button>
                </Box>
                <FormGroup>
                  {reuniones.map(r => (
                    <FormControlLabel
                      key={r.id}
                      control={
                        <Checkbox
                          checked={selectedReuniones.includes(r.id)}
                          onChange={() => handleReunionSelect(r.id)}
                        />
                      }
                      label={r.name}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => cambiarSemana(-1)}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6">
            Semana del {weekStartDate.toLocaleDateString()}
          </Typography>
          <IconButton onClick={() => cambiarSemana(1)}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <AvailabilityTable
          week={obtenerSemana(semanaActual)}
          consultants={consultants}
          disponibilidad={disponibilidad}
          actualizarDisponibilidad={actualizarDisponibilidad}
          selectedConsultants={selectedConsultants}
        />
      </Paper>


      {userRole === 'director' && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom>Horarios Compatibles para Reuniones</Typography>
          {reuniones.map(reunion => {
            const horarios = encontrarHorariosCompatibles[reunion.id] || [];
            return (
              <Box key={reunion.id} sx={{ mb: 2 }}>
                <Typography variant="h6">{reunion.name} ({reunion.duration} minutos)</Typography>
                {horarios.length > 0 ? (
                  <ul>
                    {horarios.map((horario, index) => (
                      <li key={index}>
                        {new Date(horario.fecha).toLocaleDateString()} de {formatearHora(horario.inicio)} a {formatearHora(horario.fin)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Typography>No hay horarios compatibles para esta reunión.</Typography>
                )}
              </Box>
            );
          })}
        </Paper>
      )}
    </Box>
  );
};

export default DisponibilidadTab;