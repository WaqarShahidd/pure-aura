import { createTheme } from '@mui/material/styles'

// Written from scratch. It deliberately does NOT import the storefront's muiTheme.
//
// That theme sets shape.borderRadius to 999 globally, which exists to make pill-shaped
// buttons on a beauty site. Inherited here it would round every Paper, Card, Menu, Dialog,
// Snackbar and table container into a capsule - plan/02 already tracks that as a live
// problem on the storefront, and a dashboard is where it would look worst.
//
// The brand colours carry over so the two apps read as the same company; nothing else does.
const brand = {
  charcoal: '#1a1a1a',
  charcoalSoft: '#2b2b2b',
  cream: '#faf9f5',
  sage: '#eef1e7',
  sageDark: '#dfe4d3',
  olive: '#5c6152',
  accent: '#e2733a',
  textMuted: '#6b6b6b',
}

export const adminTheme = createTheme({
  palette: {
    primary: { main: brand.charcoal, light: brand.charcoalSoft, contrastText: '#ffffff' },
    secondary: { main: brand.accent, contrastText: '#ffffff' },
    background: { default: '#f6f6f4', paper: '#ffffff' },
    text: { primary: brand.charcoal, secondary: brand.textMuted },
    success: { main: '#2e7d52' },
    warning: { main: '#b26a00' },
    error: { main: '#c0392b' },
    divider: 'rgba(26,26,26,0.12)',
  },

  shape: { borderRadius: 8 },

  typography: {
    // A system stack, not Playfair. The storefront's serif is a brand voice; a dense
    // table of numbers wants the font the operating system renders best.
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 600 },
    h2: { fontSize: '1.375rem', fontWeight: 600 },
    h3: { fontSize: '1.125rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },

  components: {
    // Flat and outlined rather than shadowed: a dashboard with a dozen raised cards reads
    // as noise. plan/02 warns that local borderRadius overrides pile up - these global
    // ones are the deliberate single place they live instead.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 8, border: '1px solid rgba(26,26,26,0.10)' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 8, border: '1px solid rgba(26,26,26,0.10)' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 6 } },
    },
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiChip: { styleOverrides: { root: { borderRadius: 6 } } },
    MuiTableCell: { styleOverrides: { root: { padding: '10px 16px' } } },
    // Drawers and dialogs are Paper underneath, so without this they would inherit the
    // border above and draw a stray hairline against the viewport edge.
    MuiDrawer: {
      styleOverrides: { paper: { borderRadius: 0, border: 'none' } },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 10 } } },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 8, boxShadow: '0 8px 24px rgba(26,26,26,0.12)' },
      },
    },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 6 } } },
  },
})

export { brand }
