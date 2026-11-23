// make.fun entry: "Sum up 22 November's world news in one image".
//
// The newspaper page itself is entry.png, drawn beforehand and stored next
// to this file. This program does not draw anything: it sanity-checks the
// finished image and hands an unchanged copy to the grader.
//
// Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Node 22, ES module, no dependencies.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  fail('MAKEFUN_OUTPUT_DIR is not set');
}

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, 'entry.png');
const image = readFileSync(sourcePath);

// Every PNG starts with the same eight bytes.
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (image.length < 8 || !image.subarray(0, 8).equals(signature)) {
  fail('entry.png does not start with the PNG signature');
}

// The first chunk must be IHDR (13 data bytes): width, height, bit depth
// and colour type sit at fixed offsets inside it.
if (image.length < 33) {
  fail('entry.png is too short to hold an IHDR chunk');
}
if (image.readUInt32BE(8) !== 13 || image.subarray(12, 16).toString('ascii') !== 'IHDR') {
  fail('entry.png has no IHDR chunk where one is expected');
}
const width = image.readUInt32BE(16);
const height = image.readUInt32BE(20);
const bitDepth = image[24];
const colourType = image[25];
if (width !== 1024 || height !== 1024) {
  fail(`entry.png is ${width}x${height}; the entry must be 1024x1024`);
}
if (bitDepth !== 8) {
  fail(`entry.png has bit depth ${bitDepth}; expected 8`);
}
if (colourType < 2 || colourType > 6) {
  fail(`entry.png has colour type ${colourType}; expected 2-6`);
}
if (image.length > 1048576) {
  fail(`entry.png is ${image.length} bytes; the limit is 1048576`);
}

// A well-formed PNG ends with IEND: length 0, type "IEND", then a CRC.
// Checking the tail catches a file that was cut short after its header.
const last = image.subarray(image.length - 12);
if (last.readUInt32BE(0) !== 0 || last.subarray(4, 8).toString('ascii') !== 'IEND') {
  fail('entry.png has no IEND chunk at the end (file may be truncated)');
}

mkdirSync(outDir, { recursive: true });
const destPath = path.join(outDir, 'entry.png');
writeFileSync(destPath, image);

// The grader runs this program twice and compares the two outputs byte
// for byte, so confirm the copy is identical before declaring success.
const copied = readFileSync(destPath);
const sourceHash = createHash('sha256').update(image).digest('hex');
const copiedHash = createHash('sha256').update(copied).digest('hex');
if (sourceHash !== copiedHash) {
  fail('the copied entry.png differs from the source');
}
console.log(`wrote ${destPath} (${image.length} bytes, sha256 ${sourceHash})`);
