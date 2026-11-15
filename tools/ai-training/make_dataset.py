#!/usr/bin/env python3
"""
Builds the fine-tuning set for the on-device question router.

The model's only job is to read a question and pick ONE label (see
src/services/llm/intentPrompt.ts). It never writes an answer, so the training
data is questions -> label, not finance essays. That is why a 270M model can be
made reliable at it, and why no scraped internet text is needed: scraped text
would teach it to sound confident about facts it cannot know.

Run:  python3 tools/ai-training/make_dataset.py
Out:  tools/ai-training/data/train.jsonl, eval.jsonl
"""
import json, random, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
random.seed(7)

# ---- labels come straight from the app so they can never drift -------------
qna = (ROOT / "src/services/financialQnA.ts").read_text()
intents = re.search(r"INTENT_NAMES: Intent\[\] = \[(.*?)\]", qna, re.S).group(1)
INTENTS = re.findall(r"'(\w+)'", intents)
TOPICS = re.findall(r"id: '(\w+)'", (ROOT / "src/services/knowledge/financeKnowledge.ts").read_text())
LABELS = INTENTS + TOPICS


def prompt(q: str) -> str:  # mirrors buildIntentPrompt() exactly
    return (
        "Pick the label that best matches the question about personal money. Reply with JSON only.\n\n"
        f"Labels: {', '.join(LABELS)}\n\n"
        f"Question: {q[:200]}\nJSON:"
    )


# ---- seed phrasings: English, Hinglish, short and chatty ---------------------
SEEDS = {
    "expenses": ["how much did I spend", "what did I spend this month", "my total expenses", "kitna kharcha hua", "mera kharcha kitna hua is mahine",
                 "money going out", "how much have I spent so far", "spending this month", "show my expenses", "what is my spending habit"],
    "income": ["how much did I earn", "what is my income", "how much came in this month", "salary received", "kitna paisa aaya", "total money received",
               "what was my salary", "income this month", "mera income kitna hai"],
    "affordability": ["can I afford a new phone", "is it safe to spend 5000", "how much can I spend today", "can I buy a laptop", "kya main ye khareed sakta hu",
                      "should I buy this", "how much is safe to spend", "do I have room to spend", "can i spend 2000 on shoes"],
    "bills": ["what bills are due", "any bills pending", "upcoming payments", "which bills are unpaid", "bills kab due hai", "do I owe anything",
              "rent due when", "what do I need to pay soon", "show my bills"],
    "balance": ["what is my balance", "how much money do I have", "money in my account", "total balance", "mere paas kitna paisa hai", "account balance",
                "how much do I have in total"],
    "categories": ["where did my money go", "biggest spending category", "what do I spend most on", "top expenses", "sabse zyada kharcha kahan hua",
                   "which category costs the most", "break down my spending", "where does my money go"],
    "advice": ["how can I improve", "tips to save money", "how do I save more", "advice on my spending", "kaise bachat karu", "help me reduce expenses",
               "how can I budget better", "what should I change", "any suggestions to save"],
    "greeting": ["hi", "hey", "hello", "hey there", "good morning", "thanks", "thank you", "namaste", "hii", "yo"],
    "budget_50_30_20": ["what is the 50/30/20 rule", "how should I split my income", "explain the budget rule", "budget kaise banaye", "how to make a budget",
                        "how much should I save from salary", "50 30 20 kya hai"],
    "emergency_fund": ["what is an emergency fund", "how big should my emergency fund be", "how much emergency savings do I need", "rainy day fund",
                       "emergency fund kitna hona chahiye", "why do I need emergency money"],
    "sip_basics": ["what is a SIP", "explain sip", "how does sip work", "sip kya hai", "monthly investing in mutual funds", "should I start a sip",
                   "systematic investment plan meaning"],
    "mutual_fund_vs_fd": ["mutual fund or fixed deposit", "fd vs mutual fund", "which is better fd or mutual fund", "difference between mutual fund and fd",
                          "is fd safer than mutual funds", "mutual fund kya hota hai"],
    "emi_loans": ["what is an emi", "how does emi work", "explain loan emi", "how much emi is okay", "emi kya hota hai", "should I take a loan",
                  "how is loan interest calculated", "emi vs full payment"],
    "credit_score": ["what is a credit score", "how to improve cibil score", "what is cibil", "why is my credit score low", "credit score kaise badhaye",
                     "how is credit score calculated"],
    "upi_safety": ["is upi safe", "someone asked for my upi pin", "how to avoid upi scams", "got a collect request what to do", "upi fraud kaise bache",
                   "i got a fake payment link", "qr code scam"],
    "chit_funds": ["what is a chit fund", "how do chits work", "are chit funds safe", "explain chit", "chit fund kya hota hai", "how does kuri work",
                   "should I join a chit"],
    "insurance_basics": ["do I need insurance", "what is term insurance", "health insurance basics", "explain life cover", "insurance kya hota hai",
                         "which insurance should I take", "is insurance an investment"],
    "inflation": ["what is inflation", "why are prices rising", "how does inflation affect savings", "mehngai kya hai", "does inflation reduce my money"],
    "saving_vs_investing": ["saving vs investing", "should I save or invest", "difference between saving and investing", "save or invest first",
                            "bachat aur investment mein fark"],
    "debt_payoff": ["how to pay off debt", "clear credit card debt", "which loan to repay first", "how do I become debt free", "debt kaise chukau",
                    "repay loans faster"],
    "compounding": ["what is compounding", "explain compound interest", "power of compounding", "how does compound interest work", "compounding kya hai"],
    "tax_basics": ["how to save tax", "what is 80c", "tax saving tips", "income tax basics", "tax kaise bachaye", "how to file itr"],
    "net_worth": ["what is net worth", "how to calculate net worth", "explain networth", "what am I worth", "net worth kya hota hai"],
    "impulse_spending": ["how to stop impulse buying", "i overspend what to do", "how to control spending", "spend less tips", "kharcha kam kaise kare",
                         "stop wasting money", "i keep overspending"],
    "gold_basics": ["is gold a good investment", "should I buy gold", "gold vs stocks", "sone mein invest karu kya", "what is gold etf", "sovereign gold bond kya hai",
                    "how much gold should I hold"],
    "rent_vs_buy": ["should I rent or buy a house", "rent vs buy", "is buying a home worth it", "ghar kharidna chahiye ya rent", "buy a house or keep renting",
                    "when to buy a home"],
    "epf_ppf": ["what is epf", "what is ppf", "explain provident fund", "epf vs ppf", "pf kya hota hai", "how does ppf work", "can I withdraw my pf"],
    "retirement_basics": ["how to plan for retirement", "when should I start saving for retirement", "what is nps", "retirement planning basics", "pension kaise banaye",
                          "how much to save for retirement"],
    "credit_card_use": ["how to use a credit card", "what happens if I pay only the minimum due", "credit card tips", "should I get a credit card", "card ka bill kaise bhare",
                        "how does credit card interest work"],
    "stock_basics": ["what is the stock market", "how do stocks work", "should I invest in stocks", "share market kya hai", "what is nifty", "what are shares"],
    "goal_saving": ["how to save for a goal", "saving for a trip", "how to save for a new phone", "plan savings for wedding", "goal ke liye paise kaise bachaye",
                    "how much monthly to save for a goal"],
    "subscriptions": ["how to cut subscriptions", "too many subscriptions", "should I cancel netflix", "reduce ott costs", "subscription kaise band kare",
                      "audit my subscriptions"],
    "why_track": ["why should I track expenses", "why track spending", "benefit of tracking money", "is tracking expenses worth it", "kharcha track kyun kare"],
}

FILLERS = ["", "", "", "please ", "tell me ", "hey, ", "quick question: ", "bro ", "ok so ", "can you tell me "]
ENDS = ["", "", "?", "?", " pls", " please", " ?", "."]


def typo(s: str) -> str:
    """Realistic fat-finger noise: swap, drop or double a letter."""
    if len(s) < 6 or random.random() > 0.4:
        return s
    i = random.randrange(1, len(s) - 2)
    kind = random.choice(["swap", "drop", "dup"])
    if kind == "swap":
        return s[:i] + s[i + 1] + s[i] + s[i + 2:]
    if kind == "drop":
        return s[:i] + s[i + 1:]
    return s[:i] + s[i] + s[i:]


def variants(seed: str):
    q = random.choice(FILLERS) + seed + random.choice(ENDS)
    q = typo(q)
    r = random.random()
    return q.upper() if r < 0.05 else (q.capitalize() if r < 0.5 else q)


def row(q, label):
    return {"prompt": prompt(q), "completion": json.dumps({"intent": label}), "label": label, "question": q}


train, evalset = [], []
for label in LABELS:
    seeds = SEEDS[label]
    random.shuffle(seeds)
    hold = max(1, len(seeds) // 4)  # whole phrasings held out, so eval is honest
    for sd in seeds[hold:]:
        for _ in range(14):
            train.append(row(variants(sd), label))
    for sd in seeds[:hold]:
        for _ in range(3):
            evalset.append(row(variants(sd), label))

random.shuffle(train)
out = pathlib.Path(__file__).parent / "data"
out.mkdir(exist_ok=True)
for name, rows in (("train", train), ("eval", evalset)):
    with open(out / f"{name}.jsonl", "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
print(f"{len(LABELS)} labels | train {len(train)} | eval {len(evalset)} (held-out phrasings)")
