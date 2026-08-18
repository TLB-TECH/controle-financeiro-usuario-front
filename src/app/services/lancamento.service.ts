import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TipoLancamento = 'RECEITA' | 'DESPESA';
export type StatusLancamento = 'PENDENTE' | 'EFETIVADO' | 'CANCELADO';
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'BOLETO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TRANSFERENCIA';

export interface LancamentoRequestDTO {
    descricao: string;
    valorOriginal: number;
    tipo: TipoLancamento;
    formaPagamento?: FormaPagamento;
    centroCustoId?: number;
    cartaoCreditoId?: number;
    dataLancamento?: string;
    dataVencimento?: string;
    observacao?: string;
    numeroParcelas?: number;
}

/** Gera uma parcela por mês (1 lançamento por parcela, cada uma com seu próprio vencimento),
 *  diferente de LancamentoRequestDTO, que só guarda o número de parcelas como metadado. */
export interface LancamentoParceladoRequestDTO {
    descricao: string;
    valorTotal: number;
    numeroParcelas: number;
    formaPagamento: FormaPagamento;
    cartaoCreditoId?: number;
    centroCustoId?: number;
    dataInicio?: string;
    observacao?: string;
}

export interface EfetivarRequestDTO {
    contaId: number;
    dataPagamento?: string;
}

export interface LancamentoResponseDTO {
    id: number;
    descricao: string;
    valorOriginal: number;
    valor: number;
    tipo: TipoLancamento;
    formaPagamento?: FormaPagamento;
    status: StatusLancamento;
    centroCustoId?: number;
    contaId?: number;
    cartaoCreditoId?: number;
    dataLancamento?: string;
    dataVencimento?: string;
    dataPagamento?: string;
    observacao?: string;
    numeroParcelas?: number;
    parcelaNumero?: number;
    grupoParcelaId?: string;
    ativo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LancamentoService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/lancamentos`;

    listar(tipo?: TipoLancamento | null, status?: StatusLancamento | null, descricao?: string | null): Observable<LancamentoResponseDTO[]> {
        let params = new HttpParams();
        if (tipo) params = params.set('tipo', tipo);
        if (status) params = params.set('status', status);
        if (descricao) params = params.set('descricao', descricao);
        return this.http.get<LancamentoResponseDTO[]>(this.apiUrl, { params });
    }

    criar(dto: LancamentoRequestDTO): Observable<LancamentoResponseDTO> {
        return this.http.post<LancamentoResponseDTO>(this.apiUrl, dto);
    }

    criarParcelado(dto: LancamentoParceladoRequestDTO): Observable<LancamentoResponseDTO[]> {
        return this.http.post<LancamentoResponseDTO[]>(`${this.apiUrl}/parcelado`, dto);
    }

    atualizar(id: number, dto: LancamentoRequestDTO): Observable<LancamentoResponseDTO> {
        return this.http.put<LancamentoResponseDTO>(`${this.apiUrl}/${id}`, dto);
    }

    efetivar(id: number, dto: EfetivarRequestDTO): Observable<LancamentoResponseDTO> {
        return this.http.patch<LancamentoResponseDTO>(`${this.apiUrl}/${id}/efetivar`, dto);
    }

    excluir(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    excluirGrupo(grupoParcelaId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/grupo/${grupoParcelaId}`);
    }
}