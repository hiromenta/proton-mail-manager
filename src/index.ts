import { connectBridge } from './connect_bridge.js';
import { deleteMail, getMailLabel, getMails, getMailType } from './bridge_utils.js';
import { ask, JevChoiceAnswer, JevRequest } from './jev_utils.js';

const client = await connectBridge();

console.log('\nAvvio scansione...\n');

try {
    const messages = await getMails(client, 'INBOX');
    const checkedMessages = await getMails(client, 'Labels/Checked');

    const messagesIds = messages.map(m => m.id);
    const checkedMessagesIds = checkedMessages.map(m => m.id);

    const uncheckedIds = messagesIds.filter(id => !checkedMessagesIds.includes(id));
    const uncheckedMessages = messages.filter(msg => uncheckedIds.includes(msg.id));

    for (const message of uncheckedMessages) {
        const senderName = message.envelope?.from?.[0].name;
        const senderAddress = message.envelope?.from?.[0].address;

        console.log('\n', senderName, senderAddress);

        const choice = await getMailType(client, message);

        if (!choice) {
            continue;
        }

        switch (choice) {
            case 'temp':
            case 'ad':
            case 'scam':
                await deleteMail(client, message);
                console.log(message.envelope?.subject, '- deleted');
                break;
            default:
                const res = await getMailLabel(client, message);

                if (res) {
                    console.log('Email spostata in', res.label + (res.urgent ? '(URGENTE)' : ''));
                }
        }
    }
} finally {}

await client.logout();