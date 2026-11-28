import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Lee data.roles de la ruta y lo compara con los roles del usuario.
 * Si la ruta no declara roles, cualquier usuario con sesión puede entrar.
 * Si no tiene el rol, lo manda a la página 403 (/forbidden).
 */
export const roleGuard: CanActivateChildFn = (childRoute) => {
  const roles = childRoute.data['roles'] as string[] | undefined;
  if (!roles || roles.length === 0) {
    return true;
  }
  const auth = inject(AuthService);
  return auth.hasAnyRole(roles) ? true : inject(Router).createUrlTree(['/forbidden']);
};
