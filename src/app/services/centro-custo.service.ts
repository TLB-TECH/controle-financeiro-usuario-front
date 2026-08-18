import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CentroCustoDTO {
  id?: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CentroCustoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/centros-custo`;

  listar(ativo?: boolean | null): Observable<CentroCustoDTO[]> {
    let params = new HttpParams();
    if (ativo !== null && ativo !== undefined) {
      params = params.set('ativo', String(ativo));
    }
    return this.http.get<CentroCustoDTO[]>(this.apiUrl, { params });
  }

  criar(centro: CentroCustoDTO): Observable<CentroCustoDTO> {
    return this.http.post<CentroCustoDTO>(this.apiUrl, centro);
  }

  atualizar(id: number, centro: CentroCustoDTO): Observable<CentroCustoDTO> {
    return this.http.put<CentroCustoDTO>(`${this.apiUrl}/${id}`, centro);
  }

  inativar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  reativar(id: number): Observable<CentroCustoDTO> {
    return this.http.patch<CentroCustoDTO>(`${this.apiUrl}/${id}/reativar`, {});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/excluir`);
  }
}