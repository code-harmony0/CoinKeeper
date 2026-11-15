# %% [markdown]
# Fine-tune Gemma 3 270M as CoinKeeper's question router. Free Colab T4 is enough; no Mac needed.
# Based on Unsloth's official Gemma 3 270M notebook (unslothai/notebooks). If an API below differs from
# the current notebook, the official notebook wins; the data and prompt format are what matter.
#
# 1) Colab: Runtime > Change runtime type > T4 GPU.
# 2) Upload tools/ai-training/data/train.jsonl and eval.jsonl (left sidebar > Files).
# 3) Run the cells in order. Download the .gguf from the Files panel at the end.

# %%
!pip install -q unsloth

# %%
from unsloth import FastModel
import json, torch
from datasets import Dataset
from trl import SFTTrainer, SFTConfig

model, tokenizer = FastModel.from_pretrained(
    "unsloth/gemma-3-270m-it", max_seq_length=1024, load_in_4bit=False, full_finetuning=False
)
model = FastModel.get_peft_model(
    model, r=16, lora_alpha=16, lora_dropout=0, bias="none", random_state=7,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
)

# %%
def load(path):
    rows = [json.loads(l) for l in open(path)]
    # The app sends prompt then expects the JSON completion; train on exactly that.
    return Dataset.from_list([{"text": r["prompt"] + " " + r["completion"] + tokenizer.eos_token} for r in rows])

train_ds, eval_ds = load("train.jsonl"), load("eval.jsonl")

trainer = SFTTrainer(
    model=model, tokenizer=tokenizer, train_dataset=train_ds, eval_dataset=eval_ds,
    args=SFTConfig(
        dataset_text_field="text", per_device_train_batch_size=16, gradient_accumulation_steps=1,
        num_train_epochs=2, learning_rate=2e-4, lr_scheduler_type="linear", warmup_steps=10,
        logging_steps=10, eval_strategy="epoch", seed=7, report_to="none",
    ),
)
trainer.train()

# %% [markdown]
# Quick check: the router must answer with ONLY a label JSON for unseen phrasings.

# %%
import re
labels = [json.loads(l) for l in open("eval.jsonl")]
FastModel.for_inference(model)
ok = 0
for r in labels:
    ids = tokenizer(r["prompt"], return_tensors="pt").to("cuda")
    out = model.generate(**ids, max_new_tokens=24, do_sample=False)
    text = tokenizer.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True)
    m = re.search(r'"intent"\s*:\s*"(\w+)"', text)
    ok += bool(m and m.group(1) == r["label"])
print(f"held-out accuracy: {ok}/{len(labels)} = {ok/len(labels):.0%}  (keyword-only baseline in the app: 53%)")

# %% [markdown]
# Export a phone-ready GGUF. Q8_0 matches what the app already downloads (about the same ~280 MB).

# %%
model.save_pretrained_gguf("coinkeeper-router", tokenizer, quantization_method="q8_0")
# Download coinkeeper-router/*.gguf, upload it to a Hugging Face repo you control,
# then update src/services/llm/modelConfig.ts (url + exact bytes) and ship.
