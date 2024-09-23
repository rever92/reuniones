import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Auth = ({ onAuthStateChange }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });
      if (error) throw error;
      if (data.user) {
        alert('Registro exitoso! Por favor, verifica tu email.');
      } else {
        alert('Algo salió mal. Por favor, intenta de nuevo.');
      }
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const { data: consultant, error: consultantError } = await supabase
          .from('consultants')
          .select('*')
          .eq('user_id', data.user.id)
          .single();
        
        if (consultantError) {
          if (consultantError.code === 'PGRST116') {
            console.log('User is not a consultant');
            // Aquí podrías manejar el caso de un usuario que no es consultor
          } else {
            throw consultantError;
          }
        } else {
          console.log('Inicio de sesión exitoso', consultant);
          // Llamar a la función onAuthStateChange con la información del usuario y consultor
          onAuthStateChange({ user: data.user, consultant });
        }
      } else {
        alert('Algo salió mal. Por favor, intenta de nuevo.');
      }
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSignUp}>
        <input
          type="text"
          placeholder="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Registrarse'}
        </button>
      </form>
      <form onSubmit={handleSignIn}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
};

export default Auth;