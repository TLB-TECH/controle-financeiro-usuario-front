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
    path: 'recuperar-senha',
    loadComponent: () =>
      import('./pages/recuperar-senha/recuperar-senha.component').then(m => m.RecuperarSenhaComponent)
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import('./pages/redefinir-senha/redefinir-senha.component').then(m => m.RedefinirSenhaComponent)
  },
  {
    path: 'assinatura',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/assinatura/assinatura.component').then(m => m.AssinaturaComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'lancamentos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/lancamentos/lancamentos').then(m => m.LancamentosComponent)
  },
  {
    path: 'centro-custo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/centro-custo/centro-custo').then(m => m.CentroCusto)
  },
  {
    path: 'cartoes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/cartoes/cartoes').then(m => m.Cartoes)
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/perfil/perfil.component').then(m => m.PerfilComponent)
  },
   {
    path: 'contas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/contas/contas.component').then(m => m.ContasComponent)
  },
  {
    path: 'contas/:id/extrato',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/contas/extrato-conta.component').then(m => m.ExtratoContaComponent)
  },
  {
    path: 'tipos-conta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tipo-conta/tipo-conta').then(m => m.TipoConta)
  },

  { path: 'orcamentos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/orcamentos/orcamentos.component').then(m => m.OrcamentosComponent) },

  { path: 'orcamento-cartoes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/orcamento-cartoes/orcamento-cartoes.component').then(m => m.OrcamentoCartoesComponent) },

  { path: 'metas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/metas/metas.component').then(m => m.MetasComponent) },

  { path: '**', redirectTo: 'login' },

 
];