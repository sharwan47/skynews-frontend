import { HttpClient } from "@angular/common/http";
import { HttpHeaders } from '@angular/common/http';
import { NgxSpinnerService } from "ngx-spinner";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { DateTime } from 'luxon';


@Injectable({
  providedIn: "root",
})
export class DataService {
  constructor(private http: HttpClient,private spinner: NgxSpinnerService,) {}

  getStudios() {
    return this.http.get(`/api/resources_lookup`, {
      params: { type: "STUDIO" },
    });
  }

  getControlRooms() {
    return this.http.get(`/api/resources_lookup`, {
      params: { type: "CONTROL_ROOM" },
    });
  }

  getChannels() {
    return this.http.get(`/api/channels_lookup`);
  }


  updateAppVersion() {
    return this.http.get(`/api/update-app-version`);
  }

  updateSchema() {
    return this.http.get(`/api/update-user-schema`);
  }

  getShootTypes() {
    return this.http.get(`/api/shoot-types`);
  }
  
  getUserPreferences() {
    
    return this.http.get(`/api/users/one`);
  }
  
  sendSupportTicketData(formData:any): Observable<any> {
    
    return this.http.post(`/api/support-ticket-data`, formData);
  }
  
  getResourceName(resourceId:any) {
   
    const requestData = { resourceId: resourceId };
      return this.http.post(`/api/get-resource-name`,requestData);
    }

  sendBugReport(formData:any): Observable<any> {
  
    return this.http.post(`/api/submit-bug`, formData);
  }

  getVersion(): Observable<any> {
    return this.http.get<any>(`/api/get-version`);
  }

  upu(data: any, updateField: string) {
    return this.http.post("/api/users/update/preferences", {
      data,
      updateField,
    });
  }

  updateUserProfile(id: any, data: any) {
    return this.http.post("/api/users/profile-image", data, { params: { id } });
  }

  getUserTimeZone() {
    const now = DateTime.now();
    return now.zoneName; // Get the IANA time zone name
  }
}
