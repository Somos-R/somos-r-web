import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import type { SxProps, Theme } from '@mui/material/styles'

export interface ButtonProps {
  variant?: 'contained' | 'outlined' | 'text' | 'destructive'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

export function Button({
  variant = 'contained',
  size = 'medium',
  loading = false,
  disabled,
  fullWidth,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  children,
  sx,
}: ButtonProps) {
  const muiVariant: MuiButtonProps['variant'] =
    variant === 'destructive' ? 'contained' : variant

  const colorProp: MuiButtonProps['color'] =
    variant === 'destructive' ? 'error' : 'primary'

  return (
    <MuiButton
      variant={muiVariant}
      color={colorProp}
      size={size}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      startIcon={loading ? undefined : startIcon}
      endIcon={loading ? undefined : endIcon}
      onClick={onClick}
      type={type}
      sx={sx}
    >
      {loading ? <CircularProgress size={18} color="inherit" /> : children}
    </MuiButton>
  )
}
