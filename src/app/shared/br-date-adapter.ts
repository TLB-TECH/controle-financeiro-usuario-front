import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class BrDateAdapter extends NativeDateAdapter {
  override format(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }

  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) return new Date(+match[3], +match[2] - 1, +match[1]);
    }
    return super.parse(value);
  }
}

export const BR_DATE_FORMATS = {
  parse:   { dateInput: 'dd/MM/yyyy' },
  display: {
    dateInput:           'dd/MM/yyyy',
    monthYearLabel:      'MMM/yyyy',
    dateA11yLabel:       'dd/MM/yyyy',
    monthYearA11yLabel:  'MMMM yyyy'
  }
};
