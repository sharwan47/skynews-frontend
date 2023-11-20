// decompression.service.ts
import { Injectable } from '@angular/core';
import * as pako from 'pako';

@Injectable({
  providedIn: 'root',
})
export class DecompressionService {
  constructor() {}

  decompressData(compressedData: ArrayBuffer): string {
    try {
      // Convert ArrayBuffer to Uint8Array
      const compressedArray = new Uint8Array(compressedData);

      // Decompress the data using pako
      const decompressedArray = pako.inflate(compressedArray, { to: 'string' });

      // Explicitly cast the decompressedArray to BufferSource
      const decompressedString = new TextDecoder('utf-8').decode(decompressedArray as unknown as BufferSource);
      return decompressedString;
    } catch (error) {
      console.error('Decompression error:', error);
      return ''; // Handle the error gracefully
    }
  }
}
