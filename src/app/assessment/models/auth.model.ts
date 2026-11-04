export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignInResponse {
  id: number;
  username: string;
  token: string;
}

export interface UserResponse {
  id: number;
  username: string;
  roles: string[];
}

export interface Session {
  id: number;
  username: string;
  token: string;
  roles: string[];
}
