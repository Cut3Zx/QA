const fs = require('fs');

const htmlPath = 'index.html';
const jsonPath = 'quiz_parsed.json';

let html = fs.readFileSync(htmlPath, 'utf8');
const data = fs.readFileSync(jsonPath, 'utf8');

// replace fetch logic with inline data
const fetchBlock = `    // Load data
    fetch('quiz_parsed.json')
        .then(response => response.json())
        .then(data => {
            // Filter out empty chapters or chapters without questions
            quizData = data.filter(ch => ch.questions && ch.questions.length > 0);
            renderChapters();
        })
        .catch(err => {
            console.error('Error loading quiz data:', err);
            document.getElementById('chapter-list').innerHTML = '<p style="color:red;">Lỗi tải dữ liệu. Hãy chắc chắn quiz_parsed.json nằm cùng thư mục.</p>';
        });`;

const inlineBlock = `    // Load data inline
    const inlineData = ${data};
    quizData = inlineData.filter(ch => ch.questions && ch.questions.length > 0);
    renderChapters();`;

html = html.replace(fetchBlock, inlineBlock);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Injected data to index.html');
