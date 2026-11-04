import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RankingPage } from './ranking-page';

describe('RankingPage', () => {
  let component: RankingPage;
  let fixture: ComponentFixture<RankingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RankingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(RankingPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
