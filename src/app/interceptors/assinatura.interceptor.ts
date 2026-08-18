import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";

export const assinaturaInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((erro) => {
            if (erro.status === 402 && !router.url.startsWith('/assinatura')) {
                router.navigate(['/assinatura']);
            }
            return throwError(() => erro);
        })
    );
};
