const data = {
  name: 'Test Sender',
  email: 'test@muchi.edu.zm',
  subject: 'Test Subject from Landing Page',
  message: 'Hello, this is a test contact message to verify SMTP settings!'
};

fetch('http://localhost:8080/api/contact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
.then(async (res) => {
  const body = await res.json();
  console.log('Status Code:', res.status);
  console.log('Response:', body);
})
.catch((err) => {
  console.error('Error submitting contact form:', err);
});
