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
import { Label } from "@/components/ui/label"
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
  Receipt,
} from "lucide-react"

const API_URL = "https://api.cnergy.site/monitor_subscription.php"

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
    amount_received: "",
    notes: ""
  })

  // Decline dialog state
  const [declineDialog, setDeclineDialog] = useState({
    open: false,
    subscription: null,
  })
  const [declineReason, setDeclineReason] = useState("")

  // POS state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [changeGiven, setChangeGiven] = useState(0)
  const [receiptNumber, setReceiptNumber] = useState("")
  const [transactionNotes, setTransactionNotes] = useState("")
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)

  useEffect(() => {
    console.log("=== COMPONENT INITIALIZATION ===");
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
      console.log("=== FETCHING PENDING SUBSCRIPTIONS ===");
      const response = await axios.get(`${API_URL}?action=pending`)
      console.log("Pending subscriptions response:", response.data);
      if (response.data.success) {
        setPendingSubscriptions(response.data.data)
        console.log("Set pending subscriptions:", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching pending subscriptions:", error)
    }
  }

  const fetchSubscriptionPlans = async () => {
    try {
      console.log("=== FETCHING SUBSCRIPTION PLANS ===");
      const response = await axios.get(`${API_URL}?action=plans`)
      console.log("Subscription plans API response:", response.data);
      if (response.data.success) {
        setSubscriptionPlans(response.data.plans)
        console.log("✅ Successfully set subscription plans:", response.data.plans)
      } else {
        console.error("❌ Failed to fetch subscription plans:", response.data)
        setMessage({ type: "error", text: "Failed to load subscription plans" })
      }
    } catch (error) {
      console.error("❌ Error fetching subscription plans:", error)
      setMessage({ type: "error", text: "Failed to load subscription plans" })
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
      const apiUrl = `${API_URL}?action=available-plans&user_id=${userId}`
      console.log("Making API call to:", apiUrl)
      console.log("API_URL constant:", API_URL)
      
      const response = await axios.get(apiUrl)
      
      console.log("=== FULL API RESPONSE ===")
      console.log("Response status:", response.status)
      console.log("Response data:", response.data)
      console.log("Response data type:", typeof response.data)
      console.log("Response data keys:", Object.keys(response.data || {}))
      
      // Check if response.data exists and has the expected structure
      if (response.data && response.data.success) {
        console.log("✅ API call successful")
        console.log("Available plans:", response.data.plans)
        console.log("Active subscriptions:", response.data.active_subscriptions)
        console.log("Has active member fee:", response.data.has_active_member_fee)
        console.log("Active plan IDs:", response.data.active_plan_ids)
        
        setSubscriptionPlans(response.data.plans || [])
        return {
          availablePlans: response.data.plans || [],
          existingSubscriptions: response.data.active_subscriptions || [],
          hasActiveMemberFee: response.data.has_active_member_fee || false
        }
      } else {
        console.error("❌ API response not successful or no data:", response.data)
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
    console.log("=== HANDLE APPROVE DEBUG ===");
    console.log("Subscription ID:", subscriptionId);
    console.log("Pending subscriptions:", pendingSubscriptions);
    console.log("Available subscription plans:", subscriptionPlans);
    
    // Find the subscription to get details
    const subscription = pendingSubscriptions && Array.isArray(pendingSubscriptions) ? pendingSubscriptions.find(s => s.subscription_id === subscriptionId) : null;
    console.log("Found subscription:", subscription);
    
    if (!subscription) {
      setMessage({ type: "error", text: "Subscription not found" });
      return;
    }

    // Check if we have the required fields
    if (!subscription.plan_id && !subscription.plan_name) {
      setMessage({ type: "error", text: "Subscription plan information is missing" });
      return;
    }

    // Find the subscription plan to get price - try both subscriptionPlans and fetch from API if needed
    let plan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find(p => p.id == subscription.plan_id) : null;
    console.log("Found plan in subscriptionPlans:", plan);
    
    // If plan not found in current array, try to fetch it from the subscription data itself
    if (!plan) {
      console.log("Plan not found in subscriptionPlans, using subscription data");
      // Use the plan data from the subscription itself
      plan = {
        id: subscription.plan_id || subscription.id, // fallback to subscription.id if plan_id is missing
        plan_name: subscription.plan_name,
        price: subscription.price,
        discounted_price: subscription.price,
        duration_months: subscription.duration_months || 1
      };
      console.log("Created plan from subscription data:", plan);
    }

    // Final check - if we still don't have a plan, show error
    if (!plan || (!plan.id && !plan.plan_name)) {
      console.error("No plan data available:", { plan, subscription });
      setMessage({ type: "error", text: "Subscription plan not found - missing plan data" });
      return;
    }

    // Store the subscription ID for later use
    setCurrentSubscriptionId(subscriptionId);
    
    // Set up POS data for this subscription
    setSubscriptionForm({
      user_id: subscription.user_id,
      plan_id: plan.id || subscription.plan_id,
      start_date: new Date().toISOString().split("T")[0],
      discount_type: "none",
      amount_paid: plan.price || plan.discounted_price || subscription.price || "0",
      payment_method: "cash",
      amount_received: "",
      notes: ""
    });
    
    // Reset POS fields
    setPaymentMethod("cash");
    setAmountReceived("");
    setChangeGiven(0);
    setReceiptNumber("");
    setTransactionNotes("");
    
    console.log("Set subscription form:", {
      user_id: subscription.user_id,
      plan_id: plan.id || subscription.plan_id,
      amount_paid: plan.price || plan.discounted_price || subscription.price || "0"
    });
    
    // Show POS dialog
    setIsCreateSubscriptionDialogOpen(true);
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
    setMessage(null)
    try {
      const selectedPlan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find((plan) => plan.id == subscriptionForm.plan_id) : null
      if (!selectedPlan) {
        throw new Error("Please select a subscription plan")
      }

      const totalAmount = parseFloat(subscriptionForm.amount_paid)
      const receivedAmount = parseFloat(subscriptionForm.amount_received) || totalAmount

      if (subscriptionForm.payment_method === "cash" && receivedAmount < totalAmount) {
        setMessage({ 
          type: "error", 
          text: `Insufficient Payment: Amount received (₱${receivedAmount.toFixed(2)}) is less than required amount (₱${totalAmount.toFixed(2)}). Please collect ₱${(totalAmount - receivedAmount).toFixed(2)} more.` 
        })
        return
      }

      setShowConfirmDialog(true)
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create subscription"
      setMessage({ type: "error", text: errorMessage })
    }
  }

  const confirmSubscriptionTransaction = async () => {
    setShowConfirmDialog(false)
    setActionLoading("create")
    setMessage(null)
    try {
      const selectedPlan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find((plan) => plan.id == subscriptionForm.plan_id) : null
      const totalAmount = parseFloat(subscriptionForm.amount_paid)
      const receivedAmount = parseFloat(amountReceived) || totalAmount
      const change = Math.max(0, receivedAmount - totalAmount)

      // Use the stored subscription ID
      if (!currentSubscriptionId) {
        setMessage({ type: "error", text: "No subscription selected for approval" });
        return;
      }

      // Process payment and approve the existing subscription
      const response = await axios.post(`${API_URL}?action=approve_with_payment`, {
        subscription_id: currentSubscriptionId,
        payment_method: paymentMethod,
        amount_received: receivedAmount,
        notes: transactionNotes,
        receipt_number: receiptNumber || undefined,
        approved_by: "Admin"
      });

      if (response.data.success) {
        setLastTransaction({
          ...response.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          amount_received: receivedAmount
        });
        setReceiptNumber(response.data.receipt_number);
        setChangeGiven(change);
        setShowReceipt(true);
        
        setMessage({ type: "success", text: "Subscription approved and POS payment processed successfully!" });
      } else {
        throw new Error(response.data.message || "Failed to approve subscription with payment");
      }
      
      setIsCreateSubscriptionDialogOpen(false)
      resetSubscriptionForm()
      await fetchAllData()
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to process subscription payment"
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
      amount_received: "",
      notes: ""
    })
    setSelectedUserInfo(null)
    // Reset to all plans
    fetchSubscriptionPlans()
  }

  const handlePlanChange = (planId) => {
    const selectedPlan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find((plan) => plan.id == planId) : null
    const discountedPrice = selectedPlan?.discounted_price || selectedPlan?.price || ""
    setSubscriptionForm((prev) => ({
      ...prev,
      plan_id: planId,
      amount_paid: prev.discount_type === "none" ? discountedPrice : prev.amount_paid,
    }))
  }

  const handleDiscountTypeChange = (discountType) => {
    const selectedPlan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find((plan) => plan.id == subscriptionForm.plan_id) : null
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

  // POS Functions
  const calculateChange = () => {
    const total = parseFloat(subscriptionForm.amount_paid) || 0
    const received = parseFloat(subscriptionForm.amount_received) || 0
    const change = Math.max(0, received - total)
    setChangeGiven(change)
    return change
  }

  // Calculate change whenever amount received or amount paid changes
  useEffect(() => {
    if (subscriptionForm.payment_method === "cash" && subscriptionForm.amount_received) {
      calculateChange()
    }
  }, [subscriptionForm.amount_received, subscriptionForm.amount_paid, subscriptionForm.payment_method])

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
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
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
              <Button onClick={fetchAllData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => {
                console.log("=== MANUAL DEBUG TEST ===");
                console.log("Pending subscriptions:", pendingSubscriptions);
                console.log("Subscription plans:", subscriptionPlans);
                console.log("Available users:", availableUsers);
              }} variant="outline" size="sm">
                Debug Data
              </Button>
              <Button onClick={async () => {
                console.log("=== API TEST ===");
                try {
                  const response = await axios.get(`${API_URL}?action=pending`);
                  console.log("Pending API response:", response.data);
                } catch (error) {
                  console.error("Pending API error:", error);
                }
                try {
                  const response = await axios.get(`${API_URL}?action=plans`);
                  console.log("Plans API response:", response.data);
                } catch (error) {
                  console.error("Plans API error:", error);
                }
              }} variant="outline" size="sm">
                Test API
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
                      {pendingSubscriptions.map((subscription) => {
                        console.log("Rendering subscription row:", subscription);
                        return (
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
                              {subscription.status_name === 'pending_approval' ? 'Pending' : subscription.status_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  console.log("Approve button clicked for subscription:", subscription);
                                  handleApprove(subscription.subscription_id);
                                }}
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
                        );
                      })}
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
                            <div className="font-medium">{formatCurrency(subscription.total_paid || 0)}</div>
                            <div className="text-sm text-muted-foreground">
                              {subscription.discount_type && subscription.discount_type !== "none" && (
                                <span className="text-orange-600">
                                  {subscription.discount_type} discount
                                </span>
                              )}
                              {subscription.total_paid === 0 && (
                                <span className="text-red-600">
                                  No payments received
                                </span>
                              )}
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
        <DialogContent 
          className="sm:max-w-lg h-[80vh] flex flex-col" 
          aria-describedby="create-subscription-description"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              POS - Process Payment & Approve Subscription
            </DialogTitle>
            <DialogDescription id="create-subscription-description">
              Process payment through POS system to approve this subscription request.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Member *</label>
              <Select
                value={subscriptionForm.user_id}
                onValueChange={handleUserSelection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.filter(user => user.id && user.fname && user.lname).map((user) => (
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
                              {sub.plan_name || 'Unknown Plan'} - Expires: {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedUserInfo.existingSubscriptions && selectedUserInfo.existingSubscriptions.length === 0 && (
                      <p className="text-green-600 font-medium">No active subscriptions - can purchase any available plan</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Plan Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription Plan *</label>
              <Select value={subscriptionForm.plan_id} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subscription plan" />
                </SelectTrigger>
                <SelectContent>
                  {!subscriptionPlans || subscriptionPlans.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {subscriptionForm.user_id ? "No available plans for this member" : "Please select a member first"}
                    </div>
                  ) : (
                    subscriptionPlans.filter(plan => plan.id && plan.plan_name).map((plan) => (
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
                            ₱{plan.discounted_price || plan.price || 0}/{plan.duration_months || 1} month{(plan.duration_months || 1) > 1 ? "s" : ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedUserInfo && (!subscriptionPlans || subscriptionPlans.length === 0) && (
                <div className="text-sm text-red-600 mt-1 p-2 bg-red-50 rounded border border-red-200">
                  <p className="font-medium">No available subscription plans for this member.</p>
                  <p>Possible reasons:</p>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Already has active subscriptions to all plans</li>
                    <li>Has Member Fee but trying to access Non-Member Plan</li>
                    <li>Doesn't have Member Fee but trying to access Member Plan Monthly</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
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
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Discount Type *</label>
              <Select
                value={subscriptionForm.discount_type}
                onValueChange={handleDiscountTypeChange}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
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
                disabled={subscriptionForm.discount_type === "none"}
              />
              {subscriptionForm.plan_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  {subscriptionForm.discount_type === "none" 
                    ? `Plan price: ₱${subscriptionPlans && Array.isArray(subscriptionPlans) ? (subscriptionPlans.find((p) => p.id == subscriptionForm.plan_id)?.discounted_price || subscriptionPlans.find((p) => p.id == subscriptionForm.plan_id)?.price || "0.00") : "0.00"}`
                    : "Enter the actual amount charged to the customer"
                  }
                </p>
              )}
            </div>

            {/* POS Payment Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Receipt className="mr-2 h-4 w-4" />
                POS Payment Processing
              </h4>
              
              <div className="space-y-4">
                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method *</label>
                  <Select 
                    value={paymentMethod} 
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="digital">Digital Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cash Payment Fields */}
                {paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount Received (₱)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="Enter amount received from customer"
                    />
                    {amountReceived && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex justify-between text-sm">
                          <span>Total Amount:</span>
                          <span className="font-medium">₱{parseFloat(subscriptionForm.amount_paid || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Amount Received:</span>
                          <span className="font-medium">₱{parseFloat(amountReceived || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                          <span>Change Given:</span>
                          <span className={changeGiven >= 0 ? "text-green-600" : "text-red-600"}>
                            ₱{changeGiven.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Receipt Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Receipt Number</label>
                  <Input
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="Auto-generated if left empty"
                  />
                </div>

                {/* Transaction Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Notes</label>
                  <Textarea
                    value={transactionNotes}
                    onChange={(e) => setTransactionNotes(e.target.value)}
                    placeholder="Add notes for this transaction (optional)"
                    rows={3}
                  />
                </div>
              </div>
            </div>


            {/* Subscription Preview */}
            {subscriptionForm.plan_id && subscriptionForm.user_id && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Subscription Preview</h4>
                {(() => {
                  const selectedPlan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find((p) => p.id == subscriptionForm.plan_id) : null
                  const selectedUser = availableUsers && Array.isArray(availableUsers) ? availableUsers.find((u) => u.id == subscriptionForm.user_id) : null
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
                        <strong>Amount Paid:</strong> ₱{subscriptionForm.amount_paid || selectedPlan.discounted_price || selectedPlan.price}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2 border-t pt-4 flex-shrink-0">
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
                !subscriptionForm.amount_paid ||
                (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < parseFloat(subscriptionForm.amount_paid)))
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Receipt className="mr-2 h-4 w-4" />
              Process POS Payment & Approve
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Subscription Transaction</DialogTitle>
            <DialogDescription>Please review the transaction details before proceeding</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Subscription Details:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Member:</span>
                  <span>
                    {availableUsers && Array.isArray(availableUsers) ? (availableUsers.find(u => u.id == subscriptionForm.user_id)?.fname || '') : ''} {availableUsers && Array.isArray(availableUsers) ? (availableUsers.find(u => u.id == subscriptionForm.user_id)?.lname || '') : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span>
                    {subscriptionPlans && Array.isArray(subscriptionPlans) ? (subscriptionPlans.find(p => p.id == subscriptionForm.plan_id)?.plan_name || '') : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span>{subscriptionForm.start_date}</span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-2 space-y-2">
              <div className="flex justify-between font-medium">
                <span>Total Amount:</span>
                <span>₱{parseFloat(subscriptionForm.amount_paid || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="capitalize">{paymentMethod}</span>
              </div>
              {paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between">
                    <span>Amount Received:</span>
                    <span>₱{parseFloat(amountReceived || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Change Given:</span>
                    <span className={changeGiven >= 0 ? "text-green-600" : "text-red-600"}>
                      ₱{changeGiven.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {receiptNumber && (
                <div className="flex justify-between">
                  <span>Receipt Number:</span>
                  <span className="font-mono text-sm">{receiptNumber}</span>
                </div>
              )}
              {transactionNotes && (
                <div className="pt-2">
                  <p className="text-sm">
                    <strong>Notes:</strong> {transactionNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSubscriptionTransaction} disabled={actionLoading === "create"}>
              {actionLoading === "create" ? "Processing..." : "Confirm Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subscription Receipt</DialogTitle>
            <DialogDescription>Subscription created successfully</DialogDescription>
          </DialogHeader>
          {lastTransaction && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-bold">CNERGY GYM</h3>
                <p className="text-sm text-muted-foreground">Subscription Receipt</p>
                <p className="text-xs text-muted-foreground">Receipt #: {receiptNumber}</p>
                <p className="text-xs text-muted-foreground">
                  Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Member:</span>
                  <span className="font-medium">
                    {availableUsers && Array.isArray(availableUsers) ? (availableUsers.find(u => u.id == subscriptionForm.user_id)?.fname || '') : ''} {availableUsers && Array.isArray(availableUsers) ? (availableUsers.find(u => u.id == subscriptionForm.user_id)?.lname || '') : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span className="font-medium">
                    {subscriptionPlans && Array.isArray(subscriptionPlans) ? (subscriptionPlans.find(p => p.id == subscriptionForm.plan_id)?.plan_name || '') : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium capitalize">{lastTransaction.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">₱{lastTransaction.total_amount}</span>
                </div>
                {lastTransaction.payment_method === "cash" && (
                  <>
                    <div className="flex justify-between">
                      <span>Amount Received:</span>
                      <span>₱{lastTransaction.amount_received || lastTransaction.total_amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change Given:</span>
                      <span className="font-medium text-green-600">₱{lastTransaction.change_given || changeGiven}</span>
                    </div>
                  </>
                )}
              </div>

              {transactionNotes && (
                <div className="border-t pt-2">
                  <p className="text-sm">
                    <strong>Notes:</strong> {transactionNotes}
                  </p>
                </div>
              )}

              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">Thank you for choosing CNERGY!</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowReceipt(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionMonitor
