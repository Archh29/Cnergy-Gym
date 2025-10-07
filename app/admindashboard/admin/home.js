"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, CreditCard, UserCheck, AlertTriangle, Calendar } from "lucide-react"

const GymDashboard = () => {
  const [membershipData, setMembershipData] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [summaryStats, setSummaryStats] = useState({
    members: { active: 0, total: 0 },
    totalUsers: { active: 0, total: 0 },
    salesToday: 0,
    activeSubscriptions: 0,
    checkinsToday: 0,
    upcomingExpirations: 0,
  })
  const [timePeriod, setTimePeriod] = useState("today")
  const [loading, setLoading] = useState(false)

  const fetchDashboardData = async (period = timePeriod) => {
    setLoading(true)
    try {
      const response = await axios.get(`https://api.cnergy.site/admindashboard.php?period=${period}`)
      setSummaryStats(response.data.summaryStats)
      setMembershipData(response.data.membershipData || [])
      setRevenueData(response.data.revenueData || [])
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setMembershipData([])
      setRevenueData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [timePeriod])

  const handleTimePeriodChange = (value) => {
    setTimePeriod(value)
  }

  // Custom formatters
  const formatCurrency = (value) => {
    return `₱${value.toLocaleString()}`
  }

  const formatNumber = (value) => {
    return value.toLocaleString()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dashboard Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Dashboard Overview</CardTitle>
              <CardDescription className="text-sm">
                Welcome to the CNERGY Gym Admin Dashboard – Manage Staff, Members, Coaches, and Operations!
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
            {/* Annual Members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.members.active}/{summaryStats.members.total}
                </div>
                <p className="text-xs text-muted-foreground">Active / Total</p>
              </CardContent>
            </Card>

            {/* Total Users */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.totalUsers.active}/{summaryStats.totalUsers.total}
                </div>
                <p className="text-xs text-muted-foreground">Active / Total</p>
              </CardContent>
            </Card>

            {/* Sales Today */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
                <span className="text-muted-foreground">₱</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{summaryStats.salesToday.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Today's revenue</p>
              </CardContent>
            </Card>

            {/* Active Monthly Subscriptions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Monthly Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">Monthly plan subscribers</p>
              </CardContent>
            </Card>

            {/* Gym Check-ins */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gym Check-ins Today</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.checkinsToday}</div>
                <p className="text-xs text-muted-foreground">Today's visits</p>
              </CardContent>
            </Card>

            {/* Expirations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Expirations</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.upcomingExpirations}</div>
                <p className="text-xs text-muted-foreground">Next 7 days</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Annual Membership Growth</CardTitle>
            <CardDescription>Annual membership growth trend (Plan ID 1)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                members: { label: "Members", color: "hsl(var(--chart-1))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={membershipData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatNumber}
                  />
                  <Line
                    type="monotone"
                    dataKey="members"
                    strokeWidth={2}
                    activeDot={{
                      r: 8,
                      style: { fill: "hsl(var(--chart-1))", opacity: 0.8 },
                    }}
                    style={{ stroke: "hsl(var(--chart-1))" }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name) => [formatNumber(value), "Members"]}
                    />} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Revenue performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrency}
                  />
                  <Bar dataKey="revenue" style={{ fill: "hsl(var(--chart-2))", opacity: 0.8 }} />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name) => [formatCurrency(value), "Revenue"]}
                    />} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default GymDashboard
