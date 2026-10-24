import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListMyApplications } from './list-my-applications';

describe('ListMyApplications', () => {
  let component: ListMyApplications;
  let fixture: ComponentFixture<ListMyApplications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListMyApplications]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ListMyApplications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
