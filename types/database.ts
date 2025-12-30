export type ExamType = 'TYT' | 'BRANCH'
export type BranchName = 'Turkish' | 'Social' | 'Math' | 'Science'

export interface Exam {
  id: string
  created_at: string
  exam_name: string
  exam_type: ExamType
  branch_name?: BranchName | null
  turkish_net: number
  social_net: number
  math_net: number
  science_net: number
  total_net: number
  user_id: string
  // Sub-subject correct/incorrect counts
  history_correct?: number | null
  history_incorrect?: number | null
  geography_correct?: number | null
  geography_incorrect?: number | null
  philosophy_correct?: number | null
  philosophy_incorrect?: number | null
  religion_correct?: number | null
  religion_incorrect?: number | null
  physics_correct?: number | null
  physics_incorrect?: number | null
  chemistry_correct?: number | null
  chemistry_incorrect?: number | null
  biology_correct?: number | null
  biology_incorrect?: number | null
}

