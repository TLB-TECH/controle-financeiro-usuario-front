import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

function senhasIguaisValidator(control: AbstractControl): ValidationErrors | null {
  const senha = control.get('senha');
  const confirmar = control.get('confirmarSenha');
  if (senha && confirmar && senha.value !== confirmar.value) {
    return { senhasDiferentes: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    confirmarSenha: ['', Validators.required]
  }, { validators: senhasIguaisValidator });

  carregando = false;
  erro = '';
  sucesso = '';
  mostrarSenha = false;
  mostrarConfirmar = false;

  get nomeInvalido() { const c = this.form.get('nome'); return !!(c?.invalid && c?.touched); }
  get emailInvalido() { const c = this.form.get('email'); return !!(c?.invalid && c?.touched); }
  get senhaInvalida() { const c = this.form.get('senha'); return !!(c?.invalid && c?.touched); }
  get confirmarInvalida() {
    const c = this.form.get('confirmarSenha');
    return !!(c?.touched && this.form.hasError('senhasDiferentes'));
  }

  cadastrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando = true;
    this.erro = '';

    const { confirmarSenha, ...dados } = this.form.value;

    this.authService.cadastrar(dados).subscribe({
      next: () => {
        this.sucesso = 'Conta criada com sucesso!';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.erro = err.status === 409
          ? 'E-mail já cadastrado.'
          : 'Erro ao cadastrar. Tente novamente.';
        this.carregando = false;
      }
    });
  }
}
