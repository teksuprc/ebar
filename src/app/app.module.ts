import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { DataService } from './data-service/data.service';

import { AppComponent } from './app.component';
import { ApiComponent } from './api/api.component';
import { ToolsComponent } from './tools/tools.component';
import { ProductsComponent } from './products/products.component';

@NgModule({
  declarations: [
    AppComponent,
    ApiComponent,
    ToolsComponent,
    ProductsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [DataService],
  bootstrap: [AppComponent]
})

export class AppModule { }
