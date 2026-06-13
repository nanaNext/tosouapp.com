const fs = require('fs');
const path = require('path');

const htmlRoot = path.join(__dirname, 'src', 'static', 'html');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // 1. Thay thế <!-- #include file="..." --> thành <%- include('...') %>
      content = content.replace(/<!--\s*#include\s+file="([^"]+)"\s*-->/g, (match, p1) => {
        let ejsPath = p1;
        if (ejsPath.endsWith('.html')) {
          ejsPath = ejsPath.slice(0, -5) + '.ejs';
        }
        return `<%- include('${ejsPath}') %>`;
      });
      
      // 2. Bơm Cache Busting Version cho các file tĩnh nội bộ
      content = content.replace(/(href|src)=["'](\/static\/[^"'?#]+)([^"']*)["']/g, (m, attr, url, rest) => {
        if (rest.startsWith('?')) {
          if (rest.includes('v=')) return `${attr}="${url}${rest}"`; // Đã có v=
          return `${attr}="${url}${rest}&v=<%= appVersion %>"`;
        }
        return `${attr}="${url}?v=<%= appVersion %>${rest}"`;
      });
      
      // Lưu lại với tên file .ejs
      const ejsPath = fullPath.slice(0, -5) + '.ejs';
      fs.writeFileSync(ejsPath, content, 'utf8');
      
      // Xóa file .html cũ
      fs.unlinkSync(fullPath);
      console.log(`Converted: ${fullPath} -> ${ejsPath}`);
    }
  }
}

processDirectory(htmlRoot);
console.log('Conversion to EJS completed!');
