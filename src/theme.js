import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#ff0099', // Tu color primario
    },
    secondary: {
      main: '#2ecc71', // Tu color secundario
    },
    error: {
      main: '#e74c3c', // Tu color de acento, usado para errores
    },
    text: {
      primary: '#2c3e50', // Tu color de texto principal
    },
    background: {
      default: '#f4f4f4', // Color de fondo general
      paper: '#ffffff', // Color de fondo para las "tarjetas" o componentes elevados
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Arial', sans-serif",
    h1: {
      color: '#2c3e50',
    },
    h2: {
      color: '#2c3e50',
    },
    h3: {
      color: '#2c3e50',
    },
    h4: {
      color: '#2c3e50',
    },
    h5: {
      color: '#2c3e50',
    },
    h6: {
      color: '#2c3e50',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          textTransform: 'none', // Para mantener el texto en minúsculas/mayúsculas como está
          fontWeight: 500,
          transition: 'background-color 0.3s ease, transform 0.1s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
        containedPrimary: {
          backgroundColor: '#ff0099',
          color: 'white',
          '&:hover': {
            backgroundColor: '#e5008a', // Un tono más oscuro para el hover
          },
        },
        containedSecondary: {
          backgroundColor: '#6c757d',
          color: 'white',
          '&:hover': {
            backgroundColor: '#5a6268',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          '&:hover': {
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
            transform: 'translateY(-5px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 400,
          fontSize: '1rem',
          marginRight: '8px',
          color: '#757575',
          '&.Mui-selected': {
            color: '#ff0099',
            fontWeight: 700,
          },
          '&:hover': {
            color: 'black',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            opacity: 1,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#ff0099',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#ff0099',
          '& .MuiTableCell-head': {
            color: 'black',
            fontWeight: 'bold',
          },
        },
      },
    },
  },
});

export default theme;