import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { OrcamentoService, Orcamento, OrcamentoRequest, TipoOrcamento } from '../../services/orcamento.service';
import { CentroCustoService, CentroCustoDTO } from '../../services/centro-custo.service';

@Component({
  selector: 'app-orcamentos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatSnackBarModule, SidebarComponent
  ],
  templateUrl: './orcamentos.component.html',
  styleUrls: ['./orcamentos.component.scss']
})
export class OrcamentosComponent implements OnInit {

  @ViewChild('formDialog') formDialogTpl!: TemplateRef<any>;
  private dialogRef: MatDialogRef<any> | null = null;

  orcamentos: Orcamento[] = [];
  centrosCusto: CentroCustoDTO[] = [];
  colunas = ['centroCusto', 'periodo', 'valorLimite', 'acoes'];

  meses = [
    { valor: 1, nome: 'Janeiro' }, { valor: 2, nome: 'Fevereiro' },
    { valor: 3, nome: 'Março' }, { valor: 4, nome: 'Abril' },
    { valor: 5, nome: 'Maio' }, { valor: 6, nome: 'Junho' },
    { valor: 7, nome: 'Julho' }, { valor: 8, nome: 'Agosto' },
    { valor: 9, nome: 'Setembro' }, { valor: 10, nome: 'Outubro' },
    { valor: 11, nome: 'Novembro' }, { valor: 12, nome: 'Dezembro' }
  ];

  formulario: FormGroup;
  editandoId: number | null = null;
  valorLimiteDisplay = '';

  constructor(
    private orcamentoService: OrcamentoService,
    private centroCustoService: CentroCustoService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.formulario = this.fb.group({
      centroCustoId: [null, Validators.required],
      tipo: ['MENSAL' as TipoOrcamento, Validators.required],
      mes: [null, Validators.required],
      ano: [null, Validators.required],
      valorLimite: [null, [Validators.required, Validators.min(0.01)]]
    });

    this.formulario.get('tipo')!.valueChanges.subscribe((tipo: TipoOrcamento) => {
      const mesCtrl = this.formulario.get('mes')!;
      const anoCtrl = this.formulario.get('ano')!;

      if (tipo === 'MENSAL') {
        mesCtrl.setValidators(Validators.required);
      } else {
        mesCtrl.clearValidators();
        mesCtrl.setValue(null);
      }

      if (tipo === 'MENSAL' || tipo === 'ANUAL') {
        anoCtrl.setValidators(Validators.required);
      } else {
        anoCtrl.clearValidators();
        anoCtrl.setValue(null);
      }

      mesCtrl.updateValueAndValidity();
      anoCtrl.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.carregarCentrosCusto();
    this.carregarOrcamentos();
  }

  carregarOrcamentos(): void {
    this.orcamentoService.listar().subscribe({
      next: (data) => this.orcamentos = data.filter(o => o.tipoAlvo === 'CENTRO_CUSTO'),
      error: () => this.snackBar.open('Erro ao carregar orçamentos', 'Fechar', { duration: 3000 })
    });
  }

  carregarCentrosCusto(): void {
    this.centroCustoService.listar(true).subscribe({
      next: (data) => this.centrosCusto = data,
      error: () => this.snackBar.open('Erro ao carregar centros de custo', 'Fechar', { duration: 3000 })
    });
  }

  nomeCentroCusto(id: number): string {
    return this.centrosCusto.find(c => c.id === id)?.nome ?? '—';
  }

  nomeMes(mes: number | null): string {
    return this.meses.find(m => m.valor === mes)?.nome ?? '—';
  }

  ajustarAno(delta: number): void {
    const ctrl = this.formulario.get('ano')!;
    const atual = ctrl.value ?? new Date().getFullYear();
    ctrl.setValue(atual + delta);
  }

  formatarMoedaDisplay(valor: number | null): string {
    if (valor === null || valor === undefined) return '';
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onValorLimiteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '');
    const numero = digitos ? parseInt(digitos, 10) / 100 : null;
    this.formulario.get('valorLimite')!.setValue(numero);
    this.valorLimiteDisplay = this.formatarMoedaDisplay(numero);
    input.value = this.valorLimiteDisplay;
  }

  abrirFormulario(orcamento?: Orcamento): void {
    if (orcamento) {
      this.editandoId = orcamento.id;
      this.formulario.patchValue(orcamento);
      this.valorLimiteDisplay = this.formatarMoedaDisplay(orcamento.valorLimite);
    } else {
      this.editandoId = null;
      this.formulario.reset({ tipo: 'MENSAL', ano: new Date().getFullYear() });
      this.valorLimiteDisplay = '';
    }
    this.dialogRef = this.dialog.open(this.formDialogTpl, {
      width: '700px',
      panelClass: 'tlb-dialog',
      autoFocus: false
    });
  }

  fecharFormulario(): void {
    this.dialogRef?.close();
    this.dialogRef = null;
    this.formulario.reset({ tipo: 'MENSAL' });
    this.editandoId = null;
  }

  salvar(): void {
    if (this.formulario.invalid) return;
    const dados: OrcamentoRequest = {
      ...this.formulario.value,
      tipoAlvo: 'CENTRO_CUSTO',
      cartaoCreditoId: null
    };

    const operacao = this.editandoId
      ? this.orcamentoService.atualizar(this.editandoId, dados)
      : this.orcamentoService.criar(dados);

    operacao.subscribe({
      next: () => {
        this.snackBar.open('Orçamento salvo com sucesso!', 'Fechar', { duration: 3000 });
        this.fecharFormulario();
        this.carregarOrcamentos();
      },
      error: (err) => {
        const mensagem = err?.error?.message ?? 'Erro ao salvar orçamento';
        this.snackBar.open(mensagem, 'Fechar', { duration: 4000 });
      }
    });
  }

  excluir(id: number): void {
    if (!confirm('Deseja excluir este orçamento?')) return;
    this.orcamentoService.excluir(id).subscribe({
      next: () => {
        this.snackBar.open('Orçamento excluído!', 'Fechar', { duration: 3000 });
        this.carregarOrcamentos();
      },
      error: () => this.snackBar.open('Erro ao excluir', 'Fechar', { duration: 3000 })
    });
  }
}
