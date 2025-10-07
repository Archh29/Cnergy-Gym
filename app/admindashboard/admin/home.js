"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
      const response = await axios.get(`https://api.cnergy.site/admindashboard.php?period=${period}`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.data.success) {
        setSummaryStats(response.data.summaryStats)
        setMembershipData(response.data.membershipData || [])
        setRevenueData(response.data.revenueData || [])
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
