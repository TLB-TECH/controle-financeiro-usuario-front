import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment.prod';

export interface LoginRequest { email: string; senha: string; }
export interface LoginResponse { token: string; }
export interface CadastroRequest { nome: string; email: string; senha: string; }
export interface AlterarSenhaRequest { senhaAtual: string; novaSenha: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  login(dados: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, dados).pipe(
      tap(r => this.salvarToken(r.token))
    );
  }

  cadastrar(dados: CadastroRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios`, dados);
  }

  recuperarSenha(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/recuperar-senha`, { email });
  }

  redefinirSenha(token: string, novaSenha: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/redefinir-senha`, { token, novaSenha });
  }

  alterarSenha(dados: AlterarSenhaRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/me/senha`, dados);
  }

  excluirConta(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/me`);
  }

  getMeuPerfil(): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuarios/me`);
  }

  salvarToken(token: string): void { localStorage.setItem('jwt_token', token); }
  getToken(): string | null { return localStorage.getItem('jwt_token'); }
  isLogado(): boolean { return !!this.getToken(); }
  logout(): void { localStorage.removeItem('jwt_token'); }
}