
import fs from 'fs';
const filePath = 'c:/Users/chenr/Desktop/Jogo/public/index.html';
let content = fs.readFileSync(filePath, 'utf8');

// The trophy emoji is \uD83C\uDFC6 in UTF-16, which might manifest as various byte sequences in reading text
// We'll use a regex to strip common "strange" non-ASCII clusters that survived
content = content.replace(/ðŸ †/g, '[V]');
content = content.replace(/Ã—/g, 'x');
content = content.replace(/Ã³/g, 'o');
content = content.replace(/Â·/g, '-');
content = content.replace(/â€”/g, '-');
content = content.replace(/Ãšltimo/g, 'Ultimo');
content = content.replace(/CÃ³digo/g, 'Codigo');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Final Encoding Polish Done.');
