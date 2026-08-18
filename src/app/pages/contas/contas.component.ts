import { Component, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ContaService, ContaResponse, ContaRequest } from '../../services/conta.service';
import { TipoContaService, TipoContaDTO } from '../../services/tipo-conta.service';
import { TransferenciaModalComponent } from './transferencia-modal.component';

@Component({
    selector: 'app-contas',
    standalone: true,
    imports: [
        CommonModule, RouterLink, ReactiveFormsModule, SidebarComponent,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatSelectModule, MatButtonModule, MatCheckboxModule, MatIconModule,
        MatTableModule, MatSnackBarModule, MatDialogModule
    ],
    templateUrl: './contas.component.html',
    styleUrl: './contas.component.scss'
})
export class ContasComponent implements OnInit {
    private fb = inject(FormBuilder);
    private svc = inject(ContaService);
    private tipoContaSvc = inject(TipoContaService);
    private snack = inject(MatSnackBar);
    private dialog = inject(MatDialog);

    @ViewChild('formDialog') formDialogTpl!: TemplateRef<any>;
    @ViewChild('cadastroDialog') cadastroDialogTpl!: TemplateRef<any>;
    @ViewChild('confirmExclusaoDialog') confirmExclusaoTpl!: TemplateRef<any>;
    private dialogRef: MatDialogRef<any> | null = null;
    private cadastroDialogRef: MatDialogRef<any> | null = null;
    private confirmExclusaoRef: MatDialogRef<any> | null = null;

    contas: ContaResponse[] = [];
    editandoId: number | null = null;
    carregando = false;
    carregandoCadastro = false;
    excluindo = false;
    contaParaExcluir: ContaResponse | null = null;

    colunas = ['nome', 'banco', 'tipo', 'saldo', 'acoes'];

    tiposConta: TipoContaDTO[] = [];

    form = this.fb.group({
        nome: ['', Validators.required],
        banco: ['', Validators.required],
        tipoContaId: [null as number | null, Validators.required]
    });
    private saldoContaEditando = 0;

    formCadastro = this.fb.group({
        nome: ['', Validators.required],
        banco: ['', Validators.required],
        corrente: [true],
        aplicacao: [false],
        saldoInicial: [0, Validators.required]
    });
    saldoInicialDisplay = '0,00';

    ngOnInit() {
        this.carregarTiposConta();
        this.carregar();
    }

    carregarTiposConta() {
        this.tipoContaSvc.listar(true).subscribe(dados => this.tiposConta = dados);
    }

    formatarNumero(valor: number): string {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    get tiposBanco(): TipoContaDTO[] {
        return this.tiposConta.filter(t => t.categoria === 'BANCO');
    }

    get tiposAplicacao(): TipoContaDTO[] {
        return this.tiposConta.filter(t => t.categoria === 'APLICACAO');
    }

    get contasBanco(): ContaResponse[] {
        return this.contas.filter(c => c.tipoConta?.categoria === 'BANCO');
    }

    get contasAplicacao(): ContaResponse[] {
        return this.contas.filter(c => c.tipoConta?.categoria === 'APLICACAO');
    }

    carregar() {
        this.svc.listar().subscribe(dados => this.contas = dados);
    }

    salvar() {
        if (this.form.invalid || !this.editandoId) return;
        this.carregando = true;
        const dto = { ...this.form.value, saldo: this.saldoContaEditando } as any;

        this.svc.atualizar(this.editandoId, dto).subscribe({
            next: () => {
                this.snack.open('Conta atualizada!', 'X', { duration: 3000 });
                this.fecharFormulario();
                this.carregar();
            },
            error: () => {
                this.snack.open('Erro ao salvar conta.', 'X', { duration: 3000 });
                this.carregando = false;
            }
        });
    }

    editar(conta: ContaResponse) {
        this.editandoId = conta.id;
        this.saldoContaEditando = conta.saldo;
        this.form.patchValue({
            nome: conta.nome,
            banco: conta.banco,
            tipoContaId: conta.tipoConta?.id ?? null
        });
        this.dialogRef = this.dialog.open(this.formDialogTpl, {
            width: '480px',
            panelClass: 'tlb-dialog',
            autoFocus: 'first-tabbable'
        });
    }

    fecharFormulario() {
        this.dialogRef?.close();
        this.dialogRef = null;
        this.editandoId = null;
        this.saldoContaEditando = 0;
        this.form.reset();
        this.carregando = false;
    }

    pedirConfirmacaoExclusao(conta: ContaResponse) {
        this.contaParaExcluir = conta;
        this.confirmExclusaoRef = this.dialog.open(this.confirmExclusaoTpl, {
            width: '440px',
            panelClass: 'tlb-dialog',
            autoFocus: false
        });
    }

    cancelarExclusao() {
        this.confirmExclusaoRef?.close();
        this.confirmExclusaoRef = null;
        this.contaParaExcluir = null;
    }

    confirmarExclusao() {
        if (!this.contaParaExcluir) return;
        this.excluindo = true;
        this.svc.excluir(this.contaParaExcluir.id).subscribe({
            next: () => {
                this.snack.open('Conta excluída!', 'X', { duration: 3000 });
                this.excluindo = false;
                this.cancelarExclusao();
                this.carregar();
            },
            error: () => {
                this.snack.open('Erro ao excluir.', 'X', { duration: 3000 });
                this.excluindo = false;
                this.cancelarExclusao();
            }
        });
    }

    abrirTransferencia() {
        const ref = this.dialog.open(TransferenciaModalComponent, {
            width: '620px',
            panelClass: ['tlb-dialog', 'transferencia-dialog'],
            data: { contas: this.contas }
        });
        ref.afterClosed().subscribe(ok => { if (ok) this.carregar(); });
    }

    formatarMoedaDisplay(valor: number | null): string {
        const v = valor ?? 0;
        return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    onSaldoInicialInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const digitos = input.value.replace(/\D/g, '');
        const numero = digitos ? parseInt(digitos, 10) / 100 : 0;
        this.formCadastro.get('saldoInicial')!.setValue(numero);
        this.saldoInicialDisplay = this.formatarMoedaDisplay(numero);
        input.value = this.saldoInicialDisplay;
    }

    abrirCadastro() {
        this.formCadastro.reset({ corrente: true, aplicacao: false, saldoInicial: 0 });
        this.saldoInicialDisplay = '0,00';
        this.cadastroDialogRef = this.dialog.open(this.cadastroDialogTpl, {
            width: '480px',
            panelClass: ['tlb-dialog', 'cadastro-conta-dialog'],
            autoFocus: 'first-tabbable'
        });
    }

    fecharCadastro() {
        this.cadastroDialogRef?.close();
        this.cadastroDialogRef = null;
        this.carregandoCadastro = false;
    }

    get temTipoSelecionado(): boolean {
        const v = this.formCadastro.value;
        return !!(v.corrente || v.aplicacao);
    }

    /** Cria conta(s) com o saldo inicial informado. Se Corrente e Poupança/Aplicação forem marcados,
     *  cria duas contas iguais (mesmo nome/banco/saldo inicial), diferindo só pelo tipo.
     *  Esse é o único momento em que o saldo é definido manualmente — depois disso, toda
     *  movimentação deve ser feita em Lançamentos (saídas e recebíveis). */
    salvarCadastro() {
        if (this.formCadastro.invalid || !this.temTipoSelecionado) return;
        this.carregandoCadastro = true;
        const { nome, banco, corrente, aplicacao, saldoInicial } = this.formCadastro.value;
        const saldo = saldoInicial ?? 0;

        const requisicoes: Observable<ContaResponse>[] = [];
        if (corrente) {
            requisicoes.push(this.svc.criar({ nome, banco, tipoContaId: this.tiposBanco[0]?.id ?? null, saldo } as ContaRequest));
        }
        if (aplicacao) {
            requisicoes.push(this.svc.criar({ nome, banco, tipoContaId: this.tiposAplicacao[0]?.id ?? null, saldo } as ContaRequest));
        }

        forkJoin(requisicoes).subscribe({
            next: () => {
                this.snack.open(requisicoes.length > 1 ? 'Contas criadas!' : 'Conta criada!', 'X', { duration: 3000 });
                this.fecharCadastro();
                this.carregar();
            },
            error: () => {
                this.snack.open('Erro ao salvar conta.', 'X', { duration: 3000 });
                this.carregandoCadastro = false;
            }
        });
    }

}
