"use client"

import { useState, useEffect, useContext } from "react"
import axios from "axios"
// No UserContext available - will get userId from props
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
    discount_type: "regular",
    amount_paid: "",
    payment_method: "cash",
    amount_received: "",
    notes: ""
  })

  // Discount configuration - load from localStorage
  const [discountConfig, setDiscountConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gym-discounts')
      if (saved) {
        try {
          const discounts = JSON.parse(saved)
          const config = {}
          discounts.forEach((discount, index) => {
            // Use original keys for compatibility
            let key
            if (discount.name.toLowerCase().includes('regular')) {
              key = 'regular'
            } else if (discount.name.toLowerCase().includes('student')) {
              key = 'student'
            } else if (discount.name.toLowerCase().includes('senior')) {
              key = 'senior'
            } else {
              // For custom discounts, create a safe key
              key = discount.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            }

            config[key] = {
              name: discount.name,
              discount: discount.amount,
              description: discount.amount === 0 ? "No discount" : `${discount.name} - ₱${discount.amount} off`
            }
          })
          return config
        } catch (e) {
          console.error('Error parsing saved discounts:', e)
        }
      }
    }
    // Fallback to default discounts with original keys
    return {
      regular: { name: "Regular Rate", discount: 0, description: "No discount" },
      student: { name: "Student Discount", discount: 150, description: "Student discount - ₱150 off" },
      senior: { name: "Senior Discount", discount: 200, description: "Senior citizen discount - ₱200 off" }
    }
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

  // Calculate discounted price
  const calculateDiscountedPrice = (originalPrice, discountType) => {
    const discount = discountConfig[discountType]?.discount || 0;
    return Math.max(0, originalPrice - discount);
  }

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
        console.log("🔍 DEBUG - All subscriptions received:", response.data.subscriptions.length)
        if (response.data.subscriptions.length > 0) {
          const firstSub = response.data.subscriptions[0]
          console.log("🔍 DEBUG - First subscription:")
          console.log("  - ID:", firstSub.id)
          console.log("  - created_at:", firstSub.created_at)
          console.log("  - start_date:", firstSub.start_date)
          console.log("  - end_date:", firstSub.end_date)
          console.log("  - plan_name:", firstSub.plan_name)
          console.log("  - status_name:", firstSub.status_name)
          console.log("  - Full object:", firstSub)
        }
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
        console.log("🔍 DEBUG - Pending subscriptions received:", response.data.data?.length || 0)
        if (response.data.data && response.data.data.length > 0) {
          const firstPending = response.data.data[0]
          console.log("🔍 DEBUG - First pending subscription:")
          console.log("  - Subscription ID:", firstPending.subscription_id)
          console.log("  - created_at:", firstPending.created_at)
          console.log("  - start_date:", firstPending.start_date)
          console.log("  - end_date:", firstPending.end_date)
          console.log("  - plan_name:", firstPending.plan_name)
          console.log("  - status_name:", firstPending.status_name)
          console.log("  - Full object:", firstPending)
        }
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
        staff_id: userId
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
      console.log("User ID type:", typeof userId);
      console.log("User ID is null/undefined:", userId === null || userId === undefined);

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

    // Ensure userId is available
    let currentUserId = userId
    if (!currentUserId) {
      // Try to get from sessionStorage as fallback
      const storedUserId = sessionStorage.getItem("user_id")
      if (storedUserId) {
        currentUserId = parseInt(storedUserId)
        console.log("Using user_id from sessionStorage:", currentUserId)
      } else {
        setMessage({
          type: "error",
          text: "User session not found. Please refresh the page and try again. If the problem persists, please log out and log back in."
        })
        setActionLoading(null)
        return
      }
    }

    try {
      const totalAmount = parseFloat(subscriptionForm.amount_paid)
      const receivedAmount = parseFloat(amountReceived) || totalAmount
      const change = Math.max(0, receivedAmount - totalAmount)

      // CRITICAL: Validate payment before creating subscription
      if (totalAmount <= 0) {
        setMessage({
          type: "error",
          text: "Invalid payment amount. Amount must be greater than 0."
        })
        return
      }

      if (paymentMethod === "cash" && receivedAmount < totalAmount) {
        setMessage({
          type: "error",
          text: `Insufficient Payment: Amount received (₱${receivedAmount.toFixed(2)}) is less than required amount (₱${totalAmount.toFixed(2)}). Please collect ₱${(totalAmount - receivedAmount).toFixed(2)} more.`
        })
        return
      }

      // Auto-generate receipt number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const autoReceiptNumber = `SUB${year}${month}${day}${hour}${minute}`;

      const requestData = {
        user_id: subscriptionForm.user_id,
        plan_id: subscriptionForm.plan_id,
        start_date: subscriptionForm.start_date,
        amount_paid: totalAmount,
        payment_method: paymentMethod,
        amount_received: receivedAmount,
        change_given: change,
        receipt_number: autoReceiptNumber,
        notes: transactionNotes,
        created_by: "Admin",
        staff_id: currentUserId, // Use current user ID with fallback
        transaction_status: "confirmed", // CRITICAL: Mark transaction as confirmed
        discount_type: subscriptionForm.discount_type // Include discount type
      };

      console.log("Sending request data:", requestData);
      console.log("staff_id being sent:", requestData.staff_id);

      const response = await axios.post(`${API_URL}?action=create_manual`, requestData);

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

      // CRITICAL: Validate payment before approving subscription
      if (totalAmount <= 0) {
        setMessage({
          type: "error",
          text: "Invalid payment amount. Amount must be greater than 0."
        })
        return
      }

      if (paymentMethod === "cash" && receivedAmount < totalAmount) {
        setMessage({
          type: "error",
          text: `Insufficient Payment: Amount received (₱${receivedAmount.toFixed(2)}) is less than required amount (₱${totalAmount.toFixed(2)}). Please collect ₱${(totalAmount - receivedAmount).toFixed(2)} more.`
        })
        return
      }

      // Process payment and approve the existing subscription
      const response = await axios.post(`${API_URL}?action=approve_with_payment`, {
        subscription_id: currentSubscriptionId,
        payment_method: paymentMethod,
        amount_received: receivedAmount,
        notes: transactionNotes,
        receipt_number: receiptNumber || undefined,
        approved_by: "Admin",
        staff_id: userId,
        transaction_status: "confirmed" // CRITICAL: Mark transaction as confirmed
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
    if (selectedPlan) {
      const discountedPrice = calculateDiscountedPrice(selectedPlan.price, subscriptionForm.discount_type)
      setSubscriptionForm((prev) => ({
        ...prev,
        plan_id: planId,
        amount_paid: discountedPrice.toString(),
      }))
    }
  }

  const handleDiscountTypeChange = (discountType) => {
    const selectedPlan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find((plan) => plan.id == subscriptionForm.plan_id) : null
    if (selectedPlan) {
      const discountedPrice = calculateDiscountedPrice(selectedPlan.price, discountType)
      setSubscriptionForm((prev) => ({
        ...prev,
        discount_type: discountType,
        amount_paid: discountedPrice.toString(),
      }))
    } else {
      setSubscriptionForm((prev) => ({
        ...prev,
        discount_type: discountType,
      }))
    }
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

  // Calculate quantity/months based on payment amount
  const calculateMonths = (subscription) => {
    const amountPaid = parseFloat(subscription.amount_paid || subscription.discounted_price || 0)
    const planPrice = parseFloat(subscription.price || 0)

    if (planPrice > 0 && amountPaid > 0) {
      const months = Math.floor(amountPaid / planPrice)
      return months > 0 ? months : 1
    }
    return 1 // Default to 1 month if calculation fails
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
    if (!dateString) return "N/A"
    // Handle both date strings and timestamps
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"

    // Format in Philippines timezone
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  // Get analytics
  const getActiveSubscriptions = () => {
    return (subscriptions || []).filter((s) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = new Date(s.end_date)
      endDate.setHours(0, 0, 0, 0)
      return s.display_status === "Active" || (s.status_name === "approved" && endDate >= today)
    })
  }

  const getExpiringSoonSubscriptions = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    sevenDaysFromNow.setHours(23, 59, 59, 999)

    return (subscriptions || []).filter((s) => {
      const endDate = new Date(s.end_date)
      endDate.setHours(0, 0, 0, 0)
      return (s.display_status === "Active" || s.status_name === "approved") &&
        endDate >= today &&
        endDate <= sevenDaysFromNow
    })
  }

  const getExpiredSubscriptions = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (subscriptions || []).filter((s) => {
      const endDate = new Date(s.end_date)
      endDate.setHours(0, 0, 0, 0)
      return s.display_status === "Expired" || (s.status_name === "approved" && endDate < today)
    })
  }

  // Filter subscriptions
  const filterSubscriptions = (subscriptionList) => {
    return (subscriptionList || []).filter((subscription) => {
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
  }

  const filteredSubscriptions = filterSubscriptions(subscriptions)
  const activeSubscriptions = getActiveSubscriptions()
  const expiringSoonSubscriptions = getExpiringSoonSubscriptions()
  const expiredSubscriptions = getExpiredSubscriptions()

  // Get analytics
  const analytics = {
    total: subscriptions?.length || 0,
    pending: pendingSubscriptions?.length || 0,
    approved: subscriptions?.filter((s) => s.status_name === "approved" || s.status_name === "active")?.length || 0,
    declined: subscriptions?.filter((s) => s.status_name === "declined")?.length || 0,
    active: activeSubscriptions.length,
    expiringSoon: expiringSoonSubscriptions.length,
    expired: expiredSubscriptions.length,
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
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{analytics.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold">{analytics.expiringSoon}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold">{analytics.expired}</p>
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
                Monitor Subscription
                <Badge variant="outline">{analytics.pending} pending</Badge>
              </CardTitle>
              <CardDescription>Monitor subscription status and track upcoming expirations</CardDescription>
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
                Assign Subscription
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All ({analytics.total})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({analytics.pending})</TabsTrigger>
              <TabsTrigger value="active">Active ({analytics.active})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({analytics.expiringSoon})</TabsTrigger>
              <TabsTrigger value="expired">Expired ({analytics.expired})</TabsTrigger>
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
                                {(() => {
                                  const months = calculateMonths(subscription)
                                  return months > 1 ? (
                                    <div className="text-xs text-blue-600 font-medium mt-1">
                                      {months} month{months > 1 ? 's' : ''} availed
                                    </div>
                                  ) : null
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {(() => {
                                  const rawDate = subscription.created_at
                                  const formattedDate = formatDateTime(rawDate)
                                  console.log("🔍 DEBUG - Rendering pending subscription date:")
                                  console.log("  - Subscription ID:", subscription.subscription_id)
                                  console.log("  - Raw created_at:", rawDate)
                                  console.log("  - Type of created_at:", typeof rawDate)
                                  console.log("  - Formatted date:", formattedDate)
                                  console.log("  - Full subscription object:", subscription)
                                  return formattedDate
                                })()}
                              </div>
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

            <TabsContent value="active" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search members, emails, or plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* Plan Filter Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Filter by Plan:</span>
                  <Button
                    variant={planFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlanFilter("all")}
                  >
                    All Plans
                  </Button>
                  {subscriptionPlans.map((plan) => (
                    <Button
                      key={plan.id}
                      variant={planFilter === plan.plan_name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlanFilter(plan.plan_name)}
                    >
                      {plan.plan_name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Active Subscriptions Table */}
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
                    {!filterSubscriptions(activeSubscriptions) || filterSubscriptions(activeSubscriptions).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No active subscriptions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterSubscriptions(activeSubscriptions).map((subscription) => (
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
                              {(() => {
                                const months = calculateMonths(subscription)
                                return months > 1 ? (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    {months} month{months > 1 ? 's' : ''} availed
                                  </div>
                                ) : null
                              })()}
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
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search members, emails, or plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* Plan Filter Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Filter by Plan:</span>
                  <Button
                    variant={planFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlanFilter("all")}
                  >
                    All Plans
                  </Button>
                  {subscriptionPlans.map((plan) => (
                    <Button
                      key={plan.id}
                      variant={planFilter === plan.plan_name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlanFilter(plan.plan_name)}
                    >
                      {plan.plan_name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Upcoming Expiration Subscriptions Table */}
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
                    {!filterSubscriptions(expiringSoonSubscriptions) || filterSubscriptions(expiringSoonSubscriptions).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No subscriptions expiring within 7 days
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterSubscriptions(expiringSoonSubscriptions).map((subscription) => (
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
                              className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1 w-fit"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {subscription.display_status || subscription.status_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatDate(subscription.start_date)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-orange-600">{formatDate(subscription.end_date)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(subscription.total_paid || 0)}</div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="expired" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search members, emails, or plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* Plan Filter Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Filter by Plan:</span>
                  <Button
                    variant={planFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlanFilter("all")}
                  >
                    All Plans
                  </Button>
                  {subscriptionPlans.map((plan) => (
                    <Button
                      key={plan.id}
                      variant={planFilter === plan.plan_name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlanFilter(plan.plan_name)}
                    >
                      {plan.plan_name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Expired Subscriptions Table */}
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
                    {!filterSubscriptions(expiredSubscriptions) || filterSubscriptions(expiredSubscriptions).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No expired subscriptions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterSubscriptions(expiredSubscriptions).map((subscription) => (
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
                              className="bg-gray-100 text-gray-800 border-gray-200 flex items-center gap-1 w-fit"
                            >
                              {getStatusIcon(subscription.status_name)}
                              {subscription.display_status || subscription.status_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatDate(subscription.start_date)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-gray-500">{formatDate(subscription.end_date)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(subscription.total_paid || 0)}</div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-4">
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
                {/* Plan Filter Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Filter by Plan:</span>
                  <Button
                    variant={planFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlanFilter("all")}
                  >
                    All Plans
                  </Button>
                  {subscriptionPlans.map((plan) => (
                    <Button
                      key={plan.id}
                      variant={planFilter === plan.plan_name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlanFilter(plan.plan_name)}
                    >
                      {plan.plan_name}
                    </Button>
                  ))}
                </div>
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
                              {(() => {
                                const months = calculateMonths(subscription)
                                return months > 1 ? (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    {months} month{months > 1 ? 's' : ''} availed
                                  </div>
                                ) : null
                              })()}
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
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
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
              {currentSubscriptionId ? "Process Payment & Approve Subscription" : "Assign Subscription"}
            </DialogTitle>
            <DialogDescription>
              {currentSubscriptionId
                ? "Process payment to approve this subscription request"
                : "Assign a subscription to a member with discount options"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-gray-700">Member Name</Label>
                {currentSubscriptionId ? (
                  <Input
                    value={selectedUserInfo ? `${selectedUserInfo.fname} ${selectedUserInfo.lname}` : 'Loading...'}
                    disabled
                    placeholder="Loading member details..."
                    className="h-10 text-sm border border-gray-300 bg-gray-50"
                  />
                ) : (
                  <Select value={subscriptionForm.user_id} onValueChange={handleUserSelection}>
                    <SelectTrigger className="h-10 text-sm border border-gray-300">
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
                <Label className="text-sm text-gray-700">Plan Name</Label>
                {currentSubscriptionId ? (
                  <Input
                    value={subscriptionForm.plan_name || 'Loading...'}
                    disabled
                    placeholder="Loading plan details..."
                    className="h-10 text-sm border border-gray-300 bg-gray-50"
                  />
                ) : (
                  <Select value={subscriptionForm.plan_id} onValueChange={handlePlanChange}>
                    <SelectTrigger className="h-10 text-sm border border-gray-300">
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
                <Label className="text-sm text-gray-700">Amount to Pay</Label>
                {currentSubscriptionId ? (
                  <Input
                    value={subscriptionForm.amount_paid || '0.00'}
                    disabled
                    placeholder="Amount to pay"
                    className="h-10 text-sm border border-gray-300 bg-gray-50"
                  />
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    value={subscriptionForm.amount_paid}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    placeholder="Enter amount"
                    className="h-10 text-sm border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 text-sm border border-gray-300">
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

            {/* Discount Section */}
            <div className="space-y-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Discount Options</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {Object.entries(discountConfig).map(([key, config]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={subscriptionForm.discount_type === key ? "default" : "outline"}
                    className={`h-auto py-2 px-2.5 ${subscriptionForm.discount_type === key
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-white hover:bg-gray-50"
                      }`}
                    onClick={() => {
                      setSubscriptionForm(prev => ({ ...prev, discount_type: key }))
                      // Auto-calculate amount when discount changes
                      if (subscriptionForm.plan_id) {
                        const selectedPlan = subscriptionPlans.find(p => p.id.toString() === subscriptionForm.plan_id)
                        if (selectedPlan) {
                          const discountedPrice = calculateDiscountedPrice(selectedPlan.price, key)
                          setSubscriptionForm(prev => ({ ...prev, amount_paid: discountedPrice.toString() }))
                        }
                      }
                    }}
                  >
                    <div className="flex flex-col items-center w-full">
                      <span className="text-xs font-medium">{config.name}</span>
                      <span className={`text-xs mt-0.5 ${subscriptionForm.discount_type === key ? "text-blue-100" : "text-gray-500"}`}>
                        {config.amount === 0 || !config.amount
                          ? "No discount"
                          : `₱${config.amount} off`}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            {subscriptionForm.plan_id && (
              <div className="p-2.5 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-green-900 mb-1 text-xs font-medium">Price Breakdown</h4>
                <div className="text-sm text-green-700 space-y-1">
                  {(() => {
                    const selectedPlan = subscriptionPlans.find(p => p.id.toString() === subscriptionForm.plan_id)
                    const planPrice = parseFloat(selectedPlan?.price || 0)
                    const amountPaid = parseFloat(subscriptionForm.amount_paid || 0)
                    const months = planPrice > 0 && amountPaid > 0 ? Math.floor(amountPaid / planPrice) : 1
                    const discount = discountConfig[subscriptionForm.discount_type]?.discount || 0
                    const hasDiscount = subscriptionForm.discount_type !== 'regular' && discount > 0

                    return (
                      <>
                        <div className="flex justify-between">
                          <span>Original Price:</span>
                          <span>
                            {months > 1 ? (
                              <span className="font-medium">
                                ₱{planPrice.toFixed(2)} × {months} month{months > 1 ? 's' : ''} = ₱{(planPrice * months).toFixed(2)}
                              </span>
                            ) : (
                              `₱${planPrice.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        {hasDiscount && (
                          <div className="flex justify-between">
                            <span>Discount ({discountConfig[subscriptionForm.discount_type]?.name}):</span>
                            <span className="text-red-600">-₱{discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t border-green-300 pt-1">
                          <span>Final Price:</span>
                          <span>₱{amountPaid.toFixed(2)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="space-y-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="text-sm text-gray-700">Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Enter amount received"
                  className="h-10 text-sm border border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {amountReceived && (
                  <div className="mt-2 p-3 bg-white rounded-md border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Change:</span>
                      <span className="text-lg font-bold text-green-600">₱{changeGiven.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Notes (Optional)</Label>
              <Textarea
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="Add notes for this transaction"
                rows={1}
                className="text-sm border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none"
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
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 text-lg">
              <CheckCircle className="h-5 w-5" />
              Transaction Successful
            </DialogTitle>
            <DialogDescription className="text-sm">
              {confirmationData?.is_approval
                ? "Subscription approved and payment processed"
                : "Subscription created and payment processed"
              }
            </DialogDescription>
          </DialogHeader>

          {confirmationData && (
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <h4 className="text-green-800 mb-2 text-sm">Transaction Details</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipt:</span>
                    <span className="font-mono text-xs">{confirmationData.receipt_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member:</span>
                    <span>{confirmationData.user_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan:</span>
                    <span>{confirmationData.plan_name}</span>
                  </div>
                  <div className="flex justify-between border-t border-green-200 pt-1.5 mt-1.5">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="text-green-700">₱{confirmationData.total_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <span className="capitalize">{confirmationData.payment_method}</span>
                  </div>
                  {confirmationData.payment_method === 'cash' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Received:</span>
                        <span>₱{confirmationData.amount_received?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Change:</span>
                        <span>₱{confirmationData.change_given?.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  Subscription is now active
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

      {/* Decline Dialog */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => setDeclineDialog({ open, subscription: open ? declineDialog.subscription : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Subscription</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this subscription request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Decline Reason</Label>
              <Textarea
                placeholder="Enter reason for declining..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeclineDialog({ open: false, subscription: null })
                setDeclineReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={actionLoading === declineDialog.subscription?.subscription_id || !declineReason.trim()}
            >
              {actionLoading === declineDialog.subscription?.subscription_id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Decline Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionMonitor
