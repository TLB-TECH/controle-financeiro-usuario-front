import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type CategoriaTipoConta = 'BANCO' | 'APLICACAO';

export interface TipoContaDTO {
  id?: number;
  nome: string;
  categoria: CategoriaTipoConta;
  ativo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TipoContaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tipos-conta`;

  listar(ativo?: boolean | null): Observable<TipoContaDTO[]> {
    let params = new HttpParams();
    if (ativo !== null && ativo !== undefined) {
      params = params.set('ativo', String(ativo));
    }
    return this.http.get<TipoContaDTO[]>(this.apiUrl, { params });
  }

  criar(tipo: TipoContaDTO): Observable<TipoContaDTO> {
    return this.http.post<TipoContaDTO>(this.apiUrl, tipo);
  }

  atualizar(id: number, tipo: TipoContaDTO): Observable<TipoContaDTO> {
    return this.http.put<TipoContaDTO>(`${this.apiUrl}/${id}`, tipo);
  }

  inativar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  reativar(id: number): Observable<TipoContaDTO> {
    return this.http.patch<TipoContaDTO>(`${this.apiUrl}/${id}/reativar`, {});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/excluir`);
  }
}
