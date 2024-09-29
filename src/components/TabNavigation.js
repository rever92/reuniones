import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';

const TabNavigation = ({ activeTab, setActiveTab, userRole }) => {
  const handleChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs value={activeTab} onChange={handleChange} aria-label="project navigation tabs">
        <Tab label="Consultores" value="consultores" />
        <Tab label="Reuniones" value="reuniones" />
        <Tab label="Disponibilidad" value="disponibilidad" />
      </Tabs>
    </Box>
  );
};

export default TabNavigation;