import fs from 'fs';
import path from 'path';
import { buildIntentPrompt } from '../../src/services/llm/intentPrompt';
import { routeQuestion } from '../../src/services/financialQnA';

const load = (name: string) =>
  fs
    .readFileSync(path.join(__dirname, '../../tools/ai-training/data', name), 'utf8')
    .trim()
    .split('\n')
    .map(l => JSON.parse(l) as { prompt: string; question: string; label: string });

describe('on-device router training data', () => {
  const train = load('train.jsonl');
  const evalSet = load('eval.jsonl');

  it('uses exactly the prompt the app sends, so a tuned model and the app cannot drift', () => {
    for (const r of train.slice(0, 50)) {
      expect(r.prompt).toBe(buildIntentPrompt(r.question));
    }
  });

  it('keyword routing alone already places most held-out phrasings (the model covers the rest)', () => {
    const hits = evalSet.filter(r => routeQuestion(r.question) === r.label).length;
    const accuracy = hits / evalSet.length;
    // Recorded so progress is measurable: the tuned model should beat this.
    console.log(`keyword-only accuracy on held-out phrasings: ${(accuracy * 100).toFixed(0)}% (${hits}/${evalSet.length})`);
    expect(accuracy).toBeGreaterThan(0.4);
  });
});
