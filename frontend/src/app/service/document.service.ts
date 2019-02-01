import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { environment } from '../../environments/environment';
import { Document } from '../model/document.model';

interface responseData {
  code: any;
  message: string,
  data: Object,
  token:any;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  constructor(private httpClient: HttpClient) { }

  saveAllergyList(docModel : Document) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', docModel.token);
    let data = { allergyForm: docModel.documentObject, noKnownAllergies : docModel.noKnownAllergies, userId : docModel.userId };

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/saveAllergyListByUser", data, { headers: headers });
  }

  saveMedicationList(docModel : Document) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', docModel.token);
    let data = { medicationForm: docModel.documentObject, noKnownMedications : docModel.noKnownMedications, userId : docModel.userId };

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/saveMedicationByUser", data, { headers: headers });
  }

  saveProcedureHistory(docModel : Document) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', docModel.token);
    let data = { procedureForm: docModel.documentObject, noKnownProcedures : docModel.noKnownProcedures, userId : docModel.userId };

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/saveProcedureByUser", data, { headers: headers });
  }

  getAllergyList(docModel : Document) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', docModel.token);
    let data = {userId: docModel.userId};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/getAllergyListByUser", data, { headers: headers });
  }

  getMedicationList(docModel : Document) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', docModel.token);
    let data = {userId: docModel.userId};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/getMedicationListByUser", data, { headers: headers });
  }

  getProcedureHistory(docModel : Document) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', docModel.token);
    let data = {userId: docModel.userId};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/getProcedureListByUser", data, { headers: headers });
  }

  getPDFByProvider(docModel : Document, id, type) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', docModel.token);
    let data = {providerId: docModel.userId, userId: id, type: type};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/getProviderSharedDocument", data, { headers: headers });
  }
  getFormSubmittedLatestDates(userId , token) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', token);
    let data = {userId: userId};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/getFormSubmissionDates", data, { headers: headers });
  }

  getProvidersList(userId,token, type) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', token);
    let data = {userId: userId, type: type};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/getAllProviders", data, { headers: headers });
  }

  saveSharedProviderList(userId, token, list, type) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', token);
    let data = {userId: userId, shareWith: list, type: type};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/shareListWithProviders", data, { headers: headers });
  }

  getSharedDataForProvider(d) {
    let headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');
    headers= headers.set('authorization', d.token);
    let data = { providerId: d.providerId, filter: d.filter, searchValue: d.searchValue, pageNumber: d.pageNo};

    return this.httpClient.post<responseData>(environment.serviceUrl + "user/getProviderSharedData", data, { headers: headers });
  }

}
