import { lazy } from 'react'

// Each page is its own chunk, downloaded when the user first opens it, so the first load only
// carries the shell (sign-in, layout, menu). A chunk that fails to load is handled by ErrorScreen.
export const Home = lazy(() => import('./features/home/Home'))
export const Audit = lazy(() => import('./features/audit/Audit'))
export const Catalogs = lazy(() => import('./features/catalogs/Catalogs'))
export const Users = lazy(() => import('./features/users/Users'))
