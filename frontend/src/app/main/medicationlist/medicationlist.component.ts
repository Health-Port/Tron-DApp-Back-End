import { Component, OnInit } from '@angular/core';
import { locale as english } from './i18n/en';
import { locale as turkish } from './i18n/tr';
import { Document } from '../../model/document.model';
import { Meta, Title } from '@angular/platform-browser';
import { Validation } from '../../validation/validation';
import { MatSnackBar, MatSpinner } from '@angular/material';
import { Global } from '../../service/global.service';
import { DocumentService } from '../../service/document.service';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';
import { Router } from '@angular/router';



@Component({
  selector: 'app-medicationlist',
  templateUrl: './medicationlist.component.html',
  styleUrls: ['./medicationlist.component.scss']
})
export class MedicationlistComponent implements OnInit {

  appData: Object;
  medicationForm: FormGroup;
  isSmallScreen: boolean;
  loader: boolean = false;
  submitted: boolean = false;
  noKnownMedications: boolean = false;
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
    private docModel: Document,
    private globalService: Global,
    public snackBar: MatSnackBar,
    private documentService: DocumentService,
    private _fuseTranslationLoaderService: FuseTranslationLoaderService
  ) {
    this._fuseTranslationLoaderService.loadTranslations(english, turkish);

    this.titleService.setTitle("Update Medication List");
    document.domain !='healthport.io'?this.meta.addTag({ name: 'robots', content: 'noindex' }):false;
    this.meta.addTags([
      { httpEquiv: 'Content-Type', content: 'text/html' },
      { charset: 'UTF-8' },
      { property: 'og:title', content: "Update Medication List" },
      { name: 'description', content: 'Manage your personal medication list via Health Port.' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
    ], true);

    this.ValidationsClass = new Validation();
  }

  ngOnInit() {
    this.appData = JSON.parse(localStorage.getItem('data'));
    this.isSmallScreen = (window.innerWidth) < 1280;

    this.medicationForm = this.fb.group({
      medications: this.fb.array([this.fb.group({ name: ['', Validators.required], dose: ['', Validators.required], frequency: ['', Validators.required], physician: ['', Validators.required] })])
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

  //Get from array
  get medicationData() {
    return this.medicationForm.get('medications') as FormArray;
  }

  //Initialize empty rows medicationForm  
  InitializeForm() {
    this.medicationData.push(this.fb.group({ name: ['', Validators.required], dose: ['', Validators.required], frequency: ['', Validators.required], physician: ['', Validators.required] }));
    this.medicationData.push(this.fb.group({ name: ['', Validators.required], dose: ['', Validators.required], frequency: ['', Validators.required], physician: ['', Validators.required] }));

  }

  //Add new row in medicationForm
  addMore() {
    this.submitted = false;
    this.medicationData.push(this.fb.group({ name: ['', Validators.required], dose: ['', Validators.required], frequency: ['', Validators.required], physician: ['', Validators.required] }));
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
    this.medicationData.removeAt(index);
  }

  //clear and disable if noknown checkbox true
  clearFields(el) {
    if(this.noKnownMedications) {
      this.clearFormArray(this.medicationData);
      this.medicationData.disable();
    }
    else {
      this.medicationData.enable();
      this.InitializeForm();
    }
    el.scrollIntoView();
  }

  //Document Saving
  documentMedicationList() {

    this.loader = true;
    
    if (this.medicationForm.invalid && !this.noKnownMedications) {
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
      
      if(this.noKnownMedications) {
        this.docModel.documentObject = [{dose: "No Known Medication",frequency: "No Known Medication",name: "No Known Medication",physician: "No Known Medication"}];
      }
      else {
        this.docModel.documentObject = this.medicationData.value;
      }
      //Preparing document model to call service
      this.docModel.token = token;
      this.docModel.userId = userId;
      this.docModel.noKnownMedications = this.noKnownMedications;

      //Save document service
      this.documentService.saveMedicationList(this.docModel)
        .subscribe(res => {
          if (res.code === 200) {
            this.loader = false;
            this.snackBar.open(res.message);
            this.clearFormArray(this.medicationData);
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
