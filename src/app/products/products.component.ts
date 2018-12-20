import { Component, OnInit } from '@angular/core';

import { DataService } from '../data-service/data.service';
import { Tool } from '../app.models';


@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {

  private dataService:DataService;
  private title:string = 'Products';
  private tools:Array<Tool> = [];
  private selectedApp:Tool;

  constructor(dataSvc:DataService) {
    this.dataService = dataSvc;
  }

  ngOnInit() {
    //let url = 'http://localhost:4200/assets/tools.json';
    let url = 'https://localhost:4433/tools.json';

    this.dataService.getTools(url).subscribe( items => {
      this.tools = items;
    });
  }
}
