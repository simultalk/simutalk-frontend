// Modelos para el registro de cuentas en el contexto IAM.

// US: Registro de empresa
export interface CompanyRegisterRequest {
  businessName: string; // razón social
  ruc: string; // RUC (11 dígitos)
  corporateEmail: string; // correo corporativo
  password: string;
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
