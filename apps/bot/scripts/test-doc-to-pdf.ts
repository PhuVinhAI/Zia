/**
 * Test script: Convert DOC to PDF
 * Usage: bun scripts/test-doc-to-pdf.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { convertDocxToPdfLocal } from '../src/modules/media/services/docxToPdfService.js';

const INPUT_FILE = 'C:\\Users\\tomis\\Docs\\Zia\\scripts\\BAO_CAO Mon HCI_VVT.doc';
const OUTPUT_FILE = 'scripts/output-doc.pdf';

async function main() {
  console.log('📄 Reading DOC file:', INPUT_FILE);
  
  const docBuffer = readFileSync(INPUT_FILE);
  console.log(`   Size: ${(docBuffer.length / 1024).toFixed(1)} KB`);
  
  // Check file signature
  const sig = docBuffer.slice(0, 4).toString('hex').toUpperCase();
  console.log(`   Signature: ${sig}`);
  
  if (sig === 'D0CF11E0') {
    console.log('   ✓ Valid DOC (OLE Compound Document) format');
  } else if (sig === '504B0304') {
    console.log('   ✓ Valid DOCX (ZIP/Office Open XML) format');
  } else {
    console.log('   ⚠ Unknown format');
  }
  
  console.log('\n🔄 Converting to PDF...');
  const startTime = Date.now();
  
  const pdfBuffer = await convertDocxToPdfLocal(docBuffer);
  
  const elapsed = Date.now() - startTime;
  
  if (pdfBuffer) {
    writeFileSync(OUTPUT_FILE, pdfBuffer);
    console.log(`\n✅ Success!`);
    console.log(`   Output: ${OUTPUT_FILE}`);
    console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`   Time: ${elapsed}ms`);
  } else {
    console.log('\n❌ Conversion failed');
    process.exit(1);
  }
}

main().catch(console.error);
