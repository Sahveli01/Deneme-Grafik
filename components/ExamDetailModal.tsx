'use client'

import { Exam } from '@/types/database'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExamDetailModalProps {
  exam: Exam | null
  isOpen: boolean
  onClose: () => void
}

export default function ExamDetailModal({ exam, isOpen, onClose }: ExamDetailModalProps) {
  if (!isOpen || !exam) return null

  const calculateNet = (correct: number | null | undefined, incorrect: number | null | undefined): number => {
    const correctNum = correct ?? 0
    const incorrectNum = incorrect ?? 0
    return correctNum - (incorrectNum / 4)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-slate-950 border border-white/10 shadow-2xl rounded-2xl w-full max-w-md pointer-events-auto modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-100">{exam.exam_name}</h2>
              <p className="text-sm text-slate-400 mt-1">{formatDate(exam.created_at)}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {exam.exam_type === 'TYT' ? (
              <>
                {/* Total Net */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-200">Toplam Net</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                      {exam.total_net.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Main Subjects */}
                <div className="space-y-4">
                  {/* Turkish */}
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-semibold text-slate-200">🇹🇷 Türkçe</span>
                      <span className="text-lg font-bold text-orange-400">{exam.turkish_net.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Social */}
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-semibold text-slate-200">📚 Sosyal</span>
                      <span className="text-lg font-bold text-purple-400">{exam.social_net.toFixed(2)}</span>
                    </div>
                    {(exam.history_correct !== null && exam.history_correct !== undefined) ||
                     (exam.geography_correct !== null && exam.geography_correct !== undefined) ||
                     (exam.philosophy_correct !== null && exam.philosophy_correct !== undefined) ||
                     (exam.religion_correct !== null && exam.religion_correct !== undefined) ? (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2 w-full">
                        {exam.history_correct !== null && exam.history_correct !== undefined && (
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>📜</span>
                              <span className="text-sm text-slate-300">Tarih</span>
                            </div>
                            <span className="font-bold text-slate-200">
                              {calculateNet(exam.history_correct, exam.history_incorrect).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {exam.geography_correct !== null && exam.geography_correct !== undefined && (
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>🌍</span>
                              <span className="text-sm text-slate-300">Coğrafya</span>
                            </div>
                            <span className="font-bold text-slate-200">
                              {calculateNet(exam.geography_correct, exam.geography_incorrect).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {exam.philosophy_correct !== null && exam.philosophy_correct !== undefined && (
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>🧠</span>
                              <span className="text-sm text-slate-300">Felsefe</span>
                            </div>
                            <span className="font-bold text-slate-200">
                              {calculateNet(exam.philosophy_correct, exam.philosophy_incorrect).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {exam.religion_correct !== null && exam.religion_correct !== undefined && (
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>🕌</span>
                              <span className="text-sm text-slate-300">Din</span>
                            </div>
                            <span className="font-bold text-slate-200">
                              {calculateNet(exam.religion_correct, exam.religion_incorrect).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Math */}
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-slate-200">🔢 Matematik</span>
                      <span className="text-lg font-bold text-blue-400">{exam.math_net.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Science */}
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-semibold text-slate-200">🔬 Fen</span>
                      <span className="text-lg font-bold text-emerald-400">{exam.science_net.toFixed(2)}</span>
                    </div>
                    {(exam.physics_correct !== null && exam.physics_correct !== undefined) ||
                     (exam.chemistry_correct !== null && exam.chemistry_correct !== undefined) ||
                     (exam.biology_correct !== null && exam.biology_correct !== undefined) ? (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2 w-full">
                        {exam.physics_correct !== null && exam.physics_correct !== undefined && (
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>⚛️</span>
                              <span className="text-sm text-slate-300">Fizik</span>
                            </div>
                            <span className="font-bold text-slate-200">
                              {calculateNet(exam.physics_correct, exam.physics_incorrect).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {exam.chemistry_correct !== null && exam.chemistry_correct !== undefined && (
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>🧪</span>
                              <span className="text-sm text-slate-300">Kimya</span>
                            </div>
                            <span className="font-bold text-slate-200">
                              {calculateNet(exam.chemistry_correct, exam.chemistry_incorrect).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {exam.biology_correct !== null && exam.biology_correct !== undefined && (
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>🧬</span>
                              <span className="text-sm text-slate-300">Biyoloji</span>
                            </div>
                            <span className="font-bold text-slate-200">
                              {calculateNet(exam.biology_correct, exam.biology_incorrect).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : exam.exam_type === 'BRANCH' && exam.branch_name === 'Social' ? (
              <>
                {/* Social Branch */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-slate-200">Sosyal Net</span>
                    <span className="text-2xl font-bold text-purple-400">{exam.social_net.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/10 w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>📜</span>
                        <span className="text-sm text-slate-300">Tarih</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {calculateNet(exam.history_correct, exam.history_incorrect).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>🌍</span>
                        <span className="text-sm text-slate-300">Coğrafya</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {calculateNet(exam.geography_correct, exam.geography_incorrect).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>🧠</span>
                        <span className="text-sm text-slate-300">Felsefe</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {calculateNet(exam.philosophy_correct, exam.philosophy_incorrect).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>🕌</span>
                        <span className="text-sm text-slate-300">Din</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {calculateNet(exam.religion_correct, exam.religion_incorrect).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : exam.exam_type === 'BRANCH' && exam.branch_name === 'Science' ? (
              <>
                {/* Science Branch */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-slate-200">Fen Net</span>
                    <span className="text-2xl font-bold text-emerald-400">{exam.science_net.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/10 w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>⚛️</span>
                        <span className="text-sm text-slate-300">Fizik</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {calculateNet(exam.physics_correct, exam.physics_incorrect).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>🧪</span>
                        <span className="text-sm text-slate-300">Kimya</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {calculateNet(exam.chemistry_correct, exam.chemistry_incorrect).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>🧬</span>
                        <span className="text-sm text-slate-300">Biyoloji</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {calculateNet(exam.biology_correct, exam.biology_incorrect).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : exam.exam_type === 'BRANCH' && exam.branch_name === 'Turkish' ? (
              <>
                {/* Turkish Branch */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-200">Türkçe Net</span>
                    <span className="text-2xl font-bold text-orange-400">{exam.turkish_net.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : exam.exam_type === 'BRANCH' && exam.branch_name === 'Math' ? (
              <>
                {/* Math Branch */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-200">Matematik Net</span>
                    <span className="text-2xl font-bold text-blue-400">{exam.math_net.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 flex justify-end">
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white shadow-lg shadow-indigo-500/30"
            >
              Kapat
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

