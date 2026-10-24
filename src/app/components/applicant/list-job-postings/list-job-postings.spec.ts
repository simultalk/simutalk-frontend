import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListJobPostings } from './list-job-postings';

describe('ListJobPostings', () => {
  let component: ListJobPostings;
  let fixture: ComponentFixture<ListJobPostings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListJobPostings]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ListJobPostings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
