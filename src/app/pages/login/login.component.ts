import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild, inject } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { LogoService } from "../../services/logo.service";

@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  @ViewChild('inputImagem') inputImagem!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private logoService = inject(LogoService);

  logoUrl = this.logoService.logoUrl;

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]]
  });

  carregando = false;
  erro = '';
  mostrarSenha = false;

  get emailInvalido(): boolean {
    const c = this.form.get('email');
    return !!(c?.invalid && c?.touched);
  }

  get senhaInvalida(): boolean {
    const c = this.form.get('senha');
    return !!(c?.invalid && c?.touched);
  }

  escolherImagem(): void {
    this.inputImagem.nativeElement.click();
  }

  onImagemSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.logoService.setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.carregando = true;
    this.erro = '';
    this.authService.login(this.form.value).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.erro = err.status === 401
          ? 'E-mail ou senha inválidos.'
          : 'Erro ao conectar. Tente novamente.';
        this.carregando = false;
      }
    });
  }
}