import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatButtonModule, MatIconModule ,MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS,} from '@angular/material';
import { TranslateModule } from '@ngx-translate/core';
import 'hammerjs';

import { FuseModule } from '@fuse/fuse.module';
import { FuseSharedModule } from '@fuse/shared.module';
import { FuseProgressBarModule, FuseSidebarModule, FuseThemeOptionsModule } from '@fuse/components';

import { fuseConfig } from 'app/fuse-config';

import { AppComponent } from 'app/app.component';
import { LayoutModule } from 'app/layout/layout.module';
import { SampleModule } from 'app/main/sample/sample.module';
import { HomeModule } from 'app/main/home/home.module';
import { AboutModule } from 'app/main/about/about.module';
import { LegalnoticesModule } from 'app/main/legalnotices/legalnotices.module';
import { SignupModule } from 'app/main/signup/signup.module';
import { LoginModule } from 'app/main/login/login.module';
import { MyaccountModule } from 'app/main/myaccount/myaccount.module';
import { MedicationlistModule } from 'app/main/medicationlist/medicationlist.module';
import { UpdateAccountModule } from 'app/main/update-account/update-account.module';
import { ProcedureHistoryModule } from 'app/main/procedure-history/procedure-history.module';
import { ForgotPasswordModule } from 'app/main/forgot-password/forgot-password.module';
import { ResetPasswordModule } from 'app/main/reset-password/reset-password.module';
import { VerificationModule } from 'app/main/verification/verification.module';
import { CompareValidatorDirective } from 'app/directive/compare-validator.directive';
import { Global } from 'app/service/global.service';
const appRoutes: Routes = [
    {
        path      : '**',
        redirectTo: 'home'
    },
    {
        path      : 'legalnotices',
        redirectTo: 'legalnotices'
    },
    {
        path      : 'login',
        redirectTo: 'login'
    },
    {
        path      : 'signup',
        redirectTo: 'signup'
    },
    {
        path      : 'myaccount',
        redirectTo: 'myaccount'
    }   
];

@NgModule({
    declarations: [
        AppComponent,
        CompareValidatorDirective
    ],
    imports     : [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        HttpModule,
        RouterModule.forRoot(appRoutes, {useHash : true}),

        TranslateModule.forRoot(),

        // Material moment date module
        MatMomentDateModule,

        // Material
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,

        // Fuse modules
        FuseModule.forRoot(fuseConfig),
        FuseProgressBarModule,
        FuseSharedModule,
        FuseSidebarModule,
        FuseThemeOptionsModule,

        // App modules
        LayoutModule,
        HomeModule,
        AboutModule,
        LegalnoticesModule,
        SignupModule,
        LoginModule,
        MyaccountModule,
        MedicationlistModule,
        UpdateAccountModule,
        ProcedureHistoryModule,
        ForgotPasswordModule,
        ResetPasswordModule,
        VerificationModule
    ],
    providers: [
        Global,
        {
            provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, 
            useValue: { 
                duration: 3000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
            }
        }
    ],
    bootstrap   : [
        AppComponent
    ]
})
export class AppModule
{
}
