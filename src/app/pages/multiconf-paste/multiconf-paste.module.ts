import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { MulticonfPastePage } from './multiconf-paste.page';

const routes: Routes = [{ path: '', component: MulticonfPastePage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [MulticonfPastePage]
})
export class MulticonfPastePageModule {}