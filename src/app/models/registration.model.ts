// Modelos para el registro de cuentas en el contexto IAM.

// US-25: Registro de empresa
export type CompanySize = 'MICRO' | 'PEQUENA' | 'MEDIANA' | 'GRANDE';

export interface CompanyRegisterRequest {
  legalName: string; // razón social
  tradeName: string; // nombre comercial
  industry: string; // rubro
  ruc: string; // 11 dígitos, empieza en 10 o 20
  companySize: CompanySize;
  district: string;
  email: string; // también es el usuario para iniciar sesión
  password: string;
}

export interface CompanyProfileResponse {
  id: number;
  userId: number;
}

// US-26: Registro de postulante
export interface ApplicantRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentNumber: string;
  birthDate: string;
  district: string;
  yearsOfExperience: number;
  password: string;
}

export interface CandidateProfileResponse {
  id: number;
  userId: number;
}

// Respuesta genérica de un registro de cuenta
export interface AccountResponse {
  id: number;
  username: string;
}
