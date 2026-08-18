import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, forkJoin, Subscription } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, Plugin } from 'chart.js';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { BrDateAdapter, BR_DATE_FORMATS } from '../../shared/br-date-adapter';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { LancamentoService, LancamentoResponseDTO } from '../../services/lancamento.service';
import { CentroCustoService } from '../../services/centro-custo.service';
import { ContaService, ContaResponse } from '../../services/conta.service';
import { MetaAplicacaoService } from '../../services/meta-aplicacao.service';
import { OrcamentoService, Orcamento } from '../../services/orcamento.service';
import { CartaoCreditoService, CartaoCreditoDTO } from '../../services/cartao-credito.service';

// Paleta categórica do Detalhamento de Despesas — 15 cores, ordem fixa (nunca cicla:
// acima de 14 categorias o excedente vira "Outros"). Validada com scripts/validate_palette.js
// do skill dataviz (modo dark, surface #0d2340): só a faixa de luminosidade falha — mantida de
// propósito, pra ficar consistente com o estilo "cores vivas sobre fundo escuro" já usado no
// resto do app — separação CVD e piso de visão normal passam (a adjacente mais fraca fica em
// WARN, não FAIL, e o gráfico sempre tem legenda com nome/valor, nunca só cor).
const CORES = [
  '#00c8f0','#ff6d00','#7c4dff','#00c864','#e91e63','#ffc107','#00bcd4','#ff5252',
  '#536dfe','#cddc39','#ab47bc','#26a69a','#ff9e80','#5c6bc0','#f06292'
];

/** Uma linha exibida em Contas a Pagar — pode ser um lançamento avulso ou a fatura consolidada de um cartão. */
interface LinhaContaAPagar {
  descricao: string;
  valor: number;
  dataVencimento?: string;
}

/** Desenha o ponteiro de um gauge tipo conta-giros sobre o anel de zonas (vermelho/amarelo/verde). */
const gaugeNeedlePlugin: Plugin<'doughnut'> = {
  id: 'gaugeNeedle',
  afterDatasetsDraw(chart) {
    const cfg = (chart.config.options as any)?.plugins?.gaugeNeedle;
    if (!cfg) return;

    const meta = chart.getDatasetMeta(0);
    const first = meta.data[0] as any;
    const last = meta.data[meta.data.length - 1] as any;
    if (!first || !last) return;

    const cx = first.x, cy = first.y;
    const startAngle = first.startAngle;
    const endAngle = last.endAngle;
    const pct = Math.max(0, Math.min(100, cfg.value ?? 0));
    const angle = startAngle + (pct / 100) * (endAngle - startAngle);
    const r = first.outerRadius * 0.86;

    const ctx = chart.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -3);
    ctx.lineTo(r, 0);
    ctx.lineTo(-r * 0.18, 3);
    ctx.closePath();
    ctx.fillStyle = cfg.color || '#e0e0e0';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = cfg.color || '#e0e0e0';
    ctx.fill();
    ctx.restore();
  }
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, MatCardModule, MatIconModule, MatDatepickerModule, SidebarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  providers: [
    { provide: DateAdapter, useClass: BrDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: BR_DATE_FORMATS }
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  lancamentos: LancamentoResponseDTO[] = [];
  centrosMap = new Map<number, string>();
  cartoesMap = new Map<number, string>();
  cartoes: CartaoCreditoDTO[] = [];
  contasBanco: ContaResponse[] = [];
  contasAplicacao: ContaResponse[] = [];
  carregando = true;
  private pollSub?: Subscription;

  selectedYear  = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  dataMesAno: Date = new Date();

  meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
           'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  /** Alterna a Análise Mensal entre visão de 1 ano (por mês) e comparativo entre 2 anos. */
  modoAnalise: 'mensal' | 'anual' = 'mensal';
  anoComparacaoA = new Date().getFullYear() - 1;
  anoComparacaoB = new Date().getFullYear();
  anoDropdownAberto: 'A' | 'B' | null = null;

  toggleAnoDropdown(qual: 'A' | 'B'): void {
    this.anoDropdownAberto = this.anoDropdownAberto === qual ? null : qual;
  }

  selecionarAno(qual: 'A' | 'B', ano: number): void {
    if (qual === 'A') this.anoComparacaoA = ano; else this.anoComparacaoB = ano;
    this.anoDropdownAberto = null;
  }

  get anosParaComparar(): number[] {
    const atual = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => atual - i);
  }

  get mesAnoLabel(): string {
    return `${this.meses[this.selectedMonth - 1]} ${this.selectedYear}`;
  }

  mesAnterior(): void {
    if (this.selectedMonth === 1) { this.selectedMonth = 12; this.selectedYear--; }
    else this.selectedMonth--;
    this.dataMesAno = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    this.carregarAplicacoesPeriodo();
    this.carregarMetas();
    this.carregarOrcamentos();
  }

  mesSeguinte(): void {
    if (this.selectedMonth === 12) { this.selectedMonth = 1; this.selectedYear++; }
    else this.selectedMonth++;
    this.dataMesAno = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    this.carregarAplicacoesPeriodo();
    this.carregarMetas();
    this.carregarOrcamentos();
  }

  selecionarMesAno(data: Date, picker: any): void {
    this.selectedMonth = data.getMonth() + 1;
    this.selectedYear = data.getFullYear();
    this.dataMesAno = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    picker.close();
    this.carregarAplicacoesPeriodo();
    this.carregarMetas();
    this.carregarOrcamentos();
  }

  constructor(
    private svc: LancamentoService,
    private centroCustoSvc: CentroCustoService,
    private contaSvc: ContaService,
    private metaAplicacaoSvc: MetaAplicacaoService,
    private orcamentoSvc: OrcamentoService,
    private cartaoCreditoSvc: CartaoCreditoService
  ) {}

  ngOnInit() {
    this.centroCustoSvc.listar(true).subscribe(lista => {
      lista.forEach(c => { if (c.id) this.centrosMap.set(c.id, c.nome); });
    });
    this.cartaoCreditoSvc.listar().subscribe(lista => {
      this.cartoes = lista;
      lista.forEach(c => this.cartoesMap.set(c.id, c.nome));
    });
    this.carregarContas();
    this.carregarMetas();
    this.carregarOrcamentos();
    this.carregar();
    this.pollSub = interval(30000).subscribe(() => this.atualizarSilencioso());
  }

  orcamentos: Orcamento[] = [];

  carregarOrcamentos() {
    this.orcamentoSvc.listarPorMesAno(this.selectedMonth, this.selectedYear).subscribe(lista => {
      this.orcamentos = lista;
    });
  }

  /** Gasto do mês selecionado — o mesmo cálculo vale pra MENSAL, ANUAL e DEFINITIVO:
   *  o limite se repete integralmente a cada mês (não é um total acumulado do ano). */
  private gastoCentro(centroCustoId: number): number {
    return this.mes
      .filter(l => l.tipo === 'DESPESA' && l.centroCustoId === centroCustoId)
      .reduce((s, l) => s + l.valor, 0);
  }

  get orcamentosProgresso() {
    return this.orcamentos
      .filter(o => o.ativo && o.tipoAlvo === 'CENTRO_CUSTO')
      .map(o => {
        const gasto = this.gastoCentro(o.centroCustoId!);
        const pctReal = o.valorLimite > 0 ? Math.round(gasto / o.valorLimite * 100) : 0;
        return {
          nome: this.centrosMap.get(o.centroCustoId!) ?? 'Outros',
          gasto,
          limite: o.valorLimite,
          pct: Math.min(100, pctReal),
          pctReal
        };
      })
      .sort((a, b) => b.pctReal - a.pctReal);
  }

  /** Cor da faixa do gasto em relação ao limite: até 85% verde, 85–99,99% amarelo, 100%+ vermelho. */
  corFaixaOrcamento(pct: number): string {
    if (pct < 85) return '#00e676';
    if (pct < 100) return '#ffea00';
    return '#ff1744';
  }

  /** Gasto do mês selecionado com cartão de crédito — mesma lógica de gastoCentro, mas por cartão. */
  private gastoCartao(cartaoId: number): number {
    return this.mes
      .filter(l => l.tipo === 'DESPESA' && l.cartaoCreditoId === cartaoId)
      .reduce((s, l) => s + l.valor, 0);
  }

  /** Orçamento individual (por cartão específico) vigente no mês selecionado. */
  private orcamentoCartao(cartaoId: number): Orcamento | undefined {
    return this.orcamentos.find(o => o.ativo && o.tipoAlvo === 'CARTAO' && o.cartaoCreditoId === cartaoId);
  }

  get consumoCartoes() {
    return this.cartoes
      .map(c => {
        const gasto = this.gastoCartao(c.id);
        const orcamento = this.orcamentoCartao(c.id);
        const temLimite = !!orcamento;
        const limite = orcamento?.valorLimite ?? 0;
        const pctReal = temLimite ? Math.round(gasto / limite * 100) : 0;
        return {
          nome: c.nome,
          gasto,
          limite,
          temLimite,
          pct: Math.min(100, pctReal),
          pctReal
        };
      })
      .sort((a, b) => b.pctReal - a.pctReal);
  }

  /** Orçamento "Todos os Cartões" — soma o gasto de todo cartão de crédito, independente
   *  dos orçamentos individuais por cartão, que continuam valendo em paralelo. */
  get consumoTodosCartoes() {
    const orcamento = this.orcamentos.find(o => o.ativo && o.tipoAlvo === 'TODOS_CARTOES');
    const gasto = this.mes
      .filter(l => l.tipo === 'DESPESA' && !!l.cartaoCreditoId)
      .reduce((s, l) => s + l.valor, 0);
    const temLimite = !!orcamento;
    const limite = orcamento?.valorLimite ?? 0;
    const pctReal = temLimite ? Math.round(gasto / limite * 100) : 0;
    return {
      gasto,
      limite,
      temLimite,
      pct: Math.min(100, pctReal),
      pctReal
    };
  }

  carregarMetas() {
    this.metaAplicacaoSvc.listarMensal(this.selectedYear).subscribe(lista => {
      this.metaMensal = lista.find(m => m.mes === this.selectedMonth)?.valor ?? 0;
    });
    this.metaAplicacaoSvc.obterAnual(this.selectedYear).subscribe(a => {
      this.metaAnual = a.valor;
    });
  }

  carregarContas() {
    this.contaSvc.listar().subscribe(lista => {
      this.contasBanco = lista.filter(c => c.tipoConta?.categoria === 'BANCO');
      this.contasAplicacao = lista.filter(c => c.tipoConta?.categoria === 'APLICACAO');
      this.carregarAplicacoesPeriodo();
    });
  }

  get totalAplicacoes(): number {
    return this.contasAplicacao.reduce((s,c) => s + c.saldo, 0);
  }

  metaMensal = 0;
  metaAnual = 0;

  /** Quanto entrou líquido (entradas - saídas) nas contas de Aplicação no mês/ano selecionados. */
  aplicadoMes = 0;
  aplicadoAno = 0;
  /** Líquido de Aplicação por mês, indexado por ano (para o gráfico de Análise Mensal). */
  private aplicadoPorMesPorAno = new Map<number, number[]>();

  carregarAplicacoesPeriodo(): void {
    if (this.contasAplicacao.length === 0) {
      this.aplicadoMes = 0;
      this.aplicadoAno = 0;
      this.aplicadoPorMesPorAno = new Map();
      return;
    }

    forkJoin(this.contasAplicacao.map(c => this.contaSvc.listarLancamentos(c.id))).subscribe(listasPorConta => {
      let somaMes = 0, somaAno = 0;
      const porAno = new Map<number, number[]>();
      for (const lista of listasPorConta) {
        for (const l of lista) {
          if (!l.data) continue;
          const ano = +l.data.substring(0, 4);
          const mes = +l.data.substring(5, 7);
          const valor = l.tipo === 'ENTRADA' ? l.valor : -l.valor;
          if (!porAno.has(ano)) porAno.set(ano, Array(12).fill(0));
          porAno.get(ano)![mes - 1] += valor;
          if (ano === this.selectedYear) {
            somaAno += valor;
            if (mes === this.selectedMonth) somaMes += valor;
          }
        }
      }
      this.aplicadoMes = Math.max(0, somaMes);
      this.aplicadoAno = Math.max(0, somaAno);
      this.aplicadoPorMesPorAno = porAno;
    });
  }

  private aplicadoPorMesAno(ano: number): number[] {
    return (this.aplicadoPorMesPorAno.get(ano) || Array(12).fill(0)).map(v => Math.max(0, v));
  }

  private receitasDespesasPorAno(ano: number): { r: number[]; d: number[] } {
    const r = Array(12).fill(0), d = Array(12).fill(0);
    this.lancamentos.forEach(l => {
      if (l.status === 'CANCELADO') return;
      const dt = l.dataVencimento || l.dataLancamento;
      if (!dt || +dt.split('-')[0] !== ano) return;
      const m = +dt.split('-')[1] - 1;
      l.tipo === 'RECEITA' ? r[m] += l.valor : d[m] += l.valor;
    });
    return { r, d };
  }

  /** Resultado líquido do mês (Receitas - Despesas) em cada mês do ano informado. */
  private resultadoPorAno(ano: number): number[] {
    const { r, d } = this.receitasDespesasPorAno(ano);
    return r.map((v, i) => v - d[i]);
  }

  /** Compara o resultado total do ano B contra o ano A, em percentual. */
  get comparacaoAnual(): { pct: number | null; anoA: number; anoB: number } {
    const anoA = this.anoComparacaoA, anoB = this.anoComparacaoB;
    const totalA = this.resultadoPorAno(anoA).reduce((s, v) => s + v, 0);
    const totalB = this.resultadoPorAno(anoB).reduce((s, v) => s + v, 0);
    if (totalA === 0) return { pct: null, anoA, anoB };
    const pct = ((totalB - totalA) / Math.abs(totalA)) * 100;
    return { pct, anoA, anoB };
  }

  /** Percentual real, sem teto — usado no texto (pode passar de 100%). */
  get pctMetaMensal(): number {
    return this.metaMensal > 0 ? Math.round(this.aplicadoMes / this.metaMensal * 100) : 0;
  }
  get pctMetaAnual(): number {
    return this.metaAnual > 0 ? Math.round(this.aplicadoAno / this.metaAnual * 100) : 0;
  }

  /** Posição do ponteiro no gauge — precisa ficar entre 0 e 100, o semicírculo não vai além disso. */
  get pctMetaMensalAgulha(): number {
    return Math.min(100, this.pctMetaMensal);
  }
  get pctMetaAnualAgulha(): number {
    return Math.min(100, this.pctMetaAnual);
  }

  gaugeNeedlePlugins = [gaugeNeedlePlugin];

  get metaZonasData(): ChartData<'doughnut'> {
    return { datasets: [{ data: [100 / 3, 100 / 3, 100 / 3], backgroundColor: ['#ff1744', '#ffea00', '#00e676'], borderWidth: 0 }] };
  }

  /** Zonas do gauge de Saúde Financeira — precisam bater com os mesmos limiares (15 e 50)
   *  usados em saudeFinanceira() pra classificar o status, senão o ponteiro cai numa faixa
   *  de cor diferente da que o texto mostra. Vermelho só até 15, amarelo de 15 a 50, verde daí pra cima. */
  get saudeZonasData(): ChartData<'doughnut'> {
    return { datasets: [{ data: [15, 35, 50], backgroundColor: ['#ff1744', '#ffea00', '#00e676'], borderWidth: 0 }] };
  }

  /** Cor da faixa (vermelho/amarelo/verde) em que o percentual cai — meta dividida sempre em 3 partes iguais. */
  corFaixaMeta(pct: number): string {
    if (pct < 100 / 3) return '#ff1744';
    if (pct < 200 / 3) return '#ffea00';
    return '#00e676';
  }

  get metaMensalOpts(): ChartOptions<'doughnut'> {
    return this.buildGaugeOpts(this.pctMetaMensalAgulha);
  }
  get metaAnualOpts(): ChartOptions<'doughnut'> {
    return this.buildGaugeOpts(this.pctMetaAnualAgulha);
  }

  /** Placar 0-100 de saúde financeira do mês selecionado, combinando 4 sinais já calculados
   *  em outros quadros do dashboard — cada um contribui uma pontuação máxima (peso) fixa:
   *  - Resultado do mês (receita - despesa), até 40 pontos.
   *  - Orçamentos por centro de custo dentro do limite, até 25 pontos (neutro/25 se não há orçamento ativo).
   *  - Meta de aplicação do mês batida, até 20 pontos (neutro/20 se não há meta definida).
   *  - Uso dos limites de cartão (o pior entre "Todos os Cartões" e cada cartão individual),
   *    até 15 pontos (neutro/15 se não há orçamento de cartão definido). */
  get saudeFinanceira() {
    const receita = this.totalReceitasMes;
    const despesa = this.totalDespesasMes;
    const ratioResultado = receita > 0 ? (receita - despesa) / receita : (despesa > 0 ? -1 : 0);
    const pontosResultado = Math.max(0, Math.min(40, 20 + ratioResultado * 20));

    const orcamentosAtivos = this.orcamentosProgresso;
    const pontosOrcamento = orcamentosAtivos.length
      ? 25 * (1 - orcamentosAtivos.filter(o => o.pctReal >= 100).length / orcamentosAtivos.length)
      : 25;

    const pontosMeta = this.metaMensal > 0
      ? 20 * Math.min(1, this.aplicadoMes / this.metaMensal)
      : 20;

    const cartoesComLimite = this.consumoCartoes.filter(c => c.temLimite);
    const pctsCartao = [
      ...(this.consumoTodosCartoes.temLimite ? [this.consumoTodosCartoes.pctReal] : []),
      ...cartoesComLimite.map(c => c.pctReal)
    ];
    const pontosCartao = pctsCartao.length
      ? 15 * (1 - Math.min(1, Math.max(...pctsCartao) / 100))
      : 15;

    const score = Math.round(pontosResultado + pontosOrcamento + pontosMeta + pontosCartao);

    let status: string, cor: string;
    if (score >= 50) { status = 'Saudável'; cor = '#00e676'; }
    else if (score >= 15) { status = 'Atenção'; cor = '#ffea00'; }
    else { status = 'Crítico'; cor = '#ff1744'; }

    return { score, status, cor };
  }

  get saudeGaugeOpts(): ChartOptions<'doughnut'> {
    return this.buildGaugeOpts(this.saudeFinanceira.score);
  }

  private buildGaugeOpts(pct: number): ChartOptions<'doughnut'> {
    return {
      responsive: true, maintainAspectRatio: false,
      circumference: 180, rotation: -90, cutout: '68%',
      plugins: {
        legend: { display: false }, tooltip: { enabled: false },
        gaugeNeedle: { value: pct, color: '#e0e0e0' }
      } as any
    };
  }

  get nomesAplicacoes(): string {
    return this.contasAplicacao.length
      ? this.contasAplicacao.map(c => `${c.nome}: ${this.fmt(c.saldo)}`).join('\n')
      : 'Nenhuma conta de aplicação cadastrada';
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  carregar() {
    this.carregando = true;
    this.svc.listar(null, null).subscribe({
      next: (d: LancamentoResponseDTO[]) => { this.lancamentos = d; this.carregando = false; },
      error: () => { this.carregando = false; }
    });
  }

  private atualizarSilencioso() {
    this.svc.listar(null, null).subscribe({
      next: (d: LancamentoResponseDTO[]) => { this.lancamentos = d; }
    });
    this.carregarContas();
    this.carregarMetas();
    this.carregarOrcamentos();
  }

  /** Lançamentos do ano selecionado — pendentes + efetivados, exclui só os cancelados
   *  (cancelado = não aconteceu, não deve contar em nenhuma soma do dashboard). */
  get ano() {
    return this.lancamentos.filter(l => {
      if (l.status === 'CANCELADO') return false;
      const d = l.dataVencimento || l.dataLancamento;
      return d && +d.split('-')[0] === this.selectedYear;
    });
  }
  get mes() {
    return this.ano.filter(l => {
      const d = l.dataVencimento || l.dataLancamento;
      return d && +d.split('-')[1] === this.selectedMonth;
    });
  }

  /** Total de receitas e despesas lançadas no mês/ano selecionados. */
  get totalReceitasMes(): number {
    return this.mes.filter(l => l.tipo === 'RECEITA').reduce((s, l) => s + l.valor, 0);
  }
  get totalDespesasMes(): number {
    return this.mes.filter(l => l.tipo === 'DESPESA').reduce((s, l) => s + l.valor, 0);
  }

  /** Soma o saldo de todas as Contas Correntes (Banco) — não inclui Aplicações, que ficam no quadro separado. */
  get saldoTempoReal() {
    return this.contasBanco.reduce((s,c) => s + c.saldo, 0);
  }

  /** Alterna o agrupamento do quadro Contas a Pagar. */
  modoContasPagar: 'diario' | 'semanal' | 'mensal' = 'mensal';

  private dataVencimentoOuLancamento(l: LancamentoResponseDTO): string | undefined {
    return l.dataVencimento || l.dataLancamento;
  }

  /** Despesas pendentes (ainda não pagas) com vencimento dentro do mês/ano selecionados. */
  get contasAPagar(): LancamentoResponseDTO[] {
    return this.lancamentos
      .filter(l => {
        if (l.tipo !== 'DESPESA' || l.status !== 'PENDENTE') return false;
        const dt = this.dataVencimentoOuLancamento(l);
        return !!dt && +dt.split('-')[0] === this.selectedYear && +dt.split('-')[1] === this.selectedMonth;
      })
      .sort((a, b) => (this.dataVencimentoOuLancamento(a) || '').localeCompare(this.dataVencimentoOuLancamento(b) || ''));
  }

  /**
   * Compras no cartão de crédito são pagas de uma vez só na fatura, não uma por uma —
   * então aqui elas somam numa única linha "Fatura {cartão}" por cartão/mês. Boleto e
   * outras formas de pagamento continuam aparecendo como contas individuais.
   */
  private consolidarFaturas(itens: LancamentoResponseDTO[]): LinhaContaAPagar[] {
    const faturas = new Map<number, { valor: number; dataVencimento?: string }>();
    const linhas: LinhaContaAPagar[] = [];

    for (const l of itens) {
      if (l.formaPagamento === 'CARTAO_CREDITO' && l.cartaoCreditoId) {
        const dt = this.dataVencimentoOuLancamento(l);
        const atual = faturas.get(l.cartaoCreditoId);
        if (atual) {
          atual.valor += l.valor;
          if (dt && (!atual.dataVencimento || dt > atual.dataVencimento)) atual.dataVencimento = dt;
        } else {
          faturas.set(l.cartaoCreditoId, { valor: l.valor, dataVencimento: dt });
        }
      } else {
        linhas.push({ descricao: l.descricao, valor: l.valor, dataVencimento: this.dataVencimentoOuLancamento(l) });
      }
    }

    for (const [cartaoId, f] of faturas) {
      linhas.push({ descricao: `Fatura ${this.cartoesMap.get(cartaoId) || 'Cartão'}`, valor: f.valor, dataVencimento: f.dataVencimento });
    }

    return linhas.sort((a, b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || ''));
  }

  get contasAPagarConsolidadas(): LinhaContaAPagar[] {
    return this.consolidarFaturas(this.contasAPagar);
  }

  get contasAPagarAgrupadas(): { titulo: string; itens: LinhaContaAPagar[]; total: number }[] {
    const itens = this.contasAPagarConsolidadas;
    if (this.modoContasPagar === 'mensal') {
      return itens.length ? [{ titulo: this.mesAnoLabel, itens, total: itens.reduce((s, l) => s + l.valor, 0) }] : [];
    }

    const grupos = new Map<string, LinhaContaAPagar[]>();
    for (const l of itens) {
      const dt = l.dataVencimento;
      if (!dt) continue;
      const [, mes, dia] = dt.split('-');
      const chave = this.modoContasPagar === 'diario'
        ? `${dia}/${mes}`
        : `Semana ${Math.ceil(+dia / 7)}`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(l);
    }
    return Array.from(grupos.entries()).map(([titulo, itens]) => ({
      titulo, itens, total: itens.reduce((s, l) => s + l.valor, 0)
    }));
  }

  /** As 6 contas a pagar de maior valor no mês selecionado (faturas de cartão já consolidadas), do maior pro menor. */
  get maioresContasAPagar(): LinhaContaAPagar[] {
    return [...this.contasAPagarConsolidadas].sort((a, b) => b.valor - a.valor).slice(0, 6);
  }

  private byCentro(items: LancamentoResponseDTO[]): Record<string,number> {
    return items.reduce((acc,l) => {
      const nome = l.centroCustoId ? (this.centrosMap.get(l.centroCustoId) || 'Outros') : 'Outros';
      acc[nome] = (acc[nome]||0) + l.valor;
      return acc;
    }, {} as Record<string,number>);
  }

  fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

  formatarNumero(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  private readonly mesesAbrev = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  private criarDatasetLinha(label: string, data: number[], cor: string, opts: { fundo?: string; tracejado?: boolean } = {}) {
    return {
      label, data,
      borderColor: cor, backgroundColor: opts.fundo ?? 'transparent',
      pointBackgroundColor: cor, pointBorderColor: '#0b1220',
      borderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
      tension: 0.35, cubicInterpolationMode: 'monotone' as const, fill: !!opts.fundo,
      borderDash: opts.tracejado ? [6, 4] : undefined
    };
  }

  get barData(): ChartData<'line'> {
    if (this.modoAnalise === 'anual') {
      const anoA = this.anoComparacaoA, anoB = this.anoComparacaoB;
      const resA = this.resultadoPorAno(anoA);
      const resB = this.resultadoPorAno(anoB);
      return {
        labels: this.mesesAbrev,
        datasets: [
          this.criarDatasetLinha(`Resultado ${anoA}`, resA, '#00c864', { fundo: 'rgba(0,200,100,0.15)' }),
          this.criarDatasetLinha(`Resultado ${anoB}`, resB, '#7c4dff', { fundo: 'rgba(124,77,255,0.15)' })
        ]
      };
    }

    const { r, d } = this.receitasDespesasPorAno(this.selectedYear);
    const ap = this.aplicadoPorMesAno(this.selectedYear);
    return {
      labels: this.mesesAbrev,
      datasets: [
        this.criarDatasetLinha('Receitas', r, '#00c864', { fundo: 'rgba(0,200,100,0.15)' }),
        this.criarDatasetLinha('Despesas', d, '#ff5252', { fundo: 'rgba(255,82,82,0.12)' }),
        this.criarDatasetLinha('Aplicações', ap, '#7c4dff', { fundo: 'rgba(124,77,255,0.12)' })
      ]
    };
  }
  /** Desenha o tooltip do gráfico Análise Mensal/Anual numa caixa fixa no canto superior direito
   *  (em vez da caixinha padrão do Chart.js que segue o mouse e tampa parte da linha). */
  private atualizarTooltipFixo(context: any): void {
    const { tooltip } = context;
    const el = document.getElementById('analise-tooltip-fixo');
    if (!el) return;

    if (!tooltip || tooltip.opacity === 0) {
      el.classList.remove('visivel');
      return;
    }

    const titulo = (tooltip.title || [])[0] ?? '';
    const linhas = (tooltip.dataPoints || []).map((dp: any) => {
      const cor = dp.dataset.borderColor as string;
      const valor = this.fmt(dp.parsed.y as number);
      return `<div class="analise-tooltip-linha"><span class="analise-tooltip-dot" style="background:${cor}"></span>${dp.dataset.label}: <strong>${valor}</strong></div>`;
    }).join('');

    el.innerHTML = `<div class="analise-tooltip-titulo">${titulo}</div>${linhas}`;
    el.classList.add('visivel');
  }

  barOpts: ChartOptions<'line'> = {
    responsive:true, maintainAspectRatio:false,
    interaction:{mode:'index', intersect:false},
    plugins:{
      legend:{labels:{color:'#00c8f0'}},
      tooltip:{ enabled:false, external:(ctx: any) => this.atualizarTooltipFixo(ctx) } as any
    },
    scales:{
      x:{ticks:{color:'#4a7a9b'}, grid:{color:'rgba(0,200,240,0.05)'}},
      y:{
        ticks:{color:'#4a7a9b'},
        grid:{color: (ctx) => ctx.tick.value === 0 ? 'rgba(224,224,224,0.35)' : 'rgba(0,200,240,0.05)'}
      }
    }
  };

  /** Detalhamento de despesas do mês por centro de custo — pendentes + já pagas (exclui só as
   *  canceladas), então continua mostrando onde o dinheiro foi gasto mesmo depois de pago. Top 14 +
   *  "Outros" agrupando o restante, pra nunca passar do tamanho da paleta categórica (CORES, 15
   *  cores) e evitar cor repetida entre fatias. */
  private despesasAgrupadas(): [string, number][] {
    const g = this.byCentro(this.mes.filter(l => l.tipo === 'DESPESA'));
    const sorted = Object.entries(g).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 14);
    const outros = sorted.slice(14).reduce((s, [, v]) => s + v, 0);
    if (outros > 0) top.push(['Outros', outros]);
    return top;
  }

  /** Mês/ano imediatamente anterior ao selecionado (considera virada de ano). */
  private periodoAnterior(): { mes: number; ano: number } {
    return this.selectedMonth === 1
      ? { mes: 12, ano: this.selectedYear - 1 }
      : { mes: this.selectedMonth - 1, ano: this.selectedYear };
  }

  /** Despesas (pendentes + pagas, exclui canceladas) de um mês/ano específico, por centro de custo. */
  private despesasPorCentroEm(mes: number, ano: number): Record<string, number> {
    const itens = this.lancamentos.filter(l => {
      if (l.tipo !== 'DESPESA' || l.status === 'CANCELADO') return false;
      const d = l.dataVencimento || l.dataLancamento;
      return !!d && +d.split('-')[0] === ano && +d.split('-')[1] === mes;
    });
    return this.byCentro(itens);
  }

  /** Lista de barrinhas (mesmo visual do quadro Orçamentos): uma linha por centro de custo,
   *  ordenada do maior gasto pro menor. A barra é proporcional ao maior valor da lista (ranking
   *  visual), e o percentual mostrado ao lado é a fatia sobre o total do mês. Um marcador na barra
   *  mostra onde ficava o gasto do mesmo centro de custo no mês anterior — verde se esse mês gastou
   *  igual ou menos que antes, vermelho se gastou mais. Sem dado no mês anterior (ou "Outros", cuja
   *  composição muda mês a mês) simplesmente não mostra marcador. */
  get despesasDetalhes() {
    const top = this.despesasAgrupadas();
    const total = top.reduce((s, [, v]) => s + v, 0);
    const max = top.reduce((m, [, v]) => Math.max(m, v), 0);

    const { mes: mesAnt, ano: anoAnt } = this.periodoAnterior();
    const anteriorPorCentro = this.despesasPorCentroEm(mesAnt, anoAnt);

    return top.map(([nome, valor], i) => {
      const valorAnterior = nome !== 'Outros' ? anteriorPorCentro[nome] : undefined;
      const temComparativo = !!valorAnterior && valorAnterior > 0 && max > 0;
      return {
        nome, valor,
        pct: total > 0 ? Math.round(valor / total * 100) : 0,
        pctBarra: max > 0 ? Math.round(valor / max * 100) : 0,
        cor: CORES[i],
        temComparativo,
        valorAnterior: valorAnterior ?? 0,
        pctAnteriorBarra: temComparativo ? Math.min(100, Math.round(valorAnterior! / max * 100)) : 0,
        corMarcador: temComparativo ? (valor > valorAnterior! ? '#ff1744' : '#00e676') : ''
      };
    });
  }

  /** Total do Detalhamento de Despesas — mostrado ao lado do título do card. */
  get totalDetalhamentoDespesas(): number {
    return this.despesasAgrupadas().reduce((s, [, v]) => s + v, 0);
  }

}