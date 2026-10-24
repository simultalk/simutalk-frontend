import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PipelineApplications } from './pipeline-applications';

describe('PipelineApplications', () => {
  let component: PipelineApplications;
  let fixture: ComponentFixture<PipelineApplications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipelineApplications]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PipelineApplications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
