import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    try {
        console.log('Using API Key starts with:', process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 5));
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: 'Say hello!',
        });
        console.log('Result:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}
main();
