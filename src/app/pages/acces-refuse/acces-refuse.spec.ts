import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccesRefuse } from './acces-refuse';

describe('AccesRefuse', () => {
  let component: AccesRefuse;
  let fixture: ComponentFixture<AccesRefuse>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccesRefuse],
    }).compileComponents();

    fixture = TestBed.createComponent(AccesRefuse);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
