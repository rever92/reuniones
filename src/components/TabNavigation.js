import React from 'react';

const TabNavigation = ({ activeTab, setActiveTab, userRole }) => {
  return (
    <div className="tab-navigation">
      <button 
        onClick={() => setActiveTab('consultores')}
        className={`tab-button ${activeTab === 'consultores' ? 'active' : ''}`}
      >
        Consultores
      </button>
      <button 
        onClick={() => setActiveTab('reuniones')}
        className={`tab-button ${activeTab === 'reuniones' ? 'active' : ''}`}
      >
        Reuniones
      </button>
      <button 
        onClick={() => setActiveTab('disponibilidad')}
        className={`tab-button ${activeTab === 'disponibilidad' ? 'active' : ''}`}
      >
        Disponibilidad
      </button>
    </div>
  );
};

export default TabNavigation;