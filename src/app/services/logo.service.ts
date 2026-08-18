import { Injectable, signal } from '@angular/core';

const LOGO_KEY = 'tlb_logo';
const DEFAULT_LOGO = 'assets/logo-tlbtech.jpeg';

@Injectable({ providedIn: 'root' })
export class LogoService {
  private _logoUrl = signal<string>(
    localStorage.getItem(LOGO_KEY) ?? DEFAULT_LOGO
  );

  readonly logoUrl = this._logoUrl.asReadonly();

  setLogo(base64: string): void {
    localStorage.setItem(LOGO_KEY, base64);
    this._logoUrl.set(base64);
  }

  resetLogo(): void {
    localStorage.removeItem(LOGO_KEY);
    this._logoUrl.set(DEFAULT_LOGO);
  }
}