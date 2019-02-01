import { NgModule } from '@angular/core';
import { ShareModule } from '@ngx-share/core';
import { RouterModule } from '@angular/router';
import { AuthGuard } from 'app/guard/auth.guard';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { SendComponent } from './send/send.component';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Send } from '../../model/send.model';
import { Document } from '../../model/document.model';
import { WalletService } from '../../service/wallet.service';
import { DocumentService } from '../../service/document.service';
import { UserService } from '../../service/user.service';
import { MyaccountComponent } from './myaccount.component';
import { ReceiveComponent } from './receive/receive.component';
import { DetailsComponent } from './details/details.component';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ShareComponent } from './share/share.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { MatButtonModule, MatIconModule, MatCheckboxModule, MatRadioModule, MatTooltipModule, MatGridListModule, MatDialogModule, MatTableModule, MatPaginatorModule, MatSortModule, MatProgressSpinnerModule } from '@angular/material';

const routes = [
    {
        path: 'myaccount',
        component: MyaccountComponent,
        canActivate: [AuthGuard]
    }
];

@NgModule({
    declarations: [
        MyaccountComponent,
        SendComponent,
        ReceiveComponent,
        DetailsComponent,
        ShareComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        NgMultiSelectDropDownModule.forRoot(),

        ReactiveFormsModule,
        CommonModule,
        // gets the scanner ready!
        ZXingScannerModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatRadioModule,
        MatGridListModule,
        MatTooltipModule,
        NgxChartsModule,
        MatDialogModule,
        MatTableModule,
        MatProgressSpinnerModule,
        MatPaginatorModule, 
        MatSortModule,

        TranslateModule,

        FuseSharedModule,

        ShareModule,

        NgxDatatableModule,
        NgxPaginationModule
    ],
    exports: [
        MyaccountComponent
    ],
    providers: [
        Send,
        Document,
        UserService,
        WalletService,
        DocumentService,
        DatePipe
    ],
    entryComponents: [
        SendComponent,
        ReceiveComponent,
        DetailsComponent,
        ShareComponent
    ]
})

export class MyaccountModule {
}
