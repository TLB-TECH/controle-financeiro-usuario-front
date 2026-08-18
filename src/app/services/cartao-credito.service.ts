import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CartaoCreditoDTO {
  id: number;
  nome: string;
  limite?: number;
  ativo?: boolean;
}

export interface CartaoCreditoRequestDTO {
  nome: string;
  limite?: number;
}

@Injectable({ providedIn: 'root' })
export class CartaoCreditoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cartoes`;

  listar(): Observable<CartaoCreditoDTO[]> {
    return this.http.get<CartaoCreditoDTO[]>(this.apiUrl);
  }

  criar(dto: CartaoCreditoRequestDTO): Observable<CartaoCreditoDTO> {
    return this.http.post<CartaoCreditoDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: CartaoCreditoRequestDTO): Observable<CartaoCreditoDTO> {
    return this.http.put<CartaoCreditoDTO>(`${this.apiUrl}/${id}`, dto);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
