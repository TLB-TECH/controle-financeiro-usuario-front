import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { BrDateAdapter, BR_DATE_FORMATS } from '../../shared/br-date-adapter';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  ContaService,
  ContaResponse,
  LancamentoBancarioResponse,
  TipoMovimentoBancario,
  OrigemMovimentoBancario
} from '../../services/conta.service';

interface LinhaExtrato extends LancamentoBancarioResponse {
  saldoAcumulado: number;
}

@Component({
  selector: 'app-extrato-conta',
  standalone: true,
  imports: [
    CommonModule, FormsModule, SidebarComponent,
    MatCardModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule
  ],
  templateUrl: './extrato-conta.component.html',
  styleUrls: ['./extrato-conta.component.scss', '../contas/contas.component.scss'],
  providers: [
    { provide: DateAdapter, useClass: BrDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: BR_DATE_FORMATS }
  ]
})
export class ExtratoContaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ContaService);

  contaId = Number(this.route.snapshot.paramMap.get('id'));
  conta: ContaResponse | null = null;
  lancamentos: LancamentoBancarioResponse[] = [];
  carregando = true;

  colunas = ['data', 'descricao', 'origem', 'tipo', 'valor', 'saldoAcumulado'];

  readonly origens: { valor: OrigemMovimentoBancario | 'TODAS'; label: string }[] = [
    { valor: 'TODAS', label: 'Todas as origens' },
    { valor: 'MANUAL', label: 'Manual' },
    { valor: 'TITULO', label: 'Título' },
    { valor: 'TRANSFERENCIA', label: 'Transferência' },
    { valor: 'SALDO_INICIAL', label: 'Saldo inicial' },
    { valor: 'AJUSTE', label: 'Ajuste' }
  ];

  filtroDataDe: Date | null = null;
  filtroDataAte: Date | null = null;
  filtroOrigem: OrigemMovimentoBancario | 'TODAS' = 'TODAS';
  filtroTipo: TipoMovimentoBancario | 'TODOS' = 'TODOS';

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.svc.buscarPorId(this.contaId).subscribe(c => this.conta = c);
    this.svc.listarLancamentos(this.contaId).subscribe({
      next: d => { this.lancamentos = d; this.carregando = false; },
      error: () => { this.carregando = false; }
    });
  }

  private get extratoCompleto(): LinhaExtrato[] {
    const asc = [...this.lancamentos].sort((a, b) => {
      const chaveA = `${a.data}T${a.criadoEm}`;
      const chaveB = `${b.data}T${b.criadoEm}`;
      return chaveA.localeCompare(chaveB);
    });
    let saldo = 0;
    const comSaldo: LinhaExtrato[] = asc.map(l => {
      saldo += l.tipo === 'ENTRADA' ? l.valor : -l.valor;
      return { ...l, saldoAcumulado: saldo };
    });
    return comSaldo.reverse();
  }

  /** Filtra sobre o extrato já com saldo acumulado calculado na lista completa,
   *  para que o saldo de cada linha continue correto mesmo com filtros aplicados. */
  get extrato(): LinhaExtrato[] {
    const de = this.filtroDataDe ? this.paraDataISO(this.filtroDataDe) : null;
    const ate = this.filtroDataAte ? this.paraDataISO(this.filtroDataAte) : null;

    return this.extratoCompleto.filter(l => {
      if (de && l.data < de) return false;
      if (ate && l.data > ate) return false;
      if (this.filtroOrigem !== 'TODAS' && l.origem !== this.filtroOrigem) return false;
      if (this.filtroTipo !== 'TODOS' && l.tipo !== this.filtroTipo) return false;
      return true;
    });
  }

  limparFiltros() {
    this.filtroDataDe = null;
    this.filtroDataAte = null;
    this.filtroOrigem = 'TODAS';
    this.filtroTipo = 'TODOS';
  }

  get temFiltroAtivo(): boolean {
    return !!(this.filtroDataDe || this.filtroDataAte || this.filtroOrigem !== 'TODAS' || this.filtroTipo !== 'TODOS');
  }

  private paraDataISO(d: Date): string {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  voltar() {
    this.router.navigate(['/contas']);
  }

  fmt(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  fmtData(d: string) {
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  origemLabel(o: string) {
    const labels: Record<string, string> = {
      MANUAL: 'Manual',
      TITULO: 'Título',
      TRANSFERENCIA: 'Transferência',
      SALDO_INICIAL: 'Saldo inicial',
      AJUSTE: 'Ajuste'
    };
    return labels[o] ?? o;
  }
}
