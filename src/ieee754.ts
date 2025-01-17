// Copyright 2020 justjavac. All rights reserved. MIT license.
// Copyright 2008 Fair Oaks Labs, Inc. All Rights Reserved. BSD-3-Clauselicense.

/**
 * Read IEEE754 floating point numbers from a array.
 * @param buffer the buffer
 * @param offset offset into the buffer
 * @param isLE is little endian?
 * @param mLen mantissa length
 * @param nBytes number of bytes
 */
 export function read(
    buffer: Uint8Array,
    offset: number,
    isLE: boolean,
    mLen: number,
    nBytes: number,
  ): number {
  let e: number;
  let m: number;
  const eLen: number = nBytes * 8 - mLen - 1;
  const eMax: number = (1 << eLen) - 1;
  const eBias: number = eMax >> 1;
  let nBits: number = -7;
  let i: number = isLE ? nBytes - 1 : 0;
  const d: number = isLE ? -1 : 1;
  let s: number = buffer[offset + i];

  i += d;

  e = s & ((1 << -nBits) - 1);
  s >>= -nBits;
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << -nBits) - 1);
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
}
  
  /**
 * Write IEEE754 floating point numbers to a array.
 * @param buffer the buffer
 * @param value value to set
 * @param offset offset into the buffer
 * @param isLE is little endian?
 * @param mLen mantissa length
 * @param nBytes number of bytes
 */
 export function write(
  buffer: Uint8Array,
  value: number,
  offset: number,
  isLE: boolean,
  mLen: number,
  nBytes: number,
): void {
  let e: number;
  let m: number;
  let c: number;
  let eLen: number = nBytes * 8 - mLen - 1;
  const eMax: number = (1 << eLen) - 1;
  const eBias: number = eMax >> 1;
  const rt: number = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  let i: number = isLE ? 0 : nBytes - 1;
  const d: number = isLE ? 1 : -1;
  const s: number = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (
    ;
    mLen >= 8;
    buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8
  ) {
  }

  e = (e << mLen) | m;
  eLen += mLen;
  for (
    ;
    eLen > 0;
    buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8
  ) {
  }

  buffer[offset + i - d] |= s * 128;
}