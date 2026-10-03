import 'dotenv/config';
import { ImapFlow } from "imapflow";

const HOST = process.env.HOST ?? '';
const PORT = process.env.PORT ?? '';
const USER = process.env.USERNAME ?? '';
const PASS = process.env.PASS ?? '';

export async function connectBridge() {
    console.log('\nCreo setup connessione...\n');

    const client = new ImapFlow({
        host: HOST,
        port: Number(PORT),
        secure: false,

        tls: {
            rejectUnauthorized: false
        },

        auth: {
            user: USER,
            pass: PASS
        }
    });

    await client.connect();

    console.log('\nConnesso a Proton Mail\n');

    return client;
}