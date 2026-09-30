import { useState } from 'react'
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
import { PersonPicker, type Person } from './PersonPicker'
import { catalogQueries } from '../../queries/catalogs'
import { inventoryQueries } from '../../queries/inventory'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { weighingsService } from '../../services/weighings'
import { t } from '../../lib/i18n'
import { getApiErrorMessage } from '../../lib/apiError'

interface Props {
  open: boolean
  onClose: () => void
}

interface FormState {
  material_code: string
  warehouse_id: string
  kg: string
  price_per_kg: string
}

const EMPTY: FormState = { material_code: '', warehouse_id: '', kg: '', price_per_kg: '' }

export default function RegisterWeighingDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY)
  // Who delivers is held apart from the plain fields: it is a registered recycler or an unregistered seller.
  const [person, setPerson] = useState<Person | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'person', string>>>({})
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const { data: materials = [] } = useQuery({ ...catalogQueries.materials(), enabled: open })
  const { data: warehouses = [] } = useQuery({ ...catalogQueries.warehouses(), enabled: open })

  // The reference price of the chosen material + warehouse: one filtered row from the server,
  // instead of loading the whole inventory just to look one up.
  const pairKey = form.material_code && form.warehouse_id ? `${form.material_code}|${form.warehouse_id}` : ''
  const { data: priceLookup } = useQuery({
    ...inventoryQueries.priceSuggestion(form.material_code, form.warehouse_id),
    enabled: open && pairKey !== '',
  })
  const suggestedPrice = priceLookup?.items[0]?.price_per_kg
  const [suggestionAppliedFor, setSuggestionAppliedFor] = useState('')
  if (suggestedPrice !== undefined && pairKey !== '' && suggestionAppliedFor !== pairKey) {
    // Adjusting state during render: fill the price once per material + warehouse choice.
    setSuggestionAppliedFor(pairKey)
    setForm((p) => ({ ...p, price_per_kg: String(Number(suggestedPrice)) }))
  }

  // Reset the form each time the drawer opens (adjusting state during render, not in an effect)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setForm(EMPTY); setErrors({}); setSuggestionAppliedFor(''); setPerson(null) }
  }

  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: (f: FormState) =>
      weighingsService.create({
        // Exactly one of the two: a registered recycler, or the unregistered seller's own data.
        ...(person?.kind === 'registered'
          ? { recycler_id: person.recycler.id }
          : { seller: { full_name: person!.full_name, id_type: person!.id_type, id_number: person!.id_number } }),
        material_code: f.material_code,
        warehouse_id: f.warehouse_id,
        kg: Number(f.kg),
        price_per_kg: Number(f.price_per_kg),
      }),
    onSuccess: () => {
      invalidateAffected(queryClient, AFFECTED.weighingRegistered)
      setSnackbar({ open: true, message: t.pesajes.drawer.success, severity: 'success' })
      onClose()
    },
    onError: (err: unknown) => {
      setSnackbar({ open: true, message: getApiErrorMessage(err, t.pesajes.drawer.error), severity: 'error' })
    },
  })

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState | 'person', string>> = {}
    if (!person) e.person = t.pesajes.drawer.validation.person
    if (!form.material_code) e.material_code = t.pesajes.drawer.validation.material
    if (!form.warehouse_id) e.warehouse_id  = t.pesajes.drawer.validation.warehouse
    if (!form.kg || Number(form.kg) <= 0) e.kg = t.pesajes.drawer.validation.kg
    if (!form.price_per_kg || Number(form.price_per_kg) <= 0) e.price_per_kg = t.pesajes.drawer.validation.pricePerKg
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

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 440 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography variant="h6" component="h2" fontWeight={600}>{t.pesajes.drawer.title}</Typography>
          <IconButton size="small" aria-label={t.common.close} onClick={onClose} disabled={mutation.isPending}>
            <X size={18} />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto', flex: 1 }}>

          {/* Quién entrega */}
          <PersonPicker value={person} onChange={(next) => { setPerson(next); setErrors((p) => ({ ...p, person: '' })) }} error={errors.person} />

          {/* Material */}
          <MuiTextField
            select fullWidth size="small" label={`${t.pesajes.drawer.material} *`}
            value={form.material_code}
            onChange={(e) => set('material_code', e.target.value)}
            error={!!errors.material_code}
            helperText={errors.material_code}
          >
            <MenuItem value="" disabled>{t.pesajes.drawer.selectMaterial}</MenuItem>
            {materials.map((m) => (
              <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>
            ))}
          </MuiTextField>

          {/* Bodega */}
          <MuiTextField
            select fullWidth size="small" label={`${t.pesajes.drawer.warehouse} *`}
            value={form.warehouse_id}
            onChange={(e) => set('warehouse_id', e.target.value)}
            error={!!errors.warehouse_id}
            helperText={errors.warehouse_id}
          >
            <MenuItem value="" disabled>{t.pesajes.drawer.selectWarehouse}</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </MuiTextField>

          {/* Kg */}
          <MuiTextField
            fullWidth size="small" label={`${t.pesajes.drawer.kg} *`}
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
            fullWidth size="small" label={`${t.pesajes.drawer.pricePerKg} *`}
            type="number"
            value={form.price_per_kg}
            onChange={(e) => set('price_per_kg', e.target.value)}
            error={!!errors.price_per_kg}
            helperText={errors.price_per_kg ?? (form.material_code && form.warehouse_id ? t.pesajes.drawer.priceAutoFilled : t.pesajes.drawer.priceHint)}
            inputProps={{ min: 1, step: 10 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />

          {/* Resumen */}
          {form.kg && form.price_per_kg && Number(form.kg) > 0 && Number(form.price_per_kg) > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary">{t.pesajes.drawer.totalToPay}</Typography>
              <Typography variant="h6" component="p" fontWeight={700} color="success.dark">
                ${(Number(form.kg) * Number(form.price_per_kg)).toLocaleString('es-CO')}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider />

        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={onClose} disabled={mutation.isPending}>{t.common.cancel}</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>{t.pesajes.drawer.submit}</Button>
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
