import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const ReunionScheduler = ({ user, project, consultant }) => {
    const [reuniones, setReuniones] = useState([]);
    const [personas, setPersonas] = useState([]);
    const [disponibilidad, setDisponibilidad] = useState({});
    const [nuevaReunion, setNuevaReunion] = useState({ nombre: '', duracion: 30 });
    const [nuevaPersona, setNuevaPersona] = useState('');
    const [personasEnReunion, setPersonasEnReunion] = useState({});
    const [semanaActual, setSemanaActual] = useState(new Date());
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (project && consultant) {
            fetchUserRole();
            fetchReuniones();
            fetchPersonas();
            fetchDisponibilidad();
        }
    }, [project, consultant]);


    const fetchUserRole = async () => {
        setIsLoading(true);
        try {
            console.log('Fetching user role for:', { projectId: project.id, consultantId: consultant.id });
            const { data, error } = await supabase
                .from('project_consultants')
                .select('role')
                .eq('project_id', project.id)
                .eq('consultant_id', consultant.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('No role found for this user in this project');
                    setUserRole('No asignado');
                } else {
                    console.error('Error in fetchUserRole query:', error);
                    throw error;
                }
            } else if (data) {
                console.log('User role data:', data);
                setUserRole(data.role);
            }
        } catch (error) {
            console.error('Error fetching user role:', error);
            setError('Error al obtener el rol del usuario');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReuniones = async () => {
        try {
            const { data, error } = await supabase
                .from('meetings')
                .select('*')
                .eq('project_id', project.id);

            if (error) throw error;

            setReuniones(data || []);
        } catch (error) {
            console.error('Error fetching reuniones:', error);
            setError('Error al obtener las reuniones');
        }
    };

    const fetchPersonas = async () => {
        try {
            const { data, error } = await supabase
                .from('project_consultants')
                .select('consultant_id, consultants(id, name)')
                .eq('project_id', project.id);

            if (error) throw error;

            setPersonas(data?.map(item => ({
                id: item.consultant_id,
                name: item.consultants.name
            })) || []);
        } catch (error) {
            console.error('Error fetching personas:', error);
            setError('Error al obtener las personas');
        }
    };

    const fetchDisponibilidad = async () => {
        try {
            const { data, error } = await supabase
                .from('availabilities')
                .select('*')
                .eq('project_id', project.id)
                .eq('consultant_id', consultant.id);

            if (error) throw error;

            const disponibilidadFormateada = {};
            data.forEach(item => {
                const fecha = item.date;
                const hora = item.time;
                if (!disponibilidadFormateada[fecha]) {
                    disponibilidadFormateada[fecha] = {};
                }
                disponibilidadFormateada[fecha][hora] = item.is_available;
            });

            setDisponibilidad(disponibilidadFormateada);
        } catch (error) {
            console.error('Error fetching disponibilidad:', error);
            setError('Error al obtener la disponibilidad');
        }
    };


    const canEditProject = userRole === 'director';
    const canEditAvailability = userRole === 'director' || userRole === 'consultor';

    const crearReunion = async () => {
        if (userRole !== 'director') {
            alert('No tienes permiso para crear reuniones');
            return;
        }
        if (nuevaReunion.nombre) {
            try {
                const { data, error } = await supabase
                    .from('meetings')
                    .insert([
                        { name: nuevaReunion.nombre, duration: nuevaReunion.duracion, project_id: project.id }
                    ])
                    .select();

                if (error) throw error;

                setReuniones([...reuniones, data[0]]);
                setNuevaReunion({ nombre: '', duracion: 30 });
            } catch (error) {
                console.error('Error creating reunion:', error);
                setError('Error al crear la reunión');
            }
        }
    };

    const crearPersona = async () => {
        if (userRole !== 'director') {
            alert('No tienes permiso para añadir personas al proyecto');
            return;
        }
        if (nuevaPersona) {
            try {
                // Primero, crear el consultor si no existe
                const { data: consultantData, error: consultantError } = await supabase
                    .from('consultants')
                    .insert([{ name: nuevaPersona, role: 'consultant' }])
                    .select()
                    .single();

                if (consultantError) throw consultantError;

                // Luego, asociar el consultor al proyecto
                const { error: projectConsultantError } = await supabase
                    .from('project_consultants')
                    .insert([
                        { project_id: project.id, consultant_id: consultantData.id, role: 'consultant' }
                    ]);

                if (projectConsultantError) throw projectConsultantError;

                setPersonas([...personas, { id: consultantData.id, name: consultantData.name }]);
                setNuevaPersona('');
            } catch (error) {
                console.error('Error creating persona:', error);
                setError('Error al crear la persona');
            }
        }
    };

    const togglePersonaEnReunion = (reunion, persona) => {
        setPersonasEnReunion(prev => {
            const personasActuales = prev[reunion.nombre] || [];
            const nuevasPersonas = personasActuales.includes(persona)
                ? personasActuales.filter(p => p !== persona)
                : [...personasActuales, persona];
            const nuevaAsignacion = {
                ...prev,
                [reunion.nombre]: nuevasPersonas
            };
            console.log(`Persona ${persona} ${nuevasPersonas.includes(persona) ? 'añadida a' : 'removida de'} la reunión ${reunion.nombre}`);
            console.log('Nueva asignación de personas en reuniones:', nuevaAsignacion);
            return nuevaAsignacion;
        });
    };

    const asignarDisponibilidad = async (persona, fecha, hora) => {
        if (!canEditAvailability && userRole !== 'director') {
            alert('No tienes permiso para editar disponibilidad');
            return;
        }
        const fechaStr = fecha.toISOString().split('T')[0];
        const horaStr = formatearHora(hora);
        const isAvailable = !estaDisponible(persona, fecha, hora);

        try {
            const { data, error } = await supabase
                .from('availabilities')
                .upsert([
                    {
                        consultant_id: persona.id,
                        project_id: project.id,
                        date: fechaStr,
                        time: horaStr,
                        is_available: isAvailable
                    }
                ]);

            if (error) throw error;

            setDisponibilidad(prev => ({
                ...prev,
                [fechaStr]: {
                    ...(prev[fechaStr] || {}),
                    [horaStr]: {
                        ...(prev[fechaStr]?.[horaStr] || {}),
                        [persona.id]: isAvailable
                    }
                }
            }));
        } catch (error) {
            console.error('Error updating availability:', error);
            setError('Error al actualizar la disponibilidad');
        }
    };

    const estaDisponible = (persona, fecha, hora) => {
        const fechaStr = fecha.toISOString().split('T')[0];
        const horaStr = formatearHora(hora);
        const disponible = !!disponibilidad[fechaStr]?.[horaStr]?.[persona.id];
        console.log(`Verificando disponibilidad de ${persona.name} en ${fechaStr} a las ${horaStr}: ${disponible}`);
        return disponible;
    };

    const encontrarHorariosDisponibles = useMemo(() => {
        console.log('Calculando horarios disponibles...');
        const horariosDisponibles = {};

        reuniones.forEach(reunion => {
            console.log(`Buscando horarios para la reunión: ${reunion.nombre}`);
            const personasReunion = personasEnReunion[reunion.nombre] || [];
            console.log(`Personas en esta reunión:`, personasReunion);
            const bloquesDisponibles = [];

            const fechaActual = new Date();
            fechaActual.setHours(0, 0, 0, 0);

            for (let i = 0; i < 60; i++) {
                const fecha = new Date(fechaActual);
                fecha.setDate(fecha.getDate() + i);

                if (fecha.getDay() !== 0 && fecha.getDay() !== 6) {
                    console.log(`Verificando disponibilidad para el día: ${fecha.toDateString()}`);

                    for (let horaInicio = 8; horaInicio <= 17 - (reunion.duracion / 60); horaInicio += 0.5) {
                        let bloqueDisponible = true;
                        for (let offset = 0; offset < reunion.duracion / 30; offset++) {
                            const horaActual = horaInicio + (offset * 0.5);
                            if (!personasReunion.every(persona => estaDisponible(persona, fecha, horaActual))) {
                                bloqueDisponible = false;
                                break;
                            }
                        }

                        if (bloqueDisponible) {
                            bloquesDisponibles.push({
                                fecha: fecha.toISOString().split('T')[0],
                                inicio: horaInicio,
                                fin: horaInicio + (reunion.duracion / 60)
                            });
                            console.log(`Bloque disponible encontrado: ${fecha.toISOString().split('T')[0]} de ${horaInicio} a ${horaInicio + (reunion.duracion / 60)}`);
                        }
                    }
                }
            }

            horariosDisponibles[reunion.nombre] = bloquesDisponibles;
            console.log(`Horarios encontrados para ${reunion.nombre}:`, bloquesDisponibles);
        });

        console.log('Todos los horarios calculados:', horariosDisponibles);
        return horariosDisponibles;
    }, [reuniones, personasEnReunion, disponibilidad]);



    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

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

    const obtenerIniciales = (persona) => {
        if (typeof persona === 'string') {
            return persona.split(' ').map(palabra => palabra[0]).join('');
        } else if (persona && typeof persona.name === 'string') {
            return persona.name.split(' ').map(palabra => palabra[0]).join('');
        } else {
            console.error('Formato de persona no válido:', persona);
            return '??';
        }
    };

    if (isLoading) return <p>Cargando...</p>;
    if (error) return <p>Error: {error}</p>;

    if (!project) {
        return <div>Por favor, selecciona un proyecto para comenzar.</div>;
    }

    return (
        <div className="reunion-scheduler">
            <h1>Programador de Reuniones</h1>

            {canEditProject && (
                <div className="seccion">
                    <h2>Crear Reunión</h2>
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

            {canEditProject && (
                <div className="seccion">
                    <h2>Crear Persona</h2>
                    <input
                        type="text"
                        value={nuevaPersona}
                        onChange={(e) => setNuevaPersona(e.target.value)}
                        placeholder="Nombre de la persona"
                    />
                    <button onClick={crearPersona}>Crear Persona</button>
                </div>
            )}

            <div className="seccion">
                <h2>Asignar Personas a Reuniones</h2>
                {reuniones.map(reunion => (
                    <div key={reunion.id} className="reunion-asignacion">
                        <h3>{reunion.name} <span className="duracion-reunion">({reunion.duration} minutos)</span></h3>
                        {personas.map(persona => (
                            <label key={persona.id} className="persona-checkbox">
                                <input
                                    type="checkbox"
                                    checked={(personasEnReunion[reunion.id] || []).some(p => p.id === persona.id)}
                                    onChange={() => togglePersonaEnReunion(reunion, persona)}
                                />
                                {persona.name}
                            </label>
                        ))}
                    </div>
                ))}
            </div>


            <div className="seccion">
                <h2>Asignar Disponibilidad</h2>
                <div className="navegacion-semana">
                    <button onClick={() => cambiarSemana(-1)}>Semana Anterior</button>
                    <span>{semanaActual.toDateString()}</span>
                    <button onClick={() => cambiarSemana(1)}>Semana Siguiente</button>
                </div>
                <div className="calendario">
                    <table>
                        <thead>
                            <tr>
                                <th>Hora</th>
                                {obtenerSemana(semanaActual).map((dia, index) => (
                                    <th key={index}>
                                        {diasSemana[dia.getDay() - 1]} {dia.getDate()}/{dia.getMonth() + 1}
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
                                                {personas.map(persona => (
                                                    <button
                                                        key={persona.id}
                                                        onClick={() => asignarDisponibilidad(persona, dia, hora / 2)}
                                                        className={`disponibilidad-boton ${estaDisponible(persona, dia, hora / 2) ? 'disponible' : 'no-disponible'}`}
                                                    >
                                                        {obtenerIniciales(persona)}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="seccion">
                <h2>Horarios Disponibles para Reuniones</h2>
                {Object.entries(encontrarHorariosDisponibles).map(([reunion, horarios]) => {
                    const reunionObj = reuniones.find(r => r.nombre === reunion);
                    return (
                        <div key={reunion} className="horarios-disponibles">
                            <h3>{reunion} <span className="duracion-reunion">({reunionObj?.duracion} minutos)</span></h3>
                            {horarios.length > 0 ? (
                                horarios.map((horario, index) => (
                                    <div key={index} className="horario-disponible">
                                        {`${new Date(horario.fecha).toLocaleDateString()} de ${formatearHora(horario.inicio)} a ${formatearHora(horario.fin)}`}
                                    </div>
                                ))
                            ) : (
                                <div className="no-horarios">No hay horarios disponibles para esta reunión.</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReunionScheduler;