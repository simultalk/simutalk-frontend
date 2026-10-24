import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailJobPosting } from './detail-job-posting';

describe('DetailJobPosting', () => {
  let component: DetailJobPosting;
  let fixture: ComponentFixture<DetailJobPosting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailJobPosting]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DetailJobPosting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
