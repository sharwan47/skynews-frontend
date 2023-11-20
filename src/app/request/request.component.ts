import {
  CdkStepper,
  CdkStepperNext,
  StepperSelectionEvent,
} from '@angular/cdk/stepper'
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  TemplateRef,
  ViewChild,
  ChangeDetectorRef,
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
import { DataService } from '../core/_services/data.service'
import { RequestService } from './request.service'
import * as moment from 'moment'
import { ToastrService } from 'ngx-toastr'
import { NgxSpinnerService } from 'ngx-spinner'
import { ActivatedRoute, Router } from '@angular/router'
import { NgStepperComponent } from 'angular-ng-stepper'
import { NgbDate, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap'
import { ViewRequestComponent } from './view-request/view-request.component'
// @ts-ignore
import { v4 as uuid } from 'uuid'
import { AdminService } from '../admin/admin.service'
import { ProjectRouterService } from '../core/_services/project.router.service'
import { RequestFormData } from '../core/_models/request.form'
import { DatePipe } from '@angular/common';


@Component({
  selector: 'app-request',
  templateUrl: './request.component.html',
  styleUrls: ['./request.component.scss'],
})
export class RequestComponent implements OnInit, AfterViewInit {
  @ViewChild('cdkStepper') stepper!: NgStepperComponent
  @ViewChild('formRef') formRef!: FormGroupDirective
  @ViewChild("RequestAutoApprovalStatus") RequestAutoApprovalStatus!: TemplateRef<any>;
  @ViewChild("ResourceOwnerShip") ResourceOwnerShip!: TemplateRef<any>;
  @ViewChild("GuestTimeRange") GuestTimeRange!: TemplateRef<any>;
  @ViewChild("GuestNotAvailable") GuestNotAvailable!: TemplateRef<any>;
  @ViewChild("FileSizeExceeded") FileSizeExceeded!: TemplateRef<any>;
  processing: boolean = false
  monthDays = Array(31)
    .fill(0)
    .map((x, i) => i)
  pattern = ''

  resourceTypes: any[] = []
  resourceNames: any
  /**
   * this denotes the days of week if pattern is week or dates of a month if pattern is month
   * or dates of a year if pattern selected as yearly
   * It is ignored for daily occurence as it will use the start and end times
   */
  recurrenceValue: Array<any> = []
  isRecurringCollapsed = true

  /**
   * In case the slot(s) is/are unavailable, the slots are tracked with this variable
   * The response of request slot availability are stored here
   */
  requestTimeSlots: any = []
  allSlotsAvailable: boolean = false // this denotes the availability of all slots in the recurring request

  /**
   * Shows if the requests slots had un available time slots in between
   * and then edited by user and set to custom slots in that day
   */
  requestSlotsEdited: boolean = false
  showAsteriskElementHost: boolean = false;
  requestDates: Array<any> = []
  

  studios$!: Observable<any>
  controlRooms$!: Observable<any>
  channels$!: Observable<any>
  shootTypes$!: Observable<any>

  gShootTypes!: Array<any>
  gChannels!: Array<any>
  gStudios!: Array<any>
  gControlRooms!: Array<any>

  availableRequests: Array<any> = []
  availableSchedules: Array<any> = []

  requestType = 'live'
  requestTypeGroupName = 'requestType'

  liveresourcename = null;
  liveresourcetype = null;
  prerecordname = null;
  prerecordtype = null;

  cameramanname = null;
  cameramantype = null;
  shootType = null;

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

  prelimitplaceflg = false
  // liveglimit = 1;
  // preglimit = 1;
  liveGuest = false
  preGuest = false
  bookingId: any ;
  cssClass:any;
  previospage = 'live'
  studioflg = false
  glimitplaceflg = false
  dateValidationMsg = ''

  // gGuestLimit: number = 1;
  retainFormControls = ['requestDateTime', 'startDateTime', 'endDateTime']

  selectedRequest!: any
  requestObject!: any
  requestForm!: FormGroup
  // This is used to flag that the request is checked with the backend and no conflicting slots are available
  requestOk = false

  dateParam: any = '' // date passed as a parameter to the component;
  timeParam: any = '' // time calculated from date parameter passed to the component;
  resourceParam: any = '' // resource passed as a parameter to the component
  resourceTypeParam: any = '' // Type of the resource passed as a param, either STUDIO or CONTROL_ROOM

  // if set, requests for only available slots will be saved
  saveOnlyAvailable: boolean = false
  rangeLimit = 48

  resources$!: Observable<any>
  resources: any[] = []

  gRequestDetails: any;
  
  resourceData:any=[];
  resourceOwnerData: { [key: string]: string[] } = {};
  userTimeZone: any;
  guestList:any=[];
  resourceList:any;
  fromValues: Date[] = []; // Store "From" values for each guest
  toValues: Date[] = [];   // Store "To" values for each guest
  validTimeslot:boolean=false;
  guestTimeNotAvailable:boolean=false;
  guestTimeSlots: any = []
  guestName:any;
  guestRequestDates: Array<any> = []
  primaryTimeChanged:boolean=false;
  userChangedDateTime:boolean=false;

  preGuestTimeSlots:any;

  noSlotAvailable:boolean = false;

  modaleRef!: NgbModalRef
  constructor(
    private fb: FormBuilder,
    private projectRouterService: ProjectRouterService,
    private dataService: DataService,
    private requestService: RequestService,
    private adminService: AdminService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private route: ActivatedRoute,
    private modal: NgbModal,
    private cdref: ChangeDetectorRef,
    private datePipe: DatePipe
  ) { }

  attachment!: any
  attachmentSet = false
  attachmentName = 'Add attachment'

  requestDateTimeObj!: any

  showInvalidMsg = false

  // this only use to pass data from another sources
  // not to edit

  requestFormData?: RequestFormData;

  processDefaulValue() {
    if (this.projectRouterService?.requestCloneId) {
      // this.requestFormData = this.projectRouterService?.requestCloneData;
      // cleanup
      this.getRequestDetails(this.projectRouterService.requestCloneId)
      this.projectRouterService.deleteRequestClone();
    }
  }

  ngOnInit(): void {

    this.userTimeZone = this.dataService.getUserTimeZone();

    
    
    
    this.route.queryParamMap.subscribe((queryParams) => {
      const vDateParam: any = queryParams.get('date')
      if (vDateParam) {
        const date = new Date(vDateParam)
        if (date) {
          if (date.getTime() >= new Date().getTime()) {
            this.dateParam = {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              day: date.getDate(),
            }

            if (queryParams.get('resource')) {
              this.timeParam = `${date.getHours()}:${date.getMinutes()}`
            }
          } else {
            this.toastr.info("Date must be greater then today's date")
          }
        }

        // Check if the resource is also passed
        this.resourceParam = queryParams.get('resource')
        this.resourceTypeParam = queryParams.get('r_type')
      }
      // process default values
      this.processDefaulValue();
      this.initializeForm()
      // this.changeRequestType(this.requestType);

      this.requestForm.get('fromDateTime')?.valueChanges.subscribe((value) => {
        this.requestForm.get('toDateTime')?.setValue(value)
      })

      this.requestForm.get('resourceType')?.valueChanges.subscribe((value) => {
        if (!value) return
        const selectedResourceType = this.resourceTypes.find(
          (item) => item._id === value
        )

        if (selectedResourceType?.type == 'STUDIO') {
          this.studios$.subscribe((data) => {
            this.gStudios = data
          })
        }

        this.resources$ = this.adminService.getResourceByType(value)
        

        this.resources$.subscribe({
          next: (res: any) => {
            this.resources = res
            this.cdref.detectChanges()
          },
          error: (err: any) => { },
        })
      })
      // Change the request type to prerecorded as the control room resource type is only available there
      if (this.resourceTypeParam == 'CONTROL_ROOM') {
        this.requestType = 'prerecorded'
        this.changeRequestType('prerecorded')
        this.requestForm.controls['resourceName'].setValue(this.resourceParam)
      }
      this.getRequiredData()
    })
    this.getResourceTypes()


      // Subscribe to value changes for startDateTime
      this.requestForm?.get('startDateTime')?.valueChanges.subscribe((value) => {
      
        this.primaryTimeChanged=true;
        
      });
  
      // Subscribe to value changes for endDateTime
      this.requestForm?.get('endDateTime')?.valueChanges.subscribe((value) => {
        
        this.primaryTimeChanged=true;
       
      });


  }

  resetTimeForParticipant(){    

    const startDateTime = this.requestForm.get('startDateTime')?.value;
      const endDateTime = this.requestForm.get('endDateTime')?.value;
      const participants = this.requestForm.get('participants') as FormArray;

      for (let i = 0; i < participants.length; i++) {
        participants.at(i).get('startTime')?.setValue(startDateTime);
        participants.at(i).get('endTime')?.setValue(endDateTime);
      }
  }

  

  getRequestDetails(requestId:string) {
    this.requestService.findOne(requestId).subscribe((data: any) => {
      this.gRequestDetails = data.request

      this.bookingId=data.request.bookingId;

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

  userInteractedWithTimePicker(){
    console.log("user interacted")
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
      // fromDateTime: fromNgbDate,
      // toDateTime: toNgbDate,
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
      // this.downloadAttachment = true
    }

    if (request.participants && request.participants.length) {
      this.resetFormArrayWithDefault()
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

   
      request.participants.forEach((p: any) => {
        this.addGuestWithValue(p?.type, p.studio?._id, p?.name , p?.startTime,p?.endTime)
      })
    }

    this.primaryTimeChanged=false;
  }

  resetFormArrayWithDefault() {
    while ((this.requestForm.get('participants') as FormArray).length !== 0) {
      (this.requestForm.get('participants') as FormArray).removeAt(0)
    }
  }

  ngAfterViewInit(): void { }

  showResourceModal(){

    const resourceId=[];
    const bookingData=[];
    this.resourceData=[];   

    console.log(this.requestForm)

    const startDateTime=this.requestForm.get('startDateTime')?.value;
    const endDateTime=this.requestForm.get('endDateTime')?.value;
    const resourceName=this.requestForm.get('resourceName')?.value;
    const participants=this.requestForm.get('participants')?.value;

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

    console.log(data);

    this.resourceData=data;

      },
      error: (err) => {

        
      },
    });
 
    this.modaleRef = this.modal.open(this.RequestAutoApprovalStatus, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
      // windowClass: 'custom-modal-auto'
    });
  }

  capitalizeFirstLetter(inputString: string): string {
    return inputString.charAt(0).toUpperCase() + inputString.slice(1);
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
      error: (err) => {
        console.log(err);
      },
    });

    // console.log(this.resourceOwnerData.length)

    this.modaleRef = this.modal.open(this.ResourceOwnerShip, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
      windowClass: 'custom-modal-auto'
    });
  }


  saveGuestTimeRange() {

    // this.fromValues = []; // Store "From" values for each guest
    // this.toValues = []; 

    const startDateTime = this.requestForm.get('startDateTime')?.value;
    const endDateTime = this.requestForm.get('endDateTime')?.value;
  
    const participants = this.requestForm.get('participants') as FormArray;
    const guestParticipants = participants.controls
      .filter(participant => participant.get('type')?.value === 'guest');

     
  
    for (let i = 0; i < guestParticipants.length; i++) {
      const guest = guestParticipants[i];
      const fromValue = this.fromValues[i];
      const toValue = this.toValues[i];
  console.log(fromValue)
  console.log(toValue)
  console.log(startDateTime)
  console.log(endDateTime)
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
  
  
  


   setGuestTimeRange(){  

    

      this.fromValues = []; // Store "From" values for each guest
      this.toValues = []; 

   

    this.guestList=[];

    let guestData:any=[];
 
    const participants=this.requestForm.get('participants')?.value;   
    console.log(participants)

    const guestParticipants = participants.filter((participant: any) => {
      return participant.type === "guest";
    });

    console.log(guestParticipants)

   if( guestParticipants.every((participant:any) => !participant.studio)){
    return;
   }
    
    if (Array.isArray(participants)) {
      // Loop through the participants and push the 'studio' property into resourceId
      participants.forEach(participant => {
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

        console.log(startDateTime)
        console.log(endDateTime)
        
        
        
        const guestParticipants = participants.filter((participant:any) => participant.type === 'guest');
        console.log(guestParticipants)
          for (let i = 0; i < guestParticipants.length; i++) {
            const guest = guestParticipants[i];
            let guestStartDateTime;
            let guestEndDateTime;

            if (this.isISODateFormat(guest?.startTime) ||this.isISODateFormat(guest?.endTime) ) {
           

            const startTime = new Date(guest.startTime);
            const endTime = new Date(guest.endTime);

            console.log(startTime)

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
console.log("here")
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
                console.log(guestStartDateTime)
                console.log(startDateTime)
                this.fromValues.push(guestStartDateTime || startDateTime); // Adjust the property name
                this.toValues.push(guestEndDateTime  || endDateTime); // Adjust the property name
  
              }
            }

          }

          console.log(this.fromValues)
          console.log(this.toValues)
          this.primaryTimeChanged=false;


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

  guestNotAvailable(){
    this.modaleRef = this.modal.open(this.GuestNotAvailable, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
      windowClass: 'custom-modal-auto'
    });
  }

  hasFilterData(): boolean {
    const resourceName = this.requestForm.get('resourceName')?.value;
    const participants = this.requestForm.get('participants')?.value;
    
    // You can add additional conditions if needed
    return (resourceName || participants);
  }

  closeModal(){
    this.modaleRef.close();
  }

  initializeForm() {
    this.requestForm = this.fb.group(
      {
        fromDateTime: [this.dateParam, [Validators.required]],
        toDateTime: [this.dateParam, [Validators.required]],
        startDateTime: [this.timeParam, [Validators.required]],
        endDateTime: ['', [Validators.required]],
        channel: [null, [Validators.required]],
        resourceType: [null, [Validators.required]],
        resourceName: [
          this.resourceTypeParam == 'STUDIO' ? this.resourceParam : null,
        ],
        name: '',
        program: null,
        shootType: null,
        // denotes if the request is single or recurring
        recurring: false,
        /**
         * The frequency pattern of the recurring event
         * daily means it will happen on daily basis
         * weekly means it will occur on the weekly frequency
         * monthly means it will occur on the monthly frequency
         * yearly means it will happen once a year
         */
        pattern: null,
        /**
         * This is the amount of the pattern counted as one turn
         * We may have events that will occur every two weeks on mondays or every three months on 15th date and so on
         * this is ignored for daily pattern
         * if value of {pattern} is weekly then it means every {patternValue} week(s)
         * if value of {pattern} is monthly then it means every {patternValue} month(s)
         * if value of {pattern} is yearly then it means every {patternValue} year(s)
         */
        patternValue: [1, [Validators.pattern('^[1-9]+$')]], // set 1 as default
        /**
         * this denotes the days of week if pattern is week or dates of a month if pattern is month
         * or dates of a year if pattern selected as yearly
         * It is ignored for daily occurence as it will use the start and end times
         */
        recurrenceValue: null,
        requestEndDateTime: [{ value: null, disabled: true }],
        /**
         * occurrenceTurns is the number of turns a request will occurr before it is terminated
         * It is used when the requestEndCriteria is selected as occurrence
         */
        occurrenceTurns: [{ value: null, disabled: true }],
        /**
         * This denotes the recurring event termination criteria
         * if date selected the requestEndDateTime will be checked to denote the ending of a reccurring request
         * if occurrence is selected then the occurrenceTurns will be checked for ending of a recurring request
         */
        requestEndCriteria: null,
        contactInformation: null,
        details: [ '', [Validators.required]],
        attachment: null,
        participants: new FormArray([
          this.fb.group({
            studio: [null],
            name: [''],
            type: 'host',
            startTime: null,
            endTime: null,
            
            
          }),
          this.fb.group({
            studio: null,
            name: [''],
            type: 'guest',
            startTime: null,  
            endTime: null,
          }),
        ]),
      },
      { validator: this.validateDate.bind(this) }
    )
  }

  getResourceTypes() {
    this.adminService.getResourceType(this.requestType).subscribe({
      next: (res: any) => {
        this.resourceTypes = res
        this.cdref.detectChanges()
      },
      error: (err: any) => { },
    })
  }

  getResources(type: string) {
    this.adminService.getResourceByType(type).subscribe({
      next: (res: any) => {
        this.resources = res
        this.cdref.detectChanges()
      },
      error: (err: any) => { },
    })
  }

  getId(data: string) {
    return `${data.toUpperCase().replace(' ', '_')}`
  }

  validateDate(group: AbstractControl): ValidationErrors | null {
    // here we have the 'requestForm' group
    const fromDateTime = group.get('fromDateTime')?.value
    const toDateTime = group.get('toDateTime')?.value
    const requestEndDateTime = group.get('requestEndDateTime')?.value
    const startTime = group.get('startDateTime')?.value
    const endTime = group.get('endDateTime')?.value
    if (!fromDateTime || !toDateTime || !startTime || !endTime) {
      return null
    }
    return this.validTimeSlot(
      fromDateTime,
      toDateTime,
      requestEndDateTime,
      startTime,
      endTime
    )
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

  getRequiredData() {
    this.studios$ = this.dataService.getStudios()
    this.studios$.subscribe((data) => (this.gStudios = data))
    this.getResourceTypes()
    this.controlRooms$ = this.dataService.getControlRooms()
    this.controlRooms$.subscribe((data) => (this.gControlRooms = data))
    this.channels$ = this.dataService.getChannels()
    this.channels$.subscribe((data) => (this.gChannels = data))
    this.shootTypes$ = this.dataService.getShootTypes()
    this.shootTypes$.subscribe((data) => (this.gShootTypes = data))
  }

  addShooType(item: any) {
    const newShootType = { _id: 11111, name: item, tag: true, new: true }
    this.gShootTypes.push(newShootType)
    return newShootType
  }

  // Without this, angular will not recognize the participants formArray variable in the html *ngFor
  get participants() {
    return this.requestForm.controls['participants'] as FormArray
  }

  addParticipant(participantType = 'guest', studio = null, name = null ,startTime = null ,endTime = null) {
    return this.fb.group({
      studio: [studio],
      name: [name],
      type: participantType,
      startTime:startTime,
      endTime:endTime,
    })
  }

  changeRequestType(requestType: any) {

    this.fromValues = []; // Store "From" values for each guest
    this.toValues = []; 

    let requiredFields: string[] = []
    let optionalFields: string[] = []

    switch (requestType) {
      case 'live':
        requiredFields = [
          'channel',
          'resourceName',
          'name',
          'resourceType',
          'studio',
        ]
        optionalFields = [
          'program',
          'shootType',
          'contactInformation',
          'participants',
        ]
        break

      case 'prerecorded':
        requiredFields = ['resourceName', 'resourceType', 'name']
        optionalFields = [
          'studio',
          'channel',
          'program',
          'participants',
          'shootType',
          'contactInformation',
        ]
        break
      case 'remote':
        requiredFields = ['name', 'resourceType', 'resourceName']
        optionalFields = [
          'program',
          'channel',
          'participants',
          'contactInformation',
          'shootType',
        ]
        break
      case 'cameraman':
        requiredFields = ['name', 'resourceName', 'resourceType', 'shootType']
        optionalFields = [
          'channel',
          'program',
          'contactInformation',
          'participants',
        ]
        break
    }
    // this.gGuestLimit = 1;

    // Dynamically set fields validations based on the request type
    this.changeControlValidation(this.requestForm, requiredFields, true)
    this.changeControlValidation(this.requestForm, optionalFields, false)

    this.getResourceTypes()

    // this.requestForm.get("resourceName")?.setValue("");
    this.resources$ = new Observable()
    if (requestType == 'prerecorded') {
      const hostFormGroup = (
        this.requestForm.get('participants') as FormArray
      )?.at(0)
      // hostFormGroup.get('studio')?.setValidators([Validators.required])
      // hostFormGroup.get('name')?.setValidators([Validators.required])
    } else {
      const hostFormGroup = (
        this.requestForm.get('participants') as FormArray
      )?.at(0)
      hostFormGroup.get('studio')?.clearValidators()
      hostFormGroup.get('name')?.clearValidators()
    }

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
        break
      }
      console.log( formarray.at(i))
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
      let formarray = this.requestForm.get('participants') as FormArray
      let array = this.liveguests.filter(
        (value) => value !== '' && value !== null
      )
      this.liveguests = array
 
      if (!this.liveguests.length) {
        let flength = formarray.length
        for (let i = flength - 1; i > 1; i--) {
          formarray.removeAt(i)
        }
        formarray.at(0).get('studio')?.setValue(null)
        formarray.at(0).get('name')?.setValue(null)
        formarray.at(0)?.get('startTime')?.setValue(null)
        formarray.at(0)?.get('endTime')?.setValue(null)
      } else {
        formarray = this.requestForm.get('participants') as FormArray

        console.log(formarray)
        let flength = formarray.length
        for (let i = flength - 1; i >= 0; i--) {
          ; (this.requestForm.get('participants') as FormArray).removeAt(i)
        }
        let i
        for (i = 0; i < this.liveguests.length; i++) {
          formarray.insert(
            i,
            this.addParticipant(this.liveType[i], this.liveguests[i], this.livetext[i], this.liveStartTime[i],this.liveEndTime[i])
          )
        }
        // if (i == 1) {
        //   formarray.insert(i, this.addParticipant());
        // }
      }

      this.previospage = 'live'
      // this.isAddGuestLimitArrived = this.liveGuest;
    }

    if (requestType == 'prerecorded') {
      // this.gGuestLimit = this.preglimit;

      let formarray = this.requestForm.get('participants') as FormArray
      let array = this.preguests.filter(
        (value) => value !== '' && value !== null
      )
      this.preguests = array
      if (!this.preguests.length) {
        let flength = formarray.length
        for (let i = flength - 1; i > 0; i--) {
          formarray.removeAt(i)
        }
        formarray.at(0).get('studio')?.setValue(null)
        formarray.at(0).get('name')?.setValue(null)
                formarray.at(0)?.get('startTime')?.setValue(null)
        formarray.at(0)?.get('endTime')?.setValue(null)
        if (!this.isStudio()) {
          formarray.insert(1, this.addParticipant())
        }
      } else {
        formarray = this.requestForm.get('participants') as FormArray
        let flength = formarray.length
        for (let i = flength - 1; i >= 0; i--) {
          ; (this.requestForm.get('participants') as FormArray).removeAt(i)
        }
        let i
        for (i = 0; i < this.preguests.length; i++) {
          formarray.insert(
            i,
            this.addParticipant(this.preType[i], this.preguests[i], this.pretext[i],this.preStartTime[i],this.preEndTime[i])
          )
        }
      }

      this.previospage = 'prerecorded'
      // this.isAddGuestLimitArrived = this.preGuest;
    }

    if (requestType == 'cameraman') {
      this.previospage = 'cameraman'
    }

    // Reset form and reset its submitted state as well
    // this.formRef.resetForm({
    //   requestDateTime: this.requestForm.get('requestDateTime')?.value,
    //   startDateTime: this.requestForm.get('startDateTime')?.value,
    //   endDateTime: this.requestForm.get('endDateTime')?.value,
    //   details: this.requestForm.get('details')?.value,
    //   attachment: this.requestForm.get('attachment')?.value,
    // });

    // Remove the extra participants fields if added when the requestType was prerecorded
    // this.resetFormArray();
  }

  resetFormArray() {
    while ((this.requestForm.get('participants') as FormArray).length !== 0) {
      ; (this.requestForm.get('participants') as FormArray).removeAt(0)
    }

    ; (this.requestForm.get('participants') as FormArray)?.push(
      this.fb.group({
        studio: null,
        name: '',
        type: 'host',
        startTime: null,
        endTime: null,
      })
    )
      ; (this.requestForm.get('participants') as FormArray)?.push(
        this.fb.group({
          studio: null,
          name: '',
          type: 'guest',
          startTime: null,
          endTime: null,
        })
      )
  }

  livenamechange(e: any) {
    // let guestLimit;
    // if (e == undefined) {
    //   this.gGuestLimit = 1;
    // } else {
    //   guestLimit =
    //     this.gStudios.find((item) => item._id === e._id)?.guestLimit ?? 1;
    //   if (this.isStudio() && this.glimitplaceflg)
    //     this.gGuestLimit = guestLimit ? guestLimit : 1;
    // }
    this.liveresourcename = e?._id
  }

  prerecordnamechange(e: any) {
    // let guestLimit;
    // if (e == undefined) {
    //   guestLimit = 1;
    // } else {
    //   guestLimit = this.gStudios.find((item) => item._id === e._id)?.guestLimit ?? 1;
    // }
    this.prerecordname = e?._id
    if (!this.prelimitplaceflg) return
    // this.gGuestLimit = guestLimit;
    // this.preglimit = this.gGuestLimit;
  }

  cameramannamechange(e: any) {
    this.cameramanname = e?._id
  }

  handleHostStudioChange(e: any,i: number) {

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


    if (this.glimitplaceflg && this.requestType == 'live') return
    if (this.prelimitplaceflg && this.requestType == 'prerecorded') return

    let guestLimit
    if (e == undefined) {
    } else {
      this.glimitplaceflg = false
    }

    const participantsArr = this.requestForm.controls[
      'participants'
    ] as FormArray

    // if (this.requestType == 'prerecorded') {
    //   ;(this.requestForm.get('participants') as FormArray)
    //     .at(0)
    //     .get('studio')
    //     ?.setValidators([Validators.required])
    //   ;(this.requestForm.get('participants') as FormArray)
    //     .at(0)
    //     .get('name')
    //     ?.setValidators([Validators.required])
    // }
  }

  Handlefocus() {
    if (
      this.requestForm.get('resourceType')?.value == null ||
      this.requestForm.get('resourceType')?.value == ''
    ) {
      ; (this.requestForm.get('participants') as FormArray).at(0).disable()
        ; (this.requestForm.get('participants') as FormArray).at(1).disable()
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

  isStudio() {
    const resouceTypeId = this.requestForm.get('resourceType')?.value
    const selectedResourceType = this.resourceTypes.find(
      (item) => item._id === resouceTypeId
    )
    let partValue = (this.requestForm.controls['participants'] as FormArray)
      .value[0]
    if (selectedResourceType?.type === 'STUDIO') {
      if (partValue) partValue.type = 'guest'
      return true
    } else {
      if (partValue) partValue.type = 'host'
      return false
    }
  }

  resourceChange($event: any) {
    if ($event?._id) {
      ; (this.requestForm.get('participants') as FormArray).at(0)?.enable()
        ; (this.requestForm.get('participants') as FormArray).at(1)?.enable()
    }

    if (this.requestType == 'live') {
      this.liveresourcetype = $event?._id
      if ($event?.name != 'Studio') {
        // if (this.glimitplaceflg) {
        //   this.glimitplaceflg = false;
        // }
        this.requestForm.get('resourceName')?.setValue(null)
      } else if ($event?.name == 'Studio') {
        this.requestForm.get('resourceName')?.setValue(null)
        // this.glimitplaceflg = true;
      }
    }
    if (this.requestType == 'prerecorded') {
      let pform = this.requestForm.get('participants') as FormArray
      if (this.isStudio()) {
        this.requestForm.get('resourceName')?.setValue(null)
        this.prelimitplaceflg = true
      } else {
        this.requestForm.get('resourceName')?.setValue(null)
        this.prelimitplaceflg = false
      }
      this.prerecordtype = $event?._id
      this.prerecordname = this.requestForm.get('resourceName')?.value
    }

    if (this.requestType == 'cameraman') {
      this.cameramantype = $event?._id
      this.requestForm.get('resourceName')?.setValue(null)
    }
  }

  addGuest() {
    const participantsArr = this.requestForm.controls[
      'participants'
    ] as FormArray
    const selectedResourceId = this.requestForm.controls['resourceName'].value
    const hostId = this.isStudio()
      ? selectedResourceId
      : (participantsArr.at(0) as FormGroup).controls['studio'].value

    const guestLimit =
      this.gStudios.find((item) => item._id === hostId)?.guestLimit ?? 0
      ; (this.requestForm.controls['participants'] as FormArray).push(
        this.addParticipant()
      )
  }

  addGuestWithValue(participantType = 'guest', studio = null, name = null,startTime = null, endTime = null) {
    (this.requestForm.controls['participants'] as FormArray).push(
      this.addParticipantWithValue(participantType, studio, name,startTime,endTime)
    )

  }

  addParticipantWithValue(participantType = 'guest', studio = null, name = null,startTime = null, endTime = null) {
    return this.fb.group({
      studio: [studio],
      name: [name],
      type: participantType,
      startTime: startTime,  
      endTime: endTime,

    })

  }



  removeGuest(index: any) {
    // this.isAddGuestLimitArrived = false;
    ; (this.requestForm.get('participants') as FormArray).removeAt(index)
  }

  removeAll() {
    let parties = this.requestForm.get('participants') as FormArray
    let i = parties.length

    // if (i > this.gGuestLimit) {
    //   for (let k = i - 1; k > this.gGuestLimit; k--) {
    //     this.removeGuest(k);
    //   }
    // }
    if (this.isStudio()) {
      // parties.at(0).get("studio")?.setValue(parties.at(1).get("studio")?.value);
      if (parties.length > 1) this.removeGuest(1)
    }
  }

  onAttachmentSelected(event: any) {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader()
      this.attachment = event.target.files[0]
      reader.readAsDataURL(event.target.files[0]) // read file as data url
      
      const file = event.target.files[0];
      
      const fileSizeInBytes = file.size;
      
      const maxSizeInBytes =  1024 * 1024; 
      
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
      }
    } else {
      this.attachmentName = 'Add attachment'
    }
  }

  removeAttachment(event: any) {
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
    requestEndDateTimeString: any,
    startTimeString: any,
    endTimeString: any
  ) {
    let msg = ''
    let isValidFlg = true

    const fromDateTime = this._date(fromDateTimeString)
    const toDateTime = this._date(toDateTimeString)
    const requestEndDateTime = this._date(requestEndDateTimeString)
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
    if (
      startDateTime > endDateTime
      // &&
      // !(startDateTime.getHours() === 23 && endDateTime.getHours() === 0)
    ) {
      this.dateValidationMsg = 'Start time must be earlier then end time'
      isValidFlg = false
    }

    if (startDateTime < new Date()) {
      this.dateValidationMsg =
        "Request date cannot be less then today's date and time"
      isValidFlg = false
    }

    if (!(fromDateTime <= toDateTime)) {
      this.dateValidationMsg =
        'Request end date cannot be less then request start date'
      isValidFlg = false
    }

    if (
      // this.calcHourDiff(startDateTime, endDateTime) > this.rangeLimit &&
      endDateTime.getDate() - startDateTime.getDate() >
      1
    ) {
      // this.toastr.warning(`The time range must be in ${this.rangeLimit} hours`);
      this.dateValidationMsg = `The time range must be involved in 2 days`
      isValidFlg = false
        ; ``
    }
    if (requestEndDateTime && requestEndDateTime < fromDateTime) {
      this.dateValidationMsg =
        'Request end date cannot be less then request start date'
      isValidFlg = false
    }

    return isValidFlg
  }

  _date(dateString: any) {
    if (dateString) {
      return new Date(
        `${dateString.year}-${dateString.month}-${dateString.day}`
      )
    }
    return dateString
  }

  calcHourDiff(date1: Date, date2: Date) {
    const diffInMs = date2.getTime() - date1.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    return diffInHours
  }

  selectionChanged(event: StepperSelectionEvent) {
    // Transition from first step to the next

    if (event.previouslySelectedIndex == 0 && !this.requestOk) {
      this.processRequestForm()
    }
  }

  callNext() {
    this.stepper.next()
  }
  handleClickNext() {
    this.processRequestForm()
  }
  callPrevious() {
    if (this.requestSlotsEdited) {
      this.stepper.previous()
    } else {
      this.stepper.steps.first.select()
    }
  }

  formSubmit() { }

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

    const startTime = request.startDateTime?.split(':')
    const endTime = request.endDateTime?.split(':')

    // These two denotes the start and end of a single request in the same day
    const requestStartDateTime = startDateTime.clone()
    const requestEndDateTime = toDateTime.clone()

    requestStartDateTime.hours(startTime[0]).minutes(startTime[1])
    requestEndDateTime.hours(endTime[0]).minutes(endTime[1])

    let primaryStartTime=requestStartDateTime.toDate().toString()
    let primaryEndTime=requestEndDateTime.toDate().toString()

   //////////////////Check Time for the Primary resource /////////////
      
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
          request.occurrenceTurns,
          resourceName
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
              resourceName,
              recurrenceValue[i],
            )
          }
        }
      }
    } else {
      const requestObj = {
        id: uuid(),
        type:"primary",
        resource:resourceName,
        startDateTime: requestStartDateTime.toDate().toString(),
        endDateTime: requestEndDateTime.toDate().toString(),
      }
      this.requestDates.push(requestObj)
    }

    this.requestDates.sort((a: any, b: any) => {
      return moment(a.startDateTime).isBefore(moment(b.startDateTime)) ? -1 : 1
    })

 ////////////////// Check time for the Particpant //////////////////

    if (request?.participants?.length > 0){    

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

       

        // if( || request?.participants[i]?.endTime)
        if (this.isISODateFormat(request?.participants[i]?.startTime) ||this.isISODateFormat(request?.participants[i]?.endTime) ) {

          const { StartDateTime, EndDateTime }= this.getHourAndMinutes(request?.participants[i]?.startTime, request?.participants[i]?.endTime)

          const startParts = StartDateTime.split(":");
          const endParts = EndDateTime.split(":");

          const startHours = parseInt(startParts[0], 10);
          const startMinutes = parseInt(startParts[1], 10);
          const endHours = parseInt(endParts[0], 10);
          const endMinutes = parseInt(endParts[1], 10);


          const requestStartParts = request.startDateTime.split(":");
          const requestEndParts = request.endDateTime.split(":");

          const requestStartHours = parseInt(requestStartParts[0], 10);
          const requestStartMinutes = parseInt(requestStartParts[1], 10);
          const requestEndHours = parseInt(requestEndParts[0], 10);
          const requestEndMinutes = parseInt(requestEndParts[1], 10);

        if(startHours >= requestStartHours &&
           startMinutes >= requestStartMinutes && 
           startHours<  requestEndHours && 
           startMinutes <  requestEndMinutes){
          startStatus=true;
         
        }
        if(StartDateTime >= request.startDateTime && StartDateTime<  request.endDateTime){
          startStatus=true;
          
        }

        // if(endHours <= requestEndHours &&
        //   endMinutes <= requestEndMinutes &&
        //   endHours >  requestStartHours && 
        //   endMinutes >  requestStartMinutes 

        //    ){
        //   endStatus=true;
        //   console.log("true2")
        // }
        if(EndDateTime <= request.endDateTime && EndDateTime >  request.startDateTime){
          endStatus=true;
         
        }

          startTime = (startStatus
          ? StartDateTime
          : request.startDateTime
        )?.split(':');

         endTime = (endStatus
          ?EndDateTime
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
              this.requestDates,
            )
          } else {
            if (['week', 'month'].includes(this.pattern)) {
              for (let j = 0; j < recurrenceValue.length; j++) {
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
                  this.requestDates,
                  recurrenceValue[j],
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
            primaryStartTime:primaryStartTime,
            primaryEndTime:primaryEndTime,
        
        
          })
        }

        
      }
    }
  }


// return;
    this.checkSlotAvailability()
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
    primaryTime:any=null,
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
        const filteredArray = primaryTime.filter((obj:any) => {

          const startDateTime = new Date(sd.clone().toDate().toString());
          const endDateTime= new Date(ed.clone().toDate().toString());

          const objStartDateTime = new Date(obj.startDateTime);
          const objEndDateTime = new Date(obj.endDateTime);
          return objStartDateTime <= startDateTime && objEndDateTime >= endDateTime;
        });

        console.log(filteredArray)
        const requestObj = {
          id: uuid(),
          type:type,
          name:name,
          resource:resource,
          startDateTime: sd.clone().toDate().toString(),
          endDateTime: ed.clone().toDate().toString(),
          primaryStartTime: filteredArray[0]?.startDateTime,
          primaryEndTime:filteredArray[0]?.endDateTime,
        }
        this.guestRequestDates.push(requestObj)
      }

      while (endDateTime.diff(ed) >= 0) {
        sd = sd.add(patternValue, pattern)
        ed = ed.add(patternValue, pattern)
        eDff = endDateTime.diff(ed)
        const filteredArray = primaryTime.filter((obj:any) => {

          const startDateTime = new Date(sd.clone().toDate().toString());
          const endDateTime= new Date(ed.clone().toDate().toString());

          const objStartDateTime = new Date(obj.startDateTime);
          const objEndDateTime = new Date(obj.endDateTime);
          return objStartDateTime <= startDateTime && objEndDateTime >= endDateTime;
        });

        console.log(filteredArray)
        if (eDff >= 0) {

          const filteredArray = primaryTime.filter((obj:any) => {

            const startDateTime = new Date(sd.clone().toDate().toString());
            const endDateTime= new Date(ed.clone().toDate().toString());
  
            const objStartDateTime = new Date(obj.startDateTime);
            const objEndDateTime = new Date(obj.endDateTime);
            return objStartDateTime <= startDateTime && objEndDateTime >= endDateTime;
          });

          const requestObj = {
            id: uuid(),
            name:name,
            resource:resource,
            type:type,
            startDateTime: sd.clone().toDate().toString(),
            endDateTime: ed.clone().toDate().toString(),
            primaryStartTime: filteredArray[0]?.startDateTime,
            primaryEndTime:filteredArray[0]?.endDateTime,
          }
          this.guestRequestDates.push(requestObj)
        } 
      
      }
    }

    if (requestEndCriteria == 'occurrence') {
      let i = 0;
      console.log("startDatetIme = " +sd.clone().toDate().toString())
      //   Check if the starting request can be started from today only
      if (sDff > 0 && eDff > 0) {

        const filteredArray = primaryTime.filter((obj:any) => {

          const startDateTime = new Date(sd.clone().toDate().toString());
          const endDateTime= new Date(ed.clone().toDate().toString());

          const objStartDateTime = new Date(obj.startDateTime);
          const objEndDateTime = new Date(obj.endDateTime);
          return objStartDateTime <= startDateTime && objEndDateTime >= endDateTime;
        });

        const requestObj = {
          id: uuid(),
          name:name,
          type:type,
          resource:resource,
          startDateTime: sd.clone().toDate().toString(),
          endDateTime: ed.clone().toDate().toString(),
          primaryStartTime: filteredArray[0]?.startDateTime,
            primaryEndTime:filteredArray[0]?.endDateTime,
        }
        this.guestRequestDates.push(requestObj)
        i++
      }
      while (i < occurrenceTurns) {
        sd = sd.add(patternValue, pattern)
        ed = ed.add(patternValue, pattern)
        eDff = endDateTime.diff(ed)
        if (i <= occurrenceTurns) {
          const filteredArray = primaryTime.filter((obj:any) => {

            const startDateTime = new Date(sd.clone().toDate().toString());
            const endDateTime= new Date(ed.clone().toDate().toString());
  
            const objStartDateTime = new Date(obj.startDateTime);
            const objEndDateTime = new Date(obj.endDateTime);
            return objStartDateTime <= startDateTime && objEndDateTime >= endDateTime;
          });
         
          const requestObj = {
            id: uuid(),
            name:name,
            type:type,
            resource:resource,
            startDateTime: sd.clone().toDate().toString(),
            endDateTime: ed.clone().toDate().toString(),
            primaryStartTime: filteredArray[0]?.startDateTime,
            primaryEndTime:filteredArray[0]?.endDateTime,
          }
          this.guestRequestDates.push(requestObj)
        }

        i++
      }
    }
  }




  checkSlotAvailability() {
    this.processing = true
    const request = this.requestForm.value

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
      
    }

    // Handle multiple resource Ids in case a resource selected is not available or already booked
    const resourceIds = []

    resourceIds.push(request.resourceName)
    if (request?.participants?.length)
      for (let i = 0; i < request.participants.length; i++) {
        if (request?.participants[i]?.studio ?? '') {
          resourceIds.push(request.participants[i].studio)
        }
      }

   
    params.resourceIds = resourceIds.join(',')
    this.preGuestTimeSlots=this.guestRequestDates;

    
    

    // Only check slot availability for request types [live, prerecorded] as they have resourced id in the payload
    if (this.requestType == 'live' || this.requestType == 'prerecorded') {
      this.guestTimeNotAvailable=false;
      this.requestService
        .checkSlotAvailability(params, this.requestDates,this.guestRequestDates).subscribe((data: any) => {
          this.processing = false
          this.allSlotsAvailable = true
          this.noSlotAvailable = false

          this.requestSlotsEdited = false

          this.requestTimeSlots = data
          this.guestTimeSlots=null;

          this.requestTimeSlots = data.filter((slot:any) => slot.request.type === 'primary');

          
      
       
          this.guestTimeSlots = data.filter((slot:any) => slot.request.type !== 'primary');        



          if(this.requestTimeSlots.length >= 1){
            console.log("recurring Booking")

            for (const requestTimeSlot of this.requestTimeSlots) {
              // Extract the date from the requestTimeSlot
              // const requestDate = requestTimeSlot.request.startDateTime.split('T')[0];
              let requestDateString = this.datePipe.transform(requestTimeSlot.request.startDateTime, 'shortDate', this.userTimeZone);
            console.log(this.guestTimeSlots)
              if(this.guestTimeSlots.length > 0){

              // Check if any matching guestTimeSlot with the same date has isAvailable set to false
              const hasUnavailableGuest = this.guestTimeSlots.some((guestTimeSlot: any) => {
                // const guestDate = guestTimeSlot.request.startDateTime.split('T')[0];
                const guestDateString = this.datePipe.transform(guestTimeSlot.request.startDateTime, 'shortDate', this.userTimeZone);
                let guestDate;
                let requestDate;
                if(guestDateString && requestDateString){

                  guestDate=new Date(guestDateString);
                  guestDate?.setHours(0, 0, 0, 0);

                  requestDate=new Date(requestDateString);
                  requestDate?.setHours(0, 0, 0, 0);
                  
                }

                return guestDate?.getTime() === requestDate?.getTime() && !guestTimeSlot.isAvailable;
              });
            
              // If at least one matching guestTimeSlot is unavailable, set secondaryAvailable to false
              if (hasUnavailableGuest) {
                requestTimeSlot.secondaryAvailable = false;
              }else{
                requestTimeSlot.secondaryAvailable = true;
              }
            }else{
              requestTimeSlot.secondaryAvailable = true;
            }
           }
          }

        console.log(this.requestTimeSlots)
       
        
          for (let i = 0; i < data.length; i++) {
            if (!data[i].isAvailable) {
              this.allSlotsAvailable = false
              this.noSlotAvailable = true
            }
            // Add resrouceIds to the request object for passing it to the request-availability component
            data[i].resourceIds = params.resourceIds
          }


          if (this.allSlotsAvailable) {
            this.reviewRequest()

            // Disable the second [availibility] step of the wizard as there are no conflicting requests
            // @ts-ignore
            this.stepper.selected.editable = false
            // @ts-ignore
            this.stepper.selected.completed = true
            // return;
            // this.callNext()
            this.goToFinalStep()
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
      this.processing = false
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
        this.stepper.selected.editable = false
        // @ts-ignore
        this.stepper.selected.completed = true

        // this.callNext();
        this.goToFinalStep()
      })
    }
  }

  requestIdsToArray(requestId:any){
    const ids = requestId ? requestId.split(",") : [];
    if(ids.length == 1 && ids[0] == ''){
        return [];
    }

    return ids;
}

  goToFirstStep() {
    if (this.requestSlotsEdited) {
      const conf = confirm('Your current changes will be lost, are you sure?')
      if (conf) {
        this.stepper.previous()
      }
    } else {
      this.stepper.previous()
    }
  }

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

  saveAvailable() {
    this.saveOnlyAvailable = true
    this.requestSlotsEdited = true
    this.goToFinalStep()
  }

  reviewRequest() {
    // To avoid copy by reference
    const data = JSON.parse(JSON.stringify(this.requestForm.value))

    const shootType = data.resourceName
      ? this.resources.filter((s) => s._id == data.resourceName)[0]?.name
      : null

    const _resourceType = data.resourceType
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

    const startTime = data.startDateTime?.split(':')
    const endTime = data.endDateTime?.split(':')

    data.requestDateTime = this._date(data.fromDateTime)
    const startDateTime = new Date(data.fromDateTime)
    const endDateTime = new Date(data.toDateTime)

    startDateTime.setHours(startTime[0])
    startDateTime.setMinutes(startTime[1])

    endDateTime.setHours(endTime[0])
    endDateTime.setMinutes(endTime[1])

    data.timeSlot = `${moment(startDateTime).format('hh:mm A')} to ${moment(
      endDateTime
    ).format('hh:mm A')}`

    if (this.requestType == 'prerecorded' || this.requestType == 'live') {
      let participants = []
      for (let i = 0; i < data.participants.length; i++) {
        if (data.participants[i].studio) {
          const studioName = this.gStudios.filter(
            (r) => r._id == data.participants[i].studio
          )[0]?.name;
      

          

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

    data.shootTypeName = shootType
    data._resourceType = _resourceType
    data.gshootTypeName = gShootType
    data.channelName = channel
    data.studioName = studio
    data.controlRoomName = cRoom
    data.startDateTime = startDateTime;
    data.endDateTime = endDateTime;
    data.requestType = this.requestType
    data.fileName = this.attachment ? this.attachment.name : null

    const editedTimeSlots = this.requestTimeSlots
    .filter((slot: any) => slot.edited !== undefined && slot.edited)
    .map((slot: any) => ({
      ...slot.request, // Copy existing properties from rts.request
      id: slot.id,
      edited:slot.edited
    }));

    if (this.saveOnlyAvailable) {

      const requestTimeSlots = this.requestTimeSlots.filter(
        (rts: any) => rts.isAvailable
      )

      data.requestTimeSlots = requestTimeSlots.map((rts: any) => {
        // return rts.request
        return {
          ...rts.request, // Copy existing properties from rts.request
          edited: rts.edited // Add the edited property
        }
      })

      const guestTimeSlots = this.guestTimeSlots.filter(
        (rts: any) => rts.isAvailable
      )

      data.guestTimeSlots = guestTimeSlots.map((rts: any) => {
        return rts.request
      })

      data.allRequestTimeSlots = this.requestTimeSlots.map((rts: any) => {
        if (rts.request) {
          return {
            ...rts.request, // Copy existing properties from rts.request
            isAvailable: rts.isAvailable // Add the isAvailable property
          }
        }
        return null;
      })  


    } else {
      data.requestTimeSlots = this.requestTimeSlots.map((rts: any) => {
        return {
          ...rts.request, // Copy existing properties from rts.request
          edited: rts.edited // Add the isAvailable property
        }
      })

   

      data.guestTimeSlots = this.guestTimeSlots.map((rts: any) => {
        return rts.request
      })

      console.log(data.guestTimeSlots)


      data.allRequestTimeSlots = this.requestTimeSlots.map((rts: any) => {
        if (rts.request) {
          return {
            ...rts.request, // Copy existing properties from rts.request
            isAvailable: rts.isAvailable // Add the isAvailable property
          }
        }
        return null;
      })  

      if (editedTimeSlots.length > 0) {
        data.exception=editedTimeSlots;
      }
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

    // Add the resourceIds to the requestObject as well
    // Handle multiple resource Ids in case a resource selected is not available or already booked
    const resourceIds = []

    if (this.requestType == 'prerecorded' || this.requestType == 'live') {
      resourceIds.push(data.resourceName)
      for (let i = 0; i < data.participants.length; i++) {
        if (data.participants[i].studio) {
          resourceIds.push(data.participants[i].studio)
        }
      }
    }

    // if (this.requestType == 'live') {
    //   resourceIds.push(data.resourceName)
    // }

    data.resourceIds = resourceIds
    this.requestObject = data
  }

  saveRequest() {
    const formData = new FormData()
    this.requestObject.details = this.requestObject.details.replace(/<br>/g, '\n');
    // formData.set('requestDateTime', this.requestObject.requestDateTime);
    // formData.set('startDateTime', this.requestObject.startDateTime);
    // formData.set('endDateTime', this.requestObject.endDateTime);
    formData.set('details', this.requestObject.details)
    formData.set('resourceIds', this.requestObject.resourceIds)

    if (this.requestType == 'cameraman') {
      formData.set('shootType', this.requestObject.shootType)
      formData.set('shootTypeName', this.requestObject.shootTypeName)
    }

    formData.set('name', this.requestObject.name)

    if (this.requestType == 'live') {
      formData.set('channel', this.requestObject.channel)
    }

    if (this.requestType == 'live' || this.requestType == 'cameraman') {
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

    formData.set('requestType', this.requestObject.requestType)
    if (this.attachment) {
      formData.set('file', this.attachment)
    }

    formData.set(
      'requestTimeSlots',
      JSON.stringify(this.requestObject.requestTimeSlots)
    )
    formData.set(
      'guestTimeSlots',
      JSON.stringify(this.requestObject.guestTimeSlots)
    )

    

    formData.set(
      'allRequestTimeSlots',
      JSON.stringify(this.requestObject.allRequestTimeSlots)
    )

    formData.set(
      'exception',
      JSON.stringify(this.requestObject.exception)
    )
    formData.set(
      'timeZone',
      this.userTimeZone
    )


    formData.set(
      'ocurrenceOptions',
      JSON.stringify(this.requestObject.ocurrenceOptions)
    )

    this.spinner.show()
    this.requestService
      .saveRequest(formData, this.requestObject.eventType)
      .subscribe({
        next: (res:any) => {
          let resourceId:any;
  
          if (res.data !== null && res.data !== undefined) {
            sessionStorage.setItem('bookingId', res.data[0].bookingId);
          
            if(res.data[0].requestType == "prerecorded"){
              sessionStorage.setItem('resourceId', res.data[0].controlRoom);
              resourceId=res.data[0].controlRoom;
            }else{
              sessionStorage.setItem('resourceId', res.data[0].resourceId);
              resourceId= res.data[0].resourceId;
            }

            this.dataService.getResourceName(resourceId).subscribe((data:any) => {
            
              sessionStorage.setItem('resourceName', data.resourceName);
            });

            sessionStorage.setItem('type',res.type);
          }
            this.spinner.hide()
            this.toastr.success('Request created')
            this.router.navigate(['/calendar']);
            // this.router.navigate(['/calendar'], {
            //   queryParams: { requestData: JSON.stringify(data) }
            // });
          },
        error: (err:any) => {
          this.spinner.hide()

          if (err.status == 409) {
            this.toastr.error(
              `${moment(err.error.data.startDateTime).format(
                'MMMM Do YYYY, h:mm:ss a'
              )} - ${moment(err.error.data.endDateTime).format('h:mm:ss a')}`,
              err.error.message
            )
          } else {
            this.toastr.error('Error creating request')
          }
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
  onRequestTimeSlotChanged(e: any) {

    console.log(e)
    console.log(this.preGuestTimeSlots)

    this.guestTimeSlots=null;

    if(e.initialState){
    this.preGuestTimeSlots = this.preGuestTimeSlots.map((gts: any) => {

      if(!e.initialState?.secondaryAvailable){

        const oldStartDate: any =  new Date(e.initialState.request.startDateTime);
        const oldEndDate: any =  new Date(e.initialState.request.endDateTime);
        const newStartDate: any =  new Date(e.request.startDateTime);
        const newEndDate: any =  new Date(e.request.endDateTime);
        
        const startTimeDifference: number = newStartDate.getTime() - oldStartDate.getTime();
        const endTimeDifference: number = newEndDate.getTime() - oldEndDate.getTime();
        
        const guestStart: any =  new Date(gts.startDateTime);
        const guestEnd: any =  new Date(gts.endDateTime);
        
        let adjustedStartTime: Date = guestStart;
        let adjustedEndTime: Date = guestEnd;
        
    
          adjustedStartTime = new Date(guestStart.getTime() + startTimeDifference);
          adjustedEndTime = new Date(guestEnd.getTime() + endTimeDifference);

        if(adjustedStartTime.getTime() < adjustedEndTime.getTime())
        {
          adjustedStartTime = new Date(guestStart.getTime() + startTimeDifference);
        }else{
          adjustedStartTime = newStartDate;
        }

        if(adjustedEndTime.getTime() > adjustedStartTime.getTime())
        {
          adjustedEndTime = new Date(guestEnd.getTime() + endTimeDifference);
        }else{
          adjustedEndTime = newEndDate;
        }
        // }
        


        // const guestStartDate = gts.startDateTime.split('T')[0];
        // const guestEndDate = gts.endDateTime.split('T')[0];
        // const eStartDate = e.request.startDateTime.split('T')[0];
        // const eEndDate = e.request.endDateTime.split('T')[0];

     
        const userStartLocalDate = this.datePipe.transform(gts.startDateTime, 'shortDate', this.userTimeZone);
        const userEndLocalDate = this.datePipe.transform(gts.endDateTime, 'shortDate',  this.userTimeZone);
        const eStartLocalDate = this.datePipe.transform(e.request.startDateTime, 'shortDate',  this.userTimeZone);
        const eEndLocalDate = this.datePipe.transform(e.request.endDateTime, 'shortDate',  this.userTimeZone);

        let guestStartDate;
        let guestEndDate ;
        let eStartDate;
        let eEndDate;

        if (userStartLocalDate && userEndLocalDate && eStartLocalDate && eEndLocalDate) {
           guestStartDate = new Date(userStartLocalDate);
           guestEndDate = new Date(userEndLocalDate);
           eStartDate = new Date(eStartLocalDate);
           eEndDate = new Date(eEndLocalDate);

           guestStartDate.setHours(0, 0, 0, 0);
           guestEndDate.setHours(0, 0, 0, 0);
           eStartDate.setHours(0, 0, 0, 0);
           eEndDate.setHours(0, 0, 0, 0);
      
          // Now you can safely use guestStartDate, guestEndDate, eStartDate, and eEndDate
      } else {
          // Handle the case where one or more dates are null
          console.error('One or more dates could not be transformed.');
      }

      if (guestStartDate?.getTime() === eStartDate?.getTime() && guestEndDate?.getTime() === eEndDate?.getTime()) {  
        console.log("Done")
        gts.oldState = { ...gts };
          gts.startDateTime = adjustedStartTime;
          gts.endDateTime =adjustedEndTime;
          gts.primaryStartTime = e.request.startDateTime;
          gts.primaryEndTime = e.request.endDateTime;
        }
        // if (guestStartDate === eStartDate && guestEndDate === eEndDate) {
        //   gts.startDateTime = adjustedStartTime;
        //   gts.endDateTime =adjustedEndTime;
        //   gts.primaryStartTime = e.request.startDateTime;
        //   gts.primaryEndTime = e.request.endDateTime;
        // }

        return gts;

      }else{

        const userStartLocalDate = this.datePipe.transform(gts.startDateTime, 'shortDate', this.userTimeZone);
        const userEndLocalDate = this.datePipe.transform(gts.endDateTime, 'shortDate',  this.userTimeZone);
        const eStartLocalDate = this.datePipe.transform(e.request.startDateTime, 'shortDate',  this.userTimeZone);
        const eEndLocalDate = this.datePipe.transform(e.request.endDateTime, 'shortDate',  this.userTimeZone);

        let guestStartDate;
        let guestEndDate ;
        let eStartDate;
        let eEndDate;

        if (userStartLocalDate && userEndLocalDate && eStartLocalDate && eEndLocalDate) {
           guestStartDate = new Date(userStartLocalDate);
           guestEndDate = new Date(userEndLocalDate);
           eStartDate = new Date(eStartLocalDate);
           eEndDate = new Date(eEndLocalDate);

           guestStartDate.setHours(0, 0, 0, 0);
           guestEndDate.setHours(0, 0, 0, 0);
           eStartDate.setHours(0, 0, 0, 0);
           eEndDate.setHours(0, 0, 0, 0);
      
          // Now you can safely use guestStartDate, guestEndDate, eStartDate, and eEndDate
      } else {
          // Handle the case where one or more dates are null
          console.error('One or more dates could not be transformed.');
      }     

  
      if (guestStartDate?.getTime() === eStartDate?.getTime() && guestEndDate?.getTime() === eEndDate?.getTime()) {  
        gts.oldState = { ...gts };
        gts.startDateTime = e.request.startDateTime;
        gts.endDateTime = e.request.endDateTime;
        gts.primaryStartTime = e.request.startDateTime;
        gts.primaryEndTime = e.request.endDateTime;
       
      }
  
      return gts;
    }

  });
}else{
  this.preGuestTimeSlots = this.preGuestTimeSlots.map((gts: any) => {

        const userStartLocalDate = this.datePipe.transform(gts.startDateTime, 'shortDate', this.userTimeZone);
        const userEndLocalDate = this.datePipe.transform(gts.endDateTime, 'shortDate',  this.userTimeZone);
        const eStartLocalDate = this.datePipe.transform(e.request.startDateTime, 'shortDate',  this.userTimeZone);
        const eEndLocalDate = this.datePipe.transform(e.request.endDateTime, 'shortDate',  this.userTimeZone);

        let guestStartDate;
        let guestEndDate ;
        let eStartDate;
        let eEndDate;

        if (userStartLocalDate && userEndLocalDate && eStartLocalDate && eEndLocalDate) {
           guestStartDate = new Date(userStartLocalDate);
           guestEndDate = new Date(userEndLocalDate);
           eStartDate = new Date(eStartLocalDate);
           eEndDate = new Date(eEndLocalDate);

           guestStartDate.setHours(0, 0, 0, 0);
           guestEndDate.setHours(0, 0, 0, 0);
           eStartDate.setHours(0, 0, 0, 0);
           eEndDate.setHours(0, 0, 0, 0);
      
          // Now you can safely use guestStartDate, guestEndDate, eStartDate, and eEndDate
      } else {
          // Handle the case where one or more dates are null
          console.error('One or more dates could not be transformed.');
      }     

  
      if (guestStartDate?.getTime() === eStartDate?.getTime() && guestEndDate?.getTime() === eEndDate?.getTime()) {  
        gts.startDateTime = gts.oldState.startDateTime;
        gts.endDateTime = gts.oldState.endDateTime;
        gts.primaryStartTime = gts.oldState.primaryStartTime;
        gts.primaryEndTime = gts.oldState.primaryEndTime;
        
      }
  
      return gts;

    });

}

 
    


    this.requestTimeSlots = this.requestTimeSlots.map((rts: any) => {
      if (rts.id == e.id) {
        rts = e
      }

      return rts
    })

 


    this.updateAllSlotsAvailableFlg()
    this.updateRequestSlotEditedFlg()

    console.log(this.preGuestTimeSlots)

    this.guestCheckSlots(this.preGuestTimeSlots)


  }
  onGuestTimeSlotChanged(e: any) {

    console.log(e)

    this.guestTimeSlots = this.guestTimeSlots.map((rts: any) => {
      if (rts.id == e.id) {
        rts = e
      }

      return rts
    })
    this.updateGuestSlotsAvailableFlg()
    this.updateGuestSlotEditedFlg()
  }

  updateGuestSlotsAvailableFlg() {
    let isEdited = false
    for (let i = 0; i < this.guestTimeSlots.length; i++) {
      if (this.guestTimeSlots[i].edited) {
        isEdited = true
        break
      }
    }

    // this.requestSlotsEdited = isEdited
  }

  updateGuestSlotEditedFlg() {
    let isAllAvailable = true
    for (let i = 0; i < this.guestTimeSlots.length; i++) {
      if (!this.guestTimeSlots[i].isAvailable) {
        isAllAvailable = false
        break
      }
    }

    this.allSlotsAvailable = isAllAvailable
  }
  updateRequestSlotEditedFlg() {
    let isEdited = false
    for (let i = 0; i < this.requestTimeSlots.length; i++) {
      if (this.requestTimeSlots[i].edited) {
        isEdited = true
        break
      }
    }

    this.requestSlotsEdited = isEdited
  }

  updateAllSlotsAvailableFlg() {
    let isAllAvailable = true
    for (let i = 0; i < this.requestTimeSlots.length; i++) {
      if (!this.requestTimeSlots[i].isAvailable) {
        isAllAvailable = false
        break
      }
    }

    this.allSlotsAvailable = isAllAvailable
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
            const StartDateTime=(startHour<10)?"0"+startHour+":"+formattedStartMinutes : startHour+":"+formattedStartMinutes
            const EndDateTime=(endHour<10)?"0"+endHour+":"+formattedEndMinutes : endHour+":"+formattedEndMinutes
            // const EndDateTime=endHour+":"+formattedEndMinutes

            const dateObject={
              StartDateTime:StartDateTime,
              EndDateTime:EndDateTime,
            }

            return dateObject;
  }

  guestCheckSlots(guestTime:any){

    const request = this.requestForm.value

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
      
    }

    let requestDate;

    this.requestService
    .checkSlotAvailability(params, requestDate,guestTime).subscribe((data: any) => {
   
      this.guestTimeSlots = data.filter((slot:any) => slot.request.type !== 'primary');

      this.preGuestTimeSlots=[];
   
      for (const slot of this.guestTimeSlots) {
        this.preGuestTimeSlots.push(slot.request);
      }

      console.log(this.guestTimeSlots)
      this.updateGuestSlotsAvailableFlg()
      this.updateGuestSlotEditedFlg()

     if(this.requestTimeSlots.length >= 1){
     

      for (const requestTimeSlot of this.requestTimeSlots) {
        // Extract the date from the requestTimeSlot

        // const requestDate = requestTimeSlot.request.startDateTime.split('T')[0];
        let requestDateString = this.datePipe.transform(requestTimeSlot.request.startDateTime, 'shortDate', this.userTimeZone);
     
        // Check if any matching guestTimeSlot with the same date has isAvailable set to false
        const hasUnavailableGuest = this.guestTimeSlots.some((guestTimeSlot: any) => {
          // const guestDate = guestTimeSlot.request.startDateTime.split('T')[0];
          const guestDateString = this.datePipe.transform(guestTimeSlot.request.startDateTime, 'shortDate', this.userTimeZone);
          let guestDate;
          let requestDate;
          if(guestDateString && requestDateString){
    
            guestDate=new Date(guestDateString);
            guestDate?.setHours(0, 0, 0, 0);
    
            requestDate=new Date(requestDateString);
            requestDate?.setHours(0, 0, 0, 0);
            
          }
          return guestDate?.getTime() === requestDate?.getTime() && !guestTimeSlot.isAvailable;
        });
      
        // If at least one matching guestTimeSlot is unavailable, set secondaryAvailable to false
        if (hasUnavailableGuest) {
          requestTimeSlot.secondaryAvailable = false;
        }else{
          requestTimeSlot.secondaryAvailable = true;
        }
      }
    }
  

    })
  }



  

}