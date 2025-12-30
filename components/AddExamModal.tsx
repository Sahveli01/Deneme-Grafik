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
import { Plus, Calculator } from 'lucide-react'
import { toast } from 'sonner'

interface AddExamModalProps {
  onExamAdded: () => void
}

interface SubjectData {
  correct: string
  incorrect: string
}

export default function AddExamModal({ onExamAdded }: AddExamModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    exam_name: '',
    turkish: { correct: '', incorrect: '' } as SubjectData,
    social: { correct: '', incorrect: '' } as SubjectData,
    math: { correct: '', incorrect: '' } as SubjectData,
    science: { correct: '', incorrect: '' } as SubjectData,
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
    return {
      turkish: calculateNet(formData.turkish.correct, formData.turkish.incorrect),
      social: calculateNet(formData.social.correct, formData.social.incorrect),
      math: calculateNet(formData.math.correct, formData.math.incorrect),
      science: calculateNet(formData.science.correct, formData.science.incorrect),
    }
  }, [formData])

  const totalNet = useMemo(() => {
    return nets.turkish + nets.social + nets.math + nets.science
  }, [nets])

  const handleSubjectChange = (
    subject: 'turkish' | 'social' | 'math' | 'science',
    field: 'correct' | 'incorrect',
    value: string
  ) => {
    setFormData({
      ...formData,
      [subject]: {
        ...formData[subject],
        [field]: value,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Deneme eklemek için giriş yapmalısınız')
        return
      }

      const { error } = await supabase
        .from('exams')
        .insert({
          exam_name: formData.exam_name,
          turkish_net: nets.turkish,
          social_net: nets.social,
          math_net: nets.math,
          science_net: nets.science,
          total_net: totalNet,
          user_id: user.id,
        })

      if (error) throw error

      toast.success('Deneme başarıyla eklendi!')
      setOpen(false)
      setFormData({
        exam_name: '',
        turkish: { correct: '', incorrect: '' },
        social: { correct: '', incorrect: '' },
        math: { correct: '', incorrect: '' },
        science: { correct: '', incorrect: '' },
      })
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
  }: {
    label: string
    subject: 'turkish' | 'social' | 'math' | 'science'
    color: string
  }) => {
    const net = nets[subject]
    const correct = formData[subject].correct
    const incorrect = formData[subject].incorrect

    return (
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <Label className="text-base font-semibold" style={{ color }}>
          {label}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${subject}-correct`} className="text-sm text-muted-foreground">
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
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${subject}-incorrect`} className="text-sm text-muted-foreground">
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
              required
              disabled={loading}
            />
          </div>
        </div>
        {(correct || incorrect) && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {correct || 0} Doğru, {incorrect || 0} Yanlış
              </span>
              <span className="ml-auto font-bold text-lg" style={{ color }}>
                → {net.toFixed(2)} Net
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md">
          <Plus className="h-4 w-4" />
          Deneme Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Yeni Deneme Ekle</DialogTitle>
          <DialogDescription>
            Her ders için doğru ve yanlış cevapları girin. Net skorlar otomatik olarak hesaplanacaktır.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="exam_name" className="text-base font-semibold">Deneme Adı</Label>
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

            <SubjectInput label="Türkçe" subject="turkish" color="#f97316" />
            <SubjectInput label="Sosyal" subject="social" color="#8b5cf6" />
            <SubjectInput label="Matematik" subject="math" color="#3b82f6" />
            <SubjectInput label="Fen" subject="science" color="#10b981" />

            {totalNet > 0 && (
              <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-primary">Toplam Net Skor</span>
                  <span className="text-2xl font-bold text-primary">{totalNet.toFixed(2)}</span>
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
