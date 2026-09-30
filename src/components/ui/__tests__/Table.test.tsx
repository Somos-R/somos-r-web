import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Table, TableHead, TableBody, TableRow, TableCell, TablePagination, SortableTableCell } from '../Table'

describe('Table', () => {
  it('renders rows and cells', () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Material</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Papel</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('Papel')).toBeInTheDocument()
  })

  it('forwards colSpan to the underlying cell, for empty-state rows', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={4} align="center">Sin resultados</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByText('Sin resultados').closest('td')).toHaveAttribute('colspan', '4')
  })
})

describe('TablePagination', () => {
  const renderPagination = (count: number) =>
    render(<TablePagination count={count} page={0} rowsPerPage={10} onPageChange={() => undefined} />)

  it('shows the range and the total', () => {
    renderPagination(95)
    expect(screen.getByText('1–10 de 95')).toBeInTheDocument()
  })

  it('says "más de N" when the total is unknown, using the dictionary text', () => {
    renderPagination(-1)
    expect(screen.getByText('1–10 de más de 10')).toBeInTheDocument()
  })
})


describe('SortableTableCell', () => {
  const renderHeader = (props: Partial<React.ComponentProps<typeof SortableTableCell>> = {}) => {
    const onSort = vi.fn()
    render(
      <Table>
        <TableHead>
          <TableRow>
            <SortableTableCell active={false} direction="asc" onSort={onSort} {...props}>Kg</SortableTableCell>
          </TableRow>
        </TableHead>
      </Table>
    )
    return onSort
  }

  it('is a button that asks to sort when clicked', async () => {
    const onSort = renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'Kg' }))
    expect(onSort).toHaveBeenCalledTimes(1)
  })

  it('can be used from the keyboard', async () => {
    const onSort = renderHeader()
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onSort).toHaveBeenCalledTimes(1)
  })

  it('announces the direction of the active column with aria-sort', () => {
    renderHeader({ active: true, direction: 'desc' })
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending')
  })

  it('announces nothing on a column that is not the current order', () => {
    renderHeader()
    expect(screen.getByRole('columnheader')).not.toHaveAttribute('aria-sort')
  })
})
