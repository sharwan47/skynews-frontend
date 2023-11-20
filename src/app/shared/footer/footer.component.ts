import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/core/_services/data.service'

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {

  currentYear: number;
  version: any;

  constructor(
    private dataService: DataService,
  ) {
    this.currentYear = new Date().getFullYear();
   }

  ngOnInit(): void {

    this.dataService.getVersion().subscribe((data) => {
      this.version = data.app_version; // Assuming the API response contains a "value" property
    });

  }

}
