import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Send } from '../../../model/send.model';
import { Global } from '../../../service/global.service';
import { WalletService } from '../../../service/wallet.service';
import { MatSnackBar, MAT_DIALOG_DATA, MatDialogRef, MatSpinner } from "@angular/material";
import { Router } from '@angular/router';
import { ZXingScannerComponent } from '@zxing/ngx-scanner';
import { Result } from '@zxing/library';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss']
})

export class SendComponent implements OnInit {

  form: FormGroup;
  submitted = false;
  
  @ViewChild('scanner')
  scanner: ZXingScannerComponent;

  qrResult: Result;
  hasDevices: boolean;
  hasPermission: boolean;
  qrResultString: string;
  displayCamDiv: boolean = false;

  availableDevices: MediaDeviceInfo[];
  currentDevice: MediaDeviceInfo;

  wallet_address: any;
  transaction_url: string;
  isSuccess: boolean = false;
  loader: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private sendModel: Send,
    private globalService: Global,
    public snackBar: MatSnackBar,
    private walletService: WalletService,
    private dialogRef: MatDialogRef<SendComponent>,
    @Inject(MAT_DIALOG_DATA) data
  ) {
    this.wallet_address = data.address;
  }

  ngOnInit() {

    this.scanner.camerasFound.subscribe((devices: MediaDeviceInfo[]) => {
      this.hasDevices = true;
      this.availableDevices = devices;

      // selects the devices's back camera by default
      // for (const device of devices) {
      //     if (/back|rear|environment/gi.test(device.label)) {
      //         this.scanner.changeDevice(device);
      //         this.currentDevice = device;
      //         break;
      //     }
      // }
    });

    this.scanner.camerasNotFound.subscribe(() => this.hasDevices = false);
    this.scanner.scanComplete.subscribe((result: Result) => this.qrResult = result);
    this.scanner.permissionResponse.subscribe((perm: boolean) => this.hasPermission = perm);

    this.form = this.fb.group({
      address: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0), Validators.pattern('^[0-9]*$')]],
      note: ['', Validators.pattern('^(?=.{2,300}$).*')],
    });
  }

  displayCameras(cameras: MediaDeviceInfo[]) {
    this.availableDevices = cameras;
  }

  handleQrCodeResult(resultString: string) {
    this.f.address.setValue(resultString);
    this.displayCamDiv = false;
    this.f.address.enable();
    this.currentDevice = undefined;
  }

  onClickScanner() {
    if(this.displayCamDiv) {
      this.displayCamDiv = false;
      this.f.address.enable();
      this.currentDevice = undefined;
      return;
    }
    if(this.hasDevices && this.hasPermission){
      this.displayCamDiv = true;
      this.f.address.reset();
      this.f.address.disable();
      this.currentDevice = this.availableDevices[0];
    }
    else if (!this.hasPermission) {
      this.snackBar.open("Permission denied for camera!");
    }
    else if(!this.hasDevices) {
      this.snackBar.open("Camera not found!");
    }
    else {
      this.snackBar.open("Video device connection not established!");
    }
  }
  
  get f() { return this.form.controls; }

  send() {

    this.submitted = true;
    this.loader = true;
    this.isSuccess = false;

    if (this.form.invalid) {
      this.loader = false;
      return;
    }
    else {

      this.transaction_url = 'https://tronscan.org/#/transaction/';
      this.sendModel.to = this.f.address.value;
      this.sendModel.from = this.wallet_address;
      this.sendModel.amount = this.f.amount.value;
      this.sendModel.note = this.f.note.value;

      let token = JSON.parse(localStorage.getItem('userToken'));

      this.walletService.send(this.sendModel, token)
        .subscribe(res => {
          if (res.code === 200) {
            this.isSuccess = true;
            this.loader = false;
            this.submitted = false;
            this.form.reset();
            this.transaction_url = this.transaction_url + res.data;
          }
          else {
            this.loader = false;
            this.snackBar.open(res.message);
          }
        }, error => {
          this.loader = false;
          this.snackBar.open(error.error.message);
          if (error.error.code == 401) {
            localStorage.clear();
            setTimeout(() => {
              this.globalService.state = "SIGNUP";
              this.router.navigate(['/login']);
            }, 1500);
          }
        });
    }

  }

  close() {
    this.dialogRef.close();
  }

}
