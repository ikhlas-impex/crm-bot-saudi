const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function run() {
  fs.writeFileSync('test.jpg', 'fake image data');
  const form = new FormData();
  form.append('warrantystatus', 'IW');
  form.append('phone', '8129624615');
  form.append('customername', 'Test User');
  form.append('invoiceimg', fs.createReadStream('test.jpg'));

  const res = await fetch('http://localhost:3000/api/complaint/register', {
    method: 'POST',
    body: form
  });

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
run();
