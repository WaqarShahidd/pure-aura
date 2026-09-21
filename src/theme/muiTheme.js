import { createTheme } from '@mui/material/styles'
import { palette } from './palette'
import { typography } from './typography'

export const muiTheme = createTheme({
  palette: {
    primary: { main: palette.charcoal },
    secondary: { main: palette.accent },
    background: { default: palette.white, paper: palette.white },
    text: { primary: palette.charcoal, secondary: palette.textMuted },
  },
  typography,
  shape: { borderRadius: 999 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, padding: '10px 24px' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
  },
})
