import { Component, ViewChild, TemplateRef, OnInit } from '@angular/core';
import { AfterViewInit } from "@angular/core";
import { NgxSpinnerService } from "ngx-spinner";
import { ActivatedRoute, Router } from "@angular/router";
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../core/_services/data.service'
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { environment } from './../../../environments/environment.prod';


//@ts-ignore
import { v4 as uuid } from "uuid";


import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormGroupDirective,
  ValidationErrors,
  Validators,
} from "@angular/forms";
@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {

  @ViewChild("submitModal") submitModal!: TemplateRef<any>;
  @ViewChild("formRef") formRef!: FormGroupDirective;
  modaleRef!: NgbModalRef;
  requestForm!: FormGroup;
  attachment!: any;
  attachmentSet = false;
  attachmentName = "Add attachment";
  uuid!: any;
   // Declare the property to store the data URL
   selectedFileDataURL: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private spinner: NgxSpinnerService,
    private route: ActivatedRoute,
    private modal: NgbModal,
    private httpClient: HttpClient,
    private dataService: DataService,
  ) { }

  updateFormControl(formControl: AbstractControl | null, required = false) {
    if (required) {
      formControl?.addValidators([Validators.required]);
    } else {
      formControl?.clearValidators();
      // formControl?.setValue(null);
    }
    formControl?.updateValueAndValidity();
    return formControl;
  }

  changeControlValidation(
    formGroup: AbstractControl,
    controlNames: string[],
    required = false
  ) {
    controlNames.forEach((controlName) => {
      /**
       * Check if the form control is form array
       * if yes the get the control names and call this function recursively for them
       */
      if (formGroup.get(controlName) instanceof FormArray) {
        const controls = (formGroup.get(controlName) as FormArray).controls;
        // controls are also new form groups
        controls.forEach((cName) => {
          const formControls = Object.keys((cName as FormGroup).controls);
          this.changeControlValidation(cName, formControls, required);
        });
      } else {
        // Skip the type formcontrol of participants array as it is readonly
        if (controlName != "type") {
          this.updateFormControl(formGroup.get(controlName), required);
        }
      }
      formGroup.get(controlName)?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    

  }

  initializeForm() {
    this.requestForm = this.fb.group(
      {
        details: ["", [Validators.required]],
        subject: ["", [Validators.required]],
        ticketType: ['', Validators.required], // Ticket Type
        related_menu: ['', Validators.required], // Related Menu Tab
        relatedArea: null, // Related Area Tab
        attachment: null
      }
    );
  }

  removeAttachment(event: any) {
    this.attachment = null;
    this.requestForm.get("attachment")?.setValue(null);
    this.attachmentName = "Add attachment";
    this.attachmentSet = false;
  }

  onAttachmentSelected(event: any) {
    
    if (event.target.files && event.target.files[0]) {

      const reader = new FileReader();
      this.attachment = event.target.files[0];
      reader.readAsDataURL(event.target.files[0]); // read file as data url
     
      this.attachmentName = this.attachment.name;        
      reader.onload = (e) => {
        
      // Check if e.target.result is not null before using it
      if (e.target && e.target.result) {
        const dataURL = e.target.result as string;
        
        // Store the data URL in the property
        this.selectedFileDataURL = dataURL;
      }
  
      // Set a flag indicating that the attachment is set
      this.attachmentSet = true;
      // this.upload();
      
      };

      // reader.readAsDataURL(this.attachment);

    } else {
      this.attachmentName = "Add attachment";
    }
  }

  uploadAttachment(cardId:any){

    let formData = new FormData();

  formData.append("token", environment.trelloTokenKey);
  formData.append("key", environment.trelloApiKey);
  formData.append("file",this.attachment);

  let url="https://api.trello.com/1/cards/" + cardId + "/attachments";

  let request = new XMLHttpRequest();
  request.open("POST",url );
  request.send(formData);
}

  formSubmit() {

    const formData = new FormData();
    formData.append('details', this.requestForm.get('details')?.value);
    formData.append('caseId', this.uuid);
    formData.append('subject', this.requestForm.get('subject')?.value);
    formData.append('ticketType', this.requestForm.get('ticketType')?.value);
    formData.append('related_menu', this.requestForm.get('related_menu')?.value);
    formData.append('relatedArea', this.requestForm.get('relatedArea')?.value);
    

          if (this.attachmentSet) {
        // Attach the data URL to the formData
        formData.append('file', this.attachment);
      }


      this.dataService.sendSupportTicketData(formData).subscribe({
        next: (res: any) => {
          // Handle success (e.g., show a success message)
       
          // if (res && res.cardId) {
          //   // If the response contains a cardId, call uploadAttachment function
          //   this.uploadAttachment(res.cardId);
          // }
        },
        error: (err: any) => {},
      });

  }

  showModal() {
    this.uuid = uuid();
    this.modaleRef = this.modal.open(this.submitModal, {
      backdrop: "static",
      size: "lg",
      keyboard: true,
    });
  }
}
