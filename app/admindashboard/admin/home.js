"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, DollarSign, CreditCard, UserCheck, AlertTriangle, Calendar } from "lucide-react"

const GymDashboard = () => {
  const [membershipData, setMembershipData] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [summaryStats, setSummaryStats] = useState({
    members: { active: 0, total: 0 },
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
      setMembershipData(response.data.membershipData)
      setRevenueData(response.data.revenueData)
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
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

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="text-sm text-muted-foreground">Loading dashboard data...</div>
        </div>
      )}
      {/* Time Period Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dashboard Overview</CardTitle>
              <CardDescription>
                Welcome to the CNERGY Gym Admin Dashboard – Manage Staff, Members, Coaches, and Operations!
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
                <SelectTrigger className="w-[180px]">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.members.active}/{summaryStats.members.total}
                </div>
                <p className="text-xs text-muted-foreground">Active / Total</p>
              </CardContent>
            </Card>

            {/* Sales */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sales {timePeriod === 'today' ? 'Today' : timePeriod === 'week' ? 'This Week' : timePeriod === 'month' ? 'This Month' : 'This Year'}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{summaryStats.salesToday.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {timePeriod === 'today' ? "Today's revenue" : timePeriod === 'week' ? "This week's revenue" : timePeriod === 'month' ? "This month's revenue" : "This year's revenue"}
                </p>
              </CardContent>
            </Card>

            {/* Active Subscriptions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">Current subscribers</p>
              </CardContent>
            </Card>

            {/* Gym Check-ins */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gym Check-ins {timePeriod === 'today' ? 'Today' : timePeriod === 'week' ? 'This Week' : timePeriod === 'month' ? 'This Month' : 'This Year'}
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.checkinsToday}</div>
                <p className="text-xs text-muted-foreground">
                  {timePeriod === 'today' ? "Today's visits" : timePeriod === 'week' ? "This week's visits" : timePeriod === 'month' ? "This month's visits" : "This year's visits"}
                </p>
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
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membership Growth</CardTitle>
            <CardDescription>
              {timePeriod === 'today' ? 'Daily membership growth trend' : 
               timePeriod === 'week' ? 'Weekly membership growth trend' : 
               timePeriod === 'month' ? 'Monthly membership growth trend' : 
               'Yearly membership growth trend'}
            </CardDescription>
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
                  <ChartTooltip content={<ChartTooltipContent />} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {timePeriod === 'today' ? 'Daily Revenue' : 
               timePeriod === 'week' ? 'Weekly Revenue' : 
               timePeriod === 'month' ? 'Monthly Revenue' : 
               'Yearly Revenue'}
            </CardTitle>
            <CardDescription>
              {timePeriod === 'today' ? 'Daily revenue performance' : 
               timePeriod === 'week' ? 'Weekly revenue performance' : 
               timePeriod === 'month' ? 'Monthly revenue performance' : 
               'Yearly revenue performance'}
            </CardDescription>
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
                  <Bar dataKey="revenue" style={{ fill: "hsl(var(--chart-2))", opacity: 0.8 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
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
