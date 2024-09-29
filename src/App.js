import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import { supabase } from './supabaseClient';
import theme from './theme'; // Asegúrate de que la ruta sea correcta
import Auth from './components/Auth';
import PasswordReset from './components/PasswordReset';
import PasswordSetup from './components/PasswordSetup';
import ProjectManager from './components/ProjectManager';
import ProjectPage from './components/ProjectPage';
import AppLayout from './components/AppLayout';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session);
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/reset-password" element={<PasswordReset />} />
          <Route path="/setup-password" element={<PasswordSetup />} />
          {!session ? (
            <Route path="*" element={<Auth onAuthStateChange={setSession} />} />
          ) : (
            <Route element={<AppLayout />}>
              <Route index element={<ProjectManager user={session.user} />} />
              <Route path="/project/:projectId" element={<ProjectPage user={session.user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;