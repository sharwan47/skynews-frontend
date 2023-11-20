import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class DashboardService {
  constructor(private http: HttpClient) {}

  getResources() {
    return this.http.get("/api/resources_lookup");
  }

  getAllChannel() {
    return this.http.get("/api/get-all-channel");
  }

  getAllShootType() {
    return this.http.get("/api/get-all-shootType");
  }

  getAllControlRoom() {
    return this.http.get("/api/get-all-controlRoom");
  }

  getLocations() {
    return this.http.get("/api/resources-location");
  }

  // fetchEvents(params: any) {
   
  //   return this.http.get("/api/dashboard/events", {
  //     params,
  //   });
  // }

  fetchEvents(params: any) {
    // Generate a unique timestamp as the cache buster
    const cacheBuster = new Date().getTime();
  
    // Create an instance of HttpParams and add the cache-busting parameter
    let httpParams = new HttpParams().set('_', cacheBuster.toString());
  
    // Append any additional parameters from the 'params' object if needed
    if (params) {
      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          httpParams = httpParams.append(key, params[key]);
        }
      }
    }
  
    // Construct the URL with the query parameters
    const url = '/api/dashboard/events';
  console.log("Api Request is made to backend")
    // Make the HTTP request with the updated URL and parameters
    return this.http.get(url, { params: httpParams });
  }

  getOneRequest(id: any) {
    return this.http.get("/api/requests/one", {
      params: {
        id,
      },
    });
  }
}
