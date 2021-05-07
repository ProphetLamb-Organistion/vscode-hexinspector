import * as ieee754 from "./ieee754";

function stringReverse(str: string) {
  return str.split("").reverse().join("");
}

function switchEndian(bytes: Uint8Array) {
  var result = new Uint8Array(bytes.length);
  for (let i = 0; i < result.length; i++) {
    result[i] = bytes[bytes.length - 1 - i];
  }
  return result;
}

export function hexToBytes(str: string, little_endian: boolean = true) {
  if (!str) return undefined;
  str = stringReverse(str);

  var result = new Uint8Array((str.length + 1) / 2);
  for (let i = 0; i < result.length; i++) {
    result[i] = parseInt(str[2 * i], 16) + (2 * i + 1 < str.length ? 16 * parseInt(str[2 * i + 1], 16) : 0);
  }

  if (!little_endian) {
    result = switchEndian(result);
  }
  return result;
}

export function bytesToUnsignedDec(bytes: Uint8Array) {
  if (bytes.length == 0) {
    return "";
  }

  var dec = new Uint8Array(3 * bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    var temp = new Uint32Array(3 * bytes.length);
    temp[0] = bytes[i] % 10;
    temp[1] = (bytes[i] / 10) % 10;
    temp[2] = (bytes[i] / 100) % 10;

    for (let j = 0; j < i; j++) {
      for (let k = 0; k < temp.length; k++) {
        temp[k] *= 256;
      }

      for (let k = 0; k < temp.length - 1; k++) {
        if (temp[k] >= 10) {
          temp[k + 1] += temp[k] / 10;
          temp[k] %= 10;
        }
      }
    }

    for (let j = 0; j < dec.length; j++) {
      dec[j] += temp[j];
    }
    for (let j = 0; j < dec.length - 1; j++) {
      if (dec[j] >= 10) {
        dec[j + 1] += dec[j] / 10;
        dec[j] %= 10;
      }
    }
  }

  var length = 0;
  for (let j = 0; j < dec.length; j++) {
    if (dec[j] != 0) {
      length = j;
    }
  }

  var result = "";
  for (let j = 0; j <= length; j++) {
    result = dec[j] + result;
  }

  return result;
}

export function bytesToSignedDec(bytes: Uint8Array) {
  if (bytes.length == 0) {
    return "";
  }

  let copy = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; ++i) {
    copy[i] = bytes[i];
  }

  let sign = copy[copy.length - 1] >> 7;
  copy[copy.length - 1] &= 0x7f;
  return (sign ? "-" : "") + bytesToUnsignedDec(copy);
}

export function bytesToBin(bytes: Uint8Array) {
  var result = "";
  for (const byte of bytes) {
    for (let i = 0; i < 8; i++) {
      result = ((byte >> i) % 2) + result;
    }
  }
  return result;
}

export function bytesToFloat16(bytes: Uint8Array) {
  if (bytes.length > 2 || bytes.length == 0) return undefined;
  if (bytes.length == 1)
    bytes = new Uint8Array([0, bytes[0]]);
  return ieee754.read(bytes, 0, true, 10, 2);
}

export function bytesToFloat32(bytes: Uint8Array) {
  if (bytes.length > 4 || bytes.length == 0) return undefined;
  let padBytes;
  if (bytes.length == 4) {
    padBytes = bytes;
  } else {
    padBytes = new Uint8Array(4);
    for (let i = 0; i < bytes.length; i++)
      padBytes[4 - i] = bytes[i];
  }
  return ieee754.read(padBytes, 0, true, 23, 4);
}

export function bytesToFloat64(bytes: Uint8Array) {
  if (bytes.length > 8 || bytes.length == 0) return undefined;
  let padBytes;
  if (bytes.length == 8) {
    padBytes = bytes;
  } else {
    padBytes = new Uint8Array(4);
    for (let i = 0; i < bytes.length; i++)
      padBytes[8 - i] = bytes[i];
  }
  return ieee754.read(bytes, 0, true, 52, 8);
}

export function bytesToStr(bytes: Uint8Array) {
  var result = "";
  for (const byte of bytes) {
    result = String.fromCharCode(byte) + result;
  }
  return result;
}

function countBits(bytes: Uint8Array) {
  let i = bytes.length - 1;
  while (i >= 0 && bytes[i] == 0) {
    i--;
  }
  if (i == -1) {
    return 0;
  }
  return i * 8 + Math.trunc(Math.log2(bytes[i]) + 1);
}

function shiftBytes(bytes: Uint8Array, shift: number) {
  if (!Number.isInteger(shift) || shift < 0) {
    return undefined;
  }

  var result = new Uint8Array(bytes.length);

  let bits = shift % 8;
  for (let i = 0, j = Math.trunc(shift / 8); j < bytes.length; ++i, ++j) {
    result[i] = bytes[j] >> bits;
    if (j + 1 < bytes.length) {
      result[i] += bytes[j + 1] << (8 - bits);
    }
  }

  return result;
}

export function bytesToSize(bytes: Uint8Array) {
  let prefixes = ["", "Ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi", "Yi"];
  let bits = countBits(bytes);
  let prefix_index = Math.min(prefixes.length - 1, Math.trunc(bits / 10));

  let shifted_bytes = bytes;
  let right = ".000";

  if (prefix_index == 1) {
    right = ((shifted_bytes[0] + 256 * (shifted_bytes[1] & 0x03)) / (1 << 10))
      .toFixed(3)
      .substr(1);
    shifted_bytes = shiftBytes(shifted_bytes, 10);
  } else if (prefix_index >= 2) {
    shifted_bytes = shiftBytes(shifted_bytes, prefix_index * 10 - 16);
    right = ((shifted_bytes[0] + 256 * shifted_bytes[1]) / (1 << 16))
      .toFixed(3)
      .substr(1);
    shifted_bytes = shifted_bytes.slice(2);
  }

  let left = bytesToUnsignedDec(shifted_bytes);
  if (left == "") {
    left = "0";
  }

  return left + right + " " + prefixes[prefix_index] + "B";
}

export function floatToBytes(str: string, little_endian: boolean = true) {
  if (!str) return undefined;
  const value = parseFloat(str);
  if (Number.isNaN(value) || !Number.isFinite(value)) return undefined;
  let bytes = new Uint8Array(8);
  ieee754.write(bytes, value, 0, little_endian, 52, 8);
  return bytes;
}

export function intToBytes(str: string, little_endian: boolean = true) {
  if (!str) return undefined;
  const zero = BigInt(0);
  const byMax = BigInt(256);
  let result = new Uint8Array(32);
  let value = BigInt(str);
  let i = 0;
  for (; value > zero; i++) {
    result[i] = Number(value % byMax);
    value /= byMax;
  }
  result = result.slice(0,Math.pow(2, Math.ceil(Math.log2(i))));
  return little_endian ? result : result.reverse();
}