import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterielDetail } from './materiel-detail';

describe('MaterielDetail', () => {
  let component: MaterielDetail;
  let fixture: ComponentFixture<MaterielDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterielDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(MaterielDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
