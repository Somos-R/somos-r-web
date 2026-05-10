import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormDrawer, Snackbar, type FormFieldDef } from '../../components/ui'
import { apiClient } from '../../lib/apiClient'
import { recyclersService } from '../../services/recyclers'
import { t } from '../../lib/i18n'

interface DocumentType {
  code: string
  name: string
}

const FALLBACK_DOC_TYPES: DocumentType[] = [
  { code: 'CC', name: t.recicladores.register.documentTypes.CC },
  { code: 'CE', name: t.recicladores.register.documentTypes.CE },
  { code: 'TI', name: t.recicladores.register.documentTypes.TI },
  { code: 'PA', name: t.recicladores.register.documentTypes.PA },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function RegisterRecyclerDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const { data: documentTypes = FALLBACK_DOC_TYPES } = useQuery<DocumentType[]>({
    queryKey: ['document-types'],
    queryFn: () => apiClient.get('/catalogs/document-types').then((r) => r.data),
    staleTime: Infinity,
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      recyclersService.create({
        user_type_code: 'recycler',
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        id_type: values.id_type,
        id_number: values.id_number.trim(),
        phone: values.phone?.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recyclers'] })
      setSnackbar({ open: true, message: t.recicladores.register.successMessage, severity: 'success' })
      onClose()
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      const message = axiosErr?.response?.data?.detail ?? t.recicladores.register.errorMessage
      setSnackbar({ open: true, message, severity: 'error' })
    },
  })

  const fields: FormFieldDef[] = [
    { name: 'full_name', label: t.recicladores.register.fields.fullName, type: 'text', required: true },
    {
      name: 'email',
      label: t.recicladores.register.fields.email,
      type: 'email',
      required: true,
      validate: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? t.recicladores.register.validation.emailInvalid : undefined),
    },
    {
      name: 'id_type',
      label: t.recicladores.register.fields.documentType,
      type: 'select',
      required: true,
      options: documentTypes.map((d) => ({ value: d.code, label: d.name })),
    },
    {
      name: 'id_number',
      label: t.recicladores.register.fields.documentNumber,
      type: 'text',
      required: true,
      validate: (v) =>
        v.trim().length < 6 || v.trim().length > 20
          ? t.recicladores.register.validation.documentNumberLength
          : undefined,
    },
    {
      name: 'phone',
      label: t.recicladores.register.fields.phone,
      type: 'tel',
      validate: (v) => (v && !/^\d+$/.test(v) ? t.recicladores.register.validation.digitsOnly : undefined),
    },
  ]

  return (
    <>
      <FormDrawer
        open={open}
        onClose={onClose}
        title={t.recicladores.register.drawerTitle}
        fields={fields}
        onSubmit={(values) => mutation.mutate(values)}
        isSubmitting={mutation.isPending}
        submitLabel={t.recicladores.register.submitLabel}
      />
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </>
  )
}
