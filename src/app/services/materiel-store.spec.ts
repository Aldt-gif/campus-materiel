import { TestBed } from '@angular/core/testing';
import { MaterielStore } from './materiel-store';

describe('MaterielStore', () => {
  let service: MaterielStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MaterielStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
