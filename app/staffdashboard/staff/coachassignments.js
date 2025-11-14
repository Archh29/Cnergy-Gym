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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  Users,
  UserCheck,
  Filter,
  CheckCircle2,
  XCircle as XCircleIcon,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_BASE_URL = "https://api.cnergy.site/admin_coach.php"
const COACH_API_URL = "https://api.cnergy.site/addcoach.php"

const CoachAssignments = ({ userId }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCoachFilter, setSelectedCoachFilter] = useState("all")
  const [availableCoaches, setAvailableCoaches] = useState([])
  const [selectedCoachId, setSelectedCoachId] = useState("")
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [availableMembers, setAvailableMembers] = useState([])
  const [rateType, setRateType] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")

  const [currentUserId, setCurrentUserId] = useState(6) // Default admin ID, will be updated from session

  // Data states
  const [assignedMembers, setAssignedMembers] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    assigned_members: 0,
    total_coaches: 0,
    total_members: 0,
  })
  const [activityLog, setActivityLog] = useState([])

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

  const handleAssignCoach = async () => {
    const memberId = selectedMemberId || selectedMember?.id
    if (!memberId || !selectedCoachId) {
      setError("Please select both a member and a coach")
      return
    }

    if (!selectedCoach) {
      setError("Please select a coach")
      return
    }

    // Calculate payment amount based on rate type
    let paymentAmount = 0
    switch (rateType) {
      case "monthly":
        paymentAmount = selectedCoach.monthly_rate || 0
        break
      case "package":
        paymentAmount = selectedCoach.session_package_rate || 0
        break
      case "per_session":
        paymentAmount = selectedCoach.per_session_rate || 0
        break
    }

    // Validate payment for cash
    if (paymentMethod === "cash") {
      const received = parseFloat(amountReceived) || 0
      if (received < paymentAmount) {
        setError(`Amount received (₱${received.toFixed(2)}) is less than required amount (₱${paymentAmount.toFixed(2)})`)
        return
      }
    }

    setActionLoading(true)
    setError(null)
    try {
      // Use currentUserId from state, fallback to userId prop
      const effectiveUserId = currentUserId || userId
      
      // First, assign the coach
      const assignResponse = await axios.post(`${API_BASE_URL}?action=assign-coach`, {
        member_id: memberId,
        coach_id: selectedCoachId,
        admin_id: effectiveUserId,
        staff_id: effectiveUserId,
        rate_type: rateType,
      })

      if (!assignResponse.data.success) {
        throw new Error(assignResponse.data.message || "Failed to assign coach")
      }

      // Then process payment if amount > 0
      if (paymentAmount > 0) {
        const paymentData = {
          request_id: assignResponse.data.data?.assignment_id,
          admin_id: effectiveUserId,
          staff_id: effectiveUserId,
          payment_method: paymentMethod,
          amount_received: paymentMethod === "cash" ? parseFloat(amountReceived) : paymentAmount,
          cashier_id: effectiveUserId,
          receipt_number: paymentMethod === "gcash" && referenceNumber ? referenceNumber : undefined,
        }

        const paymentResponse = await axios.post(`${API_BASE_URL}?action=approve-request-with-payment`, paymentData)
        
        if (!paymentResponse.data.success) {
          throw new Error(paymentResponse.data.message || "Coach assigned but payment processing failed")
        }
      }

      // Refresh data
      await Promise.all([fetchAssignedMembers(), fetchDashboardStats(), fetchActivityLog(), fetchAvailableMembers()])
      setAssignModalOpen(false)
      setSelectedMember(null)
      setSelectedMemberId("")
      setSelectedCoachId("")
      setSelectedCoach(null)
      setRateType("")
      setPaymentMethod("cash")
      setAmountReceived("")
      setReferenceNumber("")
    } catch (err) {
      console.error("Error assigning coach:", err)
      setError("Failed to assign coach: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
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

  const fetchAvailableCoaches = async () => {
    try {
      const response = await axios.get(COACH_API_URL)
      if (response.data && response.data.coaches) {
        // Map and filter duplicates by ID
        const coachesMap = new Map()
        response.data.coaches.forEach(coach => {
          if (coach.id && !coachesMap.has(coach.id)) {
            coachesMap.set(coach.id, {
              id: coach.id,
              name: `${coach.fname} ${coach.mname} ${coach.lname}`.trim(),
              monthly_rate: coach.monthly_rate || 0,
              session_package_rate: coach.session_package_rate || coach.package_rate || 0,
              per_session_rate: coach.per_session_rate || 0,
              is_available: coach.is_available !== undefined && coach.is_available !== null ? Boolean(coach.is_available) : true
            })
          }
        })
        setAvailableCoaches(Array.from(coachesMap.values()))
      }
    } catch (err) {
      console.error("Error fetching coaches:", err)
    }
  }

  const fetchAvailableMembers = async () => {
    try {
      // Fetch all members with gym membership (plan_id 1) for manual selection
      const response = await axios.get(`${API_BASE_URL}?action=available-members`)
      if (response.data.success) {
        // Filter duplicates by member ID
        const membersMap = new Map()
        const members = response.data.members || []
        members.forEach(member => {
          if (member.id && !membersMap.has(member.id)) {
            membersMap.set(member.id, member)
          }
        })
        setAvailableMembers(Array.from(membersMap.values()))
      }
    } catch (err) {
      console.error("Error fetching available members:", err)
    }
  }

  // Load all data
  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchAssignedMembers(), fetchDashboardStats(), fetchActivityLog(), fetchAvailableCoaches(), fetchAvailableMembers()])
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
      fetchAssignedMembers()
      fetchDashboardStats()
      fetchActivityLog()
      fetchAvailableMembers()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const openAssignModal = (member = null) => {
    if (member) {
      setSelectedMember(member)
      setSelectedMemberId(member.id)
    } else {
      setSelectedMember(null)
      setSelectedMemberId("")
    }
    setSelectedCoachId("")
    setAssignModalOpen(true)
  }

  const openManualConnectionModal = () => {
    setSelectedMember(null)
    setSelectedMemberId("")
    setSelectedCoachId("")
    setSelectedCoach(null)
    setRateType("monthly")
    setPaymentMethod("cash")
    setAmountReceived("")
    setReceiptNumber("")
    setAssignModalOpen(true)
  }

  const handleCoachSelect = (coachId) => {
    setSelectedCoachId(coachId)
    const coach = availableCoaches.find(c => c.id.toString() === coachId.toString())
    setSelectedCoach(coach || null)
    // Reset rate type to monthly when coach changes
    setRateType("monthly")
    setAmountReceived("")
  }

  const calculatePaymentAmount = () => {
    if (!selectedCoach) return 0
    switch (rateType) {
      case "monthly":
        return selectedCoach.monthly_rate || 0
      case "package":
        return selectedCoach.session_package_rate || 0
      case "per_session":
        return selectedCoach.per_session_rate || 0
      default:
        return 0
    }
  }

  const calculateChange = () => {
    if (paymentMethod !== "cash" || !amountReceived) return 0
    const received = parseFloat(amountReceived) || 0
    const amount = calculatePaymentAmount()
    return Math.max(0, received - amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"
    // Format in Philippines timezone
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatActivityAction = (action) => {
    switch (action) {
      case "assign_coach":
        return "Assigned coach to member"
      case "remove_coach_assignment":
        return "Removed coach assignment"
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

  const filteredMembers = assignedMembers.filter((assignment) => {
    // Filter by coach if selected
    if (selectedCoachFilter !== "all" && assignment.coach?.id?.toString() !== selectedCoachFilter) {
      return false
    }

    // Filter by search query
    const matchesSearch =
      assignment.member?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.coach?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.member?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.coach?.email?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

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
          <CheckCircle className="h-4 w-4 text-red-600" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Assigned Members</p>
                <p className="text-2xl font-bold">{dashboardStats.assigned_members || assignedMembers.length}</p>
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


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Coach Assignment Management
                  </CardTitle>
                  <CardDescription>View and manage coach assignments for members</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={openManualConnectionModal}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Create Manual Connection
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
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
              {/* Assigned Members Table */}
              <div className="space-y-4">
                  {/* Coach Filter */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filter by Coach:</span>
                    </div>
                    <Select value={selectedCoachFilter} onValueChange={setSelectedCoachFilter}>
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select a coach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Coaches ({assignedMembers.length})</SelectItem>
                        {Array.from(new Map(availableCoaches
                          .filter(coach => coach.id && coach.id.toString().trim() !== '')
                          .map(coach => [coach.id, coach])).values())
                          .map((coach, index) => {
                            const memberCount = assignedMembers.filter(assignment => assignment.coach?.id?.toString() === coach.id.toString()).length
                            return (
                              <SelectItem key={`filter-coach-${coach.id}-${index}`} value={coach.id.toString()}>
                                {coach.name} ({memberCount} member{memberCount !== 1 ? 's' : ''})
                              </SelectItem>
                            )
                          })}
                      </SelectContent>
                    </Select>
                  </div>
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
              </div>
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
              <div className="h-64 overflow-y-auto space-y-4 pr-2">
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

      {/* Assign Coach Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Manual Connection - POS System</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Assign a coach to a member and process payment.
            </p>
          </DialogHeader>
          <div className="space-y-6">
            {/* Member Selection - only show if no member pre-selected */}
            {!selectedMember && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Member (with Gym Membership - Plan ID 1 or 5)</label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 ? (
                      <SelectItem value="no-members" disabled>No members available</SelectItem>
                    ) : (
                      // Filter out duplicates and ensure unique keys
                      Array.from(new Map(availableMembers.map(member => [member.id, member])).values()).map((member, index) => (
                        <SelectItem key={`member-${member.id}-${index}`} value={member.id.toString()}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Member Info - show if member is pre-selected */}
            {selectedMember && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Member Information</h4>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg?height=40&width=40" />
                    <AvatarFallback>{getInitials(selectedMember.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedMember.name || "Unknown"}</div>
                    <div className="text-sm text-muted-foreground">{selectedMember.email || "N/A"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Coach Selection with Availability */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Coach</label>
              <Select value={selectedCoachId} onValueChange={handleCoachSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a coach..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCoaches.length === 0 ? (
                    <SelectItem value="no-coaches" disabled>No coaches available</SelectItem>
                  ) : (
                    // Filter out duplicates and ensure unique keys
                    Array.from(new Map(availableCoaches.map(coach => [coach.id, coach])).values()).map((coach, index) => (
                      <SelectItem key={`coach-${coach.id}-${index}`} value={coach.id.toString()} disabled={!coach.is_available}>
                        <div className="flex items-center gap-2">
                          {coach.is_available ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-red-600" />
                          )}
                          <span>{coach.name}</span>
                          {!coach.is_available && <span className="text-xs text-muted-foreground">(Unavailable)</span>}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedCoach && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {selectedCoach.is_available ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Available</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-4 w-4 text-red-600" />
                      <span>Unavailable</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Package Type Selection */}
            {selectedCoach && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Package Type</label>
                <Select value={rateType} onValueChange={(value) => { 
                  setRateType(value)
                  setAmountReceived("")
                  setReferenceNumber("")
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select package type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCoach.monthly_rate > 0 && (
                      <SelectItem value="monthly">
                        Monthly - ₱{selectedCoach.monthly_rate.toFixed(2)}
                      </SelectItem>
                    )}
                    {selectedCoach.session_package_rate > 0 && (
                      <SelectItem value="package">
                        Package - ₱{selectedCoach.session_package_rate.toFixed(2)}
                      </SelectItem>
                    )}
                    {selectedCoach.per_session_rate > 0 && (
                      <SelectItem value="per_session">
                        Per Session - ₱{selectedCoach.per_session_rate.toFixed(2)}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* POS System */}
            {selectedCoach && rateType && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-sm">Payment Information</h4>
                
                {/* Payment Amount Display */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Amount Due:</span>
                    <span className="text-lg font-bold text-blue-600">₱{calculatePaymentAmount().toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={(value) => { 
                    setPaymentMethod(value)
                    setAmountReceived("")
                    setReferenceNumber("")
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Received (for cash) */}
                {paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount Received</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  </div>
                )}

                {/* Reference Number (for GCash) */}
                {paymentMethod === "gcash" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reference Number <span className="text-red-500">*</span></label>
                    <Input
                      type="text"
                      placeholder="Enter GCash reference number"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Change Display (for cash) */}
                {paymentMethod === "cash" && amountReceived && calculateChange() > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Change:</span>
                      <span className="text-lg font-bold text-green-600">₱{calculateChange().toFixed(2)}</span>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignCoach}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={
                actionLoading || 
                !selectedCoachId || 
                (!selectedMemberId && !selectedMember?.id) ||
                !rateType ||
                (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < calculatePaymentAmount())) ||
                (paymentMethod === "gcash" && !referenceNumber)
              }
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              {calculatePaymentAmount() > 0 ? "Assign & Process Payment" : "Assign Coach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CoachAssignments
