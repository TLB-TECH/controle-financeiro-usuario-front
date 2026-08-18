import { Component, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CartaoCreditoService, CartaoCreditoDTO } from '../../services/cartao-credito.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    SidebarComponent
  ],
  templateUrl: './cartoes.html',
  styleUrl: './cartoes.scss'
})
export class Cartoes implements OnInit {
  private cartaoCreditoService = inject(CartaoCreditoService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  @ViewChild('formDialog') formDialogTpl!: TemplateRef<any>;
  @ViewChild('confirmExclusaoDialog') confirmExclusaoTpl!: TemplateRef<any>;
  private dialogRef: MatDialogRef<any> | null = null;
  private confirmExclusaoRef: MatDialogRef<any> | null = null;

  cartoes: CartaoCreditoDTO[] = [];
  carregando = true;
  salvando = false;
  excluindo = false;
  editandoId: number | null = null;
  cartaoParaExcluir: CartaoCreditoDTO | null = null;

  colunas = ['nome', 'limite', 'acoes'];

  form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    limite: [null, [Validators.min(0)]]
  });

  limiteDisplay = '';

  onLimiteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '');
    const numero = digitos ? parseInt(digitos, 10) / 100 : null;
    this.form.get('limite')!.setValue(numero);
    this.limiteDisplay = numero == null ? '' : numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    input.value = this.limiteDisplay;
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.cartaoCreditoService.listar().subscribe({
      next: (data) => { this.cartoes = data; this.carregando = false; },
      error: () => {
        this.snackBar.open('Erro ao carregar cartões.', 'Fechar', { duration: 3000 });
        this.carregando = false;
      }
    });
  }

  abrirNovo(): void {
    this.editandoId = null;
    this.form.reset();
    this.limiteDisplay = '';
    this.dialogRef = this.dialog.open(this.formDialogTpl, {
      width: '480px',
      panelClass: 'tlb-dialog',
      autoFocus: 'first-tabbable'
    });
  }

  editar(cartao: CartaoCreditoDTO): void {
    this.editandoId = cartao.id;
    this.form.patchValue({ nome: cartao.nome, limite: cartao.limite ?? null });
    this.limiteDisplay = cartao.limite == null ? '' : cartao.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.dialogRef = this.dialog.open(this.formDialogTpl, {
      width: '480px',
      panelClass: 'tlb-dialog',
      autoFocus: 'first-tabbable'
    });
  }

  fecharFormulario(): void {
    this.dialogRef?.close();
    this.dialogRef = null;
    this.editandoId = null;
    this.form.reset();
    this.limiteDisplay = '';
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.salvando = true;
    const dados = { nome: this.form.value.nome, limite: this.form.value.limite ?? undefined };

    const operacao = this.editandoId
      ? this.cartaoCreditoService.atualizar(this.editandoId, dados)
      : this.cartaoCreditoService.criar(dados);

    operacao.subscribe({
      next: () => {
        this.snackBar.open(
          this.editandoId ? 'Atualizado com sucesso!' : 'Criado com sucesso!',
          'Fechar', { duration: 3000 }
        );
        this.fecharFormulario();
        this.carregar();
        this.salvando = false;
      },
      error: () => {
        this.snackBar.open('Erro ao salvar. Tente novamente.', 'Fechar', { duration: 3000 });
        this.salvando = false;
      }
    });
  }

  pedirConfirmacaoExclusao(cartao: CartaoCreditoDTO): void {
    this.cartaoParaExcluir = cartao;
    this.confirmExclusaoRef = this.dialog.open(this.confirmExclusaoTpl, {
      width: '440px',
      panelClass: 'tlb-dialog',
      autoFocus: false
    });
  }

  cancelarExclusao(): void {
    this.confirmExclusaoRef?.close();
    this.confirmExclusaoRef = null;
    this.cartaoParaExcluir = null;
  }

  confirmarExclusao(): void {
    if (!this.cartaoParaExcluir) return;
    this.excluindo = true;
    this.cartaoCreditoService.excluir(this.cartaoParaExcluir.id).subscribe({
      next: () => {
        this.snackBar.open('Excluído com sucesso!', 'Fechar', { duration: 3000 });
        this.excluindo = false;
        this.cancelarExclusao();
        this.carregar();
      },
      error: (err) => {
        const mensagem = err?.error?.message ?? 'Erro ao excluir.';
        this.snackBar.open(mensagem, 'Fechar', { duration: 4000 });
        this.excluindo = false;
        this.cancelarExclusao();
      }
    });
  }

  formatarValor(valor?: number): string {
    return valor == null ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
