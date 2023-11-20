import { Component, EventEmitter, ViewChild,Input, OnInit, Output } from "@angular/core";
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import * as moment from "moment";
import { NgxSpinnerService } from "ngx-spinner";
import { RequestService } from "../request.service";
import { NgStepperComponent } from 'angular-ng-stepper'
import { ViewRequestComponent } from "../view-request/view-request.component";
@Component({
  selector: "app-request-availability",
  templateUrl: "./request-availability.component.html",
  styleUrls: ["./request-availability.component.scss"],
})
export class RequestAvailabilityComponent implements OnInit {
  @Input() request: any;
  @Input() eventType!: any;
  initialRequest!: any;
  start!: string;
  end!: string;
  newTimeSlotAvailable: any = null;
  validTimeslot = true;
  validTime:boolean=false;
  showEditPrimary:boolean=false;
  selectedRequest!: any;
  guestNotAvailable:boolean=false;
  modaleRef!: NgbModalRef;
  @ViewChild('cdkStepper') stepper!: NgStepperComponent
  @Output() timeSlotChanged: EventEmitter<any> = new EventEmitter();
  constructor(
    private requestService: RequestService,
    private spinner: NgxSpinnerService,
    private modal: NgbModal
  ) {}

  ngOnInit(): void {
    this.initialRequest = JSON.parse(JSON.stringify(this.request));


  }

  viewRequestDetails(requestId: any) {
    this.requestService.findOne(requestId).subscribe((data: any) => {
      this.selectedRequest = data.request;
      this.openRequestViewModal();
    });
  }

  openRequestViewModal() {
    this.modaleRef = this.modal.open(ViewRequestComponent, { size: "lg" });
    this.modaleRef.componentInstance.request = this.selectedRequest;
    this.modaleRef.componentInstance.showActions = false;
  }

  resetRequest() {
    console.log("this one")
    if (this.request.edited) {
      this.request = this.request.initialState;
      this.timeSlotChanged.emit(this.request);
    }
  }

  showEdit(){
    this.showEditPrimary=true
    console.log("clicked")
  }

  validateTimslots() {

  

    if (this.start && this.end) {

      if(this.initialRequest.type.includes("primaryResource")){

        const startTime = moment(this.start, "hh:mm");
        const endTime = moment(this.end, "hh:mm");
        this.validTimeslot = endTime.isAfter(startTime);

      }else{
console.log(this.initialRequest)

    const { primaryStartDateTime, primaryEndDateTime }= this.getHourAndMinutes(this.initialRequest.request.primaryStartTime,this.initialRequest.request.primaryEndTime)

      const startTime = moment(this.start, "hh:mm");
      const endTime = moment(this.end, "hh:mm");
      const primartStartTime = moment(primaryStartDateTime, "hh:mm");
      const primartEndTime = moment(primaryEndDateTime, "hh:mm");

      if (startTime.isSameOrAfter(primartStartTime) && endTime.isSameOrBefore(primartEndTime)) {
        this.validTimeslot = true;
        console.log("true")
      } else {
        this.validTimeslot = false;
        console.log("false")
      }

      // this.validTimeslot = endTime.isAfter(startTime);
    }
  }
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

    //  const StartDateTime=startHour+":"+formattedStartMinutes
    //  const EndDateTime=endHour+":"+formattedEndMinutes

    const StartDateTime=(startHour<10)?"0"+startHour+":"+formattedStartMinutes : startHour+":"+formattedStartMinutes
    const EndDateTime=(endHour<10)?"0"+endHour+":"+formattedEndMinutes : endHour+":"+formattedEndMinutes

    

     const dateObject={
       primaryStartDateTime:StartDateTime,
       primaryEndDateTime:EndDateTime,
     }

     return dateObject;
}

  updateTimeSlot() {
    if (this.start && this.end) {
      const startTime = this.start.split(":");
      const endTime = this.end.split(":");
      console.log("Request Start")
      console.log(this.request)
      console.log("Request End")

      const startDateTime = moment(this.request.request.startDateTime)
        .hours(Number(startTime[0]))
        .minutes(Number(startTime[1]));
      const endDateTime = moment(this.request.request.endDateTime)
        .hours(Number(endTime[0]))
        .minutes(Number(endTime[1]));

      const params = {
        resourceIds: this.request.resourceIds,
      };

      let data;

      if(this.initialRequest.type.includes("primaryResource")){

       data = [
        {
          id: this.request.request.id,
          name:this.request.request.name,
          type:"primary",
          resource: this.request.request.resource,
          startDateTime: startDateTime.toDate(),
          endDateTime: endDateTime.toDate(),
        },
      ];

    }

      let participantData;

      if(this.initialRequest.type.includes("secondary")){


         participantData = [
          {
            id: this.request.request.id,
            name:this.request.request.name,
            type:this.request.request.type ,
            resource: this.request.request.resource,
            startDateTime: startDateTime.toDate(),
            endDateTime: endDateTime.toDate(),
            primaryStartTime: this.request.request.primaryStartTime,
            primaryEndTime:this.request.request.primaryEndTime,
          },
        ];
      }



      // this.spinner.show(this.request.id);
      this.requestService.checkSlotAvailability(params, data,participantData).subscribe({
        next: (res: any) => {
          console.log(res)
          this.spinner.hide(this.request.id);
          if (!res[0].isAvailable) {
            this.newTimeSlotAvailable = false;
            // this.request = res[0];
          } else {
           
            this.newTimeSlotAvailable = true;
            const initialState = JSON.parse(JSON.stringify(this.request));
            // For single requests it is always of size 1
           
            this.request = res[0];
            this.request.id = initialState.id;
            this.request.edited = true;
            this.request.initialState = initialState;

            console.log(this.request)

            this.timeSlotChanged.emit(this.request);
          }
        },
        error: (err) => {
          this.spinner.hide(this.request.id);
          console.log("Error occured: ", err);
        },
      });
    }
  }
}
