"use strict";

import * as vscode from "vscode";
import * as converters from "./converters";
import * as utils from "./utils";

const HEX_REGEXES = [
  /^(?:0x|\#)([0-9a-f]+)u?l?l?$/is,
];

const INTEGER_REGEXES = [
  // Integer allows IEEE 754 format indicator
  /^([+-]?\d+)u?l?l?$/is,
  // Integer with colon & apostrophe thousand separators, allows IEEE 754 format indicator
  /^([+-]?\d{1,3}(?:[,']\d{3})*)u?l?l?$/is,
];

const FLOAT_REGEXES = [
  // Decimal & scientific notation, allows colon & dot decimal separator, omitted leading zero, and IEEE 754 format indicator
  /^([+-]?(?:\d*[.,]\d+|\d+)(?:e[+-]?\d+)?)[fdm]?$/is,
];

function matchFirst(str: string, regexes: Array<RegExp>) {
  for (let regex of regexes) {
    let match = regex.exec(str);
    if (match) return match[1];
  }
  return undefined;
}

function toHexString(bytes: Uint8Array) {
  return '0x' + Buffer.from(bytes).toString('hex');
}

function getHover(original: string, bytes: Uint8Array, little_endian: boolean) {
  let length = bytes.length;
  let displayBy = toHexString(bytes);
  let asUnsigned = utils.addThousandsSeparator(converters.bytesToUnsignedDec(bytes));
  let asSigned = utils.addThousandsSeparator(converters.bytesToSignedDec(bytes));
  let asDecimal = asUnsigned + (asSigned != asUnsigned ? " / " + asSigned : "");
  let asBinary = utils.addBytesSeparator(converters.bytesToBin(bytes));
  let asFloat16 = converters.bytesToFloat16(bytes);
  let asFloat32 = converters.bytesToFloat32(bytes);
  let asFloat64 = converters.bytesToFloat64(bytes);
  let asCharSequence = converters.bytesToStr(bytes);
  let asSize = converters.bytesToSize(bytes);

  let endianness = (little_endian ? "*little" : "*big") + " endian*";
  
  let markdown = new vscode.MarkdownString();
  markdown.isTrusted = true;
  markdown
    .appendMarkdown('**HexInspector: ' + displayBy + ' (' + length + 'B)**')
    .appendMarkdown('\n\nFormat | Value\n --- | --- ')
    .appendMarkdown('\ndec | ' + asDecimal)
    .appendMarkdown('\nbin | ' + asBinary)
    .appendMarkdown(!asFloat16 ? '' : '\nf16 | ' + asFloat16)
    .appendMarkdown(!asFloat32 ? '' : '\nf32 | ' + asFloat32)
    .appendMarkdown(!asFloat64 ? '' : '\nf64 | ' + asFloat64)
    .appendMarkdown('\nfsize | ' + asSize)
    .appendMarkdown('\nchars | ' + asCharSequence)
    .appendMarkdown('\n' + endianness);

  return new vscode.Hover(markdown);
}

export function activate(context: vscode.ExtensionContext) {
  var hover = vscode.languages.registerHoverProvider(
    { scheme: "*", language: "*" },
    {
      provideHover(document, position, token) {
        var word = document.getText(document.getWordRangeAtPosition(position));

        let little_endian: boolean = vscode.workspace
          .getConfiguration("hexinspector")
          .get("endianness");
        // Chain of responsibility hex>float
        let bytes =
          converters.hexToBytes(matchFirst(word, HEX_REGEXES), little_endian) ??
          converters.intToBytes(matchFirst(word, INTEGER_REGEXES), little_endian) ??
          converters.floatToBytes(matchFirst(word, FLOAT_REGEXES), little_endian);
        if (bytes) {
          return getHover(word, bytes, little_endian);
        }
      },
    }
  );
  context.subscriptions.push(hover);
}

export function deactivate() {}
