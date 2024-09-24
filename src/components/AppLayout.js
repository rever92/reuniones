import React from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { supabase } from '../supabaseClient';

const AppLayout = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Proyectos de Estrategia Digital
          </Typography>
          <Button color="inherit" component={Link} to="/">
            Proyectos
          </Button>
          <Button color="inherit" onClick={handleSignOut}>
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Outlet />
      </Container>
    </>
  );
};

export default AppLayout;