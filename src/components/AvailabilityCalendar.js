import React, { useState, useEffect } from 'react';
import { 
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Box, Typography, Paper, IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const CalendarContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const CalendarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const DayHeader = styled(Typography)(({ theme }) => ({
  flex: 1,
  textAlign: 'center',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const CalendarBody = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '660px',
  border: `1px solid ${theme.palette.divider}`,
}));

const TimeColumn = styled(Box)(({ theme }) => ({
  width: '50px',
  borderRight: `1px solid ${theme.palette.divider}`,
}));

const TimeSlot = styled(Typography)(({ theme }) => ({
  height: '60px',
  borderTop: `1px solid ${theme.palette.divider}`,
  textAlign: 'right',
  paddingRight: theme.spacing(0.5),
  fontSize: '12px',
}));

const DayColumn = styled(Box)(({ theme }) => ({
  flex: 1,
  position: 'relative',
  borderRight: `1px solid ${theme.palette.divider}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `linear-gradient(to bottom, ${theme.palette.divider} 1px, transparent 1px)`,
    backgroundSize: '100% 60px',
    pointerEvents: 'none',
  },
}));

const AvailabilityCalendar = ({ availableSlots, selectedReuniones, reuniones, onScheduleReunion }) => {
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [calendarDays, setCalendarDays] = useState([]);
  const [popupInfo, setPopupInfo] = useState(null);
  const [deletePopupInfo, setDeletePopupInfo] = useState(null);

  console.log("Available Slots: ", availableSlots)

  useEffect(() => {
    setCalendarDays(getWeekDays(currentWeekStart));
  }, [currentWeekStart]);



  const getWeekDays = (startDate) => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const changeWeek = (increment) => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (7 * increment));
    setCurrentWeekStart(newWeekStart);
  };

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);  // 8:00 AM to 6:00 PM

  
  const handleConfirmSchedule = () => {
    if (popupInfo) {
      onScheduleReunion(popupInfo.reunion.id, popupInfo.slot.startTime.toISOString());
      setPopupInfo(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deletePopupInfo) {
      onScheduleReunion(deletePopupInfo.reunion.id, null);
      setDeletePopupInfo(null);
    }
  };

  const getReunionColor = (reunionId, isCurrentSchedule) => {
    if (isCurrentSchedule) {
      return '#ff0099'; // Color rosa
    }
    const hue = (reunionId * 137.508) % 360;
    return `hsl(${hue}, 50%, 75%)`;
  };

  const isOverlapping = (start1, duration1, start2, duration2) => {
    const end1 = new Date(start1.getTime() + duration1 * 60000);
    const end2 = new Date(start2.getTime() + duration2 * 60000);
    return start1 < end2 && start2 < end1;
  };

  const getSlotStatus = (slot, reunion) => {
    if (slot.isCurrentSchedule) {
      return 'fixed';
    }
    
    const slotDateTime = new Date(slot.startTime);
    const conflictingReunion = reuniones.find(r => {
      if (r.id === reunion.id) return false; // No comparar con sí misma
      if (!r.scheduled_at) return false;
      const reunionDateTime = new Date(r.scheduled_at);
      return isOverlapping(slotDateTime, reunion.duration, reunionDateTime, r.duration);
    });

    if (conflictingReunion) {
      return 'incompatible';
    }

    return 'available';
  };

  const getSlotColor = (reunionId, status) => {
    switch (status) {
      case 'fixed':
        return '#ff0099'; // Rosa para reuniones fijadas
      case 'incompatible':
        return '#808080'; // Gris para reuniones incompatibles
      case 'available':
      default:
        const hue = (reunionId * 137.508) % 360;
        return `hsl(${hue}, 50%, 75%)`; // Color original para slots disponibles
    }
  };

  const renderSlots = (day) => {
    const slotsForDay = [];
    selectedReuniones.forEach(reunionId => {
      const reunion = reuniones.find(r => r.id === reunionId);
      const slots = availableSlots[reunionId] || [];
      slots.forEach(slot => {
        const slotDate = new Date(slot.datetime);
        if (slotDate.toDateString() === day.toDateString()) {
          const isCurrentSchedule = reunion.scheduled_at &&
            new Date(reunion.scheduled_at).toISOString() === new Date(slot.datetime).toISOString();
          slotsForDay.push({
            reunionId,
            startTime: slotDate,
            endTime: new Date(slotDate.getTime() + reunion.duration * 60000),
            duration: reunion.duration,
            name: reunion.name,
            isCurrentSchedule: isCurrentSchedule
          });
        }
      });
    });

    slotsForDay.sort((a, b) => a.startTime - b.startTime);

    const groupedSlots = [];
    slotsForDay.forEach(slot => {
      let placed = false;
      for (let group of groupedSlots) {
        if (group.some(existingSlot => isOverlapping(existingSlot.startTime, existingSlot.duration, slot.startTime, slot.duration))) {
          group.push(slot);
          placed = true;
          break;
        }
      }
      if (!placed) {
        groupedSlots.push([slot]);
      }
    });

    return groupedSlots.flatMap((group, groupIndex) => {
      return group.map((slot, slotIndex) => {
        const top = (slot.startTime.getHours() - 8 + slot.startTime.getMinutes() / 60) * 60;
        const height = (slot.endTime - slot.startTime) / 60000; // en minutos
        const width = 95 / group.length;
        const left = slotIndex * width;
        const reunion = reuniones.find(r => r.id === slot.reunionId);
        const status = getSlotStatus(slot, reunion);

        return (
          <Box
            key={`${slot.reunionId}-${slot.startTime.getTime()}`}
            sx={{
              position: 'absolute',
              top: `${top}px`,
              left: `${left}%`,
              width: `${width}%`,
              height: `${height}px`,
              backgroundColor: getSlotColor(slot.reunionId, status),
              borderRadius: '4px',
              padding: '2px',
              overflow: 'hidden',
              fontSize: '10px',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: status === 'fixed' ? 'white' : 'inherit',
              fontWeight: status === 'fixed' ? 'bold' : 'normal',
              '&:hover': {
                opacity: 0.8,
              },
            }}
            title={`${slot.name} - ${slot.startTime.toLocaleTimeString()} - ${slot.endTime.toLocaleTimeString()} (${slot.duration} min)`}
            onClick={() => handleSlotClick(slot, reunion)}
          >
            <Typography variant="caption">{slot.name}</Typography>
            <Typography variant="caption">{`(${slot.duration}min)`}</Typography>
          </Box>
        );
      });
    });
  };


  const handleSlotClick = (slot, reunion) => {
    const status = getSlotStatus(slot, reunion);
    if (status === 'fixed') {
      setDeletePopupInfo({ slot, reunion });
    } else if (status === 'available') {
      setPopupInfo({ slot, reunion });
    }
    // No hacemos nada si el status es 'incompatible'
  };

  return (
    <CalendarContainer>
      <CalendarHeader>
        <IconButton onClick={() => changeWeek(-1)}>
          <ArrowBackIosNewIcon />
        </IconButton>
        <Typography variant="h6">
          {`Semana del ${currentWeekStart.toLocaleDateString()}`}
        </Typography>
        <IconButton onClick={() => changeWeek(1)}>
          <ArrowForwardIosIcon />
        </IconButton>
      </CalendarHeader>
      <Box display="flex">
        {calendarDays.map((day, index) => (
          <DayHeader key={index} variant="subtitle2">
            {day.toLocaleDateString('es-ES', { weekday: 'short', month: 'numeric', day: 'numeric' })}
          </DayHeader>
        ))}
      </Box>
      <CalendarBody>
        <TimeColumn>
          {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => (
            <TimeSlot key={hour}>{`${hour}:00`}</TimeSlot>
          ))}
        </TimeColumn>
        {calendarDays.map((day, dayIndex) => (
          <DayColumn key={dayIndex}>
            {renderSlots(day)}
          </DayColumn>
        ))}
      </CalendarBody>
      <Dialog
        open={!!popupInfo}
        onClose={() => setPopupInfo(null)}
      >
        <DialogTitle>Fijar fecha y hora de la reunión</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {popupInfo && `¿Quieres fijar esta fecha y hora para la reunión "${popupInfo.reunion.name}"?`}
          </DialogContentText>
          <DialogContentText>
            {popupInfo && `Fecha y hora: ${new Date(popupInfo.slot.startTime).toLocaleString()}`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPopupInfo(null)}>Cancelar</Button>
          <Button onClick={handleConfirmSchedule} color="primary">Confirmar</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!deletePopupInfo}
        onClose={() => setDeletePopupInfo(null)}
      >
        <DialogTitle>Eliminar fecha y hora de la reunión</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deletePopupInfo && `¿Quieres eliminar esta fecha y hora para la reunión "${deletePopupInfo.reunion.name}"?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePopupInfo(null)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="primary">Confirmar</Button>
        </DialogActions>
      </Dialog>
    </CalendarContainer>
  );
};


export default AvailabilityCalendar;