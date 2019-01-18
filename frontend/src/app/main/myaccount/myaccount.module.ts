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
import { MatButtonModule, MatIconModule, MatCheckboxModule,MatTooltipModule, MatGridListModule, MatDialogModule, MatProgressSpinnerModule } from '@angular/material';

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
        DetailsComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        ReactiveFormsModule,
        CommonModule,
        // gets the scanner ready!
        ZXingScannerModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatGridListModule,
        MatTooltipModule,
        NgxChartsModule,
        MatDialogModule,
        MatProgressSpinnerModule,

        TranslateModule,

        FuseSharedModule,

        ShareModule
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
        DetailsComponent
    ]
})

export class MyaccountModule {
}
