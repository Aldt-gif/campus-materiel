import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Introuvable } from './introuvable';

describe('Introuvable', () => {
  let component: Introuvable;
  let fixture: ComponentFixture<Introuvable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Introuvable],
    }).compileComponents();

    fixture = TestBed.createComponent(Introuvable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
