import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RankingPageComponent } from './ranking-page';

describe('RankingPageComponent', () => {
  let component: RankingPageComponent;
  let fixture: ComponentFixture<RankingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RankingPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RankingPageComponent);
    component = fixture.componentInstance;
  });

  it('se crea', () => {
    expect(component).toBeTruthy();
  });

  it('es anónimo si el usuario activa el toggle o si el backend lo fuerza', () => {
    expect(component.isAnonymous()).toBe(false);

    component.anonymized.set(true);
    expect(component.isAnonymous()).toBe(true);

    component.anonymized.set(false);
    component.forced.set(true);
    expect(component.isAnonymous()).toBe(true);
  });

  it('muestra candidateCode en modo anónimo y el nombre en modo normal', () => {
    const row = { candidateName: 'Rosa Quispe', candidateCode: 'CAND-001' } as any;
    expect(component.displayName(row)).toBe('Rosa Quispe');

    component.anonymized.set(true);
    expect(component.displayName(row)).toBe('CAND-001');
  });
});