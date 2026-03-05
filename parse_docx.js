const fs = require('fs');
const AdmZip = require('adm-zip');

const docFilePath = 'Chinh_tri_mac_theo_chuong (1).docx';
const zip = new AdmZip(docFilePath);
const documentXmlEntry = zip.getEntry('word/document.xml');
let xmlString = documentXmlEntry.getData().toString('utf8');

function decodeHtml(html) {
    return html.replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

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
            paragraphText += decodeHtml(tMatch[1]);
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
    let text = p.text.trim();
    const lowerText = text.toLowerCase();

    // 1. Chapter Detection
    // Match "Chương X", "Phần X", or similar markers. 
    // Also handle the header "CÂU HỎI ÔN TẬP..." by skipping or merging it.
    if (lowerText.startsWith('chương ') || lowerText.startsWith('phần ') || /^chương\s+\d+/.test(lowerText)) {
        // Skip the very first main title if it's already caught as a chapter
        if (text.toUpperCase().includes('CÂU HỎI ÔN TẬP')) {
            continue;
        }
        currentChapter = { title: text, questions: [] };
        chapters.push(currentChapter);
        currentQuestion = null;
        continue;
    }

    // 2. Question Detection
    if (lowerText.startsWith('câu ')) {
        // Handle merged lines: "Câu 98. Question text? A. Option A"
        let questionText = text;
        let firstOption = null;

        // Pattern to look for the first option inside a question line
        const optionSplitMatch = text.match(/^(Câu\s+\d+[\s\S]*?[\?\.\:])\s*([A-D][\.\)])\s*(.*)$/i);
        if (optionSplitMatch) {
            questionText = optionSplitMatch[1].trim();
            const optionLabel = optionSplitMatch[2];
            const optionContent = optionSplitMatch[3].trim();
            firstOption = { text: optionLabel + ' ' + optionContent, isCorrect: p.highlight };
        }

        currentQuestion = { text: questionText, options: [] };
        if (!currentChapter) {
            currentChapter = { title: 'Chương 1', questions: [] };
            chapters.push(currentChapter);
        }
        currentChapter.questions.push(currentQuestion);

        if (firstOption) {
            currentQuestion.options.push(firstOption);
        }
        continue;
    }

    // 3. Option or continuation Detection
    if (currentQuestion) {
        // If it starts with A. B. C. D. or A) B) C) D)
        const isExplicitOption = /^[A-D][\.\)]/.test(text);

        // If the paragraph is highlighted, it's almost certainly an option (the correct one)
        // OR if we already have the question text ending in punctuation
        let isOption = isExplicitOption || p.highlight;

        if (!isOption && currentQuestion.options.length === 0) {
            const qTextEndsWithPunctuation = /[\?\.\:]\s*$/.test(currentQuestion.text);
            if (!qTextEndsWithPunctuation) {
                // Continuation of question text
                currentQuestion.text += ' ' + text;
                continue;
            }
        }

        // Add as option
        currentQuestion.options.push({ text: text, isCorrect: p.highlight });
    }
}

fs.writeFileSync('quiz_parsed.json', JSON.stringify(chapters, null, 2), 'utf8');
console.log('Written quiz_parsed.json');
