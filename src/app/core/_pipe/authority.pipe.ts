import { Pipe, PipeTransform } from '@angular/core';
import { Globals } from '../_helper/globals';

@Pipe({
    name: 'auth'
})
export class AuthorityPipe implements PipeTransform {
    constructor(private globals: Globals) { }
    transform(value: any, ...args: any[]) {
    
        if (value) {
            const result = value && this.globals.principal.hasAuthority(value);
           
            return result;
        }

        // Make it true for the development purpose if you don't have all the permissions
        return false;
    }

}