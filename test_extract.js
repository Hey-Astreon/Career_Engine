const { PrismaClient } = require('@prisma/client');

async function run() {
  const prisma = new PrismaClient();
  const tokenRecord = await prisma.autopilotToken.findFirst({
    include: { user: true }
  });
  
  if (!tokenRecord) {
    console.log('No token found in DB. Test cannot proceed.');
    process.exit(1);
  }

  const token = tokenRecord.token;
  console.log(`Using token: ${token.substring(0, 10)}...`);

  const pageText = `
    Acme Corp is hiring!
    We are looking for a Senior Software Engineer to join our team.
    Responsibilities:
    - Write clean, maintainable code in TypeScript and Node.js
    - Design and build scalable backend services
    - Collaborate with cross-functional teams
    Requirements:
    - 5+ years of experience in backend development
    - Strong knowledge of AWS, Docker, and Kubernetes
    - Excellent problem-solving skills
    Benefits:
    - Competitive salary ($150k - $180k)
    - Remote work options
  `;

  console.log('Sending request to local server...');
  try {
    const res = await fetch('http://localhost:3000/api/autopilot/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pageText,
        pageUrl: 'https://careers.acmecorp.com/jobs/12345'
      })
    });

    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (data.session) {
      const session = await prisma.autopilotSession.findUnique({ where: { id: data.session } });
      console.log('Created DB Session:', session);
    }
  } catch (err) {
    console.error('Request failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
