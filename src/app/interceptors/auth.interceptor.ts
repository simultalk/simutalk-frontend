import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApiCall = req.url.startsWith(environment.apiUrl);
  const isSignIn = req.url.includes('/authentication/');

  if (token && isApiCall && !req.headers.has('Authorization')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiCall && !isSignIn && auth.isLoggedIn()) {
        auth.signOut();
      }
      return throwError(() => error);
    })
  );
};
