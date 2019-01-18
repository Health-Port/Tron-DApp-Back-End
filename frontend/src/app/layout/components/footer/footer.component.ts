import { Component, OnInit } from '@angular/core';
import { environment } from './../../../../environments/environment.prod';

@Component({
    selector   : 'footer',
    templateUrl: './footer.component.html',
    styleUrls  : ['./footer.component.scss']
})
export class FooterComponent
{
	currentYear: number;
	fileUrlBase:string;
    /**
     * Constructor
     */
    constructor()
    {
        console.log(environment.serviceUrl);
        this.fileUrlBase = environment.serviceUrl;
    }

    ngOnInit() {
        this.currentYear = (new Date()).getFullYear();      
    }
}
