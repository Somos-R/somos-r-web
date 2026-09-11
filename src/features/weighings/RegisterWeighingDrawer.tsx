import { useState, useEffect } from 'react'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import { X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Snackbar } from '../../components/ui'
import { recyclersService } from '../../services/recyclers'
import { inventoryService } from '../../services/inventory'
import { weighingsService } from '../../services/weighings'

interface Props {
  open: boolean
  onClose: () => void
}

interface FormState {
  recycler_id: string
  material_code: string
  warehouse_id: string
  kg: string
  precio_kg: string
}

const EMPTY: FormState = { recycler_id: '', material_code: '', warehouse_id: '', kg: '', precio_kg: '' }

export default function RegisterWeighingDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const { data: recyclersData } = useQuery({
    queryKey: ['recyclers', 'verified'],
    queryFn: () => recyclersService.list({ verification_status: 'verified' }),
    enabled: open,
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['inventory', 'materials'],
    queryFn: () => inventoryService.materials(),
    enabled: open,
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: () => inventoryService.warehouses(),
    enabled: open,
  })

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.list(),
    enabled: open,
  })

  // Auto-suggest precio_kg from inventory when material + warehouse are selected
  useEffect(() => {
    if (!form.material_code || !form.warehouse_id || !inventoryItems) return
    const match = inventoryItems.items.find(
      (i) => i.material_code === form.material_code && i.warehouse_id === form.warehouse_id
    )
    if (match) {
      setForm((p) => ({ ...p, precio_kg: String(Number(match.precio_kg)) }))
    }
  }, [form.material_code, form.warehouse_id, inventoryItems])

  // Reset form when drawer opens
  useEffect(() => {
    if (open) { setForm(EMPTY); setErrors({}) }
  }, [open])

  const mutation = useMutation({
    mutationFn: (f: FormState) =>
      weighingsService.create({
        recycler_id: f.recycler_id,
        material_code: f.material_code,
        warehouse_id: f.warehouse_id,
        kg: Number(f.kg),
        precio_kg: Number(f.precio_kg),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weighings'] })
      setSnackbar({ open: true, message: 'Pesaje registrado correctamente', severity: 'success' })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSnackbar({ open: true, message: msg ?? 'Error al registrar el pesaje', severity: 'error' })
    },
  })

  const validate = (): boolean => {
    const e: Partial<FormState> = {}
    if (!form.recycler_id)  e.recycler_id  = 'Seleccione un reciclador'
    if (!form.material_code) e.material_code = 'Seleccione un material'
    if (!form.warehouse_id) e.warehouse_id  = 'Seleccione una bodega'
    if (!form.kg || Number(form.kg) <= 0) e.kg = 'Ingrese los kg (mayor a 0)'
    if (!form.precio_kg || Number(form.precio_kg) <= 0) e.precio_kg = 'Ingrese el precio (mayor a 0)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (validate()) mutation.mutate(form)
  }

  const set = (key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: '' }))
  }

  const recyclers = recyclersData?.items ?? []

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 440 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography variant="h6" fontWeight={600}>Registrar pesaje</Typography>
          <IconButton size="small" onClick={onClose} disabled={mutation.isPending}>
            <X size={18} />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto', flex: 1 }}>

          {/* Reciclador */}
          <MuiTextField
            select fullWidth size="small" label="Reciclador *"
            value={form.recycler_id}
            onChange={(e) => set('recycler_id', e.target.value)}
            error={!!errors.recycler_id}
            helperText={errors.recycler_id ?? 'Solo recicladores verificados'}
          >
            <MenuItem value="" disabled>Seleccionar reciclador…</MenuItem>
            {recyclers.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.full_name} — {r.id_number}
              </MenuItem>
            ))}
            {recyclers.length === 0 && (
              <MenuItem disabled>No hay recicladores verificados</MenuItem>
            )}
          </MuiTextField>

          {/* Material */}
          <MuiTextField
            select fullWidth size="small" label="Material *"
            value={form.material_code}
            onChange={(e) => set('material_code', e.target.value)}
            error={!!errors.material_code}
            helperText={errors.material_code}
          >
            <MenuItem value="" disabled>Seleccionar material…</MenuItem>
            {materials.map((m) => (
              <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>
            ))}
          </MuiTextField>

          {/* Bodega */}
          <MuiTextField
            select fullWidth size="small" label="Bodega *"
            value={form.warehouse_id}
            onChange={(e) => set('warehouse_id', e.target.value)}
            error={!!errors.warehouse_id}
            helperText={errors.warehouse_id}
          >
            <MenuItem value="" disabled>Seleccionar bodega…</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </MuiTextField>

          {/* Kg */}
          <MuiTextField
            fullWidth size="small" label="Kilogramos *"
            type="number"
            value={form.kg}
            onChange={(e) => set('kg', e.target.value)}
            error={!!errors.kg}
            helperText={errors.kg}
            inputProps={{ min: 0.1, step: 0.1 }}
            InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
          />

          {/* Precio/kg */}
          <MuiTextField
            fullWidth size="small" label="Precio por kg *"
            type="number"
            value={form.precio_kg}
            onChange={(e) => set('precio_kg', e.target.value)}
            error={!!errors.precio_kg}
            helperText={errors.precio_kg ?? (form.material_code && form.warehouse_id ? 'Auto-completado desde inventario' : 'Se completa al seleccionar material y bodega')}
            inputProps={{ min: 1, step: 10 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />

          {/* Resumen */}
          {form.kg && form.precio_kg && Number(form.kg) > 0 && Number(form.precio_kg) > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary">Total a pagar al reciclador</Typography>
              <Typography variant="h6" fontWeight={700} color="success.dark">
                ${(Number(form.kg) * Number(form.precio_kg)).toLocaleString('es-CO')}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider />

        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>Registrar pesaje</Button>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </>
  )
}
