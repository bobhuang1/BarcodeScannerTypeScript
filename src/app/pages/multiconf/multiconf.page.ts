import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Multi-configuration hub. A multi-conf file is an INI file describing many
 * registers to apply in one shot. Port of the original MulticonfController.
 */
@Component({
  selector: 'app-multiconf',
  templateUrl: './multiconf.page.html',
  styleUrls: ['./multiconf.page.scss']
})
export class MulticonfPage {
  deviceId = '';

  constructor(private route: ActivatedRoute, private router: Router) {
    this.deviceId = this.route.snapshot.params['deviceId'];
  }

  pasteConfiguration(): void {
    this.router.navigate(['/multiconf-paste', this.deviceId]);
  }

  chooseFile(): void {
    this.router.navigate(['/multiconf-file', this.deviceId]);
  }
}