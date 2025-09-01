import { Question } from '@/types/questions'

export const demoQuestions: Question[] = [
  // Physics Questions
  {
    id: 1,
    subject: 'Physics',
    chapter: 'Mechanics',
    topic: 'Newton\'s Laws',
    stem: 'A body of mass 5 kg moves with an acceleration of 2 m/s². What is the net force acting on it?',
    options: ['5 N', '10 N', '15 N', '20 N'],
    correct_index: 1,
    difficulty: 2,
    explanation: { text: 'Using Newton\'s second law: F = ma = 5 kg × 2 m/s² = 10 N' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 2,
    subject: 'Physics',
    chapter: 'Thermodynamics',
    topic: 'Heat Transfer',
    stem: 'Which process involves heat transfer through electromagnetic waves?',
    options: ['Conduction', 'Convection', 'Radiation', 'Evaporation'],
    correct_index: 2,
    difficulty: 1,
    explanation: { text: 'Radiation is the transfer of heat through electromagnetic waves without requiring a medium.' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 3,
    subject: 'Physics',
    chapter: 'Optics',
    topic: 'Reflection',
    stem: 'The angle of incidence for a light ray hitting a mirror is 30°. What is the angle of reflection?',
    options: ['15°', '30°', '45°', '60°'],
    correct_index: 1,
    difficulty: 1,
    explanation: { text: 'According to the law of reflection, the angle of incidence equals the angle of reflection.' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 4,
    subject: 'Physics',
    chapter: 'Electricity',
    topic: 'Ohm\'s Law',
    stem: 'A resistor of 10 Ω carries a current of 2 A. What is the voltage across it?',
    options: ['5 V', '12 V', '20 V', '25 V'],
    correct_index: 2,
    difficulty: 2,
    explanation: { text: 'Using Ohm\'s law: V = IR = 2 A × 10 Ω = 20 V' },
    language: 'English',
    source: 'Demo'
  },
  // Chemistry Questions
  {
    id: 5,
    subject: 'Chemistry',
    chapter: 'Organic Chemistry',
    topic: 'Hydrocarbons',
    stem: 'What is the molecular formula of methane?',
    options: ['CH₂', 'CH₃', 'CH₄', 'C₂H₄'],
    correct_index: 2,
    difficulty: 1,
    explanation: { text: 'Methane is the simplest hydrocarbon with one carbon atom bonded to four hydrogen atoms: CH₄' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 6,
    subject: 'Chemistry',
    chapter: 'Inorganic Chemistry',
    topic: 'Periodic Table',
    stem: 'Which element has the atomic number 6?',
    options: ['Boron', 'Carbon', 'Nitrogen', 'Oxygen'],
    correct_index: 1,
    difficulty: 1,
    explanation: { text: 'Carbon has 6 protons, giving it an atomic number of 6.' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 7,
    subject: 'Chemistry',
    chapter: 'Physical Chemistry',
    topic: 'Chemical Bonding',
    stem: 'What type of bond is formed between sodium and chlorine in NaCl?',
    options: ['Covalent', 'Ionic', 'Metallic', 'Hydrogen'],
    correct_index: 1,
    difficulty: 2,
    explanation: { text: 'Sodium loses an electron to chlorine, forming Na⁺ and Cl⁻ ions held together by electrostatic forces (ionic bond).' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 8,
    subject: 'Chemistry',
    chapter: 'Biochemistry',
    topic: 'Biomolecules',
    stem: 'Which of the following is NOT a macronutrient?',
    options: ['Carbohydrates', 'Proteins', 'Vitamins', 'Fats'],
    correct_index: 2,
    difficulty: 3,
    explanation: { text: 'Vitamins are micronutrients needed in small amounts. Carbohydrates, proteins, and fats are macronutrients needed in larger amounts.' },
    language: 'English',
    source: 'Demo'
  },
  // Biology Questions
  {
    id: 9,
    subject: 'Biology',
    chapter: 'Cell Biology',
    topic: 'Cell Structure',
    stem: 'Which organelle is known as the powerhouse of the cell?',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus'],
    correct_index: 2,
    difficulty: 1,
    explanation: { text: 'Mitochondria produce ATP through cellular respiration, providing energy for cellular activities.' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 10,
    subject: 'Biology',
    chapter: 'Genetics',
    topic: 'DNA',
    stem: 'What does DNA stand for?',
    options: ['Deoxyribonucleic Acid', 'Dinitrogen Acid', 'Deoxy Nitric Acid', 'Double Nucleic Acid'],
    correct_index: 0,
    difficulty: 1,
    explanation: { text: 'DNA stands for Deoxyribonucleic Acid, the molecule that carries genetic information.' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 11,
    subject: 'Biology',
    chapter: 'Evolution',
    topic: 'Natural Selection',
    stem: 'Who proposed the theory of evolution by natural selection?',
    options: ['Gregor Mendel', 'Charles Darwin', 'Louis Pasteur', 'Alexander Fleming'],
    correct_index: 1,
    difficulty: 2,
    explanation: { text: 'Charles Darwin proposed the theory of evolution by natural selection in his book "On the Origin of Species" (1859).' },
    language: 'English',
    source: 'Demo'
  },
  {
    id: 12,
    subject: 'Biology',
    chapter: 'Ecology',
    topic: 'Ecosystems',
    stem: 'What is the primary source of energy for most ecosystems?',
    options: ['Wind', 'Water', 'Sun', 'Soil'],
    correct_index: 2,
    difficulty: 1,
    explanation: { text: 'The sun provides energy for photosynthesis, which forms the base of most food chains in ecosystems.' },
    language: 'English',
    source: 'Demo'
  }
]

// Demo data helper functions
export function demoSubjects(): string[] {
  const subjects = Array.from(new Set(demoQuestions.map(q => q.subject)))
  return subjects.sort()
}

export function demoChapters(subjects: string[]): string[] {
  const filteredQuestions = subjects.length > 0 
    ? demoQuestions.filter(q => subjects.includes(q.subject))
    : demoQuestions
  
  const chapters = Array.from(new Set(filteredQuestions.map(q => q.chapter)))
  return chapters.sort()
}

export function demoQuestionIds(filters: {
  subjects?: string[]
  chapters?: string[]
  difficulty?: [number, number]
  limit: number
}): number[] {
  let filtered = demoQuestions
  
  if (filters.subjects?.length) {
    filtered = filtered.filter(q => filters.subjects!.includes(q.subject))
  }
  
  if (filters.chapters?.length) {
    filtered = filtered.filter(q => filters.chapters!.includes(q.chapter))
  }
  
  if (filters.difficulty) {
    const [min, max] = filters.difficulty
    filtered = filtered.filter(q => {
      const diff = q.difficulty ?? 3
      return diff >= min && diff <= max
    })
  }
  
  // Shuffle and take limit
  const shuffled = [...filtered].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, filters.limit).map(q => q.id)
}

export function demoQuestionsByIds(ids: number[]): Question[] {
  const map = new Map(demoQuestions.map(q => [q.id, q]))
  return ids.map(id => map.get(id)).filter(Boolean) as Question[]
}