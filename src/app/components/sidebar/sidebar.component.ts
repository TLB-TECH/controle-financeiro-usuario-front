import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { LogoService } from '../../services/logo.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  @Input() activePage: 'dashboard' | 'lancamentos' | 'centro-custo' | 'cartoes' | 'perfil' | 'contas' | 'tipo-conta' | 'orcamentos' | 'orcamento-cartoes' | 'metas' = 'dashboard';
  private authService = inject(AuthService);
  private router = inject(Router);
  logoService = inject(LogoService);
  ano = new Date().getFullYear();

  private gruposAbertos = new Set<string>();
  private selecaoManual: string | null = null;

  ngOnInit(): void {
    if (this.activePage === 'centro-custo' || this.activePage === 'cartoes') this.gruposAbertos.add('lancamentos');
  }

  grupoAberto(chave: string): boolean {
    return this.gruposAbertos.has(chave);
  }

  itemAtivo(chave: string): boolean {
    if (this.selecaoManual) return this.selecaoManual === chave;
    return this.activePage === chave;
  }

  toggleGrupo(chave: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.gruposAbertos.has(chave)) {
      this.gruposAbertos.delete(chave);
      if (this.selecaoManual === chave) this.selecaoManual = null;
    } else {
      this.gruposAbertos.add(chave);
      this.selecaoManual = chave;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
