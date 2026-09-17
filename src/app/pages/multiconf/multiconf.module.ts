import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { MulticonfPage } from './multiconf.page';

const routes: Routes = [{ path: '', component: MulticonfPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [MulticonfPage]
})
export class MulticonfPageModule {}