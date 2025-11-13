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
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const API_URL = "https://api.cnergy.site/monitor_subscription.php"

const SubscriptionMonitor = ({ userId }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
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

  // Pagination state for each tab
  const [currentPage, setCurrentPage] = useState({
    pending: 1,
    active: 1,
    upcoming: 1,
    expired: 1,
    all: 1
  })
  const [itemsPerPage] = useState(15) // 15 entries per page

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
        notes: "",
        created_by: "Admin",
        staff_id: currentUserId, // Use current user ID with fallback
        transaction_status: "confirmed", // CRITICAL: Mark transaction as confirmed
        discount_type: subscriptionForm.discount_type // Include discount type
      };

      console.log("Sending request data:", requestData);
      console.log("staff_id being sent:", requestData.staff_id);
      console.log("Payment method in request data:", requestData.payment_method);
      console.log("Payment method variable:", paymentMethod);
      console.log("Full request data JSON:", JSON.stringify(requestData, null, 2));

      const response = await axios.post(`${API_URL}?action=create_manual`, requestData);

      console.log("Response received:", response.data);
      if (response.data.data) {
        console.log("Response payment_method:", response.data.data.payment_method);
      }

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
        notes: "",
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
        return "bg-red-100 text-red-700 border-red-300"
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
      case "expired":
        return <XCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"
    // Format date only in Philippines timezone
    return date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
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

  // Calculate days left until end date
  const calculateDaysLeft = (endDate) => {
    if (!endDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Calculate time remaining with hours when 1 day or less
  const calculateTimeRemaining = (endDate) => {
    if (!endDate) return null
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()

    if (diffTime < 0) {
      // Expired
      const daysAgo = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24))
      return { type: 'expired', days: daysAgo }
    }

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const totalHours = Math.floor(diffTime / (1000 * 60 * 60))

    if (diffDays <= 1) {
      // Show hours when 1 day or less (show total hours)
      return { type: 'hours', days: diffDays, hours: totalHours }
    }

    return { type: 'days', days: diffDays }
  }

  // Get analytics - filter by plan if planFilter is set
  const getActiveSubscriptions = () => {
    return (subscriptions || []).filter((s) => {
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

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
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

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
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

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

      // Month filter logic
      let matchesMonth = true
      if (monthFilter !== "all" && subscription.start_date) {
        const subscriptionDate = new Date(subscription.start_date)
        const today = new Date()
        const currentMonth = today.getMonth()
        const currentYear = today.getFullYear()

        if (monthFilter === "this_month") {
          matchesMonth = subscriptionDate.getMonth() === currentMonth &&
            subscriptionDate.getFullYear() === currentYear
        } else if (monthFilter === "last_3_months") {
          const threeMonthsAgo = new Date(today)
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
          matchesMonth = subscriptionDate >= threeMonthsAgo && subscriptionDate <= today
        } else {
          // Specific month (1-12)
          const monthNum = parseInt(monthFilter)
          if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            // If year filter is set, use that year, otherwise check all years
            if (yearFilter !== "all") {
              let targetYear = currentYear
              if (yearFilter === "this_year") {
                targetYear = currentYear
              } else if (yearFilter === "last_year") {
                targetYear = currentYear - 1
              } else if (yearFilter === "last_last_year") {
                targetYear = currentYear - 2
              } else {
                targetYear = parseInt(yearFilter)
              }
              matchesMonth = subscriptionDate.getMonth() === monthNum - 1 &&
                subscriptionDate.getFullYear() === targetYear
            } else {
              // Just match the month in any year
              matchesMonth = subscriptionDate.getMonth() === monthNum - 1
            }
          }
        }
      }

      // Year filter logic
      let matchesYear = true
      if (yearFilter !== "all" && subscription.start_date) {
        const subscriptionDate = new Date(subscription.start_date)
        const today = new Date()
        const currentYear = today.getFullYear()

        if (yearFilter === "this_year") {
          matchesYear = subscriptionDate.getFullYear() === currentYear
        } else if (yearFilter === "last_year") {
          matchesYear = subscriptionDate.getFullYear() === currentYear - 1
        } else if (yearFilter === "last_last_year") {
          matchesYear = subscriptionDate.getFullYear() === currentYear - 2
        } else {
          // Specific year (numeric string)
          const yearNum = parseInt(yearFilter)
          if (!isNaN(yearNum)) {
            matchesYear = subscriptionDate.getFullYear() === yearNum
          }
        }
      }

      return matchesSearch && matchesStatus && matchesPlan && matchesMonth && matchesYear
    })
  }

  const filteredSubscriptions = filterSubscriptions(subscriptions)
  const activeSubscriptions = getActiveSubscriptions()
  const expiringSoonSubscriptions = getExpiringSoonSubscriptions()
  const expiredSubscriptions = getExpiredSubscriptions()

  // Pagination helper function
  const getPaginatedData = (data, tabKey) => {
    const page = currentPage[tabKey] || 1
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return {
      paginated: data.slice(startIndex, endIndex),
      totalPages: Math.max(1, Math.ceil(data.length / itemsPerPage)),
      currentPage: page,
      totalItems: data.length
    }
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage({
      pending: 1,
      active: 1,
      upcoming: 1,
      expired: 1,
      all: 1
    })
  }, [searchQuery, statusFilter, planFilter, monthFilter, yearFilter])

  // Get analytics - filtered by plan if planFilter is set
  const getFilteredSubscriptionsByPlan = () => {
    if (planFilter === "all") {
      return subscriptions || []
    }
    return (subscriptions || []).filter((s) => s.plan_name === planFilter)
  }

  const getFilteredPendingByPlan = () => {
    if (planFilter === "all") {
      return pendingSubscriptions || []
    }
    return (pendingSubscriptions || []).filter((s) => s.plan_name === planFilter)
  }

  const filteredByPlan = getFilteredSubscriptionsByPlan()
  const filteredPendingByPlan = getFilteredPendingByPlan()

  // Get analytics
  const analytics = {
    total: filteredByPlan?.length || 0,
    pending: filteredPendingByPlan?.length || 0,
    approved: filteredByPlan?.filter((s) => s.status_name === "approved" || s.status_name === "active")?.length || 0,
    declined: filteredByPlan?.filter((s) => s.status_name === "declined")?.length || 0,
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
    <div className="space-y-6 p-4 md:p-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-slate-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-slate-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {planFilter !== "all" ? "Total Requests" : "Total Requests"}
              </p>
              <p className="text-3xl font-bold text-slate-900">{analytics.total}</p>
              {planFilter !== "all" && (
                <p className="text-xs text-slate-500 mt-1 truncate">{planFilter}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-100 to-green-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <CheckCircle className="h-6 w-6 text-green-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Active</p>
              <p className="text-3xl font-bold text-green-700">{analytics.active}</p>
              {planFilter !== "all" && (
                <p className="text-xs text-slate-500 mt-1 truncate">{planFilter}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6 text-orange-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expiring Soon</p>
              <p className="text-3xl font-bold text-orange-700">{analytics.expiringSoon}</p>
              {planFilter !== "all" && (
                <p className="text-xs text-slate-500 mt-1 truncate">{planFilter}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-100 to-red-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <XCircle className="h-6 w-6 text-red-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expired</p>
              <p className="text-3xl font-bold text-red-700">{analytics.expired}</p>
              {planFilter !== "all" && (
                <p className="text-xs text-slate-500 mt-1 truncate">{planFilter}</p>
              )}
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

      <Card className="border-0 shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/60 px-6 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-md">
                <CreditCard className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-1">
                  Monitor Subscription
                  <Badge variant="outline" className="ml-2 bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-300 font-semibold shadow-sm">
                    {analytics.pending} pending
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-600 font-medium">Monitor subscription status and track upcoming expirations</CardDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchAllData} variant="outline" size="sm" className="shadow-md hover:shadow-lg hover:bg-slate-50 transition-all border-slate-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <button
                onClick={() => {
                  resetSubscriptionForm()
                  setIsCreateSubscriptionDialogOpen(true)
                }}
                style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  border: 'none'
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold h-9 px-4 shadow-lg hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#111827'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#000000'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Plus className="h-4 w-4" />
                Assign Subscription
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-slate-50/30">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-12 bg-white p-1.5 rounded-xl border border-slate-200 shadow-inner">
              <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-100 data-[state=active]:to-slate-50 data-[state=active]:shadow-md data-[state=active]:text-slate-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-slate-200">
                All ({analytics.total})
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-50 data-[state=active]:to-yellow-100/50 data-[state=active]:shadow-md data-[state=active]:text-yellow-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-yellow-200">
                Pending ({analytics.pending})
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-green-100/50 data-[state=active]:shadow-md data-[state=active]:text-green-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-green-200">
                Active ({analytics.active})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-orange-100/50 data-[state=active]:shadow-md data-[state=active]:text-orange-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-orange-200">
                Upcoming ({analytics.expiringSoon})
              </TabsTrigger>
              <TabsTrigger value="expired" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-50 data-[state=active]:to-red-100/50 data-[state=active]:shadow-md data-[state=active]:text-red-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-red-200">
                Expired ({analytics.expired})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="pending-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-40" id="pending-plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Right side - Month and Year Filters */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <Label htmlFor="pending-month-filter">Month:</Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-40" id="pending-month-filter">
                        <SelectValue placeholder="All Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>

                    <Label htmlFor="pending-year-filter">Year:</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-32" id="pending-year-filter">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="this_year">This Year ({new Date().getFullYear()})</SelectItem>
                        <SelectItem value="last_year">Last Year ({new Date().getFullYear() - 1})</SelectItem>
                        <SelectItem value="last_last_year">{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 3).toString()}>{new Date().getFullYear() - 3}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {(() => {
                const filteredPending = filterSubscriptions(pendingSubscriptions)
                const pendingPagination = getPaginatedData(filteredPending, 'pending')

                return filteredPending.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending subscription requests</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-yellow-50 to-yellow-100/50 hover:bg-yellow-100 border-b-2 border-yellow-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Plan</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Requested</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingPagination.paginated.map((subscription) => {
                            return (
                              <TableRow key={subscription.subscription_id} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
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
                    {/* Pagination Controls */}
                    {filteredPending.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {filteredPending.length} {filteredPending.length === 1 ? 'entry' : 'entries'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, pending: Math.max(1, prev.pending - 1) }))}
                            disabled={pendingPagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {pendingPagination.currentPage} of {pendingPagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, pending: Math.min(pendingPagination.totalPages, prev.pending + 1) }))}
                            disabled={pendingPagination.currentPage === pendingPagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="active" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="active-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-40" id="active-plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Right side - Month and Year Filters */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <Label htmlFor="active-month-filter">Month:</Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-40" id="active-month-filter">
                        <SelectValue placeholder="All Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>

                    <Label htmlFor="active-year-filter">Year:</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-32" id="active-year-filter">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="this_year">This Year ({new Date().getFullYear()})</SelectItem>
                        <SelectItem value="last_year">Last Year ({new Date().getFullYear() - 1})</SelectItem>
                        <SelectItem value="last_last_year">{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 3).toString()}>{new Date().getFullYear() - 3}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Active Subscriptions Table */}
              {(() => {
                const filteredActive = filterSubscriptions(activeSubscriptions)
                const activePagination = getPaginatedData(filteredActive, 'active')

                return filteredActive.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active subscriptions found</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-green-50 to-green-100/50 hover:bg-green-100 border-b-2 border-green-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Plan</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Start Date</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">End Date</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Days Left</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Total Paid</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activePagination.paginated.map((subscription) => (
                            <TableRow key={subscription.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-medium">{subscription.plan_name}</div>
                                  {(() => {
                                    const months = calculateMonths(subscription)
                                    return months > 1 ? (
                                      <Badge variant="outline" className="text-xs font-medium bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {months} month{months > 1 ? 's' : ''}
                                      </Badge>
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
                                {(() => {
                                  const timeRemaining = calculateTimeRemaining(subscription.end_date)
                                  const daysLeft = calculateDaysLeft(subscription.end_date)
                                  const isDay1Session = subscription.plan_name?.toLowerCase().includes('day 1') || subscription.plan_name?.toLowerCase().includes('day1')
                                  if (timeRemaining === null) return <span className="text-slate-500">N/A</span>
                                  if (timeRemaining.type === 'expired') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        Expired {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  // For day 1 session, don't show orange warning
                                  if (isDay1Session) {
                                    if (timeRemaining.type === 'hours') {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                          {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    return (
                                      <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'}
                                      </Badge>
                                    )
                                  }
                                  // For other plans, show orange if 7 days or less
                                  if (timeRemaining.type === 'hours') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  return (
                                    <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                      'bg-green-100 text-green-700 border-green-300'
                                      }`}>
                                      {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'}
                                    </Badge>
                                  )
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(subscription.total_paid || 0)}</div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    {filteredActive.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {filteredActive.length} {filteredActive.length === 1 ? 'entry' : 'entries'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, active: Math.max(1, prev.active - 1) }))}
                            disabled={activePagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {activePagination.currentPage} of {activePagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, active: Math.min(activePagination.totalPages, prev.active + 1) }))}
                            disabled={activePagination.currentPage === activePagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="upcoming-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-40" id="upcoming-plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Right side - Month and Year Filters */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <Label htmlFor="upcoming-month-filter">Month:</Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-40" id="upcoming-month-filter">
                        <SelectValue placeholder="All Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>

                    <Label htmlFor="upcoming-year-filter">Year:</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-32" id="upcoming-year-filter">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="this_year">This Year ({new Date().getFullYear()})</SelectItem>
                        <SelectItem value="last_year">Last Year ({new Date().getFullYear() - 1})</SelectItem>
                        <SelectItem value="last_last_year">{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 3).toString()}>{new Date().getFullYear() - 3}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Upcoming Expiration Subscriptions Table */}
              {(() => {
                const filteredExpiring = filterSubscriptions(expiringSoonSubscriptions)
                const expiringPagination = getPaginatedData(filteredExpiring, 'upcoming')

                return filteredExpiring.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subscriptions expiring within 7 days</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-orange-50 to-orange-100/50 hover:bg-orange-100 border-b-2 border-orange-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Plan</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Start Date</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">End Date</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Days Left</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Total Paid</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expiringPagination.paginated.map((subscription) => (
                            <TableRow key={subscription.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
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
                                {(() => {
                                  const timeRemaining = calculateTimeRemaining(subscription.end_date)
                                  const daysLeft = calculateDaysLeft(subscription.end_date)
                                  const isDay1Session = subscription.plan_name?.toLowerCase().includes('day 1') || subscription.plan_name?.toLowerCase().includes('day1')
                                  if (timeRemaining === null) return <span className="text-slate-500">N/A</span>
                                  if (timeRemaining.type === 'expired') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        Expired {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  // For day 1 session, don't show orange warning
                                  if (isDay1Session) {
                                    if (timeRemaining.type === 'hours') {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                          {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    return (
                                      <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'}
                                      </Badge>
                                    )
                                  }
                                  // For other plans, show orange if 7 days or less
                                  if (timeRemaining.type === 'hours') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  return (
                                    <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                      'bg-green-100 text-green-700 border-green-300'
                                      }`}>
                                      {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'}
                                    </Badge>
                                  )
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(subscription.total_paid || 0)}</div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    {filteredExpiring.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {filteredExpiring.length} {filteredExpiring.length === 1 ? 'entry' : 'entries'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, upcoming: Math.max(1, prev.upcoming - 1) }))}
                            disabled={expiringPagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {expiringPagination.currentPage} of {expiringPagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, upcoming: Math.min(expiringPagination.totalPages, prev.upcoming + 1) }))}
                            disabled={expiringPagination.currentPage === expiringPagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="expired" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="expired-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-40" id="expired-plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Right side - Month and Year Filters */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <Label htmlFor="expired-month-filter">Month:</Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-40" id="expired-month-filter">
                        <SelectValue placeholder="All Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>

                    <Label htmlFor="expired-year-filter">Year:</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-32" id="expired-year-filter">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="this_year">This Year ({new Date().getFullYear()})</SelectItem>
                        <SelectItem value="last_year">Last Year ({new Date().getFullYear() - 1})</SelectItem>
                        <SelectItem value="last_last_year">{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 3).toString()}>{new Date().getFullYear() - 3}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Expired Subscriptions Table */}
              {(() => {
                const filteredExpired = filterSubscriptions(expiredSubscriptions)
                const expiredPagination = getPaginatedData(filteredExpired, 'expired')

                return filteredExpired.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expired subscriptions found</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-red-50 to-red-100/50 hover:bg-red-100 border-b-2 border-red-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Plan</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Start Date</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">End Date</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Days Left</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Total Paid</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expiredPagination.paginated.map((subscription) => (
                            <TableRow key={subscription.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
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
                                {(() => {
                                  const timeRemaining = calculateTimeRemaining(subscription.end_date)
                                  const daysLeft = calculateDaysLeft(subscription.end_date)
                                  const isDay1Session = subscription.plan_name?.toLowerCase().includes('day 1') || subscription.plan_name?.toLowerCase().includes('day1')
                                  if (timeRemaining === null) return <span className="text-slate-500">N/A</span>
                                  if (timeRemaining.type === 'expired') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        Expired {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  // For day 1 session, don't show orange warning
                                  if (isDay1Session) {
                                    if (timeRemaining.type === 'hours') {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                          {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    return (
                                      <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'}
                                      </Badge>
                                    )
                                  }
                                  // For other plans, show orange if 7 days or less
                                  if (timeRemaining.type === 'hours') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  return (
                                    <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                      'bg-green-100 text-green-700 border-green-300'
                                      }`}>
                                      {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'}
                                    </Badge>
                                  )
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(subscription.total_paid || 0)}</div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    {filteredExpired.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {filteredExpired.length} {filteredExpired.length === 1 ? 'entry' : 'entries'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, expired: Math.max(1, prev.expired - 1) }))}
                            disabled={expiredPagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {expiredPagination.currentPage} of {expiredPagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, expired: Math.min(expiredPagination.totalPages, prev.expired + 1) }))}
                            disabled={expiredPagination.currentPage === expiredPagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="all" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-40" id="plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Right side - Month and Year Filters */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <Label htmlFor="month-filter">Month:</Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-40" id="month-filter">
                        <SelectValue placeholder="All Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>

                    <Label htmlFor="year-filter">Year:</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-32" id="year-filter">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="this_year">This Year ({new Date().getFullYear()})</SelectItem>
                        <SelectItem value="last_year">Last Year ({new Date().getFullYear() - 1})</SelectItem>
                        <SelectItem value="last_last_year">{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                        <SelectItem value={(new Date().getFullYear() - 3).toString()}>{new Date().getFullYear() - 3}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* All Subscriptions Table */}
              {(() => {
                const allPagination = getPaginatedData(filteredSubscriptions, 'all')

                return filteredSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{!subscriptions || subscriptions.length === 0 ? "No subscriptions found" : "No subscriptions match your search"}</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50 hover:bg-slate-100 border-b-2 border-slate-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Plan</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Start Date</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">End Date</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Days Left</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Total Paid</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allPagination.paginated.map((subscription) => (
                            <TableRow key={subscription.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-medium">{subscription.plan_name}</div>
                                  {(() => {
                                    const months = calculateMonths(subscription)
                                    return months > 1 ? (
                                      <Badge variant="outline" className="text-xs font-medium bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {months} month{months > 1 ? 's' : ''}
                                      </Badge>
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
                                {(() => {
                                  const timeRemaining = calculateTimeRemaining(subscription.end_date)
                                  const daysLeft = calculateDaysLeft(subscription.end_date)
                                  const isDay1Session = subscription.plan_name?.toLowerCase().includes('day 1') || subscription.plan_name?.toLowerCase().includes('day1')
                                  if (timeRemaining === null) return <span className="text-slate-500">N/A</span>
                                  if (timeRemaining.type === 'expired') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        Expired {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  // For day 1 session, don't show orange warning
                                  if (isDay1Session) {
                                    if (timeRemaining.type === 'hours') {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                          {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    return (
                                      <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'}
                                      </Badge>
                                    )
                                  }
                                  // For other plans, show orange if 7 days or less
                                  if (timeRemaining.type === 'hours') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  return (
                                    <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                      'bg-green-100 text-green-700 border-green-300'
                                      }`}>
                                      {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'}
                                    </Badge>
                                  )
                                })()}
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
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    {filteredSubscriptions.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {filteredSubscriptions.length} {filteredSubscriptions.length === 1 ? 'entry' : 'entries'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, all: Math.max(1, prev.all - 1) }))}
                            disabled={allPagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {allPagination.currentPage} of {allPagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, all: Math.min(allPagination.totalPages, prev.all + 1) }))}
                            disabled={allPagination.currentPage === allPagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
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
                          {plan.plan_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700">Amount to Pay</Label>
                <Input
                  value={subscriptionForm.amount_paid || '0.00'}
                  disabled
                  placeholder="Amount to pay"
                  className="h-10 text-sm border border-gray-300 bg-gray-50 text-gray-900 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 text-sm border border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Discount Section */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Discount Options</h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(discountConfig).map(([key, config]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={subscriptionForm.discount_type === key ? "default" : "outline"}
                    className={`h-auto py-3 px-3 ${subscriptionForm.discount_type === key
                      ? "bg-gray-800 hover:bg-gray-700 text-white border-gray-800"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
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
                      <span className="text-sm font-medium">{config.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            {subscriptionForm.plan_id && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-gray-700 mb-2 text-sm font-semibold">Price Breakdown</h4>
                <div className="text-sm text-gray-600 space-y-2">
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
                          <span className="font-medium text-gray-900">
                            {months > 1 ? (
                              <span>
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
                            <span className="font-medium text-gray-700">-₱{discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t border-gray-300 pt-2 mt-2">
                          <span className="text-gray-900">Final Price:</span>
                          <span className="text-gray-900">₱{amountPaid.toFixed(2)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="text-sm font-semibold text-gray-700">Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Enter amount received"
                  className="h-10 text-sm border border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {amountReceived && (
                  <div className="mt-2 p-3 bg-white rounded-md border border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Change:</span>
                      <span className="text-base font-semibold text-gray-900">₱{changeGiven.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

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
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              {actionLoading === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="max-w-lg" hideClose>
          <DialogHeader>
            <DialogTitle className="sr-only">Subscription Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Transaction completed successfully. Receipt details are displayed below.
            </DialogDescription>
          </DialogHeader>
          {confirmationData && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="text-center space-y-4 pb-6 border-b-2 border-gray-200">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">CNERGY GYM</h2>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Subscription Receipt</p>
                </div>
                <div className="pt-2 space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-700">Transaction Completed Successfully</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-xs font-medium text-gray-500">Receipt #</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">{confirmationData.receipt_number}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 space-y-4 border border-gray-200">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-600">Member Name</span>
                    <span className="text-sm font-semibold text-gray-900">{confirmationData.user_name}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Subscription Plan</span>
                    <span className="text-sm font-semibold text-gray-900">{confirmationData.plan_name}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Payment Method</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full">
                      {confirmationData.payment_method}
                    </span>
                  </div>

                  {confirmationData.payment_method === 'cash' && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Amount Received</span>
                        <span className="text-sm font-semibold text-gray-900">₱{confirmationData.amount_received?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Change</span>
                        <span className="text-base font-bold text-gray-900">₱{confirmationData.change_given?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Section */}
                <div className="flex justify-between items-center py-4 px-2 border-t-2 border-gray-300">
                  <span className="text-lg font-semibold text-gray-900">Total Amount Paid</span>
                  <span className="text-2xl font-bold text-gray-900">₱{confirmationData.total_amount?.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer Message */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Subscription is now active and ready to use</p>
                <p className="text-xs text-gray-400 mt-2">Thank you for your business!</p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 border-t border-gray-200">
            <Button
              onClick={() => {
                setShowConfirmationModal(false)
                setConfirmationData(null)
              }}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium"
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
