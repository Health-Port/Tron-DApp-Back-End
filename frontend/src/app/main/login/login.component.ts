import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { locale as english } from './i18n/en';
import { locale as turkish } from './i18n/tr';
import { User } from '../../model/user.model';
import { MatSnackBar, MatSpinner } from '@angular/material';
import { RecaptchaComponent } from 'ng-recaptcha';
import { Global } from '../../service/global.service';
import { Meta, Title } from '@angular/platform-browser';
import { Validation } from '../../validation/validation';
import { UserService } from '../../service/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  submitted = false;

  loader: boolean = false;
  public captchaKey: any = null;
  public ValidationsClass: Validation;

  @ViewChild(RecaptchaComponent) reCaptcha: RecaptchaComponent;

	/**
     * Constructor
     *
     * @param {FuseTranslationLoaderService} _fuseTranslationLoaderService
     */
  constructor(
    private meta: Meta,
    private router: Router,
    private userModel: User,
    private fb: FormBuilder,
    private titleService: Title,
    public snackBar: MatSnackBar,
    private globalService: Global,
    private userService: UserService,
    private _fuseTranslationLoaderService: FuseTranslationLoaderService
  ) {
    this._fuseTranslationLoaderService.loadTranslations(english, turkish);

    this.titleService.setTitle("Login to Health Port");
    document.domain !='healthport.io'?this.meta.addTag({ name: 'robots', content: 'noindex' }):false;
    this.meta.addTags([
      { httpEquiv: 'Content-Type', content: 'text/html' },
      { charset: 'UTF-8' },
      { property: 'og:title', content: "Login to Health Port" },
      { name: 'description', content: 'Login to manage your Health Port account.' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
    ], true);

    this.ValidationsClass = new Validation();
  }

  ngOnInit() {
    let checkToken = JSON.parse(localStorage.getItem('userToken'));
    if (this.ValidationsClass.verifyNameInputs(checkToken)) {
      this.router.navigate(['/myaccount']);
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

  }

  get f() { return this.loginForm.controls; }

  login() {
      this.reCaptcha.execute();
  }
  //login with enter key press
  loginWithEnter(event) {
    if (event.keyCode == 13) {
      this.login();
    }
  }
  
  submitCaptcha(event) {

    this.captchaKey = event;
    if (this.captchaKey == null || this.captchaKey == undefined) {
      this.loader = false;
      this.snackBar.open('Captcha undefined or null');
    } else {
      this.submitted = true;
      this.loader = true;

      if (this.loginForm.invalid) {
        this.loader = false;
        return;
      } else {
        this.signIn();
      }
    }

  }

  signIn() {
    this.userModel.email = this.f.email.value;
    this.userModel.password = this.f.password.value;

    this.userService.signIn(this.userModel, this.captchaKey)
      .subscribe(res => {
        if (res.code === 200) {
          this.loader = false;
          this.snackBar.open(res.message);

          localStorage.setItem('userToken', JSON.stringify(res.token));
          localStorage.setItem('data', JSON.stringify(res.data));
          this.globalService.state = "SIGNOUT";
          this.router.navigate(['/myaccount']);
          grecaptcha.reset();
        }
        else {
          this.loader = false;
          this.snackBar.open(res.message);
          grecaptcha.reset();
        }
      }, error => {
        this.loader = false;
        this.snackBar.open(error.error.message);
        if(error.error.message.includes('Please verify your account to continue further.'))
        {
          localStorage.setItem('verificationToken', JSON.stringify(error.error.token));
          localStorage.setItem('verificationEmail', JSON.stringify(this.userModel.email));
          setTimeout(() => {
            this.router.navigate(['/verification']);
          }, 1500);
        }
        grecaptcha.reset();
      });
  }

}