import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create demo user
    const user = await prisma.user.upsert({
        where: { id: 'demo-user' },
        update: {},
        create: {
            id: 'demo-user',
            name: 'Alex Johnson',
            email: 'alex@mockview.dev',
            image: null,
            location: 'San Francisco, CA',
            company: 'TechCorp Inc.',
            website: 'https://alexjohnson.dev',
            bio: 'Full-stack developer passionate about building great products.',
            theme: 'dark',
        },
    });
    console.log(`✅ User created: ${user.name} (${user.id})`);

    // Create interviews
    const interviews = await Promise.all([
        prisma.interview.create({
            data: {
                userId: user.id,
                type: 'behavioral',
                topic: 'Leadership & Teamwork',
                score: 92,
                duration: '28 min',
                questions: 5,
                feedback: { communication: 90, technical: 85, problemSolving: 88, confidence: 95 },
                transcript: [
                    { role: 'ai', text: 'Tell me about a time you led a team through a difficult project.' },
                    { role: 'user', text: 'In my previous role, I led a team of 6 engineers to migrate our monolith to microservices...' },
                ],
                createdAt: new Date('2026-03-05T10:00:00Z'),
            },
        }),
        prisma.interview.create({
            data: {
                userId: user.id,
                type: 'technical',
                topic: 'Frontend Architecture',
                score: 88,
                duration: '35 min',
                questions: 5,
                feedback: { communication: 85, technical: 92, problemSolving: 88, confidence: 82 },
                createdAt: new Date('2026-03-04T14:00:00Z'),
            },
        }),
        prisma.interview.create({
            data: {
                userId: user.id,
                type: 'system-design',
                topic: 'Distributed Cache',
                score: 75,
                duration: '40 min',
                questions: 4,
                feedback: { communication: 80, technical: 72, problemSolving: 70, confidence: 78 },
                createdAt: new Date('2026-03-03T09:00:00Z'),
            },
        }),
        prisma.interview.create({
            data: {
                userId: user.id,
                type: 'behavioral',
                topic: 'Conflict Resolution',
                score: 85,
                duration: '25 min',
                questions: 5,
                feedback: { communication: 88, technical: 75, problemSolving: 82, confidence: 90 },
                createdAt: new Date('2026-03-02T11:00:00Z'),
            },
        }),
        prisma.interview.create({
            data: {
                userId: user.id,
                type: 'technical',
                topic: 'React Performance',
                score: 91,
                duration: '30 min',
                questions: 5,
                feedback: { communication: 88, technical: 95, problemSolving: 90, confidence: 85 },
                createdAt: new Date('2026-03-01T16:00:00Z'),
            },
        }),
        prisma.interview.create({
            data: {
                userId: user.id,
                type: 'behavioral',
                topic: 'Problem Solving Under Pressure',
                score: 95,
                duration: '25 min',
                questions: 5,
                feedback: { communication: 92, technical: 88, problemSolving: 96, confidence: 98 },
                createdAt: new Date('2026-02-28T13:00:00Z'),
            },
        }),
    ]);
    console.log(`✅ Created ${interviews.length} interviews`);

    // Create resume analysis
    const resume = await prisma.resumeAnalysis.create({
        data: {
            userId: user.id,
            fileName: 'Alex_Johnson_Resume.pdf',
            atsScore: 76,
            keywordData: [
                { keyword: 'React', count: 8, relevance: 95, found: true },
                { keyword: 'TypeScript', count: 5, relevance: 90, found: true },
                { keyword: 'Node.js', count: 3, relevance: 85, found: true },
                { keyword: 'System Design', count: 2, relevance: 80, found: true },
                { keyword: 'AWS', count: 4, relevance: 88, found: true },
                { keyword: 'Docker', count: 1, relevance: 75, found: true },
                { keyword: 'CI/CD', count: 0, relevance: 78, found: false },
                { keyword: 'Python', count: 1, relevance: 55, found: true },
                { keyword: 'SQL', count: 2, relevance: 72, found: true },
                { keyword: 'Kubernetes', count: 0, relevance: 68, found: false },
            ],
            sectionScores: [
                { label: 'Contact Info', score: 100 },
                { label: 'Summary', score: 60 },
                { label: 'Experience', score: 78 },
                { label: 'Skills', score: 85 },
                { label: 'Education', score: 90 },
                { label: 'Keywords', score: 65 },
            ],
            improvements: [
                { severity: 'critical', title: 'Add quantifiable achievements', description: 'Replace generic statements with specific metrics (e.g., "Improved load time by 40%").' },
                { severity: 'warning', title: 'Strengthen professional summary', description: 'Your summary is too generic. Include target role, years of experience, and key differentiators.' },
                { severity: 'warning', title: 'Add missing keywords', description: 'Include CI/CD and Kubernetes mentions — these appear in 78% of target job postings.' },
                { severity: 'suggestion', title: 'Optimize formatting for ATS', description: 'Use standard section headers and avoid tables/graphics that ATS cannot parse.' },
            ],
        },
    });
    console.log(`✅ Created resume analysis: ATS Score ${resume.atsScore}`);

    // Create goals
    const goals = await Promise.all([
        prisma.goal.create({
            data: { userId: user.id, label: 'Complete 30 Interviews', target: 30, current: 24 },
        }),
        prisma.goal.create({
            data: { userId: user.id, label: 'Reach Level 10', target: 10, current: 8 },
        }),
        prisma.goal.create({
            data: { userId: user.id, label: 'Improve Resume to 90+', target: 90, current: 76 },
        }),
    ]);
    console.log(`✅ Created ${goals.length} goals`);

    // Create streak
    const streak = await prisma.streak.create({
        data: {
            userId: user.id,
            currentStreak: 12,
            bestStreak: 15,
            lastActiveAt: new Date(),
        },
    });
    console.log(`✅ Streak created: ${streak.currentStreak} days`);

    console.log('\n🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
