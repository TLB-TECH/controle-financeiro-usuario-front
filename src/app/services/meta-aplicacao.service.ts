import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

export interface MetaMensalItem {
    mes: number;
    valor: number;
}

export interface MetaMensalResponse {
    mes: number;
    ano: number;
    valor: number;
    atualizadoEm: string | null;
}

export interface MetaAnualResponse {
    ano: number;
    valor: number;
    atualizadoEm: string | null;
}

@Injectable({ providedIn: 'root' })
export class MetaAplicacaoService {
    private api = 'http://localhost:8080/metas-aplicacao';

    constructor(private http: HttpClient) {}

    listarMensal(ano: number): Observable<MetaMensalResponse[]> {
        return this.http.get<MetaMensalResponse[]>(`${this.api}/mensal/${ano}`);
    }

    salvarMensal(ano: number, itens: MetaMensalItem[]): Observable<MetaMensalResponse[]> {
        return this.http.put<MetaMensalResponse[]>(`${this.api}/mensal/${ano}`, itens);
    }

    obterAnual(ano: number): Observable<MetaAnualResponse> {
        return this.http.get<MetaAnualResponse>(`${this.api}/anual/${ano}`);
    }

    salvarAnual(ano: number, valor: number): Observable<MetaAnualResponse> {
        return this.http.put<MetaAnualResponse>(`${this.api}/anual/${ano}`, { valor });
    }
}
