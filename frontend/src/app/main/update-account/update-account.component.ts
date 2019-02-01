import { Component, OnInit } from '@angular/core';
import { locale as english } from './i18n/en';
import { locale as turkish } from './i18n/tr';
import { Meta, Title } from '@angular/platform-browser';
import { Validation } from '../../validation/validation';
import { MatSnackBar, MatSpinner } from '@angular/material';
import { Global } from '../../service/global.service';
import { UserService } from '../../service/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FuseTranslationLoaderService } from '../../../@fuse/services/translation-loader.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-update-account',
  templateUrl: './update-account.component.html',
  styleUrls: ['./update-account.component.scss']
})
export class UpdateAccountComponent implements OnInit {

  appData: Object;
  currentEmail: string;
  loader: boolean = false;
  submitted: boolean = false;
  updateEmailForm: FormGroup;
  public ValidationsClass: Validation;

  /**
   * Constructor
   *
   * @param {FuseTranslationLoaderService} _fuseTranslationLoaderService
   */
  constructor(
    private meta: Meta,
    private router: Router,
    private fb: FormBuilder,
    private titleService: Title,
    private globalService: Global,
    public snackBar: MatSnackBar,
    private userService: UserService,
    private _fuseTranslationLoaderService: FuseTranslationLoaderService
  ) {
    this._fuseTranslationLoaderService.loadTranslations(english, turkish);

    this.titleService.setTitle("Update Account Email");
    document.domain !='healthport.io'?this.meta.addTag({ name: 'robots', content: 'noindex' }):false;
    this.meta.addTags([
      { httpEquiv: 'Content-Type', content: 'text/html' },
      { charset: 'UTF-8' },
      { property: 'og:title', content: "Update Account Email" },
      { name: 'description', content: 'Manage your account email via Health Port.' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
    ], true);

    this.ValidationsClass = new Validation();
  }

  ngOnInit() {
    this.appData = JSON.parse(localStorage.getItem('data'));
    this.currentEmail = this.appData['email'];
    this.updateEmailForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      currentPassword: ['', Validators.required]
    });
  }

  get f() { return this.updateEmailForm.controls; }

  changeEmail() {
    this.loader = true;
    
    if (this.updateEmailForm.invalid) {
      this.submitted = true;
      this.loader = false;
      return;
    }
    else {

      let userId = this.appData['user_id'];
      let token = JSON.parse(localStorage.getItem('userToken'));

      if (!this.ValidationsClass.verifyNameInputs(userId) || !this.ValidationsClass.verifyNameInputs(token)) {
        this.loader = false;
        return;
      }
      if(this.f.newEmail.value == this.currentEmail) {
        this.loader = false;
        this.snackBar.open("Email already exists!");
        return;
      }
      let data = {
        token : token,
        userId : userId,
        email : this.f.newEmail.value,
        password : this.f.currentPassword.value
      }
      
      //Save document service
      this.userService.updateAccountEmail(data)
        .subscribe(res => {
          if (res.code === 200) {
            this.loader = false;
            this.snackBar.open(res.message);
            localStorage.clear();
            localStorage.setItem('verificationToken', JSON.stringify(res.token));
              setTimeout(() => {
                this.globalService.state = "SIGNUP";
                localStorage.setItem('verificationEmail', JSON.stringify(this.f.newEmail.value));
                this.router.navigate(['/verification']); 
              }, 1500);
          }
          else {
            this.loader = false;
            this.snackBar.open(res.message);
          }
        }, error => {
          this.loader = false;
          this.snackBar.open(error.error.message);
          this.f.newEmail.clearValidators()
          this.f.currentPassword.clearValidators();
          this.updateEmailForm.reset();
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
}
