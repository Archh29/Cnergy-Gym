"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Plus,
  User,
  CreditCard,
} from "lucide-react"

const API_URL = "http://localhost/cynergy/monitor_subscription.php"

const SubscriptionMonitor = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [subscriptions, setSubscriptions] = useState([])
  const [pendingSubscriptions, setPendingSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)

  // New states for manual subscription creation
  const [isCreateSubscriptionDialogOpen, setIsCreateSubscriptionDialogOpen] = useState(false)
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUserInfo, setSelectedUserInfo] = useState(null)
  const [subscriptionForm, setSubscriptionForm] = useState({
    user_id: "",
    plan_id: "",
    start_date: new Date().toISOString().split("T")[0],
    discount_type: "none",
    amount_paid: "",
    payment_method: "cash",
    notes: "",
  })

  // Decline dialog state
  const [declineDialog, setDeclineDialog] = useState({
    open: false,
    subscription: null,
  })
  const [declineReason, setDeclineReason] = useState("")

  useEffect(() => {
    fetchAllData()
    fetchSubscriptionPlans()
    fetchAvailableUsers()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchSubscriptions(), fetchPendingSubscriptions()])
    } catch (error) {
      console.error("Error fetching data:", error)
      setMessage({ type: "error", text: "Failed to load subscription data" })
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(API_URL)
      if (response.data.success && Array.isArray(response.data.subscriptions)) {
        setSubscriptions(response.data.subscriptions)
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    }
  }

  const fetchPendingSubscriptions = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=pending`)
      if (response.data.success) {
        setPendingSubscriptions(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching pending subscriptions:", error)
    }
  }

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await axios.get("https://api.cnergy.site/subscription_plans.php")
      if (response.data.success) {
        setSubscriptionPlans(response.data.plans)
      }
    } catch (error) {
      console.error("Error fetching subscription plans:", error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=users`)
      if (response.data.success) {
        setAvailableUsers(response.data.users)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchAvailablePlansForUser = async (userId) => {
    try {
      console.log("Making API call to:", `${API_URL}?action=available-plans&user_id=${userId}`)
      const response = await axios.get(`${API_URL}?action=available-plans&user_id=${userId}`)
      
      console.log("=== FULL API RESPONSE ===")
      console.log("Response object:", response)
      console.log("Response data:", response.data)
      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)
      console.log("Response config:", response.config)
      
      // Check if response.data exists and has the expected structure
      if (response.data) {
        console.log("Response.data type:", typeof response.data)
        console.log("Response.data keys:", Object.keys(response.data))
        
        if (response.data.success) {
          console.log("✅ API call successful")
          console.log("Debug info:", response.data.debug_info)
          console.log("Available plans:", response.data.available_plans)
          console.log("Existing subscriptions:", response.data.existing_subscriptions)
          console.log("Has active member fee:", response.data.has_active_member_fee)
          
          setSubscriptionPlans(response.data.available_plans || [])
          return {
            availablePlans: response.data.available_plans || [],
            existingSubscriptions: response.data.existing_subscriptions || [],
            hasActiveMemberFee: response.data.has_active_member_fee || false
          }
        } else {
          console.error("❌ API response not successful:", response.data)
          setSubscriptionPlans([])
          return {
            availablePlans: [],
            existingSubscriptions: [],
            hasActiveMemberFee: false
          }
        }
      } else {
        console.error("❌ No response.data found")
        setSubscriptionPlans([])
        return {
          availablePlans: [],
          existingSubscriptions: [],
          hasActiveMemberFee: false
        }
      }
    } catch (error) {
      console.error("❌ Error fetching available plans:", error)
      console.error("Error message:", error.message)
      console.error("Error response:", error.response)
      if (error.response) {
        console.error("Error response data:", error.response.data)
        console.error("Error response status:", error.response.status)
      }
      setSubscriptionPlans([])
      return {
        availablePlans: [],
        existingSubscriptions: [],
        hasActiveMemberFee: false
      }
    }
  }

  const handleApprove = async (subscriptionId) => {
    setActionLoading(subscriptionId)
    setMessage(null)
    try {
      const response = await axios.post(`${API_URL}?action=approve`, {
        subscription_id: subscriptionId,
        approved_by: "Admin",
      })
      if (response.data.success) {
        setMessage({ type: "success", text: response.data.message })
        await fetchAllData()
      } else {
        setMessage({ type: "error", text: response.data.message })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to approve subscription"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async () => {
    if (!declineDialog.subscription) return
    setActionLoading(declineDialog.subscription.subscription_id)
    setMessage(null)
    try {
      const response = await axios.post(`${API_URL}?action=decline`, {
        subscription_id: declineDialog.subscription.subscription_id,
        declined_by: "Admin",
        decline_reason: declineReason,
      })
      if (response.data.success) {
        setMessage({ type: "success", text: response.data.message })
        setDeclineDialog({ open: false, subscription: null })
        setDeclineReason("")
        await fetchAllData()
      } else {
        setMessage({ type: "error", text: response.data.message })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to decline subscription"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateManualSubscription = async () => {
    setActionLoading("create")
    setMessage(null)
    try {
      const selectedPlan = subscriptionPlans.find((plan) => plan.id == subscriptionForm.plan_id)
      if (!selectedPlan) {
        throw new Error("Please select a subscription plan")
      }

      const subscriptionData = {
        user_id: subscriptionForm.user_id,
        plan_id: subscriptionForm.plan_id,
        start_date: subscriptionForm.start_date,
        discount_type: subscriptionForm.discount_type,
        amount_paid: subscriptionForm.amount_paid,
        payment_method: subscriptionForm.payment_method,
        notes: subscriptionForm.notes,
        created_by: "admin",
      }

      const response = await axios.post(`${API_URL}?action=create_manual`, subscriptionData)

      if (response.data.success) {
        setMessage({ type: "success", text: "Manual subscription created successfully!" })
        setIsCreateSubscriptionDialogOpen(false)
        resetSubscriptionForm()
        await fetchAllData()
      } else {
        throw new Error(response.data.message || "Failed to create subscription")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create subscription"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      user_id: "",
      plan_id: "",
      start_date: new Date().toISOString().split("T")[0],
      discount_type: "none",
      amount_paid: "",
      payment_method: "cash",
      notes: "",
    })
    setSelectedUserInfo(null)
    // Reset to all plans
    fetchSubscriptionPlans()
  }

  const handlePlanChange = (planId) => {
    const selectedPlan = subscriptionPlans.find((plan) => plan.id == planId)
    const discountedPrice = selectedPlan?.discounted_price || selectedPlan?.price || ""
    setSubscriptionForm((prev) => ({
      ...prev,
      plan_id: planId,
      amount_paid: prev.discount_type === "none" ? discountedPrice : prev.amount_paid,
    }))
  }

  const handleDiscountTypeChange = (discountType) => {
    const selectedPlan = subscriptionPlans.find((plan) => plan.id == subscriptionForm.plan_id)
    const discountedPrice = selectedPlan?.discounted_price || selectedPlan?.price || ""
    
    setSubscriptionForm((prev) => ({
      ...prev,
      discount_type: discountType,
      amount_paid: discountType === "none" ? discountedPrice : "",
    }))
  }

  const handleUserSelection = async (userId) => {
    try {
      setSubscriptionForm((prev) => ({
        ...prev,
        user_id: userId,
        plan_id: "", // Reset plan selection
      }))
      
      if (userId) {
        const userInfo = await fetchAvailablePlansForUser(userId)
        setSelectedUserInfo(userInfo)
      } else {
        setSelectedUserInfo(null)
        // Reset to all plans if no user selected
        fetchSubscriptionPlans()
      }
    } catch (error) {
      console.error("Error in handleUserSelection:", error)
      setSelectedUserInfo(null)
      setMessage({ type: "error", text: "Failed to load user information" })
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending_approval":
      case "pending approval":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "approved":
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "declined":
        return "bg-red-100 text-red-800 border-red-200"
      case "expired":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pending_approval":
      case "pending approval":
        return <Clock className="h-3 w-3" />
      case "approved":
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "declined":
        return <XCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Filter subscriptions
  const filteredSubscriptions = (subscriptions || []).filter((subscription) => {
    const matchesSearch =
      `${subscription.fname || ''} ${subscription.mname || ''} ${subscription.lname || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (subscription.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subscription.plan_name || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || subscription.status_name === statusFilter
    const matchesPlan = planFilter === "all" || subscription.plan_name === planFilter

    return matchesSearch && matchesStatus && matchesPlan
  })

  // Get analytics
  const analytics = {
    total: subscriptions?.length || 0,
    pending: pendingSubscriptions?.length || 0,
    approved: subscriptions?.filter((s) => s.status_name === "approved" || s.status_name === "active")?.length || 0,
    declined: subscriptions?.filter((s) => s.status_name === "declined")?.length || 0,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading subscription data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{analytics.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold">{analytics.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{analytics.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Declined</p>
              <p className="text-2xl font-bold">{analytics.declined}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Messages */}
      {message && (
        <Alert className={message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          {message.type === "error" ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Subscription Management
                <Badge variant="outline">{analytics.pending} pending</Badge>
              </CardTitle>
              <CardDescription>Monitor subscription requests and create manual subscriptions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsCreateSubscriptionDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Subscription
              </Button>
              <Button onClick={fetchAllData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">Pending Requests ({analytics.pending})</TabsTrigger>
              <TabsTrigger value="all">All Requests ({analytics.total})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {!pendingSubscriptions || pendingSubscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending subscription requests</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSubscriptions.map((subscription) => (
                        <TableRow key={subscription.subscription_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {subscription.fname[0]}
                                  {subscription.lname[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {`${subscription.fname} ${subscription.mname || ""} ${subscription.lname}`}
                                </div>
                                <div className="text-sm text-muted-foreground">{subscription.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{subscription.plan_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(subscription.price)}/month
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDateTime(subscription.created_at)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(subscription.subscription_id)}
                                disabled={actionLoading === subscription.subscription_id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading === subscription.subscription_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeclineDialog({ open: true, subscription })}
                                disabled={actionLoading === subscription.subscription_id}
                              >
                                <XCircle className="h-4 w-4" />
                                Decline
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search members, emails, or plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_approval">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* All Subscriptions Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Total Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!filteredSubscriptions || filteredSubscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {!subscriptions || subscriptions.length === 0 ? "No subscriptions found" : "No subscriptions match your search"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubscriptions.map((subscription) => (
                        <TableRow key={subscription.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {subscription.fname[0]}
                                  {subscription.lname[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {`${subscription.fname} ${subscription.mname || ""} ${subscription.lname}`}
                                </div>
                                <div className="text-sm text-muted-foreground">{subscription.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{subscription.plan_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(subscription.price)}/month
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getStatusColor(subscription.display_status || subscription.status_name)} flex items-center gap-1 w-fit`}
                            >
                              {getStatusIcon(subscription.status_name)}
                              {subscription.display_status || subscription.status_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatDate(subscription.start_date)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatDate(subscription.end_date)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(subscription.amount_paid || subscription.discounted_price || subscription.price)}</div>
                            <div className="text-sm text-muted-foreground">
                              {subscription.discount_type && subscription.discount_type !== "none" && (
                                <span className="text-orange-600">
                                  {subscription.discount_type} discount
                                </span>
                              )}
                              {subscription.payments?.length || 0} payment
                              {(subscription.payments?.length || 0) !== 1 ? "s" : ""}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Manual Subscription Dialog */}
      <Dialog open={isCreateSubscriptionDialogOpen} onOpenChange={setIsCreateSubscriptionDialogOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby="create-subscription-description">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Create Manual Subscription
            </DialogTitle>
            <DialogDescription id="create-subscription-description">
              Create a new subscription for a member with custom pricing and discount options.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Selection */}
            <div>
              <label className="text-sm font-medium">Select Member *</label>
              <Select
                value={subscriptionForm.user_id}
                onValueChange={handleUserSelection}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          {user.fname} {user.lname} - {user.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUserInfo && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Member Subscription Status</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Active Member Fee:</strong> {selectedUserInfo.hasActiveMemberFee ? "Yes" : "No"}</p>
                    <p><strong>Active Subscriptions:</strong> {selectedUserInfo.existingSubscriptions?.length || 0}</p>
                    {selectedUserInfo.existingSubscriptions && selectedUserInfo.existingSubscriptions.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Current Active Plans:</p>
                        <ul className="list-disc list-inside ml-2">
                          {selectedUserInfo.existingSubscriptions.map((sub, index) => (
                            <li key={index}>
                              {sub.plan_name || 'Unknown Plan'} (ID: {sub.plan_id || 'N/A'}) - Expires: {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Plan Selection */}
            <div>
              <label className="text-sm font-medium">Subscription Plan *</label>
              <Select value={subscriptionForm.plan_id} onValueChange={handlePlanChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a subscription plan" />
                </SelectTrigger>
                <SelectContent>
                  {!subscriptionPlans || subscriptionPlans.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {subscriptionForm.user_id ? "No available plans for this member" : "Please select a member first"}
                    </div>
                  ) : (
                    subscriptionPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <span>{plan.plan_name || 'Unknown Plan'}</span>
                            {plan.id === 2 && (
                              <span className="ml-2 text-xs text-blue-600">(Requires active member fee)</span>
                            )}
                            {plan.id === 3 && (
                              <span className="ml-2 text-xs text-green-600">(Standalone monthly)</span>
                            )}
                          </div>
                          <span className="ml-2 text-muted-foreground">
                            ${plan.discounted_price || plan.price || 0}/{plan.duration_months || 1} month{(plan.duration_months || 1) > 1 ? "s" : ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedUserInfo && (!subscriptionPlans || subscriptionPlans.length === 0) && (
                <p className="text-sm text-red-600 mt-1">
                  This member has no available subscription plans. They may already have active subscriptions to all plans.
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="text-sm font-medium">Start Date *</label>
              <Input
                type="date"
                value={subscriptionForm.start_date}
                onChange={(e) =>
                  setSubscriptionForm((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                className="mt-2"
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="text-sm font-medium">Discount Type *</label>
              <Select
                value={subscriptionForm.discount_type}
                onValueChange={handleDiscountTypeChange}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Discount</SelectItem>
                  <SelectItem value="student">Student Discount</SelectItem>
                  <SelectItem value="senior">Senior Discount</SelectItem>
                  <SelectItem value="promo">Promotional Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount Paid */}
            <div>
              <label className="text-sm font-medium">Amount Paid *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={subscriptionForm.amount_paid}
                onChange={(e) =>
                  setSubscriptionForm((prev) => ({
                    ...prev,
                    amount_paid: e.target.value,
                  }))
                }
                className="mt-2"
                disabled={subscriptionForm.discount_type === "none"}
              />
              {subscriptionForm.plan_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  {subscriptionForm.discount_type === "none" 
                    ? `Plan price: $${subscriptionPlans.find((p) => p.id == subscriptionForm.plan_id)?.discounted_price || subscriptionPlans.find((p) => p.id == subscriptionForm.plan_id)?.price || "0.00"}`
                    : "Enter the actual amount charged to the customer"
                  }
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={subscriptionForm.payment_method}
                onValueChange={(value) =>
                  setSubscriptionForm((prev) => ({
                    ...prev,
                    payment_method: value,
                  }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="paymaya">PayMaya</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                placeholder="Add any additional notes about this subscription..."
                value={subscriptionForm.notes}
                onChange={(e) =>
                  setSubscriptionForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Subscription Preview */}
            {subscriptionForm.plan_id && subscriptionForm.user_id && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Subscription Preview</h4>
                {(() => {
                  const selectedPlan = subscriptionPlans.find((p) => p.id == subscriptionForm.plan_id)
                  const selectedUser = availableUsers.find((u) => u.id == subscriptionForm.user_id)
                  if (!selectedPlan || !selectedUser) return null

                  const startDate = new Date(subscriptionForm.start_date)
                  const endDate = new Date(startDate)
                  endDate.setMonth(endDate.getMonth() + selectedPlan.duration_months)

                  return (
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>
                        <strong>Member:</strong> {selectedUser.fname} {selectedUser.lname}
                      </p>
                      <p>
                        <strong>Plan:</strong> {selectedPlan.plan_name}
                      </p>
                      <p>
                        <strong>Duration:</strong> {selectedPlan.duration_months} month
                        {selectedPlan.duration_months > 1 ? "s" : ""}
                      </p>
                      <p>
                        <strong>Start Date:</strong> {startDate.toLocaleDateString()}
                      </p>
                      <p>
                        <strong>End Date:</strong> {endDate.toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Discount Type:</strong> {subscriptionForm.discount_type === "none" ? "No Discount" : subscriptionForm.discount_type.charAt(0).toUpperCase() + subscriptionForm.discount_type.slice(1)}
                      </p>
                      <p>
                        <strong>Amount Paid:</strong> ${subscriptionForm.amount_paid || selectedPlan.discounted_price || selectedPlan.price}
                      </p>
                      <p>
                        <strong>Payment Method:</strong> {subscriptionForm.payment_method}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateSubscriptionDialogOpen(false)
                resetSubscriptionForm()
              }}
              disabled={actionLoading === "create"}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateManualSubscription}
              disabled={
                actionLoading === "create" ||
                !subscriptionForm.plan_id ||
                !subscriptionForm.user_id ||
                !subscriptionForm.amount_paid
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => setDeclineDialog({ open, subscription: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Subscription Request</DialogTitle>
          </DialogHeader>
          {declineDialog.subscription && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p>
                  <strong>Member:</strong> {`${declineDialog.subscription.fname} ${declineDialog.subscription.lname}`}
                </p>
                <p>
                  <strong>Plan:</strong> {declineDialog.subscription.plan_name}
                </p>
                <p>
                  <strong>Price:</strong> {formatCurrency(declineDialog.subscription.price)}/month
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Reason for decline (optional)</label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Enter reason for declining this subscription request..."
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialog({ open: false, subscription: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={actionLoading !== null}>
              {actionLoading !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                "Decline Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionMonitor
