import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { NgxSpinnerService } from 'ngx-spinner';
import { delay, finalize } from 'rxjs/operators';


@Injectable()
export class SpinnerInterceptor implements HttpInterceptor {
    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private spinner: NgxSpinnerService
      ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    // this.route.url.subscribe(url => {
    //   console.log(url); // This will show the current URL
    // });


    const currentRoute = this.router.url;
    
// console.log(currentRoute)
  
   

    // if (currentRoute ==='/admin/resources' ) {
    //   // Don't show the spinner for /calendar route
    //   this.spinner.show();
    //   return next.handle(request).pipe(
    //     delay(1000),
    //     finalize(() => {
    //       this.spinner.hide();
    //     })
    //   );
    // }

    if ( currentRoute === '/calendar' || currentRoute ==='/admin/resources' 
      || currentRoute === 'request/edit' || currentRoute === '/approvals?type=pending'
      || currentRoute === '/approvals?type=approved' || currentRoute === '/approvals?type=rejected' ) {
      // Don't show the spinner for /calendar route

      return next.handle(request).pipe(
        finalize(() => {
         
        })
      );
    }


    this.spinner.show();

    return next.handle(request).pipe(
        delay(500),
      finalize(() => {
        this.spinner.hide();
      })
    );
  }
}
