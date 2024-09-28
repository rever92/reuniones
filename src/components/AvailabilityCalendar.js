import React, { useState, useEffect } from 'react';

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

console.log("Available Slots: ", availableSlots )

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

    const getSlotStyle = (slot, reunionId, index, totalSlots, duration) => {
        const slotDate = new Date(slot.datetime);
        const top = (slotDate.getHours() - 8 + slotDate.getMinutes() / 60) * 60;
        const width = 100 / totalSlots;  // Modificado para usar el 100% del ancho disponible
        const left = index * width;  // Coloca los eventos solapados uno al lado del otro
        const height = (duration / 30) * 30;  // 30px por cada 30 minutos
      
        return {
          position: 'absolute',
          top: `${top}px`,
          left: `${left}%`,
          width: `${width}%`,
          height: `${height}px`,
          backgroundColor: getReunionColor(reunionId),
          borderRadius: '4px',
          padding: '2px',
          overflow: 'hidden',
          fontSize: '10px',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        };
      };
      
     
      const handleSlotClick = (slot, reunion) => {
        setPopupInfo({ slot, reunion });
      };
    
      const handleConfirmSchedule = () => {
        if (popupInfo) {
          onScheduleReunion(popupInfo.reunion.id, popupInfo.slot.startTime.toISOString());
          setPopupInfo(null);
        }
      };
    
      const getReunionColor = (reunionId, isCurrentSchedule) => {
        if (isCurrentSchedule) {
          return '#ff0099'; // Color rosa corregido
        }
        const hue = (reunionId * 137.508) % 360;
        return `hsl(${hue}, 50%, 75%)`;
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
    
        const isOverlapping = (slot1, slot2) => {
          return slot1.startTime < slot2.endTime && slot2.startTime < slot1.endTime;
        };
    
        const groupedSlots = [];
        slotsForDay.forEach(slot => {
          let placed = false;
          for (let group of groupedSlots) {
            if (group.some(existingSlot => isOverlapping(existingSlot, slot))) {
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
    
            return (
              <div
                key={`${slot.reunionId}-${slot.startTime.getTime()}`}
                style={{
                  position: 'absolute',
                  top: `${top}px`,
                  left: `${left}%`,
                  width: `${width}%`,
                  height: `${height}px`,
                  backgroundColor: getReunionColor(slot.reunionId, slot.isCurrentSchedule),
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
                  alignItems: 'center'
                }}
                title={`${slot.name} - ${slot.startTime.toLocaleTimeString()} - ${slot.endTime.toLocaleTimeString()} (${slot.duration} min)`}
                onClick={() => handleSlotClick(slot, reuniones.find(r => r.id === slot.reunionId))}
              >
                <div>{slot.name}</div>
                <div>{`(${slot.duration}min)`}</div>
              </div>
            );
          });
        });
      };

      return (
        <div className="availability-calendar">
          <div className="calendar-navigation">
            <button onClick={() => changeWeek(-1)}>Semana Anterior</button>
            <span>{`Semana del ${currentWeekStart.toLocaleDateString()}`}</span>
            <button onClick={() => changeWeek(1)}>Semana Siguiente</button>
          </div>
          <div className="calendar-header">
            {calendarDays.map((day, index) => (
              <div key={index} className="calendar-day-header">
                {day.toLocaleDateString('es-ES', { weekday: 'short', month: 'numeric', day: 'numeric' })}
              </div>
            ))}
          </div>
          <div className="calendar-body">
            <div className="calendar-time-column">
              {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => (
                <div key={hour} className="calendar-hour">{`${hour}:00`}</div>
              ))}
            </div>
            {calendarDays.map((day, dayIndex) => (
              <div key={dayIndex} className="calendar-day-column">
                {renderSlots(day)}
              </div>
            ))}
          </div>
          {popupInfo && (
            <div className="popup-overlay">
              <div className="popup-content">
                <p>{`¿Quieres fijar esta fecha y hora para la reunión "${popupInfo.reunion.name}"?`}</p>
                <p>{`Fecha y hora: ${new Date(popupInfo.slot.startTime).toLocaleString()}`}</p>
                <button onClick={handleConfirmSchedule}>Confirmar</button>
                <button onClick={() => setPopupInfo(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      );
    };
    

export default AvailabilityCalendar;