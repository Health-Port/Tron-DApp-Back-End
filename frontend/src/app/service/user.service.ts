import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { environment } from '../../environments/environment';
import { User } from '../model/user.model';
import { Contact } from '../model/contact.model';

interface responseData {
  code: any;
  message: string,
  data: Object,
  token:any;
}

@Injectable({
  providedIn: 'root'
})

export class UserService {

  constructor(private httpClient: HttpClient) { }
  
  signUp(userModel: User, captchaKey) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');

    let data = { name:userModel.name, email: userModel.email, password: userModel.password, isAgree:userModel.isAgree, referby: userModel.referby, destination: userModel.via, role: userModel.role, captchaKey: captchaKey };

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/signup", data, { headers: headers });
  }

  signIn(userModel: User, captchaKey) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');

    let data = { email: userModel.email, password: userModel.password, captchaKey: captchaKey };

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/signin", data, { headers: headers });
  }

  forgetPassword(userModel: User, captchaKey) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');

    let data = { email: userModel.email, captchaKey: captchaKey };

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/forgetPassword", data, { headers: headers });
  }

  updatePassword(userModel: User, token, captchaKey) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', token);
    let data = { password: userModel.password, captchaKey: captchaKey };

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/confirmForgotPassword", data, { headers: headers });
  }

  VerifyEmail(token) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', token);
    let data = {};
    return this.httpClient.post<responseData>(environment.serviceUrl + "user/verifyEmail", data, { headers: headers });
  }

  resendEmailToUser(token) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', token);
    let data = {};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/resendLinkEmail", data, { headers: headers });
  }

  updateAccountEmail(d) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', d.token);
    let data = {userId: d.userId, newEmail: d.email, password: d.password};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/changeEmail", data, { headers: headers });
  }

  getUserReferrals(userId, coupon, pNum, token) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', token);
    let data = {userId: userId, referalCoupon : coupon, pageNumber : pNum};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/getReferralsByUser", data, { headers: headers });
  }
  
  contactUs(contact : Contact, captchaKey) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');

    let data = { fname: contact.fname, lname: contact.lname, email: contact.email, phone: contact.phone, message: contact.message, captchaKey: captchaKey};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/contactus", data, { headers: headers });
  }
}
