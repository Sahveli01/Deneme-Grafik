'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calculator, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { ExamType, BranchName } from '@/types/database'

interface AddExamModalProps {
  onExamAdded: () => void
}

interface SubjectData {
  correct: string
  incorrect: string
}

interface SubSubjectData {
  correct: string
  incorrect: string
  label: string
}

export default function AddExamModal({ onExamAdded }: AddExamModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [examType, setExamType] = useState<ExamType>('TYT')
  const [branchName, setBranchName] = useState<BranchName | ''>('')
  const [showSocialBreakdown, setShowSocialBreakdown] = useState(false)
  const [showScienceBreakdown, setShowScienceBreakdown] = useState(false)
  
  const [formData, setFormData] = useState({
    exam_name: '',
    turkish: { correct: '', incorrect: '' } as SubjectData,
    social: { correct: '', incorrect: '' } as SubjectData,
    math: { correct: '', incorrect: '' } as SubjectData,
    science: { correct: '', incorrect: '' } as SubjectData,
    // Sub-subjects for Social
    history: { correct: '', incorrect: '' } as SubjectData,
    geography: { correct: '', incorrect: '' } as SubjectData,
    philosophy: { correct: '', incorrect: '' } as SubjectData,
    religion: { correct: '', incorrect: '' } as SubjectData,
    // Sub-subjects for Science
    physics: { correct: '', incorrect: '' } as SubjectData,
    chemistry: { correct: '', incorrect: '' } as SubjectData,
    biology: { correct: '', incorrect: '' } as SubjectData,
  })

  const supabase = createClient()

  // Calculate Net: Net = Correct - (Incorrect / 4)
  const calculateNet = (correct: string, incorrect: string): number => {
    const correctNum = parseFloat(correct) || 0
    const incorrectNum = parseFloat(incorrect) || 0
    return correctNum - (incorrectNum / 4)
  }

  // Calculate all nets using useMemo for performance
  const nets = useMemo(() => {
    const turkishNet = calculateNet(formData.turkish.correct, formData.turkish.incorrect)
    const mathNet = calculateNet(formData.math.correct, formData.math.incorrect)
    
    // Calculate Social Net
    let socialNet = 0
    // For BRANCH Social exams OR TYT with sub-subject data: calculate from sub-subjects
    if ((examType === 'BRANCH' && branchName === 'Social') || 
        (examType === 'TYT' && (formData.history.correct || formData.history.incorrect || 
         formData.geography.correct || formData.geography.incorrect ||
         formData.philosophy.correct || formData.philosophy.incorrect ||
         formData.religion.correct || formData.religion.incorrect))) {
      socialNet = 
        calculateNet(formData.history.correct, formData.history.incorrect) +
        calculateNet(formData.geography.correct, formData.geography.incorrect) +
        calculateNet(formData.philosophy.correct, formData.philosophy.incorrect) +
        calculateNet(formData.religion.correct, formData.religion.incorrect)
    } else {
      // Use main input (only for TYT when sub-subjects not provided)
      socialNet = calculateNet(formData.social.correct, formData.social.incorrect)
    }
    
    // Calculate Science Net
    let scienceNet = 0
    // For BRANCH Science exams OR TYT with sub-subject data: calculate from sub-subjects
    if ((examType === 'BRANCH' && branchName === 'Science') ||
        (examType === 'TYT' && (formData.physics.correct || formData.physics.incorrect ||
         formData.chemistry.correct || formData.chemistry.incorrect ||
         formData.biology.correct || formData.biology.incorrect))) {
      scienceNet =
        calculateNet(formData.physics.correct, formData.physics.incorrect) +
        calculateNet(formData.chemistry.correct, formData.chemistry.incorrect) +
        calculateNet(formData.biology.correct, formData.biology.incorrect)
    } else {
      // Use main input (only for TYT when sub-subjects not provided)
      scienceNet = calculateNet(formData.science.correct, formData.science.incorrect)
    }

    return {
      turkish: turkishNet,
      social: socialNet,
      math: mathNet,
      science: scienceNet,
    }
  }, [formData, examType, branchName])

  const totalNet = useMemo(() => {
    if (examType === 'BRANCH') {
      // For branch exams, return the net of the selected branch
      switch (branchName) {
        case 'Turkish':
          return nets.turkish
        case 'Social':
          return nets.social
        case 'Math':
          return nets.math
        case 'Science':
          return nets.science
        default:
          return 0
      }
    }
    return nets.turkish + nets.social + nets.math + nets.science
  }, [nets, examType, branchName])

  const handleSubjectChange = (
    subject: keyof typeof formData,
    field: 'correct' | 'incorrect',
    value: string
  ) => {
    setFormData({
      ...formData,
      [subject]: {
        ...(formData[subject] as SubjectData),
        [field]: value,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (examType === 'BRANCH' && !branchName) {
        toast.error('Lütfen bir ders seçin')
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Deneme eklemek için giriş yapmalısınız')
        return
      }

      const insertData: any = {
        exam_name: formData.exam_name,
        exam_type: examType,
        user_id: user.id,
      }

      if (examType === 'BRANCH') {
        insertData.branch_name = branchName
        // Only set the net for the selected branch
        switch (branchName) {
          case 'Turkish':
            insertData.turkish_net = nets.turkish
            insertData.social_net = 0
            insertData.math_net = 0
            insertData.science_net = 0
            insertData.total_net = nets.turkish
            break
          case 'Social':
            insertData.turkish_net = 0
            insertData.math_net = 0
            insertData.science_net = 0
            
            // Explicitly calculate Social net from sub-subjects
            const historyNet = calculateNet(formData.history.correct, formData.history.incorrect)
            const geographyNet = calculateNet(formData.geography.correct, formData.geography.incorrect)
            const philosophyNet = calculateNet(formData.philosophy.correct, formData.philosophy.incorrect)
            const religionNet = calculateNet(formData.religion.correct, formData.religion.incorrect)
            const totalSocial = historyNet + geographyNet + philosophyNet + religionNet
            
            insertData.social_net = totalSocial
            insertData.total_net = totalSocial
            
            // Save sub-subject data if entered
            if (formData.history.correct || formData.history.incorrect) {
              insertData.history_correct = parseInt(formData.history.correct) || 0
              insertData.history_incorrect = parseInt(formData.history.incorrect) || 0
            }
            if (formData.geography.correct || formData.geography.incorrect) {
              insertData.geography_correct = parseInt(formData.geography.correct) || 0
              insertData.geography_incorrect = parseInt(formData.geography.incorrect) || 0
            }
            if (formData.philosophy.correct || formData.philosophy.incorrect) {
              insertData.philosophy_correct = parseInt(formData.philosophy.correct) || 0
              insertData.philosophy_incorrect = parseInt(formData.philosophy.incorrect) || 0
            }
            if (formData.religion.correct || formData.religion.incorrect) {
              insertData.religion_correct = parseInt(formData.religion.correct) || 0
              insertData.religion_incorrect = parseInt(formData.religion.incorrect) || 0
            }
            break
          case 'Math':
            insertData.turkish_net = 0
            insertData.social_net = 0
            insertData.math_net = nets.math
            insertData.science_net = 0
            insertData.total_net = nets.math
            break
          case 'Science':
            insertData.turkish_net = 0
            insertData.social_net = 0
            insertData.math_net = 0
            
            // Explicitly calculate Science net from sub-subjects
            const physicsNet = calculateNet(formData.physics.correct, formData.physics.incorrect)
            const chemistryNet = calculateNet(formData.chemistry.correct, formData.chemistry.incorrect)
            const biologyNet = calculateNet(formData.biology.correct, formData.biology.incorrect)
            const totalScience = physicsNet + chemistryNet + biologyNet
            
            insertData.science_net = totalScience
            insertData.total_net = totalScience
            
            // Save sub-subject data if entered
            if (formData.physics.correct || formData.physics.incorrect) {
              insertData.physics_correct = parseInt(formData.physics.correct) || 0
              insertData.physics_incorrect = parseInt(formData.physics.incorrect) || 0
            }
            if (formData.chemistry.correct || formData.chemistry.incorrect) {
              insertData.chemistry_correct = parseInt(formData.chemistry.correct) || 0
              insertData.chemistry_incorrect = parseInt(formData.chemistry.incorrect) || 0
            }
            if (formData.biology.correct || formData.biology.incorrect) {
              insertData.biology_correct = parseInt(formData.biology.correct) || 0
              insertData.biology_incorrect = parseInt(formData.biology.incorrect) || 0
            }
            break
        }
      } else {
        // TYT exam - save all subjects
        insertData.branch_name = null
        insertData.turkish_net = nets.turkish
        insertData.social_net = nets.social
        insertData.math_net = nets.math
        insertData.science_net = nets.science
        insertData.total_net = totalNet
        
        // Save sub-subject data if entered
        if (formData.history.correct || formData.history.incorrect) {
          insertData.history_correct = parseInt(formData.history.correct) || null
          insertData.history_incorrect = parseInt(formData.history.incorrect) || null
        }
        if (formData.geography.correct || formData.geography.incorrect) {
          insertData.geography_correct = parseInt(formData.geography.correct) || null
          insertData.geography_incorrect = parseInt(formData.geography.incorrect) || null
        }
        if (formData.philosophy.correct || formData.philosophy.incorrect) {
          insertData.philosophy_correct = parseInt(formData.philosophy.correct) || null
          insertData.philosophy_incorrect = parseInt(formData.philosophy.incorrect) || null
        }
        if (formData.religion.correct || formData.religion.incorrect) {
          insertData.religion_correct = parseInt(formData.religion.correct) || null
          insertData.religion_incorrect = parseInt(formData.religion.incorrect) || null
        }
        if (formData.physics.correct || formData.physics.incorrect) {
          insertData.physics_correct = parseInt(formData.physics.correct) || null
          insertData.physics_incorrect = parseInt(formData.physics.incorrect) || null
        }
        if (formData.chemistry.correct || formData.chemistry.incorrect) {
          insertData.chemistry_correct = parseInt(formData.chemistry.correct) || null
          insertData.chemistry_incorrect = parseInt(formData.chemistry.incorrect) || null
        }
        if (formData.biology.correct || formData.biology.incorrect) {
          insertData.biology_correct = parseInt(formData.biology.correct) || null
          insertData.biology_incorrect = parseInt(formData.biology.incorrect) || null
        }
      }

      const { error } = await supabase
        .from('exams')
        .insert(insertData)

      if (error) throw error

      toast.success('Deneme başarıyla eklendi!')
      setOpen(false)
      // Reset form
      setFormData({
        exam_name: '',
        turkish: { correct: '', incorrect: '' },
        social: { correct: '', incorrect: '' },
        math: { correct: '', incorrect: '' },
        science: { correct: '', incorrect: '' },
        history: { correct: '', incorrect: '' },
        geography: { correct: '', incorrect: '' },
        philosophy: { correct: '', incorrect: '' },
        religion: { correct: '', incorrect: '' },
        physics: { correct: '', incorrect: '' },
        chemistry: { correct: '', incorrect: '' },
        biology: { correct: '', incorrect: '' },
      })
      setExamType('TYT')
      setBranchName('')
      setShowSocialBreakdown(false)
      setShowScienceBreakdown(false)
      onExamAdded()
    } catch (error: any) {
      toast.error('Deneme eklenirken hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const SubjectInput = ({
    label,
    subject,
    color,
    isRequired = false,
  }: {
    label: string
    subject: 'turkish' | 'social' | 'math' | 'science'
    color: string
    isRequired?: boolean
  }) => {
    const net = nets[subject]
    const correct = formData[subject].correct
    const incorrect = formData[subject].incorrect

    return (
      <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <Label className="text-base font-semibold text-slate-200" style={{ color }}>
          {label}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${subject}-correct`} className="text-sm text-slate-400">
              Doğru
            </Label>
            <Input
              id={`${subject}-correct`}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={correct}
              onChange={(e) => handleSubjectChange(subject, 'correct', e.target.value)}
              required={isRequired}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${subject}-incorrect`} className="text-sm text-slate-400">
              Yanlış
            </Label>
            <Input
              id={`${subject}-incorrect`}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={incorrect}
              onChange={(e) => handleSubjectChange(subject, 'incorrect', e.target.value)}
              required={isRequired}
              disabled={loading}
            />
          </div>
        </div>
        {(correct || incorrect) && (
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm">
              <Calculator className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">
                {correct || 0} Doğru, {incorrect || 0} Yanlış
              </span>
              <span className="ml-auto font-bold text-lg text-slate-100" style={{ color }}>
                → {net.toFixed(2)} Net
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const SubSubjectInput = ({
    label,
    subject,
    color,
  }: {
    label: string
    subject: 'history' | 'geography' | 'philosophy' | 'religion' | 'physics' | 'chemistry' | 'biology'
    color: string
  }) => {
    const net = calculateNet(formData[subject].correct, formData[subject].incorrect)
    const correct = formData[subject].correct
    const incorrect = formData[subject].incorrect

    return (
      <div className="space-y-2 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <Label className="text-sm font-semibold text-slate-200" style={{ color }}>
          {label}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`${subject}-correct`} className="text-xs text-slate-400">
              Doğru
            </Label>
            <Input
              id={`${subject}-correct`}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={correct}
              onChange={(e) => handleSubjectChange(subject, 'correct', e.target.value)}
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${subject}-incorrect`} className="text-xs text-slate-400">
              Yanlış
            </Label>
            <Input
              id={`${subject}-incorrect`}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={incorrect}
              onChange={(e) => handleSubjectChange(subject, 'incorrect', e.target.value)}
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>
        </div>
        {(correct || incorrect) && (
          <div className="text-xs text-slate-400">
            Net: <span className="font-semibold text-slate-200" style={{ color }}>{net.toFixed(2)}</span>
          </div>
        )}
      </div>
    )
  }

  const shouldShowSubject = (subject: 'turkish' | 'social' | 'math' | 'science'): boolean => {
    if (examType === 'TYT') return true
    if (examType === 'BRANCH') {
      const subjectMap: Record<string, BranchName> = {
        turkish: 'Turkish',
        social: 'Social',
        math: 'Math',
        science: 'Science',
      }
      return branchName === subjectMap[subject]
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md">
          <Plus className="h-4 w-4" />
          Deneme Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto glass rounded-3xl border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-bold text-slate-100">Yeni Deneme Ekle</DialogTitle>
          <DialogDescription className="text-slate-400">
            Her ders için doğru ve yanlış cevapları girin. Net skorlar otomatik olarak hesaplanacaktır.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Exam Type Selection */}
            <div className="grid gap-3">
              <Label className="text-base font-semibold text-slate-200">Deneme Türü</Label>
              <Tabs value={examType} onValueChange={(v) => {
                setExamType(v as ExamType)
                if (v === 'TYT') {
                  setBranchName('')
                }
              }}>
                <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1">
                  <TabsTrigger value="TYT" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white text-slate-300">
                    Tam TYT
                  </TabsTrigger>
                  <TabsTrigger value="BRANCH" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white text-slate-300">
                    Branş Denemesi
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Branch Selection (only for BRANCH type) */}
            {examType === 'BRANCH' && (
              <div className="grid gap-3">
                <Label className="text-base font-semibold text-slate-200">Ders Seçin</Label>
                <Tabs value={branchName} onValueChange={(v) => setBranchName(v as BranchName)}>
                  <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 p-1">
                    <TabsTrigger value="Turkish" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300">
                      Türkçe
                    </TabsTrigger>
                    <TabsTrigger value="Social" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
                      Sosyal
                    </TabsTrigger>
                    <TabsTrigger value="Math" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white text-slate-300">
                      Matematik
                    </TabsTrigger>
                    <TabsTrigger value="Science" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-slate-300">
                      Fen
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Exam Name */}
            <div className="grid gap-2">
              <Label htmlFor="exam_name" className="text-base font-semibold text-slate-200">Deneme Adı</Label>
              <Input
                id="exam_name"
                placeholder="Örn: 3D Yayınları Deneme 1"
                value={formData.exam_name}
                onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            {/* Subject Inputs - Only show when appropriate */}
            {examType === 'TYT' && (
              <>
                {/* TYT: Show all subjects with optional breakdowns */}
                {shouldShowSubject('turkish') && (
                  <SubjectInput label="Türkçe" subject="turkish" color="#f97316" isRequired={true} />
                )}

                {shouldShowSubject('social') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                      <Label className="text-base font-semibold text-slate-200" style={{ color: '#8b5cf6' }}>
                        Sosyal Bilimler
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSocialBreakdown(!showSocialBreakdown)}
                        className="gap-1"
                      >
                        {showSocialBreakdown ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Detayları Gizle
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Detaylı Giriş (Tarih, Coğrafya, Felsefe, Din)
                          </>
                        )}
                      </Button>
                    </div>
                    {!showSocialBreakdown && (
                      <SubjectInput label="Sosyal (Toplam)" subject="social" color="#8b5cf6" isRequired={true} />
                    )}
                    {showSocialBreakdown && (
                      <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <Label className="text-base font-semibold block mb-3 text-slate-200" style={{ color: '#8b5cf6' }}>
                          Sosyal Bilimler Detaylı Giriş
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <SubSubjectInput label="Tarih" subject="history" color="#8b5cf6" />
                          <SubSubjectInput label="Coğrafya" subject="geography" color="#8b5cf6" />
                          <SubSubjectInput label="Felsefe" subject="philosophy" color="#8b5cf6" />
                          <SubSubjectInput label="Din Kültürü" subject="religion" color="#8b5cf6" />
                        </div>
                        <div className="pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">Toplam Sosyal Net</span>
                            <span className="text-lg font-bold text-slate-100" style={{ color: '#8b5cf6' }}>
                              {nets.social.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {shouldShowSubject('math') && (
                  <SubjectInput label="Matematik" subject="math" color="#3b82f6" isRequired={true} />
                )}

                {shouldShowSubject('science') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                      <Label className="text-base font-semibold text-slate-200" style={{ color: '#10b981' }}>
                        Fen Bilimleri
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowScienceBreakdown(!showScienceBreakdown)}
                        className="gap-1"
                      >
                        {showScienceBreakdown ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Detayları Gizle
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Detaylı Giriş (Fizik, Kimya, Biyoloji)
                          </>
                        )}
                      </Button>
                    </div>
                    {!showScienceBreakdown && (
                      <SubjectInput label="Fen (Toplam)" subject="science" color="#10b981" isRequired={true} />
                    )}
                    {showScienceBreakdown && (
                      <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <Label className="text-base font-semibold block mb-3 text-slate-200" style={{ color: '#10b981' }}>
                          Fen Bilimleri Detaylı Giriş
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                          <SubSubjectInput label="Fizik" subject="physics" color="#10b981" />
                          <SubSubjectInput label="Kimya" subject="chemistry" color="#10b981" />
                          <SubSubjectInput label="Biyoloji" subject="biology" color="#10b981" />
                        </div>
                        <div className="pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">Toplam Fen Net</span>
                            <span className="text-lg font-bold text-slate-100" style={{ color: '#10b981' }}>
                              {nets.science.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* BRANCH: Show ONLY the selected branch subject */}
            {examType === 'BRANCH' && branchName === 'Turkish' && (
              <SubjectInput label="Türkçe" subject="turkish" color="#f97316" isRequired={true} />
            )}

            {examType === 'BRANCH' && branchName === 'Social' && (
              <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <Label className="text-base font-semibold block mb-3 text-slate-200" style={{ color: '#8b5cf6' }}>
                  Sosyal Bilimler
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <SubSubjectInput label="Tarih" subject="history" color="#8b5cf6" />
                  <SubSubjectInput label="Coğrafya" subject="geography" color="#8b5cf6" />
                  <SubSubjectInput label="Felsefe" subject="philosophy" color="#8b5cf6" />
                  <SubSubjectInput label="Din Kültürü" subject="religion" color="#8b5cf6" />
                </div>
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Toplam Sosyal Net</span>
                    <span className="text-lg font-bold text-slate-100" style={{ color: '#8b5cf6' }}>
                      {nets.social.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {examType === 'BRANCH' && branchName === 'Math' && (
              <SubjectInput label="Matematik" subject="math" color="#3b82f6" isRequired={true} />
            )}

            {examType === 'BRANCH' && branchName === 'Science' && (
              <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <Label className="text-base font-semibold block mb-3 text-slate-200" style={{ color: '#10b981' }}>
                  Fen Bilimleri
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <SubSubjectInput label="Fizik" subject="physics" color="#10b981" />
                  <SubSubjectInput label="Kimya" subject="chemistry" color="#10b981" />
                  <SubSubjectInput label="Biyoloji" subject="biology" color="#10b981" />
                </div>
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Toplam Fen Net</span>
                    <span className="text-lg font-bold text-slate-100" style={{ color: '#10b981' }}>
                      {nets.science.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {totalNet > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-200">
                    {examType === 'BRANCH' ? 'Branş Net Skor' : 'Toplam Net Skor'}
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{totalNet.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? 'Ekleniyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
