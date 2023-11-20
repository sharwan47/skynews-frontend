import {
  CdkStepper,
  CdkStepperNext,
  StepperSelectionEvent,
} from '@angular/cdk/stepper'

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core'
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormGroupDirective,
  ValidationErrors,
  Validators,
} from '@angular/forms'

import { map, Observable, of } from 'rxjs'

//@ts-ignore
import { v4 as uuid } from 'uuid'
import * as moment from 'moment'
import { ToastrService } from 'ngx-toastr'
import { NgxSpinnerService } from 'ngx-spinner'
import { ActivatedRoute, Router, TitleStrategy } from '@angular/router'
import { NgStepperComponent } from 'angular-ng-stepper'
import { NgbDate, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap'
import { DataService } from 'src/app/core/_services/data.service'
import { RequestService } from '../request.service'
import { ViewRequestComponent } from '../view-request/view-request.component'
import { Location } from '@angular/common'
import { environment } from 'src/environments/environment'
import { AdminService } from 'src/app/admin/admin.service'

@Component({
  selector: 'app-edit-request',
  templateUrl: './edit-request.component.html',
  styleUrls: ['./edit-request.component.scss'],
})
export class EditRequestComponent implements OnInit {
  @ViewChild('cdkStepper') stepper!: NgStepperComponent
  @ViewChild('formRef') formRef!: FormGroupDirective
  @ViewChild("RequestAutoApprovalStatus") RequestAutoApprovalStatus!: TemplateRef<any>;
  @ViewChild("ResourceOwnerShip") ResourceOwnerShip!: TemplateRef<any>;
  @ViewChild("GuestTimeRange") GuestTimeRange!: TemplateRef<any>;
  @ViewChild("FileSizeExceeded") FileSizeExceeded!: TemplateRef<any>;

  gRequestDetails!: any
  monthDays = Array(31)
    .fill(0)
    .map((x, i) => i)

  // ID of the request to edit
  requestId!: string | null
  pattern = ''

  studios$!: Observable<any>
  controlRooms$!: Observable<any>
  channels$!: Observable<any>
  shootTypes$!: Observable<any>
  resources$!: Observable<any>
  gShootTypes!: Array<any>
  gChannels!: Array<any>
  gStudios!: Array<any>
  resources!: any[]
  gControlRooms!: Array<any>
  allSlotsAvailable: boolean = false

  availableRequests: Array<any> = []
  availableSchedules: Array<any> = []
  recurrenceValue: Array<any> = []
  requestDates: Array<any> = []
  shootType=null;

  // gGuestLimit: number = 0;
  requestType = 'live'
  requestTypeGroupName = 'requestType'
  isAddGuestLimitArrived: boolean = false
  dateValidationMsg = ''
  liveresourcename = null;
  liveresourcetype = null;
  prerecordname = null;
  prerecordtype = null;
  cameramanname = null;
  cameramantype = null;

  // liveresourcename = ' '
  // liveresourcetype = ' '
  // prerecordname = ' '
  // prerecordtype = ' '
  // cameramanname = ' '
  // cameramantype = ' '
  isRecurringCollapsed = true
  liveguests: Array<any> = []
  livetext: Array<any> = []
  liveType: Array<any> = []
  liveStartTime: Array<any> = []
  liveEndTime: Array<any> = []
  preguests: Array<any> = []
  pretext: Array<any> = []
  preType: Array<any> = []
  preStartTime: Array<any> = []
  preEndTime: Array<any> = []
  previospage = 'live'
  requestTimeSlots: any = []
  requestSlotsEdited: boolean = false
  saveOnlyAvailable: boolean = false
  liveGuest = false
  preGuest = false
  processing: boolean = false
  resourceTypes: any[] = []
  retainFormControls = ['requestDateTime', 'startDateTime', 'endDateTime']
  resourceType!: any
  resourceName!: any
  glimitplaceflg = false
  // liveglimit = 1;
  // preglimit = 1;
  prelimitplaceflg = false
  bookingId: any ;
  cssClass:any;
  selectedRequest!: any
  requestObject!: any
  requestForm!: FormGroup
  // This is used to flag that the request is checked with the backend and no conflicting slots are available
  requestOk = false
  rangeLimit = 24
  showAsteriskElementHost: boolean = false;
  userTimeZone: any;
  resourceOwnerData: { [key: string]: string[] } = {};

  guestList:any=[];
  resourceList:any;
  fromValues: Date[] = []; // Store "From" values for each guest
  toValues: Date[] = [];   // Store "To" values for each guest
  validTimeslot:boolean=false;
  guestTimeNotAvailable:boolean=false;
  guestTimeSlots: any = []
  guestName:any;
  guestRequestDates: Array<any> = []
  liveParticipants: Array<any> = []
  preParticipants: Array<any> = []



  modaleRef!: NgbModalRef
  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private requestService: RequestService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private route: ActivatedRoute,
    private location: Location,
    private modal: NgbModal,
    private adminService: AdminService,
    private cdref: ChangeDetectorRef
  ) {}

  attachment!: any
  attachmentSet = false
  attachmentName = 'Add attachment'
  fileRemoved = false
  serverUrl = environment.serverUrl
  downloadAttachment = false

  requestDateTimeObj!: any
  resourceData:any=[];
  primaryTimeChanged:boolean=false;

  showInvalidMsg = false

  ngOnInit(): void {

    this.userTimeZone = this.dataService.getUserTimeZone();
    this.initializeForm()

    this.requestForm.get('fromDateTime')?.valueChanges.subscribe((value) => {
      this.requestForm.get('toDateTime')?.setValue(value)
    })

    this.requestForm.get('resourceType')?.valueChanges.subscribe((value) => {
      if (!value) return
      const selectedResourceType = this.resourceTypes.find(
        (item) => item._id === value
      )

      if (selectedResourceType?.type == 'STUDIO') {
        this.resources$ = this.adminService.getResourceByType(value)
        this.studios$.subscribe((data) => (this.gStudios = data))
      } else {
        this.resources$ = this.adminService.getResourceByType(value)
      }

      this.resources$.subscribe({
        next: (res: any) => {
          this.resources = res
          this.cdref.detectChanges()
        },
        error: (err: any) => {},
      })
    })
    this.route.paramMap.subscribe((params) => {
      this.requestId = params.get('id')
      if (this.requestId) {
        this.getRequiredData()
        this.getRequestDetails()
      } else {
        this.location.back()
      }
    })

          // Subscribe to value changes for startDateTime
          this.requestForm?.get('startDateTime')?.valueChanges.subscribe((value) => {
         
            this.primaryTimeChanged=true;
            // this.resetTimeForParticipant()
          });
      
          // Subscribe to value changes for endDateTime
          this.requestForm?.get('endDateTime')?.valueChanges.subscribe((value) => {
            // this.resetTimeForParticipant()
            this.primaryTimeChanged=true;
          });
  }

  ngAfterViewInit() {
    // this.requestForm?.get('startDateTime')?.valueChanges.subscribe((value) => {
          
    //   this.primaryTimeChanged=true;
    //   // console.log("Function runned")
      
    // });

    // // Subscribe to value changes for endDateTime
    // this.requestForm?.get('endDateTime')?.valueChanges.subscribe((value) => {
  
    //   this.primaryTimeChanged=true;
    // });
  }



  initializeForm() {
    this.requestForm = this.fb.group(
      {
        fromDateTime: ['', [Validators.required]],
        toDateTime: ['', [Validators.required]],
        startDateTime: ['', [Validators.required]],
        endDateTime: ['', [Validators.required]],
        channel: [null, [Validators.required]],
        resourceName: [null, [Validators.required]],
        resourceType: [null, [Validators.required]],
        name: '',
        program: '',
        contactInformation: '',
        details: ['', [Validators.required]],
        attachment: null,
        participants: new FormArray([]),
        shootType: null,
      },
      { validator: this.validateDate.bind(this) }
    )

    this.addGuest('host')
    this.addGuest('guest')
  }

  resetTimeForParticipant(){    

    const startDateTime = this.requestForm.get('startDateTime')?.value;
      const endDateTime = this.requestForm.get('endDateTime')?.value;
      const participants = this.requestForm.get('participants') as FormArray;
      // console.log(this.requestForm)
      // console.log(participants.length)


      for (let i = 0; i < participants.length; i++) {
              console.log(startDateTime)
      console.log(endDateTime)
        participants.at(i).get('startTime')?.setValue(startDateTime);
        participants.at(i).get('endTime')?.setValue(endDateTime);

        console.log(participants)
      
      }
     
  }


  

  addShooType(item: any) {
    const newShootType = { _id: 11111, name: item, tag: true, new: true }
    this.gShootTypes.push(newShootType)
    return newShootType
  }

  patchForm(data: any) {
    const request = data
    if (request.requestType == 'live') {
      this.liveresourcetype = request.resourceTypeId
      this.liveresourcename = request.resourceId?._id

      if (request.resourceType == 'studio') {
        // this.liveglimit = this.gStudios.find((item) => item._id === this.gRequestDetails.participants[0]?.studio._id)?.guestLimit ?? 1;
        this.prelimitplaceflg = false
      } else {
        // this.liveglimit = request.guestLimit;
      }
    } else if (request.requestType == 'prerecorded') {
      this.prerecordname = request.controlRoom._id
      this.prerecordtype = request.resourceTypeId

      if (request.resourceType != 'Studio') {
        // this.preglimit = this.gStudios?.find((item) => item._id === this.gRequestDetails.participants[0]?.studio._id)?.guestLimit ?? 1;
        this.prelimitplaceflg = false
      } else {
        // this.preglimit = request.guestLimit;
      }
    } else {
      this.cameramantype = request.resourceTypeId
      this.cameramanname = request.resourceId._id
      this.shootType = request.shootType._id
    }

    this.requestForm.get('resourceType')?.setValue(this.cameramantype)
    this.requestForm.get('resourceName')?.setValue(this.cameramanname)
    this.requestForm.get('shootType')?.setValue(this.shootType)
    this.requestType = request.requestType
    this.changeRequestType(request.requestType)

    const fromDate = new Date(request.startDateTime)
    const toDate = new Date(request.endDateTime)
    const fromNgbDate = {
      year: fromDate.getFullYear(),
      month: fromDate.getMonth() + 1,
      day: fromDate.getDate(),
    }
    const toNgbDate = {
      year: toDate.getFullYear(),
      month: toDate.getMonth() + 1,
      day: toDate.getDate(),
    }

    this.requestForm.patchValue({
      fromDateTime: fromNgbDate,
      toDateTime: toNgbDate,
      startDateTime: moment(request.startDateTime).format('HH:mm'),
      endDateTime: moment(request.endDateTime).format('HH:mm'),
      channel: request.channel?._id,
      resourceType: request.resourceTypeId,
      resourceName:
        this.requestType === 'prerecorded'
          ? request.controlRoom?._id
          : request.resourceId?._id,
      name: request.name,
      program: request.program,
      contactInformation: request.contactInformation,
      details: request.details,
      //   attachment: request.attachment,
    })

    if (request.attachment) {
      this.attachmentName = request.attachment
      this.attachmentSet = true
      this.downloadAttachment = true
    }

    if (request.participants && request.participants.length) {

      const hostIndex = request.participants.findIndex((p:any) => p.type === 'host');

      if (hostIndex === -1) {
        // "host" is not present, so add it as null
        request.participants.unshift({
          studio: null,
          name: '',
          type: 'host',
          startTime: null,
          endTime: null,
        });
      }

      
      this.resetFormArray()
      request.participants.forEach((p: any) => {
        this.addGuest(p?.type, p.studio?._id, p?.name , p?.startTime , p?.endTime)
      })
    }
    this.primaryTimeChanged=false;
  }

  isStudio() {
    const resouceTypeId = this.requestForm.get('resourceType')?.value
    const selectedResourceType = this.resourceTypes.find(
      (item) => item._id === resouceTypeId
    )

    if (selectedResourceType?.type === 'STUDIO') {
      ;(this.requestForm.controls['participants'] as FormArray).value.type =
        'guest'
      return true
    } else {
      ;(this.requestForm.controls['participants'] as FormArray).value.type =
        'host'
      return false
    }
  }

  isGuestSelected(index: number): boolean {
    const studioControl = (this.requestForm.get('participants') as FormArray).at(index).get('studio');
    return Boolean(studioControl && studioControl.value);
  }

  handleParticipantStudioChange(e: any, i: number) {
    const nameControl = (this.requestForm.get('participants') as FormArray).controls[i].get('name');
    if (
      !Boolean(
        (this.requestForm.get('participants') as FormArray).controls[i].value
          .studio
      )
    ) {
      ; (this.requestForm.get('participants') as FormArray).controls[i].setValue(
        {
          studio: null,
          name: '',
          type: 'guest',
          startTime:null,
          endTime:null,
        }
      );

       
      nameControl?.clearValidators();
      nameControl?.updateValueAndValidity();
    
    } else {
      ; (this.requestForm.get('participants') as FormArray)
        .at(i)
        .get('name')
        ?.setValidators([Validators.required]);

        (this.requestForm.get('participants') as FormArray)
        .at(i)
        .get('name')
        ?.updateValueAndValidity();
        
    }
  }

  validateDate(group: AbstractControl): ValidationErrors | null {
    // here we have the 'requestForm' group
    const fromDateTime = group.get('fromDateTime')?.value
    const toDateTime = group.get('toDateTime')?.value
    const startTime = group.get('startDateTime')?.value
    const endTime = group.get('endDateTime')?.value
    if (!fromDateTime || !toDateTime || !startTime || !endTime) {
      return null
    }
    return this.validTimeSlot(fromDateTime, toDateTime, startTime, endTime)
      ? null
      : { previousDate: true }
  }

  // disable dates before current date
  isDisabled = (date: NgbDate) => {
    const currentDate = new Date()
    return (
      date.before({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        day: currentDate.getDate(),
      }) || false
    )
  }

  showResourceOwnerShipModal(){

    const resourceId=[];
    this.resourceOwnerData = {};

   
    const resourceName=this.requestForm.get('resourceName')?.value;
    const participants=this.requestForm.get('participants')?.value;
   

    if(!resourceName && participants.every((participant:any) => !participant.studio)){
    
      return;
    }

    resourceId.push(resourceName);

    if (Array.isArray(participants)) {
      // Loop through the participants and push the 'studio' property into resourceId
      participants.forEach(participant => {
        if (participant.studio) {
          resourceId.push(participant.studio);
        }
      });
    }

    const requestObject = {
      resourceId: resourceId,     
    };

    this.requestService.getResourceOwners(requestObject).subscribe({
      next: (data: any) => {
        this.resourceOwnerData = data.resourceOwnerData; // Store the data in the component variable
      },
      error: (err:any) => {
        console.log(err);
      },
    });



    this.modaleRef = this.modal.open(this.ResourceOwnerShip, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
      windowClass: 'custom-modal-auto'
    });
  }

  showResourceModal(){

    const resourceId=[];
    const bookingData=[];
    this.resourceData=[];

   

    const startDateTime=this.requestForm.get('startDateTime')?.value;
    const endDateTime=this.requestForm.get('endDateTime')?.value;
    const resourceName=this.requestForm.get('resourceName')?.value;
    const participants=this.requestForm.get('participants')?.value;

    console.log(participants)


    let StartDateTime:any;
    let EndDateTime:any;


   if(!resourceName && participants.every((participant:any) => !participant.studio)){
   
     return;
   }

   if (this.isISODateFormat(startDateTime) || this.isISODateFormat(endDateTime)) {
    ({ StartDateTime, EndDateTime } = this.getHourAndMinutes(startDateTime, endDateTime));
  } else {
    StartDateTime = startDateTime;
    EndDateTime = endDateTime;
  }
  

   bookingData.push({

    resourceId: resourceName,
    type:"main",
    startDateTime: StartDateTime.trim() === '' ? null : StartDateTime,
    endDateTime: EndDateTime.trim() === '' ? null : EndDateTime

   })

    resourceId.push(resourceName);

    if (Array.isArray(participants)) {
      // Loop through the participants and push the 'studio' property into resourceId
      participants.forEach(participant => {
        if (participant.studio) {

          if (this.isISODateFormat(participant.startTime) || this.isISODateFormat(participant.endTime)) {
            ({ StartDateTime, EndDateTime } = this.getHourAndMinutes(participant.startTime, participant.endTime));
          } else {
            StartDateTime = participant.startTime?participant.startTime:startDateTime;
            EndDateTime = participant.endTime?participant.endTime:endDateTime;
          }

          bookingData.push({

            resourceId: participant.studio,
            type:participant.type,
            startDateTime: StartDateTime.trim() === '' ? null : StartDateTime,
            endDateTime: EndDateTime.trim() === '' ? null : EndDateTime
        
           })

          resourceId.push(participant.studio);
        }
      });
    }

    const requestObject = {
      resourceId: resourceId,
      startDateTime: startDateTime.trim() === '' ? null : startDateTime,
      endDateTime: endDateTime.trim() === '' ? null : endDateTime
    };

    this.requestService.getAutoApprovalStatus(bookingData).subscribe({
      next:async (data: any) => {

   console.log(data)

    this.resourceData=data;

      },
      error: (err:any) => {

        
      },
    });

    

    this.modaleRef = this.modal.open(this.RequestAutoApprovalStatus, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
      // windowClass: 'custom-modal-auto'
    });
  }



  closeModal(){
    this.modaleRef.close();
  }


  getRequestDetails() {
    this.requestService.findOne(this.requestId).subscribe((data: any) => {
      this.gRequestDetails = data.request

     

      this.bookingId=data.request.bookingId
      if(data.request.status == "pending"){
 
        this.cssClass="pendingRequest"

      }
      if(data.request.status == "approved"){
 
        this.cssClass="approvedRequest"

      }
      if(data.request.status == "rejected"){
 
        this.cssClass="rejectedRequest"

      }


      // this.gGuestLimit = data.request?.resourceId?.guestLimit ?? 0;
      this.resources$ = this.adminService.getResourceByType(
        data.request.resourceTypeId
      )

      this.patchForm(this.gRequestDetails)

      this.resources$.subscribe({
        next: (res: any) => {
          this.resources = res
        },
        error: (err: any) => {},
      })
      this.getResourceTypes()
    })
  }

  getRequiredData() {
    this.studios$ = this.dataService.getStudios()
    this.studios$.subscribe((data) => (this.gStudios = data))
    this.controlRooms$ = this.dataService.getControlRooms()
    this.controlRooms$.subscribe((data) => (this.gControlRooms = data))
    this.channels$ = this.dataService.getChannels()
    this.channels$.subscribe((data) => (this.gChannels = data))
    this.shootTypes$ = this.dataService.getShootTypes()
    this.shootTypes$.subscribe((data) => (this.gShootTypes = data))
  }

  // Without this, angular will not recognize the participants formArray variable in the html *ngFor
  get participants() {
    return this.requestForm.controls['participants'] as FormArray
  }

  addParticipant(participantType = 'guest', studio = null, name = null ,startTime = null ,endTime = null) {
    // const validators = this.requestType == "prerecorded" || "live" ? [Validators.required] : [];
    return this.fb.group({
      studio: [studio],
      name: [name],
      type: participantType,
      startTime: startTime,
      endTime: endTime,
    })
  }

  changeRequestType(requestType: any) {

    this.fromValues = []; // Store "From" values for each guest
    this.toValues = []; 

    let requiredFields: string[] = []
    let optionalFields: string[] = []

    switch (requestType) {
      case 'live':
        requiredFields = ['channel', 'name', 'resourceType', 'resourceName']
        optionalFields = [
          'program',
          'shootType',
          'participants',
          'contactInformation',
        ]
        break
      case 'prerecorded':
        requiredFields = ['resourceType', 'name', 'resourceName']
        optionalFields = [
          'channel',
          'name',
          'program',
          'shootType',
          'participants',
          'contactInformation',
        ]
        break
      case 'remote':
        requiredFields = ['name', 'resourceType', 'resourceName']
        optionalFields = [
          'channel',
          'program',
          'shootType',
          'participants',
          'contactInformation',
        ]
        break
      case 'cameraman':
        requiredFields = ['name', 'resourceName', 'resourceType', 'shootType']
        optionalFields = [
          'channel',
          'resourceType',
          'resourceName',
          'program',
          'participants',
          'contactInformation',
        ]

        break
    }

    // Dynamically set fields validations based on the request type
    this.changeControlValidation(this.requestForm, requiredFields, true)
    this.changeControlValidation(this.requestForm, optionalFields, false)

    this.adminService.getResourceType(this.requestType).subscribe({
      next: (res: any) => {
        this.resourceTypes = res
        this.cdref.detectChanges()
      },
      error: (err: any) => {},
    })

    this.requestForm.updateValueAndValidity()

    

    if (requestType == 'live') {
      this.requestForm.get('resourceType')?.setValue(this.liveresourcetype)
      if (this.glimitplaceflg) {
        this.resources$ = this.dataService.getStudios()
      }
      this.requestForm.get('resourceName')?.setValue(this.liveresourcename)
      this.requestForm.get('resourceType')?.markAsPristine();      
      this.requestForm.get('resourceName')?.markAsPristine();
    }
    if (requestType == 'prerecorded') {
      this.requestForm.get('resourceType')?.setValue(this.prerecordtype)
      if (this.prelimitplaceflg) {
        this.resources$ = this.dataService.getStudios()
      }
      this.requestForm.get('resourceName')?.setValue(this.prerecordname)
      this.requestForm.get('resourceType')?.markAsPristine();      
      this.requestForm.get('resourceName')?.markAsPristine();
      
    }
    if (requestType == 'cameraman') {
      this.requestForm.get('resourceType')?.setValue(this.cameramantype)
      this.requestForm.get('resourceName')?.setValue(this.cameramanname)
      this.requestForm.get('resourceType')?.markAsPristine();      
      this.requestForm.get('resourceName')?.markAsPristine();
    }

    let formarray = this.requestForm.get('participants') as FormArray
    let value = ''
    let text = ''
    let type;
    let startTime;
    let endTime;

    if (this.previospage == 'live') {
      this.liveguests = []
      this.livetext = []
      this.liveType = []
      this.liveStartTime = []
      this.liveEndTime = []
    }

    if (this.previospage == 'prerecorded') {
      this.preguests = []
      this.pretext = []
      this.preType = []
      this.preStartTime = []
      this.preEndTime = []
    }


    for (let i = 0; i < formarray.length; i++) {
      value = formarray.at(i).get('studio')?.value

     
      if (value == null || value == ' ' || value == '') {
        this.isAddGuestLimitArrived = false
        break
      }
      text = formarray.at(i).get('name')?.value
      type = formarray.at(i).get('type')?.value
      startTime = formarray.at(i).get('startTime')?.value
      endTime = formarray.at(i).get('endTime')?.value
      if (this.previospage == 'live') {
        this.liveguests.push(value)
        this.livetext.push(text)
        this.liveType.push(type)
        this.liveStartTime.push(startTime)
        this.liveEndTime.push(endTime)
     
      }
      if (this.previospage == 'prerecorded') {
        this.preguests.push(value)
        this.pretext.push(text)
        this.preType.push(type)
        this.preStartTime.push(startTime)
        this.preEndTime.push(endTime)
      }
    }

 
   

    if (requestType == 'live') {
      this.requestType = 'live'
      this.getResourceTypes()
      // this.gGuestLimit = this.liveglimit;

      formarray = this.requestForm.get('participants') as FormArray

      let array = this.liveguests.filter(
        (value) => value !== '' && value !== null
      )
      if (!this.liveguests.length) {
        let flength = formarray.length
        for (let i = flength - 1; i > 0; i--) {
          formarray.removeAt(i)
        }
        formarray.at(0)?.get('studio')?.setValue(null)
        formarray.at(0)?.get('name')?.setValue(null)
        formarray.at(0)?.get('startTime')?.setValue(null)
        formarray.at(0)?.get('endTime')?.setValue(null)
        if (!this.glimitplaceflg) {
          formarray.insert(1, this.addParticipant())
        }
      } else {
        formarray = this.requestForm.get('participants') as FormArray
        let flength = formarray.length
        for (let i = flength - 1; i >= 0; i--) {
          ;(this.requestForm.get('participants') as FormArray).removeAt(i)
        }

        let i
        for (i = 0; i < this.liveguests.length; i++) {
          formarray.insert(
            i,
            this.addParticipant(this.liveType[i], this.liveguests[i], this.livetext[i], this.liveStartTime[i],this.liveEndTime[i])
          )
        }
      }

      // formarray.at(0)?.get("studio")?.setValidators([Validators.required]);
      // formarray.at(0)?.get("name")?.setValidators([Validators.required]);
      this.previospage = 'live'
      // if (formarray.length >= this.gGuestLimit) {
      //   this.isAddGuestLimitArrived = true;
      // } else {
      //   this.isAddGuestLimitArrived = false;
      // }
      // this.isAddGuestLimitArrived = this.liveGuest;
    }

    if (requestType == 'prerecorded') {
      formarray = this.requestForm.get('participants') as FormArray
      // this.gGuestLimit = this.preglimit;
      this.getResourceTypes()

      let array = this.preguests.filter(
        (value) => value !== '' && value !== null
      )
      this.preguests = array
      if (!this.preguests.length) {
        let flength = formarray.length
        for (let i = flength - 1; i > 0; i--) {
          formarray.removeAt(i)
        }
        formarray.at(0)?.get('studio')?.setValue(null)
        formarray.at(0)?.get('name')?.setValue(null)
        formarray.at(0)?.get('startTime')?.setValue(null)
        formarray.at(0)?.get('endTime')?.setValue(null)
        if (!this.isStudio()) {
          formarray.insert(1, this.addParticipant())
        }
      } else {
        formarray = this.requestForm.get('participants') as FormArray
        let flength = formarray.length
        for (let i = flength - 1; i >= 0; i--) {
          ;(this.requestForm.get('participants') as FormArray).removeAt(i)
        }
        let i
        for (i = 0; i < this.preguests.length; i++) {
          formarray.insert(
            i,
            this.addParticipant(this.preType[i], this.preguests[i], this.pretext[i],this.preStartTime[i],this.preEndTime[i])
          )
        }
      }

      // formarray.at(0)?.get("studio")?.setValidators([Validators.required]);
      // formarray.at(0)?.get("name")?.setValidators([Validators.required]);
      this.previospage = 'prerecorded'

      // if (formarray.length >= this.gGuestLimit) {
      //   this.isAddGuestLimitArrived = true;
      // } else {
      //   this.isAddGuestLimitArrived = false;
      // }
      // this.isAddGuestLimitArrived = this.preGuest;
    }
    

    if (requestType == 'cameraman') {
      this.requestType = 'cameraman'
      this.getResourceTypes()
      this.previospage = 'cameraman'
    }

    
    this.primaryTimeChanged=false;
  }

  resetFormArray() {
    while ((this.requestForm.get('participants') as FormArray).length !== 0) {
      ;(this.requestForm.get('participants') as FormArray).removeAt(0)
    }
  }

  getResourceTypes() {
    const response = this.adminService
      .getResourceType(this.requestType)
      .subscribe({
        next: (res: any) => {
          this.resourceTypes = res
          this.cdref.detectChanges()
        },
        error: (err: any) => {},
      })
  }

  getId(data: string) {
    return `${data.toUpperCase().replace(' ', '_')}`
  }

  handleHostStudioChange(e: any,i:any) {

    const nameControl = (this.requestForm.get('participants') as FormArray).controls[i].get('name');

    if (
      !Boolean(
        (this.requestForm.get('participants') as FormArray).controls[i].value
          .studio
      )
    ) {
      ; (this.requestForm.get('participants') as FormArray).controls[i].setValue(
        {
          studio: null,
          name: '',
          type: 'host',
          startTime: null,
          endTime: null,
        }
      );
     
      nameControl?.clearValidators();
      nameControl?.updateValueAndValidity();
      this.showAsteriskElementHost = false;
    } else {
      ; (this.requestForm.get('participants') as FormArray)
        .at(i)
        .get('name')
        ?.setValidators([Validators.required]);

        (this.requestForm.get('participants') as FormArray)
        .at(i)
        .get('name')
        ?.updateValueAndValidity();

        this.showAsteriskElementHost = true;
    }



    // const guestLimit = this.gStudios.find((item) => item._id === e._id)?.guestLimit ?? 0;

    if (this.isStudio()) {
      return
    } else {
      // if (this.requestType == "live") {
      // this.liveglimit = guestLimit;
      // } else if (this.requestType == "prerecorded") {
      // this.preglimit = guestLimit;
      // }
      // this.gGuestLimit = guestLimit;
      // let parties = this.requestForm.get("participants") as FormArray;
      // let i = parties.length;
      // (this.requestForm.get("participants") as FormArray).controls.splice(this.gGuestLimit + 1);
      // if (parties.length >= this.gGuestLimit) {
      //   this.isAddGuestLimitArrived = true;
      // } else {
      //   this.isAddGuestLimitArrived = false;
      // }
    }
  }

  addGuest(participantType = 'guest', studio = null, name = null , startTime=null, endTime=null) {
    ;(this.requestForm.controls['participants'] as FormArray).push(
      this.addParticipant(participantType, studio, name,startTime ,endTime)
    )

    // if (this.isStudio()) {
    //   if ((this.requestForm.get("participants") as FormArray).length >= this.gGuestLimit) {
    //     this.isAddGuestLimitArrived = true;
    //   } else {
    //     this.isAddGuestLimitArrived = false;
    //   }
    // } else {
    //   if ((this.requestForm.get("participants") as FormArray).length > this.gGuestLimit) {
    //     this.isAddGuestLimitArrived = true;
    //   } else {
    //     this.isAddGuestLimitArrived = false;
    //   }
    // }
  }

  removeGuest(index: any) {
    // this.isAddGuestLimitArrived = false;
    ;(this.requestForm.get('participants') as FormArray).removeAt(index)
  }

  onAttachmentSelected(event: any) {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader()
      this.attachment = event.target.files[0]
      reader.readAsDataURL(event.target.files[0]) // read file as data url

      const file = event.target.files[0];
         
      const fileSizeInBytes = file.size;
      
      const maxSizeInBytes =  1024 * 1024; // 10 MB in bytes
  
      if (fileSizeInBytes > maxSizeInBytes) {
        this.attachment=null;
        this.modaleRef = this.modal.open(this.FileSizeExceeded, {
          backdrop: "static",
          size: "sm",
          keyboard: false,
          windowClass: 'custom-modal'
  
        });
  
        return;
      }

      this.attachmentName = this.attachment.name

      reader.onload = (e) => {
        // called once readAsDataURL is completed
        this.attachmentSet = true
        this.fileRemoved = false
      }
    } else {
      this.attachmentName = 'Add attachment'
    }
  }

  removeAttachment(event: any) {
    this.fileRemoved = true
    this.attachment = null
    this.requestForm.get('attachment')?.setValue(null)
    this.attachmentName = 'Add attachment'
    this.attachmentSet = false
  }

  /**
   * This method dynamically applies the required validator on the controls of a form group
   * if the formcontrol is an array then it will iterate over its control and recursively set the validator on
   * the controls of that formgroup as well
   * @attention This method works on reference mode i.e. the objects passed are the actual objects and any changes
   * brought are mapped to the actual objects
   * @param formGroup AbstractFormControl passed to change its control validation
   * @param controlNames Names of the controls that are needed to be processed
   * @param required this flag determines whether to apply Required validator on the control or not
   */
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
        const controls = (formGroup.get(controlName) as FormArray).controls
        // controls are also new form groups
        controls.forEach((cName) => {
          const formControls = Object.keys((cName as FormGroup).controls)
          this.changeControlValidation(cName, formControls, required)
        })
      } else {
        // Skip the type formcontrol of participants array as it is readonly
        if (controlName != 'type') {
          this.updateFormControl(formGroup.get(controlName), required)
        }
      }

      formGroup.get(controlName)?.updateValueAndValidity()
    })
  }

  updateFormControl(formControl: AbstractControl | null, required = false) {
    if (required) {
      formControl?.addValidators([Validators.required])
    } else {
      formControl?.clearValidators()
      // formControl?.setValue(null);
    }
    formControl?.updateValueAndValidity()

    return formControl
  }

  /**
   * Form submission and validation
   */
  validTimeSlot(
    fromDateTimeString: any,
    toDateTimeString: any,
    startTimeString: any,
    endTimeString: any
  ) {
    let msg = ''
    let isValidFlg = true

    const fromDateTime = this._date(fromDateTimeString)
    const toDateTime = this._date(toDateTimeString)
    const startTime = startTimeString.split(':')
    const endTime = endTimeString.split(':')

    const startDateTime = new Date(fromDateTime)
    const endDateTime = new Date(toDateTime)

    startDateTime.setHours(startTime[0])
    startDateTime.setMinutes(startTime[1])

    endDateTime.setHours(endTime[0])
    endDateTime.setMinutes(endTime[1])

    if (
      startTimeString == endTimeString &&
      startDateTime.getDate() == endDateTime.getDate()
    ) {
      this.dateValidationMsg = 'Start time and end time cannot be the same'
      isValidFlg = false
    }

    // Check if the start of time slot is less then the end of time slot
    if (startDateTime > endDateTime) {
      this.dateValidationMsg = 'Start time must be earlier then end time'
      isValidFlg = false
    }

    if (startDateTime < new Date()) {
      this.dateValidationMsg =
        "Request date cannot be less then today's date and time"
      isValidFlg = false
    }

    if (endDateTime.getDate() - startDateTime.getDate() > 1) {
      this.toastr.warning(`The time range must be involved in 2 days`)
      isValidFlg = false
    }

    if (!(fromDateTime <= toDateTime)) {
      this.dateValidationMsg =
        'Request end date cannot be less then request start date'
      isValidFlg = false
    }

    return isValidFlg
  }

  calcHourDiff(date1: Date, date2: Date) {
    const diffInMs = date2.getTime() - date1.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    return diffInHours
  }

  _date(dateString: any) {
    return new Date(`${dateString.year}-${dateString.month}-${dateString.day}`)
  }

  selectionChanged(event: StepperSelectionEvent) {
    // Transition from first step to the next

    if (event.previouslySelectedIndex == 0 && !this.requestOk) {
      this.checkSlotAvailability()
    }
  }

  callNext() {
    this.stepper.next()
  }

  callPrevious() {
    this.stepper.steps.first.select()
  }

  formSubmit() {}

  goToFinalStep() {
    // @ts-ignore
    this.stepper.steps.last.interacted = false
    this.stepper.steps.last.editable = true
    // @ts-ignore
    this.stepper.selected.completed = true
    // @ts-ignore
    this.stepper.selected.editable = true

    // this.requestSlotsEdited = true;
    this.reviewRequest()
    this.callNext()
  }

  checkSlotAvailability() {
    this.processing = true
    const request = this.requestForm.getRawValue()

    const fromDateTime = this._date(request.fromDateTime)
    const toDateTime = this._date(request.toDateTime)
    const startTime = request.startDateTime?.split(':')
    const endTime = request.endDateTime?.split(':')

    const startDateTime = new Date(fromDateTime)
    const endDateTime = new Date(toDateTime)

    startDateTime.setHours(startTime[0])
    startDateTime.setMinutes(startTime[1])

    endDateTime.setHours(endTime[0])
    endDateTime.setMinutes(endTime[1])

    // Pass the request time, start and end to check the slots
    const params: any = {
      requestDateTime: fromDateTime,
      startDateTime,
      endDateTime,
      requestId: this.requestId,
      bookingId:this.gRequestDetails.bookingId
    }

    const requestDate = [
      {
        id: this.requestId,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
      },
    ]

    
    // return;

    // Handle multiple resource Ids in case a resource selected is not available or already booked
    const resourceIds: any[] = []

    resourceIds.push(request.resourceName)

    if (this.requestType == 'prerecorded' || this.requestType == 'live') {
      for (let i = 0; i < request.participants.length; i++) {
        if (request?.participants[i]?.studio ?? '') {
          resourceIds.push(request.participants[i].studio)
        }
      }
    }

    // if (this.requestType == 'live') {
    //   resourceIds.push(request.resourceName)
    // }

    params.resourceIds = resourceIds.join(',')

    // Only check slot availability for request types [live, prerecorded] as they have resourced id in the payload
    if (this.requestType == 'live' || this.requestType == 'prerecorded') {
      this.requestService
        .checkSlotAvailability(params, this.requestDates,this.guestRequestDates)
        // .pipe(
        //   map((d: any) => {
        //     const data = d[0];
        //     data.schedules = data.schedules.map((sc: any) => {
        //       sc.dateRange = `${moment(sc.startDateTime).format(
        //         "hh:mm A"
        //       )} to ${moment(sc.endDateTime).format("hh:mm A")}`;
        //       return sc;
        //     });

        //     data.requests = data.requests.map((sc: any) => {
        //       sc.dateRange = `${moment(sc.startDateTime).format(
        //         "hh:mm A"
        //       )} to ${moment(sc.endDateTime).format("hh:mm A")}`;
        //       return sc;
        //     });
        //     return data;
        //   })
        // )
        .subscribe((data:any) => {
          this.processing = false
          this.allSlotsAvailable = true

          this.requestSlotsEdited = false

          this.requestTimeSlots = data

          this.requestTimeSlots = data.filter((slot:any) => slot.request.type === 'primary');

       
          this.guestTimeSlots = data.filter((slot:any) => slot.request.type !== 'primary');

          for (let i = 0; i < data?.length; i++) {
            if (!data[i].isAvailable) {
              this.allSlotsAvailable = false;
             
            }

            this.availableRequests = data.filter((slot: any) => !slot.isAvailable).map((slot: any) => slot.requests[0]);

            // Add resrouceIds to the request object for passing it to the request-availability component
            data[i].resourceIds = params.resourceIds;
          }
        
     

          if (this.allSlotsAvailable) {
            this.reviewRequest()

            // Disable the second [availibility] step of the wizard as there are no conflicting requests
            // @ts-ignore
            this.stepper.selected.editable = true
            // @ts-ignore
            this.stepper.selected.completed = true

            // this.callNext()
            this.goToFinalStep();
          } else {
            this.callNext()
            this.requestObject = null //used to preview and hold the new request data

            // Disable the last step of the wizard as the request should not be saved with the current values
            // @ts-ignore
            this.stepper.steps.last.interacted = true
            this.stepper.steps.last.editable = false
            // @ts-ignore
            this.stepper.selected.completed = false
          }
        })
    } else {
      // this.requestOk = true;

      setTimeout(() => {
        this.requestTimeSlots = []
        this.requestDates.forEach((rd) => {
          this.requestTimeSlots.push({
            id: rd.id,
            request: rd,
            isAvailable: true,
            schedules: [],
            requests: [],
          })
        })
        this.reviewRequest()
        // Disable the second [availibility] step of the wizard as there are no conflicting requests
        // @ts-ignore
        this.stepper.selected.editable = true
        // @ts-ignore
        this.stepper.selected.completed = true

        // this.callNext();
        this.goToFinalStep();
      })
      // setTimeout(() => {
      //   this.reviewRequest();
      // });
    }
  }

  reviewRequest() {
    // To avoid copy by reference
    const data = JSON.parse(JSON.stringify(this.requestForm.value))
    console.log(data)

    const shootType = data.resourceName
      ? this.resources.filter((s) => s._id == data.resourceName)[0]?.name
      : null

    const _resourceTypeName = this.resourceTypes
      ? this.resourceTypes.filter((s) => s._id == data.resourceType)[0]?.name
      : null
    const gShootType = data.shootType
      ? this.gShootTypes.filter((s) => s._id == data.shootType)[0]?.name
      : null
    const channel = data.channel
      ? this.gChannels.filter((c) => c._id == data.channel)[0]?.name
      : null
    const studio = data.resourceName
      ? this.gStudios.filter((r) => r._id == data.resourceName)[0]?.name
      : null
    const cRoom = data.resourceName
      ? this.gControlRooms.filter((r) => r._id == data.resourceName)[0]?.name
      : null

    const startTime = data?.startDateTime?.toString()?.split(':')
    const endTime = data?.endDateTime?.toString()?.split(':')

    data.requestDateTime = this._date(data.fromDateTime)
    const startDateTime = new Date(this._date(data.fromDateTime))
    const endDateTime = new Date(this._date(data.toDateTime))

    startDateTime.setHours(startTime[0])
    startDateTime.setMinutes(startTime[1])

    endDateTime.setHours(endTime[0])
    endDateTime.setMinutes(endTime[1])

    data.timeSlot = `${moment(startDateTime).format('hh:mm A')} to ${moment(
      endDateTime
    ).format('hh:mm A')}`

    if (this.requestType == 'prerecorded' || this.requestType == 'live') {
      let participants: any[] = []
      for (let i = 0; i < data.participants.length; i++) {
        if (data.participants[i].studio) {
          const studioName = this.gStudios.filter(
            (r) => r._id == data.participants[i].studio
          )[0]?.name
          // Create the participant object with common properties
          const participant = {
            name: data.participants[i].name,
            studio: data.participants[i].studio,
            studioName: studioName,
            type: data.participants[i].type,
            startTime: data.participants[i].startTime,
            endTime: data.participants[i].endTime
          };

          participants.push(participant);
        }
      }
      data.participants = participants
    }

    data.requestId = this.requestId
    data.shootTypeName = shootType
    data._resourceType = _resourceTypeName
    data.gshootTypeName = gShootType
    data.channelName = channel
    data.studioName = studio
    data.controlRoomName = cRoom
    data.bookingId=this.gRequestDetails.bookingId;
    data.startDateTime = startDateTime
    data.endDateTime = endDateTime
    data.requestType = this.requestType
    data.fileName = this.attachment
      ? this.attachment.name
      : this.gRequestDetails.attachment
      ? this.gRequestDetails.attachment
      : null

    if (this.saveOnlyAvailable) {
      const requestTimeSlots = this.requestTimeSlots.filter(
        (rts: any) => rts.isAvailable
      )

      data.requestTimeSlots = requestTimeSlots.map((rts: any) => {
        return rts.request
      })
    } else {
      data.requestTimeSlots = this.requestTimeSlots.map((rts: any) => {
        return rts.request
      })

      data.guestTimeSlots = this.guestTimeSlots.map((rts: any) => {
        return rts.request
      })

    }

    data.eventType = data.recurring ? 'recurring' : 'single'

    if (data.recurring) {
      const ocurrenceOptions = {
        eventType: data.recurring ? 'recurring' : 'single',
        pattern: data.pattern,
        patternValue: data.patternValue,
        recurrenceValue: data.recurrenceValue,
        requestEndCriteria: data.requestEndCriteria,
        occurrenceTurns: data.occurrenceTurns,
      }
      data.ocurrenceOptions = ocurrenceOptions
    } else {
      const ocurrenceOptions = {
        eventType: data.recurring ? 'recurring' : 'single',
        pattern: 'daily',
        patternValue: '1',
        recurrenceValue: null,
        requestEndCriteria: 'date',
        occurrenceTurns: 1,
      }
      data.ocurrenceOptions = ocurrenceOptions
    }

    data.resourceName2 = data.studioName
      ? data.studioName
      : data.controlRoomName
    data.resourceTypeName = _resourceTypeName
    this.requestObject = data
    // Disable the seconde [availibility] step of the wizard as there are no conflicting requests
    // @ts-ignore
    this.stepper.selected.editable = true
    // @ts-ignore
    this.stepper.selected.completed = true
    this.stepper.next()
  }

  updateRequest() {
    const formData = new FormData()
    this.requestObject.details = this.requestObject.details.replace(/<br>/g, '\n');
    formData.set('requestId', this.requestObject.requestId)
    formData.set('requestDateTime', this.requestObject.requestDateTime)
    formData.set('startDateTime', this.requestObject.startDateTime)
    formData.set('endDateTime', this.requestObject.endDateTime)
    formData.set('details', this.requestObject.details)

    formData.set('name', this.requestObject.name)

    if (this.requestType == 'cameraman') {
      formData.set('shootType', this.requestObject.shootType)
      formData.set('shootTypeName', this.requestObject.shootTypeName)
      formData.set('resourceId', this.requestObject.resourceName)
      formData.set('primaryResourceId', this.requestObject.resourceName)
    }

    if (this.requestType == 'live') {
      formData.set('channel', this.requestObject.channel)
      formData.set('resourceId', this.requestObject.resourceName)
      formData.set('primaryResourceId', this.requestObject.resourceName)
    }

    if (this.requestType == 'prerecorded' || this.requestType == 'live') {
      formData.set(
        'participants',
        JSON.stringify(this.requestObject.participants)
      )
    }
    if (this.requestType == 'prerecorded') {
      formData.set('controlRoom', this.requestObject.resourceName)
      formData.set('primaryResourceId', this.requestObject.resourceName)
    }

    formData.set('requestType', this.requestType)
    if (this.attachment) {
      formData.set('file', this.attachment)
    }

    // formData.set(
    //   'requestTimeSlots',
    //   JSON.stringify(this.requestObject.requestTimeSlots)
    // )
    formData.set(
      'guestTimeSlots',
      JSON.stringify(this.requestObject.guestTimeSlots)
    )

    formData.set(
      'timeZone',
      this.userTimeZone
    )
    formData.set(
      'bookingId',
      this.gRequestDetails.bookingId
    )

    // set the remove flag for attachment if present in the database request and now removed
    if (this.gRequestDetails.attachment && this.fileRemoved) {
      formData.set('fileRemoved', 'true')
    }

    this.spinner.show()
    this.requestService.updateRequest(this.requestId, formData).subscribe({
      next: (res:any) => {
        let resourceId:any;
    

        if (res.data !== null && res.data !== undefined) {
          sessionStorage.setItem('bookingId', res.data.bookingId);
          if(res.data.requestType == "prerecorded"){
            sessionStorage.setItem('resourceId', res.data.controlRoom);
            resourceId=res.data.controlRoom;
          }else{

            sessionStorage.setItem('resourceId', res.data.resourceId._id);
            resourceId=res.data.resourceId._id;
          }

          this.dataService.getResourceName(resourceId).subscribe((data:any) => {
            
            sessionStorage.setItem('resourceName', data.resourceName);
          });

          sessionStorage.setItem('type',res.type);
        }

        this.spinner.hide()
        this.toastr.success('Requets updated')
        this.router.navigate(['/calendar'])
      },
      error: (err:any) => {
        this.spinner.hide()
        this.toastr.error('Error creating request')
      },
    })
  }

  viewRequestDetails(requestId: any) {
    this.requestService.findOne(requestId).subscribe((data: any) => {
      this.selectedRequest = data.request
      this.openRequestViewModal()
    })
  }

  openRequestViewModal() {
    this.modaleRef = this.modal.open(ViewRequestComponent, { size: 'lg' })
    this.modaleRef.componentInstance.request = this.selectedRequest
    this.modaleRef.componentInstance.showActions = false
  }

  downloadFile(name: string) {}

  prerecordnamechange(e: any) {
    // let guestLimit;
    let _pform = this.requestForm.get('participants') as FormArray
    // if (e == undefined) {
    //   guestLimit = 1;
    // } else {
    //   guestLimit = this.gStudios.find((item) => item._id === e._id)?.guestLimit ?? 1;
    // }

    if (this.isStudio()) {
      // this.preglimit = guestLimit;
      // this.gGuestLimit = guestLimit;
      this.prerecordname = e._id
      // _pform.controls.splice(this.gGuestLimit);
    } else {
      this.prerecordname = e._id
      return
    }

    // if (_pform.length >= this.gGuestLimit) {
    //   this.isAddGuestLimitArrived = true;
    // } else {
    //   this.isAddGuestLimitArrived = false;
    // }
  }

  cameramannamechange(e: any) {
    this.cameramanname = e._id
  }

  livenamechange(e: any) {
    let guestLimit
    let pform = this.requestForm.get('participants') as FormArray
    // if (e == undefined) {
    //   this.gGuestLimit = 1;
    // } else {
    //   guestLimit = this.gStudios.find((item) => item._id === e._id)?.guestLimit ?? 1;
    // }

    if (this.isStudio()) {
      // this.liveglimit = guestLimit;
      // this.gGuestLimit = guestLimit;
      this.liveresourcename = e._id
      // pform.controls.splice(this.gGuestLimit);
    } else {
      this.liveresourcename = e._id
      return
    }

    // if (pform.length >= this.gGuestLimit) {
    //   this.isAddGuestLimitArrived = true;
    // } else {
    //   this.isAddGuestLimitArrived = false;
    // }
  }

  removeAll() {
    let parties = this.requestForm.get('participants') as FormArray

    let i = parties.length
    // if (i > this.gGuestLimit) {
    //   if (this.isStudio()) {
    //     parties.controls.splice(this.gGuestLimit);

    //   } else {
    //     parties.controls.splice(this.gGuestLimit + 1);
    //   }
    // }
  }

  eventTypeChange(e: any) {
    this.requestForm.controls['recurring'].setValue(e.target.checked)
    if (e.target.checked) {
      let fields = ['pattern', 'requestEndCriteria']
      this.changeControlValidation(this.requestForm, fields, true)
    } else {
      this.pattern = ''
      let fields = [
        'pattern',
        'requestEndCriteria',
        'recurrenceValue',
        'requestEndDateTime',
        'occurrenceTurns',
      ]
      this.recurrenceValue = []
      this.changeControlValidation(this.requestForm, fields, false)
    }

    // Toggle the collapse
    this.isRecurringCollapsed = !e.target.checked
  }

  onPatternChange(e: any, patternType: any) {
    this.recurrenceValue = []
    // reset the recurrence value i.e. which days of week or month to be selected
    this.requestForm.get('recurrenceValue')?.setValue(this.recurrenceValue)
    this.pattern = patternType

    if (this.pattern == 'week' || this.pattern == 'month') {
      let fields = ['patternValue', 'recurrenceValue']
      this.changeControlValidation(this.requestForm, fields, true)
    } else {
      let fields = ['recurrenceValue']
      this.changeControlValidation(this.requestForm, fields, false)
    }
    this.requestForm.get('patternValue')?.updateValueAndValidity()
  }

  onRecurrenceValueChange(e: any) {
    if (
      e.target.checked &&
      this.recurrenceValue.find((v) => v == e.target.value) === undefined
    ) {
      this.recurrenceValue.push(e.target.value)
    } else {
      this.recurrenceValue = this.recurrenceValue.filter(
        (rv) => rv != e.target.value
      )
    }

    this.requestForm.get('recurrenceValue')?.setValue(this.recurrenceValue)
  }

  onRequestEndCrtChange(e: any) {
    if (e.target.value == 'date') {
      this.changeControlValidation(this.requestForm, ['occurrenceTurns'], false)
      this.changeControlValidation(
        this.requestForm,
        ['requestEndDateTime'],
        true
      )

      this.requestForm.controls['occurrenceTurns'].disable()
      this.requestForm.controls['requestEndDateTime'].enable()
    } else if (e.target.value == 'occurrence') {
      this.changeControlValidation(
        this.requestForm,
        ['requestEndDateTime'],
        false
      )
      this.changeControlValidation(this.requestForm, ['occurrenceTurns'], true)

      this.requestForm.controls['requestEndDateTime'].disable()
      this.requestForm.controls['occurrenceTurns'].enable()
    }
  }

  resourceChange($event: any) {
    if ($event._id) {
      ;(this.requestForm.get('participants') as FormArray).at(0)?.enable()
      ;(this.requestForm.get('participants') as FormArray).at(1)?.enable()
    }
    let partiform
    if (this.requestType == 'live') {
      this.liveresourcetype = $event._id
      if ($event.name != 'Studio') {
        this.glimitplaceflg = false
      } else if ($event.name == 'Studio') {
        this.glimitplaceflg = true
      }
      partiform = this.requestForm.get('participants') as FormArray
      this.liveresourcename = this.requestForm.get('resourceName')?.value
      this.requestForm.get('resourceName')?.setValue(null)
      this.liveresourcetype = $event._id
    }

    if (this.requestType == 'prerecorded') {
      this.prerecordtype = $event._id
      partiform = this.requestForm.get('participants') as FormArray
      if ($event.name != 'Studio') {
        this.prelimitplaceflg = false
      } else if ($event.name == 'Studio') {
        this.prelimitplaceflg = true
      }
      this.prerecordname = partiform.at(0).get('studio')?.value
      this.requestForm.get('resourceName')?.setValue(null)
      this.prerecordtype = $event._id
    }

    if (this.requestType == 'cameraman') {
      this.cameramantype = $event._id
      this.requestForm.get('resourceName')?.setValue(null)
    }
  }

  Handlefocus() {
    if (
      this.requestForm.get('resourceType')?.value == null ||
      this.requestForm.get('resourceType')?.value == ''
    ) {
      ;(this.requestForm.get('participants') as FormArray).at(0).disable()
      ;(this.requestForm.get('participants') as FormArray).at(1).disable()
    }
  }

  handleClickNext() {
    this.processRequestForm()
  }

  processRequestForm() {
    this.requestDates = []
    this.guestRequestDates=[];
    
    const request = this.requestForm.value
    let resourceName=request.resourceName;

    request.details = request.details.replace(/\n/g, '<br>');
    const startDateTime = moment(this._date(request.fromDateTime))
    const toDateTime = moment(this._date(request.toDateTime))
    // This is the end boundary date time of the recurring event
    let endDateTime = moment(this._date(request.toDateTime))
    if (request.recurring && request.requestEndDateTime) {
      endDateTime = moment(this._date(request.requestEndDateTime))
    }

    const startTime = request.startDateTime?.toString()?.split(':')
    const endTime = request.endDateTime?.toString()?.split(':')

    // These two denotes the start and end of a single request in the same day
    const requestStartDateTime = startDateTime.clone()
    const requestEndDateTime = toDateTime.clone()

    requestStartDateTime.hours(startTime[0]).minutes(startTime[1])
    requestEndDateTime.hours(endTime[0]).minutes(endTime[1])

    if (request.recurring) {
      const recurrenceValue = request.recurrenceValue
      if (this.pattern == 'day') {
        this.calculateRequestDates(
          requestStartDateTime,
          requestEndDateTime,
          this.pattern,
          endDateTime,
          request.patternValue,
          request.requestEndCriteria,
          request.occurrenceTurns
        )
      } else {
        if (['week', 'month'].includes(this.pattern)) {
          for (let i = 0; i < recurrenceValue.length; i++) {
            this.calculateRequestDates(
              requestStartDateTime,
              requestEndDateTime,
              this.pattern,
              endDateTime,
              request.patternValue,
              request.requestEndCriteria,
              request.occurrenceTurns,
              recurrenceValue[i]
            )
          }
        }
      }
    } else {
      const requestObj = {
        id: uuid(),
        resource:resourceName,
        type:"primary",
        startDateTime: requestStartDateTime.toDate().toString(),
        endDateTime: requestEndDateTime.toDate().toString(),
      }
      this.requestDates.push(requestObj)
    }

    this.requestDates.sort((a: any, b: any) => {
      return moment(a.startDateTime).isBefore(moment(b.startDateTime)) ? -1 : 1
    })


    if (request?.participants?.length){   
      
    

      for (let i = 0; i < request.participants.length; i++) {
        if (request?.participants[i]?.studio ) {

          const requestStartDateTime = startDateTime.clone()
          const requestEndDateTime = toDateTime.clone()
  
          if(request?.participants[i]?.startTime == null){
            request.participants[i].startTime=request.startDateTime
          }
          if(request?.participants[i]?.endTime == null){
            request.participants[i].endTime=request.endDateTime
          }
          let startStatus= false;
          let endStatus= false;
          let startTime ;
          let endTime ;

          if (this.isISODateFormat(request?.participants[i]?.startTime) ||this.isISODateFormat(request?.participants[i]?.endTime) ) {

            

            const { StartDateTime, EndDateTime }= this.getHourAndMinutes(request?.participants[i]?.startTime, request?.participants[i]?.endTime)

            if(StartDateTime >= request.startDateTime && StartDateTime<  request.endDateTime){
          
           
           
            startStatus=true;
          }

          if(EndDateTime <= request.endDateTime && EndDateTime >  request.startDateTime){
            endStatus=true;
          
            
             
           
          }

            startTime = (startStatus
            ? StartDateTime
            : request.startDateTime
          )?.split(':');

           endTime = (endStatus
            ? EndDateTime
            : request.endDateTime
          )?.split(':');

        

          }else{

             startTime = (request?.participants[i]?.startTime || request.startDateTime)?.split(':');
             endTime = (request?.participants[i]?.endTime || request.endDateTime)?.split(':'); 

          } 
  


          if(request?.participants[i]?.type == "host"){
             startTime = (request.startDateTime)?.split(':'); 
             endTime = (request.endDateTime)?.split(':'); 
          }
          
  
          let participantStartDateTime= requestStartDateTime.hours(startTime[0]).minutes(startTime[1])
          let participantEndDateTime= requestEndDateTime.hours(endTime[0]).minutes(endTime[1])

  
          resourceName=request?.participants[i]?.studio;
         
          if (request.recurring) {
            const recurrenceValue = request.recurrenceValue
            
            if (this.pattern == 'day') {
              this.recurringGuestDate(
                participantStartDateTime,
                participantEndDateTime,
                this.pattern,
                endDateTime,
                request.patternValue,
                request.requestEndCriteria,
                request.occurrenceTurns,
                resourceName,
                request?.participants[i]?.type,
                request?.participants[i]?.name,
              )
            } else {
              if (['week', 'month'].includes(this.pattern)) {
                for (let i = 0; i < recurrenceValue.length; i++) {
                  this.recurringGuestDate(
                    participantStartDateTime,
                    participantEndDateTime,
                    this.pattern,
                    endDateTime,
                    request.patternValue,
                    request.requestEndCriteria,
                    request.occurrenceTurns,
                    resourceName,
                    request?.participants[i]?.type,
                    request?.participants[i]?.name,
                    recurrenceValue[i],
                  )
                }
              }
            }
          } else {
  
           
  
            this.guestRequestDates.push({
              id: uuid(),
              name:request?.participants[i]?.name,
              resource:resourceName,
              type:request?.participants[i]?.type,
              startDateTime:participantStartDateTime.toDate().toString() ,
              endDateTime:participantEndDateTime.toDate().toString()  ,
    
            })
          }
  
          
        }
      }
    }


    this.checkSlotAvailability()
  }

  calculateRequestDates(
    requestStartDatetime: any,
    requestEndDateTime: any,
    pattern: string,
    endDateTime: any,
    patternValue: string,
    requestEndCriteria: string,
    occurrenceTurns: number,
    resourceName=null,
    ocValue = null,
  ) {

 
    let sd = requestStartDatetime.clone()
    let ed = requestEndDateTime.clone()
    let resource=resourceName

    /**
     * The occurence value should be treated as a weekday when pattern is week and as
     * a date when pattern is day or month
     */
    if (ocValue) {
      sd[pattern == 'week' ? 'day' : 'date'](ocValue, pattern)
      ed[pattern == 'week' ? 'day' : 'date'](ocValue, pattern)
    }

    let sDff = sd.diff(moment())
    let eDff = ed.diff(moment())

    if (requestEndCriteria == 'date') {
      //   Check if the starting request can be started from today only
      if (sDff > 0 && eDff > 0) {
        const requestObj = {
          id: uuid(),
          type:"primary",
          resource:resource,
          startDateTime: sd.clone().toDate().toString(),
          endDateTime: ed.clone().toDate().toString(),
        }
        this.requestDates.push(requestObj)
      }
      while (endDateTime.diff(ed) >= 0) {
        sd = sd.add(patternValue, pattern)
        ed = ed.add(patternValue, pattern)
        eDff = endDateTime.diff(ed)
        if (eDff >= 0) {
          const requestObj = {
            id: uuid(),
            type:"primary",
            resource:resource,
            startDateTime: sd.clone().toDate().toString(),
            endDateTime: ed.clone().toDate().toString(),
          }
          this.requestDates.push(requestObj)
        }
      }
    }

    if (requestEndCriteria == 'occurrence') {
      let i = 0
      //   Check if the starting request can be started from today only
      if (sDff > 0 && eDff > 0) {
        const requestObj = {
          id: uuid(),
          type:"primary",
          resource:resource,
          startDateTime: sd.clone().toDate().toString(),
          endDateTime: ed.clone().toDate().toString(),
        }
        this.requestDates.push(requestObj)
        i++
      }
      while (i < occurrenceTurns) {
        sd = sd.add(patternValue, pattern)
        ed = ed.add(patternValue, pattern)
        eDff = endDateTime.diff(ed)
        if (i <= occurrenceTurns) {
          const requestObj = {
            id: uuid(),
            type:"primary",
            resource:resource,
            startDateTime: sd.clone().toDate().toString(),
            endDateTime: ed.clone().toDate().toString(),
          }
          this.requestDates.push(requestObj)
        }

        i++
      }
    }
  }

  setGuestTimeRange(){  


    // if(this.primaryTimeChanged){

      this.fromValues = []; // Store "From" values for each guest
      this.toValues = []; 

    // }

    this.guestList=[];

    let guestData:any=[];
 
    const participants=this.requestForm.get('participants')?.value;  
    
    const guestParticipants = participants.filter((participant: any) => {
      return participant.type === "guest";
    });

   if( guestParticipants.every((participant:any) => !participant.studio)){
    return;
   }
 

    if (Array.isArray(participants)) {
      // Loop through the participants and push the 'studio' property into resourceId
      participants.forEach((participant:any) => {
        if (participant.studio && participant.type=="guest") {
          guestData.push(participant);
         
        }
      });
    }

     const requestObject = {
          guestData: guestData,     
    };

    
    this.requestService.getAllResource(requestObject).subscribe({
      next:async (data: any) => {
        this.guestList=data;

     
        const participants=this.requestForm.get('participants')?.value; 
        const startDateTime=this.requestForm.get('startDateTime')?.value;  
        const endDateTime=this.requestForm.get('endDateTime')?.value;   

      

        const guestParticipants = participants.filter((participant:any) => 
                                  participant.type === 'guest');
          for (let i = 0; i < guestParticipants.length; i++) {
            const guest = guestParticipants[i];

            let guestStartDateTime;
            let guestEndDateTime;

            if (this.isISODateFormat(guest?.startTime) ||this.isISODateFormat(guest?.endTime) ) {
           

            const startTime = new Date(guest.startTime);
            const endTime = new Date(guest.endTime);


            const startHour = (startTime.getHours()<10)?`0${startTime.getHours()}`:startTime.getHours();
            const startMinutes = startTime.getMinutes();

            const endHour = (endTime.getHours()< 10)?`0${endTime.getHours()}`:endTime.getHours();
            const endMinutes = endTime.getMinutes();

            const formattedStartMinutes = startMinutes.toString().padStart(2, '0');
            const formattedEndMinutes = endMinutes.toString().padStart(2, '0');

             guestStartDateTime=startHour+":"+formattedStartMinutes
             guestEndDateTime=endHour+":"+formattedEndMinutes

        
          }else{

             guestStartDateTime=guest?.startTime
             guestEndDateTime=guest?.endTime
          }

          

            if(this.primaryTimeChanged){

              this.fromValues.push(startDateTime);
              this.toValues.push(endDateTime);

            }else{

              if(guest.startTime == null && guest.endTime == null){
                this.fromValues.push(startDateTime);
                this.toValues.push(endDateTime);
  
                this.fromValues = this.fromValues.filter(value => typeof value === 'string' && value !== "");
                this.toValues = this.toValues.filter(value => typeof value === 'string' && value !== "");
  
                console.log("1")
              }else{
                console.log("2")
                this.fromValues.push(guestStartDateTime || startDateTime); // Adjust the property name
                this.toValues.push(guestEndDateTime  || endDateTime); // Adjust the property name
  
              }
            }

           
          }

          this.primaryTimeChanged=false;
          console.log("Before"+ this.fromValues)
          console.log( "Before"+ this.toValues)

    },
      error: (err) => {
        
      },
    });
   
    this.modaleRef = this.modal.open(this.GuestTimeRange, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
      windowClass: 'custom-modal-auto'
    });


  }

  saveGuestTimeRange() {
    const startDateTime = this.requestForm.get('startDateTime')?.value;
    const endDateTime = this.requestForm.get('endDateTime')?.value;
    console.log("After"+ this.fromValues)
    console.log( "After"+ this.toValues)
   
  
    const participants = this.requestForm.get('participants') as FormArray;
    const guestParticipants = participants.controls
      .filter(participant => participant.get('type')?.value === 'guest');

      console.log(guestParticipants)
  
    for (let i = 0; i < guestParticipants.length; i++) {
      const guest = guestParticipants[i];
      const fromValue = this.fromValues[i];
      const toValue = this.toValues[i];
  
      // Perform the validation
      if (fromValue < startDateTime || toValue > endDateTime) {
        // Handle the validation error, e.g., display an error message
       
        this.toastr.error('Please Select Valid Time')
        return; // Exit the function to prevent further processing
      }
  
      // Update 'startTime' and 'endTime' for guest participants
      guest.get('startTime')?.setValue(fromValue);
      guest.get('endTime')?.setValue(toValue);
    }
  
    // Close the modal
    this.modaleRef.close();
  }
  

  hasValidTimeSlots(): boolean {
    // Check if there is at least one guest with valid time slots
    for (let i = 0; i < this.fromValues.length; i++) {
      if (this.fromValues[i] && this.toValues[i]) {
        const startTime = moment(this.fromValues[i], "hh:mm");
        const endTime = moment(this.toValues[i], "hh:mm");
        if (endTime.isAfter(startTime)) {
          return true; // At least one guest has a valid time slot
        }
      }
    }
  
    return false; // No guest has a valid time slot
  }

  recurringGuestDate(
    requestStartDatetime: any,
    requestEndDateTime: any,
    pattern: string,
    endDateTime: any,
    patternValue: string,
    requestEndCriteria: string,
    occurrenceTurns: number,
    resourceName=null,
    type=null,
    name=null,
    ocValue = null,
  ) {

    let sd = requestStartDatetime.clone()
    let ed = requestEndDateTime.clone()
    let resource=resourceName

    /**
     * The occurence value should be treated as a weekday when pattern is week and as
     * a date when pattern is day or month
     */
    if (ocValue) {
      sd[pattern == 'week' ? 'day' : 'date'](ocValue, pattern)
      ed[pattern == 'week' ? 'day' : 'date'](ocValue, pattern)
    }

    let sDff = sd.diff(moment())
    let eDff = ed.diff(moment())

    if (requestEndCriteria == 'date') {
      //   Check if the starting request can be started from today only
      if (sDff > 0 && eDff > 0) {
        const requestObj = {
          id: uuid(),
          type:type,
          name:name,
          resource:resource,
          startDateTime: sd.clone().toDate().toString(),
          endDateTime: ed.clone().toDate().toString(),
        }
        this.guestRequestDates.push(requestObj)
      }
      while (endDateTime.diff(ed) >= 0) {
        sd = sd.add(patternValue, pattern)
        ed = ed.add(patternValue, pattern)
        eDff = endDateTime.diff(ed)
        if (eDff >= 0) {
          const requestObj = {
            id: uuid(),
            name:name,
            resource:resource,
            type:type,
            startDateTime: sd.clone().toDate().toString(),
            endDateTime: ed.clone().toDate().toString(),
          }
          this.guestRequestDates.push(requestObj)
        } 
      }
    }

    if (requestEndCriteria == 'occurrence') {
      let i = 0
      //   Check if the starting request can be started from today only
      if (sDff > 0 && eDff > 0) {
        const requestObj = {
          id: uuid(),
          name:name,
          type:type,
          resource:resource,
          startDateTime: sd.clone().toDate().toString(),
          endDateTime: ed.clone().toDate().toString(),
        }
        this.guestRequestDates.push(requestObj)
        i++
      }
      while (i < occurrenceTurns) {
        sd = sd.add(patternValue, pattern)
        ed = ed.add(patternValue, pattern)
        eDff = endDateTime.diff(ed)
        if (i <= occurrenceTurns) {
          const requestObj = {
            id: uuid(),
            name:name,
            type:type,
            resource:resource,
            startDateTime: sd.clone().toDate().toString(),
            endDateTime: ed.clone().toDate().toString(),
          }
          this.guestRequestDates.push(requestObj)
        }

        i++
      }
    }
  }



   isISODateFormat(time:any) {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    return isoDatePattern.test(time);
  }


  getHourAndMinutes(sTime:any, eTime:any){


           const startTime = new Date(sTime);
            const endTime = new Date(eTime);

            const startHour = startTime.getHours();
            const startMinutes = startTime.getMinutes();

            const endHour = endTime.getHours();
            const endMinutes = endTime.getMinutes();

             // Format minutes to have two digits
            const formattedStartMinutes = startMinutes.toString().padStart(2, '0');
            const formattedEndMinutes = endMinutes.toString().padStart(2, '0');

            // const StartDateTime=startHour+":"+formattedStartMinutes
            // const EndDateTime=endHour+":"+formattedEndMinutes

            const StartDateTime=(startHour<10)?"0"+startHour+":"+formattedStartMinutes : startHour+":"+formattedStartMinutes
            const EndDateTime=(endHour<10)?"0"+endHour+":"+formattedEndMinutes : endHour+":"+formattedEndMinutes

            const dateObject={
              StartDateTime:StartDateTime,
              EndDateTime:EndDateTime,
            }

            return dateObject;
  }

  capitalizeFirstLetter(inputString: string): string {
    return inputString.charAt(0).toUpperCase() + inputString.slice(1);
  }



}