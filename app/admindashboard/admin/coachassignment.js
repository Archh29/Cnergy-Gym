"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  MapPin,
  Phone,
  Mail,
  Award,
  RefreshCw,
  Activity,
  Users,
  UserCheck,
} from "lucide-react"

const API_BASE_URL = "https://api.cnergy.site/admin_coach.php"

const CoachAssignments = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [requestDetailOpen, setRequestDetailOpen] = useState(false)
  const [declineReasonOpen, setDeclineReasonOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  // POS Modal states
  const [posModalOpen, setPosModalOpen] = useState(false)
  const [posData, setPosData] = useState({
    payment_method: 'cash',
    amount_received: '',
    change_given: 0,
    notes: ''
  })
  const [currentUserId, setCurrentUserId] = useState(6) // Default admin ID, will be updated from session

  // Data states
  const [pendingRequests, setPendingRequests] = useState([])
  const [assignedMembers, setAssignedMembers] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    pending_requests: 0,
    approved_assignments: 0,
    total_coaches: 0,
    total_members: 0,
  })
  const [activityLog, setActivityLog] = useState([])

  // Fetch data functions
  const fetchPendingRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=pending-requests`)
      if (response.data.success) {
        setPendingRequests(response.data.requests || [])
      } else {
        throw new Error(response.data.message || "Failed to fetch pending requests")
      }
    } catch (err) {
      console.error("Error fetching pending requests:", err)
      setError("Failed to load pending requests")
    }
  }

  const fetchAssignedMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=assigned-members`)
      if (response.data.success) {
        setAssignedMembers(response.data.assignments || [])
      } else {
        throw new Error(response.data.message || "Failed to fetch assigned members")
      }
    } catch (err) {
      console.error("Error fetching assigned members:", err)
      setError("Failed to load assigned members")
    }
  }

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=dashboard-stats`)
      if (response.data.success) {
        setDashboardStats(response.data.stats)
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err)
    }
  }

  const fetchActivityLog = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=activity-log&limit=10`)
      if (response.data.success) {
        setActivityLog(response.data.activities || [])
      }
    } catch (err) {
      console.error("Error fetching activity log:", err)
    }
  }

  const fetchRequestDetails = async (requestId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=request-details&request_id=${requestId}`)
      if (response.data.success) {
        setSelectedRequest(response.data.request)
        setRequestDetailOpen(true)
      } else {
        throw new Error(response.data.message || "Failed to fetch request details")
      }
    } catch (err) {
      console.error("Error fetching request details:", err)
      setError("Failed to load request details")
    }
  }

  // Load all data
  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchPendingRequests(), fetchAssignedMembers(), fetchDashboardStats(), fetchActivityLog()])
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  // Get current user ID from session
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        // Try the session endpoint first
        const response = await axios.get('https://api.cnergy.site/session.php')
        if (response.data.authenticated && response.data.user_id) {
          setCurrentUserId(response.data.user_id)
          return
        }
      } catch (err) {
        console.error("Error getting current user from session:", err)
      }
      
      // Fallback: try to get user from admin_coach.php
      try {
        const response = await axios.get(`${API_BASE_URL}?action=get-current-user`)
        if (response.data.success && response.data.user_id) {
          setCurrentUserId(response.data.user_id)
        }
      } catch (err) {
        console.error("Error getting current user from API:", err)
        // Keep default admin ID if both fail
      }
    }
    getCurrentUser()
  }, [])

  // Initial load
  useEffect(() => {
    loadAllData()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingRequests()
      fetchDashboardStats()
      fetchActivityLog()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleApproveRequest = async (requestId) => {
    // Open POS modal instead of directly approving
    const request = pendingRequests.find(r => r.id === requestId)
    if (request) {
      setSelectedRequest(request)
      setPosModalOpen(true)
    }
  }

  const handleApproveWithPayment = async () => {
    if (!selectedRequest) return

    setActionLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}?action=approve-request-with-payment`, {
        request_id: selectedRequest.id,
        admin_id: currentUserId, // Use the current logged-in user ID
        payment_method: posData.payment_method,
        amount_received: parseFloat(posData.amount_received),
        cashier_id: currentUserId, // Automatically use current user as cashier
        notes: posData.notes
      })
      if (response.data.success) {
        // Refresh data
        await Promise.all([fetchPendingRequests(), fetchAssignedMembers(), fetchDashboardStats(), fetchActivityLog()])
        setRequestDetailOpen(false)
        setPosModalOpen(false)
        setSelectedRequest(null)
        // Reset POS data
        setPosData({
          payment_method: 'cash',
          amount_received: '',
          change_given: 0,
          notes: ''
        })
      } else {
        throw new Error(response.data.message || "Failed to approve request")
      }
    } catch (err) {
      console.error("Error approving request:", err)
      setError("Failed to approve request: " + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineRequest = async (requestId, reason = "") => {
    setActionLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}?action=decline-request`, {
        request_id: requestId,
        reason: reason || declineReason,
        admin_id: 6, // Use the actual admin user ID from your database
      })
      if (response.data.success) {
        // Refresh data
        await Promise.all([fetchPendingRequests(), fetchDashboardStats(), fetchActivityLog()])
        setRequestDetailOpen(false)
        setDeclineReasonOpen(false)
        setSelectedRequest(null)
        setDeclineReason("")
      } else {
        throw new Error(response.data.message || "Failed to decline request")
      }
    } catch (err) {
      console.error("Error declining request:", err)
      setError("Failed to decline request: " + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const openRequestDetail = async (request) => {
    await fetchRequestDetails(request.id)
  }

  const openDeclineDialog = (request) => {
    setSelectedRequest(request)
    setDeclineReasonOpen(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatActivityAction = (action) => {
    switch (action) {
      case "approve_coach_assignment":
        return "Approved coach assignment"
      case "decline_coach_assignment":
        return "Declined coach assignment"
      default:
        return action.replace(/_/g, " ")
    }
  }

  const getInitials = (name) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const filteredRequests = pendingRequests.filter(
    (request) =>
      request.member?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.coach?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.member?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.coach?.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredMembers = assignedMembers.filter(
    (assignment) =>
      assignment.member?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.coach?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.member?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.coach?.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading coach assignments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-red-600"
              onClick={() => {
                setError(null)
                loadAllData()
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{dashboardStats.pending_requests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Approved Assignments</p>
                <p className="text-2xl font-bold">{dashboardStats.approved_assignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Coaches</p>
                <p className="text-2xl font-bold">{dashboardStats.total_coaches}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{dashboardStats.total_members}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Alert */}
      {pendingRequests.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Bell className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            You have {pendingRequests.length} pending coach assignment request{pendingRequests.length > 1 ? "s" : ""}{" "}
            waiting for approval.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Coach Assignment Management
                    {pendingRequests.length > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {pendingRequests.length} pending
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Manage coach-member connections from mobile app requests</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative w-full max-w-md mb-6">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search members or coaches..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Tabs */}
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Requests
                    {pendingRequests.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="assigned" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Assigned Members
                    <Badge variant="secondary" className="ml-1">
                      {assignedMembers.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                {/* Pending Requests Tab */}
                <TabsContent value="pending" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Requested Coach</TableHead>
                        <TableHead>Coach Approved</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {pendingRequests.length === 0 ? "No pending requests" : "No requests match your search"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                                  <AvatarFallback>{getInitials(request.member?.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{request.member?.name || "Unknown"}</div>
                                  <div className="text-sm text-muted-foreground">{request.member?.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                                  <AvatarFallback>{getInitials(request.coach?.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{request.coach?.name || "Unknown"}</div>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {request.coach?.rating || "N/A"}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(request.coachApprovedAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => openRequestDetail(request)}
                                  variant="outline"
                                  disabled={actionLoading}
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveRequest(request.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={actionLoading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openDeclineDialog(request)}
                                  disabled={actionLoading}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                {/* Assigned Members Tab */}
                <TabsContent value="assigned" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Assigned Coach</TableHead>
                        <TableHead>Assigned Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {assignedMembers.length === 0 ? "No assigned members" : "No members match your search"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                                  <AvatarFallback>{getInitials(assignment.member?.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{assignment.member?.name || "Unknown"}</div>
                                  <div className="text-sm text-muted-foreground">{assignment.member?.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{assignment.coach?.name || "Unknown"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(assignment.assignedAt)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                {assignment.status || "active"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        {/* Activity Log Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                ) : (
                  activityLog.map((activity) => (
                    <div key={activity.id} className="border-l-2 border-muted pl-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{formatActivityAction(activity.action)}</p>
                          {activity.details?.member_name && (
                            <p className="text-xs text-muted-foreground">Member: {activity.details.member_name}</p>
                          )}
                          {activity.details?.coach_name && (
                            <p className="text-xs text-muted-foreground">Coach: {activity.details.coach_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            by {activity.admin_name} ({activity.details?.user_type || "admin"})
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(activity.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request Detail Dialog */}
      <Dialog open={requestDetailOpen} onOpenChange={setRequestDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connection Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Member Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Member Information</h3>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="/placeholder.svg?height=64&width=64" />
                    <AvatarFallback className="text-lg">{getInitials(selectedRequest.member?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-xl font-semibold">{selectedRequest.member?.name || "Unknown"}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.member?.email || "N/A"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.member?.phone || "N/A"}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.member?.location || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Age:</span> {selectedRequest.member?.age || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium">Experience:</span> {selectedRequest.member?.experience || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Goals:</span> {selectedRequest.member?.goals || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Coach Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Requested Coach</h3>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="/placeholder.svg?height=64&width=64" />
                    <AvatarFallback className="text-lg">{getInitials(selectedRequest.coach?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-semibold">{selectedRequest.coach?.name || "Unknown"}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{selectedRequest.coach?.rating || "N/A"}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.coach?.email || "N/A"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.coach?.phone || "N/A"}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.coach?.location || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Experience:</span> {selectedRequest.coach?.experience || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Specialties:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(selectedRequest.coach?.specialties || []).map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Certifications:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(selectedRequest.coach?.certifications || []).map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {selectedRequest.coach?.bio && (
                        <div>
                          <span className="font-medium">Bio:</span>
                          <p className="text-sm text-muted-foreground mt-1">{selectedRequest.coach.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Request Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Request submitted:</span> {formatDate(selectedRequest.requestedAt)}
                  </div>
                  <div>
                    <span className="font-medium">Coach approved:</span> {formatDate(selectedRequest.coachApprovedAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestDetailOpen(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRequestDetailOpen(false)
                openDeclineDialog(selectedRequest)
              }}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline Request
            </Button>
            <Button
              onClick={() => handleApproveRequest(selectedRequest?.id)}
              className="bg-green-600 hover:bg-green-700"
              disabled={actionLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Reason Dialog */}
      <Dialog open={declineReasonOpen} onOpenChange={setDeclineReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for declining this coach assignment request:
            </p>
            <Textarea
              placeholder="Enter reason for declining..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineReasonOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeclineRequest(selectedRequest?.id)}
              disabled={actionLoading || !declineReason.trim()}
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POS Payment Modal */}
      <Dialog open={posModalOpen} onOpenChange={setPosModalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Process Payment - Coach Assignment</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Assignment Summary */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Assignment Details</h4>
                <div className="text-xs space-y-1">
                  <div><span className="font-medium">Member:</span> {selectedRequest.member?.name}</div>
                  <div><span className="font-medium">Coach:</span> {selectedRequest.coach?.name}</div>
                  <div><span className="font-medium">Rate Type:</span> {selectedRequest.rateType || 'Monthly'}</div>
                  <div className="pt-2 border-t border-muted">
                    <div className="text-sm font-semibold text-green-600">
                      Amount Due: ₱{(() => {
                        const rateType = selectedRequest.rateType || 'monthly';
                        switch (rateType) {
                          case 'monthly':
                            return selectedRequest.coach?.monthly_rate || 0;
                          case 'package':
                            return selectedRequest.coach?.package_rate || 0;
                          case 'per_session':
                            return selectedRequest.coach?.per_session_rate || 0;
                          default:
                            return selectedRequest.coach?.monthly_rate || 0;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <select
                    value={posData.payment_method}
                    onChange={(e) => setPosData({...posData, payment_method: e.target.value})}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="digital">Digital Payment</option>
                  </select>
                </div>

                {/* Amount Due Display */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800">
                    Amount Due: ₱{(() => {
                      const rateType = selectedRequest.rateType || 'monthly';
                      switch (rateType) {
                        case 'monthly':
                          return selectedRequest.coach?.monthly_rate || 0;
                        case 'package':
                          return selectedRequest.coach?.package_rate || 0;
                        case 'per_session':
                          return selectedRequest.coach?.per_session_rate || 0;
                        default:
                          return selectedRequest.coach?.monthly_rate || 0;
                      }
                    })()}
                  </div>
                </div>

                {/* Amount Received */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Received (₱)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={posData.amount_received}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const amount = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
                    const rateType = selectedRequest.rateType || 'monthly';
                    let dueAmount = 0;
                    switch (rateType) {
                      case 'monthly':
                        dueAmount = selectedRequest.coach?.monthly_rate || 0;
                        break;
                      case 'package':
                        dueAmount = selectedRequest.coach?.package_rate || 0;
                        break;
                      case 'per_session':
                        dueAmount = selectedRequest.coach?.per_session_rate || 0;
                        break;
                      default:
                        dueAmount = selectedRequest.coach?.monthly_rate || 0;
                    }
                    const change = Math.max(0, amount - dueAmount)
                    setPosData({
                      ...posData,
                      amount_received: inputValue === '' ? '' : amount,
                      change_given: change
                    })
                  }}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>

                {/* Change Given */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Change Given (₱)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={posData.change_given}
                    readOnly
                    className="bg-muted text-sm"
                  />
                </div>


                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={posData.notes}
                    onChange={(e) => setPosData({...posData, notes: e.target.value})}
                    placeholder="Additional notes..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPosModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveWithPayment}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              disabled={actionLoading || !posData.amount_received || parseFloat(posData.amount_received) <= 0}
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Process Payment & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CoachAssignments
