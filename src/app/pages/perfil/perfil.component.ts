import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, SidebarComponent,
        MatButtonModule, MatCardModule, MatIconModule, MatSnackBarModule],
    templateUrl: './perfil.component.html',
    styleUrl: './perfil.component.scss'
})
export class PerfilComponent implements OnInit {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);
    private snack = inject(MatSnackBar);

    perfil: any = null;

    formSenha = this.fb.group({
        senhaAtual: ['', Validators.required],
        novaSenha: ['', [Validators.required, Validators.minLength(6)]],
        confirmarSenha: ['', Validators.required]
    });

    carregandoSenha = false;
    confirmarExclusao = false;

    mostrarSenhaAtual = false;
    mostrarNovaSenha = false;
    mostrarConfirmarSenha = false;

    ngOnInit() {
        this.auth.getMeuPerfil().subscribe({
            next: (p) => this.perfil = p,
            error: () => this.snack.open('Erro ao carregar perfil.', 'X', { duration: 3000 })
        });
    }

    alterarSenha() {
        if (this.formSenha.invalid) return;
        const { senhaAtual, novaSenha, confirmarSenha } = this.formSenha.value;
        if (novaSenha !== confirmarSenha) {
            this.snack.open('As senhas não coincidem.', 'X', { duration: 3000 });
            return;
        }
        this.carregandoSenha = true;
        this.auth.alterarSenha({ senhaAtual: senhaAtual!, novaSenha: novaSenha! }).subscribe({
            next: () => {
                this.snack.open('Senha alterada com sucesso!', 'X', { duration: 3000 });
                this.formSenha.reset();
                this.carregandoSenha = false;
            },
            error: (e) => {
                this.snack.open(e.error?.message ?? 'Senha atual incorreta.', 'X', { duration: 3000 });
                this.carregandoSenha = false;
            }
        });
    }

    excluirConta() {
        this.auth.excluirConta().subscribe({
            next: () => {
                this.auth.logout();
                this.router.navigate(['/login']);
            },
            error: () => this.snack.open('Erro ao excluir conta.', 'X', { duration: 3000 })
        });
    }
}