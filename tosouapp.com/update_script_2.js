const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('C:/tosouapp.com/attendance/backend/src/static/js/admin/employees/employees.page.js');
let code = fs.readFileSync(targetPath, 'utf8');

const previewLogic = `
    const fileInput = form.querySelector('#empAvatarFile');
    const previewBox = form.querySelector('#avatarPreviewBox');
    if (fileInput && previewBox) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          previewBox.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">';
        } else {
          previewBox.innerHTML = 'No Image';
        }
      });
    }
`;

const previewLogicEdit = `
    const fileInput = formEdit.querySelector('#empAvatarFile');
    const previewBox = formEdit.querySelector('#avatarPreviewBox');
    if (fileInput && previewBox) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          previewBox.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">';
        } else {
          previewBox.innerHTML = 'No Image';
        }
      });
    }
`;

// Thêm preview logic cho mode 'add'
if (!code.includes("fileInput.addEventListener('change'")) {
  code = code.replace(
    /form\.addEventListener\('submit', async \(e\) => \{/,
    previewLogic + "\\n    form.addEventListener('submit', async (e) => {"
  );
  
  code = code.replace(
    /formEdit\.addEventListener\('submit', async \(e\) => \{/,
    previewLogicEdit + "\\n    formEdit.addEventListener('submit', async (e) => {"
  );
  
  fs.writeFileSync(targetPath, code);
  console.log('Successfully added avatar preview logic');
} else {
  console.log('Avatar preview logic already exists');
}
