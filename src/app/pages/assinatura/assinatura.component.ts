import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AssinaturaService, AcessoDTO } from '../../services/assinatura.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-assinatura',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './assinatura.component.html',
  styleUrl: './assinatura.component.scss'
})
export class AssinaturaComponent implements OnInit {
  private assinaturaService = inject(AssinaturaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  acesso: AcessoDTO | null = null;
  carregandoStatus = true;
  carregandoCheckout = false;
  erro = '';

  ngOnInit(): void {
    this.carregarStatus();
  }

  carregarStatus(): void {
    this.carregandoStatus = true;
    this.assinaturaService.getStatus().subscribe({
      next: (acesso) => { this.acesso = acesso; this.carregandoStatus = false; },
      error: () => { this.erro = 'Não foi possível carregar sua assinatura.'; this.carregandoStatus = false; }
    });
  }

  assinar(): void {
    this.carregandoCheckout = true;
    this.erro = '';
    this.assinaturaService.iniciarCheckout().subscribe({
      next: (res) => { window.location.href = res.urlCheckout; },
      error: () => { this.erro = 'Erro ao iniciar o pagamento. Tente novamente.'; this.carregandoCheckout = false; }
    });
  }

  sair(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
