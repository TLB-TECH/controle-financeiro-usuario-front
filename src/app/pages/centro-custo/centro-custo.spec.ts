import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentroCusto } from './centro-custo';

describe('CentroCusto', () => {
  let component: CentroCusto;
  let fixture: ComponentFixture<CentroCusto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentroCusto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CentroCusto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
