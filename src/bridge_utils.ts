import { FetchMessageObject, ImapFlow } from "imapflow";
import { ask, JevChoiceAnswer, JevNoulAnswer, JevQuestionType, JevRequest } from "./jev_utils.js";

async function failCheckMailbox(client: ImapFlow, mailbox: string) {
    const mailboxesObjects = await client.list();
    const mailboxes = [];

    for (const mlbx of mailboxesObjects) {
        mailboxes.push(mlbx.path);
    }

    if (!mailboxes.includes(mailbox)) {
        await client.mailboxCreate(mailbox);
    }
}

export async function getMails(client: ImapFlow, mailbox: string) {
    await failCheckMailbox(client, mailbox);
    const lock = await client.getMailboxLock(mailbox);

    try {
        return await client.fetchAll({}, { envelope: true, flags: true, source: true, labels: true });
    } finally {
        lock.release();
    }
}

export async function deleteMail(client: ImapFlow, message: FetchMessageObject) {
    const lock = await client.getMailboxLock('INBOX');

    try {
        await client.messageFlagsAdd(message.uid, ['\\Deleted']);
    } finally {
        lock.release();
    }
}

export async function addLabel(client: ImapFlow, message: FetchMessageObject, label: string) {
    await failCheckMailbox(client, `Labels/${label}`);
    const result = await client.messageMove(message.uid, `Labels/${label}`);
    console.log('Move result:', result);
}

export async function getMailType(client: ImapFlow, message: FetchMessageObject): Promise<string | undefined> {
    const from = message.envelope?.from;
    const subject = message.envelope?.subject;
    const content = message.source?.toString();

    const state = `Ho ricevuto una mail da ${from}, l'oggetto è ${subject} e il contenuto è ${content}`;

    const request: JevRequest = {
        state,
        model: 'jev-latest',
        questions: {
            email_description: {
                type: 'choice',
                instructions: 'Che tipo di email è?',
                criteria: {
                    temp: "Un codice OTP, un codice temporaneo o un link temporaneo di accesso o conferma",
                    ad: "Una mail puramente promozionale senza un contenuto importante da leggere",
                    scam: "Una truffa o una mail con del contenuto malevolo",
                    normal: "Una mail normale o un messaggio che vale la pena leggere"
                }
            }
        }
    };

    const response = await ask(request);

    if (!response.answers) {
        return;
    }

    const answer = (response.answers['email_description'] as JevChoiceAnswer);

    console.log('Tipo di email:', answer.choice);

    if (answer.confidence <= 0.5) {
        console.log('Non abbastanza sicuro del risultato');
        return;
    }

    await addLabel(client, message, 'Checked');

    return answer.choice;
}

export async function getMailLabel(client: ImapFlow, message: FetchMessageObject): Promise<{ label: string; urgent: boolean } | undefined> {
    const from = message.envelope?.from;
    const subject = message.envelope?.subject;
    const content = message.source?.toString();

    const state = `Ho ricevuto una mail da ${from}, l'oggetto è ${subject} e il contenuto è ${content}`;

    const request: JevRequest = {
        state,
        model: 'jev-latest',
        questions: {
            email_label: {
                type: 'choice',
                instructions: 'Che tipo di email è?',
                criteria: {
                    payment: "La mail descrive un pagamento effettuato o da effettuare",
                    shipment: "La mail descrive una spedizione confermata o un aggiornamento per una spedizione",
                    private_message: "La mail è un messaggio privato di qualcuno",
                    support: "La mail è la risposta a una richiesta di supporto",
                    alert: "Un avviso che richiede la mia attenzione",
                    health: "Una mail che riguarda risposte di medici, referti inviati e messaggi da ospedali/dottori",
                    other: "Altro"
                }
            },
            is_urgent: {
                type: 'noul',
                instructions: 'La mail è urgente e necessita di un intervento immediato o potrebbero esserci problemi?'
            }
        }
    };

    const response = await ask(request);

    if (!response.answers) {
        return;
    }

    const labelAnswer = (response.answers['email_label'] as JevChoiceAnswer);
    const urgentAnswer = (response.answers['is_urgent'] as JevNoulAnswer);

    const labelRaw = labelAnswer.choice.replaceAll('_', ' ');
    const label = labelRaw[0].toUpperCase() + labelRaw.slice(1);

    console.log('Etichetta email:', label);

    await addLabel(client, message, label);

    if (urgentAnswer.noul > 0.5) {
        console.log('URGENTE');
        await addLabel(client, message, 'Urgente');
    }

    return { label, urgent: urgentAnswer.noul > 0.5 };
}