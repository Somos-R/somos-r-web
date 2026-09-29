import { useState, useEffect } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

export function Header() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', color: 'text.primary' }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 56 }}>
        <Box />
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" fontWeight={600}>{timeStr}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {dateStr}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
