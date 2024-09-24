import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Box,
  Alert,
  Snackbar
} from '@mui/material';

const Auth = ({ onAuthStateChange }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        if (data.user) {
          setError({ severity: 'success', message: 'Registro exitoso! Por favor, verifica tu email.' });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: consultant, error: consultantError } = await supabase
            .from('consultants')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
          
          if (consultantError && consultantError.code !== 'PGRST116') {
            throw consultantError;
          }
          onAuthStateChange({ user: data.user, consultant: consultant || null });
        }
      }
    } catch (error) {
      setError({ severity: 'error', message: error.error_description || error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setError({ severity: 'success', message: 'Se ha enviado un correo de recuperación. Por favor, revisa tu bandeja de entrada.' });
    } catch (error) {
      setError({ severity: 'error', message: error.error_description || error.message });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" component="div" gutterBottom align="center">
            {isRecovery ? 'Recuperar Contraseña' : (isSignUp ? 'Registrarse' : 'Iniciar sesión')}
          </Typography>
          <Box component="form" onSubmit={isRecovery ? handlePasswordRecovery : handleAuth} sx={{ mt: 2 }}>
            {isSignUp && !isRecovery && (
              <TextField
                fullWidth
                margin="normal"
                label="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            )}
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {!isRecovery && (
              <TextField
                fullWidth
                margin="normal"
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Cargando...' : (isRecovery ? 'Enviar correo de recuperación' : (isSignUp ? 'Registrarse' : 'Iniciar sesión'))}
            </Button>
          </Box>
          {!isRecovery && (
            <Button
              fullWidth
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes una cuenta? Regístrate'}
            </Button>
          )}
          <Button
            fullWidth
            onClick={() => setIsRecovery(!isRecovery)}
            sx={{ mt: 1 }}
          >
            {isRecovery ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
          </Button>
        </CardContent>
      </Card>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity={error?.severity || 'error'} sx={{ width: '100%' }}>
          {error?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Auth;