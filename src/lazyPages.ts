import { lazy } from 'react'

// Each page is its own chunk, downloaded when the user first opens it, so the first load only
// carries the shell (login, layout, menu). A chunk that fails to load is handled by ErrorScreen.
export const Dashboard = lazy(() => import('./features/dashboard/Dashboard'))
export const Inventory = lazy(() => import('./features/inventory/Inventory'))
export const Recyclers = lazy(() => import('./features/recyclers/Recyclers'))
export const Reports = lazy(() => import('./features/reports/Reports'))
export const SettingsPage = lazy(() => import('./features/settings/Settings'))
export const Staff = lazy(() => import('./features/staff/Staff'))
export const Transactions = lazy(() => import('./features/transactions/Transactions'))
export const Weighings = lazy(() => import('./features/weighings/Weighings'))
