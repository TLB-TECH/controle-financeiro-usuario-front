import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

export type TipoOrcamento = 'MENSAL' | 'ANUAL' | 'DEFINITIVO';
export type TipoAlvoOrcamento = 'CENTRO_CUSTO' | 'CARTAO' | 'TODOS_CARTOES';

export interface Orcamento {
    id: number;
    tipoAlvo: TipoAlvoOrcamento;
    centroCustoId: number | null;
    cartaoCreditoId: number | null;
    tipo: TipoOrcamento;
    mes: number | null;
    ano: number | null;
    valorLimite: number;
    ativo: boolean;
    criadoEm: string;
}

export interface OrcamentoRequest {
    tipoAlvo: TipoAlvoOrcamento;
    centroCustoId: number | null;
    cartaoCreditoId: number | null;
    tipo: TipoOrcamento;
    mes: number | null;
    ano: number | null;
    valorLimite: number;
}

@Injectable({ providedIn: 'root'})
export class OrcamentoService {
    private api = 'http://localhost:8080/orcamentos';

    constructor(private http: HttpClient) {}

    listar(): Observable<Orcamento[]> {
        return this.http.get<Orcamento[]>(this.api);
    }

    listarPorMesAno(mes: number, ano: number): Observable<Orcamento[]> {
        return this.http.get<Orcamento[]>(`${this.api}/mes/${mes}/ano/${ano}`);
    }

    criar(data: OrcamentoRequest): Observable<Orcamento> {
        return this.http.post<Orcamento>(this.api, data);
    }

    atualizar(id: number, data: OrcamentoRequest): Observable<Orcamento> {
        return this.http.put<Orcamento>(`${this.api}/${id}`, data);
    }

    excluir(id: number): Observable<void> {
        return this.http.delete<void>(`${this.api}/${id}`);
    }
}