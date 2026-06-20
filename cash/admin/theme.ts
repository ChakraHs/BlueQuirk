// src/admin/theme.ts
import { createTheme } from '@mui/material/styles';

export const adminTheme = createTheme({
  palette: {
    primary: { main: '#4e98daff' }, // Blue
    secondary: { main: '#0baff5ff' }, // Yellow accent
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});
