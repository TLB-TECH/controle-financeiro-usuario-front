import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ContaService, ContaResponse } from '../../services/conta.service';

@Component({
    selector: 'app-transferencia-modal',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatDialogModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatSnackBarModule
    ],
    template: `
    <h2 mat-dialog-title>Transferência entre Contas</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>De (origem)</mat-label>
          <mat-select formControlName="contaOrigemId" panelClass="conta-select-panel" [hideSingleSelectionIndicator]="true">
            <mat-select-trigger class="select-trigger-row" *ngIf="contaPorId(form.value.contaOrigemId) as c">
              <span class="trigger-nome">{{ c.nome }} <span class="trigger-banco">({{ c.banco }})</span></span>
              <span class="trigger-valor" [class.saldo-positivo]="c.saldo >= 0" [class.saldo-negativo]="c.saldo < 0">R$ {{ formatarNumero(c.saldo) }}</span>
            </mat-select-trigger>
            <mat-optgroup label="Bancos" *ngIf="contasBanco.length">
              <mat-option *ngFor="let c of contasBanco" [value]="c.id">
                <span class="conta-opt">
                  <span class="conta-opt-nome">{{ c.nome }} <span class="conta-opt-banco">({{ c.banco }})</span></span>
                  <span class="conta-opt-dots"></span>
                  <span class="conta-opt-saldo" [class.saldo-positivo]="c.saldo >= 0" [class.saldo-negativo]="c.saldo < 0">
                    <span class="conta-opt-cifrao">R$</span><span class="conta-opt-valor">{{ formatarNumero(c.saldo) }}</span>
                  </span>
                </span>
              </mat-option>
            </mat-optgroup>
            <mat-optgroup label="Aplicações" *ngIf="contasAplicacao.length">
              <mat-option *ngFor="let c of contasAplicacao" [value]="c.id">
                <span class="conta-opt">
                  <span class="conta-opt-nome">{{ c.nome }} <span class="conta-opt-banco">({{ c.banco }})</span></span>
                  <span class="conta-opt-dots"></span>
                  <span class="conta-opt-saldo" [class.saldo-positivo]="c.saldo >= 0" [class.saldo-negativo]="c.saldo < 0">
                    <span class="conta-opt-cifrao">R$</span><span class="conta-opt-valor">{{ formatarNumero(c.saldo) }}</span>
                  </span>
                </span>
              </mat-option>
            </mat-optgroup>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Para (destino: outro banco ou aplicação)</mat-label>
          <mat-select formControlName="contaDestinoId" panelClass="conta-select-panel" [hideSingleSelectionIndicator]="true">
            <mat-select-trigger class="select-trigger-row" *ngIf="contaPorId(form.value.contaDestinoId) as c">
              <span class="trigger-nome">{{ c.nome }} <span class="trigger-banco">({{ c.banco }})</span></span>
              <span class="trigger-valor" [class.saldo-positivo]="c.saldo >= 0" [class.saldo-negativo]="c.saldo < 0">R$ {{ formatarNumero(c.saldo) }}</span>
            </mat-select-trigger>
            <mat-optgroup label="Bancos" *ngIf="contasBanco.length">
              <mat-option *ngFor="let c of contasBanco" [value]="c.id">
                <span class="conta-opt">
                  <span class="conta-opt-nome">{{ c.nome }} <span class="conta-opt-banco">({{ c.banco }})</span></span>
                  <span class="conta-opt-dots"></span>
                  <span class="conta-opt-saldo" [class.saldo-positivo]="c.saldo >= 0" [class.saldo-negativo]="c.saldo < 0">
                    <span class="conta-opt-cifrao">R$</span><span class="conta-opt-valor">{{ formatarNumero(c.saldo) }}</span>
                  </span>
                </span>
              </mat-option>
            </mat-optgroup>
            <mat-optgroup label="Aplicações" *ngIf="contasAplicacao.length">
              <mat-option *ngFor="let c of contasAplicacao" [value]="c.id">
                <span class="conta-opt">
                  <span class="conta-opt-nome">{{ c.nome }} <span class="conta-opt-banco">({{ c.banco }})</span></span>
                  <span class="conta-opt-dots"></span>
                  <span class="conta-opt-saldo" [class.saldo-positivo]="c.saldo >= 0" [class.saldo-negativo]="c.saldo < 0">
                    <span class="conta-opt-cifrao">R$</span><span class="conta-opt-valor">{{ formatarNumero(c.saldo) }}</span>
                  </span>
                </span>
              </mat-option>
            </mat-optgroup>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Valor (R$)</mat-label>
          <input matInput type="text" inputmode="decimal" placeholder="0,00"
                 [value]="valorDisplay" (input)="onValorInput($event)">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrição (opcional)</mat-label>
          <input matInput formControlName="descricao">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="btn-cancelar" (click)="fechar()">Cancelar</button>
      <button class="btn-salvar"
              (click)="transferir()" [disabled]="form.invalid || carregando">
        {{ carregando ? 'Transferindo...' : 'Transferir' }}
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    .full-width { width: 100%; margin-bottom: 8px; }
    h2 { color: var(--cor-primaria); }

    ::ng-deep .conta-select-panel .mdc-list-item__primary-text {
      flex: 1 1 auto;
      width: 100%;
    }

    .conta-opt {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 8px;
    }

    .conta-opt-nome {
      flex-shrink: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .conta-opt-banco {
      color: #4a7a9b;
      font-size: 0.85em;
    }

    .conta-opt-dots {
      flex: 1;
      align-self: flex-end;
      height: 0;
      margin-bottom: 6px;
      border-bottom: 1px dotted rgba(255, 255, 255, 0.18);
    }

    .conta-opt-saldo {
      display: inline-flex;
      align-items: baseline;
      flex-shrink: 0;
      width: 105px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;

      &.saldo-positivo { color: #69f0ae; }
      &.saldo-negativo { color: #ff5252; }
    }

    .select-trigger-row {
      display: flex;
      align-items: baseline;
      width: 100%;
      gap: 12px;
      padding-right: 24px;
      box-sizing: border-box;
    }

    .trigger-nome {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trigger-banco {
      color: #4a7a9b;
      font-size: 0.85em;
      margin-left: 4px;
    }

    .trigger-valor {
      flex-shrink: 0;
      margin-left: auto;
      font-weight: 600;
      font-variant-numeric: tabular-nums;

      &.saldo-positivo { color: #69f0ae; }
      &.saldo-negativo { color: #ff5252; }
    }

    .conta-opt-cifrao {
      flex-shrink: 0;
      width: 26px;
      text-align: left;
      opacity: 0.75;
      font-weight: 500;
    }

    .conta-opt-valor {
      flex: 1;
      text-align: right;
    }

    .btn-cancelar {
      background: transparent;
      border: 1px solid rgba(0, 200, 240, 0.25);
      border-radius: 8px;
      color: #4a7a9b;
      padding: 8px 20px;
      cursor: pointer;
      font-size: 0.875rem;
      &:hover { border-color: #ff5252; color: #ff5252; }
    }

    .btn-salvar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--cor-primaria);
      border-radius: 8px;
      color: var(--cor-primaria);
      font-weight: 600;
      font-size: 0.875rem;
      padding: 8px 24px;
      cursor: pointer;
      min-width: 90px;
      transition: background 0.2s;
      &:hover:not(:disabled) { background: rgba(0, 200, 240, 0.12); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  `]
})
export class TransferenciaModalComponent {
    private fb = inject(FormBuilder);
    private svc = inject(ContaService);
    private snack = inject(MatSnackBar);
    private ref = inject(MatDialogRef<TransferenciaModalComponent>);

    contas: ContaResponse[] = inject(MAT_DIALOG_DATA).contas;

    contaPorId(id: number | null | undefined): ContaResponse | undefined {
        return this.contas.find(c => c.id === id);
    }

    get contasBanco(): ContaResponse[] {
        return this.contas.filter(c => c.tipoConta?.categoria === 'BANCO');
    }

    get contasAplicacao(): ContaResponse[] {
        return this.contas.filter(c => c.tipoConta?.categoria === 'APLICACAO');
    }

    formatarNumero(valor: number): string {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    carregando = false;

    form = this.fb.group({
        contaOrigemId: [null, Validators.required],
        contaDestinoId: [null, Validators.required],
        valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
        descricao: ['']
    });
    valorDisplay = '';

    onValorInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const digitos = input.value.replace(/\D/g, '');
        const numero = digitos ? parseInt(digitos, 10) / 100 : null;
        this.form.get('valor')!.setValue(numero);
        this.valorDisplay = numero == null ? '' : numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        input.value = this.valorDisplay;
    }

    transferir() {
        if (this.form.invalid) return;
        this.carregando = true;
        this.svc.transferir(this.form.value as any).subscribe({
            next: () => {
                this.snack.open('Transferência realizada!', 'X', { duration: 3000 });
                this.ref.close(true);
            },
            error: (e) => {
                this.snack.open(e.error?.message ?? 'Erro na transferência.', 'X', { duration: 3000 });
                this.carregando = false;
            }
        });
    }

    fechar() { this.ref.close(false); }
}