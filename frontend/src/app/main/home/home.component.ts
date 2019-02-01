import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';

import { locale as english } from './i18n/en';
import { locale as turkish } from './i18n/tr';
import { RecaptchaComponent } from 'ng-recaptcha';
import { Contact } from '../../model/contact.model';
import { Meta, Title } from '@angular/platform-browser';
import { UserService } from 'app/service/user.service';
import { MatSnackBar, MatSpinner } from '@angular/material';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';

@Component({
    selector: 'home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent {
    id: any;
    ncount: number;
    contactForm: FormGroup;
    submitted = false;
    loader: boolean = false;
    public captchaKey: any = null;

    @ViewChild(RecaptchaComponent) reCaptcha: RecaptchaComponent;

    navigation: any;

    /**
     * Constructor
     *
     * @param {FuseTranslationLoaderService} _fuseTranslationLoaderService
     */
    constructor(
        private meta: Meta,
        private fb: FormBuilder,
        private contact: Contact,
        private titleService: Title,
        public snackBar: MatSnackBar,
        private userService: UserService,
        private activatedRoute: ActivatedRoute,
        private _fuseNavigationService: FuseNavigationService,
        private _fuseTranslationLoaderService: FuseTranslationLoaderService
    ) {
        this._fuseTranslationLoaderService.loadTranslations(english, turkish);

        this.titleService.setTitle("Health Port Blockchain Electronic Health Records (EHR)");
        document.domain != 'healthport.io' ? this.meta.addTag({ name: 'robots', content: 'noindex' }) : false;
        this.meta.addTags([
            { httpEquiv: 'Content-Type', content: 'text/html' },
            { charset: 'UTF-8' },
            { property: 'og:title', content: "Health Port Blockchain Electronic Health Records (EHR)" },
            { name: 'description', content: 'Health Port gives patient’s control over storage and access to their personal Electronic Health Record (EHR) via leveraging blockchain technology.' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
        ], true);
    }

    ngOnInit() {
        this.navigation = this._fuseNavigationService.getCurrentNavigation();
        if (window.innerWidth < 1025 && this.navigation[6].id == "signout") {
            localStorage.clear();
            this.navigation[6].title = "SIGNUP";
            this.navigation[6].id = "signup";
            this.navigation[6].url = "/signup"
        }

        this.activatedRoute.params.subscribe(params => this.id = params['id']);
        this.ncount = 0;

        this.contactForm = this.fb.group({
            fname: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]{2,20}$')]],
            lname: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]{2,20}$')]],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', Validators.pattern('^[0-9 ()+-]+$')],
            message: ['', Validators.required]
        });
    }
    ngAfterViewChecked() {
        if (this.id == "about") {
            document.getElementById("in-help").scrollIntoView();
        }
        if (this.id == "contact") {
            document.getElementById("in-contact").scrollIntoView();
        }
        this.ncount++;
        if (this.ncount > 10) {
            this.id = ""; this.ncount = 0;
        }
    }
    scroll(el) {
        console.log(el);
        el.scrollIntoView();
    }
    moveToWhitepaper() {
        window.open("https://medium.com/@healthport/health-port-white-paper-3cf16da99034", "_blank")
    }
    get f() { return this.contactForm.controls; }

    submitCaptcha(event) {
        this.captchaKey = event;
        if (this.captchaKey == null || this.captchaKey == undefined) {
            this.snackBar.open('Captcha null or undefined!');
        }
        else {
            this.contactUsCall();
        }
    }

    contactUs() {

        this.loader = true;
        this.submitted = true;

        if (this.contactForm.invalid) {
            this.loader = false;
            return;
        }
        else {
            this.reCaptcha.execute();
        }
    }
    contactUsCall() {
        this.contact.fname = this.f.fname.value;
        this.contact.lname = this.f.lname.value;
        this.contact.email = this.f.email.value;
        this.contact.phone = this.f.phone.value;
        this.contact.message = this.f.message.value;

        this.userService.contactUs(this.contact, this.captchaKey).subscribe(res => {
            if (res.code === 200) {
                this.loader = false;
                this.submitted = false;
                this.contactForm.reset();
                this.snackBar.open(res.message);
            }
            else {
                this.loader = false;
                this.snackBar.open(res.message);
                grecaptcha.reset();
            }
        }, error => {
            this.loader = false;
            this.snackBar.open(error.error.message);
            grecaptcha.reset();
        });
    }
}
