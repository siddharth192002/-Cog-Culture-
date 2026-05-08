const pdf = require('pdf-parse');
console.log('Type of pdf.PDFParse:', typeof pdf.PDFParse);
if (typeof pdf.PDFParse === 'function') {
    console.log('PDFParse is a function');
} else {
    // Check if there is a default export that is a function
    console.log('Type of pdf.default:', typeof pdf.default);
}
