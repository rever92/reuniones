import React, { useState, useEffect } from 'react';

const AvailabilityCalendar = ({ availableSlots, duration, onSlotSelect }) => {
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push(day);
    }
    setCalendarDays(days);
  }, []);

  const hours = Array.from({ length: 20 }, (_, i) => i + 8); // 8:00 AM to 5:30 PM

  const isSlotAvailable = (day, hour, minute) => {
    const slotDate = new Date(day);
    slotDate.setHours(hour, minute, 0, 0);
    return availableSlots.some(slot => {
      const slotDateTime = new Date(slot.datetime);
      return slotDateTime.getTime() === slotDate.getTime();
    });
  };

  const handleSlotClick = (day, hour, minute) => {
    const slotDate = new Date(day);
    slotDate.setHours(hour, minute, 0, 0);
    
    if (isSlotAvailable(day, hour, minute)) {
      setSelectedSlot(slotDate);
      onSlotSelect(slotDate);
    }
  };

  const isSlotSelectable = (day, hour, minute) => {
    for (let i = 0; i < duration / 30; i++) {
      const checkDate = new Date(day);
      checkDate.setHours(hour, minute + i * 30, 0, 0);
      if (!isSlotAvailable(checkDate, checkDate.getHours(), checkDate.getMinutes())) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="availability-calendar">
      <div className="calendar-header">
        {calendarDays.map((day, index) => (
          <div key={index} className="calendar-day-header">
            {day.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        ))}
      </div>
      <div className="calendar-body">
        {hours.map(hour => (
          <React.Fragment key={hour}>
            {[0, 30].map(minute => (
              <div key={`${hour}:${minute}`} className="calendar-row">
                {minute === 0 && <div className="time-label">{`${hour}:00`}</div>}
                {calendarDays.map((day, dayIndex) => {
                  const isAvailable = isSlotSelectable(day, hour, minute);
                  const slotDate = new Date(day);
                  slotDate.setHours(hour, minute, 0, 0);
                  const isSelected = selectedSlot && selectedSlot.getTime() === slotDate.getTime();
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`calendar-slot ${isAvailable ? 'available' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => isAvailable && handleSlotClick(day, hour, minute)}
                    />
                  );
                })}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default AvailabilityCalendar;