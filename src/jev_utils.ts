import 'dotenv/config';

const KEY = process.env.JEVKEY ?? '';

export type JevQuestionType = 'score' | 'choice' | 'noul';

interface JevQuestion {
    type: JevQuestionType;
    instructions: string;
    criteria?: string[] | { [key: string]: string };
}

export interface JevRequest {
  state: string;
  model: string;
  questions: { [key: string]: JevQuestion };
}

export interface JevNoulAnswer {
    type: 'noul';
    noul: number;
}

export interface JevChoiceAnswer {
    type: 'choice';
    choice: string;
    probabilities: { [key: string]: number };
    confidence: number;
}

export interface JevScoreAnswer {
    type: 'score';
    score: number;
    legend: { [key: number]: string };
    probabilities: { [key: string]: number };
    confidence: number;
}

export interface JevResponse {
  model: string;
  answers: { [key: string]: JevNoulAnswer | JevChoiceAnswer | JevScoreAnswer };
  usage: { input_tokens: number; output_tokens: 20; };
}

export async function ask(request: JevRequest): Promise<JevResponse> {
    return fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
    })
    .catch(err => {
        throw new Error(`HTTP ${err.status}: ${err.message}`);
    })
    .then(res => res.json());
}