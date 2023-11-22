import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { Data, Router } from "@angular/router";
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import * as moment from "moment";

import { NgxSpinnerService } from "ngx-spinner";
import { ToastrService } from "ngx-toastr";
import { Subscription, map } from "rxjs";
import { environment } from "src/environments/environment";
import { Globals } from "../core/_helper/globals";
import { BaseService } from "../core/_services/base.service";
import { DataService } from "../core/_services/data.service";
import { Utils } from "../core/_services/util.service";
import { RequestService } from "../request/request.service";
import { ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';

import { ViewRequestComponent } from "../request/view-request/view-request.component";
import { DashboardService } from "./dashboard.service";
import { AdminService } from "../admin/admin.service";
import * as _ from "lodash";
import { ProjectRouterService } from "../core/_services/project.router.service";
import { RequestFormData } from "../core/_models/request.form";
import * as pako from 'pako'; // Import the pako library
import { firstValueFrom } from 'rxjs';

// For more info on this library, visit: https://github.com/vkurko/calendar
declare const EventCalendar: any;
declare const Pusher: any;



@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bookingIdElement', { static: false }) bookingIdElement!: ElementRef | undefined;

  @ViewChild("eventMonthTemplate") eventMonthTemplate!: TemplateRef<any>;
  @ViewChild("confirmModalContent") confirmModalContent!: TemplateRef<any>;
  @ViewChild("RequestCreatedModalContent") RequestCreatedModalContent!: TemplateRef<any>;
  @ViewChild("RequestAutoApprovalStatus") RequestAutoApprovalStatus!: TemplateRef<any>;
  @ViewChild("ResourceOwnerShip") ResourceOwnerShip!: TemplateRef<any>;
  @ViewChild("resourceBookingModal") resourceBookingModal!: TemplateRef<any>;
  scrollTime = "";
  requests: any = [];

  requestStatuses = ["approved", "pending", "rejected"];
  resourcesToFilterOut: Array<any> = [];
  ec: any = {}; // calendar object,
  modalObject: any = {};
  resources: Array<any> = [];
  resources_sort_name: Array<any> = [];
  timeSlots = ["00 hr:15 min", "00 hr:30 min", "00 hr:45 min", "01 hr:00 min"];
  selectedTimeSlot = this.timeSlots[0];
  firstLoad = true;
  myRequestsOnly = false;
  viewType = "Daily";
  scrolledLength: number = 0;

  selectedRequest!: any;
  modaleRef!: NgbModalRef;
  userDetails!: any;
  allResourceToggled = true;
  controller!: AbortController;
  selectedDate!: any; // date value when a date item is clicked
  selectedEvent!: any;
  cmListener!: any;
  eventsFetchInterval!: any;
  resourceTypes: any[] = [];
  subscriptions = new Subscription();
  

  showFilterStatus:boolean = false;
  resourceName:any;
  isUpdated:boolean=false; 
    isCreated:boolean=false; 
  bookingId!: any;  
  copiedClass:any="bi bi-stack copySty";

   pendingRequest:number = 0;
   approvedRequest:number = 0;
   rejectedRequest:number = 0;
   resourcesFetched = false;
   fetchedResources:any;
   initializedStatus:any=false;
   getFilterResources:any=[];
   resourceList:any=[];
   loadingInProgress: any ;
   isElementVisible = false; 

   copiedBookingClass:any="bi bi-clipboard";
   copyListener!: any;
   copyRequestId:any;
   bookingData:any;
   resourceData:any=[];
   selectedResourceId:any;
   isRecurring:boolean=false;
   requestStatus:any;

   filterPendingRequest:boolean = false;
   filterApprovedRequest:boolean = false;
   filterRejectedRequest:boolean = false;


   resourceOwnerData: { [key: string]: string[] } = {};

   allChannel:any;
   allShootType:any;
   allControlRoom:any;

   allBookingData:any;
   resourceBookings:any=[];
   bookingResources:any=[];

   requestBookingId:any;

   showAlternateView: boolean = false;
   refreshPerformed : boolean = false;

   bookingResourceTitle:any;
    

  constructor(
    private dashboardService: DashboardService,
    private projectRouterService: ProjectRouterService,
    private utils: Utils,
    private requestService: RequestService,
    private baseService: BaseService,
    private dataService: DataService,
    private router: Router,
    private modal: NgbModal,
    private toast: ToastrService,
    private globals: Globals,
    private spinner: NgxSpinnerService,
    private adminService: AdminService,
    private cdRef: ChangeDetectorRef,
    private datePipe: DatePipe
  
  ) {}

  async ngOnInit() {
    // Initialize scroll time
    const eventWrapper = document.querySelector('.eventWrapper') as HTMLElement; // Use type assertion
    eventWrapper.style.visibility = 'hidden';
    this.spinner.show(); 
    const d = new Date();
    this.scrollTime = `${this.utils._pad(d.getHours())}:${this.utils._pad(d.getMinutes())}:${this.utils._pad(d.getSeconds())}`;
    
    await this.getUserPreferences();
    // this.getResources();
    this.listenToNewRequests();
    this.getResourceTypes();
    this.getAllChannel();
    this.getAllShootType();
    this.getAllControlRoom();
  
    if (sessionStorage.getItem('type') == "created" || sessionStorage.getItem('type') == "updated") {
      if (sessionStorage.getItem('type') == "created") {
        this.isCreated = true;
      }
      if (sessionStorage.getItem('type') == "updated") {
        this.isUpdated = true;
      }
  
      this.bookingId = sessionStorage.getItem('bookingId');
      this.resourceName = sessionStorage.getItem('resourceName');
     
      const resourceId = sessionStorage.getItem('resourceId');
  
     
  
      if (this.userDetails?.preferences?.resourceFilters?.includes(resourceId)) {
        this.showFilterStatus = false;
      } else {
        this.showFilterStatus = true;
      }
  
      // Move the change detection to after setting all the values
     
  
      setTimeout(() => {
        // this.cdRef.detectChanges();
        this.resourceName = sessionStorage.getItem('resourceName');
        this.modaleRef = this.modal.open(this.RequestCreatedModalContent, {
          backdrop: "static",
          size: "sm",
          keyboard: false,
          windowClass: 'custom-modal'
        });
       
      }, 1000);
    }

  
  }
  

  ngAfterViewInit(): void {

    if (!this.resourcesFetched) {
      // Resources are not fetched yet, so don't initialize FullCalendar
      return;
    }

    this.getTimeSlot();      
    this.initializeEvent();    
    this.getCalendarType();    
    this.getTimeIndicator();
    this.addContextMenuListeners();
    

    document
    ?.getElementById("ec")
    ?.addEventListener("scroll", this.onScroll.bind(this));
    

      
  }

  getAllChannel() {
    const response = this.dashboardService.getAllChannel().subscribe({
      next: (res: any) => {
        this.allChannel = res;

      },
      error: (err: any) => {},
    });
  }
  getAllShootType() {
    const response = this.dashboardService.getAllShootType().subscribe({
      next: (res: any) => {
        this.allShootType = res;
     
      },
      error: (err: any) => {},
    });
  }
  getAllControlRoom() {
    const response = this.dashboardService.getAllControlRoom().subscribe({
      next: (res: any) => {
        this.allControlRoom = res;

      },
      error: (err: any) => {},
    });
  }

copyBookingIdToClipboard() {
    const el = document.createElement('textarea');
    el.value = this.bookingId;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.copiedClass="bi bi-check-all copySty";
  }
  
  

  closeModal(){
    this.modaleRef.close();
    sessionStorage.clear();
    this.showFilterStatus=false;
    this.isCreated=false;
    this.isUpdated=false; 
    this.selectedResourceId=null;
    this.isRecurring=false;
    this.requestStatus=null;
    this.requestBookingId=null;
    // this.showAlternateView =false;
   
  
  }

  getTimeSlot() {
    this.adminService.getTimeSlot().subscribe({
      next: (res: any) => {
        if (res == "none") {
          this.ec.setOption("slotDuration", this.timeSlots[0]);
          this.selectedTimeSlot = this.timeSlots[0];
        } else {
          this.ec.setOption("slotDuration", res);
          this.selectedTimeSlot = res;
        }
      },
      error: (err: any) => {
        console.log({ err });
      },
    });
  }

  getCalendarType() {
    this.adminService.getCalendarType().subscribe({
      next: (res: any) => {
        const viewTypes = {
          dayGridMonth: "Monthly",
          timeGridWeek: "Weekly",
          resourceTimeGridDay: "Daily",
        };
        this.viewType =
          viewTypes[(res as keyof typeof viewTypes) ?? "resourceTimeGridDay"];

        setTimeout(() => {
          const ecDayElements = document.querySelectorAll(".ec-day");
         
          for (let i = 0; i < ecDayElements.length; i++) {
            const ecDayElement = ecDayElements[i] as HTMLElement;
            if (!this.hasDeepChildWithClass(ecDayElement, "ec-event-body")){
              ecDayElement.setAttribute(
                "title",
                "Please click to open daily view."
              );
           
            }

          }
        }, 3000);

        if (res == "timeGridWeek") {
          document.getElementById("ec")?.classList.add("week-view");
        } else {
          document.getElementById("ec")?.classList.remove("week-view");
        }
       
        if (!res || res=="") {
          this.ec.setOption("view", "resourceTimeGridDay");
          this.viewType="Daily"
          // this.ec.setOption("view", "daily");
        } else {
          this.ec.setOption("view", res);
        }
      },
      error: (err: any) => {console.log("Error Occured")},
    });
  }

  hasResources(t: any) {
    return Boolean(this.resources.find((item) => item.type === t._id)?.type);
  }
  onScroll() {
    this.scrolledLength = document?.getElementById("ec")?.scrollLeft ?? 0;

    const elements = document.querySelectorAll(".ec-sidebar");
    elements.forEach((element: any) => {
      if (this.scrolledLength > 3) {
        element.style.borderLeft = "1px solid #dadce0";
        element.style.borderRight = "1px solid #dadce0";
        element.style.marginLeft = "-0.5px";
      } else {
        element.style.borderLeft = "none";
        element.style.borderRight = "none";
        element.style.marginLeft = "0px";
      }
    });

    const contentElements = document.querySelectorAll(".ec-content");
    contentElements.forEach((contentElement: any) => {
      const sidebarElements = contentElement.querySelectorAll(".ec-sidebar");
      sidebarElements.forEach((sidebarElement: any) => {
        sidebarElement.style.marginLeft = `${this.scrolledLength - 0.5}px`;
      });
    });

    // const childElements = document.querySelectorAll('.ec-sidebar-title')
    // childElements.forEach((element: any) => {
    //   element.style.marginLeft = `-${this.scrolledLength-1}px`
    // })
  }


  addContextMenuListeners() {

    const elements = document.querySelectorAll('.ec-events');
    elements.forEach(element => {
        element.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });
    });
   
    this.controller = new AbortController();
    document.addEventListener(
      "click",
      (e: any) => {
        if (!e.target.classList.contains("create-request-action")) {
          this.hideMenu();
          this.hideCopyBookingId();
        }
      },
      false
    );

    this.cmListener = this.handleContextMenuListener.bind(this);

    document.addEventListener("contextmenu", this.cmListener, false);
  }


  handleContextMenuListener(e: any) {
    // Hide the menu on right click, wherever
    if (document.getElementById("contextMenu")?.style.display == "block") {
      e.preventDefault();
      this.hideMenu();
    }

    if (
      e.target.classList.contains("ec-extra") ||
      e.target.classList.contains("ec-day") ||
      e.target.classList.contains("ec-day-head")
    ) {
      if (this.globals.principal.hasAuthority(["CREATE_REQUEST"])) {
        const event = new Event("click");
        const ee = new MouseEvent("click", {
          clientX: e.clientX,
          clientY: e.clientY,
        });

        if (e.target.classList.contains("ec-extra")) {
          (e.target.parentNode as HTMLElement).dispatchEvent(ee);
        } else {
          e.target.dispatchEvent(event);
        }
        e.preventDefault();

        if (document.getElementById("contextMenu")?.style.display == "block")
          this.hideMenu();
        else {
          this.hideCopyBookingId();
          this.copyRequestId=null;
          this.bookingData=null;
          this.requestStatus=null;
          const menu = document.getElementById("contextMenu");

          // @ts-ignore
          menu.style.display = "block";
          // @ts-ignore
          menu.style.position = "absolute";
          // @ts-ignore
          menu.style.left = e.pageX + "px";
          // @ts-ignore
          menu.style.top = e.pageY + "px";
        }
      }
    }
  }

  hideMenu() {
    if (document.getElementById("contextMenu")) {
      // @ts-ignore
      document.getElementById("contextMenu").style.display = "none";
    }
  }

  addRequest() {
    if (this.globals.principal.hasAuthority(["CREATE_REQUEST"])) {
      const params: any = {};
      const date = new Date(this.selectedEvent?.date);
      if (date.getTime() < new Date().getTime()) {
        this.toast.info("Date must be greater then today's date");
        return;
      }
      params.date = this.selectedEvent?.date;
      this.hideMenu();

      // Check if the resource is also available
      const resourceId = this.selectedEvent?.resource?.id;
      let selectedResource!: any;
      if (resourceId) {
        selectedResource = this.resources.filter((rs) => rs._id == resourceId);
        if (selectedResource && selectedResource.length == 1) {
          params.resource = selectedResource[0]._id;
          params.r_type = selectedResource[0].type;
        }
      }
      this.router.navigate(["/request", "new"], {
        queryParams: params,
      });
    } else {
      this.toast.info("You do not have permission to create a request");
    }
  }

  getResourceTypes() {
    const response = this.adminService.getResourceType("all").subscribe({
      next: (res: any) => {
        this.resourceTypes = res;
      },
      error: (err: any) => {},
    });
  }

  async getUserPreferences() {
    const data = await firstValueFrom(this.dataService.getUserPreferences());
    this.userDetails = data || {};
    
    this.getResources();
  }


  getResources() {
    this.dashboardService
      .getResources()
      .pipe(
        map((data: any) => {
          return data.map((d: any) => {
            if (this.userDetails.preferences?.resourceFilters?.length) {
              if (
                this.userDetails.preferences?.resourceFilters?.includes(d._id)
              ) {
                d.checked = true;
              } else {
                d.checked = false;
                // If a single resource is unchecked then the toggleAll check must be unchecked;
                this.allResourceToggled = false;
              }
            } else {
              d.checked = true;
            }
            return d;
          });
        })
      )
      .subscribe((data: any) => {
        this.resources = _.orderBy(data, ["name"], ["asc"]);
        this.resources_sort_name = _.orderBy(data, ["orderId"], ["asc"]);
      
        this.resourcesToFilterOut = this.getFilteredResourcesIds();
        const rs = this.resources_sort_name
          .filter((d) => this.resourcesToFilterOut?.includes(d._id))
          .map((d) => {
            return {
              id: d._id,
              title: d.name,
              titleHTML: d.name,
              type: d.type,
           
            };
          });
          this.resourceList=[];
          const Resource = this.resources_sort_name
          .filter((d) => this.resourcesToFilterOut?.includes(d._id))
          .map((d) => {

            if (!this.resourceList.includes(d.name)) {
              this.resourceList.push(d.name);
            }
          });
          
          this.fetchedResources=rs;
          this.resourcesFetched = true;
     
          if (this.initializedStatus == true) {
            this.ec.setOption("resources", rs);
            this.ec.refetchEvents();
          }else{
            this.cdRef.detectChanges();
            this.ngAfterViewInit();

          }
  
      });
  }

  initializeEvent() {
    const self = this; // Capture the component instance

    this.ec = new EventCalendar(document.getElementById("ec"), {
    
      view: "resourceTimeGridDay",
      height: "74vh",
      firstDay: 1,
      flexibleSlotTimeLimits: false,
      eventStartEditable: false,
      eventDurationEditable: false,
      slotMinTime: "00:00",
      datesAboveResources:false,
      titleFormat: this.titleFormat.bind(this),
      dayHeaderFormat: this.dayHeaderFormat.bind(this),
      headerToolbar: {
        start: "prev next title today",
        center: "",
        end: "",
      },
      buttonText: function (texts: any) {
   
        texts.resourceTimeGridWeek = "resources";
        texts.today="Today"

    
        return texts;
      },
      scrollTime: this.scrollTime,
      slotDuration: this.timeSlots[0],
      slotHeight: 50,
      views: {
        timeGridWeek: {
          pointer: true,
        },
        resourceTimeGridWeek: {
          pointer: true,
        },
      },
      dayMaxEvents: true,
      nowIndicator: true,
      lazyFetching:false,
      filterResourcesWithEvents:false,
      eventSources: [ 
        {
          events:  this.fetchEvents.bind(this),
          cache:false,
        },
      ],
      resourceLabelDidMount:function (info:any) {
       
      },
       loading:function(isLoading:any){
        const eventWrapper = document.querySelector('.eventWrapper') as HTMLElement; // Use type assertion
        self.loadingInProgress = isLoading; 
   
        if (eventWrapper) {
            if (isLoading ) {
            
              eventWrapper.style.visibility = 'hidden';
              self.spinner.show(); 
              
            } else {             
       
                self.initializedStatus=true;
               if (!self.refreshPerformed) {
                  self.refreshPerformed = true;
                  self.refreshCalendar();
                }else{
                  eventWrapper.style.visibility = 'visible';
                  self.spinner.hide();
                  console.log("Refresh Completed")
                }
              
            }
        }
      },
    
      dateClick: this.clickDate.bind(this),
      datesSet: this.dateSet.bind(this),
      eventClick: this.eventClick.bind(this),
      eventContent: this.eventContent.bind(this),
      eventMouseEnter: this.onMouseEnter.bind(this),
      eventMouseLeave: this.onMouseLeave.bind(this),
      eventDidMount: this.onEventMount.bind(this),
      viewDidMount:function (info:any) { }
      
    });
    // this.ec.refetchEvents()
    this.ec.setOption("resources",  this.fetchedResources);


    
  }

  refreshCalendar(){
      
    if(this.initializedStatus){
      console.log("Refreesh Happnmed")
      this.ec.refetchEvents()      
    }
  }

  getFilterRequestOnly(){

    // this.ec.setOption("date", date);
    //   // this.ec.setOption("scrollTime", scrollTime);
    //   setTimeout(() => {
    //     this.ec.setOption("view", "resourceTimeGridDay");
    //     this.viewType = "Daily";

    //     setTimeout(() => {
    //       // const doc = document.querySelector(
    //       //   `[data-id='${eventObj.event.extendedProps?.request?._id}']`
    //       // )
    //       // doc?.scrollIntoView({
    //       //   behavior: 'smooth',
    //       //   block: 'center',
    //       // })
    //     }, 10);
    //   }, 10);
// this.cdRef.detectChanges()
    // this.ec.setOption("resources",  this.fetchedResources);
    this.ec.refetchEvents()
   
  }

  highlightResources(status:any){

    const ecDayElements = document.querySelectorAll(".ec-day");

   

   // Iterate over each ecDayElement
for (let i = 0; i < ecDayElements.length; i++) {
  const ecDayElement = ecDayElements[i] as HTMLElement;

  if (ecDayElement.classList.contains("ec-today")) {
    continue; // Skip this element
  }


    // Check if the inner HTML of the element contains any of the FILTERED RESOURCES
    const resourceElement = !/<[^>]*>/.test(ecDayElement.innerHTML) && this.resourceList.some((resource: any) => ecDayElement.innerHTML.includes(resource));
    const hasFilterResource = !/<[^>]*>/.test(ecDayElement.innerHTML) && this.getFilterResources.some((resource: any) =>
        ecDayElement.textContent?.trim() === resource.trim()
    );

                              
                        
  


    if (status == false) {
      if (resourceElement) {
        ecDayElement.style.backgroundColor = "white";
      }
    } else {
      if (hasFilterResource) {
      
        ecDayElement.style.backgroundColor = "yellow";
      } else {

        if (resourceElement) {

          ecDayElement.style.backgroundColor = "white";
        }
        
      }
    }
  
}

  }
  
  /**
   * This method fetches events for the calendar, the calendar calls it internally when a change in the date
   * range occurs or if the view is changed.
   * The requests are cached and no new request for the same date range will be made
   * @param fetchInfo Details of the fetch event
   * @param successCallback Called if the events are fetched successfully
   * @param failureCallback Called in case of some error
   */
  fetchEvents(fetchInfo: any, successCallback: any, failureCallback: any) {  
  
    const params = {
      start: moment(fetchInfo.startStr).format(), // start of the date range, calendar passess it itself
      end: moment(fetchInfo.endStr).format(), // end of the date range, calendar passess it itself
      // Passing the statuses to return the requests for those statuses only
      statuses: this.requestStatuses.join(","),
      // This set the request filters based on the ownership, i.e all requests or only user's.
      myRequestsOnly: this.myRequestsOnly,
      // Resources to filter out while fetching requests
      resources: this.resourcesToFilterOut.join(","),
    };  

    console.log("Fetched Event function")
    if(params.resources == ""){
      console.log("There are Resources.")
    }

  

    this.dashboardService.fetchEvents(params).subscribe({
      next:async (data: any) => {
   
        this.pendingRequest = 0;
        this.approvedRequest = 0;
        this.rejectedRequest = 0;
        this.getFilterResources=[];
        // this.resourceList=[];
    
       
        const startRange = new Date(params.start).getTime();
        const endRange = new Date(params.end).getTime();
      
        const newData: any[] = [];

        this.allBookingData=[];

        for (let i = 0; i < data.length; i++) {
          const startDate = new Date(data[i].start);
          const endDate = new Date(data[i].end);
          const requestType=data[i].extendedProps.request.requestType;
 
      
          if(data[i].status=="pending" && this.filterPendingRequest){
           continue;
          }
          if(data[i].status=="approved" && this.filterApprovedRequest){
           continue;
          }
          if(data[i].status=="rejected" && this.filterRejectedRequest){
           continue;
          }


          if (
            startDate.getTime() >= startRange &&
            endDate.getTime() < endRange
          ) {
            if (startDate.getDate() === endDate.getDate()) {

              const approvalsList=data[i].extendedProps.request.approvals;
             
              if(approvalsList != undefined)  {
                if(approvalsList.length == 0){
                   try {
                      const controlRoomName = data[i].extendedProps.request.controlRoom.name;
                      if (!this.getFilterResources.includes(controlRoomName)) {
                        this.getFilterResources.push(controlRoomName);
                      }
                  } catch (error) {
                      const controlRoomName = data[i].extendedProps.request.resourceId.name;
                      if (!this.getFilterResources.includes(controlRoomName)) {
                        this.getFilterResources.push(controlRoomName);
                      }
                  }

                }else{


                  for (let j = 0; j < approvalsList.length; j++) {
                    const resourceName = approvalsList[j].resource.name;
                
                    if (!this.getFilterResources.includes(resourceName)) {
                      this.getFilterResources.push(resourceName);
                    }
                  }
                }

              } 

              if(requestType == "schedule"){
                const resourceName = data[i].extendedProps.request.resourceId.name;
                if (!this.getFilterResources.includes(resourceName)) {
                  this.getFilterResources.push(resourceName);
                }
              }
              
             
              
         

              

              let requestData=data[i].extendedProps.request;

            
             
              if(data[i].status == "pending"){
               
                if(data[i].primaryRequest &&  data[i].primaryRequest == 1 ){ 
                
                  if( requestData.resourceId && this.resourcesToFilterOut.includes(requestData.resourceId._id) ){
                    
                    this.pendingRequest++;
                                     
                  }
                  if( requestData.controlRoom && this.resourcesToFilterOut.includes(requestData.controlRoom._id) ){

                    this.pendingRequest++;
                                  
                  }
                }else{
                  this.pendingRequest++;
                                   
                }      
              }

          


              if(data[i].status == "approved"){
                if(data[i].primaryRequest &&  data[i].primaryRequest == 1 ){ 
                 
                  if( requestData.resourceId && this.resourcesToFilterOut.includes(requestData.resourceId._id) ){
                    
                    this.approvedRequest++;
                                    
                  }
                  if( requestData.controlRoom && this.resourcesToFilterOut.includes(requestData.controlRoom._id) ){

                    this.approvedRequest++;
                                     
                  }
                }else{
                  this.approvedRequest++;
                                 
                }               
              }

              if(data[i].status == "rejected"){
               
                if(data[i].primaryRequest &&  data[i].primaryRequest == 1 ){ 
                  
                  if( requestData.resourceId && this.resourcesToFilterOut.includes(requestData.resourceId._id) ){
                    
                    this.rejectedRequest++;
                                    
                  }
                  if( requestData.controlRoom && this.resourcesToFilterOut.includes(requestData.controlRoom._id) ){

                    this.rejectedRequest++;
                                     
                  }
                }else{
                  this.rejectedRequest++;
                                
                }    
              }

            }

            this.allBookingData.push(data[i]);
          
          }

          if (
            startDate.getTime() > startRange &&
            endDate.getTime() < endRange
          ) {
            if (startDate.getDate() === endDate.getDate()) {

              const approvalsList=data[i].extendedProps.request.approvals;
 
              if(approvalsList != undefined)  {
                for (let j = 0; j < approvalsList.length; j++) {
                  const resourceName = approvalsList[j].resource.name;
              
                  if (!this.getFilterResources.includes(resourceName)) {
                    this.getFilterResources.push(resourceName);
                  }
                }

              }  


              if(requestType == "schedule"){
                const resourceName = data[i].extendedProps.request.resourceId.name;
                if (!this.getFilterResources.includes(resourceName)) {
                  this.getFilterResources.push(resourceName);
                }
              }

             
        
              newData.push({
                ...data[i],
                start: new Date(data[i].start),
                end: new Date(data[i].end),
              });
            } else {


        
              newData.push({
                ...data[i],
                end: new Date(this.getEndTimeOfDay(data[i].start)),
                start: new Date(data[i].start),
                extendedProps: {
                  request: {
                    ...data[i].extendedProps.request,
                    endDateTime: new Date(this.getEndTimeOfDay(data[i].start)),
                    continutaion: "from",
                  },
                  ...(data[i].extendedProps && data[i].extendedProps.primaryRequest
                    ? { primaryRequest: 1 }
                    : {}),

                  ...(data[i].extendedProps && data[i].extendedProps.secondaryRequest
                    ? { secondaryRequest: 1 }
                    : {}),
                },
              });
              newData.push({
                ...data[i],
                end: new Date(data[i].end),
                start: new Date(this.getStartTimeOfDay(data[i].end)),
                extendedProps: {
                  request: {
                    ...data[i].extendedProps.request,
                    startDateTime: new Date(
                      this.getStartTimeOfDay(data[i].end)
                    ),
                    continutaion: "to",                    
                  },
                  ...(data[i].extendedProps && data[i].extendedProps.primaryRequest
                    ? { primaryRequest: 1 }
                    : {}),

                  ...(data[i].extendedProps && data[i].extendedProps.secondaryRequest
                    ? { secondaryRequest: 1 }
                    : {}),
                },
              });
            }
          }
          if (
            startDate.getTime() <= startRange &&
            endDate.getTime() <= endRange
          ) {
         
            newData.push({
              ...data[i],
              start: new Date(startRange),
              end: new Date(data[i].end),
              extendedProps: {
                request: {
                  ...data[i].extendedProps.request,
                  startDateTime: new Date(startRange),
                  continutaion: "to",
                 
                },
                ...(data[i].extendedProps && data[i].extendedProps.primaryRequest
                  ? { primaryRequest: 1 }
                  : {}),

                ...(data[i].extendedProps && data[i].extendedProps.secondaryRequest
                  ? { secondaryRequest: 1 }
                  : {}),
              },
            });
          }
          if (
            startDate.getTime() >= startRange &&
            endDate.getTime() >= endRange
          ) {
            newData.push({
              ...data[i],
              start: new Date(data[i].start),
              end: new Date(this.getEndTimeOfDay(data[i].start)),
              extendedProps: {
                request: {
                  ...data[i].extendedProps.request,
                  endDateTime: new Date(this.getEndTimeOfDay(data[i].start)),
                  continutaion: "from",
                },
                ...(data[i].extendedProps && data[i].extendedProps.primaryRequest
                  ? { primaryRequest: 1 }
                  : {}),

                ...(data[i].extendedProps && data[i].extendedProps.secondaryRequest
                  ? { secondaryRequest: 1 }
                  : {}),
              },
            });
          }
        }
        // data = data.map((d: any) => {
        //   //Preparing the data objects for the calendar to be able to use
        //   d.start = new Date(d.start)
        //   d.end = new Date(d.end)
        //   // d.title = 'Testing testing';
        //   return d
        // })
  
        this.requests = newData;
        
        console.log(" Fetched Data Stopped and length is : "+newData.length);
      
 

        if(this.pendingRequest == 0 && this.approvedRequest == 0 && this.rejectedRequest == 0 ){
          this.highlightResources(false)
        }else{
          this.highlightResources(true)
        }

        this.getCalendarBookingData();
        successCallback(newData);

      },
      error: (err) => {
   
        failureCallback(err);
      },
    });
  }

  

  dayHeaderFormat(date: any) {
    let format = "dddd MMM DD";
    if (this.ec?.view && this.ec.view.type == "dayGridMonth") {
      format = "dddd";
    }
    return moment(new Date(date)).format(format);
  }

  titleFormat(date: any) {
    let format = "dddd DD MMM YYYY";
    if (this.ec?.view && this.ec.view == "dayGridMonth") {
    }
    return moment(new Date(date)).format(format);
  }



  getRequestList(){    

    const params = {
     
      start:this.generateFormattedDate(this.ec.view.currentStart),
      end:this.generateFormattedDate(this.ec.view.currentEnd),
      // start: moment(fetchInfo.startStr).format(), // start of the date range, calendar passess it itself
      // end: moment(fetchInfo.endStr).format(), // end of the date range, calendar passess it itself
      // Passing the statuses to return the requests for those statuses only
      statuses: this.requestStatuses.join(","),
      // This set the request filters based on the ownership, i.e all requests or only user's.
      myRequestsOnly: this.myRequestsOnly,
      // Resources to filter out while fetching requests
      resources: this.resourcesToFilterOut.join(","),
    };

   

    this.dashboardService.fetchEvents(params).subscribe({
      next:async (data: any) => {
      
        this.pendingRequest = 0;
        this.approvedRequest = 0;
        this.rejectedRequest = 0;
        this.getFilterResources=[];
    
       
        const startRange = params.start ? new Date(params.start).getTime() : 0;
        const endRange = params.end ? new Date(params.end).getTime() : 0;
        
        const newData: any[] = [];
        this.allBookingData=[];
        for (let i = 0; i < data.length; i++) {
          const startDate = new Date(data[i].start);
          const endDate = new Date(data[i].end);
          const requestType=data[i].extendedProps.request.requestType;

          if(data[i].status=="pending" && this.filterPendingRequest){
            continue;
           }
           if(data[i].status=="approved" && this.filterApprovedRequest){
            continue;
           }
           if(data[i].status=="rejected" && this.filterRejectedRequest){
            continue;
           }


          if (
            startDate.getTime() >= startRange &&
            endDate.getTime() < endRange
          ) {
            if (startDate.getDate() === endDate.getDate()) {


              const approvalsList=data[i].extendedProps.request.approvals;
              

              if(approvalsList != undefined)  {
                if(approvalsList.length == 0){
                   try {
                const controlRoomName = data[i].extendedProps.request.controlRoom.name;
                if (!this.getFilterResources.includes(controlRoomName)) {
                  this.getFilterResources.push(controlRoomName);
                }
              } catch (error) {
                const controlRoomName = data[i].extendedProps.request.resourceId.name;
                if (!this.getFilterResources.includes(controlRoomName)) {
                  this.getFilterResources.push(controlRoomName);
                }
              }

                }else{


                  for (let j = 0; j < approvalsList.length; j++) {
                    const resourceName = approvalsList[j].resource.name;
                
                    if (!this.getFilterResources.includes(resourceName)) {
                      this.getFilterResources.push(resourceName);
                    }
                  }
                }

              }  

              if(requestType == "schedule"){
                const resourceName = data[i].extendedProps.request.resourceId.name;
                if (!this.getFilterResources.includes(resourceName)) {
                  this.getFilterResources.push(resourceName);
                }
              }
              
                let requestData=data[i].extendedProps.request;
             
                if(data[i].status == "pending"){
               
                  if(data[i].primaryRequest &&  data[i].primaryRequest == 1 ){ 
                  
                    if( requestData.resourceId && this.resourcesToFilterOut.includes(requestData.resourceId._id) ){
                      
                      this.pendingRequest++;
                                       
                    }
                    if( requestData.controlRoom && this.resourcesToFilterOut.includes(requestData.controlRoom._id) ){
  
                      this.pendingRequest++;
                                    
                    }
                  }else{
                    this.pendingRequest++;
                                     
                  }      
                }
  
  
  
                if(data[i].status == "approved"){
                  if(data[i].primaryRequest &&  data[i].primaryRequest == 1 ){ 
                   
                    if( requestData.resourceId && this.resourcesToFilterOut.includes(requestData.resourceId._id) ){
                      
                      this.approvedRequest++;
                                      
                    }
                    if( requestData.controlRoom && this.resourcesToFilterOut.includes(requestData.controlRoom._id) ){
  
                      this.approvedRequest++;
                                       
                    }
                  }else{
                    this.approvedRequest++;
                                   
                  }               
                }
  
                if(data[i].status == "rejected"){
               
                  if(data[i].primaryRequest &&  data[i].primaryRequest == 1 ){ 
                    
                    if( requestData.resourceId && this.resourcesToFilterOut.includes(requestData.resourceId._id) ){
                      
                      this.rejectedRequest++;
                                      
                    }
                    if( requestData.controlRoom && this.resourcesToFilterOut.includes(requestData.controlRoom._id) ){
  
                      this.rejectedRequest++;
                                       
                    }
                  }else{
                    this.rejectedRequest++;
                                  
                  }    
                }
              
            
            }

            
            
            this.allBookingData.push(data[i]);
            

          }

          if (
            startDate.getTime() > startRange &&
            endDate.getTime() < endRange
          ) {
            if (startDate.getDate() === endDate.getDate()) {

              const approvalsList=data[i].extendedProps.request.approvals;
 
              if(approvalsList != undefined)  {
                for (let j = 0; j < approvalsList.length; j++) {
                  const resourceName = approvalsList[j].resource.name;
              
                  if (!this.getFilterResources.includes(resourceName)) {
                    this.getFilterResources.push(resourceName);
                  }
                }

              }  

              if(requestType == "schedule"){
                const resourceName = data[i].extendedProps.request.resourceId.name;
                if (!this.getFilterResources.includes(resourceName)) {
                  this.getFilterResources.push(resourceName);
                }
              }

            }

          }

        }
        if(this.pendingRequest == 0 && this.approvedRequest == 0 && this.rejectedRequest == 0 ){
          this.highlightResources(false)
        }else{
          this.highlightResources(true);
      }
    }
  })


  }
    


generateFormattedDate(insertdate:any) {
  const date = insertdate; // Get the current date
  const timezoneOffset = this.calculateTimezoneOffset(); // Calculate the timezone offset

  // Use the DatePipe to format the date with the timezone offset
  return this.datePipe.transform(date, `yyyy-MM-dd'T'HH:mm:ss${timezoneOffset}`);
}

calculateTimezoneOffset() {
  // Calculate the timezone offset in the format +hh:mm or -hh:mm
  const offset = new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset < 0 ? '+' : '-';

  return `${sign}${this.padNumber(hours)}:${this.padNumber(minutes)}`;
}

padNumber(num: number) {
  // Helper function to add leading zeros to single-digit numbers
  return num.toString().padStart(2, '0');
}



  getStartTimeOfDay(dateString: string) {
    const date = new Date(dateString);

    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    const startOfDay = date.getTime();

    return startOfDay;
  }

  getEndTimeOfDay(dateString: string) {
    const date = new Date(dateString);

    date.setHours(23);
    date.setMinutes(59);
    date.setSeconds(59);
    date.setMilliseconds(999);
    const endOfDay = date.getTime();

    return endOfDay;
  }

  getTimeIndicator() {
    setInterval(() => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", { hour12: false });
      if (currentTime === "23:59:59") {
        this.ec.setOption("date", this.getNextDate(this.ec.getOption("date")));
        this.ec.setOption("scrollTime", {
          years: 0,
          months: 0,
          days: 0,
          seconds: 0,
          inWeeks: false,
        });
      }
    }, 1000);
  }

  getNextDate(dateString: string) {
   
    const date = new Date(dateString);
    const timestamp = date.getTime();
    // Increment the timestamp by one day (in milliseconds)
    const oneDayInMilliseconds = 86400000;
    const nextTimestamp = timestamp + oneDayInMilliseconds;
    // Convert the timestamp back to a Date object
    const nextDate = new Date(nextTimestamp);
    // Format the resulting date object back into the desired string format
    return nextDate;
    const nextDateString = nextDate.toString();
  }

  // https://github.com/vkurko/calendar#dateclick
  clickDate(clickEvent: any) {

// return;


    this.selectedDate = clickEvent.date;
    this.selectedEvent = clickEvent;

    const date = new Date(this.selectedDate);
    let scrollTime = `${this.utils._pad(date.getHours())}:${this.utils._pad(
      date.getMinutes()
    )}:${this.utils._pad(date.getSeconds())}`;

    if (this.ec.getOption("view")?.toLowerCase()?.includes("month")) {
      // console.log(date)

      const viewType="resourceTimeGridDay";
      const dashboardFilterData = {
        calendarType: "resourceTimeGridDay",
      };
            
     
            // console.log("Date is Starting")
            this.ec.setOption("date", date); 
          
  


const checkLoadingInterval = setInterval(() => {
  if (this.loadingInProgress === false) {
      clearInterval(checkLoadingInterval); // Stop the interval when loadingInProgress is false
   
 
      this.ec.setOption("scrollTime", scrollTime);
      this.adminService
      .updateCalendarType(viewType, dashboardFilterData)
      .subscribe({
        next: (data: any) => {},
        error: (err: any) => {
          // this.spinner.hide();
          this.cdRef.detectChanges();
        },
      });
    
      setTimeout(() => {
          this.ec.setOption("view", "resourceTimeGridDay");
          
          this.viewType = "Daily";

          setTimeout(() => {

              // Add any additional code you want to run after scrollTime and view have been set.
          }, 10);
      }, 10);
  }
}, 100); // Check every 100 milliseconds
    } else {
    }
  }

  // https://github.com/vkurko/calendar#datesset
  dateSet(dateEvent: any) {

 

  }

  // https://github.com/vkurko/calendar#eventclick
  eventClick(eventObj: any) {
    

    // return;
    const date = new Date(eventObj.event.start);
    let scrollTime = `${this.utils._pad(date.getHours())}:${this.utils._pad(
      date.getMinutes()
    )}:${this.utils._pad(date.getSeconds())}`;
    if (this.ec.getOption("view").toLowerCase().includes("month")) {

      const viewType="resourceTimeGridDay";
      const dashboardFilterData = {
        calendarType: "resourceTimeGridDay",
      };
            
     
         

      this.ec.setOption("date", date);

     

      const checkLoadingInterval = setInterval(() => {
        if (this.loadingInProgress === false) {
            clearInterval(checkLoadingInterval); // Stop the interval when loadingInProgress is false

       
            this.ec.setOption("scrollTime", scrollTime);

            this.adminService
            .updateCalendarType(viewType, dashboardFilterData)
            .subscribe({
              next: (data: any) => {},
              error: (err: any) => {
                // this.spinner.hide();
                this.cdRef.detectChanges();
              },
            });
          
            setTimeout(() => {
                this.ec.setOption("view", "resourceTimeGridDay");
                
                this.viewType = "Daily";
      
                setTimeout(() => {
                  const doc = document.querySelector(
                    `[data-id='${eventObj.event.extendedProps?.request?._id}']`
                  );
                  doc?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }, 10);
            }, 10);
        }
      }, 100);


      // this.ec.setOption("scrollTime", scrollTime);
      // setTimeout(() => {
      //   this.ec.setOption("view", "resourceTimeGridDay");
      //   this.viewType = "Daily";

      //   setTimeout(() => {
      //     const doc = document.querySelector(
      //       `[data-id='${eventObj.event.extendedProps?.request?._id}']`
      //     );
      //     doc?.scrollIntoView({
      //       behavior: "smooth",
      //       block: "center",
      //     });
      //   }, 10);
      // }, 10);
    } else {

     

    }
  }

  // https://github.com/vkurko/calendar#eventcontent
  eventContent(eventDetails: any) {

    return {
      html: this.makeEventContent(eventDetails.event, eventDetails.view),
    };
  }

  makeEventContent(event: any, view: any) {


    if (event.display == "auto" && view.type != null) {
     
      if (
        view.type.toLowerCase().includes("timegridday") ||
        view.type.toLowerCase().includes("timegridweek")
      ) {
        
        return this.getByCalenderViewType(event, "daily");
      }
      return this.getByCalenderViewType(event, "monthly");
    }
    return `<span></span>`;
  }

   onMonthEventMouseEnter(event: any) { console.log("Month Clicked")} 

   contextMenuListenerForBooking = (e:any) => {
    e.preventDefault(); // Prevent the default context menu from appearing

    const element = document.getElementById("copyBookingIdListener");
    if (element) {
                // @ts-ignore
                element.style.display = "block";
                // @ts-ignore
                element.style.position = "absolute";
                // @ts-ignore
                if(e.pageX > window.innerWidth - 170){
                  element.style.left = e.pageX-250 + "px";
                }else{
                  element.style.left = e.pageX + "px";
                }
                // @ts-ignore
                element.style.top = e.pageY + "px";

                

    }
    
    
    // You can add your code here for handling right-click actions
  };

  // Remove the contextmenu event listener when it's no longer needed
  removeContextMenuListenerForBooking() {
    // document.removeEventListener('contextmenu', this.contextMenuListenerForBooking);
    const elements = document.querySelectorAll('.ec-body');
    elements.forEach(element => {
      element.removeEventListener('contextmenu', this.contextMenuListenerForBooking);
        // element.addEventListener('contextmenu', function (e) {
        //     e.preventDefault();
        // });
    });
  }

  hideCopyBookingId() {
    if (document.getElementById("copyBookingIdListener")) {
      // @ts-ignore
      document.getElementById("copyBookingIdListener").style.display = "none";
    }
  }

  copyBookingIdNew(bookingId:any) {
   
    const el = document.createElement('textarea');
    el.value = bookingId;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    const element = document.getElementById("copyBookingIdListener");
    if (element) {
                // @ts-ignore
                element.style.display = "none";
               
    }

    this.copyRequestId=null;
    this.bookingData=null;
    this.requestStatus=null;
    

  }



  onMouseEnter(eventDetails: any) {

    const requestType = eventDetails.event.extendedProps?.request?.requestType;

    if(requestType == "schedule"){
      this.hideCopyBookingId();
      this.copyRequestId=null;
      this.bookingData=null;
      this.requestStatus=null;
      this.removeContextMenuListenerForBooking()
    
    }

    if (requestType != "schedule") {

    if(eventDetails.event.extendedProps.request.bookingId != this.copyRequestId){

      this.hideCopyBookingId();
      this.copyRequestId=null;
      this.bookingData=null;
      this.requestStatus=null;
    }
    this.hideMenu();
    this.copyRequestId=eventDetails.event.extendedProps.request.bookingId;
    this.requestStatus=eventDetails.event.extendedProps.request.status;
    this.bookingData=eventDetails.event;

   

    const elements = document.querySelectorAll('.ec-body');
    elements.forEach(element => {
      element.addEventListener('contextmenu', this.contextMenuListenerForBooking);
        // element.addEventListener('contextmenu', function (e) {
        //     e.preventDefault();
        // });
    });

 


    this.copiedBookingClass="bi bi-clipboard ";
    const optionsElement = document.querySelector("#ec-options__copy");
    if (optionsElement) {
      optionsElement.querySelector("i")?.setAttribute("class", this.copiedBookingClass);
    }

    const requestedBy = eventDetails.event.extendedProps.request.requestedBy;

   
    
  
      const view = this.ec.getOption("view");
      if (
        view?.toLowerCase()?.includes("timegridday") ||
        view?.toLowerCase()?.includes("timegridweek")
      ) {
        const element = eventDetails.jsEvent.target;
        const node = document.getElementById("ec-options");
        const optionsElement = node?.cloneNode(true);


        (<Element>optionsElement)?.classList?.remove("d-none");
        (<Element>optionsElement)
          ?.querySelector("#ec-options__view")
          ?.addEventListener(
            "click",
            this.viewRequestDetails.bind(
              this,
              eventDetails.event?.extendedProps?.request?._id
            )
          );

        (<Element>optionsElement)
          ?.querySelector("#ec-options__clone")
          ?.addEventListener(
            "click",
            this.cloneRequestDetails.bind(
              this,
              eventDetails.event?.extendedProps?.request
            )
          );

        (<Element>optionsElement)
          ?.querySelector("#ec-options__edit")
          ?.addEventListener(
            "click",
            this.editRequest.bind(
              this,
              eventDetails.event?.extendedProps?.request?._id
            )
          );
        (<Element>optionsElement)
          ?.querySelector("#ec-options__delete")
          ?.addEventListener(
            "click",
            this.deleteRequestConfirm.bind(
              this,
              this.confirmModalContent,
              eventDetails.event?.extendedProps?.request
            )
          );
          (<Element>optionsElement)
          ?.querySelector("#ec-options__copy")
          ?.addEventListener(
            "click",
            () => this.copyBookingId(eventDetails.event?.extendedProps?.request)
          );



        /**
         * If the request does not belong to the current user or user is not admin then do not show these options
         */
        (<Element>optionsElement)
          ?.querySelector("#ec-options__edit")
          ?.classList.add(
            this.isShowEditButton(eventDetails) ? "d-inline-block" : "d-none"
          );

        (<Element>optionsElement)
          ?.querySelector("#ec-options__clone")
          ?.classList.add(
            this.isShowCopyButton(eventDetails) ? "d-inline-block" : "d-none"
          );

        (<Element>optionsElement)
          ?.querySelector("#ec-options__delete")
          ?.classList.add(
            this.showRequestActions(eventDetails) ? "d-inline-block" : "d-none"
          );

        element.appendChild(optionsElement);
      
      }
    }
  }


  

  showRequestActions(eventDetails: any) {

   
    const requestedBy = eventDetails.event.extendedProps.request.requestedBy;
    const date = new Date(
      eventDetails.event.start
    ).getTime();
    
    const today = new Date().getTime();

    const isAdmin = this.globals.principal.isAdmin();
    const credentialId= this.globals.principal.credentials?._id?.$oid ?? this.globals.principal.credentials?.id;
   
    const isRequestedByCurrentUser = requestedBy.id === credentialId;
     
    if (eventDetails.event?.extendedProps?.request?.status === 'pending' || isRequestedByCurrentUser  ) {
      return true;
    }
  
    return date < today && eventDetails.event?.extendedProps?.request?.status === 'pending' && isAdmin && isRequestedByCurrentUser;
  }

  // todo: shift to diff service
  isRequestExpired(eventDetails: any) {
    const date = new Date(
      eventDetails.event.extendedProps.request.requestDateTime
    ).getTime();
    const today = new Date().getTime();
    return date < today;
  }

  isRequestApproved(eventDetails: any) {
    return eventDetails.event.extendedProps.request.status == "approved";
  }
  isRequestPending(eventDetails: any) {
    return eventDetails.event.extendedProps.request.status == "pending";
  }

  isRequestOwned(eventDetails: any) {
    const requestedBy = eventDetails.event.extendedProps.request.requestedBy;
    return requestedBy.id == this.globals.principal.credentials.id;
  }

  isUserAdmin(eventDetails: any) {
    return this.globals.principal.isAdmin();
  }

  isShowCopyButton(e: any) {
    if (this.isRequestApproved(e)) {
      // if (this.isUserAdmin(e) || this.isRequestOwned(e)) {
        return true
      // }
    }

    if (this.isRequestPending(e) ) {
      return true;
    }

    return false;
  }

  isShowEditButton(e: any) {

    const date = new Date(
      e.event.start
    ).getTime();
    
    const today = new Date().getTime();

    if (this.isRequestPending(e) ) {

      // if (this.isUserAdmin(e) || this.isRequestOwned(e)) {
      //   return true;
      // }

      return true;
    }

    if(this.isRequestApproved(e)){

      // if(today<date || this.isRequestOwned(e)){

        return true;

    // }

  }
  return false;

}

  onMouseLeave(eventDetails: any) {
    // this.copyRequestId=null;

    this.removeContextMenuListenerForBooking();
    const view = this.ec.getOption("view");
    const requestType = eventDetails.event.extendedProps?.request?.requestType;
    if (
      view.toLowerCase().includes("timegridday") ||
      view.toLowerCase().includes("timegridweek")
    ) {

      // const statusElement = document.getElementById("statusElement");
      // (<Element>statusElement)          
      // ?.classList.remove(
      //    "d-none"
      // );

      if (requestType != "schedule") {
        const element = eventDetails.jsEvent.target;
        let elm = {};
        const elms = element.getElementsByTagName("*");
        for (var i = 0; i < elms.length; i++) {
          if (elms[i].id === "ec-options") {
            elm = elms[i];
            break;
          }
        }
        if (elm) {
          element.removeChild(elm);
        }
      }
    } else {
      // const el = eventDetails.el.querySelector('[event-view=month]');
      // el?.scrollIntoView({
      //   behavior: 'smooth',
      //   block: 'start',
      // });
    }
  }

  viewRequestDetails(requestId: any ) {
    if( this.modaleRef){
      this.modaleRef.close();
    }

    this.requestService.findOne(requestId).subscribe((data: any) => {
      this.selectedRequest = data.request;
      this.openRequestViewModal();
    });
  }

  cloneRequestDetails(data: any) {
    this.projectRouterService.requestCloneId = data._id;
    this.router.navigate(["/request", "new"]);
  }

  deleteRequestConfirm(confirmModalContent: any, request: any) {
    this.selectedRequest = request;
    this.modaleRef = this.modal.open(confirmModalContent, {
      backdrop: "static",
      size: "sm",
      keyboard: false,
    });
  }

  deleteRequest() {
    const requestId = this.selectedRequest._id;
    this.requestService.deleteRequest(requestId).subscribe((req) => {
      this.modaleRef.close();
      this.ec.refetchEvents();
    });
  }

  editRequest(requestId: string) {
    this.router.navigate(["/request", "edit", requestId]);
  }

  openRequestViewModal() {
   
    this.modaleRef = this.modal.open(ViewRequestComponent, { size: "lg",backdrop: 'static',keyboard: false, windowClass: 'viewRequest'});
    this.modaleRef.componentInstance.request = this.selectedRequest;
    this.modaleRef.componentInstance.requestStatus.subscribe((e: any) => {
      this.ec.refetchEvents();
    });
  }

  setTimeSlot(value: any) {
    this.ec.setOption("slotDuration", value);
    this.selectedTimeSlot = value;
    const dashboardFilterData = {
      timeslot: this.selectedTimeSlot,
    };
    this.adminService.updateTimeSlot(this.selectedTimeSlot).subscribe({
      next: (data: any) => {},
      error: (err: any) => {},
    });
  }

  filterByStatus(event: any) {
    const value = event.target.value;

  // this.pendingRequest = 0;
  // this.approvedRequest = 0;
  // this.rejectedRequest = 0;

  if(value == "pending" ){
    if(!event.target.checked){
      this.filterPendingRequest=true;      
    }else{
      this.filterPendingRequest=false;
    }
  }
  
  if(value == "approved"){   
    if(!event.target.checked){
      this.filterApprovedRequest=true;    
    }else{
      this.filterApprovedRequest=false;
    }
  }

  if(value == "rejected" ){  
    if(!event.target.checked){
      this.filterRejectedRequest=true;    
    }else{
      this.filterRejectedRequest=false;
    }
  }

    // if (event.target.checked) {
    //   this.requestStatuses.indexOf(value) === -1
    //     ? this.requestStatuses.push(value)
    //     : null;
    // } else {
    //   this.requestStatuses.indexOf(value) !== -1
    //     ? this.requestStatuses.splice(this.requestStatuses.indexOf(value), 1)
    //     : null;
    // }

    this.ec.refetchEvents();
  }

  getStatus(){
   
  }

  setMyRequestsOnly(event: any) {
    this.myRequestsOnly = event.target.checked;
    
    // this.ec.destroy();
    this.ec.refetchEvents();
  }

  hasDeepChildWithClass(element: HTMLElement, className: string): boolean {
    if (element.classList.contains(className)) {
      return true;
    }
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i] as HTMLElement;
      if (this.hasDeepChildWithClass(child, className)) {
        return true;
      }
    }
    return false;
  }

  changeView(viewType: any) {
   
    // width: fit-content wont go well with week view, we need to only add it to views other the week views
    const viewTypes = {
      dayGridMonth: "Monthly",
      timeGridWeek: "Weekly",
      resourceTimeGridDay: "Daily",
    };
    this.viewType = viewTypes[viewType as keyof typeof viewTypes];
    setTimeout(() => {
      const ecDayElements = document.querySelectorAll(".ec-day");
      for (let i = 0; i < ecDayElements.length; i++) {
        const ecDayElement = ecDayElements[i] as HTMLElement;
        if (!this.hasDeepChildWithClass(ecDayElement, "ec-event-body")){
          ecDayElement.setAttribute(
            "title",
            "Please click to open daily view."
          );
         
        }
      }
    }, 3000);
    if (viewType == "timeGridWeek") {
      document.getElementById("ec")?.classList.add("week-view");
    } else {
      document.getElementById("ec")?.classList.remove("week-view");
    }
    this.ec.setOption("view", viewType);

    const dashboardFilterData = {
      calendarType: viewType,
    };
    this.adminService
      .updateCalendarType(viewType, dashboardFilterData)
      .subscribe({
        next: (data: any) => {},
        error: (err: any) => {
          // this.spinner.hide();
          this.cdRef.detectChanges();
        },
      });
  }

  openFilterModal(modalId: any) {
    this.resourcesToFilterOut = this.getFilteredResourcesIds();
    this.showModal(modalId);
  }

  cancelFilterResource() {
    // Reset the resource filter state if some resources were checked/unchecked but not filtered
    this.resources.forEach((rs: any) => {
      if (this.resourcesToFilterOut.includes(rs._id)) {
        rs.checked = true;
      } else {
        rs.checked = false;
      }
    });
    this.modalObject.close();
  }

  filterSaveByResources() {
    this.resourcesToFilterOut = this.getFilteredResourcesIds();
    this.baseService
      .updateUserPreferenceFilters(this.resourcesToFilterOut)
      .subscribe({
        next: (data: any) => {
          this.filterByResources();
        },
        error: (err: any) => {
          // this.spinner.hide();
          // this.cdref.detectChanges();
        },
      });
  }
  // Any resource sent in the request will be filter by
  filterByResources() {
    this.resourcesToFilterOut = this.getFilteredResourcesIds();
    this.userDetails.preferences.resourceFilters = this.resourcesToFilterOut;
    this.getResources();
   
    this.ec.refetchEvents();
    this.modalObject.close();
  }

  getFilteredResourcesIds() {
    const resourceIds: Array<any> = [];
    this.resources_sort_name.forEach((rs: any) => {
      if (rs.checked) {
        resourceIds.push(rs._id);
      }
    });

    return resourceIds;
  }

  showModal(modalId: any) {
   
    this.modalObject = this.modal.open(modalId, { size: "lg", centered: true,backdrop: 'static',keyboard: false, });
  }

  toggleResource(resource: any, event: any) {

    for (let i = 0; i < this.resources.length; i++) {
      if (this.resources[i]._id == resource._id) {
        this.resources[i].checked = event.target.checked;
      }
    }
  }

  toggleAllResources(
    typeid: string,
    event: any = { target: { checked: true } }
  ) {
  
    for (let i = 0; i < this.resources.length; i++) {
      if (this.resources[i].type == typeid || typeid == "")
        this.resources[i].checked = event.target.checked;
    }
    this.allResourceToggled = event.target.checked;
  }

  allfilter() {
    this.toggleAllResources("");

    this.resourcesToFilterOut = this.getFilteredResourcesIds();

    this.baseService
      .updateUserPreferenceFilters(this.resourcesToFilterOut)
      .subscribe({
        next: (data: any) => {
          this.filterByResources();
          this.spinner.show();
        },
        error: (err: any) => {
          // this.cdref.detectChanges();
        },
      });
  }

  isAllToggled(typeid: string) {
    let checked = true;
    for (let i = 0; i < this.resources.length; i++) {
      if (this.resources[i].type == typeid || typeid == "")
        if (!this.resources[i].checked) {
          checked = false;
        }
    }
    return checked;
  }

  ngOnDestroy(): void {
    clearInterval(this.eventsFetchInterval);
    document.removeEventListener("contextmenu", this.cmListener, false);
    this.subscriptions.unsubscribe();
  }

  onEventMount(eventDetails: any) {
    // this.ec.refetchEvents();
    //  eventDetails.el.style.height="auto";
  }

  convert2Capitalize(str: string) {
    const capitalized = String(str).charAt(0).toUpperCase() + str.slice(1);
    return capitalized;
  }

  listenToNewRequests() {
    // Enable pusher logging - don't include this in production
    Pusher.logToConsole = false;

    var pusher = new Pusher(environment.pusherId, {
      cluster: "ap4",
    });

    var channel = pusher.subscribe("skynews");

    channel.bind("new-booking", (data: any) => {

      if (data.data.type=="Buffer") {
        // Data is compressed, decompress and process
       console.log("Compressed");
       const decompressedData = pako.inflate(data.data.data, { to: 'string' });
       const jsonData = JSON.parse(decompressedData);

       console.log(jsonData)
       
       for (let d of jsonData) {
         d.start = new Date(d.start);
         d.end = new Date(d.end);
         this.ec.addEvent(d);
        }
        this.getRequestList();

      }else{

      for (let d of data.data) {
        d.start = new Date(d.start);
        d.end = new Date(d.end);
        this.ec.addEvent(d);        
      }
      this.getRequestList();

     }
    });
    channel.bind("update-booking", (data: any) => {
   
   
      if (data.data.type=="Buffer") {
         // Data is compressed, decompress and process
        console.log("Compressed");
        const decompressedData = pako.inflate(data.data.data, { to: 'string' });
        const jsonData = JSON.parse(decompressedData);

        console.log(jsonData)
        
        for (let d of jsonData) {
         
          d.start = new Date(d.start);
          d.end = new Date(d.end);
          
         
          console.log(d)
          this.ec.updateEvent(d);
        }
        this.ec.refetchEvents();
        this.getRequestList();
      } else {
        console.log("Not Compressed");
        // Data is not compressed, process directly
        for (let d of data.data) {
          d.start = new Date(d.start);
          d.end = new Date(d.end);
          this.ec.updateEvent(d);
        }
        this.ec.refetchEvents();
        this.getRequestList();
      }
    });

    channel.bind("delete-booking", (id: any) => {
  
      
      this.ec.removeEventById( id.data );
       
        this.getRequestList();
        this.ec.refetchEvents();
      
    });

    this.subscriptions.add(channel);
  }


  getByCalenderViewType(event: any, viewType: string = "daily"): string {
    if (!event.extendedProps?.request) {
      return "";
    }

    
    event.extendedProps.request.requestType =
    event.extendedProps.request.requestType == "prerecorded"
    ? "REC"
    : event.extendedProps.request.requestType == "cameraman"
    ? "CREW"
    : event.extendedProps.request.requestType;

  
    let eventContent = "";
    switch (event.extendedProps.request.requestType) {
      case "REC": {
        eventContent = this.getPreRecordContent(event, viewType);
        break;
      }
      case "live": {
        eventContent = this.getLiveContent(event, viewType);
        break;
      }
      case "CREW": {
        eventContent = this.getCameramanContent(event, viewType);
        break;
      }
      case "schedule": {
        eventContent = this.getScheduleContent(event, viewType);
        break;
      }
      default: {
        eventContent = this.getTypeAndTimeContent(event, viewType);
        break;
      }
    }
    if (viewType == "daily") {
      return `
      <span data-id="${event.extendedProps?.request?._id}" class="ec-event-details">
        ${eventContent}
      </span>
      `;
    }
    

    return `
   <div class="text-capitalize" s-id="${
     event.extendedProps?.request?._id
   }" event-view="month" >
      <span class="ec-dot" style="background-color: ${
        event.backgroundColor
      }"></span>  ${this.getTypeAndTimeContent(event, "time")}


      ${
      (event.extendedProps.request?.continutaion ?? "") === "to" ? "*" : ""
    }
        ${eventContent}
       
    </div>
   `;
  //   return `
  //  <div class="text-capitalize" s-id="${
  //    event.extendedProps?.request?._id
  //  }" event-view="month" onmouseenter="${this.onMonthEventMouseEnter.bind(
  //     this
  //   )}">
  //     <span class="ec-dot" style="background-color: ${
  //       event.backgroundColor
  //     }"></span>  ${this.getTypeAndTimeContent(event, "time")}${
  //     (event.extendedProps.request?.continutaion ?? "") === "to" ? "*" : ""
  //   }
  //       ${eventContent}
  //   </div>
  //  `;
  }
  /**
   *
   * @param event
   * @param returnType string time,eventType,both
   * @returns
   */
  getTypeAndTimeContent(
    event: any,
    returnType: string = "both",
    continutaion?: string
  ) {
    const start = new Date(event.start);
    const end = new Date(event.end);

    // const startString = this.utils.getAMPMFormat(start)
    // const endString = this.utils.getAMPMFormat(end)
    const startH = start.getHours();
    const startM = start.getMinutes();
    const endH = end.getHours();
    const endM = end.getMinutes();
    const startString = `${this.utils.getHM(startH)}${this.utils.getHM(
      startM
    )}`;
    const endString = `${this.utils.getHM(endH)}${this.utils.getHM(endM)}`;
    if (returnType == "time") {
      return `${startString} - ${endString}`;
    }
    if (returnType == "eventType") {
      return event?.extendedProps?.request?.requestType?.toUpperCase();
    }

   

    return `
    <div class="row" style="font-size:90%">
      <div class="col-md-12">
      
      <b>${event?.extendedProps?.request?.requestType?.toUpperCase()}</b> <span style="font-size:8px;">|</span> ${startString} - ${endString}
      <span id="statusElement" style="margin-left: 4px;">
      ${
        event?.extendedProps?.primaryRequest && event?.extendedProps?.request.participants.length > 0
          ? '<i class="fa-solid fa-p resourceType"></i>'
          : event?.extendedProps?.primaryRequest
          ? '<i class="fa-solid fa-p resourceTypePri"></i>'
          : event?.extendedProps?.secondaryRequest
          ? '<i class="fa-solid fa-s resourceType"></i>'
          : ''
      }
    </span>
      </div>
    </div>
    `;
  }
  getPreRecordContent(event: any, viewType: string): string {
   

 
    const controlRoom =  event.extendedProps?.request?.controlRoom?.name?.toUpperCase();
    let pusherControlRoom;
   

    if(controlRoom == undefined){

   const matchingChannel = this.allControlRoom.find((controLRoom:any) => controLRoom._id === event.extendedProps?.request?.controlRoom);
   pusherControlRoom=matchingChannel ? matchingChannel.name.toUpperCase() : 'Error';
    }


    let content = "";
    const props = event.extendedProps;
    const participants = props.request.participants;
    for (let p of participants) {
      if (p.type == "host") {
        content += `
        <div class="col-12">
          H:  ${p?.name}
        </div>
        `;
      } else {
        content += `
        <div class="col-12">
          G:  ${p?.name}
        </div>
        `;
      }
    }
    return `
    <div class="d-flex flex-column align-items-start justify-content-start">
        <div>
          ${this.getTypeAndTimeContent(
            event,
            viewType == "monthly" ? "eventType" : "both"
          )}
        </div>
        <div style="font-size:10px;">
          ${controlRoom ?? pusherControlRoom}
        </div>
        <div class="w-100 border-top border-white border-1 my-1"></div>
        <div>
        ${props.request?.requestedBy?.name}
        </div>
        <div style="display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: horizontal;
            white-space: pre-line;
            text-overflow: ellipsis;
            max-height: 173px;
            overflow: hidden;">
        ${props.request?.details}
        </div>

    </div>
`;
    // <div class="">
    //   <strong>Participants </strong>
    //    ${content}
    // </div>
  }

  getLiveContent(event: any, viewType: string): string {


    const props = event.extendedProps;
    const channelName=props.request?.channel?.name?.toUpperCase();
    let pusherChannelName;

    if(channelName == undefined){

   const matchingChannel = this.allChannel.find((channel:any) => channel._id === props.request?.channel);
   pusherChannelName=matchingChannel ? matchingChannel.name.toUpperCase() : 'Error';
    }
 
  
    return `
    <div class="d-flex flex-column align-items-start justify-content-start">
    <div>
      ${this.getTypeAndTimeContent(
        event,
        viewType == "monthly" ? "eventType" : "both"
      )}
    </div>
    <div style="font-size:10px;">
    ${channelName ?? pusherChannelName}
    </div>
    <div class="w-100 border-top border-white border-1 my-1"></div>
    <div>
    ${props.request?.requestedBy?.name}
    </div>
        <div style="display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: horizontal;
      white-space: pre-line;
      text-overflow: ellipsis;
      max-height: 173px;
      overflow: hidden;">
        ${props.request?.details}
        </div>
    </div>
    `;
  }

  getCameramanContent(event: any, viewType: string): string {
    const props = event.extendedProps;
    const shootType = props.request?.shootType?.name?.toUpperCase();
    let pusherShootType;

    if(shootType == undefined){

   const matchingChannel = this.allShootType.find((shootType:any) => shootType._id === props.request?.shootType);
   pusherShootType=matchingChannel ? matchingChannel.name.toUpperCase() : 'Error';
    }
 


    return `
      <div class="d-flex flex-column align-items-start justify-content-start">
      <div>
            ${this.getTypeAndTimeContent(
              event,
              viewType == "monthly" ? "eventType" : "both"
            )}${(props.request?.continutaion ?? "") === "to" ? "*" : ""}
      </div>
      <div style="font-size:10px;">
        ${shootType ?? pusherShootType}
      </div>
      <div class="w-100 border-top border-white border-1 my-1"></div>
      <div>
      ${props.request?.requestedBy?.name}
      </div>
      <div style="display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: horizontal;
          white-space: pre-line;
          text-overflow: ellipsis;
          max-height: 173px;
          overflow: hidden;">
          ${props.request?.details}
          </div>
      </div>
    `;
  }

  getScheduleContent(event: any, viewType: string) {
    const props = event.extendedProps;
    return `
      <span class="me-1">
        <div class="row">
          <div class="col-md-12">
            ${this.getTypeAndTimeContent(
              event,
              viewType == "monthly" ? "eventType" : "both"
            )}${(props.request?.continutaion ?? "") === "to" ? "*" : ""}
          </div>
          <div class="col-12">
            Status:  ${props.request.status} <br>
            Details:  ${props.request.details}
            <br>
            Type:  ${props.request.type?.name}
            <br>
            Resource: ${props.request?.resourceId?.name}
          </div>
         </div>
      </span>
    `;
  }

  copyBookingId(eventDetails:any) {

    const el = document.createElement('textarea');
    el.value = eventDetails.bookingId;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.copiedBookingClass="bi bi-clipboard-check ";

    const optionsElement = document.querySelector("#ec-options__copy");
    if (optionsElement) {
      optionsElement.querySelector("i")?.setAttribute("class", this.copiedBookingClass);
    }
  }

  capitalizeFirstLetter(inputString: string): string {
    return inputString.charAt(0).toUpperCase() + inputString.slice(1);
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
       StartDateTime:StartDateTime,
       EndDateTime:EndDateTime,
     }

     return dateObject;
}

showResourceModal(requestData:any){
  this.spinner.show();

  // if(requestData.bookingId != this.copyRequestId){

    this.hideCopyBookingId();
    this.copyRequestId=null;
    this.bookingData=null;
    // this.requestStatus=null;
    this.selectedResourceId=null;
    this.requestBookingId=null;

  // }

  const resourceId=[];
  const bookingData=[];
  this.resourceData=[];



  let startDateTime=requestData.extendedProps.request.startDateTime;
  let endDateTime=requestData.extendedProps.request.endDateTime;
  let resourceName=requestData.extendedProps.request.resourceId?._id ?? requestData.extendedProps.request.controlRoom?._id;
  let participants=requestData.extendedProps.request.participants;
  const approvals=requestData.extendedProps.request.approvals;




  if(typeof startDateTime == 'object'){
    startDateTime=startDateTime.toISOString()
  }
  if(typeof endDateTime == 'object'){
  endDateTime=endDateTime.toISOString()
  }



  const status =approvals.find(
    (item:any) =>
      item.resource.id ==
      resourceName 
  )?.status;


  const primaryStatus=status;
    

  this.selectedResourceId=requestData.resourceIds[0];




  if(requestData.extendedProps.request.ocurrenceOptions.eventType == "recurring"){

    this.isRecurring=true;

  } 

  this.requestBookingId=requestData.extendedProps.request._id;


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
     status:status,
     startDateTime: StartDateTime.trim() === '' ? null : StartDateTime,
     endDateTime: EndDateTime.trim() === '' ? null : EndDateTime
 
    })


  resourceId.push(resourceName);

  if (Array.isArray(participants)) {
    // Loop through the participants and push the 'studio' property into resourceId
    participants.forEach((participant:any) => {
      if (participant.studio) {
        if(participant.startTime == null &&  participant.endTime == null ){
          ({ StartDateTime, EndDateTime } = this.getHourAndMinutes(startDateTime, endDateTime));
        }else{

        

        if (this.isISODateFormat(participant.startTime) || this.isISODateFormat(participant.endTime)) {
          ({ StartDateTime, EndDateTime } = this.getHourAndMinutes(participant.startTime, participant.endTime));
        } else {
          StartDateTime = participant.startTime?participant.startTime:startDateTime;
          EndDateTime = participant.endTime?participant.endTime:endDateTime;
        }
      }

      const status =approvals.find(
        (item:any) =>
          item.resource.id == participant.studio  &&  item.id == participant.id 
      )?.status;

   
        
        bookingData.push({

          resourceId: participant.studio,
          type:participant.type,
          status:status ?? primaryStatus,
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
  this.spinner.hide();
}

isISODateFormat(time:any) {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  return isoDatePattern.test(time);
}


showResourceOwnerShipModal(requestData:any){

  const resourceId=[];
  this.resourceOwnerData = {};


  let startDateTime=requestData.extendedProps.request.startDateTime;
  let endDateTime=requestData.extendedProps.request.endDateTime;
  let resourceName=requestData.extendedProps.request.resourceId?._id ?? requestData.extendedProps.request.controlRoom?._id;
  let participants=requestData.extendedProps.request.participants;
  this.requestBookingId=requestData.extendedProps.request._id;
 

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

 

  this.modaleRef = this.modal.open(this.ResourceOwnerShip, {
    backdrop: "static",
    size: "lg",
    keyboard: false,
    windowClass: 'custom-modal-auto'
  });
}

showResourceBookingModal(){

this.getCalendarBookingData();

if(this.allBookingData.length == 0){
  return;
}

this.modaleRef = this.modal.open(this.resourceBookingModal, {
  backdrop: "static",
  size: "lg",
  keyboard: false,
  windowClass: 'custom-modal-auto'
});
}

toggleView() {
  this.showAlternateView = !this.showAlternateView;
}

getCalendarBookingData(){

  this.resourceBookings=[]
  this.bookingResources=[]
  this.showAlternateView =false;



  this.fetchedResources.forEach((resource: any) => {
    // Find all matching resources in allBookingData
    const matchingResources = this.allBookingData.filter((booking: any) => booking.resourceId === resource.id);

    // If there are matches, push the data to resourceBookings for each match
    if (matchingResources.length > 0) {
      matchingResources.forEach((matchingResource: any) => {

        const existingResourceIndex = this.resourceBookings.findIndex((item: any) => item.id === resource.id);

        if (existingResourceIndex !== -1) {
          // If the resource already exists, add the booking to the existing entry
          this.resourceBookings[existingResourceIndex].bookings.push(matchingResource);
        } else {
          // If the resource doesn't exist, create a new entry with existing properties
          this.resourceBookings.push({
            resourceName: resource.title,
            id: resource.id,
            bookings: [
              matchingResource
            ],
          });
        } 
      });
    }
  });

  this.allBookingData.forEach((booking: any) => {
    // Find the resource for the current booking
    const matchingResource = this.fetchedResources.find((resource: any) => resource.id === booking.resourceId);
    let resourceData;
    if (matchingResource) {

        if(booking.primaryRequest){

          resourceData=   {
            ...matchingResource,
            primaryRequest:1,
            resourceStatus:booking.status ?? booking.extendedProps.request.requestType,
            
          }
      
        }else{
          resourceData=   {
            ...matchingResource,
            secondaryRequest:1,
            resourceStatus:booking.status ?? booking.extendedProps.request.requestType,
          }
        }
      

      const existingBookingIndex = this.bookingResources.findIndex((item: any) => item.requestId === booking._id);

      if (existingBookingIndex !== -1) {
        // If the booking already exists, check if the resource is not already added
        const existingResourceIndex = this.bookingResources[existingBookingIndex].resources.findIndex((res: any) => res.id === matchingResource.id);

        if (existingResourceIndex === -1) {
          // If the resource is not present, add it to the existing entry
          this.bookingResources[existingBookingIndex].resources.push(resourceData);
        }
      } else {
        // If the booking doesn't exist, create a new entry with existing properties
        this.bookingResources.push({
          bookingId: booking.extendedProps.request.bookingId ?? "2023-00-00000",
          requestId: booking._id,
          status: booking.extendedProps.request.status, // You may want to adjust this based on your data structure
        
          resources: [resourceData],
        });
      }
    }
  });



  if(this.bookingResources.length < 2 ){
 
    this.bookingResourceTitle="Calendar Booking View";
    
    }else{
    
    this.bookingResourceTitle="Calendar Booking(s) View";
    }


}





}




