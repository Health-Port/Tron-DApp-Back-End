import { Component, OnInit, ElementRef, ViewChild, QueryList, Inject } from '@angular/core';
import * as jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { locale as english } from './i18n/en';
import { locale as turkish } from './i18n/tr';
import { Send } from '../../model/send.model';
import { Document } from '../../model/document.model';
import { Global } from '../../service/global.service';
import { UserService } from '../../service/user.service';
import { WalletService } from '../../service/wallet.service';
import { DocumentService } from '../../service/document.service';
import { SendComponent } from './send/send.component';
import { Meta, Title } from '@angular/platform-browser';
import { MatSnackBar, MatDialog, MatTooltip, MatDialogConfig, MatSpinner } from "@angular/material";
import { ReceiveComponent } from './receive/receive.component';
import { DetailsComponent } from './details/details.component';
import { FuseCopierService } from '@fuse/services/copier.service';
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';
import adBlocker from 'just-detect-adblock'



@Component({
    selector: 'myaccount',
    templateUrl: './myaccount.component.html',
    styleUrls: ['./myaccount.component.scss']
})

export class MyaccountComponent implements OnInit {

    //allergy spinner
    aSpin: boolean = false;
    //medication spinner
    mSpin: boolean = false;
    //procedure spinner
    pSpin: boolean = false;
    //graph spinner
    gSpin: boolean = false;
    //transaction spinner
    tSpin: boolean = false;
    //transaction button spinner
    tbSpin: boolean = false;
    //referral spinner
    rSpin: boolean = false;
    //referral button spinner 
    rbSpin: boolean = false;
    //label for graph
    gLabel = "Current Balance"

    //copy btn text in referral link
    copyBtnTxt = 'CLICK TO COPY';
    //form submission latest date models
    //allergy form latest submitted date model
    afLSDate: string;
    //medication form latest submitted date model
    mfLSDate: string;
    //procedure form latest submitted date model
    pfLSDate: string;
    //data object properties
    email: any;
    data: Object;
    username: string;
    user_id: number;
    wallet_address: any;
    user_tokens: number;
    appToken: any;
    //lazy loading of transactions 
    content: any[] = new Array();
    pageNumber: number;
    transBtnText: string = 'load More';
    //page number for referral api
    refPageNum: number;
    referContent: any[] = new Array();
    referBtnText: string = 'load More';
    //total bandwidth
    totalBandwidth: number;
    @ViewChild('transHistory') th;
    @ViewChild('percent-label') pl;

    // variable for sent amount in send dialog modal
    amount: number;
    // referral coupon 
    referal_coupon: any;
    // referral links for social media and for default copy
    share_link: string;
    twitter_share: string;
    fb_share: string;
    email_share: string;
    //variable will be used to display UI components for specific users
    user_admin: boolean = false;
    // chart colors for ngx charts
    gray_color: String;
    white_color: String;

    ntotal: number = 0;
    single: any[] = [];

    navigation : any;
    
    pdfImage = new Image();

    creditClassMap = {
        'sent':true,
        'health port network fee':true,
    }
    debitClassMap = {
        'received':true,
        'new account':true,
        'loyalty bonus':true,
        'referal reward':true,
        'create allergy list':true,
        'create medication list':true,
        'create procedure history':true,
    }
	/**
     * Constructor
     *
     * @param {FuseTranslationLoaderService} _fuseTranslationLoaderService
     */
    constructor(
        private meta: Meta,
        private router: Router,
        private sendModel: Send,
        private eRef: ElementRef,
        private dialog: MatDialog,
        private titleService: Title,
        public snackBar: MatSnackBar,
        private docModel: Document,
        private datePipe: DatePipe,
        private globalService: Global,
        private userService: UserService,
        private walletService: WalletService,
        private documentService: DocumentService,
        private copyService: FuseCopierService,
        private _fuseNavigationService: FuseNavigationService,
        private _fuseTranslationLoaderService: FuseTranslationLoaderService
    ) {
        this.gray_color = '#fafafb';
        this.white_color = '#fff';
        this._fuseTranslationLoaderService.loadTranslations(english, turkish);

        this.titleService.setTitle("User Dashboard on Health Port");
        document.domain !='healthport.io'?this.meta.addTag({ name: 'robots', content: 'noindex' }):false;
        this.meta.addTags([
            { httpEquiv: 'Content-Type', content: 'text/html' },
            { charset: 'UTF-8' },
            { property: 'og:title', content: "User Dashboard on Health Port" },
            { name: 'description', content: 'Manage your blockchain-based electronic health records (EHR) via the Health Port User Dashboard.' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
        ], true);

        this.pdfImage.src = 'assets/sia/images/logos/splash-logo.png';
    }

    colorScheme = {
        domain: ['#00b0e0', '#A10A28', '#C7B42C', '#AAAAAA']
    };

    view: any[] = [700, 400];

    ngOnInit() {
        //setting variables for signin signout for larger and smaller screens
        this.globalService.state = this.globalService.state;
        if (window.innerWidth < 1025) {
            this.navigation = this._fuseNavigationService.getCurrentNavigation();
            this.navigation[6].title = this.globalService.state;
            this.navigation[6].id = "signout";
            this.navigation[6].url = "/home"
        }
        
        //spinner sections until service response  
        this.gSpin = true;
        this.tSpin = true;
        this.rSpin = true;
        // initialize data object properties
        this.appToken = JSON.parse(localStorage.getItem('userToken'));
        this.data = JSON.parse(localStorage.getItem('data'));
        this.email = this.data['email'];
        this.username = this.data['name'];
        this.user_id = this.data['user_id'];
        this.ntotal = this.data['total_tokens'];

        this.referal_coupon = this.data['referal_coupon'];
        this.wallet_address = this.data['wallet_address'];

        //referral link formation for default and social media links
        this.share_link = window.location.origin + '/#/signup?referby=' + this.referal_coupon;
        this.twitter_share = this.share_link + '&via=twitter';
        this.fb_share = this.share_link + '&via=facebook';
        this.email_share = this.share_link + '&via=email'

        //get transaction data
        this.pageNumber = 0;
        this.lazyLoadTXs();

        //get referral details of user
        this.refPageNum = 0;
        this.lazyloadReferrals();

        // refresh balance to draw graph
        this.walletService.getBalance(this.wallet_address, this.appToken)
            .subscribe(res => {
                if (res.code === 200) {
                    this.gSpin = false;
                    this.totalBandwidth = res.data['bandwidth'];
                    this.single = [
                        {
                            name: 'EHR',
                            value: res.data['balance']
                        }
                    ];

                    //change percentage of graph
                    setTimeout(() => {
                        let plel = this.eRef.nativeElement.querySelector('.percent-label');
                        plel.textContent = this.percentFormat(plel, res.data['balance']);
                        let lbl = this.eRef.nativeElement.querySelectorAll('text[ngx-charts-count-up]');
                        this.addTspan(lbl);
                    }, 1200);
                }
                else {
                    this.gSpin = false;
                    this.snackBar.open(res.message);
                }
            }, error => {
                this.gSpin = false;
                this.snackBar.open(error.error.message);

                if (error.error.code == 401) {
                    localStorage.clear();
                    setTimeout(() => {
                        this.globalService.state = "SIGNUP";
                        window.innerWidth < 1025?this.navigation[6].title = this.globalService.state:false;
                        this.router.navigate(['/login']);
                    }, 1500);
                }
            });


        // get form submission Latest Dates
        this.documentService.getFormSubmittedLatestDates(this.user_id, this.appToken)
            .subscribe(res => {
                if (res.code === 200) {
                    this.localeDateFormat(res.data);
                }
                else {
                    console.log(res.message);
                }
            }, error => {
                console.log(error.error.message);
            });

    }
    addTspan(array) {
        array.forEach(e => {
            if(e.textContent.indexOf("Current") != -1) {
                let x = e.getAttribute("x");
                let y = e.getAttribute("y");
                y = Math.ceil(y) + 20;
                let dy = e.getAttribute("dy");
                var para = document.createElementNS("http://www.w3.org/2000/svg","tspan");
                var t = document.createTextNode("Bandwidth: "+this.totalBandwidth);
                para.appendChild(t);
                para.setAttribute("x", x);
                para.setAttribute("y", y);
                para.setAttribute("dy", dy);
                e.appendChild(para);
            }
        });
        
    }
    percentFormat(val, tokens) {
        let percent = val.textContent.toString().replace('%', '');
        if (percent < 0.1) {
            let str = (tokens / this.ntotal) * 100;
            let convertStr = parseFloat(str.toString()).toFixed(8)
            return convertStr + '%'
        }
        else {
            let convertPrc = parseFloat(percent.toString()).toFixed(3)
            return convertPrc + '%';
        }
    }

    openSendDialog() {

        const dialogRef = this.dialog.open(SendComponent, {
            width: '600px',
            data: { address: this.wallet_address, amount: this.amount }
        });
    }

    openReceiveDialog() {

        this.dialog.open(ReceiveComponent, {
            width: '600px'
        });
    }

    openDetailsDialog(item) {
        
        this.dialog.open(DetailsComponent, {
            width: '600px',
            data: item
        });
    }

    //to handle date format only
    localeDateFormat(param) {
        if (typeof param == 'object') {
            if (param.allergy_date != null) {
                let ad = new Date(param.allergy_date);
                let add = ad.toLocaleDateString();
                //to add space after forward slash
                this.afLSDate = add.replace(/(\d+\/)/g, '$1 ');
            }
            else {
                //to add space after forward slash
                this.afLSDate = '01/01/1970';
            }
            if (param.medication_date != null) {
                let md = new Date(param.medication_date);
                let mdd = md.toLocaleDateString();
                //to add space after forward slash
                this.mfLSDate = mdd.replace(/(\d+\/)/g, '$1 ');
            } else {
                //to add space after forward slash
                this.mfLSDate = '01/01/1970';
            }
            if (param.procedure_date != null) {
                let pd = new Date(param.procedure_date);
                let pdd = pd.toLocaleDateString();
                //to add space after forward slash
                this.pfLSDate = pdd.replace(/(\d+\/)/g, '$1 ');
            } else {
                //to add space after forward slash
                this.pfLSDate = '01/01/1970';
            }
        }
        else {
            if (param != null) {
                let d = new Date(param);
                return d.toLocaleDateString();
            }
        }
    }

    //to handle time format only
    localeTimeFormat(param) {
        if (param != null) {
            let t = new Date(param);
            return t.toLocaleTimeString();
        }
        else {
            return '00:00:00 AM';
        }
    }

    //copy referral link
    copy() {
        this.copyBtnTxt = 'LINK COPIED ... ';
        setTimeout(() => {
            this.copyBtnTxt = 'CLICK TO COPY';
        }, 1000);
        return this.copyService.copyText(this.share_link);
    }

    downloadPDF(func, spin) {

        //Generic spinner
        this[spin] = true;

        this.docModel.userId = this.user_id;
        this.docModel.token = this.appToken;

        //Generic handling of service methods
        this.documentService[func](this.docModel)
            .subscribe(res => {
                if (res.code === 200) {
                    if (res.data.length == 0) {
                        this[spin] = false;
                        this.snackBar.open('Record Not Found.');
                    }
                    else {
                        this[func](res.data);
                        this[spin] = false;
                        this.snackBar.open(res.message);
                    }
                }
                else {
                    this[spin] = false;
                    this.snackBar.open(res.message);
                }
            }, error => {
                this[spin] = false;
                this.snackBar.open(error.error.message);
                if (error.error.code == 401) {
                    localStorage.clear();
                    setTimeout(() => {
                        this.globalService.state = "SIGNUP";
                        window.innerWidth < 1025?this.navigation[6].title = this.globalService.state:false;
                        this.router.navigate(['/login']);
                    }, 1500);
                }
            });

            //testcode 
            /* let obj = [{category: "Drug Allergy",createdAt: "2019-01-01T13:12:58.000Z",id: 72,no_known_allergies: false,
            reactions: "Sick",severity: "Low",substance: "Drug",updatedAt: "2019-01-01T13:12:58.000Z",user_id: 1}];
            this.getAllergyList(obj);
            this.aSpin = false; */ 
    }

    getAllergyList(data) {
        let doc = new jsPDF('p', 'pt');
        doc.setProperties({
            title: "Allergies.pdf"
        });
        let col = ["Date Documented", "Substance", "Category", "Severity", "Reactions"];
        let rows = [];

        let itemNew = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        itemNew.forEach(el => {
            let temp = [this.localeDateFormat(el.createdAt), el.substance, el.category, el.severity, el.reactions];
            rows.push(temp);

        });

        let style: Object = {
            0: {
                columnWidth: 100
            },
            1: {
                columnWidth: 110
            },
            2: {
                columnWidth: 95
            },
            3: {
                columnWidth: 85
            },
            4: {
                columnWidth: 125
            }
        }
        let name = this.capitalizeFirstLetter(this.username.toLowerCase()) + "'s Documented Allergy List";
        this.generatePDF(doc, rows, col, style, this.calculateBoxDimensions(name), name);

    }

    getMedicationList(data) {
        let doc = new jsPDF('p', 'pt');
        doc.setProperties({
            title: "Medications.pdf"
        });
        let col = ["Date Documented", "Medication Name", "Dose", "Frequency", "Prescribing Physician"];
        let rows = [];
        let itemNew = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        itemNew.forEach(el => {
            let temp = [this.localeDateFormat(el.createdAt), el.name, el.dose, el.frequency, el.physician];
            rows.push(temp);
        });

        let style: Object = {
            0: {
                columnWidth: 100
            },
            1: {
                columnWidth: 110
            },
            2: {
                columnWidth: 80
            },
            3: {
                columnWidth: 80
            },
            4: {
                columnWidth: 145
            }
        }
        let name = this.capitalizeFirstLetter(this.username.toLowerCase()) + "'s Home Medication List";
        this.generatePDF(doc, rows, col, style, this.calculateBoxDimensions(name), name);

    }

    getProcedureHistory(data) {
        let doc = new jsPDF('p', 'pt');
        doc.setProperties({
            title: "ProceduresHistory.pdf"
        });
        let col = ["Date Documented", "Procedure", "Procedure Date"];
        let rows = [];
        let itemNew = data.sort((a, b) => b.time_stamp - a.time_stamp);

        itemNew.forEach(el => {
            let d;
            if(el.time_stamp != 0) {
                d = this.datePipe.transform(el.time_stamp, 'MM/dd/yyyy');
            }
            else {
                d = 'No Known Procedure'
            }
            let temp = [this.localeDateFormat(el.createdAt), el.procedure, d];
            rows.push(temp);
        });

        let style: Object = {
            0: {
                columnWidth: 120
            },
            1: {
                columnWidth: 230
            },
            2: {
                columnWidth: 165
            }
        }
        //maximum 10 characters limit in name
        let name = this.capitalizeFirstLetter(this.username.toLowerCase()) + "'s Documented Procedure History";

        /* this.generatePDF(doc,rows,col,style,[52,495,65],name); */
        this.generatePDF(doc, rows, col, style, this.calculateBoxDimensions(name), name);

    }

    //calculate size of box in which name of document appears
    calculateBoxDimensions(name) {
        let len: number = name.length;
        let width: number = ((13) * len) + 20;
        let marginLeft: number = (615 - width) / 2;
        let paddingLeft: number = marginLeft + 13;
        return [marginLeft, width, paddingLeft]
    }

    // function parameter arr contains [left margin , width of box , left margin of text within box]
    generatePDF(doc, rows, col, style, arr, name) {

        doc.autoTable(col, rows, {
            styles: { overflow: 'linebreak', columnWidth: 'auto' },
            columnStyles: style
            //Incase of adding page content , use code below
            /* addPageContent: function (data) {
                /* doc.addImage(img, 'PNG', data.settings.margin.left, 10, 0, 20);
                doc.text(70, 25, "Allergy List"); */

            /* let pages : string = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(pages, 200, 100, null, null, 'right'); 
        } */
        });

        doc.insertPage(1);
        // Draw Dark Gray Rectangle
        // Draw Border
        doc.setDrawColor(0);
        // Fill inside color
        doc.setFillColor('3c4252');
        // Draw rectangle (left,top,width,height,'Fill F , Stroke D')
        doc.rect(6, 6, 589, 829, 'F');

        // Draw Empty Inside Rectangle with Green Border
        // Draw line of width (applies to immediate downward element only)
        doc.setLineWidth(4)
        doc.setDrawColor('8ac239');
        doc.rect(6, 6, 583.4, 830.2);

        // Draw Empty Inside Rectangle with Blue Border
        // Draw line of width (applies to immediate downward element only)
        doc.setLineWidth(4)
        doc.setDrawColor('2bb0e0');
        doc.rect(2, 2, 591.2, 838.2);

        //Add foreground image
        doc.addImage(this.pdfImage, 'PNG', 168, 200, 275, 150);

        //Add heading for generated pdf within box
        
        doc.setFontSize(24);
        doc.setFont("helvetica");
        doc.setFontStyle("bold");
        doc.setTextColor('white');
        doc.text(name, arr[2], 440);

        //copy right footer
        doc.setFontSize(8);
        doc.setFont("courier");
        doc.setFontStyle("italic");
        doc.setTextColor('white');
        let dynamicYear = new Date();
        let dynamicYearText = 'Copyright © '+dynamicYear.getFullYear()+' Health Port. All rights reserved.';
        doc.text(dynamicYearText, 175, 820);
        


        if((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1 ) 
        {
            window.open(doc.output('bloburl'), '_blank');
        }
        else if(navigator.userAgent.indexOf("Chrome") != -1 )
        {
            if(adBlocker.isDetected()){
                doc.save('healthport.pdf');
                }else{
                window.open(doc.output('bloburl'), '_blank');
                }
        }
        else if(navigator.userAgent.indexOf("Safari") != -1)
        {
            doc.save('healthport.pdf');
        }
        else if(navigator.userAgent.indexOf("Firefox") != -1 ) 
        {
            window.open(doc.output('bloburl'), '_blank');
        }
        else if((navigator.userAgent.indexOf("MSIE") != -1 ) || (!!document['documentMode'])) //IF IE > 10
        {
            window.open(doc.output('bloburl'), '_blank');
        }  
        else 
        {
            doc.save('healthport.pdf');
        }
    }
    // load more transactions | made this method so different spinner spins on page initializing and button click event
    loadMore() {
        this.tbSpin = true;
        if (this.transBtnText == 'Show Less') {
            this.content.splice(5);
            this.pageNumber = 1;
            this.transBtnText = 'Load More';
            this.tbSpin = false;
            this.th.nativeElement.scrollIntoView();
        }
        else {
            this.lazyLoadTXs();
        }
    }

    lazyLoadTXs() {

        let tempData: any;

        // get Trancaction History
        this.walletService.getTransactionsHistory(this.wallet_address, this.pageNumber, this.appToken)
            .subscribe(res => {
                if (res.code === 200) {

                    this.pageNumber++;
                    tempData = res.data['data'];
                    tempData.forEach(e => {
                        e.date_time = this.localeDateFormat(e.date_time);
                        this.content.push(e);
                    });

                    if (res.data['count'] <= this.content.length) {
                        this.transBtnText = 'Show Less';
                    }

                    this.tSpin = false;
                    this.tbSpin = false;
                }
                else {
                    this.tSpin = false;
                    this.snackBar.open(res.message);
                    this.tbSpin = false;
                }
            }, error => {
                this.tSpin = false;
                this.tbSpin = false;
                this.snackBar.open(error.error.message);
                if (error.error.code == 401) {
                    localStorage.clear();
                    setTimeout(() => {
                        this.globalService.state = "SIGNUP";
                        window.innerWidth < 1025?this.navigation[6].title = this.globalService.state:false;
                        this.router.navigate(['/login']);
                    }, 1500);
                }
            });

    }

    // load more referral links
    loadMoreReferrals() {
        this.rbSpin = true;
        if (this.referBtnText == 'Show Less') {
            this.referContent.splice(5);
            this.refPageNum = 1;
            this.referBtnText = 'Load More';
            this.rbSpin = false;
        }
        else {
            this.lazyloadReferrals();
        }
    }

    lazyloadReferrals() {
        this.userService.getUserReferrals(this.user_id, this.referal_coupon, this.refPageNum, this.appToken)
            .subscribe(res => {
                if (res.code === 200) {

                    this.refPageNum++;
                    let tempData = res.data['data'];
                    tempData.forEach(e => {
                        e.index = tempData.indexOf(e) + 1;
                        this.referContent.push(e);
                    });

                    if (res.data['count'] <= this.referContent.length) {
                        this.referBtnText = 'Show Less';
                    }

                    this.rSpin = false;
                    this.rbSpin = false;
                }
                else {
                    this.rSpin = false;
                    this.rbSpin = false;
                    this.snackBar.open(res.message);
                }
            }, error => {
                this.rSpin = false;
                this.rbSpin = false;
                this.snackBar.open(error.error.message);
            });
    }

    capitalizeFirstLetter(str) {
        let string = str.substr(0, str.indexOf(' '));
        if (string == "") {
            string = this.username;
        }
        string = string.slice(0, 9);
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    noFormSubmitted() {
        return [this.afLSDate, this.mfLSDate, this.pfLSDate].every(v => v == '01/01/1970') ? true : false;
    }

    shareEmail() {
        let mailLink = "mailto:" +  "?subject=Health Port Invitation&body=Hi! Please follow link to join health port." + this.email_share;
        window.open(mailLink,'_blank');
    }

    applyDebitClass(type) {
        let t = type.toLowerCase();
        if(this.creditClassMap[t]){
            return this.creditClassMap[t];
        }
        else {
            return false;
        }
    }

    applyCreditClass(type) {
        let t = type.toLowerCase();
        if(this.debitClassMap[t]){
            return this.debitClassMap[t];
        }
        else {
            return false;
        }
    }
}