"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Clock, 
  UserPlus, 
  MessageSquare, 
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react"

const GymDashboard = () => {
  const [summaryStats, setSummaryStats] = useState({
    members: { active: 0, total: 0 },
    activeSubscriptions: 0,
    checkinsToday: 0,
    upcomingExpirations: 0,
  })
  const [loading, setLoading] = useState(false)
  
  // New state for enhanced features
  const [memberAlerts, setMemberAlerts] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [memberSearch, setMemberSearch] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [todaysSchedule, setTodaysSchedule] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)

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
      
      // Fetch additional data for enhanced features
      await Promise.all([
        fetchMemberAlerts(),
        fetchRecentActivity(),
        fetchTodaysSchedule(),
        fetchUnreadMessages()
      ])
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch member alerts (expired memberships, pending approvals, etc.)
  const fetchMemberAlerts = async () => {
    try {
      // This would typically come from a dedicated API endpoint
      // For now, we'll simulate with the data we have
      const alerts = [
        { id: 1, type: 'expired', message: '3 memberships expired today', priority: 'high', count: 3 },
        { id: 2, type: 'pending', message: '5 new member applications pending', priority: 'medium', count: 5 },
        { id: 3, type: 'payment', message: '2 members with payment issues', priority: 'high', count: 2 }
      ]
      setMemberAlerts(alerts)
    } catch (error) {
      console.error("Error fetching member alerts:", error)
    }
  }

  // Fetch recent activity (check-ins, new members, etc.)
  const fetchRecentActivity = async () => {
    try {
      // This would typically come from a dedicated API endpoint
      const activity = [
        { id: 1, type: 'checkin', user: 'John Doe', time: '10:30 AM', message: 'Checked in' },
        { id: 2, type: 'new_member', user: 'Jane Smith', time: '9:15 AM', message: 'New member registered' },
        { id: 3, type: 'checkin', user: 'Mike Johnson', time: '8:45 AM', message: 'Checked in' },
        { id: 4, type: 'guest', user: 'Guest User', time: '8:00 AM', message: 'Guest session started' }
      ]
      setRecentActivity(activity)
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    }
  }

  // Fetch today's schedule (appointments, classes, etc.)
  const fetchTodaysSchedule = async () => {
    try {
      // This would typically come from a dedicated API endpoint
      const schedule = [
        { id: 1, time: '9:00 AM', type: 'appointment', title: 'Personal Training - Sarah', member: 'Sarah Wilson' },
        { id: 2, time: '10:30 AM', type: 'class', title: 'Yoga Class', member: 'Group Session' },
        { id: 3, time: '2:00 PM', type: 'appointment', title: 'Consultation - Mike', member: 'Mike Johnson' },
        { id: 4, time: '4:00 PM', type: 'class', title: 'HIIT Class', member: 'Group Session' }
      ]
      setTodaysSchedule(schedule)
    } catch (error) {
      console.error("Error fetching today's schedule:", error)
    }
  }

  // Fetch unread messages count
  const fetchUnreadMessages = async () => {
    try {
      // This would typically come from a dedicated API endpoint
      setUnreadMessages(3) // Simulated count
    } catch (error) {
      console.error("Error fetching unread messages:", error)
    }
  }

  // Search members function
  const searchMembers = async (query) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    
    try {
      // This would typically come from a dedicated API endpoint
      const results = [
        { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', membership: 'Annual' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', membership: 'Monthly' },
        { id: 3, name: 'Mike Johnson', email: 'mike@example.com', status: 'expired', membership: 'Annual' }
      ].filter(member => 
        member.name.toLowerCase().includes(query.toLowerCase()) ||
        member.email.toLowerCase().includes(query.toLowerCase())
      )
      
      setSearchResults(results)
      setShowSearchResults(true)
    } catch (error) {
      console.error("Error searching members:", error)
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

      {/* Today's Member Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Today's Member Alerts
            </CardTitle>
            <Badge variant="destructive" className="text-xs">
              {memberAlerts.length} alerts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {memberAlerts.map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                alert.priority === 'high' ? 'border-red-500 bg-red-50' : 
                alert.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' : 
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.priority === 'high' ? 'text-red-500' : 
                      alert.priority === 'medium' ? 'text-yellow-500' : 
                      'text-blue-500'
                    }`} />
                    <span className="font-medium">{alert.message}</span>
                  </div>
                  <Badge variant="outline">{alert.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Member Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Quick Member Lookup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value)
                searchMembers(e.target.value)
              }}
              className="pl-10"
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {searchResults.map((member) => (
                  <div key={member.id} className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={member.status === 'active' ? 'default' : 'destructive'}>
                          {member.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{member.membership}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {activity.user.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.user}</p>
                    <p className="text-xs text-muted-foreground">{activity.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysSchedule.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="text-center">
                    <p className="text-sm font-medium">{item.time}</p>
                    <Badge variant={item.type === 'appointment' ? 'default' : 'secondary'} className="text-xs">
                      {item.type}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.member}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common tasks for daily operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <UserCheck className="h-6 w-6" />
              <span className="text-sm">Member Check-in</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <UserPlus className="h-6 w-6" />
              <span className="text-sm">Guest Registration</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2 relative">
              <MessageSquare className="h-6 w-6" />
              <span className="text-sm">Messages</span>
              {unreadMessages > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs">
                  {unreadMessages}
                </Badge>
              )}
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <RefreshCw className="h-6 w-6" />
              <span className="text-sm">Refresh Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GymDashboard
