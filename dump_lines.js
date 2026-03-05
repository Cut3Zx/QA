const fs = require('fs');
const AdmZip = require('adm-zip');

const docFilePath = 'Chinh_tri_mac_theo_chuong (1).docx';
const zip = new AdmZip(docFilePath);
const zipEntries = zip.getEntries();
const documentXmlEntry = zipEntries.find(entry => entry.entryName === 'word/document.xml');
let xmlString = documentXmlEntry.getData().toString('utf8');

const paragraphs = xmlString.split('<w:p ').map(p => '<w:p ' + p);
paragraphs.shift();

let lines = [];

for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    let fullText = '';
    let hasHighlight = false;

    const runs = p.split('<w:r ').map(r => '<w:r ' + r);
    runs.shift();
    runs.forEach(r => {
        const tMatch = r.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
        if (tMatch) {
            fullText += tMatch[1];
        }
        if (r.includes('<w:highlight ') || r.includes('w:highlight ')) {
            hasHighlight = true;
        }
    });

    fullText = fullText.trim();
    if (fullText) {
        lines.push({ text: fullText, highlight: hasHighlight });
    }
}

fs.writeFileSync('lines.json', JSON.stringify(lines, null, 2), 'utf8');
console.log('Written lines.json');
