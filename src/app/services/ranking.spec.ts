import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RankingService } from './ranking';

describe('RankingService', () => {
  let service: RankingService;
  let http: HttpTestingController;

  const apiResponse = (forced: boolean) => ({
    jobPostingId: 1,
    anonymized: forced,
    anonymizationForced: forced,
    candidates: [
      {
        rank: 1,
        candidateCode: 'CAND-001',
        fullName: forced ? null : 'Rosa Quispe',
        applicationId: 10,
        assessmentId: 20,
        weightedScore: 80,
        criteria: [],
        badges: [],
      },
    ],
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RankingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el ranking con anonymized=false por defecto', () => {
    service.getRanking(1).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/job-postings/1/ranking'));
    expect(req.request.params.get('anonymized')).toBe('false');
    req.flush(apiResponse(false));
  });

  it('pide el ranking con anonymized=true cuando se activa el modo anónimo', () => {
    service.getRanking(1, true).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/job-postings/1/ranking'));
    expect(req.request.params.get('anonymized')).toBe('true');
    req.flush(apiResponse(false));
  });

  it('propaga anonymizationForced y candidateCode', () => {
    let forced: boolean | undefined;
    let code: string | undefined;
    service.getRanking(1).subscribe((res) => {
      forced = res.anonymizationForced;
      code = res.entries[0].candidateCode;
    });
    http.expectOne((r) => r.url.endsWith('/job-postings/1/ranking')).flush(apiResponse(true));
    expect(forced).toBe(true);
    expect(code).toBe('CAND-001');
  });
});