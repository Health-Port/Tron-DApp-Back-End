import { Component, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { Global } from '../../../service/global.service';
import { DocumentService } from '../../../service/document.service';
import { MatSnackBar, MAT_DIALOG_DATA, MatDialogRef, MatSpinner } from '@angular/material';

@Component({
  selector: 'app-share',
  templateUrl: './share.component.html',
  styleUrls: ['./share.component.scss']
})
export class ShareComponent implements OnInit {
  
  dropdownList : any;
  selectedItems = [];
  prePopulateItems = [];
  dropdownSettings = {};
  doctype : string;
  token : string;
  appdata : Object;
  userId : number;
  initLoader: boolean = false;
  loader: boolean = false;

  constructor(
    private router: Router,
    public snackBar: MatSnackBar,
    private globalService: Global,
    private documentService : DocumentService,
    private dialogRef: MatDialogRef<ShareComponent>,
    @Inject(MAT_DIALOG_DATA) data
  ) { 
    this.doctype = data;
    this.token = JSON.parse(localStorage.getItem('userToken'));
    this.appdata = JSON.parse(localStorage.getItem('data'));
    this.userId = this.appdata['user_id'];
  }

  ngOnInit() {

    //initial dropdown settings
    this.dropdownSettings = {
      singleSelection: false,
      idField: 'share_with_id',
      textField: 'share_with_name',
      selectAllText: 'Select All',
      unSelectAllText: 'UnSelect All',
      itemsShowLimit: 5,
      allowSearchFilter: true
    };
    this.initLoader = true;
    this.setSharedProviders();
    
  }

  onItemSelect(item: any) {
    
  }

  onSelectAll(items: any) {
    
  }
  
  setSharedProviders() {
    //initial population of data for dropdown
    this.documentService.getProvidersList(this.userId,this.token,this.doctype)
    .subscribe(res => {
      if (res.code === 200) {
        //prepopulate already selected items if any
        this.prePopulateItems = res.data[0];
        this.selectedItems = this.prePopulateItems;
        //populate drop down list
        this.dropdownList = res.data[1];
        this.initLoader = false;
      }
      else {
        this.snackBar.open("Something went wrong! Try again.");
        this.initLoader = false;
      }
    }, error => {
      this.initLoader = false;
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

  saveSharedProviders() {
    
    if(this.selectedItems != this.prePopulateItems) {
      
      this.loader = true;
      this.documentService.saveSharedProviderList(this.userId,this.token,this.selectedItems,this.doctype)
      .subscribe(res => {
        
        if (res.code === 200) {
          this.loader = false;
          this.snackBar.open("Providers saved successfully!");
          setTimeout(() => {
            this.dialogRef.close();
          }, 2000);
        }
        else {
          this.loader = false;
          this.snackBar.open("Something went wrong! Try again.");
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
