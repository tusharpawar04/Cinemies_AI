const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'testauth3@example.com',
      password: 'Password123!'
    });
    console.log('Login Success:', res.data.message);
  } catch (err) {
    console.error('Login Error:', err.response ? err.response.data : err.message);
  }
}
run();
