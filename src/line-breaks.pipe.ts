import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lineBreaks'
})
export class LineBreaksPipe implements PipeTransform {
  transform(value: string): string {
    // Replace "\r\n" with "<br>" for line breaks
    return value.replace(/\r\n/g, '<br>');
  }
}
