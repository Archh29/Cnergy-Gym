"use client"

import { useState, useEffect, useContext } from "react"
import axios from "axios"
// No UserContext available in staff dashboard - will get userId from props
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

const SubscriptionMonitor = ({ userId }) => {
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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [confirmationData, setConfirmationData] = useState(null)

  useEffect(() => {
    fetchAllData()
    fetchSubscriptionPlans()
    fetchAvailableUsers()
  }, [])

  // Calculate change when amount received changes
  useEffect(() => {
    if (amountReceived && subscriptionForm.amount_paid) {
      const received = parseFloat(amountReceived) || 0;
      const amount = parseFloat(subscriptionForm.amount_paid) || 0;
      setChangeGiven(received - amount);
    } else {
      setChangeGiven(0);
    }
  }, [amountReceived, subscriptionForm.amount_paid]);

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
      console.log("=== FETCHING SUBSCRIPTION PLANS ===");
      const response = await axios.get(`${API_URL}?action=plans`)
      console.log("Subscription plans API response:", response.data);
      if (response.data.success) {
        setSubscriptionPlans(response.data.plans)
        console.log("âœ… Successfully set subscription plans:", response.data.plans)
      } else {
        console.error("âŒ Failed to fetch subscription plans:", response.data)
        setMessage({ type: "error", text: "Failed to load subscription plans" })
      }
    } catch (error) {
      console.error("âŒ Error fetching subscription plans:", error)
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
        console.log("âœ… API call successful")
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
        console.error("âŒ API response not successful or no data:", response.data)
        setSubscriptionPlans([])
        return {
          availablePlans: [],
          existingSubscriptions: [],
          hasActiveMemberFee: false
        }
      }
    } catch (error) {
      console.error("âŒ Error fetching available plans:", error)
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
    
    // Store the subscription ID for later use
    setCurrentSubscriptionId(subscriptionId);
    
    // Auto-generate receipt number with format SUB202509284924
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const autoReceiptNumber = `SUB${year}${month}${day}${hour}${minute}`;
    
    // Reset POS fields
    setPaymentMethod("cash");
    setAmountReceived("");
    setChangeGiven(0);
    setReceiptNumber(autoReceiptNumber);
    setTransactionNotes("");
    
    // Set up basic form data - we'll fetch the full details when the modal opens
    setSubscriptionForm({
      user_id: "",
      plan_id: "",
      start_date: new Date().toISOString().split("T")[0],
      discount_type: "none",
      amount_paid: "",
      payment_method: "cash",
      amount_received: "",
      notes: ""
    });
    
    // Show POS dialog immediately - let the modal handle fetching the data
    setIsCreateSubscriptionDialogOpen(true);
  }

  // Fetch subscription details for the POS modal
  const fetchSubscriptionDetails = async (subscriptionId) => {
    try {
      console.log("Fetching subscription details for ID:", subscriptionId);
      const response = await axios.get(`${API_URL}?action=get-subscription&id=${subscriptionId}`);
      
      if (response.data.success && response.data.subscription) {
        const sub = response.data.subscription;
        console.log("Fetched subscription details:", sub);
        
        // Update the form with the fetched data
        setSubscriptionForm(prev => ({
          ...prev,
          user_id: sub.user_id,
          plan_id: sub.plan_id,
          plan_name: sub.plan_name,
          amount_paid: sub.amount_paid || sub.price || "0"
        }));
        
        console.log("Updated subscription form:", {
          user_id: sub.user_id,
          plan_id: sub.plan_id,
          plan_name: sub.plan_name,
          amount_paid: sub.amount_paid || sub.price || "0"
        });
        
        // Set user info for display
        setSelectedUserInfo({
          fname: sub.fname,
          lname: sub.lname,
          email: sub.email
        });
        
        return sub;
      } else {
        console.error("Failed to fetch subscription details:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      return null;
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
    setMessage(null)
    
    if (!userId) {
      setMessage({ type: "error", text: "User session not found. Please log in again." })
      return
    }
    
    try {
      console.log("=== PROCESS PAYMENT BUTTON CLICKED ===");
      console.log("Current subscription form:", subscriptionForm);
      console.log("Payment method:", paymentMethod);
      console.log("Amount received:", amountReceived);
      console.log("Current subscription ID:", currentSubscriptionId);
      console.log("Current user ID:", userId);

      const totalAmount = parseFloat(subscriptionForm.amount_paid)
      const receivedAmount = parseFloat(amountReceived) || totalAmount

      if (paymentMethod === "cash" && receivedAmount < totalAmount) {
        setMessage({ 
          type: "error", 
          text: `Insufficient Payment: Amount received (â‚±${receivedAmount.toFixed(2)}) is less than required amount (â‚±${totalAmount.toFixed(2)}). Please collect â‚±${(totalAmount - receivedAmount).toFixed(2)} more.` 
        })
        return
      }

      if (currentSubscriptionId) {
        // Approve existing subscription
        await confirmSubscriptionTransaction()
      } else {
        // Create new manual subscription
        await createNewManualSubscription()
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create subscription"
      setMessage({ type: "error", text: errorMessage })
    }
  }

  const createNewManualSubscription = async () => {
    setActionLoading("create")
    setMessage(null)
    try {
      const totalAmount = parseFloat(subscriptionForm.amount_paid)
      const receivedAmount = parseFloat(amountReceived) || totalAmount
      const change = Math.max(0, receivedAmount - totalAmount)

      // Auto-generate receipt number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const autoReceiptNumber = `SUB${year}${month}${day}${hour}${minute}`;

      const response = await axios.post(`${API_URL}?action=create_manual`, {
        user_id: subscriptionForm.user_id,
        plan_id: subscriptionForm.plan_id,
        start_date: subscriptionForm.start_date,
        amount_paid: totalAmount,
        payment_method: paymentMethod,
        amount_received: receivedAmount,
        change_given: change,
        receipt_number: autoReceiptNumber,
        notes: transactionNotes,
        created_by: "Staff",
        staff_id: userId // Use current user ID - no fallback
      });

      if (response.data.success) {
        const confirmationData = {
          ...response.data.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          amount_received: receivedAmount,
          receipt_number: response.data.data.receipt_number
        };
        
        setConfirmationData(confirmationData);
        setShowConfirmationModal(true);
        setMessage({ type: "success", text: "Manual subscription created and payment processed successfully!" });
      } else {
        throw new Error(response.data.message || "Failed to create manual subscription");
      }
      
      setIsCreateSubscriptionDialogOpen(false)
      resetSubscriptionForm()
      await fetchAllData()
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create manual subscription"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
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
        const confirmationData = {
          ...response.data.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          amount_received: receivedAmount,
          receipt_number: response.data.receipt_number,
          is_approval: true
        };
        
        setConfirmationData(confirmationData);
        setShowConfirmationModal(true);
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
                resetSubscriptionForm()
                setIsCreateSubscriptionDialogOpen(true)
              }} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Manual Subscription
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

      {/* Manual Subscription Creation Dialog */}
      <Dialog open={isCreateSubscriptionDialogOpen} onOpenChange={setIsCreateSubscriptionDialogOpen}>
        <DialogContent 
          className="max-w-2xl" 
          onOpenAutoFocus={async (e) => {
            // Fetch subscription details when modal opens for approval
            if (currentSubscriptionId) {
              e.preventDefault();
              await fetchSubscriptionDetails(currentSubscriptionId);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {currentSubscriptionId ? "Process Payment & Approve Subscription" : "Create Manual Subscription"}
            </DialogTitle>
            <DialogDescription>
              {currentSubscriptionId 
                ? "Process payment to approve this subscription request"
                : "Create a new subscription manually and process payment through POS system"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Member Name *</Label>
                {currentSubscriptionId ? (
                  <Input
                    value={selectedUserInfo ? `${selectedUserInfo.fname} ${selectedUserInfo.lname}` : 'Loading...'}
                    disabled
                    placeholder="Loading member details..."
                  />
                ) : (
                  <Select value={subscriptionForm.user_id} onValueChange={handleUserSelection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {`${user.fname} ${user.lname} (${user.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Plan Name *</Label>
                {currentSubscriptionId ? (
                  <Input
                    value={subscriptionForm.plan_name || 'Loading...'}
                    disabled
                    placeholder="Loading plan details..."
                  />
                ) : (
                  <Select value={subscriptionForm.plan_id} onValueChange={handlePlanChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {`${plan.plan_name} - ₱${plan.price}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Amount to Pay (â‚±) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={subscriptionForm.amount_paid}
                  onChange={(e) => setSubscriptionForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <Label>Amount Received (â‚±)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Enter amount received"
                />
                {amountReceived && (
                  <div className="text-sm text-muted-foreground">
                    Change: â‚±{changeGiven.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="Add notes for this transaction"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSubscriptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateManualSubscription} 
              disabled={
                actionLoading === "create" ||
                !subscriptionForm.amount_paid ||
                !subscriptionForm.user_id ||
                !subscriptionForm.plan_id ||
                (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < parseFloat(subscriptionForm.amount_paid)))
              }
            >
              {actionLoading === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentSubscriptionId ? "Process Payment & Approve" : "Create Subscription & Process Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Transaction Successful
            </DialogTitle>
            <DialogDescription>
              {confirmationData?.is_approval 
                ? "Subscription has been approved and payment processed successfully"
                : "Manual subscription has been created and payment processed successfully"
              }
            </DialogDescription>
          </DialogHeader>
          
          {confirmationData && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">Transaction Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipt Number:</span>
                    <span className="font-mono font-semibold">{confirmationData.receipt_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member:</span>
                    <span className="font-medium">{confirmationData.user_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan:</span>
                    <span className="font-medium">{confirmationData.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-semibold">₱{confirmationData.total_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="capitalize">{confirmationData.payment_method}</span>
                  </div>
                  {confirmationData.payment_method === 'cash' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount Received:</span>
                        <span>₱{confirmationData.amount_received?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Change Given:</span>
                        <span>₱{confirmationData.change_given?.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span>{new Date(confirmationData.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span>{new Date(confirmationData.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This subscription is now active and the member can start using the gym facilities immediately.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={() => {
                setShowConfirmationModal(false)
                setConfirmationData(null)
              }} 
              className="w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionMonitor
