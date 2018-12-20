import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from  '@angular/common';

import { DataService } from '../data-service/data.service';
import { Tool } from '../app.models';


@Component({
  selector: 'app-tools',
  templateUrl: './tools.component.html',
  styleUrls: ['./tools.component.css']
})

export class ToolsComponent implements OnInit {
  title:string = "title: ";
  tool:Tool;

  constructor(
    private route:ActivatedRoute, 
    private dataService:DataService, 
    private location:Location
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
    //let url = 'http://localhost:4200/assets/tools.json';
    let url = 'https://localhost:4433/tools.json';
    let shortName = params.app;
    this.dataService.getTools(url)
      .subscribe(items => {
        this.tool = items.filter(t => t.shortName === shortName)[0];
        this.title = (this.tool) ? this.tool.name : '';
      });
    });
  }

  goBack() {
    this.location.back();
  }
}
