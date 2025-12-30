'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import AddExamModal from './AddExamModal'
import ExamDetailModal from './ExamDetailModal'
import { Exam, BranchName } from '@/types/database'
import { LogOut, TrendingUp, Award, BookOpen, BarChart3, Calendar, Info } from 'lucide-react'
import { toast } from 'sonner'

type ChartView = 'total' | 'turkish' | 'social' | 'math' | 'science'
type ExamTypeFilter = 'TYT' | 'BRANCH'

export default function Dashboard() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [chartView, setChartView] = useState<ChartView>('total')
  const [examTypeFilter, setExamTypeFilter] = useState<ExamTypeFilter>('TYT')
  const [selectedBranch, setSelectedBranch] = useState<BranchName | ''>('')
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchExams()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
  }

  const fetchExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExams(data || [])
    } catch (error: any) {
      toast.error('Denemeler yüklenirken hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Filter exams based on exam type and branch - STRICT FILTERING
  const filteredExams = useMemo(() => {
    if (examTypeFilter === 'TYT') {
      // For TYT: Only show TYT exams
      return exams.filter(exam => exam.exam_type === 'TYT')
    } else {
      // For BRANCH: Only show branch exams matching the selected branch
      return exams.filter(exam => 
        exam.exam_type === 'BRANCH' && exam.branch_name === selectedBranch
      )
    }
  }, [exams, examTypeFilter, selectedBranch])

  // Calculate statistics based on filtered exams
  const stats = useMemo(() => {
    if (filteredExams.length === 0) {
      return {
        totalExams: 0,
        bestTotalNet: 0,
        averageTotalNet: 0,
        lastExamNet: 0,
        improvement: 0,
      }
    }

    const totalNets = filteredExams.map(e => e.total_net)
    const bestTotalNet = Math.max(...totalNets)
    const averageTotalNet = totalNets.reduce((a, b) => a + b, 0) / totalNets.length
    const lastExamNet = filteredExams[0].total_net
    const previousExamNet = filteredExams.length > 1 ? filteredExams[1].total_net : lastExamNet
    const improvement = lastExamNet - previousExamNet

    return {
      totalExams: filteredExams.length,
      bestTotalNet,
      averageTotalNet,
      lastExamNet,
      improvement,
    }
  }, [filteredExams])

  // Prepare chart data based on selected view
  const chartData = useMemo(() => {
    const reversed = filteredExams.slice().reverse()
    return reversed.map((exam, index) => {
      const date = new Date(exam.created_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })
      
      return {
        name: `Exam ${index + 1}`,
        date,
        total: exam.total_net,
        turkish: exam.turkish_net,
        social: exam.social_net,
        math: exam.math_net,
        science: exam.science_net,
        exam: exam, // Include full exam object for tooltip
      }
    })
  }, [filteredExams])

  // Get chart configuration based on view
  const getChartConfig = () => {
    const configs = {
      total: { dataKey: 'total', color: '#6366f1', gradientId: 'gradientTotal', name: 'Toplam Net', label: 'Toplam Net Skoru' },
      turkish: { dataKey: 'turkish', color: '#f97316', gradientId: 'gradientTurkish', name: 'Türkçe Net', label: 'Türkçe Net Skoru' },
      social: { dataKey: 'social', color: '#8b5cf6', gradientId: 'gradientSocial', name: 'Sosyal Net', label: 'Sosyal Bilimler Net Skoru' },
      math: { dataKey: 'math', color: '#3b82f6', gradientId: 'gradientMath', name: 'Matematik Net', label: 'Matematik Net Skoru' },
      science: { dataKey: 'science', color: '#10b981', gradientId: 'gradientScience', name: 'Fen Net', label: 'Fen Bilimleri Net Skoru' },
    }
    return configs[chartView]
  }

  const chartConfig = getChartConfig()
  
  // Get gradient color for branch charts
  const getBranchGradientId = () => {
    const gradients: Record<string, string> = {
      'Turkish': 'gradientBranchTurkish',
      'Social': 'gradientBranchSocial',
      'Math': 'gradientBranchMath',
      'Science': 'gradientBranchScience',
    }
    return gradients[selectedBranch] || 'gradientBranch'
  }

  // Get score color based on value
  const getScoreColor = (value: number, maxValue: number) => {
    const percentage = (value / maxValue) * 100
    if (percentage >= 80) return 'text-emerald-400 font-bold'
    if (percentage >= 60) return 'text-indigo-400 font-semibold'
    if (percentage >= 40) return 'text-amber-400'
    return 'text-slate-400'
  }

  // Calculate sub-subject net
  const calculateSubNet = (correct: number | null | undefined, incorrect: number | null | undefined): number => {
    const correctNum = correct || 0
    const incorrectNum = incorrect || 0
    return correctNum - (incorrectNum / 4)
  }

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null

    const data = payload[0].payload
    const exam: Exam = data.exam
    
    if (!exam) return null

    const calculateNet = (correct: number | null | undefined, incorrect: number | null | undefined): number => {
      const correctNum = correct ?? 0
      const incorrectNum = incorrect ?? 0
      return correctNum - (incorrectNum / 4)
    }

    // Condition A: Branch = 'Social'
    if (examTypeFilter === 'BRANCH' && selectedBranch === 'Social') {
      const historyNet = calculateNet(exam.history_correct, exam.history_incorrect)
      const geographyNet = calculateNet(exam.geography_correct, exam.geography_incorrect)
      const philosophyNet = calculateNet(exam.philosophy_correct, exam.philosophy_incorrect)
      const religionNet = calculateNet(exam.religion_correct, exam.religion_incorrect)
      const socialNet = exam.social_net

      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 mb-3">{label}</div>
          <div className="text-lg font-bold mb-3" style={{ color: '#8b5cf6' }}>
            Sosyal: {socialNet.toFixed(2)} Net
          </div>
          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>📜 Tarih</span>
              <span className="font-semibold">{historyNet.toFixed(2)}</span>
            </div>
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>🌍 Coğrafya</span>
              <span className="font-semibold">{geographyNet.toFixed(2)}</span>
            </div>
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>🧠 Felsefe</span>
              <span className="font-semibold">{philosophyNet.toFixed(2)}</span>
            </div>
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>🕌 Din</span>
              <span className="font-semibold">{religionNet.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )
    }

    // Condition B: Branch = 'Science'
    if (examTypeFilter === 'BRANCH' && selectedBranch === 'Science') {
      const physicsNet = calculateNet(exam.physics_correct, exam.physics_incorrect)
      const chemistryNet = calculateNet(exam.chemistry_correct, exam.chemistry_incorrect)
      const biologyNet = calculateNet(exam.biology_correct, exam.biology_incorrect)
      const scienceNet = exam.science_net

      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 mb-3">{label}</div>
          <div className="text-lg font-bold mb-3" style={{ color: '#10b981' }}>
            Fen: {scienceNet.toFixed(2)} Net
          </div>
          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>⚛️ Fizik</span>
              <span className="font-semibold">{physicsNet.toFixed(2)}</span>
            </div>
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>🧪 Kimya</span>
              <span className="font-semibold">{chemistryNet.toFixed(2)}</span>
            </div>
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>🧬 Biyoloji</span>
              <span className="font-semibold">{biologyNet.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )
    }

    // Condition C: Branch = 'Math' or 'Turkish'
    if (examTypeFilter === 'BRANCH' && (selectedBranch === 'Math' || selectedBranch === 'Turkish')) {
      const net = selectedBranch === 'Math' ? exam.math_net : exam.turkish_net
      const color = selectedBranch === 'Math' ? '#3b82f6' : '#f97316'
      const labelText = selectedBranch === 'Math' ? 'Matematik' : 'Türkçe'

      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 mb-3">{label}</div>
          <div className="text-lg font-bold" style={{ color }}>
            {labelText}: {net.toFixed(2)} Net
          </div>
        </div>
      )
    }

    // Condition D: TYT / General
    const hasSocialBreakdown = (exam.history_correct !== null && exam.history_correct !== undefined) ||
                               (exam.geography_correct !== null && exam.geography_correct !== undefined) ||
                               (exam.philosophy_correct !== null && exam.philosophy_correct !== undefined) ||
                               (exam.religion_correct !== null && exam.religion_correct !== undefined)
    
    const hasScienceBreakdown = (exam.physics_correct !== null && exam.physics_correct !== undefined) ||
                                (exam.chemistry_correct !== null && exam.chemistry_correct !== undefined) ||
                                (exam.biology_correct !== null && exam.biology_correct !== undefined)

    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-400 mb-3">{label}</div>
        <div className="text-lg font-bold mb-3 text-indigo-400">
          Toplam: {exam.total_net.toFixed(2)} Net
        </div>
        <div className="border-t border-white/10 pt-3 space-y-2">
          <div className="text-sm text-slate-300 flex items-center justify-between">
            <span>🇹🇷 Türkçe</span>
            <span className="font-semibold">{exam.turkish_net.toFixed(2)}</span>
          </div>
          {hasSocialBreakdown ? (
            <>
              <div className="text-sm text-slate-300 flex items-center justify-between">
                <span>📚 Sosyal</span>
                <span className="font-semibold">{exam.social_net.toFixed(2)}</span>
              </div>
              <div className="ml-4 space-y-1 mt-1">
                {exam.history_correct !== null && exam.history_correct !== undefined && (
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>📜 Tarih</span>
                    <span>{calculateNet(exam.history_correct, exam.history_incorrect).toFixed(2)}</span>
                  </div>
                )}
                {exam.geography_correct !== null && exam.geography_correct !== undefined && (
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>🌍 Coğrafya</span>
                    <span>{calculateNet(exam.geography_correct, exam.geography_incorrect).toFixed(2)}</span>
                  </div>
                )}
                {exam.philosophy_correct !== null && exam.philosophy_correct !== undefined && (
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>🧠 Felsefe</span>
                    <span>{calculateNet(exam.philosophy_correct, exam.philosophy_incorrect).toFixed(2)}</span>
                  </div>
                )}
                {exam.religion_correct !== null && exam.religion_correct !== undefined && (
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>🕌 Din</span>
                    <span>{calculateNet(exam.religion_correct, exam.religion_incorrect).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>📚 Sosyal</span>
              <span className="font-semibold">{exam.social_net.toFixed(2)}</span>
            </div>
          )}
          <div className="text-sm text-slate-300 flex items-center justify-between">
            <span>🔢 Matematik</span>
            <span className="font-semibold">{exam.math_net.toFixed(2)}</span>
          </div>
          {hasScienceBreakdown ? (
            <>
              <div className="text-sm text-slate-300 flex items-center justify-between">
                <span>🔬 Fen</span>
                <span className="font-semibold">{exam.science_net.toFixed(2)}</span>
              </div>
              <div className="ml-4 space-y-1 mt-1">
                {exam.physics_correct !== null && exam.physics_correct !== undefined && (
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>⚛️ Fizik</span>
                    <span>{calculateNet(exam.physics_correct, exam.physics_incorrect).toFixed(2)}</span>
                  </div>
                )}
                {exam.chemistry_correct !== null && exam.chemistry_correct !== undefined && (
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>🧪 Kimya</span>
                    <span>{calculateNet(exam.chemistry_correct, exam.chemistry_incorrect).toFixed(2)}</span>
                  </div>
                )}
                {exam.biology_correct !== null && exam.biology_correct !== undefined && (
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>🧬 Biyoloji</span>
                    <span>{calculateNet(exam.biology_correct, exam.biology_incorrect).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-300 flex items-center justify-between">
              <span>🔬 Fen</span>
              <span className="font-semibold">{exam.science_net.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Get social breakdown text
  const getSocialBreakdown = (exam: Exam): string => {
    const parts: string[] = []
    if (exam.history_correct !== null && exam.history_correct !== undefined) {
      const net = calculateSubNet(exam.history_correct, exam.history_incorrect)
      parts.push(`Tar: ${net.toFixed(2)}`)
    }
    if (exam.geography_correct !== null && exam.geography_correct !== undefined) {
      const net = calculateSubNet(exam.geography_correct, exam.geography_incorrect)
      parts.push(`Coğ: ${net.toFixed(2)}`)
    }
    if (exam.philosophy_correct !== null && exam.philosophy_correct !== undefined) {
      const net = calculateSubNet(exam.philosophy_correct, exam.philosophy_incorrect)
      parts.push(`Fel: ${net.toFixed(2)}`)
    }
    if (exam.religion_correct !== null && exam.religion_correct !== undefined) {
      const net = calculateSubNet(exam.religion_correct, exam.religion_incorrect)
      parts.push(`Din: ${net.toFixed(2)}`)
    }
    return parts.length > 0 ? parts.join(', ') : ''
  }

  // Get science breakdown text
  const getScienceBreakdown = (exam: Exam): string => {
    const parts: string[] = []
    if (exam.physics_correct !== null && exam.physics_correct !== undefined) {
      const net = calculateSubNet(exam.physics_correct, exam.physics_incorrect)
      parts.push(`Fiz: ${net.toFixed(2)}`)
    }
    if (exam.chemistry_correct !== null && exam.chemistry_correct !== undefined) {
      const net = calculateSubNet(exam.chemistry_correct, exam.chemistry_incorrect)
      parts.push(`Kim: ${net.toFixed(2)}`)
    }
    if (exam.biology_correct !== null && exam.biology_correct !== undefined) {
      const net = calculateSubNet(exam.biology_correct, exam.biology_incorrect)
      parts.push(`Bio: ${net.toFixed(2)}`)
    }
    return parts.length > 0 ? parts.join(', ') : ''
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-lg font-medium text-slate-400">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-100 tracking-tight">TYT Net Takip</h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tekrar hoş geldiniz, <span className="font-medium text-slate-200">{user?.email}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <AddExamModal onExamAdded={fetchExams} />
            <Button onClick={handleLogout} variant="outline" className="gap-2 shadow-sm">
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </Button>
          </div>
        </div>

        {/* Main Filter: TYT vs Branch */}
        <Card className="glass rounded-3xl shadow-xl shadow-black/30">
          <CardContent className="pt-6">
              <Tabs 
                value={examTypeFilter} 
                onValueChange={(v) => {
                  const newFilter = v as ExamTypeFilter
                  setExamTypeFilter(newFilter)
                  // When switching to BRANCH, default to first branch (Turkish)
                  if (newFilter === 'BRANCH') {
                    setSelectedBranch('Turkish')
                  } else {
                    setSelectedBranch('')
                  }
                  setChartView('total')
                }}
              >
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1">
                <TabsTrigger value="TYT" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white text-slate-300">
                  TYT Denemeleri
                </TabsTrigger>
                <TabsTrigger value="BRANCH" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white text-slate-300">
                  Branş Denemeleri
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Branch Tabs (only for BRANCH filter) */}
            {examTypeFilter === 'BRANCH' && (
              <div className="mt-4">
                <Tabs 
                  value={selectedBranch} 
                  onValueChange={(v) => {
                    setSelectedBranch(v as BranchName)
                    setChartView('total')
                  }}
                >
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
          </CardContent>
        </Card>

        {/* Stats Cards - Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass rounded-3xl shadow-xl shadow-black/30 glass-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium text-slate-400">Toplam Deneme</CardDescription>
                <BookOpen className="h-5 w-5 text-indigo-400" />
              </div>
              <CardTitle className="text-3xl font-bold pt-2 text-slate-100">{stats.totalExams}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="glass rounded-3xl shadow-xl shadow-black/30 glass-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium text-slate-400">
                  {examTypeFilter === 'BRANCH' ? 'En Yüksek Branş Net' : 'En Yüksek Net'}
                </CardDescription>
                <Award className="h-5 w-5 text-violet-400" />
              </div>
              <CardTitle className="text-3xl font-bold pt-2 text-slate-100">{stats.bestTotalNet.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="glass rounded-3xl shadow-xl shadow-black/30 glass-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium text-slate-400">
                  {examTypeFilter === 'BRANCH' ? 'Ortalama Branş Net' : 'Ortalama Net'}
                </CardDescription>
                <BarChart3 className="h-5 w-5 text-indigo-400" />
              </div>
              <CardTitle className="text-3xl font-bold pt-2 text-slate-100">{stats.averageTotalNet.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="glass rounded-3xl shadow-xl shadow-black/30 glass-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium text-slate-400">
                  {examTypeFilter === 'BRANCH' ? 'Son Deneme Branş Net' : 'Son Deneme Net'}
                </CardDescription>
                <TrendingUp className="h-5 w-5 text-violet-400" />
              </div>
              <CardTitle className="text-3xl font-bold pt-2 text-slate-100">{stats.lastExamNet.toFixed(2)}</CardTitle>
              {stats.improvement !== 0 && (
                <div className="pt-1">
                  <Badge variant={stats.improvement > 0 ? 'default' : 'destructive'} className="text-xs">
                    {stats.improvement > 0 ? '+' : ''}{stats.improvement.toFixed(2)} öncekinden
                  </Badge>
                </div>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* Chart with Tabs */}
        {filteredExams.length > 0 && (
          <Card className="glass rounded-3xl shadow-xl shadow-black/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-serif font-bold text-slate-100">Performans Analizi</CardTitle>
              <CardDescription className="text-slate-400">Farklı derslerdeki ilerlemenizi takip edin</CardDescription>
            </CardHeader>
            <CardContent>
              {examTypeFilter === 'TYT' ? (
              <Tabs value={chartView} onValueChange={(v) => setChartView(v as ChartView)} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-6 bg-white/5 border border-white/10 p-1">
                    <TabsTrigger value="total" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white text-slate-300">
                    Toplam
                  </TabsTrigger>
                    <TabsTrigger value="turkish" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300">
                    Türkçe
                  </TabsTrigger>
                    <TabsTrigger value="social" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
                    Sosyal
                  </TabsTrigger>
                    <TabsTrigger value="math" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white text-slate-300">
                    Matematik
                  </TabsTrigger>
                    <TabsTrigger value="science" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-slate-300">
                    Fen
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={chartView} className="mt-0">
                  <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                          <linearGradient id={chartConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                          stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                          tick={{ fill: '#94a3b8' }}
                      />
                      <YAxis 
                          stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                          tick={{ fill: '#94a3b8' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                        <Area 
                        type="monotone" 
                        dataKey={chartConfig.dataKey} 
                        stroke={chartConfig.color} 
                        strokeWidth={3}
                          fill={`url(#${chartConfig.gradientId})`}
                        name={chartConfig.name}
                          style={{ filter: `drop-shadow(0 0 8px ${chartConfig.color}60)` }}
                          dot={{ fill: chartConfig.color, r: 4 }}
                          activeDot={{ r: 6 }}
                      />
                      {stats.averageTotalNet > 0 && chartView === 'total' && (
                        <ReferenceLine 
                          y={stats.averageTotalNet} 
                            stroke="#64748b" 
                          strokeDasharray="5 5"
                            label={{ value: 'Ortalama', position: 'right', fill: '#64748b' }}
                        />
                      )}
                      </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id={getBranchGradientId()} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke={chartConfig.color}
                      strokeWidth={3}
                      fill={`url(#${getBranchGradientId()})`}
                      name={
                        selectedBranch === 'Turkish' ? 'Türkçe Net' :
                        selectedBranch === 'Social' ? 'Sosyal Net' :
                        selectedBranch === 'Math' ? 'Matematik Net' :
                        selectedBranch === 'Science' ? 'Fen Net' : 'Branş Net'
                      }
                      style={{ filter: `drop-shadow(0 0 8px ${chartConfig.color}60)` }}
                      dot={{ fill: chartConfig.color, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    {stats.averageTotalNet > 0 && (
                      <ReferenceLine 
                        y={stats.averageTotalNet} 
                        stroke="#64748b" 
                        strokeDasharray="5 5"
                        label={{ value: 'Ortalama', position: 'right', fill: '#64748b' }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {examTypeFilter === 'BRANCH' ? 'Branş Deneme Geçmişi' : 'Deneme Geçmişi'}
            </CardTitle>
            <CardDescription>Tüm deneme skorlarınızın detaylı dökümü</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredExams.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-slate-500" />
                <p className="text-lg font-medium text-slate-300">Henüz deneme yok</p>
                <p className="text-sm mt-2 text-slate-400">Başlamak için ilk denemenizi ekleyin!</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/5 border-b border-white/10">
                      <TableHead className="font-semibold text-slate-300">Tarih</TableHead>
                      <TableHead className="font-semibold text-slate-300">Deneme Adı</TableHead>
                      {examTypeFilter === 'TYT' && (
                        <>
                          <TableHead className="font-semibold text-orange-400">Türkçe</TableHead>
                          <TableHead className="font-semibold text-purple-400">Sosyal</TableHead>
                          <TableHead className="font-semibold text-blue-400">Matematik</TableHead>
                          <TableHead className="font-semibold text-emerald-400">Fen</TableHead>
                          <TableHead className="font-bold text-lg text-slate-200">Toplam</TableHead>
                        </>
                      )}
                      {examTypeFilter === 'BRANCH' && (
                        <TableHead className="font-bold text-lg text-slate-200">
                          {selectedBranch === 'Turkish' && 'Türkçe Net'}
                          {selectedBranch === 'Social' && 'Sosyal Net'}
                          {selectedBranch === 'Math' && 'Matematik Net'}
                          {selectedBranch === 'Science' && 'Fen Net'}
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExams.map((exam, index) => {
                      const isBest = exam.total_net === stats.bestTotalNet
                      const socialBreakdown = getSocialBreakdown(exam)
                      const scienceBreakdown = getScienceBreakdown(exam)
                      
                      return (
                        <TableRow 
                          key={exam.id} 
                          className={`border-b border-white/5 ${isBest ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'hover:bg-white/5'}`}
                        >
                          <TableCell className="font-medium text-slate-300">
                            {new Date(exam.created_at).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-200">{exam.exam_name}</TableCell>
                          
                          {examTypeFilter === 'TYT' && (
                            <>
                          <TableCell className={getScoreColor(exam.turkish_net, 40)}>
                            {exam.turkish_net.toFixed(2)}
                          </TableCell>
                          <TableCell className={getScoreColor(exam.social_net, 20)}>
                            {exam.social_net.toFixed(2)}
                          </TableCell>
                          <TableCell className={getScoreColor(exam.math_net, 40)}>
                            {exam.math_net.toFixed(2)}
                          </TableCell>
                          <TableCell className={getScoreColor(exam.science_net, 40)}>
                            {exam.science_net.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-lg ${getScoreColor(exam.total_net, 120)}`}>
                                {exam.total_net.toFixed(2)}
                              </span>
                              {isBest && (
                                <Badge variant="default" className="bg-green-500">
                                  <Award className="h-3 w-3 mr-1" />
                                  En İyi
                                </Badge>
                              )}
                              <button
                                onClick={() => setSelectedExam(exam)}
                                className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                                aria-label="Detayları göster"
                              >
                                <Info className="h-4 w-4 text-slate-400 hover:text-slate-200" />
                              </button>
                            </div>
                          </TableCell>
                            </>
                          )}
                          
                          {examTypeFilter === 'BRANCH' && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg ${getScoreColor(exam.total_net, selectedBranch === 'Social' ? 20 : 40)}`}>
                                  {exam.total_net.toFixed(2)}
                                </span>
                                {isBest && (
                                  <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
                                    <Award className="h-3 w-3 mr-1" />
                                    En İyi
                                  </Badge>
                                )}
                                {((selectedBranch === 'Social' && socialBreakdown) || 
                                  (selectedBranch === 'Science' && scienceBreakdown)) && (
                                  <button
                                    onClick={() => setSelectedExam(exam)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                                    aria-label="Detayları göster"
                                  >
                                    <Info className="h-4 w-4 text-slate-400 hover:text-slate-200" />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exam Detail Modal */}
      <ExamDetailModal
        exam={selectedExam}
        isOpen={selectedExam !== null}
        onClose={() => setSelectedExam(null)}
      />
    </div>
  )
}
