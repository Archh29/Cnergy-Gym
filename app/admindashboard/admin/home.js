"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { Users, CreditCard, UserCheck, AlertTriangle, Calendar, TrendingUp, TrendingDown } from "lucide-react"

// Trend Indicator Component
const TrendIndicator = ({ trend, isPositive }) => {
  if (trend === 0) return null;

  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? "text-green-600" : "text-red-600";
  const bgColor = isPositive ? "bg-green-100" : "bg-red-100";

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {Math.abs(trend)}%
    </div>
  );
};

// Loading Skeleton Component
const CardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
    </CardContent>
  </Card>
);

// Error Display Component
const ErrorDisplay = ({ error, onRetry, retryCount }) => (
  <Card className="border-red-200 bg-red-50">
    <CardContent className="pt-6">
      <div className="flex items-center justify-center text-center">
        <div>
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Dashboard</h3>
          <p className="text-red-600 mb-4">{error}</p>
          {retryCount > 0 && (
            <p className="text-sm text-red-500 mb-4">
              Retry attempt {retryCount} of 3...
            </p>
          )}
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const GymDashboard = () => {
  const [membershipData, setMembershipData] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [summaryStats, setSummaryStats] = useState({
    members: { active: { value: 0, trend: 0, isPositive: true }, total: { value: 0, trend: 0, isPositive: true } },
    totalUsers: { active: { value: 0, trend: 0, isPositive: true }, total: { value: 0, trend: 0, isPositive: true } },
    salesToday: { value: 0, trend: 0, isPositive: true },
    activeSubscriptions: { value: 0, trend: 0, isPositive: true },
    checkinsToday: { value: 0, trend: 0, isPositive: true },
    upcomingExpirations: { value: 0, trend: 0, isPositive: true },
  })
  const [timePeriod, setTimePeriod] = useState("today")
  const [selectedMonth, setSelectedMonth] = useState("all-time")
  const [selectedYear, setSelectedYear] = useState("all-time")
  const [selectedDate, setSelectedDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchDashboardData = async (period = timePeriod, isRetry = false) => {
    setLoading(true)
    setError(null)

    try {
      // For now, let's create mock data that responds to filters
      // In a real implementation, this would fetch from existing APIs
      const mockData = generateMockDashboardData(period, selectedMonth, selectedYear, selectedDate)

      setSummaryStats(mockData.summaryStats)
      setMembershipData(mockData.membershipData)
      setRevenueData(mockData.revenueData)
      setRetryCount(0)
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError(err.message)
      setMembershipData([])
      setRevenueData([])

      // Auto-retry logic (max 3 retries)
      if (!isRetry && retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchDashboardData(period, true)
        }, 2000 * (retryCount + 1)) // Exponential backoff
      }
    } finally {
      setLoading(false)
    }
  }

  // Generate mock data based on filters
  const generateMockDashboardData = (period, month, year, date) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Generate data based on filters
    let membershipData = []
    let revenueData = []

    if (date) {
      // Specific date - show single day data
      const targetDate = new Date(date)
      membershipData = [
        { name: format(targetDate, 'yyyy-MM-dd'), members: Math.floor(Math.random() * 20) + 5 }
      ]
      revenueData = [
        { name: format(targetDate, 'yyyy-MM-dd'), revenue: Math.floor(Math.random() * 50000) + 10000 }
      ]
    } else if (month && month !== "all-time" && year && year !== "all-time") {
      // Specific month and year - show daily data for that month
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        const date = new Date(dateStr)
        membershipData.push({
          name: dateStr,
          members: Math.floor(Math.random() * 15) + 3
        })
        revenueData.push({
          name: dateStr,
          revenue: Math.floor(Math.random() * 30000) + 5000
        })
      }
    } else if (month && month !== "all-time") {
      // Month only - show daily data for current year
      const daysInMonth = new Date(currentYear, parseInt(month), 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        const date = new Date(dateStr)
        membershipData.push({
          name: dateStr,
          members: Math.floor(Math.random() * 15) + 3
        })
        revenueData.push({
          name: dateStr,
          revenue: Math.floor(Math.random() * 30000) + 5000
        })
      }
    } else if (year && year !== "all-time") {
      // Year only - show monthly data
      for (let month = 1; month <= 12; month++) {
        const date = new Date(parseInt(year), month - 1, 1)
        membershipData.push({
          name: format(date, 'MMM'),
          members: Math.floor(Math.random() * 50) + 20
        })
        revenueData.push({
          name: format(date, 'MMM'),
          revenue: Math.floor(Math.random() * 100000) + 20000
        })
      }
    } else {
      // All time or period-based - show monthly data for current year
      for (let month = 1; month <= 12; month++) {
        const date = new Date(currentYear, month - 1, 1)
        membershipData.push({
          name: format(date, 'MMM'),
          members: Math.floor(Math.random() * 50) + 20
        })
        revenueData.push({
          name: format(date, 'MMM'),
          revenue: Math.floor(Math.random() * 100000) + 20000
        })
      }
    }

    return {
      summaryStats: {
        members: {
          active: { value: Math.floor(Math.random() * 100) + 50, trend: 5, isPositive: true },
          total: { value: Math.floor(Math.random() * 200) + 100, trend: 3, isPositive: true }
        },
        totalUsers: {
          active: { value: Math.floor(Math.random() * 150) + 75, trend: 7, isPositive: true },
          total: { value: Math.floor(Math.random() * 300) + 150, trend: 4, isPositive: true }
        },
        salesToday: { value: Math.floor(Math.random() * 50000) + 10000, trend: 12, isPositive: true },
        activeSubscriptions: { value: Math.floor(Math.random() * 80) + 40, trend: 8, isPositive: true },
        checkinsToday: { value: Math.floor(Math.random() * 30) + 10, trend: 15, isPositive: true },
        upcomingExpirations: { value: Math.floor(Math.random() * 10) + 2, trend: -5, isPositive: false },
      },
      membershipData,
      revenueData
    }
  }

  const handleRetry = () => {
    setRetryCount(0)
    fetchDashboardData(timePeriod)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [timePeriod, selectedMonth, selectedYear, selectedDate])

  const handleTimePeriodChange = (value) => {
    setTimePeriod(value)
  }

  const handleMonthChange = (value) => {
    setSelectedMonth(value)
    setSelectedDate("") // Clear day when month changes
  }

  const handleYearChange = (value) => {
    setSelectedYear(value)
    setSelectedDate("") // Clear day when year changes
  }

  const handleDateChange = (value) => {
    setSelectedDate(value)
  }

  // Custom formatters
  const formatCurrency = (value) => {
    return `₱${value.toLocaleString()}`
  }

  const formatNumber = (value) => {
    return value.toLocaleString()
  }

  // Format chart data to show 'MMM DD' (e.g., 'Oct 17')
  const formatChartData = (data) => {
    return data.map(item => ({
      ...item,
      displayName: item.name ? format(new Date(item.name), "MMM dd") : item.name // Format to 'Oct 17'
    }))
  }

  // Show error state if there's an error and no data
  if (error && !loading && membershipData.length === 0 && revenueData.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <ErrorDisplay error={error} onRetry={handleRetry} retryCount={retryCount} />
      </div>
    );
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
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Month:</label>
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-time">All Time</SelectItem>
                    <SelectItem value="01">January</SelectItem>
                    <SelectItem value="02">February</SelectItem>
                    <SelectItem value="03">March</SelectItem>
                    <SelectItem value="04">April</SelectItem>
                    <SelectItem value="05">May</SelectItem>
                    <SelectItem value="06">June</SelectItem>
                    <SelectItem value="07">July</SelectItem>
                    <SelectItem value="08">August</SelectItem>
                    <SelectItem value="09">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Year:</label>
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-time">All Time</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Day:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
            {loading ? (
              // Show loading skeletons
              Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)
            ) : (
              <>
                {/* Annual Members */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Annual Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summaryStats.members.active.value || 0}/{summaryStats.members.total.value || 0}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Active / Total</p>
                      {summaryStats.members.active.trend !== undefined && (
                        <TrendIndicator
                          trend={summaryStats.members.active.trend}
                          isPositive={summaryStats.members.active.isPositive}
                        />
                      )}
                    </div>
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
                      {summaryStats.totalUsers.active.value || 0}/{summaryStats.totalUsers.total.value || 0}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Active / Total</p>
                      {summaryStats.totalUsers.active.trend !== undefined && (
                        <TrendIndicator
                          trend={summaryStats.totalUsers.active.trend}
                          isPositive={summaryStats.totalUsers.active.isPositive}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Sales Today */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
                    <span className="text-muted-foreground">₱</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₱{(summaryStats.salesToday.value || 0).toLocaleString()}</div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Today's revenue</p>
                      {summaryStats.salesToday.trend !== undefined && (
                        <TrendIndicator
                          trend={summaryStats.salesToday.trend}
                          isPositive={summaryStats.salesToday.isPositive}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Monthly Subscriptions */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Monthly Subscriptions</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.activeSubscriptions.value || 0}</div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Monthly plan subscribers</p>
                      {summaryStats.activeSubscriptions.trend !== undefined && (
                        <TrendIndicator
                          trend={summaryStats.activeSubscriptions.trend}
                          isPositive={summaryStats.activeSubscriptions.isPositive}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Gym Check-ins */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gym Check-ins Today</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.checkinsToday.value || 0}</div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Today's visits</p>
                      {summaryStats.checkinsToday.trend !== undefined && (
                        <TrendIndicator
                          trend={summaryStats.checkinsToday.trend}
                          isPositive={summaryStats.checkinsToday.isPositive}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Expirations */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Expirations</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.upcomingExpirations.value || 0}</div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Next 7 days</p>
                      {summaryStats.upcomingExpirations.trend !== undefined && (
                        <TrendIndicator
                          trend={summaryStats.upcomingExpirations.trend}
                          isPositive={summaryStats.upcomingExpirations.isPositive}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Annual Membership Growth</CardTitle>
            <CardDescription>Annual membership growth trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                members: { label: "Members", color: "hsl(var(--chart-1))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(membershipData)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="displayName"
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
                      formatter={(value, name, props) => [
                        formatNumber(value),
                        "Members",
                        `Date: ${props.payload?.name || 'N/A'}`
                      ]}
                      labelFormatter={(label) => `Period: ${label}`}
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
                <BarChart data={formatChartData(revenueData)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="displayName"
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
                      formatter={(value, name, props) => [
                        formatCurrency(value),
                        "Revenue",
                        `Period: ${props.payload?.name || 'N/A'}`
                      ]}
                      labelFormatter={(label) => `Revenue Period: ${label}`}
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
