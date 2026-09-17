import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { MulticonfFilePage } from './multiconf-file.page';

const routes: Routes = [{ path: '', component: MulticonfFilePage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [MulticonfFilePage]
})
export class MulticonfFilePageModule {}