import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthGuard } from 'app/guard/auth.guard';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserService } from '../../service/user.service';
import { UpdateAccountComponent } from './update-account.component';
import { MatButtonModule, MatIconModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatInputModule, MatProgressSpinnerModule } from '@angular/material';

const routes = [
  {
    path: 'update-account',
    component: UpdateAccountComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),

    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatProgressSpinnerModule,

    TranslateModule,

    FuseSharedModule
  ],
  declarations: [
    UpdateAccountComponent
  ],
  exports: [
    UpdateAccountComponent
  ],
  providers: [
    UserService,
  ]
})
export class UpdateAccountModule { }
