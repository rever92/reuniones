import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/ConsultoresTab.css';

const ConsultoresTab = ({ project, userRole, consultant, onNewConsultant, refreshTrigger }) => {
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('consultores');
  const [assignedConsultants, setAssignedConsultants] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, [project.id, refreshTrigger]);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('project_consultants')
      .select(`
        consultant_id,
        role,
        consultants (id, name, email, role, area)
      `)
      .eq('project_id', project.id);

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data.map(item => ({ ...item.consultants, projectRole: item.role })));
      setAssignedConsultants(data.map(item => item.consultant_id));
    }
  }, [project.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  const searchConsultants = async () => {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error('Error searching consultants:', error);
    } else {
      setSearchResults(data);
    }
  };

  const assignConsultant = async (consultantId) => {
    if (userRole !== 'director' && consultant.role !== 'admin') {
      console.error('Solo los directores o administradores pueden asignar consultores');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_consultants')
        .insert({ project_id: project.id, consultant_id: consultantId, role: 'consultant' })
        .select();

      if (error) throw error;

      console.log('Consultant assigned successfully:', data);
      fetchUsers();
      setSearchResults([]);
    } catch (error) {
      console.error('Error assigning consultant:', error);
      console.error('Error details:', error.details, error.hint, error.message);
    }
  };

  const removeUserFromProject = async (userId) => {
    try {
      const { error } = await supabase
        .from('project_consultants')
        .delete()
        .eq('consultant_id', userId)
        .eq('project_id', project.id);

      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error removing user from project:', error);
    }
  };


  const renderUserTable = (userType) => (
    <table className="users-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Área</th>
          <th>Rol en el proyecto</th>
          <th>Rol general</th>
          {userRole === 'director' && <th>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {users
          .filter(user => user.role === userType)
          .map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.area}</td>
              <td>{user.projectRole}</td>
              <td>{user.role}</td>
              {userRole === 'director' && (
                <td>
                  <button onClick={() => removeUserFromProject(user.id)} className="btn btn-danger">
                    Quitar del Proyecto
                  </button>
                </td>
              )}
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <div className="card consultores-container">
      <h2>Consultores y Clientes del Proyecto</h2>
      <div className="tabs">
        <button
          className={activeTab === 'consultores' ? 'active' : ''}
          onClick={() => setActiveTab('consultores')}
        >
          Consultores
        </button>
        <button
          className={activeTab === 'clientes' ? 'active' : ''}
          onClick={() => setActiveTab('clientes')}
        >
          Clientes
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'consultores' ? renderUserTable('consultant') : renderUserTable('client')}
      </div>
      {userRole === 'director' && (
        <div className="search-bar">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar consultores..."
            className="form-control"
          />
          <button onClick={searchConsultants} className="btn btn-primary">Buscar</button>
          <button onClick={onNewConsultant} className="btn btn-secondary">Nuevo Usuario</button>
        </div>
      )}
      {searchResults.map(c => (
        <li key={c.id} className="consultor-item">
          <span>{c.name} - {c.email}</span>
          <button
            onClick={() => assignConsultant(c.id)}
            className={`btn ${assignedConsultants.includes(c.id) ? 'btn-secondary' : 'btn-primary'}`}
            disabled={assignedConsultants.includes(c.id)}
          >
            {assignedConsultants.includes(c.id) ? 'Ya asignado' : 'Asignar al proyecto'}
          </button>
        </li>
      ))}
    </div>
  );
};

export default ConsultoresTab;