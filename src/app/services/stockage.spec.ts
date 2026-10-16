import { TestBed } from '@angular/core/testing';
import { Stockage } from './stockage';

describe('Stockage', () => {
  let service: Stockage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Stockage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
