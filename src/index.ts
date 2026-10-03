import { connectBridge } from './connect_bridge.js';
import { deleteMail, getMailLabel, getMails, getMailType } from './bridge_utils.js';

const client = await connectBridge();

console.log('\nAvvio scansione...\n');

try {
    const messages = await getMails(client, 'INBOX');
    const checkedMessages = await getMails(client, 'Labels/Checked');

    console.log('\nMessages');
    console.log(messages);
    console.log(checkedMessages);

    const messagesIds = messages.map(m => m.envelope?.messageId);
    const checkedMessagesIds = checkedMessages.map(m => m.envelope?.messageId);

    console.log('\nIDs');
    console.log(messagesIds);
    console.log(checkedMessagesIds);

    const uncheckedIds = messagesIds.filter(id => !checkedMessagesIds.includes(id));
    const uncheckedMessages = messages.filter(msg => uncheckedIds.includes(msg.envelope?.messageId));

    console.log('\nUnchecked');
    console.log(uncheckedIds);
    console.log(uncheckedMessages);

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
                if (await deleteMail(client, message)) {
                    console.log(message.envelope?.subject, '- deleted');
                }
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