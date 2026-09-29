import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Autocomplete, type AutocompleteProps } from '../Autocomplete'

const OPTIONS = [
  { value: '1', label: 'Ana Pérez — 100' },
  { value: '2', label: 'Luis Gómez — 200' },
]

function setup(props: Partial<AutocompleteProps> = {}) {
  const onChange = vi.fn()
  const onInputChange = vi.fn()
  render(
    <Autocomplete
      label="Recycler"
      options={OPTIONS}
      value={null}
      onChange={onChange}
      onInputChange={onInputChange}
      noOptionsText="Nothing"
      loadingText="Loading"
      {...props}
    />,
  )
  return { onChange, onInputChange }
}

describe('Autocomplete', () => {
  it('reports what the user types so the caller can search on the server', async () => {
    const { onInputChange } = setup()
    await userEvent.type(screen.getByRole('combobox', { name: /Recycler/ }), 'an')
    expect(onInputChange).toHaveBeenLastCalledWith('an')
  })

  it('shows every option it is given, without filtering them again', async () => {
    setup()
    await userEvent.type(screen.getByRole('combobox', { name: /Recycler/ }), 'zzz')
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('reports the chosen option', async () => {
    const { onChange } = setup()
    await userEvent.click(screen.getByRole('combobox', { name: /Recycler/ }))
    await userEvent.click(screen.getByRole('option', { name: 'Luis Gómez — 200' }))
    expect(onChange).toHaveBeenCalledWith(OPTIONS[1])
  })

  it('shows the empty text when the server found nothing', async () => {
    setup({ options: [] })
    await userEvent.click(screen.getByRole('combobox', { name: /Recycler/ }))
    expect(screen.getByText('Nothing')).toBeInTheDocument()
  })

  it('shows the loading text while searching', async () => {
    setup({ options: [], loading: true })
    await userEvent.click(screen.getByRole('combobox', { name: /Recycler/ }))
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('shows the helper text', () => {
    setup({ error: true, helperText: 'Pick one' })
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })
})
