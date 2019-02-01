import { Component, OnInit, ViewChild } from '@angular/core';
import { locale as english } from './i18n/en';
import { locale as turkish } from './i18n/tr';
import { User } from '../../model/user.model';
import { RecaptchaComponent } from 'ng-recaptcha';
import { Global } from '../../service/global.service';
import { Meta, Title } from '@angular/platform-browser';
import { UserService } from '../../service/user.service';
import { Validation } from '../../validation/validation';
import { Router , ActivatedRoute} from '@angular/router';
import { MatSnackBar , MatSpinner} from '@angular/material';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { compareValidator } from '../../directive/compare-validator.directive';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';

@Component({
  selector: 'signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})

export class SignupComponent implements OnInit {
    
    signupForm: FormGroup;
    submitted = false;

    via : string;
    referby: string;
    loader: boolean = false;
    isAgree: boolean = false;
    public captchaKey: any = null;
    isExistError: boolean = false;
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
        private titleService:Title,
        public snackBar: MatSnackBar,
        private route:ActivatedRoute,
        private globalService:Global,
        private userService: UserService, 
        private _fuseTranslationLoaderService: FuseTranslationLoaderService
    )
    {
        this._fuseTranslationLoaderService.loadTranslations(english, turkish);

        this.titleService.setTitle("Sign Up for Health Port");
        document.domain !='healthport.io'?this.meta.addTag({ name: 'robots', content: 'noindex' }):false;
        this.meta.addTags([
          { httpEquiv: 'Content-Type', content: 'text/html'},
          { charset: 'UTF-8'},
          { property: 'og:title', content: "Sign Up for Health Port"},
          { name: 'description', content: 'Join Health Port to create and manage your personalized, decentralized electronic health record (EHR) on the blockchain.' },
          { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'}
        ], true);

        this.ValidationsClass = new Validation();
    }

	  ngOnInit() {
      
      let checkToken = JSON.parse(localStorage.getItem('userToken'));
      if (this.ValidationsClass.verifyNameInputs(checkToken)) {
        this.router.navigate(['/myaccount']);
      }
      
      this.route.queryParams.subscribe(params => {
        this.referby = params['referby'];
        this.via = params['via'];
      });

      this.signupForm = this.fb.group({
        email: ['', [Validators.required,Validators.email]],
        name: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]{2,20}$')]],
        password: ['', [Validators.required, Validators.pattern('((?=.*\\d)(?=.*[A-Z])(?=.*\\W).{8,30})')]],
        confirmpassword: ['',[Validators.required, Validators.pattern('((?=.*\\d)(?=.*[A-Z])(?=.*\\W).{8,30})'), compareValidator('password')]],
        isAgree: [false,[Validators.requiredTrue]],
        role:['',Validators.required]
      });
    }

    get f() { return this.signupForm.controls; }

    submitCaptcha(event) {

      this.captchaKey = event;
      if (this.captchaKey == null || this.captchaKey == undefined) {
        this.snackBar.open('Captcha null or undefined!');
      } else {
        this.signUp();
      } 
    }

    signUpValidation() {
        this.loader = true;
        this.submitted = true;
        
        if (this.signupForm.invalid) {
          this.loader = false;
          return;
        }
        else {
          this.isExistError = false;
          this.reCaptcha.execute();
        }
        
      }
      
      signUp() {

        this.userModel.via = this.via;
        this.userModel.referby = this.referby;
        this.userModel.role = this.f.role.value;
        this.userModel.name = this.f.name.value;
        this.userModel.email = this.f.email.value;
        this.userModel.isAgree = this.f.isAgree.value;
        this.userModel.password = this.f.password.value;

        this.userService.signUp(this.userModel, this.captchaKey)
          .subscribe(res => {
            if (res.code === 200) {
              this.loader = false;
              localStorage.setItem('verificationToken', JSON.stringify(res.token));
              setTimeout(() => {
                localStorage.setItem('verificationEmail', JSON.stringify(this.userModel.email));
                this.router.navigate(['/verification']); 
              }, 1500);
              
            }
            else {
              this.loader = false;
              this.snackBar.open('Error', res.message);
              grecaptcha.reset();
            }
          }, error => {
            this.loader = false;
            let Str = 'User already exist.';
            if(error.error.message == Str) {
              this.isExistError = true;
            }
            else {
              this.snackBar.open('Error', error.error.message);
            }
            grecaptcha.reset();
          });
      }

}