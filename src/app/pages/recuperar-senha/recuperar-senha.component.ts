import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-recuperar-senha',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink,
        MatFormFieldModule, MatInputModule, MatButtonModule],
    templateUrl: './recuperar-senha.component.html',
    styleUrl: './recuperar-senha.component.scss'
})
export class RecuperarSenhaComponent {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    enviado = false;
    carregando = false;
    erro = '';

    enviar() {
        if (this.form.invalid) return;
        this.carregando = true;
        this.erro = '';
        this.auth.recuperarSenha(this.form.value.email!).subscribe({
            next: () => { this.enviado = true; this.carregando = false; },
            error: () => { this.erro = 'Erro ao enviar e-mail. Tente novamente.'; this.carregando = false; }
        });
    }
}