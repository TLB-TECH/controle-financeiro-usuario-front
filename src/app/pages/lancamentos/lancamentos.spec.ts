import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Lancamentos } from './lancamentos';

describe('Lancamentos', () => {
  let component: Lancamentos;
  let fixture: ComponentFixture<Lancamentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lancamentos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Lancamentos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
