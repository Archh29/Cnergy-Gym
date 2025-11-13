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
  ChevronLeft,
  ChevronRight,
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
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"
    // Format date and time in Philippines timezone
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
  }, [searchQuery, statusFilter, planFilter])

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
                        <TableHead>Name</TableHead>
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
                      <TableHead>Name</TableHead>
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
                      <TableHead>Name</TableHead>
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
                      <TableHead>Name</TableHead>
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
                      <TableHead>Name</TableHead>
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
              {currentSubscriptionId ? "Process Payment & Approve Subscription" : "Assign Subscription"}
            </DialogTitle>
            <DialogDescription>
              {currentSubscriptionId
                ? "Process payment to approve this subscription request"
                : "Assign a subscription to a member with discount options"
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
                          {plan.plan_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Amount to Pay *</Label>
                <Input
                  value={subscriptionForm.amount_paid || '0.00'}
                  disabled
                  placeholder="Amount to pay"
                  className="bg-gray-50 text-gray-900 font-medium"
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
                  className="bg-white"
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
    </div>
  )
}

export default SubscriptionMonitor
