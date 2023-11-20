import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, of } from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  constructor(private http: HttpClient) {}

  checkSlotAvailability(params: any, data: any = null, participantData:any = null) {

    const requestData={
      data:data,
      participantData:participantData
    }

    return this.http.post(`/api/requests/check-availability`, requestData, {
      params,
    })
  }

  findOne(requestId: any) {
    return this.http.get(`/api/requests/_one`, {
      params: {
        id: requestId,
      },
    })
  }

  saveRequest(data: any, eventType: any) {
    return this.http.post(`/api/requests/new`, data, {
      params: {
        type: eventType,
      },
    })
  }

  updateRequest(requestId: any, data: any) {
    return this.http.post(`/api/requests/update`, data, {
      params: { requestId: requestId },
    })
  }

  approveRequest(requestId: any) {
    return this.http.put('/api/requests/approve', null, {
      params: {
        request_id: requestId,
      },
    })
  }

  deleteRequest(requestId: any) {
    return this.http.put('/api/requests/delete', null, {
      params: {
        request_id: requestId,
      },
    })
  }

  rejectMultiRequest(requestIds: string[]) {
    return this.http.put('/api/requests/mass-delete', requestIds)
  }

  changeRequestStatus(
    requestId: any,
    requestStatus: any,
    userId: any,
    resourceIds: any,
    requestData: any,
    primaryResourceId: any,
    note = ''
  ) {
    const requestBody = {
      request_id: requestId,
      status_to_change: requestStatus,
      user_id: userId,
      resource_ids: resourceIds,
      primaryResourceId: primaryResourceId,
      note: note,
    };
  
    return this.http.put('/api/requests/change-status', { requestData }, {
      params: requestBody,
    });
  }

  

  changeMultiRequestStatus(requestIds: string[], requestedStatusChange: any) {
    return this.http.put('/api/requests/multi-change-status', {
      requestIds,
      requestedStatusChange,
    })
  }

  getResourceOwnersOfRequest(requestId: any) {
    return this.http.get('/api/requests/resource-owners', {
      params: {
        request_id: requestId,
      },
    })
  }
  downloadFile(filename: string) {
    return this.http.get('/api/downloadFile', {
      responseType: 'blob' as 'json',
      params: {
        name: filename,
      },
    })
  }

  getAutoApprovalStatus(resources:any): Observable<any> {
    
    return this.http.post(`/api/get-auto-approval-status`, resources);
  }

  getResourceOwners(resources:any): Observable<any> {
    
    return this.http.post(`/api/get-resource-owner`, resources);
  }

  getAllResource(guestData:any): Observable<any> {
    
    return this.http.post(`/api/get-all-resource`,guestData);
  }




}
