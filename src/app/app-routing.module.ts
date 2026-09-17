import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadChildren: () => import('./pages/home/home.module').then((m) => m.HomePageModule) },
  { path: 'intro', loadChildren: () => import('./pages/intro/intro.module').then((m) => m.IntroPageModule) },
  { path: 'options', loadChildren: () => import('./pages/options/options.module').then((m) => m.OptionsPageModule) },
  { path: 'debug', loadChildren: () => import('./pages/debug/debug.module').then((m) => m.DebugPageModule) },
  { path: 'about', loadChildren: () => import('./pages/about/about.module').then((m) => m.AboutPageModule) },
  { path: 'connect/:deviceId', loadChildren: () => import('./pages/connect/connect.module').then((m) => m.ConnectPageModule) },
  { path: 'information/:deviceId', loadChildren: () => import('./pages/information/information.module').then((m) => m.InformationPageModule) },
  { path: 'scanner-control/:deviceId', loadChildren: () => import('./pages/scanner-control/scanner-control.module').then((m) => m.ScannerControlPageModule) },
  { path: 'configure/:deviceId', loadChildren: () => import('./pages/configure/configure.module').then((m) => m.ConfigurePageModule) },
  { path: 'multiconf/:deviceId', loadChildren: () => import('./pages/multiconf/multiconf.module').then((m) => m.MulticonfPageModule) },
  { path: 'multiconf-paste/:deviceId', loadChildren: () => import('./pages/multiconf-paste/multiconf-paste.module').then((m) => m.MulticonfPastePageModule) },
  { path: 'multiconf-file/:deviceId', loadChildren: () => import('./pages/multiconf-file/multiconf-file.module').then((m) => m.MulticonfFilePageModule) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}