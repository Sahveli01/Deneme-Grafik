'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import AddExamModal from './AddExamModal'
import { Exam } from '@/types/database'
import { LogOut, TrendingUp, Award, BookOpen, BarChart3, Calendar } from 'lucide-react'
import { toast } from 'sonner'

type ChartView = 'total' | 'turkish' | 'social' | 'math' | 'science'

export default function Dashboard() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [chartView, setChartView] = useState<ChartView>('total')
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

  // Calculate statistics
  const stats = useMemo(() => {
    if (exams.length === 0) {
      return {
        totalExams: 0,
        bestTotalNet: 0,
        averageTotalNet: 0,
        lastExamNet: 0,
        improvement: 0,
      }
    }

    const totalNets = exams.map(e => e.total_net)
    const bestTotalNet = Math.max(...totalNets)
    const averageTotalNet = totalNets.reduce((a, b) => a + b, 0) / totalNets.length
    const lastExamNet = exams[0].total_net
    const previousExamNet = exams.length > 1 ? exams[1].total_net : lastExamNet
    const improvement = lastExamNet - previousExamNet

    return {
      totalExams: exams.length,
      bestTotalNet,
      averageTotalNet,
      lastExamNet,
      improvement,
    }
  }, [exams])

  // Prepare chart data based on selected view
  const chartData = useMemo(() => {
    const reversed = exams.slice().reverse()
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
      }
    })
  }, [exams])

  // Get chart configuration based on view
  const getChartConfig = () => {
    const configs = {
      total: { dataKey: 'total', color: '#6366f1', name: 'Toplam Net', label: 'Toplam Net Skoru' },
      turkish: { dataKey: 'turkish', color: '#f97316', name: 'Türkçe Net', label: 'Türkçe Net Skoru' },
      social: { dataKey: 'social', color: '#8b5cf6', name: 'Sosyal Net', label: 'Sosyal Bilimler Net Skoru' },
      math: { dataKey: 'math', color: '#3b82f6', name: 'Matematik Net', label: 'Matematik Net Skoru' },
      science: { dataKey: 'science', color: '#10b981', name: 'Fen Net', label: 'Fen Bilimleri Net Skoru' },
    }
    return configs[chartView]
  }

  const chartConfig = getChartConfig()

  // Get score color based on value
  const getScoreColor = (value: number, maxValue: number) => {
    const percentage = (value / maxValue) * 100
    if (percentage >= 80) return 'text-green-600 font-bold'
    if (percentage >= 60) return 'text-blue-600 font-semibold'
    if (percentage >= 40) return 'text-yellow-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-lg font-medium text-muted-foreground">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">TYT Net Takip</h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tekrar hoş geldiniz, <span className="font-medium text-foreground">{user?.email}</span>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl shadow-md border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Toplam Deneme</CardDescription>
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-3xl font-bold pt-2">{stats.totalExams}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="rounded-xl shadow-md border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">En Yüksek Net</CardDescription>
                <Award className="h-5 w-5 text-green-500" />
              </div>
              <CardTitle className="text-3xl font-bold pt-2">{stats.bestTotalNet.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="rounded-xl shadow-md border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Ortalama Net</CardDescription>
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <CardTitle className="text-3xl font-bold pt-2">{stats.averageTotalNet.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="rounded-xl shadow-md border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Son Deneme Net</CardDescription>
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <CardTitle className="text-3xl font-bold pt-2">{stats.lastExamNet.toFixed(2)}</CardTitle>
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
        {exams.length > 0 && (
          <Card className="rounded-xl shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold">Performans Analizi</CardTitle>
              <CardDescription>Farklı derslerdeki ilerlemenizi takip edin</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={chartView} onValueChange={(v) => setChartView(v as ChartView)} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="total" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                    Toplam
                  </TabsTrigger>
                  <TabsTrigger value="turkish" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                    Türkçe
                  </TabsTrigger>
                  <TabsTrigger value="social" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                    Sosyal
                  </TabsTrigger>
                  <TabsTrigger value="math" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                    Matematik
                  </TabsTrigger>
                  <TabsTrigger value="science" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                    Fen
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={chartView} className="mt-0">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey={chartConfig.dataKey} 
                        stroke={chartConfig.color} 
                        strokeWidth={3}
                        dot={{ fill: chartConfig.color, r: 5 }}
                        activeDot={{ r: 8 }}
                        name={chartConfig.name}
                      />
                      {stats.averageTotalNet > 0 && chartView === 'total' && (
                        <ReferenceLine 
                          y={stats.averageTotalNet} 
                          stroke="#9ca3af" 
                          strokeDasharray="5 5"
                          label={{ value: 'Ortalama', position: 'right', fill: '#9ca3af' }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Deneme Geçmişi</CardTitle>
            <CardDescription>Tüm deneme skorlarınızın detaylı dökümü</CardDescription>
          </CardHeader>
          <CardContent>
            {exams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Henüz deneme yok</p>
                <p className="text-sm mt-2">Başlamak için ilk denemenizi ekleyin!</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Tarih</TableHead>
                      <TableHead className="font-semibold">Deneme Adı</TableHead>
                      <TableHead className="font-semibold text-orange-600">Türkçe</TableHead>
                      <TableHead className="font-semibold text-purple-600">Sosyal</TableHead>
                      <TableHead className="font-semibold text-blue-600">Matematik</TableHead>
                      <TableHead className="font-semibold text-green-600">Fen</TableHead>
                      <TableHead className="font-bold text-lg">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam, index) => {
                      const isBest = exam.total_net === stats.bestTotalNet
                      return (
                        <TableRow 
                          key={exam.id} 
                          className={isBest ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-muted/50'}
                        >
                          <TableCell className="font-medium">
                            {new Date(exam.created_at).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="font-semibold">{exam.exam_name}</TableCell>
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
                            </div>
                          </TableCell>
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
    </div>
  )
}
