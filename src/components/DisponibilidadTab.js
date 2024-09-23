import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const DisponibilidadTab = ({ project, userRole, consultant }) => {
  const [disponibilidad, setDisponibilidad] = useState({});
  const [consultants, setConsultants] = useState([]);
  const [selectedConsultants, setSelectedConsultants] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [selectedReuniones, setSelectedReuniones] = useState([]);

  useEffect(() => {
    fetchConsultants();
    fetchReuniones();
    fetchDisponibilidad();
  }, [project.id]);

  const fetchConsultants = async () => {
    // Lógica para obtener consultores del proyecto
  };

  const fetchReuniones = async () => {
    // Lógica para obtener reuniones del proyecto
  };

  const fetchDisponibilidad = async () => {
    let query = supabase
      .from('availabilities')
      .select('*')
      .eq('project_id', project.id);

    if (userRole !== 'director') {
      query = query.eq('consultant_id', consultant.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching disponibilidad:', error);
    } else {
      // Formatear datos de disponibilidad
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
      setDisponibilidad(disponibilidadFormateada);
    }
  };

  const actualizarDisponibilidad = async (consultantId, fecha, hora, isAvailable) => {
    // Lógica para actualizar disponibilidad
  };

  // Renderizado del calendario y lógica de filtrado
  // ...

  return (
    <div>
      <h2>Disponibilidad</h2>
      {userRole === 'director' && (
        <div>
          {/* Filtros para consultores y reuniones */}
        </div>
      )}
      {/* Renderizado del calendario */}
      {/* Renderizado de horarios compatibles para reuniones */}
    </div>
  );
};

export default DisponibilidadTab;