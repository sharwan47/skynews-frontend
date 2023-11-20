import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { CdkStepperModule } from '@angular/cdk/stepper'
import { NgStepperModule } from 'angular-ng-stepper'
import { NgxSpinnerService } from "ngx-spinner";
import { environment } from 'src/environments/environment'
import { SpinnerInterceptor } from 'spinner.interceptor';


// for HttpClient import:
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client'

// for Router import:
import { LoadingBarRouterModule } from '@ngx-loading-bar/router'

// import ngx-translate and the http loader
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import {
  HttpClient,
  HttpClientModule,
  HTTP_INTERCEPTORS,
} from '@angular/common/http'

// required for AOT compilation
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http)
}

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { NgbModule, NgbTimeAdapter } from '@ng-bootstrap/ng-bootstrap'
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component'
import { HomeComponent } from './home/home.component'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { ToastrModule, ToastNoAnimationModule } from 'ngx-toastr'
import { SharedModule } from './shared/shared.module'
import { CoreModule } from './core/core.module'
import { RequestComponent } from './request/request.component'
import { NgSelectModule } from '@ng-select/ng-select'
import { NgxSpinnerModule } from 'ngx-spinner'
import { ProfileComponent } from './profile/profile.component'
import { EditRequestComponent } from './request/edit-request/edit-request.component'
import { AuthInterceptorProvider } from './core/_interceptor/auth.interceptor'
import { NgbTimeStringAdapter } from './core/_helper/NgbTimeStringAdapter'
import { RequestAvailabilityComponent } from './request/request-availability/request-availability.component'
import { AuthGuard } from './core/_guards/auth.guard'
import { WebSocketService } from './core/_services/web-socket.service';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { DatePipe } from '@angular/common';





// import { OktaAuthModule, OKTA_CONFIG } from '@okta/okta-angular'
// import { OktaAuth } from '@okta/okta-auth-js';

// const oktaConfig = {
//   issuer: 'https://{yourOktaDomain}/oauth2/default',
//   clientId: '{clientId}',
//   redirectUri: window.location.origin + '/callback'
// };

// const oktaAuth = new OktaAuth({
//   issuer: `https://${environment.oktaDomain}/oauth2/default`,
//   clientId: environment.oktaClientId,
//   redirectUri: window.location.origin + '/login/callback',
// })

// const config: SocketIoConfig = {
//   url: 'ws://localhost:3000', // Use ws:// for WebSocket
//   options: {
//     transports: ['websocket'] // Specify WebSocket transport
//   }
// };




@NgModule({
  declarations: [
    AppComponent,
    MainLayoutComponent,
    HomeComponent,
    RequestComponent,
    ProfileComponent,
    EditRequestComponent,
    RequestAvailabilityComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    SharedModule,
    FormsModule,
    CoreModule,
    // SocketIoModule.forRoot(config),
    NgxSpinnerModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    // LoadingBarHttpClientModule,
    // LoadingBarRouterModule,
    // NgxSpinnerModule,
    HttpClientModule,
    CdkStepperModule,
    NgStepperModule,
    NgSelectModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    ToastrModule.forRoot(),
    ToastNoAnimationModule.forRoot(),
    CoreModule,
    // OktaAuthModule,
  ],
  providers: [
    AuthInterceptorProvider,
    // WebSocketService,
    DatePipe,
    { provide: NgbTimeAdapter, useClass: NgbTimeStringAdapter },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SpinnerInterceptor,
      multi: true,
    },
    // AuthGuard,
    // { provide: OKTA_CONFIG, useValue: { oktaAuth } },
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
