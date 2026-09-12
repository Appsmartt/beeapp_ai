import assert from "node:assert/strict";

import {
  MAX_COMMERCIAL_VERIFICATION_PDF_SIZE_BYTES,
  validateCommercialVerificationPdf,
} from "../src/services/commercialVerificationDocumentService";

validateCommercialVerificationPdf({
  uri: "file:///tmp/rut.pdf",
  name: "rut.pdf",
  mimeType: "application/pdf",
  size: 1024,
});

assert.throws(
  () => validateCommercialVerificationPdf({
    uri: "file:///tmp/imagen.jpg",
    name: "imagen.jpg",
    mimeType: "image/jpeg",
    size: 1024,
  }),
  /PDF/,
);

assert.throws(
  () => validateCommercialVerificationPdf({
    uri: "file:///tmp/grande.pdf",
    name: "grande.pdf",
    mimeType: "application/pdf",
    size: MAX_COMMERCIAL_VERIFICATION_PDF_SIZE_BYTES + 1,
  }),
  /10 MB/,
);

console.log("commercial verification PDF validation: OK");
