import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { OrcamentoService, Orcamento, OrcamentoRequest, TipoOrcamento, TipoAlvoOrcamento } from '../../services/orcamento.service';
import { CartaoCreditoService, CartaoCreditoDTO } from '../../services/cartao-credito.service';

@Component({
  selector: 'app-orcamento-cartoes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatSnackBarModule, SidebarComponent
  ],
  templateUrl: './orcamento-cartoes.component.html',
  styleUrls: ['./orcamento-cartoes.component.scss']
})
export class OrcamentoCartoesComponent implements OnInit {

  @ViewChild('formDialog') formDialogTpl!: TemplateRef<any>;
  private dialogRef: MatDialogRef<any> | null = null;

  orcamentos: Orcamento[] = [];
  cartoes: CartaoCreditoDTO[] = [];
  colunas = ['alvo', 'periodo', 'valorLimite', 'acoes'];

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
    private cartaoCreditoService: CartaoCreditoService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.formulario = this.fb.group({
      tipoAlvo: ['CARTAO' as TipoAlvoOrcamento, Validators.required],
      cartaoCreditoId: [null, Validators.required],
      tipo: ['MENSAL' as TipoOrcamento, Validators.required],
      mes: [null, Validators.required],
      ano: [null, Validators.required],
      valorLimite: [null, [Validators.required, Validators.min(0.01)]]
    });

    this.formulario.get('tipoAlvo')!.valueChanges.subscribe((alvo: TipoAlvoOrcamento) => {
      const cartaoCtrl = this.formulario.get('cartaoCreditoId')!;
      if (alvo === 'CARTAO') {
        cartaoCtrl.setValidators(Validators.required);
      } else {
        cartaoCtrl.clearValidators();
        cartaoCtrl.setValue(null);
      }
      cartaoCtrl.updateValueAndValidity();
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
    this.carregarCartoes();
    this.carregarOrcamentos();
  }

  carregarOrcamentos(): void {
    this.orcamentoService.listar().subscribe({
      next: (data) => this.orcamentos = data.filter(o => o.tipoAlvo === 'CARTAO' || o.tipoAlvo === 'TODOS_CARTOES'),
      error: () => this.snackBar.open('Erro ao carregar orçamentos de cartão', 'Fechar', { duration: 3000 })
    });
  }

  carregarCartoes(): void {
    this.cartaoCreditoService.listar().subscribe({
      next: (data) => this.cartoes = data,
      error: () => this.snackBar.open('Erro ao carregar cartões', 'Fechar', { duration: 3000 })
    });
  }

  nomeCartao(id: number): string {
    return this.cartoes.find(c => c.id === id)?.nome ?? '—';
  }

  nomeAlvo(o: Orcamento): string {
    return o.tipoAlvo === 'TODOS_CARTOES' ? 'Todos os Cartões' : this.nomeCartao(o.cartaoCreditoId!);
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
      this.formulario.reset({ tipoAlvo: 'CARTAO', tipo: 'MENSAL', ano: new Date().getFullYear() });
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
    this.formulario.reset({ tipoAlvo: 'CARTAO', tipo: 'MENSAL' });
    this.editandoId = null;
  }

  salvar(): void {
    if (this.formulario.invalid) return;
    const dados: OrcamentoRequest = {
      ...this.formulario.value,
      centroCustoId: null
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
