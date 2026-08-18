import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

export interface AcessoDTO {
  temAcesso: boolean;
  status: 'TRIAL' | 'ATIVO' | 'INADIMPLENTE' | 'CANCELADO';
  diasRestantesTrial: number | null;
}

export interface CheckoutResponseDTO { urlCheckout: string; }

@Injectable({ providedIn: 'root' })
export class AssinaturaService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getStatus(): Observable<AcessoDTO> {
    return this.http.get<AcessoDTO>(`${this.apiUrl}/usuarios/me/assinatura`);
  }

  iniciarCheckout(): Observable<CheckoutResponseDTO> {
    return this.http.post<CheckoutResponseDTO>(`${this.apiUrl}/usuarios/me/assinatura/checkout`, {});
  }
}
