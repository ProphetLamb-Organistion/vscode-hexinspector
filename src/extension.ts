"use strict";

import * as vscode from "vscode";
import * as converters from "./converters";
import * as utils from "./utils";

const HEX_REGEXES = [
  /^(?:0x|#)([0-9a-f]+)(?:u?l?l?|m)$/is,
];

const FLOAT_REGEXES = [
  // Integer allows IEEE 754 format indicator
  /^([+-]?\d+)(?:u?l?l|[fdm])?$/is,
  // Decimal & scientific notation with e or *10^, allows colon & dot decimal separator, omitted leading zero, and IEEE 754 format indicator
  /^([+-]?(?:\d*[.,]\d+|\d+)(?:e[+-]?\d+)?)[fdm]?$/is,
  // Integer with colon & apostrophe thousand separators, allows IEEE 754 format indicator
  /^([+-]?\d{1,3}(?:[,']\d{3})*)(?:u?l?l|[fdm])?$/is,
];

function matchFirst(str: string, regexes: Array<RegExp>) {
  for (let regex of regexes) {
    let match = regex.exec(str);
    if (match) return match[1];
  }
  return undefined;
}

function getHover(original: string, bytes: Uint8Array, littleEndian: boolean) {
  let length = bytes.length;
  let asUnsigned = utils.addThousandsSeparator(converters.bytesToUnsignedDec(bytes));
  let asSigned = utils.addThousandsSeparator(converters.bytesToSignedDec(bytes));
  let asDecimal = asUnsigned + (asSigned != asUnsigned ? " / " + asSigned : "");
  let asBinary = utils.addBytesSeparator(converters.bytesToBin(bytes));
  let asFloat16 = converters.bytesToFloat16(bytes);
  let asFloat32 = converters.bytesToFloat32(bytes);
  let asFloat64 = converters.bytesToFloat64(bytes);
  let asCharSequence = converters.bytesToStr(bytes);
  let asSize = converters.bytesToSize(bytes);

  let endianness = (littleEndian ? "*little" : "*big") + " endian*";

  return new vscode.Hover(new vscode.MarkdownString()
    .appendMarkdown("**HexInspector: " + original + " (" + length + "B)**")
    .appendMarkdown("\nFormat | Value\n--- | ---")
    .appendMarkdown("\ndecimal | " + asDecimal)
    .appendMarkdown("\nbinary | " + asBinary)
    .appendMarkdown(asFloat16 ? "" : "\nfloat16 | " + asFloat16)
    .appendMarkdown(asFloat32 ? "" : "\nfloat32 | " + asFloat32)
    .appendMarkdown(asFloat64 ? "" : "\nfloat64 | " + asFloat64)
    .appendMarkdown("\nsize | " + asSize)
    .appendMarkdown("\nchars | " + asCharSequence)
    .appendMarkdown("\n" + endianness));
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
        let bytes = converters.hexToBytes(
          parseAny(word, HEX_REGEXES),
          little_endian
        );
        bytes ??= converters.float64ToBytes(
          parseAny(word, FLOAT_REGEXES),
          little_endian
        );
        if (bytes) {
          return getHover(word, bytes, little_endian);
        }
      },
    }
  );

  context.subscriptions.push(hover);
}

export function deactivate() {}
