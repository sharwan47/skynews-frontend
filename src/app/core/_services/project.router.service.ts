import { Injectable } from '@angular/core';
import { RequestFormData } from '../_models/request.form';

@Injectable({
  providedIn: 'root',
})

export class ProjectRouterService {
  requestCloneData?: RequestFormData;
  requestCloneId?: string;

  deleteRequestClone() {
    this.requestCloneId = undefined;
  }
}
