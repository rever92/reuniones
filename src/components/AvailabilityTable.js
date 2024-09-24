import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button,
  Tooltip
} from '@mui/material';

const AvailabilityTable = ({ week, consultants, disponibilidad, actualizarDisponibilidad, selectedConsultants }) => {
  const hours = Array.from({ length: 21 }, (_, i) => i / 2 + 8); // Genera horas de 8:00 a 18:00 en intervalos de 30 minutos
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

  const formatearHora = (hora) => {
    const horas = Math.floor(hora);
    const minutos = hora % 1 === 0 ? '00' : '30';
    return `${horas.toString().padStart(2, '0')}:${minutos}`;
  };

  const getConsultantInitials = (name) => {
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}.${nameParts[nameParts.length - 1]}`;
    }
    return name.substring(0, 2);
  };

  const isDisponible = (consultantId, fecha, hora) => {
    const horaStr = `${formatearHora(hora)}:00`;
    return disponibilidad[consultantId]?.[fecha]?.[horaStr] === true;
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Hora</TableCell>
            {week.map((day, index) => (
              <TableCell key={index} align="center">
                {days[index]} {day.getDate()}/{day.getMonth() + 1}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {hours.map(hora => (
            <TableRow key={hora}>
              <TableCell component="th" scope="row">
                {formatearHora(hora)}
              </TableCell>
              {week.map((day, dayIndex) => (
                <TableCell key={dayIndex} align="center">
                  {consultants.filter(c => selectedConsultants.includes(c.id)).map(consultant => {
                    const fechaStr = day.toISOString().split('T')[0];
                    const disponible = isDisponible(consultant.id, fechaStr, hora);
                    return (
                      <Tooltip key={consultant.id} title={consultant.name} arrow>
                        <Button
                          size="small"
                          variant={disponible ? "contained" : "outlined"}
                          color={disponible ? "success" : "primary"}
                          onClick={() => actualizarDisponibilidad(consultant.id, day, hora)}
                          sx={{ 
                            minWidth: '50px', 
                            m: 0.5, 
                            p: 0.5, 
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {getConsultantInitials(consultant.name)}
                        </Button>
                      </Tooltip>
                    );
                  })}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AvailabilityTable;