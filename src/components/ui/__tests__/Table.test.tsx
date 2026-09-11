import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Table, TableHead, TableBody, TableRow, TableCell } from '../Table'

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
