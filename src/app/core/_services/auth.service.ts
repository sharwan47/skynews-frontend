import { Injectable } from "@angular/core";
import { BehaviorSubject, of, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { ApiService } from "./api.service";
import { environment } from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Principal } from "../_models/principal";
import { Globals } from "../_helper/globals";
import { Router } from "@angular/router";
import { staticUser } from 'static-user';
declare const Pusher: any;
import { ChangeDetectorRef } from '@angular/core';

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this._isLoggedIn$.asObservable();

  private _userCredentials$ = new BehaviorSubject<any>(null);
  userCredentials$ = this._userCredentials$.asObservable();
  private authoritiesSubject = new BehaviorSubject<object[]>([]);
  public authorities$ = this.authoritiesSubject.asObservable();
  redirectUrl!: string;
  principal: Principal = new Principal([], {}, [], "", "", "");

  // oktaUserInfo: any = {};

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private globals: Globals,
    private router: Router
  ) {

       // Simulate a user being logged in on service initialization
       this._isLoggedIn$.next(true);
       this.saveConfig(staticUser);
      

  }

  // setOktaUserInfo(user: any) {
  //   this.oktaUserInfo = user;
  // }

  login(username: string, password: string) {
    return this.http
      .post(environment.apiUrl + "/api/login", { username, password })
      .pipe(
        tap((response: any) => {
          this._isLoggedIn$.next(true);
          this.saveConfig(response);
          localStorage.setItem("bm_auth", response.token);
        })
      );
  }

  // get token(): any {
  //   return localStorage.getItem("bm_auth");
  // }

  public saveConfig(response: any) {
   
    this.principal = new Principal(
      response.authorities,
      response.user,
      response.user,
      response.currentLang,
      response.preferedLang,
      response.user?.image
    );
    this.globals.principal = this.principal;
   
    this.globals.authenticated = true;
    this._userCredentials$.next(this.principal);
   

    this.updateAuthorities(response.authorities);

console.log(response)

    // localStorage.setItem('lang', response.currentLang);
  }

  getAuthorities() {
    return this.globals.principal.authorities;
  }

  hasAuthority(value: any) {
    return this.globals.principal.hasAuthority(value);
  }

  updateUserAuthority() {
    this.http.get(`/api/config`).pipe(
      tap((response: any) => {
        console.log("Updating");
        this.saveConfig(response);
      })
    ).subscribe(); // Add .subscribe() to trigger the HTTP request
  }

  updateAuthorities(authorities: any) {
    this.authoritiesSubject.next(authorities);
  }



  // getConfig() {
  //   return this.http.get(`/api/config`).pipe(
  //     tap((response: any) => {
  //       this._isLoggedIn$.next(true);
  //       this.saveConfig(response);
  //     })
  //   );
  // }

  // public isLoggedIn(): boolean {
  //   const user = this.getUserDetails();
  //   if (user) {
  //     return user.exp > Date.now() / 1000;
  //   } else {
  //     return false;
  //   }
  // }

  // public getUserDetails() {
  //   const token = this.token;
  //   let payload;
  //   if (token && token != "undefined") {
  //     payload = token.split(".")[1];
  //     payload = window.atob(payload);
  //     let p = JSON.parse(payload);

  //     return p;
  //   } else {
  //     return null;
  //   }
  // }

  public logout() {
    this.globals.principal = new Principal([], {}, [], "", "", "");
    localStorage.removeItem("bm_auth");
    this.router.navigate(["/login"]);
    this.globals.authenticated = false;
  }
}
