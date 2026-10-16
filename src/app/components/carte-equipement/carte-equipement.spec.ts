import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarteEquipement } from './carte-equipement';

describe('CarteEquipement', () => {
  let component: CarteEquipement;
  let fixture: ComponentFixture<CarteEquipement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarteEquipement],
    }).compileComponents();

    fixture = TestBed.createComponent(CarteEquipement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
