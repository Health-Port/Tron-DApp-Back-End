import { Component, OnInit } from '@angular/core';
import { locale as english } from './i18n/en';
import { locale as turkish } from './i18n/tr';
import { Document } from '../../model/document.model';
import { Meta, Title } from '@angular/platform-browser';
import { Validation } from '../../validation/validation';
import { Global } from '../../service/global.service';
import { DocumentService } from '../../service/document.service';
import { MatSnackBar, MatSpinner, MatTooltip } from '@angular/material';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-procedure-history',
  templateUrl: './procedure-history.component.html',
  styleUrls: ['./procedure-history.component.scss']
})
export class ProcedureHistoryComponent implements OnInit {

  appData: Object;
  isSmallScreen: boolean;
  loader: boolean = false;
  procedureForm: FormGroup;
  submitted: boolean = false;
  noKnownProcedures: boolean = false;
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
    private docModel: Document,
    private titleService: Title,
    private globalService: Global,
    public snackBar: MatSnackBar,
    private documentService: DocumentService,
    private _fuseTranslationLoaderService: FuseTranslationLoaderService
  ) {
    this._fuseTranslationLoaderService.loadTranslations(english, turkish);

    this.titleService.setTitle("Update Procedure History");
    document.domain !='healthport.io'?this.meta.addTag({ name: 'robots', content: 'noindex' }):false;
    this.meta.addTags([
      { httpEquiv: 'Content-Type', content: 'text/html' },
      { charset: 'UTF-8' },
      { property: 'og:title', content: "Update Procedure History" },
      { name: 'description', content: 'Update your personal procedure history via Health Port.' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
    ], true);

    this.ValidationsClass = new Validation();
  }

  ngOnInit() {
    this.isSmallScreen = (window.innerWidth) < 1280;
    this.appData = JSON.parse(localStorage.getItem('data'));

    this.procedureForm = this.fb.group({
      procedures: this.fb.array([this.fb.group({ procedure: ['', Validators.required], date: ['', Validators.required] })])
    });

    this.InitializeForm();
  }

  //Get from array
  get procedureData() {
    return this.procedureForm.get('procedures') as FormArray;
  }

  //Initialize empty rows procedureForm  
  InitializeForm() {
    this.procedureData.push(this.fb.group({ procedure: ['', Validators.required], date: ['', Validators.required]}));
    this.procedureData.push(this.fb.group({ procedure: ['', Validators.required], date: ['', Validators.required]}));
  }

  //Add new row in procedureForm
  addMore() {
    this.submitted = false;
    this.procedureData.push(this.fb.group({ procedure: ['', Validators.required], date: ['', Validators.required]}));
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
    this.procedureData.removeAt(index);
  }

  //clear and disable if noknown checkbox true
  clearFields(el) {
    if(this.noKnownProcedures) {
      this.clearFormArray(this.procedureData);
      this.procedureData.disable();
    }
    else {
      this.procedureData.enable();
      this.InitializeForm();
    }
    el.scrollIntoView();
  }

  //convert date to date object and then to local date
  dateTodateObj(d) {

    if (d != undefined && d != '') {
      let dd = new Date(d);
      return dd.toLocaleDateString();
    }
    else {
      return ' ';
    }
  }

  //saving object 
  getSavingObject(incoming) {
    let timestamp;
    incoming.forEach(e => {
      timestamp = new Date(e.date).getTime();
      if (timestamp) {
        delete e.date;
        e.time_stamp = timestamp;
      }
    });

    return incoming;
  }

  //Document Saving
  documentProcedureHistory() {
    
    this.loader = true;

    if (this.procedureForm.invalid && !this.noKnownProcedures) {
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
      
      if(this.noKnownProcedures) {
        this.docModel.documentObject = [{timestamp: "No Known Procedure",procedure: "No Known Procedure"}];
      }
      else {
        this.docModel.documentObject = this.getSavingObject(this.procedureData.value);
      }
      //Preparing document model to call service
      this.docModel.token = token;
      this.docModel.userId = userId;
      this.docModel.noKnownProcedures = this.noKnownProcedures;
      
      //Save document service
      this.documentService.saveProcedureHistory(this.docModel)
        .subscribe(res => {
          if (res.code === 200) {
            this.loader = false;
            this.snackBar.open(res.message);
            this.clearFormArray(this.procedureData);
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
