const fs = require('fs');
const AdmZip = require('adm-zip');

const docFilePath = 'Chinh_tri_mac_theo_chuong (1).docx';
const zip = new AdmZip(docFilePath);
const documentXmlEntry = zip.getEntry('word/document.xml');
let xmlString = documentXmlEntry.getData().toString('utf8');

const paragraphs = [];
const pMatches = xmlString.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g);

for (const pMatch of pMatches) {
    const pContent = pMatch[1];
    const rMatches = pContent.matchAll(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g);

    let paragraphText = '';
    let isHighlighted = false;

    for (const rMatch of rMatches) {
        const rContent = rMatch[1];
        if (rContent.includes('<w:highlight')) {
            isHighlighted = true;
        }
        const tMatches = rContent.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g);
        for (const tMatch of tMatches) {
            paragraphText += tMatch[1];
        }
    }

    paragraphText = paragraphText.trim();
    if (paragraphText) {
        paragraphs.push({
            text: paragraphText,
            highlight: isHighlighted
        });
    }
}

const chapters = [];
let currentChapter = null;
let currentQuestion = null;

for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.text;
    const lowerText = text.toLowerCase();

    if (lowerText.startsWith('chương ') || lowerText.startsWith('phần ') || lowerText === 'chương 1' || lowerText.includes('theo chương')) {
        currentChapter = { title: text, questions: [] };
        chapters.push(currentChapter);
        currentQuestion = null;
        continue;
    }

    if (lowerText.startsWith('câu ')) {
        currentQuestion = { text: text, options: [] };
        if (!currentChapter) {
            currentChapter = { title: 'Unknown', questions: [] };
            chapters.push(currentChapter);
        }
        currentChapter.questions.push(currentQuestion);
        continue;
    }

    if (currentQuestion) {
        // Assume anything after a 'Câu XYZ' is an option, UNLESS currentQuestion.text doesn't end with a typical question mark/colon 
        // AND the current line is long or doesn't look like an option.
        // But actually, in this doc, options are often just listed on new lines immediately. 
        // Let's check if there are 4 options usually.
        // To be safe, any new paragraph is an option if we already have the question text.
        // Wait, sometimes question text is spread. Let's just treat EVERY new paragraph as an option.

        let isOption = true;
        // If the paragraph is not highlighted, doesn't start with A/B/C/D, and the question text doesn't end with a ?, ., or :
        // AND it's the very first line after the question, maybe it's a continuation?
        if (currentQuestion.options.length === 0 && !p.highlight && !/^[A-D][\.\)]/.test(text.trim())) {
            const qTextEndsWithPunctuation = /[\?\.\:]\s*$/.test(currentQuestion.text);
            if (!qTextEndsWithPunctuation) {
                isOption = false;
            }
        }

        if (isOption) {
            currentQuestion.options.push({ text: text, isCorrect: p.highlight });
        } else {
            currentQuestion.text += ' ' + text;
        }
    }
}

fs.writeFileSync('quiz_parsed.json', JSON.stringify(chapters, null, 2), 'utf8');
console.log('Written quiz_parsed.json');
