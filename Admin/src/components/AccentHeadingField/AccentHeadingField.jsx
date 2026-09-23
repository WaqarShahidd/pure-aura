import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material'

// How an admin expresses the italic fragment that used to be written as JSX.
//
// Storage is { text, accent } where `accent` is a substring of `text`. Chosen over a
// marker syntax like "Your skin. {Glowing.}" for three reasons: PageHero already works
// this way (title.endsWith(accent)), two plain inputs need no explaining, and there is no
// escaping problem when the copy itself contains a brace. A mismatch degrades to a plain
// heading rather than producing broken markup.
//
// The preview loads Playfair Display so the admin sees what the storefront will render,
// which is the only place this app uses the brand serif.
export default function AccentHeadingField({ label, value, onChange, helperText }) {
  const text = value?.text ?? ''
  const accent = value?.accent ?? ''

  const words = text.split(/\s+/).filter(Boolean)
  // Whole phrases are common ("glowing skin"), so consecutive pairs are offered too.
  const phrases = words.map((word, index) => words.slice(index, index + 2).join(' '))
  const options = [...new Set([...words, ...phrases])]

  const at = accent ? text.indexOf(accent) : -1
  const matches = !accent || at !== -1

  return (
    <Stack spacing={1.5}>
      <TextField
        label={label}
        value={text}
        onChange={(event) => onChange({ text: event.target.value, accent })}
        helperText={helperText}
        fullWidth
      />

      <Autocomplete
        freeSolo
        options={options}
        value={accent}
        onInputChange={(event, next) => onChange({ text, accent: next ?? '' })}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Italic fragment"
            error={!matches}
            helperText={
              matches
                ? 'Must appear inside the heading. Leave empty for no emphasis.'
                : 'Not found in the heading — it will render plain.'
            }
          />
        )}
      />

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: '#faf9f5',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Preview</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 500 }}>
          {matches && accent ? (
            <>
              {text.slice(0, at)}
              <Box
                component="span"
                sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic' }}
              >
                {accent}
              </Box>
              {text.slice(at + accent.length)}
            </>
          ) : (
            text || (
              <Box component="span" sx={{ color: 'text.disabled' }}>
                Nothing yet
              </Box>
            )
          )}
        </Typography>
      </Box>
    </Stack>
  )
}
