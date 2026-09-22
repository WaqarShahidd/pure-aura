import TextField from '@mui/material/TextField'
import { cn } from '../../../utils/classNames'

export default function Input({ className, ...props }) {
  return (
    <TextField
      variant="outlined"
      size="medium"
      className={cn('bg-white', className)}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 999,
        },
      }}
      {...props}
    />
  )
}
