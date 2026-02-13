export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  hint: string;
  category: 'dcw' | 'debt' | 'ledger';
}

export const ALL_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'What does the "double coincidence of wants" mean in barter?',
    options: [
      "A: Both people must want the same thing at the same time",
      "B: Both people must use the same currency",
      "C: Both people must live in the same town",
      "D: Both people must trade the same amount"
    ],
    correct: 0,
    explanation: "In barter, both people need to want what the other has - at the same time. This is called a 'double coincidence of wants.'",
    hint: "Think about what both traders need to have for a swap to work...",
    category: 'dcw'
  },
  {
    id: 2,
    question: "Why is barter hard if you have chickens but the other person doesn't want chickens?",
    options: [
      "A: Chickens are too hard to carry",
      "B: You can't make an equal trade",
      "C: The trade can't happen because they don't want what you have",
      "D: Chickens are not valuable"
    ],
    correct: 2,
    explanation: "If the other person doesn't want what you're offering, the trade simply can't happen - no matter how valuable your item is.",
    hint: "What happens when someone doesn't want what you're offering?",
    category: 'dcw'
  },
  {
    id: 3,
    question: "What is one big problem that money solves that barter can't solve easily?",
    options: [
      "A: It makes people work less",
      "B: It helps people trade without needing perfect matching wants",
      "C: It makes everything free",
      "D: It makes food taste better"
    ],
    correct: 1,
    explanation: "Money lets you trade with anyone, even if they don't want what you have right now. You don't need a perfect match!",
    hint: "Think about what made trading so difficult in the village...",
    category: 'dcw'
  },
  {
    id: 4,
    question: "If you give someone food today and they promise to help you later, what has been created?",
    options: [
      "A: A gift with no strings",
      "B: A debt (they owe you)",
      "C: A new kind of money",
      "D: A law"
    ],
    correct: 1,
    explanation: "When someone promises to pay you back later, that creates a debt - they owe you something in return.",
    hint: "What do we call it when someone owes you something?",
    category: 'debt'
  },
  {
    id: 5,
    question: 'In simple words, what does "debt" mean?',
    options: [
      "A: When you forget something",
      "B: When someone owes you something later",
      "C: When something is expensive",
      "D: When you borrow a tool forever"
    ],
    correct: 1,
    explanation: "Debt simply means someone owes something to someone else. It's a promise to pay back later.",
    hint: "It's about owing something to someone...",
    category: 'debt'
  },
  {
    id: 6,
    question: "Why can it be hard to keep track of debts just by memory?",
    options: [
      "A: People can forget or argue about what happened",
      "B: Debt disappears after one day",
      "C: Only rich people can remember",
      "D: It's illegal to remember debts"
    ],
    correct: 0,
    explanation: "When debts only exist in people's heads, they can honestly forget or remember things differently - leading to arguments!",
    hint: "What went wrong when the villagers tried to remember their promises?",
    category: 'debt'
  },
  {
    id: 7,
    question: "What is a ledger?",
    options: [
      "A: A type of coin",
      "B: A record or list of who owes what to who",
      "C: A bank building",
      "D: A way to cook food"
    ],
    correct: 1,
    explanation: "A ledger is simply a record that keeps track of who owes what to whom. The Stone Tablet in the village is a ledger!",
    hint: "Think about what the Stone Tablet does in the village...",
    category: 'ledger'
  },
  {
    id: 8,
    question: "Why might a person who owns a private ledger try to cheat or change the records?",
    options: [
      "A: Because ledgers are always wrong",
      "B: Because they might want more power or money",
      "C: Because everyone wants to cheat",
      "D: Because the ledger is too heavy to carry"
    ],
    correct: 1,
    explanation: "When only one person controls the records, they could change them for their own benefit. That's why private ledgers need trust.",
    hint: "What could go wrong if only ONE person keeps the records?",
    category: 'ledger'
  },
  {
    id: 9,
    question: "What is the difference between a private ledger and a shared ledger?",
    options: [
      "A: Private means everyone has a copy, shared means only one person has it",
      "B: Private means one person controls it, shared means many people can see and verify it",
      "C: Private means it's on paper, shared means it's digital",
      "D: Private means it's free, shared means it costs money"
    ],
    correct: 1,
    explanation: "A private ledger is controlled by one person, while a shared ledger lets many people see and check the records - making it harder to cheat.",
    hint: "Think about who gets to see and check the records...",
    category: 'ledger'
  },
  {
    id: 10,
    question: "Why is a shared ledger usually more fair or trustworthy than a private one?",
    options: [
      "A: Because nobody can check it",
      "B: Because one person can change it whenever they want",
      "C: Because many people can verify it, so it's harder to cheat",
      "D: Because it makes people richer automatically"
    ],
    correct: 2,
    explanation: "When many people can see and verify the records, it's much harder for anyone to cheat. The Stone Tablet works because everyone in the village can see it!",
    hint: "What makes the Stone Tablet in the village center trustworthy?",
    category: 'ledger'
  }
];

export function getDJQuizQuestions(): QuizQuestion[] {
  const dcwQuestions = ALL_QUESTIONS.filter(q => q.category === 'dcw');
  const debtQuestions = ALL_QUESTIONS.filter(q => q.category === 'debt');
  const picked: QuizQuestion[] = [];
  picked.push(dcwQuestions[Math.floor(Math.random() * dcwQuestions.length)]);
  let debtQ = debtQuestions[Math.floor(Math.random() * debtQuestions.length)];
  picked.push(debtQ);
  return picked;
}

export function getBackupDJQuestion(usedIds: number[]): QuizQuestion | null {
  const pool = ALL_QUESTIONS.filter(q => (q.category === 'dcw' || q.category === 'debt') && !usedIds.includes(q.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getFinalQuizQuestions(): QuizQuestion[] {
  const ledgerQuestions = ALL_QUESTIONS.filter(q => q.category === 'ledger');
  return ledgerQuestions;
}