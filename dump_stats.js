const data = require('./quiz_parsed.json');
data.forEach((c, i) => {
    console.log(`Chapter ${i}: ${c.title} - ${c.questions.length} questions`);
});
