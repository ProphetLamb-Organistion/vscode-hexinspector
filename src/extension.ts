"use strict";

import * as vscode from "vscode";
import * as converters from "./converters";
import * as utils from "./utils";

const HEX_REGEXES = [
  /^(?:0[xX]|#)([0-9a-fA-F]+)(?:[uU]?[lL]?[lL]?|[mM])$/,
  /^#([0-9a-fA-F]+)$/,
  // "([0-9]+)", this is no hexadecimal!
];

const FLOAT_REGEXES = [
  // integer allows for thousand separators and float radix 10 indicator
  /^[+-]?\d{1,3}(?:,?\d{3})*(?:[uU]?[lL]?[lL]?|[mM])?$/,
  // decimal & scientific notation with e or *10^, allows for thousand separators, omitted leading zero, and radix 10 indicator
  /^[+-]?(?:\d{1,3}(?:,?\d{3})*|0)?(?:\.\d+[1-9]?)?(?:[eE]|\*10\^(?:[+-]?\d+))?[mM]?$/,
];

function parseAny(str: string, regexes: Array<RegExp>) {
  for (let regex of regexes) {
    let match = regex.exec(str);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

function getHover(original: string, bytes: Uint8Array, littleEndian: boolean) {
  let length = bytes.length;
  let asUnsigned = utils.addThousandsSeparator(
    converters.bytesToUnsignedDec(bytes)
  );
  let asSigned = utils.addThousandsSeparator(
    converters.bytesToSignedDec(bytes)
  );
  let asDecimal = asUnsigned + (asSigned != asUnsigned ? " / " + asSigned : "");
  let asBinary = utils.addBytesSeparator(converters.bytesToBin(bytes));
  let asFloat16 = converters.bytesToFloat16(bytes);
  let asFloat32 = converters.bytesToFloat32(bytes);
  let asFloat64 = converters.bytesToFloat64(bytes);
  let asCharSequence = converters.bytesToStr(bytes);
  let asSize = converters.bytesToSize(bytes);

  let endianness = (littleEndian ? "Little" : "Big") + " Endian";

  let message =
    "HexInspector: " +
    original +
    " (" +
    length +
    "B)" +
    "\n" +
    "" +
    "\n" +
    "Decimal:  " +
    asDecimal +
    "\n" +
    "Size:     " +
    asSize +
    "\n" +
    "Binary:   " +
    asBinary +
    "\n" +
    "Float16:  " +
    (asFloat16 == "" ? "-" : asFloat16) +
    "\n" +
    "Float32:  " +
    (asFloat32 == "" ? "-" : asFloat32) +
    "\n" +
    "Float64:  " +
    (asFloat64 == "" ? "-" : asFloat64) +
    "\n" +
    "Chars:    " +
    asCharSequence +
    "\n" +
    "" +
    "\n" +
    endianness +
    "\n" +
    "";

  return new vscode.Hover({ language: "hexinspector", value: message });
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
