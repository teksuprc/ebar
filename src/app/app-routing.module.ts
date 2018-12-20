import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { ApiComponent } from './api/api.component';
import { ToolsComponent } from './tools/tools.component';
import { ProductsComponent } from './products/products.component';

const routes: Routes = [
  { path: '', redirectTo: '/products', pathMatch: 'full' },
  { path: 'api', component: ApiComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'products/:app', component: ToolsComponent }
];


@NgModule({
  imports: [ RouterModule.forRoot(routes, { enableTracing: false }) ],
  exports: [ RouterModule ]
})

export class AppRoutingModule { }
