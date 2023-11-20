import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { BaseService } from "../core/_services/base.service";
import * as moment from "moment";
import {
  NgbDate,
  NgbDateStruct,
  NgbModal,
  NgbModalRef,
  NgbTooltip,
  NgbTooltipConfig,
} from "@ng-bootstrap/ng-bootstrap";
import { ViewRequestComponent } from "../request/view-request/view-request.component";
import { RequestService } from "../request/request.service";
import { AuthService } from "../core/_services/auth.service";
import { environment } from "src/environments/environment";
import { Principal } from "../core/_models/principal";
import { Subscription, map } from "rxjs";
import { DashboardService } from "../dashboard/dashboard.service";
import { DataService } from "../core/_services/data.service";
import { AdminService } from "../admin/admin.service";
import { NgxSpinnerService } from 'ngx-spinner';
import * as _ from "lodash";
import { Globals } from "../core/_helper/globals";

declare const Pusher: any;
@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild("confirmModalContent") confirmModalContent!: TemplateRef<any>;
  @ViewChild("approveConfirmModalContent") approveConfirmModalContent!: TemplateRef<any>;
  @ViewChild("timeExpired") timeExpired!: TemplateRef<any>;
  @ViewChild("homeFilter") homeFilter!: TemplateRef<any>;
  @ViewChild("multiDeleteConfirmModalContent")
  multiDeleteConfirmModalContent!: TemplateRef<any>;
  @ViewChild("multiApproveConfirmModalContent")
  multiApproveConfirmModalContent!: TemplateRef<any>;
  @ViewChild("ResourceOwnerShip") ResourceOwnerShip!: TemplateRef<any>;
  @ViewChild("RequestAutoApprovalStatus") RequestAutoApprovalStatus!: TemplateRef<any>;
  @ViewChild("showHistoryDataStatus") showHistoryDataStatus!: TemplateRef<any>;
  modaleRef!: NgbModalRef;
  moment: any = moment;
  summary: any;
  imageUrl: any = "../assets/images/avatar.png";
  serverUrl = environment.serverUrl;
  allResourceToggled = false;
  allFilterResourcesToggled = false;
  allRequestTypesToggles = false;
  modalObject: any = {};
  userDetails!: any;
  startFilterDateModel: any;
  endFilterDateModel: any;
  dateFilterModel: any;
  isDateFilter = false;
  searchKey: string = "";
  showMoreArr: string[] = [];
  filterBtnVisibility = false;
  sortBy: string = "none";
  userOwnedResources: string[] = [];
  isAppendingHistoryData: boolean = false;
  latestRound: number = 0;
  approveEnable: Boolean = false;
  minDate: NgbDateStruct = {} as NgbDateStruct;
  isAppendingDateApplied = false;
  users: any[] = [];

  selectedRequestStatusType: "approved" | "pending" | "rejected" = "pending";
  selectedTimeRangeType: "weekly" | "daily" | "latest" | "none" = "none";
  resources: any[] = [];
  resourcesToFilterOut: any[] = [];

  rows: any[] = [];
  originRows: any[] = [];
  filters = {
    limit: 10, // records per page
    page: 0,
    searchTerm: "",
    // type: 'pending',
    filter: {
      requestTypes: [] as string[],
      requestStatus: "pending",
      resources: [] as string[],
      timeFilter: "none",
      timeRange: [] as string[],
      latestRound: 0,
      isAppendingHistory: false,
    },
    search: { searchKey: "", status: false ,searchType:"details" },
  };
  minPaginationSize = 2;
  pageList: number[] = [];
  totalRecords: number = 0;
  totalPages: number = 0;
  dataLoadingFlag: boolean = false;

  requestTypes = [
    { value: "live", label: "Live", checked: false },
    { value: "prerecorded", label: "Pre-recorded", checked: false },
    { value: "cameraman", label: "Camera Crew", checked: false },
  ];
  toolTipText = "";
  requestStatusTypes = ["pending", "approved", "rejected"];
  requestStatusType = "pending";
  selectedRequest!: any;

  searchType: string = 'details';

  resourceOwnerData: { [key: string]: string[] } = {};
  resourceData:any=[];

  userTimeZone: any;
  isExpired:boolean=false;
  isRecurring:boolean=false;

  requestBookingId:any;
  requestStatus:any;

  subscriptions: any = new Subscription();
  constructor(
    private cdref: ChangeDetectorRef,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private modalService: NgbModal,
    private router: Router,
    private adminService: AdminService,
    private fb: FormBuilder,
    private authService: AuthService,
    private baseService: BaseService,
    private modal: NgbModal,
    private requestService: RequestService,
    private dashboardService: DashboardService,
    private dataService: DataService,
    private globals: Globals,
    private spinner: NgxSpinnerService,
   
  ) { }

  ngOnInit(): void {

    this.userTimeZone = this.dataService.getUserTimeZone();
   

    this.route.queryParams.subscribe((params: any) => {
      // this.filters.type = params.type
      // if (!params.type) {
      //   const params: Params = { type: 'pending' }
      //   this.router.navigate([], {
      //     relativeTo: this.route,
      //     queryParams: params,
      //   })
      // }
      if (params.request_id) {
        this.viewRequest(params.request_id);
      }
    });

    // this.authService.userCredentials$.subscribe((data: Principal) => {
    //   this.imageUrl = `${this.serverUrl}/uploads/users/${data.credentials.id}/${data.profileImage}`;
    // })
      
    this.fetchEssentialData();
    this.getUserPreferences();
    this.listenToNewRequests();

    if (this.isDateFilter) {
      if (this.selectedTimeRangeType === "daily")
        if (!this.dateFilterModel?.year) return;
      if (this.selectedTimeRangeType === "weekly")
        if (!(this.startFilterDateModel?.year && this.endFilterDateModel?.year))
          return;
    }



  }

  onRadioChange(selectedRadio: string) {
    
    this.searchType = selectedRadio;
      this.filters.search.searchType=selectedRadio;
    
  }


  listenToNewRequests() {
    // Enable pusher logging - don't include this in production
    Pusher.logToConsole = false;

    var pusher = new Pusher(environment.pusherId, {
      cluster: "ap4",
    });

    var channel = pusher.subscribe("skynews");
    channel.bind("new-booking", (data: any) => {
      this.fetchEssentialData();
      this.renderData();
    });
    channel.bind("update-booking", (data: any) => {
      this.fetchEssentialData();
      this.renderData();
    });

    channel.bind("delete-booking", (data: any) => {
 
      this.fetchEssentialData();
      this.renderData(); 
      
    });

    this.subscriptions.add(channel);
  }

    fetchEssentialData() {
      this.baseService.getHomeSummary().subscribe({
        next: (data: any) => {
          this.summary = data;
          
         
          this.cdref.detectChanges();
          this.dataLoadingFlag = false;
        },
        error: (err: any) => {
          // this.spinner.hide();
          console.log("data error: ", err);
          // this.cdref.detectChanges();
        },
      });
    }

  isAllowDeleteButton(row: any) {
    // old implem from Ui
    
   
    if (this.userDetails._id == row.requestedBy.id) {
      return true;
    }

    if(this.isRequestRejected(row)){
      return true;
    }
    

    // new implem
    // allow admin to delete expired pending request
    if (!this.isRequestApproved(row) && this.isUserAdmin(row) && !this.isRequestApproved(row)) {
      if (this.isRequestExpired(row)) {
       
        return true;
      }
    }
    return false;
  }

  // todo:
  // tobe refactor
  isRequestExpired(request: any) {

    const date = new Date(request.endDateTime).getTime();
    const today = new Date().getTime();
    return date <= today
  }

  isRequestApproved(request: any) {
    return request.status == "approved"
  }
  isRequestRejected(request: any) {
    return request.status == "rejected"
  }

  isRequestOwned(request: any) {
    const requestedBy = request.requestedBy;
    return requestedBy.id == this.globals.principal.credentials.id
  }

  isUserAdmin(request: any) {
    return this.globals.principal.isAdmin()
  }

  handleSearchKeyChange(event: any) {
    this.searchKey = event.target.value;
    this.filters.search.searchKey = this.searchKey;
  }

  handleSearchAction(status = true) {
    
    if (!status) {
     
      this.searchKey = "";
    }
    this.filters.search.status = status;
    this.renderData();
  }

  toggleDateFilter(event: any) {
    this.isDateFilter = event.target.checked;
    this.setFilterBtnVisibility();
  }

  setFilterBtnVisibility() {
    if (this.isDateFilter) {
      if (this.selectedTimeRangeType === "daily") {
        if (this.dateFilterModel?.year) {
          this.filterBtnVisibility = true;
        } else {
          this.filterBtnVisibility = false;
        }
      }
      if (this.selectedTimeRangeType === "weekly") {
        if (this.startFilterDateModel?.year && this.endFilterDateModel?.year) {
          this.filterBtnVisibility = true;
        } else {
          this.filterBtnVisibility = false;
        }
      }
    } else {
      this.dateFilterModel = {};
      this.startFilterDateModel = {};
      this.endFilterDateModel = {};
      this.filterBtnVisibility = true;
    }
  }

  handleDateFilterChange() {
    if (this.isDateFilter) {
      if (this.selectedTimeRangeType === "daily")
        if (!this.dateFilterModel?.year) this.filterBtnVisibility = false;
      if (this.selectedTimeRangeType === "weekly")
        if (!(this.startFilterDateModel?.year && this.endFilterDateModel?.year))
          this.filterBtnVisibility = false;
    } else {
      // this.selectedTimeRangeType = "latest";
      this.filterBtnVisibility = true;
    }
  }

  toggleAllRequestTypes($event: any) {
    for (let i = 0; i < this.requestTypes.length; i++) {
      this.requestTypes[i].checked = $event.target.checked;
    }
    this.allRequestTypesToggles = $event.target.checked;
  }
  toggleRequestTypes(requestType: any, event: any) {
    const index = this.requestTypes.findIndex(
      (item) => item.value === requestType.value
    );
    this.requestTypes[index].checked = event.target.checked;

    if (this.requestTypes.filter((item) => item.checked === false).length > 0) {
      this.allRequestTypesToggles = false;
    } else {
      this.allRequestTypesToggles = true;
    }
  }
  toggleResourceFilter(resource: any, event: any) {
  
    const index = this.resources.findIndex((item) => item._id === resource._id);
    if (!event.target.checked) this.allFilterResourcesToggled = false;
    this.resources[index].checked = event.target.checked;

    if (this.resources.filter((item) => item.checked === false).length > 0) {
      this.allFilterResourcesToggled = false;
    } else {
      this.allFilterResourcesToggled = true;
    }
  }
  toggleAllResourceFilter(event: any) {
    for (let i = 0; i < this.resources.length; i++) {
      this.resources[i].checked = event.target.checked;
    }
    this.allFilterResourcesToggled = event.target.checked;
  }

  getMultiActionBtnStatus() {
    return this.rows.filter((item) => item.checked === true).length > 0;
  }

  toggleResource(resource: any, event: any) {
    for (let i = 0; i < this.rows.length; i++) {
      if (this.rows[i]._id == resource._id) {
        this.rows[i].checked = event.target.checked;
      }
    }
  }

  isTicked() {
    return this.rows.filter((item) => item.checked === true).length > 0;
  }

  changeRequestStatusType(event: any) {
    this.requestStatusType = this.selectedRequestStatusType;
  }
  changeTimeRangeType(event: any) {
    this.setFilterBtnVisibility();
    // this.selectedTimeRangeType = this.selectedRequestStatusType
  }

  isDisabled = (date: NgbDate) => {
    const currentDate = new Date();
    return this.minDate?.year
      ? date.before(this.minDate) || false
      : date.before({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        day: currentDate.getDate(),
      }) || false;
  };

  toggleAllResources(event: any) {
    for (let i = 0; i < this.rows.length; i++) {
      if (this.rows[i].isFullyAuthorized)
        this.rows[i].checked = event.target.checked;
    }
    this.allResourceToggled = event.target.checked;
  }

  openFilterModal(modalId: any) {
    // this.resourcesToFilterOut = this.getFilteredResourcesIds()
    this.showModal(modalId);
  }

  showModal(modalId: any) {
    this.modalObject = this.modal.open(modalId, { size: "lg", centered: true });
  }

  renderData() {
    this.spinner.show();
    const { timeFilter, timeRange, latestRound } = this.filters.filter;
 
    
    let endDate: Date = new Date();
    let currentDate = new Date();
    // Set the time to the last hour of the day
   endDate.setHours(23, 59, 59, 999);
    
    if (timeFilter === "daily" && timeRange.length > 0) {
      endDate = this._date(JSON.parse(timeRange[0]));
      endDate.setHours(23);
      endDate.setMinutes(59);
      endDate.setSeconds(59);
    }
    if (timeFilter === "weekly" && timeRange.length > 0) {
      endDate = this._date(JSON.parse(timeRange[1]));
      endDate.setHours(23);
      endDate.setMinutes(59);
      endDate.setSeconds(59);
    }
    currentDate.setHours(0, 0, 0, 0);
    

    if (
      !this.isDateFilter &&
      this.latestRound > 0 &&
      this.isAppendingDateApplied &&
      this.isAppendingHistoryData
    ) {
      this.filters.filter.timeFilter = "latest";
      const numberOfDays = latestRound;    
      
      let currentdate=new Date();
      const previousDate = new Date(currentdate); // Create a new date object based on the current date
      previousDate.setDate(currentDate.getDate() - numberOfDays); // Subtract 'numberOfDays' from the new date object
      previousDate.setHours(23);
      previousDate.setMinutes(59);
      previousDate.setSeconds(59);
      endDate = previousDate; // Use previousDate as endDate

      currentDate.setDate(currentDate.getDate() - numberOfDays); // Subtract 1 day to get the previous day
      currentDate.setHours(0);
      currentDate.setMinutes(0);
      currentDate.setSeconds(0);
     
      // const roundDate =currentDate.getTime() - 1000 * 60 * 60 * 24 * (numberOfDays - 1);
      // endDate = new Date(roundDate);
      // endDate.setHours(23);
      // endDate.setMinutes(59);
      // endDate.setSeconds(59);
    }
   

    this.baseService
      .getRequestListByFilter(
        this.filters.page,
        this.filters.limit,
        this.filters.search,
        {
          ...this.filters.filter,
          timeRange:
            timeFilter === "daily" && timeRange.length > 0 ? [`${this._date(JSON.parse(timeRange[0]))}`, `${endDate}`]
              : timeFilter === "weekly" && timeRange.length > 0 ? [`${this._date(JSON.parse(timeRange[0]))}`, `${endDate}`]
              : [`${currentDate}`, `${endDate}`],
        },
        this.sortBy,
        this.userTimeZone
      )
      .subscribe({
        next: async (data: any) => {

          
          
          if (data == null) {
            this.rows = [];
            this.totalRecords = 0;
            this.totalPages = 0;
          } else {

            console.log(data)
            this.rows = data.requests.map((item: any) => {

              let tooltip = "You can't approve because of no permission about ";
              item.nopermission.map((pitem: any) => {
                tooltip += pitem + " and ";
              });
              tooltip = tooltip.slice(0, -5);
           
              
              if (new Date(item.endDateTime).getTime() <= new Date().getTime()) {
                tooltip = "You can't approve because of past request.";
                item.isFullyAuthorized = false;
              }

              item.isFullyAuthorized = true;
            

              return {
                ...item,
                checked: false,
                tooltip: tooltip,
              };
             
            });

            if(data.showModal){
             
              this.showSearchHistory();
            }

            this.originRows = this.rows;
            this.totalRecords = data.total;
            this.totalPages = data.totalPages;

        
          }
          this.pageList = [...Array(this.totalPages).keys()];
         
          this.allResourceToggled = false;
          // this.filters.search.status = false;
          this.cdref.detectChanges();
          this.dataLoadingFlag = false;
          this.userList();
          setTimeout(() => {
            
            this.spinner.hide();
          }, 600);

        },
        error: (err: any) => {
         
          console.log("data error: ", err);
         
        },
      });
  }


  showSearchHistory(){
    this.modaleRef = this.modal.open(this.showHistoryDataStatus, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
      windowClass: 'custom-modal-auto'
    });
  }

  getDateWithNumberofDays(value: number) { }

  handleRosourceSort() {

    if (this.sortBy === "desc") {
      this.sortBy = "none";
      this.renderData();
      return;
    }
    if (this.sortBy === "asc") {
      this.sortBy = "desc";
      this.renderData();
      return;
    }
    if (this.sortBy === "none") {
      this.sortBy = "asc";
      this.renderData();
      return;
    }
  }

  getUserPreferences() {
    this.dataService.getUserPreferences().subscribe((data) => {
      this.userDetails = data;
      const homeFilters = this.userDetails.preferences?.homeFilters;
      if (!((homeFilters?.requestTypes?.length ?? 0) > 0)) {
        this.filters.filter.requestTypes = this.requestTypes.map(
          (item) => item.value
        );
        homeFilters.requestTypes = this.filters.filter.requestTypes;
      } else {
        this.filters.filter.requestTypes = homeFilters.requestTypes;
      }
      if (!(homeFilters?.requestStatus ?? "")) {
        this.filters.filter.requestStatus = "pending";
      } else {
        this.filters.filter.requestStatus = homeFilters.requestStatus;
      }
      if (!((homeFilters?.resources?.length ?? 0) > 0)) {
        this.filters.filter.resources = [];
      } else {
        this.filters.filter.resources = homeFilters.resources;
      }
      this.selectedTimeRangeType = homeFilters?.timeFilter ?? "none";
      if (
        (homeFilters?.timeFilter === "daily" ||
          homeFilters?.timeFilter === "weekly") &&
        homeFilters?.timeRange?.length > 0
      ) {
        this.isDateFilter = true;
        this.filterBtnVisibility = true;
        this.filters.filter.timeRange = homeFilters.timeRange;
        if (homeFilters?.timeFilter === "daily") {
          this.filters.filter.timeFilter = "daily";
          this.selectedTimeRangeType = "daily";
          this.dateFilterModel = JSON.parse(homeFilters?.timeRange?.[0]);
        }
        if (homeFilters?.timeFilter === "weekly") {
          this.filters.filter.timeFilter = "weekly";
          this.selectedTimeRangeType = "weekly";
          this.startFilterDateModel = JSON.parse(homeFilters.timeRange?.[0]);
          this.endFilterDateModel = JSON.parse(homeFilters.timeRange?.[1]);
        }
        // if (homeFilters?.timeFilter === "latest") {
        //   this.filters.filter.timeFilter = "latest"
        //   this.latestRound = Number(homeFilters.timeRange?.[0])
        // }
      } else {
        this.isDateFilter = false;
        this.filterBtnVisibility = true;
        this.filters.filter.timeFilter = "none";
      }
      if (homeFilters?.latestRound && homeFilters?.isAppendingHistory) {
        this.latestRound = homeFilters?.latestRound;
        this.isAppendingHistoryData = true;
        this.filters.filter.isAppendingHistory =
          homeFilters?.isAppendingHistory;
        this.isAppendingDateApplied = true;
        this.handleAppendingDataApply();
      }
      this.filters.filter.requestTypes = homeFilters.requestTypes;
      for (let i = 0; i < homeFilters.requestTypes.length; i++) {
        const index = this.requestTypes.findIndex(
          (item) => item.value === homeFilters.requestTypes[i]
        );
        if (index > -1) {
          this.requestTypes[index].checked = true;
        } else {
          this.requestTypes[index].checked = false;
        }
      }
      this.allRequestTypesToggles = !(
        this.requestTypes.filter((item) => !item.checked).length > 0
      );
      this.requestStatusType = this.filters.filter.requestStatus;
      this.selectedRequestStatusType = this.filters.filter.requestStatus as
        | "pending"
        | "approved"
        | "rejected";

      this.renderData();
      this.getResources();
    });
  }

  userList() {
    // this.spinner.show();
    this.adminService.getUserListAll()
      .subscribe({
        next: (data: any) => {
  
          this.users = data;
          this.rows.map((r) => {
            const requestUser = this.users.filter((user) => user._id == r.requestedBy.id)[0];
       
            if (r.status == "pending") {
              if (requestUser.permissions.includes('APPROVE_REJECT_REQUEST') ) {
              
                this.approveEnable = true;
                // r.isFullyAuthorized = true;
              } else {
              
                this.approveEnable = false;
              }
            }

          })
          // console.log("%c Line:559 🍢 this.rows", "color:#93c0a4", this.rows);
        },
        error: (err: any) => {

        },
      });
  }

  handleToogleAppendingHistoryData(event: any) {
    this.isAppendingHistoryData = event.target.checked;
   
    if (!this.isAppendingHistoryData) {
      this.minDate = {} as NgbDateStruct;
      this.isAppendingDateApplied = false;
      const currentDate = new Date();
      const currentDateObject = {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        day: currentDate.getDate(),
      };
      if (this.selectedTimeRangeType === "daily" && this.isDateFilter) {
        const dateTime = this._date(this.dateFilterModel).getTime();
        if (currentDate.getTime() > dateTime) {
          this.dateFilterModel = currentDateObject;
        }
      }
      if (this.selectedTimeRangeType === "weekly" && this.isDateFilter) {
        const dateTime = this._date(this.startFilterDateModel).getTime();
        if (currentDate.getTime() > dateTime) {
          this.startFilterDateModel = currentDateObject;
        }
      }
    }
  }

  handleAppendHistoryDataModleChange() { }

  handleAppendingDataApply() {
    this.isAppendingDateApplied = true;
    this.filters.filter.latestRound = this.latestRound;
    const currentDate = new Date();
    const limitDateTime =
      currentDate.getTime() - this.latestRound * 24 * 60 * 60 * 1000;
    const limitDate = new Date(limitDateTime);
    this.minDate = {
      year: limitDate.getFullYear(),
      month: limitDate.getMonth() + 1,
      day: limitDate.getDate(),
    };

    if (this.selectedTimeRangeType === "daily" && this.dateFilterModel?.year) {
      const dateTime = this._date(this.dateFilterModel).getTime();
      if (dateTime < limitDateTime) {
        this.dateFilterModel = this.minDate;
      }
    }
    if (
      this.selectedTimeRangeType === "weekly" &&
      this.startFilterDateModel?.year
    ) {
      const dateTime = this._date(this.startFilterDateModel).getTime();
      if (dateTime < limitDateTime) {
        this.startFilterDateModel = this.minDate;
        this.handleStartFilterDateChange();
      }
    }
  }

  handleDateChange(event: any) {
    this.setFilterBtnVisibility();
    this.cdref.detectChanges();
  }

  handleLatestDayRoundChange(event: any) {
    this.setFilterBtnVisibility();
    this.cdref.detectChanges();
  }

  handleStartFilterDateChange() {
    const dateString = this._date(this.startFilterDateModel);
    const milliseconds = dateString.getTime() + 3600 * 24 * 6 * 1000;
    const newDate = new Date(milliseconds);
    this.endFilterDateModel = {
      year: newDate.getFullYear(),
      month: newDate.getMonth() + 1,
      day: newDate.getDate(),
    };
    this.setFilterBtnVisibility();
  }
  updateUserReferences() {
    const data = {
      requestTypes: this.requestTypes
        .filter((item) => item.checked)
        .map((item) => item.value),
      requestStatus: this.requestStatusType,
      resources: this.resources
        .filter((item) => item.checked)
        .map((item) => item._id),
      timeFilter: this.isDateFilter ? this.selectedTimeRangeType : "none",
      latestRound: this.latestRound,
      isAppendingHistory: this.isAppendingDateApplied,
      timeRange:
        this.selectedTimeRangeType === "daily"
          ? [`${JSON.stringify(this.dateFilterModel ?? {})}`]
          : this.selectedTimeRangeType === "weekly"
            ? [
              `${JSON.stringify(this.startFilterDateModel ?? {})}`,
              `${JSON.stringify(this.endFilterDateModel ?? {})}`,
            ]
            : [""],
    };
    return this.dataService.upu(data, "homeFilters");
  }

  _date(dateString: any): Date {
    return new Date(`${dateString.year}-${dateString.month}-${dateString.day}`);
  }

  getResources() {
    this.dashboardService
      .getResources()
      .pipe(
        map((data: any) => {
          return data.map((d: any) => {
            if (
              (this.userDetails.preferences?.homeFilters?.resources?.length ??
                0) > 0
            ) {
              if (
                this.userDetails.preferences?.homeFilters?.resources?.includes(
                  d._id
                )
              ) {
                d.checked = true;
              } else {
                d.checked = false;
                // If a single resource is unchecked then the toggleAll check must be unchecked;
                this.allFilterResourcesToggled = false;
              }
            } else {
              d.checked = false;
              this.allFilterResourcesToggled = false;
            }
            return d;
          });
        })
      )
      .subscribe((data: any) => {
        data.sort((a: any, b: any) => {
          const nameA = a.name.toUpperCase();
          const nameB = b.name.toUpperCase();

          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });

        this.resources = data;
        //   // Initialize the resourcesToFilterOut from the resources
        this.resourcesToFilterOut = this.getFilteredResourcesIds();
        this.allFilterResourcesToggled = !(
          this.resources.findIndex((item) => item.checked === false) > -1
        );
      });
  }

  handleShowMoreClick(rowId: string) {
    const index = this.showMoreArr.findIndex((item) => item === rowId);
    if (index > -1) {
      this.showMoreArr.splice(index, 1);
    } else {
      this.showMoreArr.push(rowId);
    }
  }

  handleFilter(status = true) {
    
    if (status) {
      if (this.isDateFilter) {
        if (this.selectedTimeRangeType === "daily")
          if (!this.dateFilterModel?.year) return;
        if (this.selectedTimeRangeType === "weekly")
          if (
            !(this.startFilterDateModel?.year && this.endFilterDateModel?.year)
          )
            return;
      }
      this.updateUserReferences().subscribe((req) => {
        this.modaleRef.close();
        this.fetchEssentialData();
        this.getUserPreferences();
      });
    } else {
      this.toggleAllRequestTypes({ target: { checked: true } });
      this.toggleAllResourceFilter({ target: { checked: true } });
      this.isDateFilter = false;
      this.isAppendingDateApplied = false;
      this.isAppendingHistoryData = false;
      this.latestRound = 0;
      this.updateUserReferences().subscribe((req) => {
        this.fetchEssentialData();
        this.getUserPreferences();
      });
    }



  }


  getFilteredResourcesIds() {
    const resourceIds: Array<any> = [];
    this.resources.forEach((rs: any) => {
      if (rs.checked) {
        resourceIds.push(rs._id);
      }
    });

    return resourceIds;
  }
  setPage(page: number) {
    
    this.filters.page = page;
    this.renderData();
  }

  isOneDayRequest(startDate: any, endDate: any) {
    const date1 = new Date(startDate);
    const date2 = new Date(endDate);
    return date1.getDate() === date2.getDate();
  }

  getData(requestType: string) {
    this.requestStatusType = requestType;
    this.rows = [];
    // Reset the filter options
    this.filters.limit = 10; // records per page
    this.filters.page = 0;
    this.filters.searchTerm = "";
    this.filters.filter.requestStatus = requestType;

    // if (!status) {
    //   this.searchKey = "";
    // }
    // this.filters.search.status = status;
    // this.renderData();

    if(this.searchKey != ""){
      this.filters.search.status = true;
    this.renderData();
    return;
    }
    // console.log("Search Key "+this.searchKey);
    // console.log("Search Status "+this.filters.search.status);


    this.updateUserReferences().subscribe(() => this.getUserPreferences());
    // if (requestType && this.requestStatusTypes.includes(requestType)) {
    //   this.router.navigate(['/home'], { queryParams: { type: requestType } })
    //   this.filters.filter.requestStatus = requestType
    //   this.renderData()
    // }
  }

  approveRequest() {
    const requestId = this.selectedRequest._id;
    this.requestService
      .changeMultiRequestStatus([`${requestId}`], "approved")
      .subscribe((req) => {
        this.modaleRef.close();
        this.fetchEssentialData();
        this.renderData();
      });
  }

  closeModal() {
    this.modaleRef.close();
    this.isRecurring=false;
    this.requestStatus=null;
    this.requestBookingId=null;
  }

  showResourceOwnerShipModal(bookingData:any){

   

    this.spinner.show();

    const resourceId: any[] = [];

    this.resourceOwnerData = {};

    let approval=bookingData.approvals;

    approval.forEach((approval: any) => {
      if (!resourceId.includes(approval.resource.id)) {
          resourceId.push(approval.resource.id);
      }
  });




    const requestObject = {
      resourceId: resourceId,     
    };

    this.requestService.getResourceOwners(requestObject).subscribe({
      next: (data: any) => {
        this.resourceOwnerData = data.resourceOwnerData; // Store the data in the component variable
        this.spinner.hide()
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

  handleFilterModalClose() {
    this.closeModal();
    this.selectedTimeRangeType = this.filters.filter.timeFilter as
      | "weekly"
      | "daily"
      | "latest";
    this.isDateFilter =
      this.selectedTimeRangeType === "daily" ||
      this.selectedTimeRangeType === "weekly";
    this.isAppendingHistoryData = this.filters.filter.isAppendingHistory;

    this.selectedRequestStatusType = this.filters.filter
      .requestStatus as typeof this.selectedRequestStatusType;
    this.requestStatusType = this.selectedRequestStatusType;
    if (!this.isDateFilter) {
      this.startFilterDateModel = null;
      this.dateFilterModel = null;
    }

    for (let i = 0; i < this.filters.filter.requestTypes.length; i++) {
      const index = this.requestTypes.findIndex(
        (item) => item.value === this.filters.filter.requestTypes[i]
      );
      if (index > -1) {
        this.requestTypes[index].checked = true;
      }
    }

    if (this.requestTypes.filter((item) => item.checked === false).length > 0) {
      this.allRequestTypesToggles = false;
    } else {
      this.allRequestTypesToggles = true;
    }
    const newResources = this.resources.map((d: any) => {
      if (this.filters.filter.resources.length > 0) {
        if (this.filters.filter.resources.includes(d._id)) {
          d.checked = true;
        } else {
          d.checked = false;
          // If a single resource is unchecked then the toggleAll check must be unchecked;
          this.allFilterResourcesToggled = false;
        }
      } else {
        d.checked = false;
        this.allFilterResourcesToggled = false;
      }
      return d;
    });
    this.resources = newResources;

    this.isAppendingHistoryData = this.filters.filter.isAppendingHistory;
    this.isAppendingDateApplied = this.filters.filter.isAppendingHistory;
    this.latestRound = this.filters.filter.latestRound;

    this.allFilterResourcesToggled = !(
      this.resources.findIndex((item) => item.checked === false) > -1
    );
  }

  viewRequest(requestId: any) {
    if( this.modaleRef){
      this.modaleRef.close();
    }
    this.requestService.findOne(requestId).subscribe((data: any) => {
  
      this.selectedRequest = data.request;
      const modalRef = this.modalService.open(ViewRequestComponent, {
        centered: true,
        size: "lg",
        backdrop: 'static',
        keyboard: false,
      });
      modalRef.componentInstance.request = this.selectedRequest;
      modalRef.componentInstance.requestStatus.subscribe((state: any) => {
        this.renderData();
        this.fetchEssentialData();
      });
    });
  }
  deleteMultiRequestConfirm() {
    // this.selectedRequest = request
    this.modaleRef = this.modal.open(this.multiDeleteConfirmModalContent, {
      backdrop: "static",
      size: "sm",
      keyboard: false,
    });
  }
  deleteMultiRequest() {
    const requestIds = this.rows
      .filter((item) => item.checked === true)
      .map((item) => item._id);
    this.requestService
      .changeMultiRequestStatus(requestIds, "rejected")
      .subscribe((req) => {
        this.modaleRef.close();
        this.fetchEssentialData();
        this.renderData();
      });
  }
  approveMultiRequestConfirm() {
    // this.selectedRequest = request
    this.modaleRef = this.modal.open(this.multiApproveConfirmModalContent, {
      backdrop: "static",
      size: "sm",
      keyboard: false,
    });
  }
  handleOpenFilterModal() {
    this.modaleRef = this.modal.open(this.homeFilter, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
    });
  }
  approveMultiRequest() {
    const requestIds = this.rows
      .filter((item) => item.checked === true)
      .map((item) => item._id);
    this.requestService
      .changeMultiRequestStatus(requestIds, "approved")
      .subscribe((req) => {
        this.modaleRef.close();
        this.fetchEssentialData();
        this.renderData();
      });
  }
  approveRequestConfirm(request: any) {
  
    const requestDateTime = moment(request.endDateTime);

    const isExpired = true;
    // const isExpired = requestDateTime.diff(moment()) <= 0;
  
    if(isExpired){
      this.modaleRef = this.modal.open(this.timeExpired, {
        backdrop: "static",
        size: "sm",
        keyboard: false,
      });

      return;
    }

    this.selectedRequest = request;
    this.modaleRef = this.modal.open(this.approveConfirmModalContent, {
      backdrop: "static",
      size: "sm",
      keyboard: false,
    });
  }

  refreshPage() {
    // window.location.reload();
    this.renderData();
    this.closeModal();
  }
  

  deleteRequestConfirm(request: any) {
    this.selectedRequest = request;
    this.modaleRef = this.modal.open(this.confirmModalContent, {
      backdrop: "static",
      size: "sm",
      keyboard: false,
    });
  }

  deleteRequest() {
    const requestId = this.selectedRequest._id;
    this.requestService.deleteRequest(requestId).subscribe((req) => {
      this.modaleRef.close();
      this.fetchEssentialData();
      this.renderData();
    });
  }

  editRequest(requestId: string) {
    this.router.navigate(["/request", "edit", requestId]);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  showResourceModal(requestData:any){
   
    const resourceId=[];
    const bookingData=[];
    this.resourceData=[];

    console.log(requestData)

    let startDateTime=requestData.startDateTime;
    let endDateTime=requestData.endDateTime;
    let resourceName=requestData.resourceId?._id ?? requestData.controlRoom?._id;
    let participants=requestData.participants;
    let status=requestData.status;
    this.requestStatus=requestData.status;
    this.requestBookingId=requestData._id;
    const approvals=requestData.approvals;
    const primaryStatus=status;

    console.log(approvals)
    console.log(participants)

    let StartDateTime:any;
    let EndDateTime:any;

    if(requestData.ocurrenceOptions.eventType == "recurring"){

      this.isRecurring=true;
  
    }


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
      participants.forEach(participant => {
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
            status:status,
            // status:status ?? primaryStatus,
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
    // this.spinner.hide();
  }

  capitalizeFirstLetter(inputString: string): string {
    return inputString.charAt(0).toUpperCase() + inputString.slice(1);
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
}
