const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response status code:', res.statusCode);
    console.log('Response data:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end(); 