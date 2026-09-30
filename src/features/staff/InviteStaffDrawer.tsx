import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormDrawer, Snackbar, type FormFieldDef } from '../../components/ui'
import { catalogQueries } from '../../queries/catalogs'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { staffService } from '../../services/staff'
import { t, interpolate } from '../../lib/i18n'
import { getApiErrorMessage } from '../../lib/apiError'

const FALLBACK_DOC_TYPES = [
  { code: 'CC', label: t.recicladores.register.documentTypes.CC },
  { code: 'CE', label: t.recicladores.register.documentTypes.CE },
  { code: 'TI', label: t.recicladores.register.documentTypes.TI },
  { code: 'PA', label: t.recicladores.register.documentTypes.PA },
]

interface Props {
  open: boolean
  onClose: () => void
  /** The inviter's own kind of organization: they can only invite roles of it. */
  userType: string
}

export default function InviteStaffDrawer({ open, onClose, userType }: Props) {
  const queryClient = useQueryClient()
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const { data: documentTypes = FALLBACK_DOC_TYPES } = useQuery({ ...catalogQueries.documentTypes(), enabled: open })
  const { data: roles = [] } = useQuery({ ...catalogQueries.roles(), enabled: open })

  // The catalog lists every customer role; only those of the inviter's own organization are valid
  // (the server rejects the rest with `invalid_role`, this just doesn't offer them).
  const ownRoles = roles.filter((role) => !role.user_type_code || role.user_type_code === userType)

  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: (values: Record<string, string>) =>
      staffService.invite({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        id_type: values.id_type,
        id_number: values.id_number.trim(),
        phone: values.phone?.trim() || null,
        role_code: values.role_code,
      }),
    onSuccess: (person) => {
      invalidateAffected(queryClient, AFFECTED.staffChanged)
      setSnackbar({
        open: true,
        message: interpolate(t.personal.invite.successMessage, { email: person.email }),
        severity: 'success',
      })
      onClose()
    },
    onError: (err: unknown) => {
      setSnackbar({ open: true, message: getApiErrorMessage(err, t.personal.invite.errorMessage), severity: 'error' })
    },
  })

  const fields: FormFieldDef[] = [
    { name: 'full_name', label: t.personal.invite.fields.fullName, type: 'text', required: true },
    {
      name: 'email',
      label: t.personal.invite.fields.email,
      type: 'email',
      required: true,
      validate: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? t.personal.invite.validation.emailInvalid : undefined),
    },
    {
      name: 'id_type',
      label: t.personal.invite.fields.documentType,
      type: 'select',
      required: true,
      options: documentTypes.map((d) => ({ value: d.code, label: d.label })),
    },
    {
      name: 'id_number',
      label: t.personal.invite.fields.documentNumber,
      type: 'text',
      required: true,
      validate: (v) =>
        v.trim().length < 6 || v.trim().length > 20 ? t.personal.invite.validation.documentNumberLength : undefined,
    },
    {
      name: 'phone',
      label: t.personal.invite.fields.phone,
      type: 'tel',
      validate: (v) => (v && !/^\d+$/.test(v) ? t.personal.invite.validation.digitsOnly : undefined),
    },
    {
      name: 'role_code',
      label: t.personal.invite.fields.role,
      type: 'select',
      required: true,
      options: ownRoles.map((role) => ({ value: role.code, label: role.label })),
    },
  ]

  return (
    <>
      <FormDrawer
        open={open}
        onClose={onClose}
        title={t.personal.invite.drawerTitle}
        fields={fields}
        onSubmit={(values) => mutation.mutate(values)}
        isSubmitting={mutation.isPending}
        submitLabel={t.personal.invite.submitLabel}
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
