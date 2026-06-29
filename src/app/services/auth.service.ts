import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environment/environment.prod';



export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
}

export interface CadastroRequest {
  nome: string;
  email: string;
  senha: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  login(dados: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, dados).pipe(
      tap(response => this.salvarToken(response.token))
    );
  }

  cadastrar(dados: CadastroRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios`, dados);
  }

  salvarToken(token: string): void {
    localStorage.setItem('jwt_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  isLogado(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
  }
}