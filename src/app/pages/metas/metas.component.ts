import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { MetaAplicacaoService, MetaMensalItem } from '../../services/meta-aplicacao.service';
import { LancamentoService, LancamentoResponseDTO } from '../../services/lancamento.service';
import { CentroCustoService, CentroCustoDTO } from '../../services/centro-custo.service';

const MESES_HISTORICO = 3;
const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

type MetodoSugestao = 'sobra' | 'percentual';

interface LinhaMes {
  mes: number;
  nome: string;
  valor: number | null;
}

@Component({
  selector: 'app-metas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatSnackBarModule,
    SidebarComponent
  ],
  templateUrl: './metas.component.html',
  styleUrls: ['./metas.component.scss']
})
export class MetasComponent implements OnInit {

  anoSelecionado = new Date().getFullYear();

  mesesTabela: LinhaMes[] = NOMES_MESES.map((nome, i) => ({ mes: i + 1, nome, valor: 0 }));
  metaAnualValor: number | null = null;
  metaAnualDisplay = '';
  atualizadoEmAnual: string | null = null;

  carregando = false;
  salvandoMensal = false;
  salvandoAnual = false;

  centrosCusto: CentroCustoDTO[] = [];
  metodoSugestao: MetodoSugestao = 'sobra';
  centroCustoSelecionadoId: number | null = null;
  percentual = 20;
  mesAlvoSugestao = new Date().getMonth() + 1;

  private lancamentosEfetivados: LancamentoResponseDTO[] = [];

  sugestaoMensal: number | null = null;
  mesesConsiderados = 0;

  constructor(
    private metaAplicacaoService: MetaAplicacaoService,
    private lancamentoService: LancamentoService,
    private centroCustoService: CentroCustoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarAno();
    this.carregarCentrosCusto();
    this.carregarLancamentos();
  }

  anoAnterior(): void {
    this.anoSelecionado--;
    this.carregarAno();
  }

  anoSeguinte(): void {
    this.anoSelecionado++;
    this.carregarAno();
  }

  carregarAno(): void {
    this.carregando = true;
    this.metaAplicacaoService.listarMensal(this.anoSelecionado).subscribe({
      next: (data) => {
        this.mesesTabela = data.map(d => ({ mes: d.mes, nome: NOMES_MESES[d.mes - 1], valor: d.valor }));
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.snackBar.open('Erro ao carregar metas mensais', 'Fechar', { duration: 3000 });
      }
    });

    this.metaAplicacaoService.obterAnual(this.anoSelecionado).subscribe({
      next: (data) => {
        this.metaAnualValor = data.valor;
        this.metaAnualDisplay = this.formatarMoedaDisplay(data.valor);
        this.atualizadoEmAnual = data.atualizadoEm;
      },
      error: () => this.snackBar.open('Erro ao carregar meta anual', 'Fechar', { duration: 3000 })
    });
  }

  get totalPlanejadoMensal(): number {
    return this.mesesTabela.reduce((s, l) => s + (l.valor || 0), 0);
  }

  formatarMoedaDisplay(valor: number | null): string {
    if (valor === null || valor === undefined) return '';
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onMetaAnualInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '');
    this.metaAnualValor = digitos ? parseInt(digitos, 10) / 100 : null;
    this.metaAnualDisplay = this.formatarMoedaDisplay(this.metaAnualValor);
    input.value = this.metaAnualDisplay;
  }

  onMesInput(event: Event, linha: LinhaMes): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '');
    linha.valor = digitos ? parseInt(digitos, 10) / 100 : null;
    input.value = this.formatarMoedaDisplay(linha.valor);
  }

  salvarMensal(): void {
    this.salvandoMensal = true;
    const itens: MetaMensalItem[] = this.mesesTabela.map(l => ({ mes: l.mes, valor: l.valor || 0 }));
    this.metaAplicacaoService.salvarMensal(this.anoSelecionado, itens).subscribe({
      next: (data) => {
        this.salvandoMensal = false;
        this.mesesTabela = data.map(d => ({ mes: d.mes, nome: NOMES_MESES[d.mes - 1], valor: d.valor }));
        this.snackBar.open('Metas mensais salvas!', 'Fechar', { duration: 3000 });
      },
      error: () => {
        this.salvandoMensal = false;
        this.snackBar.open('Erro ao salvar metas mensais', 'Fechar', { duration: 3000 });
      }
    });
  }

  salvarAnual(): void {
    if (this.metaAnualValor == null || this.metaAnualValor < 0) return;
    this.salvandoAnual = true;
    this.metaAplicacaoService.salvarAnual(this.anoSelecionado, this.metaAnualValor).subscribe({
      next: (data) => {
        this.salvandoAnual = false;
        this.atualizadoEmAnual = data.atualizadoEm;
        this.snackBar.open('Meta anual salva!', 'Fechar', { duration: 3000 });
      },
      error: () => {
        this.salvandoAnual = false;
        this.snackBar.open('Erro ao salvar meta anual', 'Fechar', { duration: 3000 });
      }
    });
  }

  carregarCentrosCusto(): void {
    this.centroCustoService.listar(true).subscribe({
      next: (data) => {
        this.centrosCusto = data;
        const salario = data.find(c => c.nome.trim().toLowerCase() === 'salário' || c.nome.trim().toLowerCase() === 'salario');
        this.centroCustoSelecionadoId = salario?.id ?? data[0]?.id ?? null;
        if (this.metodoSugestao === 'percentual') this.recalcularSugestao();
      },
      error: () => this.snackBar.open('Erro ao carregar centros de custo', 'Fechar', { duration: 3000 })
    });
  }

  carregarLancamentos(): void {
    this.lancamentoService.listar(null, 'EFETIVADO').subscribe({
      next: (data) => {
        this.lancamentosEfetivados = data;
        this.recalcularSugestao();
      },
      error: () => { this.sugestaoMensal = null; }
    });
  }

  onMetodoSugestaoChange(metodo: MetodoSugestao): void {
    this.metodoSugestao = metodo;
    this.recalcularSugestao();
  }

  onParametroPercentualChange(): void {
    this.recalcularSugestao();
  }

  recalcularSugestao(): void {
    if (this.metodoSugestao === 'sobra') {
      this.calcularSugestaoSobra();
    } else {
      this.calcularSugestaoPercentual();
    }
  }

  private calcularSugestaoSobra(): void {
    const saldosPorMes = new Map<string, number>();

    for (const l of this.lancamentosEfetivados) {
      const dataRef = l.dataPagamento ?? l.dataLancamento;
      if (!dataRef) continue;
      const chave = dataRef.substring(0, 7); // yyyy-MM
      const valor = l.tipo === 'RECEITA' ? l.valor : -l.valor;
      saldosPorMes.set(chave, (saldosPorMes.get(chave) ?? 0) + valor);
    }

    const { media, meses } = this.mediaUltimosMeses(saldosPorMes);
    this.mesesConsiderados = meses;
    this.sugestaoMensal = meses === 0 ? null : Math.max(0, Math.round(media / 10) * 10);
  }

  private calcularSugestaoPercentual(): void {
    if (this.centroCustoSelecionadoId == null) {
      this.sugestaoMensal = null;
      this.mesesConsiderados = 0;
      return;
    }

    const totalPorMes = new Map<string, number>();
    for (const l of this.lancamentosEfetivados) {
      if (l.tipo !== 'RECEITA' || l.centroCustoId !== this.centroCustoSelecionadoId) continue;
      const dataRef = l.dataPagamento ?? l.dataLancamento;
      if (!dataRef) continue;
      const chave = dataRef.substring(0, 7);
      totalPorMes.set(chave, (totalPorMes.get(chave) ?? 0) + l.valor);
    }

    const { media, meses } = this.mediaUltimosMeses(totalPorMes);
    this.mesesConsiderados = meses;
    this.sugestaoMensal = meses === 0 ? null : Math.round((media * this.percentual / 100) / 10) * 10;
  }

  private mediaUltimosMeses(mapa: Map<string, number>): { media: number; meses: number } {
    const chaves = Array.from(mapa.keys()).sort().slice(-MESES_HISTORICO);
    if (chaves.length === 0) return { media: 0, meses: 0 };
    const soma = chaves.reduce((s, c) => s + mapa.get(c)!, 0);
    return { media: soma / chaves.length, meses: chaves.length };
  }

  nomeCentroCustoSelecionado(): string {
    return this.centrosCusto.find(c => c.id === this.centroCustoSelecionadoId)?.nome ?? '—';
  }

  usarSugestao(): void {
    if (this.sugestaoMensal == null) return;
    const linha = this.mesesTabela.find(l => l.mes === this.mesAlvoSugestao);
    if (linha) linha.valor = this.sugestaoMensal;
  }
}
