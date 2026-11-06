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
