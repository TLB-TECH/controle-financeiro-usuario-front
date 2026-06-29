import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth.service";

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
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

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

get senhaInvalida(): boolean {   // era senhalInvalida (tinha um 'l' a mais)
  const c = this.form.get('senha');
  return !!(c?.invalid && c?.touched);
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
                ? 'E-mail ou senha incorretos.'
                : 'Erro ao conectar. Tente novamente.';
                this.carregando = false;
            }
        });
    }
}