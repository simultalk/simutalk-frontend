// Bounded context profiles (US-15, US-16)

export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';

export interface Certification {
  id: number;
  title: string;
  issuer: string;
  credentialCode: string | null;
  issuedAt: string; // yyyy-MM-dd
  expiresAt: string | null; // yyyy-MM-dd
  expired: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CertificationRequest {
  title: string;
  issuer: string;
  credentialCode: string | null;
  issuedAt: string; // yyyy-MM-dd
  expiresAt: string | null; // yyyy-MM-dd
}

/** Respuesta de POST .../certifications/{id}/verification (US-16). */
export interface CertificationVerification {
  certification: Certification;
  matched: boolean;
  conclusive: boolean;
  detail: string | null;
}

/** Perfil del postulante: GET /candidate-profiles/me. */
export interface CandidateProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string | null;
  birthDate: string; // yyyy-MM-dd
  phone: string;
  district: string;
  yearsOfExperience: number;
  verifiedCertificationCount: number;
  certifications: Certification[];
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de PUT /candidate-profiles/{id}. El documento no se puede cambiar. */
export interface UpdateCandidateProfileRequest {
  firstName: string;
  lastName: string;
  birthDate: string; // yyyy-MM-dd
  phone: string;
  district: string;
  yearsOfExperience: number;
  email: string | null;
}

export type CompanySize = 'MICRO' | 'PEQUENA' | 'MEDIANA' | 'GRANDE';

/** Perfil de la empresa: GET /company-profiles/me. */
export interface CompanyProfile {
  id: number;
  userId: number;
  legalName: string;
  tradeName: string;
  industry: string;
  ruc: string;
  companySize: CompanySize;
  district: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de PUT /company-profiles/{id}. El RUC no se puede cambiar. */
export interface UpdateCompanyProfileRequest {
  legalName: string;
  tradeName: string;
  industry: string;
  companySize: CompanySize;
  district: string;
  email: string | null;
}
