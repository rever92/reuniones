import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import ProjectManager from './components/ProjectManager';
import ProjectPage from './components/ProjectPage';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="App">
        <h1>Bienvenido, {session.user.email}</h1>
        <Routes>
          <Route path="/" element={<ProjectManager user={session.user} />} />
          <Route path="/project/:projectId" element={<ProjectPage user={session.user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
    </Router>
  );
}

export default App;