import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FluxoCaixa {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
}

export interface Lancamento {
  id: number;
  descricao: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA';
  data: string;
  centroCustoNome: string;
}

export interface CentroCusto {
  id: number;
  nome: string;
}

export interface ResumoFinanceiro {
  fluxoCaixa: FluxoCaixa;
  lancamentos: Lancamento[];
  centrosCusto: CentroCusto[];
}

@Injectable({
  providedIn: 'root'
})
export class FinanceiroService {
  private http = inject(HttpClient);
  private bffUrl = environment.bffUrl;

  getResumo(): Observable<ResumoFinanceiro> {
    return this.http.get<ResumoFinanceiro>(`${this.bffUrl}/dashboard`);
  }
}