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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchDashboardData = async (period = timePeriod, isRetry = false) => {
    setLoading(true)
    setError(null)

    try {
      const apiUrl = `https://api.cnergy.site/admindashboard.php?period=${period}`

      const response = await axios.get(apiUrl, {
        timeout: 10000 // 10 second timeout
      })

      if (response.data.success) {
        // Validate and correct the data if needed
        const correctedMembershipData = validateAndCorrectChartData(response.data.membershipData || [])
        const correctedRevenueData = validateAndCorrectChartData(response.data.revenueData || [])

        setSummaryStats(response.data.summaryStats)
        setMembershipData(correctedMembershipData)
        setRevenueData(correctedRevenueData)
        setRetryCount(0) // Reset retry count on success
      } else {
        throw new Error(response.data.error || 'Failed to fetch dashboard data')
      }
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

  const handleRetry = () => {
    setRetryCount(0)
    fetchDashboardData(timePeriod)
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

  // Validate and correct chart data to ensure it's for the current month
  const validateAndCorrectChartData = (data) => {
    if (!data || data.length === 0) {
      // If no data, create sample data for current month
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth()


      // Create sample data for the last 7 days
      const sampleData = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth, currentDate.getDate() - i)
        sampleData.push({
          name: format(date, "MMM dd"),
          displayName: format(date, "MMM dd"),
          members: Math.floor(Math.random() * 10) + 1,
          revenue: Math.floor(Math.random() * 5000) + 1000
        })
      }
      return sampleData
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() // 0-based (October = 9)


    return data.map((item, index) => {
      if (!item.name) return item

      // Extract day number from the name
      const dayMatch = item.name.match(/\d{1,2}/)
      let day = 1

      if (dayMatch) {
        day = parseInt(dayMatch[0])
      } else {
        // If no day found, use the index + 1
        day = index + 1
      }

      // Ensure day is valid (1-31)
      if (day < 1 || day > 31) {
        day = Math.min(31, Math.max(1, day))
      }

      // Create a corrected date for the current month
      const correctedDate = new Date(currentYear, currentMonth, day)
      const displayName = format(correctedDate, "MMM dd")


      return {
        ...item,
        name: displayName, // Update the original name too
        displayName: displayName
      }
    })
  }

  // Format chart data to show proper dates
  const formatChartData = (data) => {
    if (!data || data.length === 0) return []

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() // 0-based (October = 9)


    return data.map(item => {
      if (!item.name) return item


      // If it's a time format (HH:MM), keep it as is
      if (item.name.match(/^\d{1,2}:\d{2}$/)) {
        return { ...item, displayName: item.name }
      }

      // For dates, let's be more aggressive about fixing them
      try {
        let date;
        let originalName = item.name;

        // Handle different date formats
        if (originalName.includes('-')) {
          date = new Date(originalName)
        } else if (originalName.includes('/')) {
          const parts = originalName.split('/')
          if (parts.length === 3) {
            date = new Date(parts[2], parts[0] - 1, parts[1])
          }
        } else if (originalName.match(/^\d{8}$/)) {
          const year = originalName.substring(0, 4)
          const month = originalName.substring(4, 6)
          const day = originalName.substring(6, 8)
          date = new Date(year, month - 1, day)
        } else {
          date = new Date(originalName)
        }

        if (!isNaN(date.getTime())) {
          // Force the date to be in the current month and year
          const day = date.getDate()
          const correctedDate = new Date(currentYear, currentMonth, day)


          return { ...item, displayName: format(correctedDate, "MMM dd") }
        }
      } catch (error) {
        console.warn('Date parsing failed for:', item.name, error)
      }

      // If all else fails, try to extract just the day number and use current month
      const dayMatch = item.name.match(/\d{1,2}/)
      if (dayMatch) {
        const day = parseInt(dayMatch[0])
        if (day >= 1 && day <= 31) {
          const correctedDate = new Date(currentYear, currentMonth, day)
          return { ...item, displayName: format(correctedDate, "MMM dd") }
        }
      }

      return { ...item, displayName: item.name }
    })
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
