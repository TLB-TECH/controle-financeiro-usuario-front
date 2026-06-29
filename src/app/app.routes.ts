import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
   path: 'cadastro',
  loadComponent: () =>
    import('./pages/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'lancamentos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/lancamentos/lancamentos').then(m => m.Lancamentos)
  },
  {
    path: 'centro-custo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/centro-custo/centro-custo').then(m => m.CentroCusto)
  },
  { path: '**', redirectTo: 'login' }
];