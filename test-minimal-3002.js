const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/linkedin-jobs?keywords=Software%20Engineer&location=Melbourne&limit=60',
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