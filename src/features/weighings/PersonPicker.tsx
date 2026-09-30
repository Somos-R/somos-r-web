import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Input, Select } from '../../components/ui'
import { catalogQueries } from '../../queries/catalogs'
import { recyclersService, type RecyclerLookup } from '../../services/recyclers'
import { getApiErrorMessage, getErrorCode } from '../../lib/apiError'
import { t } from '../../lib/i18n'

/** Who delivers the material: a registered recycler (found by document) or a person who is not registered. */
export type Person =
  | { kind: 'registered'; recycler: RecyclerLookup }
  | { kind: 'seller'; full_name: string; id_type: string; id_number: string }

interface Props {
  value: Person | null
  onChange: (person: Person | null) => void
  /** Why the form can't be sent yet (nobody identified). */
  error?: string
}

const FALLBACK_DOCUMENT_TYPES = [
  { code: 'CC', label: t.recicladores.register.documentTypes.CC },
  { code: 'CE', label: t.recicladores.register.documentTypes.CE },
  { code: 'TI', label: t.recicladores.register.documentTypes.TI },
  { code: 'PA', label: t.recicladores.register.documentTypes.PA },
]

const REGISTRY_COLOR = { verified: 'success', pending: 'warning', rejected: 'error' } as const

const AFFILIATION_COLOR = { linked: 'success', unlinked_association: 'warning', independent: 'default' } as const

/**
 * An ECA receives material from whoever brings it, so the person is identified by document, not
 * picked from a list of the recyclers of its linked associations:
 * 1. Look them up (`GET /recyclers/lookup`), whatever their association. A registered recycler shows
 *    how they relate to this ECA (which decides whether the weighing reaches an association).
 * 2. If they aren't registered (404 `recycler_not_found`), the weighing is registered with their name
 *    and document as an unregistered seller.
 */
export function PersonPicker({ value, onChange, error }: Props) {
  const { data: documentTypes = FALLBACK_DOCUMENT_TYPES } = useQuery(catalogQueries.documentTypes())

  const [idType, setIdType] = useState('CC')
  const [document, setDocument] = useState('')
  const [documentError, setDocumentError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [sellerName, setSellerName] = useState('')
  const [sellerNameError, setSellerNameError] = useState('')
  const [searchError, setSearchError] = useState('')
  const [inactive, setInactive] = useState(false)

  const lookup = useMutation({
    meta: { silent: true },
    mutationFn: () => recyclersService.lookup({ document: document.trim(), id_type: idType }),
    onSuccess: (recycler) => {
      if (recycler.is_active) onChange({ kind: 'registered', recycler })
      // A deactivated account can't be weighed: say so instead of letting the form fail later.
      else setInactive(true)
    },
    onError: (err) => {
      if (getErrorCode(err) === 'recycler_not_found') setNotFound(true)
      else setSearchError(getApiErrorMessage(err, t.pesajes.drawer.person.searchError))
    },
  })

  const reset = () => {
    onChange(null)
    setNotFound(false)
    setInactive(false)
    setSearchError('')
    setSellerName('')
    setSellerNameError('')
  }

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    const length = document.trim().length
    if (length < 3 || length > 20) {
      setDocumentError(t.pesajes.drawer.person.documentLength)
      return
    }
    setNotFound(false)
    setInactive(false)
    setSearchError('')
    lookup.mutate()
  }

  const registerAsSeller = () => {
    const name = sellerName.trim()
    if (name.length < 2) {
      setSellerNameError(t.pesajes.drawer.validation.sellerName)
      return
    }
    onChange({ kind: 'seller', full_name: name, id_type: idType, id_number: document.trim() })
  }

  // ── Someone is identified: show who, and how they relate to this ECA.
  if (value) {
    const registered = value.kind === 'registered'
    return (
      <Box component="section" aria-label={t.pesajes.drawer.who} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box>
            <Typography variant="body2" fontWeight={600}>{registered ? value.recycler.full_name : value.full_name}</Typography>
            <Typography variant="caption" color="text.secondary" component="p">
              {registered ? `${value.recycler.id_type} ${value.recycler.id_number}` : `${value.id_type} ${value.id_number}`}
            </Typography>
          </Box>
          <Button variant="text" size="small" onClick={reset}>{t.pesajes.drawer.person.change}</Button>
        </Box>
        {registered ? (
          <>
            <Typography variant="caption" color="text.secondary">
              {t.pesajes.drawer.person.association}: {value.recycler.association?.legal_name ?? t.pesajes.drawer.person.noAssociation}
              {value.recycler.association?.city ? ` · ${value.recycler.association.city}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Badge label={t.pesajes.affiliation[value.recycler.affiliation]} color={AFFILIATION_COLOR[value.recycler.affiliation]} />
              {value.recycler.verification_status && (
                <Badge
                  label={`${t.pesajes.drawer.person.registryStatus}: ${t.recicladores.status[value.recycler.verification_status]}`}
                  color={REGISTRY_COLOR[value.recycler.verification_status]}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">{t.pesajes.drawer.person.affiliationNote[value.recycler.affiliation]}</Typography>
          </>
        ) : (
          <>
            <Box>
              <Badge label={t.pesajes.drawer.person.sellerTitle} color="default" />
            </Box>
            <Typography variant="caption" color="text.secondary">{t.pesajes.drawer.person.sellerNote}</Typography>
          </>
        )}
      </Box>
    )
  }

  // ── Nobody yet: look them up by document.
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle2" component="h3" fontWeight={600}>{t.pesajes.drawer.who}</Typography>
      <Box component="form" onSubmit={search} noValidate sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Select
          label={t.pesajes.drawer.person.documentType}
          value={idType}
          onChange={(e) => { setIdType(e.target.value); setNotFound(false) }}
          options={documentTypes.map((d) => ({ value: d.code, label: d.code }))}
          fullWidth={false}
          sx={{ minWidth: 92 }}
          disabled={lookup.isPending}
        />
        <Input
          label={t.pesajes.drawer.person.documentNumber}
          value={document}
          onChange={(e) => { setDocument(e.target.value); setDocumentError(''); setNotFound(false); setInactive(false) }}
          error={!!documentError || !!error}
          helperText={documentError || error}
          disabled={lookup.isPending}
        />
        <Button type="submit" variant="outlined" loading={lookup.isPending} sx={{ mt: 0.25, whiteSpace: 'nowrap' }}>
          {t.pesajes.drawer.person.searchButton}
        </Button>
      </Box>

      {searchError && <Alert severity="error">{searchError}</Alert>}
      {inactive && <Alert severity="error">{t.pesajes.drawer.person.inactive}</Alert>}

      {notFound && (
        <Alert severity="info">
          <Typography variant="body2" fontWeight={600}>{t.pesajes.drawer.person.notFound}</Typography>
          <Typography variant="body2">{t.pesajes.drawer.person.notFoundHint}</Typography>
        </Alert>
      )}
      {notFound && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Input
            label={t.pesajes.drawer.person.sellerName}
            value={sellerName}
            onChange={(e) => { setSellerName(e.target.value); setSellerNameError('') }}
            error={!!sellerNameError}
            helperText={sellerNameError}
          />
          <Button variant="outlined" onClick={registerAsSeller}>{t.pesajes.drawer.person.registerAsSeller}</Button>
        </Box>
      )}
    </Box>
  )
}
