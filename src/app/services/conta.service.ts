import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TipoContaDTO } from './tipo-conta.service';

export interface ContaRequest {
  nome: string;
  banco: string;
  tipoContaId: number;
  saldo: number;
}

export interface ContaResponse {
  id: number;
  nome: string;
  banco: string;
  tipoConta: TipoContaDTO;
  saldo: number;
  ativo: boolean;
  criadoEm: string;
}

export interface TransferenciaRequest {
  contaOrigemId: number;
  contaDestinoId: number;
  valor: number;
  descricao?: string;
}

export type TipoMovimentoBancario = 'ENTRADA' | 'SAIDA';
export type OrigemMovimentoBancario = 'MANUAL' | 'TITULO' | 'TRANSFERENCIA' | 'SALDO_INICIAL' | 'AJUSTE';

export interface LancamentoBancarioRequest {
  tipo: TipoMovimentoBancario;
  valor: number;
  data: string;
  descricao?: string;
  tituloId?: number;
}

export interface LancamentoBancarioResponse {
  id: number;
  contaId: number;
  tipo: TipoMovimentoBancario;
  valor: number;
  data: string;
  descricao?: string;
  origem: OrigemMovimentoBancario;
  tituloId?: number;
  transferenciaId?: string;
  criadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class ContaService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  listar(): Observable<ContaResponse[]> {
    return this.http.get<ContaResponse[]>(`${this.apiUrl}/contas`);
  }

  buscarPorId(id: number): Observable<ContaResponse> {
    return this.http.get<ContaResponse>(`${this.apiUrl}/contas/${id}`);
  }

  criar(dto: ContaRequest): Observable<ContaResponse> {
    return this.http.post<ContaResponse>(`${this.apiUrl}/contas`, dto);
  }

  atualizar(id: number, dto: ContaRequest): Observable<ContaResponse> {
    return this.http.put<ContaResponse>(`${this.apiUrl}/contas/${id}`, dto);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/contas/${id}`);
  }

  transferir(dto: TransferenciaRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/contas/transferir`, dto);
  }

  totalBancos(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/contas/totais/bancos`);
  }

  totalAplicacoes(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/contas/totais/aplicacoes`);
  }

  listarLancamentos(contaId: number): Observable<LancamentoBancarioResponse[]> {
    return this.http.get<LancamentoBancarioResponse[]>(`${this.apiUrl}/contas/${contaId}/lancamentos`);
  }

  registrarLancamento(contaId: number, dto: LancamentoBancarioRequest): Observable<LancamentoBancarioResponse> {
    return this.http.post<LancamentoBancarioResponse>(`${this.apiUrl}/contas/${contaId}/lancamentos`, dto);
  }
}