import { Component, OnInit } from '@angular/core';
import { locale as english } from './i18n/en';
import { locale as turkish } from './i18n/tr';
import { Global } from '../../service/global.service';
import { Document } from '../../model/document.model';
import { Meta, Title } from '@angular/platform-browser';
import { Validation } from '../../validation/validation';
import { MatSnackBar, MatSpinner } from '@angular/material';
import { DocumentService } from '../../service/document.service';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';
import { Router } from '@angular/router';


@Component({
    selector: 'about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss']
})

export class AboutComponent implements OnInit {

    appData: Object;
    allergyForm: FormGroup;
    isSmallScreen: boolean;
    loader: boolean = false;
    submitted: boolean = false;
    noKnownAllergies: boolean = false;
    public ValidationsClass: Validation;

    //select categories should be dynamic values
    categories = [
        { id: 1, name: "Drug Allergy" },
        { id: 2, name: "Food Allergy" },
        { id: 3, name: "Insect Allergy" },
        { id: 4, name: "Mold Allergy" },
        { id: 5, name: "Pet Allergy" },
        { id: 6, name: "Pollen Allergy" }
    ];

    //select severities should be dynamic values
    severities = [
        { id: 1, description: "Low" },
        { id: 2, description: "Medium" },
        { id: 3, description: "High" }
    ];

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
        private docModel: Document,
        private globalService: Global,
        public snackBar: MatSnackBar,
        private documentService: DocumentService,
        private _fuseTranslationLoaderService: FuseTranslationLoaderService
    ) {
        this._fuseTranslationLoaderService.loadTranslations(english, turkish);

        this.titleService.setTitle("Update Allergy Profile");
        document.domain !='healthport.io'?this.meta.addTag({ name: 'robots', content: 'noindex' }):false;
        this.meta.addTags([
            { httpEquiv: 'Content-Type', content: 'text/html' },
            { charset: 'UTF-8' },
            { property: 'og:title', content: "Update Allergy Profile" },
            { name: 'description', content: 'Maintain your allergy profile on Health Port.' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
        ], true);

        this.ValidationsClass = new Validation();
    }

    ngOnInit() {
        this.appData = JSON.parse(localStorage.getItem('data'));
        this.isSmallScreen = (window.innerWidth) < 1280;

        this.allergyForm = this.fb.group({
            allergies: this.fb.array([this.fb.group({ substance: ['', Validators.required], category: ['', Validators.required], severity: ['', Validators.required], reactions: ['', Validators.required] })])
        });

        this.InitializeForm();
    }
    //Track small screen, to display label above each input at small screen
    isVisible(index) {
        if (index < 1 && !this.isSmallScreen) {
            return true
        }
        else if (this.isSmallScreen) {
            return true;
        }
        else {
            return false;
        }
    }

    //Get form array allergies
    get allergyData() {
        return this.allergyForm.get('allergies') as FormArray;
    }

    //Initialize empty rows allergyForm  
    InitializeForm() {
        this.allergyData.push(this.fb.group({ substance: ['', Validators.required], category: ['', Validators.required], severity: ['', Validators.required], reactions: ['', Validators.required] }));
        this.allergyData.push(this.fb.group({ substance: ['', Validators.required], category: ['', Validators.required], severity: ['', Validators.required], reactions: ['', Validators.required] }));
    }

    //Add new row in allergyForm
    addMore() {
        this.submitted = false;
        this.allergyData.push(this.fb.group({ substance: ['', Validators.required], category: ['', Validators.required], severity: ['', Validators.required], reactions: ['', Validators.required] }));
    }

    //Clear old form after successful saving document
    clearFormArray = (formArray: FormArray) => {
        while (formArray.length !== 0) {
            formArray.removeAt(0)
        }
        // to add one extra field after clearing old formArray
        this.addMore();
    }

    removeItem(index) {
        this.allergyData.removeAt(index);
    }

    //clear and disable if noknown checkbox true
    clearFields(el) {
        if(this.noKnownAllergies) {
        this.clearFormArray(this.allergyData);
        this.allergyData.disable();
        }
        else {
        this.allergyData.enable();
        this.InitializeForm();
        }
        el.scrollIntoView();
    }

    //Document Saving
    documentAllergies() {
        
        this.loader = true;

        if (this.allergyForm.invalid && !this.noKnownAllergies) {
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
            if(this.noKnownAllergies) {
                this.docModel.documentObject = [{category: "No Known Allergy",reactions: "No Known Allergy",severity: "No Known Allergy",substance: "No Known Allergy"}];
            }
            else {
                this.docModel.documentObject = this.allergyData.value;
            }
            //Preparing document model to call service
            this.docModel.token = token;
            this.docModel.userId = userId;
            this.docModel.noKnownAllergies = this.noKnownAllergies;

            //Save document service 
            this.documentService.saveAllergyList(this.docModel)
                .subscribe(res => {
                    if (res.code === 200) {
                        this.loader = false;
                        this.snackBar.open(res.message);
                        this.clearFormArray(this.allergyData);
                        this.InitializeForm();
                        this.router.navigate(['/myaccount']);
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
}