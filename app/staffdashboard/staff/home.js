"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserCheck, AlertTriangle, Calendar } from "lucide-react"

const GymDashboard = () => {
  const [summaryStats, setSummaryStats] = useState({
    members: { active: 0, total: 0 },
    activeSubscriptions: 0,
    checkinsToday: 0,
    upcomingExpirations: 0,
  })
  const [loading, setLoading] = useState(false)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`https://api.cnergy.site/admindashboard.php?period=today`)
      const data = response.data.summaryStats
      
      // Only keep operational metrics, remove financial data
      setSummaryStats({
        members: {
          active: data.members?.active?.value || data.members?.active || 0,
          total: data.members?.total?.value || data.members?.total || 0
        },
        activeSubscriptions: data.activeSubscriptions?.value || data.activeSubscriptions || 0,
        checkinsToday: data.checkinsToday?.value || data.checkinsToday || 0,
        upcomingExpirations: data.upcomingExpirations?.value || data.upcomingExpirations || 0,
      })
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Custom formatters
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
              <CardTitle className="text-lg sm:text-xl">Staff Dashboard</CardTitle>
              <CardDescription className="text-sm">
                Welcome to the CNERGY Gym Staff Dashboard – Daily Operations & Member Service
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Today's Overview</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Members */}
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

            {/* Active Subscriptions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Monthly Subscriptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">Monthly subscribers</p>
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for daily operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Member Check-in</h4>
              <p className="text-sm text-muted-foreground">Process member gym check-ins and track attendance</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Guest Management</h4>
              <p className="text-sm text-muted-foreground">Register and manage guest visits</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Subscription Monitoring</h4>
              <p className="text-sm text-muted-foreground">Track and manage member subscriptions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GymDashboard
