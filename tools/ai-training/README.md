# On-device AI: what it is and how to train it

**Model:** Gemma 3 270M (instruction-tuned), Q8_0 GGUF, **278 MB**, opt-in download, runs fully on the phone via llama.rn.
**Its one job:** read a question and pick a label (24 of them: your numbers + 16 money-guide topics). It never writes the answer.
**Answers:** numbers come from the local database; explanations come from `src/services/knowledge/financeKnowledge.ts` (reviewed text).

## Why not train it on scraped internet finance text
A 270M model that reads US-stock and filing data would sound more "financial" and still state wrong facts with confidence,
about Indian money, to people deciding what to do with it. Training it to *route* questions is small, measurable and safe.
Knowledge improves by adding reviewed topics, not by hoping the model remembers.

## Steps (no Mac required)
1. `python3 tools/ai-training/make_dataset.py` -> `data/train.jsonl`, `data/eval.jsonl` (labels and prompt are read from the app code).
2. Open Google Colab (free T4), run `train_colab.py` cell by cell. It prints held-out accuracy (baseline: 53% keyword-only) and exports a GGUF.
3. Upload the GGUF to your Hugging Face repo, then set `url` and exact `bytes` in `src/services/llm/modelConfig.ts`.
4. Ship only if held-out accuracy beats the baseline and the tuned model never returns a label outside the list.

## Make it better over time
- Add a topic: add it to `financeKnowledge.ts`, add seed phrasings in `make_dataset.py`, regenerate, retrain.
- Real questions people ask (only with consent) are the best new training data; today everything is synthetic.
- Keep prompt and dataset in sync: `__tests__/services/intentTraining.test.ts` fails if they drift.
