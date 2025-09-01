export type Question = {
  id: number
  subject: string
  chapter: string
  stem: string
  options: string[]
  correct_index: number
  difficulty?: number
  explanation?: {
    text: string
  }
  topic?: string
  language?: string
  source?: string
}