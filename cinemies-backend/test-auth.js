const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5000/api/v1/auth/register', {
      email: 'testauth3@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
run();
