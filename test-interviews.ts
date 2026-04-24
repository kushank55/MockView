import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const interviews = await prisma.interview.findMany();
    console.log("Total Interviews in DB:", interviews.length);
    console.log("Last 3 interviews:", interviews.slice(-3).map(i => ({ id: i.id, topic: i.topic, score: i.score, createdAt: i.createdAt })));
    
    // Also check user ID mapping
    const users = await prisma.user.findMany();
    console.log("Total Users in DB:", users.length);
    if (users.length > 0) {
        console.log("User 0 ID:", users[0].id);
        const myInterviews = await prisma.interview.findMany({ where: { userId: users[0].id } });
        console.log("User 0 interviews:", myInterviews.length);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
