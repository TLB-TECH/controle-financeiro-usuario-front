import { Component, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TipoContaService, TipoContaDTO, CategoriaTipoConta } from '../../services/tipo-conta.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-tipo-conta',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    SidebarComponent
  ],
  templateUrl: './tipo-conta.html',
  styleUrl: './tipo-conta.scss'
})
export class TipoConta implements OnInit {
  private tipoContaService = inject(TipoContaService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  @ViewChild('formDialog') formDialogTpl!: TemplateRef<any>;
  @ViewChild('confirmExclusaoDialog') confirmExclusaoTpl!: TemplateRef<any>;
  private dialogRef: MatDialogRef<any> | null = null;
  private confirmExclusaoRef: MatDialogRef<any> | null = null;

  tipos: TipoContaDTO[] = [];
  carregando = true;
  salvando = false;
  excluindo = false;
  editandoId: number | null = null;
  confirmarInativacaoId: number | null = null;
  tipoParaExcluir: TipoContaDTO | null = null;

  filtroAtivo: boolean | null = true;

  colunas = ['nome', 'categoria', 'status', 'acoes'];

  form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    categoria: ['BANCO' as CategoriaTipoConta, Validators.required]
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.tipoContaService.listar(this.filtroAtivo).subscribe({
      next: (data) => { this.tipos = data; this.carregando = false; },
      error: () => {
        this.snackBar.open('Erro ao carregar tipos de conta.', 'Fechar', { duration: 3000 });
        this.carregando = false;
      }
    });
  }

  setFiltro(valor: boolean | null): void {
    this.filtroAtivo = valor;
    this.fecharFormulario();
    this.confirmarInativacaoId = null;
    this.cancelarExclusao();
    this.carregar();
  }

  abrirNovo(): void {
    this.editandoId = null;
    this.form.reset({ nome: '', categoria: 'BANCO' });
    this.confirmarInativacaoId = null;
    this.dialogRef = this.dialog.open(this.formDialogTpl, {
      width: '480px',
      panelClass: 'tlb-dialog',
      autoFocus: 'first-tabbable'
    });
  }

  editar(tipo: TipoContaDTO): void {
    this.editandoId = tipo.id ?? null;
    this.form.patchValue({ nome: tipo.nome, categoria: tipo.categoria });
    this.confirmarInativacaoId = null;
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
    this.form.reset({ nome: '', categoria: 'BANCO' });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.salvando = true;
    const dados: TipoContaDTO = {
      nome: this.form.value.nome,
      categoria: this.form.value.categoria
    };

    const operacao = this.editandoId
      ? this.tipoContaService.atualizar(this.editandoId, dados)
      : this.tipoContaService.criar(dados);

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

  pedirConfirmacaoInativacao(id: number): void {
    this.confirmarInativacaoId = id;
  }

  cancelarInativacao(): void {
    this.confirmarInativacaoId = null;
  }

  inativar(id: number): void {
    this.tipoContaService.inativar(id).subscribe({
      next: () => {
        this.snackBar.open('Inativado com sucesso!', 'Fechar', { duration: 3000 });
        this.confirmarInativacaoId = null;
        this.carregar();
      },
      error: () => {
        this.snackBar.open('Erro ao inativar.', 'Fechar', { duration: 3000 });
        this.confirmarInativacaoId = null;
      }
    });
  }

  reativar(id: number): void {
    this.tipoContaService.reativar(id).subscribe({
      next: () => {
        this.snackBar.open('Reativado com sucesso!', 'Fechar', { duration: 3000 });
        this.carregar();
      },
      error: () => {
        this.snackBar.open('Erro ao reativar.', 'Fechar', { duration: 3000 });
      }
    });
  }

  labelCategoria(categoria: CategoriaTipoConta): string {
    return categoria === 'BANCO' ? 'Banco' : 'Aplicação';
  }

  pedirConfirmacaoExclusao(tipo: TipoContaDTO): void {
    this.tipoParaExcluir = tipo;
    this.confirmExclusaoRef = this.dialog.open(this.confirmExclusaoTpl, {
      width: '440px',
      panelClass: 'tlb-dialog',
      autoFocus: false
    });
  }

  cancelarExclusao(): void {
    this.confirmExclusaoRef?.close();
    this.confirmExclusaoRef = null;
    this.tipoParaExcluir = null;
  }

  confirmarExclusao(): void {
    if (!this.tipoParaExcluir?.id) return;
    this.excluindo = true;
    this.tipoContaService.excluir(this.tipoParaExcluir.id).subscribe({
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
}
