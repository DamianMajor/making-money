export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  hint: string;
  category: 'dcw' | 'debt' | 'ledger' | 'extra_credit';
  multiSelect?: boolean;
}

export const ALL_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'What does the "double coincidence of wants" mean in barter?',
    options: [
      "Both people must want what the other person has at the same time",
      "Both people must use the same currency",
      "Both people must live in the same town",
      "Both people must trade the same amount"
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
      "Chickens are too hard to carry",
      "You can't make an equal trade",
      "The trade can't happen because they don't want what you have",
      "Chickens are not valuable"
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
      "It makes people work less",
      "It helps people trade without needing perfect matching wants",
      "It makes everything free",
      "It makes food taste better"
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
      "A gift with no strings",
      "A debt (they owe you)",
      "A new kind of money",
      "A law"
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
      "When you forget something",
      "When someone owes you something later",
      "When something is expensive",
      "When you borrow a tool forever"
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
      "People can forget or argue about what happened",
      "Debt disappears after one day",
      "Only rich people can remember",
      "It's illegal to remember debts"
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
      "A type of coin",
      "A record or list of who owes what to who",
      "A bank building",
      "A way to cook food"
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
      "Because ledgers are always wrong",
      "Because they might want more power or money",
      "Because everyone wants to cheat",
      "Because the ledger is too heavy to carry"
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
      "Private means everyone has a copy, shared means only one person has it",
      "Private means one person controls it, shared means many people can see and verify it",
      "Private means it's on paper, shared means it's digital",
      "Private means it's free, shared means it costs money"
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
      "Because nobody can check it",
      "Because one person can change it whenever they want",
      "Because many people can verify it, so it's harder to cheat",
      "Because it makes people richer automatically"
    ],
    correct: 2,
    explanation: "When many people can see and verify the records, it's much harder for anyone to cheat. The Stone Tablet works because everyone in the village can see it!",
    hint: "What makes the Stone Tablet in the village center trustworthy?",
    category: 'ledger'
  },
  {
    id: 11,
    question: "EXTRA CREDIT: What does 'centralized' mean when talking about record-keeping?",
    options: [
      "Everyone keeps their own copy of the records",
      "One person or group controls all the records",
      "Records are kept in the center of town",
      "Nobody keeps any records"
    ],
    correct: 1,
    explanation: "Centralized means one person or group is in charge of all the records. Like if only the Elder kept the Stone Tablet locked away!",
    hint: "Think about ONE person being in control of everything...",
    category: 'extra_credit'
  },
  {
    id: 12,
    question: "EXTRA CREDIT: What does 'decentralized' mean?",
    options: [
      "Only one person makes decisions",
      "No one is allowed to keep records",
      "Many people share control and can verify the records",
      "Records are destroyed every day"
    ],
    correct: 2,
    explanation: "Decentralized means no single person is in charge. Many people share the responsibility of keeping and checking the records!",
    hint: "Think about MANY people sharing the work instead of just one...",
    category: 'extra_credit'
  },
  {
    id: 13,
    question: "EXTRA CREDIT: Why might a centralized system be risky?",
    options: [
      "Because it has too many people checking the records",
      "Because the one person in charge could make mistakes or cheat",
      "Because everyone has a copy",
      "Because it's too slow"
    ],
    correct: 1,
    explanation: "When one person or group controls everything, there's no one else to catch mistakes or stop cheating. That's the risk of centralization!",
    hint: "What could go wrong if only ONE person has all the power?",
    category: 'extra_credit'
  },
  {
    id: 14,
    question: "EXTRA CREDIT: The Stone Tablet in the village center is more like which system?",
    options: [
      "Centralized - only the Elder can see it",
      "Decentralized - everyone in the village can see and verify it",
      "Neither - it's just a rock",
      "Centralized - only one person can write on it"
    ],
    correct: 1,
    explanation: "The Stone Tablet sits in the village center where EVERYONE can see it and verify the records. That makes it more decentralized and trustworthy!",
    hint: "Where is the Stone Tablet, and who can look at it?",
    category: 'extra_credit'
  },
  {
    id: 15,
    question: "EXTRA CREDIT: What is one advantage of a decentralized system over a centralized one?",
    options: [
      "It's easier for one person to change the records secretly",
      "It doesn't need any records at all",
      "It's harder to cheat because many people are watching",
      "Only experts can understand it"
    ],
    correct: 2,
    explanation: "When many people can see and check the records, it becomes very hard for anyone to cheat without getting caught. That's the power of decentralization!",
    hint: "Think about what happens when MANY eyes are watching the records...",
    category: 'extra_credit'
  },
  {
    id: 16,
    question: "What happened when the villagers tried to trade using just verbal promises?",
    options: [
      "Everyone was happy and trades went smoothly",
      "People forgot or disagreed about what was promised",
      "The village elder banned all trading",
      "They invented coins right away"
    ],
    correct: 1,
    explanation: "Without written records, people forgot what they promised or remembered differently. This led to arguments and broken trust!",
    hint: "Think about what happened in the village when promises were only spoken...",
    category: 'debt'
  },
  {
    id: 17,
    question: "Why did the villagers carve agreements into a stone tablet instead of just remembering them?",
    options: [
      "They liked the sound of chiseling",
      "Written records can't be forgotten or easily disputed",
      "The elder needed something to do",
      "Stones are prettier than paper"
    ],
    correct: 1,
    explanation: "Carving agreements into stone creates a permanent record that everyone can see and nobody can deny. It solves the problem of forgetful or dishonest promises!",
    hint: "What's the advantage of writing something down versus just remembering it?",
    category: 'ledger'
  },
  {
    id: 18,
    question: "In the village, what makes the Stone Tablet work as a fair system?",
    options: [
      "Only the elder can read it",
      "It's placed where everyone can see it and verify the records",
      "It's very heavy so no one can steal it",
      "It's made of expensive stone"
    ],
    correct: 1,
    explanation: "The Stone Tablet works because it's in a public place where any villager can check the records. Transparency builds trust!",
    hint: "Think about where the Stone Tablet is placed and who can look at it...",
    category: 'ledger'
  },
  {
    id: 19,
    question: "What is the main reason barter systems eventually led people to invent money?",
    options: [
      "People got bored of trading",
      "Barter required too many perfect matches between traders",
      "Kings wanted to collect taxes",
      "Animals couldn't be traded"
    ],
    correct: 1,
    explanation: "Barter was slow and difficult because you always needed someone who wanted exactly what you had. Money solved this by being universally accepted!",
    hint: "Think about the biggest frustration with barter...",
    category: 'dcw'
  },
  {
    id: 20,
    question: "If the fisherman owes the woodcutter 5 logs worth of fish, who keeps track of that agreement?",
    options: [
      "Nobody - they just hope everyone remembers",
      "The agreement is carved into the Stone Tablet for everyone to see",
      "Only the fisherman writes it down secretly",
      "They flip a coin to decide"
    ],
    correct: 1,
    explanation: "The Stone Tablet records debts publicly so both parties and the whole village can verify what was agreed. No more 'I forgot!'",
    hint: "What tool did the village create to solve the problem of forgotten promises?",
    category: 'ledger'
  }
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleOptions(question: QuizQuestion): QuizQuestion {
  const indices = question.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const newOptions = indices.map(i => question.options[i]);
  const newCorrect = indices.indexOf(question.correct);
  return { ...question, options: newOptions, correct: newCorrect };
}

export function getDJQuizQuestions(playCount: number = 1): QuizQuestion[] {
  if (playCount <= 1) {
    const dcwQuestions = ALL_QUESTIONS.filter(q => q.category === 'dcw');
    const debtQuestions = ALL_QUESTIONS.filter(q => q.category === 'debt');
    const picked: QuizQuestion[] = [];
    const shuffledDcw = shuffleArray(dcwQuestions);
    const shuffledDebt = shuffleArray(debtQuestions);
    picked.push(shuffledDcw[0]);
    picked.push(shuffledDebt[0]);
    return picked.map(shuffleOptions);
  } else {
    const ledgerQuestions = ALL_QUESTIONS.filter(q => q.category === 'ledger');
    const dcwDebtQuestions = ALL_QUESTIONS.filter(q => q.category === 'dcw' || q.category === 'debt');
    const picked: QuizQuestion[] = [];
    const shuffledLedger = shuffleArray(ledgerQuestions);
    const shuffledMixed = shuffleArray(dcwDebtQuestions);
    picked.push(shuffledLedger[0]);
    picked.push(shuffledMixed[0]);
    return picked.map(shuffleOptions);
  }
}

export function getBackupDJQuestion(usedIds: number[]): QuizQuestion | null {
  const pool = ALL_QUESTIONS.filter(q => (q.category === 'dcw' || q.category === 'debt') && !usedIds.includes(q.id));
  if (pool.length === 0) return null;
  return shuffleOptions(pool[Math.floor(Math.random() * pool.length)]);
}

export function getNPCBonusQuestion(npcType: 'fisherman' | 'woodcutter', usedIds: number[] = []): QuizQuestion | null {
  let pool: QuizQuestion[];
  if (npcType === 'fisherman') {
    pool = ALL_QUESTIONS.filter(q => q.category === 'dcw' && !usedIds.includes(q.id));
  } else {
    pool = ALL_QUESTIONS.filter(q => (q.category === 'ledger' || q.category === 'debt') && !usedIds.includes(q.id));
  }
  if (pool.length === 0) return null;
  return shuffleOptions(pool[Math.floor(Math.random() * pool.length)]);
}

export function getFinalQuizQuestions(playCount: number = 1): QuizQuestion[] {
  const picked: QuizQuestion[] = [];
  
  const dcwQuestions = shuffleArray(ALL_QUESTIONS.filter(q => q.category === 'dcw'));
  const debtQuestions = shuffleArray(ALL_QUESTIONS.filter(q => q.category === 'debt'));
  let ledgerQuestions = ALL_QUESTIONS.filter(q => q.category === 'ledger');
  
  if (playCount <= 1) {
    ledgerQuestions = ledgerQuestions.filter(q => q.id !== 8 && q.id !== 9 && q.id !== 10);
  }
  ledgerQuestions = shuffleArray(ledgerQuestions);
  
  const extraCreditQuestions = shuffleArray(ALL_QUESTIONS.filter(q => q.category === 'extra_credit'));
  
  picked.push(dcwQuestions[0]);
  picked.push(debtQuestions[0]);
  picked.push(ledgerQuestions[0]);
  if (ledgerQuestions.length > 1) {
    picked.push(ledgerQuestions[1]);
  }
  picked.push(extraCreditQuestions[0]);
  
  return picked.map(shuffleOptions);
}
