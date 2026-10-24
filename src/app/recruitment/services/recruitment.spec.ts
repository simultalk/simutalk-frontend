import { TestBed } from '@angular/core/testing';
import { Recruitment } from './recruitment';

describe('Recruitment', () => {
  let service: Recruitment;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Recruitment);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
