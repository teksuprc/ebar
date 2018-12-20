import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Tool, ToolResponse } from '../app.models';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  private tools:Array<Tool> = [];

  constructor(private http:HttpClient) { }

  getTools(uri):Observable<Tool[]> {
    return this.http.get<ToolResponse>(uri)
      .pipe(map(res => res.data.map(t => new Tool(t.name, t.shortName, t.classification, t.desc, t.links))));
  }

}
