const fs = require('fs');
const AdmZip = require('adm-zip');

const docFilePath = 'Chinh_tri_mac_theo_chuong (1).docx';
const zip = new AdmZip(docFilePath);
const documentXmlEntry = zip.getEntry('word/document.xml');
let xmlString = documentXmlEntry.getData().toString('utf8');

// Just match all <w:t> tags
const allText = [];
const matches = xmlString.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
for (const match of matches) {
    if (match[1].trim()) {
        allText.push(match[1]);
    }
}

fs.writeFileSync('all_text.txt', allText.join('\n'), 'utf8');
console.log('Written all_text.txt');
