import { Component, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { BrDateAdapter, BR_DATE_FORMATS } from '../../shared/br-date-adapter';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  LancamentoService,
  LancamentoRequestDTO,
  LancamentoParceladoRequestDTO,
  LancamentoResponseDTO,
  TipoLancamento,
  StatusLancamento,
  FormaPagamento
} from '../../services/lancamento.service';
import { CentroCustoService, CentroCustoDTO } from '../../services/centro-custo.service';
import { ContaService, ContaResponse } from '../../services/conta.service';
import { CartaoCreditoService, CartaoCreditoDTO } from '../../services/cartao-credito.service';

@Component({
  selector: 'app-lancamentos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDialogModule,
    SidebarComponent
  ],
  templateUrl: './lancamentos.html',
  styleUrl: './lancamentos.scss',
  providers: [
    { provide: DateAdapter, useClass: BrDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: BR_DATE_FORMATS }
  ]
})
export class LancamentosComponent implements OnInit {
  readonly NOVO_CENTRO_CUSTO = 'novo';
  readonly NOVO_CARTAO = 'novo';

  private lancamentoService = inject(LancamentoService);
  private centroCustoService = inject(CentroCustoService);
  private contaService = inject(ContaService);
  private cartaoCreditoService = inject(CartaoCreditoService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  @ViewChild('formDialog') formDialogTpl!: TemplateRef<any>;
  @ViewChild('detalhesDialog') detalhesDialogTpl!: TemplateRef<any>;
  @ViewChild('efetivarDialog') efetivarDialogTpl!: TemplateRef<any>;
  @ViewChild('confirmExclusaoDialog') confirmExclusaoTpl!: TemplateRef<any>;
  @ViewChild('novoCentroCustoDialog') novoCentroCustoTpl!: TemplateRef<any>;
  @ViewChild('novoCartaoDialog') novoCartaoTpl!: TemplateRef<any>;
  private dialogRef: MatDialogRef<any> | null = null;
  private detalhesDialogRef: MatDialogRef<any> | null = null;
  private efetivarDialogRef: MatDialogRef<any> | null = null;
  private confirmExclusaoRef: MatDialogRef<any> | null = null;
  private novoCentroCustoRef: MatDialogRef<any> | null = null;
  private novoCartaoRef: MatDialogRef<any> | null = null;

  lancamentos: LancamentoResponseDTO[] = [];
  centrosCusto: CentroCustoDTO[] = [];
  centrosMap = new Map<number, string>();
  contas: ContaResponse[] = [];
  cartoes: CartaoCreditoDTO[] = [];
  carregando = false;
  salvando = false;
  editandoId: number | null = null;
  lancamentoDetalhes: LancamentoResponseDTO | null = null;
  lancamentoEfetivando: LancamentoResponseDTO | null = null;
  efetivando = false;
  contaDropdownAberto = false;
  lancamentoParaExcluir: LancamentoResponseDTO | null = null;
  excluindo = false;
  salvandoCentroCusto = false;
  salvandoCartao = false;

  filtroAtivo: string = 'TODOS';
  filtroTipo: TipoLancamento | null = null;
  filtroStatus: StatusLancamento | null = null;
  filtroBusca: string = '';
  campoBusca: 'descricao' | 'centroCusto' | 'formaPagamento' = 'descricao';
  filtroDataDe: Date | null = null;
  filtroDataAte: Date | null = null;

  readonly placeholdersBusca: Record<string, string> = {
    descricao: 'Buscar por descrição... (ex: Renegade)',
    centroCusto: 'Buscar por centro de custo... (ex: Marketing)',
    formaPagamento: 'Buscar por forma de pagamento... (ex: Pix)'
  };

  filtroMes: number = new Date().getMonth() + 1;
  filtroAno: number = new Date().getFullYear();
  dataMesAno: Date = new Date();
  hoje = new Date().toISOString().split('T')[0];

  readonly meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  colunas = ['dataLancamento', 'dataVencimento', 'descricao', 'centroCusto',
             'tipo', 'formaPagamento', 'valor', 'status', 'acoes'];

  formasPagamento: FormaPagamento[] = ['DINHEIRO','PIX','BOLETO',
                                        'CARTAO_CREDITO','CARTAO_DEBITO','TRANSFERENCIA'];

  form: FormGroup = this.fb.group({
    descricao: ['', Validators.required],
    valorOriginal: [null, [Validators.required, Validators.min(0.01)]],
    tipo: ['DESPESA', Validators.required],
    formaPagamento: [null],
    numeroParcelas: [1, [Validators.min(1), Validators.max(60)]],
    centroCustoId: [null],
    cartaoCreditoId: [null],
    dataLancamento: [null],
    dataVencimento: [null],
    observacao: ['']
  });

  formEfetivar: FormGroup = this.fb.group({
    contaId: [null, Validators.required]
  });

  valorOriginalDisplay = '';

  onValorOriginalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '');
    const numero = digitos ? parseInt(digitos, 10) / 100 : null;
    this.form.get('valorOriginal')!.setValue(numero);
    this.valorOriginalDisplay = numero == null ? '' : numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    input.value = this.valorOriginalDisplay;
  }

  numeroParcelasDisplay = '1';

  onNumeroParcelasInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '');
    const numero = digitos ? Math.min(60, Math.max(1, parseInt(digitos, 10))) : null;
    this.form.get('numeroParcelas')!.setValue(numero);
    this.numeroParcelasDisplay = numero == null ? '' : String(numero);
    input.value = this.numeroParcelasDisplay;
  }

  /** Sem isso, clicar no campo (que já vem com "1" preenchido) sem selecionar tudo faz o dígito
   *  novo se inserir do lado do "1" em vez de substituir (ex: digitar "2" virava "12"). */
  selecionarTudoAoFocar(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  formNovoCentroCusto: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]]
  });

  formNovoCartao: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    limite: [null, [Validators.min(0)]]
  });

  limiteNovoCartaoDisplay = '';

  onLimiteNovoCartaoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '');
    const numero = digitos ? parseInt(digitos, 10) / 100 : null;
    this.formNovoCartao.get('limite')!.setValue(numero);
    this.limiteNovoCartaoDisplay = numero == null ? '' : numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    input.value = this.limiteNovoCartaoDisplay;
  }

  get contasBanco(): ContaResponse[] {
    return this.contas.filter(c => c.tipoConta?.categoria === 'BANCO');
  }

  get contasAplicacao(): ContaResponse[] {
    return this.contas.filter(c => c.tipoConta?.categoria === 'APLICACAO');
  }

  get mesAnoLabel(): string {
    return `${this.meses[this.filtroMes - 1]} ${this.filtroAno}`;
  }

  get exibeParcelas(): boolean {
    if (this.editandoId) return false;
    const forma = this.form.get('formaPagamento')?.value;
    return forma === 'BOLETO' || forma === 'CARTAO_CREDITO';
  }

  get exibeCartao(): boolean {
    return this.form.get('formaPagamento')?.value === 'CARTAO_CREDITO';
  }

  get lancamentosFiltrados(): LancamentoResponseDTO[] {
    // Busca ignora o mês/ano selecionado — o objetivo é achar em qualquer período.
    const busca = this.filtroBusca.trim().toLowerCase();
    let lista = this.lancamentos;

    if (busca) {
      // Busca por descrição já vem filtrada do backend (ver carregar()).
      if (this.campoBusca === 'centroCusto') {
        lista = lista.filter(l => this.getNomeCentroCusto(l.centroCustoId).toLowerCase().includes(busca));
      } else if (this.campoBusca === 'formaPagamento') {
        lista = lista.filter(l => this.formatarFormaPagamento(l.formaPagamento).toLowerCase().includes(busca));
      }
    }

    // Período (De/Até) tem prioridade sobre a navegação de mês/ano — permite ver vários meses de uma vez.
    if (this.filtroDataDe || this.filtroDataAte) {
      const de = this.filtroDataDe ? this.formatarData(this.filtroDataDe) : null;
      const ate = this.filtroDataAte ? this.formatarData(this.filtroDataAte) : null;
      return lista.filter(l => {
        const dataRef = l.dataVencimento || l.dataLancamento;
        if (!dataRef) return false;
        if (de && dataRef < de) return false;
        if (ate && dataRef > ate) return false;
        return true;
      });
    }

    if (busca) return lista;

    return lista.filter(l => {
      const dataRef = l.dataVencimento || l.dataLancamento;
      if (!dataRef) return true;
      const partes = dataRef.split('-');
      const ano = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10);
      return mes === this.filtroMes && ano === this.filtroAno;
    });
  }

  ngOnInit(): void {
    this.carregarCentrosCusto();
    this.carregarContas();
    this.carregarCartoes();
    this.carregar();
  }

  carregarContas(): void {
    this.contaService.listar().subscribe(lista => this.contas = lista);
  }

  carregarCartoes(): void {
    this.cartaoCreditoService.listar().subscribe(lista => this.cartoes = lista);
  }

  carregarCentrosCusto(): void {
    this.centroCustoService.listar(true).subscribe({
      next: (lista) => {
        this.centrosCusto = lista;
        this.centrosMap.clear();
        lista.forEach(c => { if (c.id) this.centrosMap.set(c.id, c.nome); });
      }
    });
  }

  /** Intercepta a opção "Novo centro de custo" dentro do próprio select: desfaz a seleção
   *  e abre o mini formulário de cadastro, em vez de tentar usar 'novo' como um id de verdade. */
  onCentroCustoChange(valor: string | number | null): void {
    if (valor === this.NOVO_CENTRO_CUSTO) {
      this.form.patchValue({ centroCustoId: null });
      this.abrirNovoCentroCusto();
    }
  }

  abrirNovoCentroCusto(): void {
    this.formNovoCentroCusto.reset();
    this.novoCentroCustoRef = this.dialog.open(this.novoCentroCustoTpl, {
      width: '480px',
      panelClass: 'tlb-dialog',
      autoFocus: 'first-tabbable'
    });
  }

  fecharNovoCentroCusto(): void {
    this.novoCentroCustoRef?.close();
    this.novoCentroCustoRef = null;
    this.salvandoCentroCusto = false;
  }

  /** Cria o centro de custo e já seleciona ele no formulário de lançamento que está aberto por trás. */
  salvarNovoCentroCusto(): void {
    if (this.formNovoCentroCusto.invalid) return;
    this.salvandoCentroCusto = true;
    const nome = this.formNovoCentroCusto.value.nome;

    this.centroCustoService.criar({ nome }).subscribe({
      next: (novo) => {
        this.centrosCusto = [...this.centrosCusto, novo];
        if (novo.id) this.centrosMap.set(novo.id, novo.nome);
        this.form.patchValue({ centroCustoId: novo.id ?? null });
        this.fecharNovoCentroCusto();
        this.snackBar.open('Centro de custo criado!', 'Fechar', { duration: 3000 });
      },
      error: () => {
        this.salvandoCentroCusto = false;
        this.snackBar.open('Erro ao criar centro de custo', 'Fechar', { duration: 3000 });
      }
    });
  }

  /** Intercepta a opção "Novo cartão" dentro do próprio select: desfaz a seleção
   *  e abre o mini formulário de cadastro, em vez de tentar usar 'novo' como um id de verdade. */
  onCartaoChange(valor: string | number | null): void {
    if (valor === this.NOVO_CARTAO) {
      this.form.patchValue({ cartaoCreditoId: null });
      this.abrirNovoCartao();
    }
  }

  abrirNovoCartao(): void {
    this.formNovoCartao.reset();
    this.limiteNovoCartaoDisplay = '';
    this.novoCartaoRef = this.dialog.open(this.novoCartaoTpl, {
      width: '480px',
      panelClass: 'tlb-dialog',
      autoFocus: 'first-tabbable'
    });
  }

  fecharNovoCartao(): void {
    this.novoCartaoRef?.close();
    this.novoCartaoRef = null;
    this.salvandoCartao = false;
  }

  /** Cria o cartão e já seleciona ele no formulário de lançamento que está aberto por trás. */
  salvarNovoCartao(): void {
    if (this.formNovoCartao.invalid) return;
    this.salvandoCartao = true;
    const { nome, limite } = this.formNovoCartao.value;

    this.cartaoCreditoService.criar({ nome, limite: limite ?? undefined }).subscribe({
      next: (novo) => {
        this.cartoes = [...this.cartoes, novo];
        this.form.patchValue({ cartaoCreditoId: novo.id ?? null });
        this.fecharNovoCartao();
        this.snackBar.open('Cartão criado!', 'Fechar', { duration: 3000 });
      },
      error: () => {
        this.salvandoCartao = false;
        this.snackBar.open('Erro ao criar cartão', 'Fechar', { duration: 3000 });
      }
    });
  }

  carregar(): void {
    this.carregando = true;
    const busca = this.filtroBusca.trim();
    // Busca por descrição é filtrada no backend; centro de custo e forma de pagamento
    // são filtrados no cliente (ver lancamentosFiltrados), então aqui só ignora tipo/status.
    const req$ = busca && this.campoBusca === 'descricao'
      ? this.lancamentoService.listar(null, null, busca)
      : this.lancamentoService.listar(this.filtroTipo, this.filtroStatus);
    req$.subscribe({
      next: (data) => { this.lancamentos = data; this.carregando = false; },
      error: () => {
        this.carregando = false;
        this.snackBar.open('Erro ao carregar lançamentos', 'Fechar', { duration: 3000 });
      }
    });
  }

  buscar(): void {
    this.carregar();
  }

  limparBusca(): void {
    this.filtroBusca = '';
    this.carregar();
  }

  limparPeriodo(): void {
    this.filtroDataDe = null;
    this.filtroDataAte = null;
  }

  /** Trocar o campo de busca reexecuta a busca se já houver texto digitado. */
  onCampoBuscaChange(): void {
    if (this.filtroBusca.trim()) this.carregar();
  }

  setFiltro(valor: string): void {
    this.filtroAtivo = valor;
    if (valor === 'TODOS') {
      this.filtroTipo = null;
      this.filtroStatus = null;
    } else if (valor === 'RECEITA' || valor === 'DESPESA') {
      this.filtroTipo = valor as TipoLancamento;
      this.filtroStatus = null;
    } else {
      this.filtroStatus = valor as StatusLancamento;
      this.filtroTipo = null;
    }
    this.carregar();
  }

  mesAnterior(): void {
    if (this.filtroMes === 1) { this.filtroMes = 12; this.filtroAno--; }
    else this.filtroMes--;
    this.dataMesAno = new Date(this.filtroAno, this.filtroMes - 1, 1);
  }

  mesSeguinte(): void {
    if (this.filtroMes === 12) { this.filtroMes = 1; this.filtroAno++; }
    else this.filtroMes++;
    this.dataMesAno = new Date(this.filtroAno, this.filtroMes - 1, 1);
  }

  selecionarMesAno(data: Date, picker: any): void {
    this.filtroMes = data.getMonth() + 1;
    this.filtroAno = data.getFullYear();
    this.dataMesAno = new Date(this.filtroAno, this.filtroMes - 1, 1);
    picker.close();
  }

  getNomeCentroCusto(id?: number): string {
    if (!id) return '—';
    return this.centrosMap.get(id) ?? '—';
  }

  abrirDetalhes(l: LancamentoResponseDTO): void {
    this.lancamentoDetalhes = l;
    this.detalhesDialogRef = this.dialog.open(this.detalhesDialogTpl, {
      width: '520px',
      panelClass: 'tlb-dialog',
      autoFocus: false
    });
  }

  fecharDetalhes(): void {
    this.detalhesDialogRef?.close();
    this.detalhesDialogRef = null;
    this.lancamentoDetalhes = null;
  }

  abrirNovo(): void {
    this.editandoId = null;
    this.form.reset({ tipo: 'DESPESA', numeroParcelas: 1 });
    this.valorOriginalDisplay = '';
    this.numeroParcelasDisplay = '1';
    this.dialogRef = this.dialog.open(this.formDialogTpl, {
      width: '700px',
      panelClass: 'tlb-dialog',
      autoFocus: false
    });
  }

  editar(l: LancamentoResponseDTO): void {
    this.editandoId = l.id;
    this.form.patchValue({
      descricao: l.descricao,
      valorOriginal: l.valorOriginal,
      tipo: l.tipo,
      formaPagamento: l.formaPagamento ?? null,
      numeroParcelas: l.numeroParcelas ?? 1,
      centroCustoId: l.centroCustoId ?? null,
      cartaoCreditoId: l.cartaoCreditoId ?? null,
      dataLancamento: l.dataLancamento ? new Date(l.dataLancamento + 'T12:00:00') : null,
      dataVencimento: l.dataVencimento ? new Date(l.dataVencimento + 'T12:00:00') : null,
      observacao: l.observacao ?? ''
    });
    this.valorOriginalDisplay = l.valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.numeroParcelasDisplay = String(l.numeroParcelas ?? 1);
    this.dialogRef = this.dialog.open(this.formDialogTpl, {
      width: '700px',
      panelClass: 'tlb-dialog',
      autoFocus: false
    });
  }

  fecharFormulario(): void {
    this.dialogRef?.close();
    this.dialogRef = null;
    this.editandoId = null;
    this.form.reset({ tipo: 'DESPESA', numeroParcelas: 1 });
  }

  /** Compra parcelada (boleto ou cartão): "Valor" é o valor de CADA parcela, não o total — por
   *  isso multiplica por numeroParcelas antes de mandar pro backend, que espera o total da compra
   *  e o divide de volta por parcela. Gera N lançamentos mensais (um por parcela, cada um com seu
   *  próprio vencimento) — não um único lançamento com "número de parcelas" só como metadado. */
  private salvarParcelado(): void {
    const v = this.form.value;
    const dto: LancamentoParceladoRequestDTO = {
      descricao: v.descricao,
      valorTotal: Math.round(v.valorOriginal * v.numeroParcelas * 100) / 100,
      numeroParcelas: v.numeroParcelas,
      formaPagamento: v.formaPagamento,
      cartaoCreditoId: v.formaPagamento === 'CARTAO_CREDITO' ? (v.cartaoCreditoId || undefined) : undefined,
      centroCustoId: v.centroCustoId || undefined,
      dataInicio: v.dataVencimento
        ? this.formatarData(v.dataVencimento)
        : (v.dataLancamento ? this.formatarData(v.dataLancamento) : undefined),
      observacao: v.observacao || undefined
    };
    this.lancamentoService.criarParcelado(dto).subscribe({
      next: () => {
        this.salvando = false;
        this.fecharFormulario();
        this.carregar();
        this.snackBar.open('Parcelas geradas com sucesso!', 'Fechar', { duration: 3000 });
      },
      error: () => {
        this.salvando = false;
        this.snackBar.open('Erro ao salvar', 'Fechar', { duration: 3000 });
      }
    });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.salvando = true;

    if (!this.editandoId && this.exibeParcelas && this.form.value.numeroParcelas > 1) {
      this.salvarParcelado();
      return;
    }

    const v = this.form.value;
    const dto: LancamentoRequestDTO = {
      descricao: v.descricao,
      valorOriginal: v.valorOriginal,
      tipo: v.tipo,
      formaPagamento: v.formaPagamento || undefined,
      centroCustoId: v.centroCustoId || undefined,
      cartaoCreditoId: v.formaPagamento === 'CARTAO_CREDITO' ? (v.cartaoCreditoId || undefined) : undefined,
      dataLancamento: v.dataLancamento ? this.formatarData(v.dataLancamento) : undefined,
      dataVencimento: v.dataVencimento ? this.formatarData(v.dataVencimento) : undefined,
      observacao: v.observacao || undefined,
      numeroParcelas: this.exibeParcelas && v.numeroParcelas > 1 ? v.numeroParcelas : undefined
    };
    const req$ = this.editandoId
      ? this.lancamentoService.atualizar(this.editandoId, dto)
      : this.lancamentoService.criar(dto);
    req$.subscribe({
      next: () => {
        this.salvando = false;
        this.fecharFormulario();
        this.carregar();
        this.snackBar.open('Salvo com sucesso!', 'Fechar', { duration: 3000 });
      },
      error: () => {
        this.salvando = false;
        this.snackBar.open('Erro ao salvar', 'Fechar', { duration: 3000 });
      }
    });
  }

  abrirEfetivar(l: LancamentoResponseDTO): void {
    this.lancamentoEfetivando = l;
    this.formEfetivar.reset();
    this.contaDropdownAberto = false;
    this.efetivarDialogRef = this.dialog.open(this.efetivarDialogTpl, {
      width: '480px',
      panelClass: ['tlb-dialog', 'efetivar-dialog'],
      autoFocus: 'first-tabbable'
    });
  }

  fecharEfetivar(): void {
    this.efetivarDialogRef?.close();
    this.efetivarDialogRef = null;
    this.lancamentoEfetivando = null;
    this.efetivando = false;
    this.contaDropdownAberto = false;
  }

  get contaEfetivarSelecionada(): ContaResponse | undefined {
    return this.contas.find(c => c.id === this.formEfetivar.value.contaId);
  }

  toggleContaDropdown(): void {
    this.contaDropdownAberto = !this.contaDropdownAberto;
  }

  selecionarContaEfetivar(c: ContaResponse): void {
    this.formEfetivar.get('contaId')!.setValue(c.id);
    this.contaDropdownAberto = false;
  }

  /** Efetiva o título: o backend registra o lançamento bancário na conta escolhida e só marca o
   *  título como EFETIVADO se isso funcionar — se a conta escolhida falhar (saldo insuficiente,
   *  serviço fora do ar etc.), o título continua PENDENTE em vez de ficar num estado parcial. */
  confirmarEfetivar(): void {
    if (this.formEfetivar.invalid || !this.lancamentoEfetivando) return;
    const l = this.lancamentoEfetivando;
    const contaId = this.formEfetivar.value.contaId;
    this.efetivando = true;

    this.lancamentoService.efetivar(l.id, { contaId }).subscribe({
      next: () => {
        this.fecharEfetivar();
        this.carregar();
        this.snackBar.open('Título efetivado e lançado na conta!', 'Fechar', { duration: 3000 });
      },
      error: (err) => {
        this.efetivando = false;
        const msg = err?.error?.erro ?? 'Erro ao efetivar';
        this.snackBar.open(msg, 'Fechar', { duration: 4000 });
      }
    });
  }

  pedirConfirmacaoExclusao(l: LancamentoResponseDTO): void {
    this.lancamentoParaExcluir = l;
    this.confirmExclusaoRef = this.dialog.open(this.confirmExclusaoTpl, {
      width: '440px',
      panelClass: 'tlb-dialog',
      autoFocus: false
    });
  }

  cancelarExclusao(): void {
    this.confirmExclusaoRef?.close();
    this.confirmExclusaoRef = null;
    this.lancamentoParaExcluir = null;
  }

  confirmarExclusao(): void {
    if (!this.lancamentoParaExcluir) return;
    this.excluindo = true;
    this.lancamentoService.excluir(this.lancamentoParaExcluir.id).subscribe({
      next: () => {
        this.excluindo = false;
        this.cancelarExclusao();
        this.carregar();
        this.snackBar.open('Excluído!', 'Fechar', { duration: 3000 });
      },
      error: (err) => {
        this.excluindo = false;
        this.cancelarExclusao();
        this.snackBar.open(err.error?.erro ?? 'Erro ao excluir', 'Fechar', { duration: 5000 });
      }
    });
  }

  /** Exclui de uma vez todas as parcelas da mesma compra parcelada (mesmo grupoParcelaId) —
   *  parcelas já efetivadas ficam de fora, mesma regra da exclusão individual. */
  confirmarExclusaoGrupo(): void {
    const grupoParcelaId = this.lancamentoParaExcluir?.grupoParcelaId;
    if (!grupoParcelaId) return;
    this.excluindo = true;
    this.lancamentoService.excluirGrupo(grupoParcelaId).subscribe({
      next: () => {
        this.excluindo = false;
        this.cancelarExclusao();
        this.carregar();
        this.snackBar.open('Parcelas excluídas!', 'Fechar', { duration: 3000 });
      },
      error: (err) => {
        this.excluindo = false;
        this.cancelarExclusao();
        this.snackBar.open(err.error?.erro ?? 'Erro ao excluir parcelas', 'Fechar', { duration: 5000 });
      }
    });
  }

  formatarData(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatarDataExibicao(data?: string): string {
    if (!data) return '—';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  formatarFormaPagamento(forma?: string): string {
    const map: Record<string, string> = {
      DINHEIRO: 'Dinheiro', PIX: 'PIX', BOLETO: 'Boleto',
      CARTAO_CREDITO: 'Cartão Crédito', CARTAO_DEBITO: 'Cartão Débito',
      TRANSFERENCIA: 'Transferência'
    };
    return forma ? (map[forma] ?? forma) : '—';
  }
}
