import { Component, Inject, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
// import { OktaAuthStateService, OKTA_AUTH } from '@okta/okta-angular';
// import OktaAuth, { AuthState } from '@okta/okta-auth-js';
import { filter, map } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';

import {  of } from 'rxjs'; // Import the 'of' function
import { Globals } from 'src/app/core/_helper/globals';
import { AuthService } from 'src/app/core/_services/auth.service';
import { DataService } from 'src/app/core/_services/data.service';
import { staticUser } from 'static-user'; 
declare const Pusher: any;
import { environment } from "src/environments/environment";
import { ChangeDetectorRef } from '@angular/core';


import { Subscription } from "rxjs";
// import { WebSocketService } from './../../core/_services/web-socket.service';


@Component({
	selector: 'app-navbar',
	templateUrl: './navbar.component.html',
	styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
	userName = '';
	upgradeVersion:boolean=false;
	updateSchemaBtn:boolean= false;
	// userTimeZone: any;
	userAuthorities: string[] = [];
	subscriptions = new Subscription();
	public name$!: Observable<string>;

	constructor(private authService: AuthService,
		        private cdRef: ChangeDetectorRef,
				// private webSocketService: WebSocketService,
				private dataService: DataService,
				private globals: Globals,
				
		// private _oktaAuthStateService: OktaAuthStateService,
		// @Inject(OKTA_AUTH) private _oktaAuth: OktaAuth

		
		) { }

	ngOnInit(): void {

	// 	if(this.globals.principal.credentials.id == "00uyefgou36tizRaE0x7"  ){
	// 		this.updateSchemaBtn= true;
	// 	}
	// 	this.updateSchemaBtn= true;
	
		// console.log( Intl.DateTimeFormat().resolvedOptions().timeZone);

		// this.userTimeZone = this.dataService.getUserTimeZone();

		// console.log(this.userTimeZone)
	  
		this.listenToNewRequests();
	// 	this.webSocketService.connectToWebSocketServer();

	// 	    // Listen for 'userIDs' messages
	// 		this.webSocketService.listenForUserIDs().subscribe((userIDs:any) => {
				
	// 			console.log(userIDs)

	// 			const userId=this.globals.principal.credentials.id;
    //         // console.log(data.data)
	// 	     	if(userIDs.data.includes(userId)){
	// 			console.log("Upgrade the Version")
	// 			this.upgradeVersion=true;
	// }
	// 			// Update your UI with the received user IDs as needed
	// 		  });
		
		
		// this.name$ = this._oktaAuthStateService.authState$.pipe(
		// 	filter((authState: AuthState) => !!authState && !!authState.isAuthenticated),
		// 	map((authState: AuthState) => authState.idToken?.claims.name ?? '')
		// );

		// this.authService.userCredentials$.subscribe(data => {
		// 	if(data) {
		// 		this.userName = data.credentials?.firstName + ' ' + data.credentials?.lastName;
		// 	} else {
		// 		this.userName = '';
		// 	}
		// })

		// this.authService.userCredentials$.subscribe(data => {
		// 	if (data) {
		// 	  this.userName = data.credentials?.firstName + ' ' + data.credentials?.lastName;
		// 	} else {
		// 	  this.userName = '';
		// 	}
		//   });

		this.userName = staticUser.user.name;
		this.name$=of(staticUser.user.name);

		this.authService.authorities$.subscribe({
			next: (authorities: any) => {
			  this.userAuthorities = authorities;
			  console.log(authorities);
			},
			error: (error:any) => {
			  console.error('Error fetching user authorities:', error);
			}
		  });
		  

	}

	checkAuthority(authority: string): boolean {
		return this.userAuthorities.includes(authority);
	  }

	listenToNewRequests() {
		// Enable pusher logging - don't include this in production
		Pusher.logToConsole = false;
	
		var pusher = new Pusher(environment.pusherId, {
		  cluster: "ap4",
		});
	
		var channel = pusher.subscribe("skynews");
	
		channel.bind("authority-updated", (data: any) => {
			console.log("User updating")
		  this.authService.updateUserAuthority();
		 

		//   setTimeout(() => {
			
		// 	  this.cdRef.detectChanges()
		//   }, 5000);
		  // console.log(this.globals.)
		  
		 })
	 
	
		this.subscriptions.add(channel);
	  }
	


	  updateVersion() {
		let userId = this.globals.principal.credentials.id;
		
	  
		this.dataService.updateAppVersion().subscribe({
		  next: (data: any) => {
			// Your code here to handle the data asynchronously
			console.log(data);
			if(data.status == "success"){
				this.upgradeVersion=false;
				window.location.reload();
			}
		
			// You can perform any other operations with 'data' here
		  },
		  error: (error: any) => {
			// Handle any errors that may occur during the subscription
			console.error(error);
		  },
		  complete: () => {
			// Handle completion if needed
		  }
		});
	  }
	  updateUserSchema() {
		let userId = this.globals.principal.credentials.id;
		// this.webSocketService.consoleFunc();
		// return;
		this.dataService.updateSchema().subscribe({
		  next: (data: any) => {
			// Your code here to handle the data asynchronously
			console.log(data);
			if(data.status == "success"){
				
			}
		
			// You can perform any other operations with 'data' here
		  },
		  error: (error: any) => {
			// Handle any errors that may occur during the subscription
			console.error(error);
		  },
		  complete: () => {
			// Handle completion if needed
		  }
		});
	  }
	  


	logout() {
		this.authService.logout();
	}

	public async signOut(): Promise<void> {
		// await this._oktaAuth.signOut();
	}

}
