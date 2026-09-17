import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { IntroPage } from './intro.page';

const routes: Routes = [{ path: '', component: IntroPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [IntroPage]
})
export class IntroPageModule {}