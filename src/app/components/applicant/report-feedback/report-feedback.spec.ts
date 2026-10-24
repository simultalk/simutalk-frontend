import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportFeedback } from './report-feedback';

describe('ReportFeedback', () => {
  let component: ReportFeedback;
  let fixture: ComponentFixture<ReportFeedback>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportFeedback]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ReportFeedback);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
