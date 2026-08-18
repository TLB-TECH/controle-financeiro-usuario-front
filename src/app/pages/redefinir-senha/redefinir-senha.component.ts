import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-redefinir-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink,
            MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './redefinir-senha.component.html',
  styleUrl: './redefinir-senha.component.scss'
})
export class RedefinirSenhaComponent implements OnInit {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form = this.fb.group({
    novaSenha:      ['', [Validators.required, Validators.minLength(6)]],
    confirmarSenha: ['', Validators.required]
  });

  token      = '';
  carregando = false;
  erro       = '';
  sucesso    = false;

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.erro = 'Token inválido ou ausente.';
  }

  salvar() {
    if (this.form.invalid) return;
    const { novaSenha, confirmarSenha } = this.form.value;
    if (novaSenha !== confirmarSenha) {
      this.erro = 'As senhas não coincidem.';
      return;
    }
    this.carregando = true;
    this.erro = '';
    this.auth.redefinirSenha(this.token, novaSenha!).subscribe({
      next: () => {
        this.sucesso = true;
        this.carregando = false;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (e) => {
        this.erro = e.error?.message ?? 'Token inválido ou expirado.';
        this.carregando = false;
      }
    });
  }
}