import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouteReuseStrategy, RouterModule } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { PrivacyModalComponent } from './components/privacy-modal/privacy-modal.component';

import { AppStateService } from './services/app-state.service';
import { SettingsService } from './services/settings.service';
import { LoggerService } from './services/logger.service';
import { BlocksService } from './services/blocks.service';
import { ScannerDataService } from './services/scanner-data.service';
import { BleService } from './services/ble.service';
import { MulticonfReaderService } from './services/multiconf-reader.service';
import { MulticonfSendService } from './services/multiconf-send.service';
import { ToastService } from './services/toast.service';

@NgModule({
  declarations: [AppComponent, PrivacyModalComponent],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    IonicModule.forRoot(),
    AppRoutingModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    AppStateService,
    SettingsService,
    LoggerService,
    BlocksService,
    ScannerDataService,
    BleService,
    MulticonfReaderService,
    MulticonfSendService,
    ToastService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}