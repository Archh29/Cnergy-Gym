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
  GraduationCap,
  UserCircle,
} from "lucide-react"

const API_URL = "https://api.cnergy.site/monitor_subscription.php"

const SubscriptionMonitor = ({ userId }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("active")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState("all") // all, regular, guest
  const [monthFilter, setMonthFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("this_year")
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
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [userActiveDiscount, setUserActiveDiscount] = useState(null) // Track user's active discount
  const [userActiveSubscriptions, setUserActiveSubscriptions] = useState([]) // Track user's active subscriptions
  const [planQuantity, setPlanQuantity] = useState(1) // Quantity for advance payment/renewal (months for Plan 2/3, years for Plan 1)
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

  // Pagination state for each tab
  const [currentPage, setCurrentPage] = useState({
    pending: 1,
    active: 1,
    upcoming: 1,
    expired: 1,
    cancelled: 1,
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

  // Guest Session Creation State
  const [isCreateGuestSessionDialogOpen, setIsCreateGuestSessionDialogOpen] = useState(false)
  const [guestSessionForm, setGuestSessionForm] = useState({
    guest_name: "",
    payment_method: "cash",
    amount_received: "",
    notes: ""
  })
  const [gymSessionPlan, setGymSessionPlan] = useState(null)
  const [guestSessionChangeGiven, setGuestSessionChangeGiven] = useState(0)
  const [guestSessionLoading, setGuestSessionLoading] = useState(false)
  const [showGuestReceipt, setShowGuestReceipt] = useState(false)
  const [lastGuestTransaction, setLastGuestTransaction] = useState(null)

  useEffect(() => {
    fetchAllData()
    fetchSubscriptionPlans()
    fetchAvailableUsers()
    fetchGymSessionPlan()
  }, [])

  // Fetch Gym Session plan details
  const fetchGymSessionPlan = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=plans`)
      if (response.data.success && response.data.plans) {
        // Find Gym Session, Day Pass, or Walk In plan
        const gymPlan = response.data.plans.find(plan =>
          plan.plan_name?.toLowerCase() === 'gym session' ||
          plan.plan_name?.toLowerCase() === 'day pass' ||
          plan.plan_name?.toLowerCase() === 'walk in' ||
          plan.id === 6
        )
        if (gymPlan) {
          setGymSessionPlan(gymPlan)
        }
      }
    } catch (error) {
      console.error("Error fetching Gym Session plan:", error)
    }
  }

  // Calculate change for guest session
  useEffect(() => {
    if (guestSessionForm.amount_received && gymSessionPlan?.price) {
      const received = parseFloat(guestSessionForm.amount_received) || 0
      const price = parseFloat(gymSessionPlan.price) || 0
      setGuestSessionChangeGiven(Math.max(0, received - price))
    } else {
      setGuestSessionChangeGiven(0)
    }
  }, [guestSessionForm.amount_received, gymSessionPlan])

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
        // Store active subscriptions for display
        setUserActiveSubscriptions(response.data.active_subscriptions || [])
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

  // Create Guest Session Handler
  const handleCreateGuestSession = async () => {
    if (!guestSessionForm.guest_name || !gymSessionPlan) {
      setMessage({
        type: "error",
        text: "Please fill in the guest name"
      })
      return
    }

    const totalAmount = parseFloat(gymSessionPlan.price) || 0
    const receivedAmount = parseFloat(guestSessionForm.amount_received) || totalAmount

    if (guestSessionForm.payment_method === "cash" && receivedAmount < totalAmount) {
      setMessage({
        type: "error",
        text: `Insufficient Payment: Amount received (₱${receivedAmount.toFixed(2)}) is less than required amount (₱${totalAmount.toFixed(2)}). Please collect ₱${(totalAmount - receivedAmount).toFixed(2)} more.`
      })
      return
    }

    setGuestSessionLoading(true)
    setMessage(null)

    try {
      // Get current user ID
      let currentUserId = userId
      if (!currentUserId) {
        const storedUserId = sessionStorage.getItem("user_id")
        if (storedUserId) {
          currentUserId = parseInt(storedUserId)
        }
      }

      const change = Math.max(0, receivedAmount - totalAmount)

      // Keep payment method as is (cash or digital for GCash)
      const apiPaymentMethod = guestSessionForm.payment_method === "digital" ? "gcash" : "cash"

      // Call guest session API
      const response = await axios.post('https://api.cnergy.site/guest_session_admin.php', {
        action: 'create_guest_session',
        guest_name: guestSessionForm.guest_name,
        guest_type: 'walkin',
        staff_id: currentUserId,
        amount_paid: totalAmount,
        payment_method: apiPaymentMethod,
        amount_received: receivedAmount,
        notes: guestSessionForm.notes || ""
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (response.data.success) {
        const transactionData = {
          ...response.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: guestSessionForm.payment_method,
          amount_received: receivedAmount,
          guest_name: guestSessionForm.guest_name
        }

        setLastGuestTransaction(transactionData)
        setShowGuestReceipt(true)

        // Reset form and close dialog
        setGuestSessionForm({
          guest_name: "",
          payment_method: "cash",
          amount_received: "",
          notes: ""
        })
        setIsCreateGuestSessionDialogOpen(false)
        await fetchAllData()
      } else {
        throw new Error(response.data.message || "Failed to create guest session")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create guest session"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setGuestSessionLoading(false)
    }
  }

  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      user_id: "",
      plan_id: "",
      start_date: new Date().toISOString().split("T")[0],
      discount_type: "regular",
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
      // Reset quantity when plan changes
      setPlanQuantity(1)
      
      // Apply discount for plan_id 2, 3, or 5 (Monthly plans or package with monthly access) if user has active discount
      // Plan ID 5 includes Monthly Access Premium, so discount should apply
      let discountType = "none"
      if ((planId == 2 || planId == 3 || planId == 5) && userActiveDiscount) {
        discountType = userActiveDiscount
      }
      
      // Calculate price: base price * quantity, then apply discount
      const basePrice = parseFloat(selectedPlan.price || 0)
      const totalPrice = basePrice * planQuantity
      const discountedPrice = calculateDiscountedPrice(totalPrice, discountType)
      
      setSubscriptionForm((prev) => ({
        ...prev,
        plan_id: planId,
        discount_type: discountType,
        amount_paid: discountedPrice.toString(),
      }))
    }
  }
  
  // Handle quantity change for advance payment/renewal
  const handleQuantityChange = (quantity) => {
    const qty = Math.max(1, parseInt(quantity) || 1)
    setPlanQuantity(qty)
    
    if (subscriptionForm.plan_id) {
      const selectedPlan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find((plan) => plan.id == subscriptionForm.plan_id) : null
      if (selectedPlan) {
        // Apply discount for plan_id 2, 3, or 5 (Monthly plans or package with monthly access) if user has active discount
        // Plan ID 5 includes Monthly Access Premium, so discount should apply
        let discountType = subscriptionForm.discount_type || "none"
        if ((subscriptionForm.plan_id == 2 || subscriptionForm.plan_id == 3 || subscriptionForm.plan_id == 5) && userActiveDiscount) {
          discountType = userActiveDiscount
        }
        
        // Calculate price: base price * quantity, then apply discount
        const basePrice = parseFloat(selectedPlan.price || 0)
        const totalPrice = basePrice * qty
        const discountedPrice = calculateDiscountedPrice(totalPrice, discountType)
        
        setSubscriptionForm((prev) => ({
          ...prev,
          discount_type: discountType,
          amount_paid: discountedPrice.toString(),
        }))
      }
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

  // Fetch user's active discount eligibility
  const fetchUserDiscount = async (userId) => {
    try {
      const response = await fetch(`https://api.cnergy.site/user_discount.php?action=get_active&user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user discount')
      const result = await response.json()
      if (result.success && result.discount_type) {
        setUserActiveDiscount(result.discount_type)
        return result.discount_type
      } else {
        setUserActiveDiscount(null)
        return null
      }
    } catch (error) {
      console.error('Error fetching user discount:', error)
      setUserActiveDiscount(null)
      return null
    }
  }

  const handleUserSelection = async (userId) => {
    try {
      setSubscriptionForm((prev) => ({
        ...prev,
        user_id: userId,
        plan_id: "", // Reset plan selection
        discount_type: "none", // Reset discount
        amount_paid: "", // Reset amount
      }))
      setUserActiveDiscount(null) // Reset discount
      setUserActiveSubscriptions([]) // Reset active subscriptions
      setPlanQuantity(1) // Reset quantity

      if (userId) {
        // Find the user from availableUsers array
        const user = availableUsers.find(u => u.id.toString() === userId.toString())
        if (user) {
          setSelectedUserInfo(user)
          // Update search query to show selected user's name
          setUserSearchQuery(`${user.fname || ''} ${user.lname || ''}`.trim())
        } else {
          // If user not found in availableUsers, try to fetch it
          setSelectedUserInfo(null)
          setUserSearchQuery("")
        }
        
        // Fetch user's active discount
        await fetchUserDiscount(userId)
        
        // Fetch available plans for the user
        await fetchAvailablePlansForUser(userId)
      } else {
        setSelectedUserInfo(null)
        setUserSearchQuery("")
        setUserActiveDiscount(null)
        setUserActiveSubscriptions([])
        // Reset to all plans if no user selected
        fetchSubscriptionPlans()
      }
    } catch (error) {
      console.error("Error in handleUserSelection:", error)
      setSelectedUserInfo(null)
      setUserSearchQuery("")
      setUserActiveDiscount(null)
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

  // Helper function to format names properly (capitalize first letter of each word)
  const formatName = (name) => {
    if (!name) return ''
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim()
  }

  // Helper function to get display name (handles guest sessions)
  const getDisplayName = (subscription) => {
    if (subscription.is_guest_session || subscription.subscription_type === 'guest') {
      const guestName = subscription.guest_name || 'Guest'
      return formatName(guestName)
    }
    const fname = formatName(subscription.fname || '')
    const mname = formatName(subscription.mname || '')
    const lname = formatName(subscription.lname || '')
    const fullName = `${fname} ${mname} ${lname}`.trim()
    return fullName || 'Unknown'
  }

  // Helper function to get display email/info (handles guest sessions)
  const getDisplayEmail = (subscription) => {
    if (subscription.is_guest_session || subscription.subscription_type === 'guest') {
      return 'Guest Session'
    }
    return subscription.email || 'No email'
  }

  // Helper function to get avatar initials (handles guest sessions)
  const getAvatarInitials = (subscription) => {
    if (subscription.is_guest_session || subscription.subscription_type === 'guest') {
      const name = subscription.guest_name || 'Guest'
      const parts = name.trim().split(' ').filter(part => part.length > 0)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    const fname = (subscription.fname || '').trim()
    const lname = (subscription.lname || '').trim()
    return `${fname[0] || ''}${lname[0] || ''}`.toUpperCase()
  }

  // Calculate months from subscription
  const calculateMonths = (subscription) => {
    const amountPaid = parseFloat(subscription.amount_paid || subscription.discounted_price || 0)
    const planPrice = parseFloat(subscription.price || 0)

    if (planPrice > 0 && amountPaid > 0) {
      const months = Math.floor(amountPaid / planPrice)
      return months > 0 ? months : 1
    }
    return 1 // Default to 1 month if calculation fails
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

  // Calculate time remaining with hours when 1 day or less, minutes when less than 1 hour, months and days when beyond 1 month
  const calculateTimeRemaining = (endDate) => {
    if (!endDate) return null
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()

    if (diffTime < 0) {
      // Expired - calculate hours, minutes and days
      const hoursAgo = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60))
      const minutesAgo = Math.floor(Math.abs(diffTime) / (1000 * 60))
      const daysAgo = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24))

      // If expired less than 1 hour ago, show minutes
      if (hoursAgo < 1) {
        return { type: 'expired_minutes', minutes: minutesAgo }
      }
      // If expired less than 24 hours ago, show hours
      if (hoursAgo < 24) {
        return { type: 'expired_hours', hours: hoursAgo }
      }
      // Otherwise show days
      return { type: 'expired', days: daysAgo }
    }

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const totalHours = Math.floor(diffTime / (1000 * 60 * 60))
    const totalMinutes = Math.floor(diffTime / (1000 * 60))

    // If less than 1 hour, show minutes (59 minutes max)
    if (totalHours < 1) {
      return { type: 'minutes', minutes: totalMinutes }
    }

    // If less than 1 day (24 hours), show hours (23 hours max)
    if (diffDays < 1) {
      return { type: 'hours', hours: totalHours }
    }

    // If 365 days or more (1 year or more), show years and months
    if (diffDays >= 365) {
      const years = Math.floor(diffDays / 365)
      const remainingDaysAfterYears = diffDays % 365
      const months = Math.floor(remainingDaysAfterYears / 30)
      return { type: 'years_months', years, months, totalDays: diffDays }
    }

    // If 30 days or more (1 month or more), show months and days
    if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30)
      const remainingDays = diffDays % 30
      return { type: 'months_days', months, days: remainingDays, totalDays: diffDays }
    }

    return { type: 'days', days: diffDays }
  }

  // Helper function to check if subscription matches month/year filter (must be defined before use)
  const matchesMonthYearFilter = (subscription) => {
    if (!subscription.start_date) return true
    
    const subscriptionDate = new Date(subscription.start_date)
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    // Month filter logic
    if (monthFilter !== "all") {
      if (monthFilter === "this_month") {
        if (subscriptionDate.getMonth() !== currentMonth || subscriptionDate.getFullYear() !== currentYear) {
          return false
        }
      } else if (monthFilter === "last_3_months") {
        const threeMonthsAgo = new Date(today)
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
        if (subscriptionDate < threeMonthsAgo || subscriptionDate > today) {
          return false
        }
      } else {
        // Specific month (1-12)
        const monthNum = parseInt(monthFilter)
        if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
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
            if (subscriptionDate.getMonth() !== monthNum - 1 || subscriptionDate.getFullYear() !== targetYear) {
              return false
            }
          } else {
            if (subscriptionDate.getMonth() !== monthNum - 1) {
              return false
            }
          }
        }
      }
    }

    // Year filter logic
    if (yearFilter !== "all") {
      if (yearFilter === "this_year") {
        if (subscriptionDate.getFullYear() !== currentYear) {
          return false
        }
      } else if (yearFilter === "last_year") {
        if (subscriptionDate.getFullYear() !== currentYear - 1) {
          return false
        }
      } else if (yearFilter === "last_last_year") {
        if (subscriptionDate.getFullYear() !== currentYear - 2) {
          return false
        }
      } else {
        const yearNum = parseInt(yearFilter)
        if (!isNaN(yearNum) && subscriptionDate.getFullYear() !== yearNum) {
          return false
        }
      }
    }

    return true
  }

  // Get analytics - filter by plan if planFilter is set
  const getActiveSubscriptions = () => {
    const now = new Date()
    return (subscriptions || []).filter((s) => {
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

      // Apply subscription type filter
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = s.is_guest_session === true || s.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = s.is_guest_session !== true && s.subscription_type !== 'guest'
      }
      if (!matchesType) return false

      // Apply month/year filter
      if (!matchesMonthYearFilter(s)) return false

      // Check if subscription is expired (end_date is in the past)
      const endDate = new Date(s.end_date)
      if (endDate < now) return false

      // Only show if status is Active or approved and not expired
      return s.display_status === "Active" || s.status_name === "approved"
    })
  }

  const getExpiringSoonSubscriptions = () => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    sevenDaysFromNow.setHours(23, 59, 59, 999)

    return (subscriptions || []).filter((s) => {
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

      // Apply subscription type filter
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = s.is_guest_session === true || s.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = s.is_guest_session !== true && s.subscription_type !== 'guest'
      }
      if (!matchesType) return false

      // Apply month/year filter
      if (!matchesMonthYearFilter(s)) return false

      const endDate = new Date(s.end_date)
      // Check if subscription is already expired (end_date is in the past)
      if (endDate < now) return false

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

      // Apply subscription type filter
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = s.is_guest_session === true || s.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = s.is_guest_session !== true && s.subscription_type !== 'guest'
      }
      if (!matchesType) return false

      // Apply month/year filter
      if (!matchesMonthYearFilter(s)) return false

      const endDate = new Date(s.end_date)
      endDate.setHours(0, 0, 0, 0)
      return s.display_status === "Expired" || (s.status_name === "approved" && endDate < today)
    })
  }

  const getCancelledSubscriptions = () => {
    return (subscriptions || []).filter((s) => {
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false
      
      // Apply subscription type filter
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = s.is_guest_session === true || s.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = s.is_guest_session !== true && s.subscription_type !== 'guest'
      }
      if (!matchesType) return false

      // Apply month/year filter
      if (!matchesMonthYearFilter(s)) return false

      // Check if subscription is cancelled
      return s.status_name?.toLowerCase() === "cancelled" || 
             s.display_status?.toLowerCase() === "cancelled" ||
             s.status_name?.toLowerCase() === "canceled" ||
             s.display_status?.toLowerCase() === "canceled"
    })
  }

  // Filter subscriptions
  const filterSubscriptions = (subscriptionList) => {
    return (subscriptionList || []).filter((subscription) => {
      // Search filter - include guest_name for guest sessions
      const searchText = searchQuery.toLowerCase()
      const matchesSearch =
        `${subscription.fname || ''} ${subscription.mname || ''} ${subscription.lname || ''}`
          .toLowerCase()
          .includes(searchText) ||
        (subscription.email || '').toLowerCase().includes(searchText) ||
        (subscription.plan_name || '').toLowerCase().includes(searchText) ||
        (subscription.guest_name || '').toLowerCase().includes(searchText) ||
        (subscription.receipt_number || '').toLowerCase().includes(searchText)

      const matchesStatus = statusFilter === "all" || subscription.status_name === statusFilter
      const matchesPlan = planFilter === "all" || subscription.plan_name === planFilter

      // Subscription type filter (Guest Session vs Regular)
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = subscription.is_guest_session === true || subscription.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = subscription.is_guest_session !== true && subscription.subscription_type !== 'guest'
      } else {
        matchesType = true // "all" - show both
      }

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

      return matchesSearch && matchesStatus && matchesPlan && matchesType && matchesMonth && matchesYear
    })
  }

  const filteredSubscriptions = filterSubscriptions(subscriptions)
  const activeSubscriptions = getActiveSubscriptions()
  const expiringSoonSubscriptions = getExpiringSoonSubscriptions()
  const expiredSubscriptions = getExpiredSubscriptions()
  const cancelledSubscriptions = getCancelledSubscriptions()

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

  // Get filtered subscriptions by plan and subscription type for analytics
  const getFilteredSubscriptionsByPlan = () => {
    let filtered = subscriptions || []

    // Apply plan filter
    if (planFilter !== "all") {
      filtered = filtered.filter((s) => s.plan_name === planFilter)
    }

    // Apply subscription type filter
    if (subscriptionTypeFilter === "guest") {
      filtered = filtered.filter((s) => s.is_guest_session === true || s.subscription_type === 'guest')
    } else if (subscriptionTypeFilter === "regular") {
      filtered = filtered.filter((s) => s.is_guest_session !== true && s.subscription_type !== 'guest')
    }

    // Apply month/year filter
    filtered = filtered.filter((s) => matchesMonthYearFilter(s))

    return filtered
  }

  const getFilteredPendingByPlan = () => {
    let filtered = pendingSubscriptions || []

    // Apply plan filter
    if (planFilter !== "all") {
      filtered = filtered.filter((s) => s.plan_name === planFilter)
    }

    // Apply subscription type filter
    if (subscriptionTypeFilter === "guest") {
      filtered = filtered.filter((s) => s.is_guest_session === true || s.subscription_type === 'guest')
    } else if (subscriptionTypeFilter === "regular") {
      filtered = filtered.filter((s) => s.is_guest_session !== true && s.subscription_type !== 'guest')
    }

    // Apply month/year filter
    filtered = filtered.filter((s) => matchesMonthYearFilter(s))

    return filtered
  }

  const filteredByPlan = getFilteredSubscriptionsByPlan()
  const filteredPendingByPlan = getFilteredPendingByPlan()

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage({
      pending: 1,
      active: 1,
      upcoming: 1,
      expired: 1,
      cancelled: 1,
      all: 1
    })
  }, [searchQuery, statusFilter, planFilter, subscriptionTypeFilter, monthFilter, yearFilter])

  // Get analytics
  const analytics = {
    total: filteredByPlan?.length || 0,
    pending: filteredPendingByPlan?.length || 0,
    approved: filteredByPlan?.filter((s) => s.status_name === "approved" || s.status_name === "active")?.length || 0,
    declined: filteredByPlan?.filter((s) => s.status_name === "declined")?.length || 0,
    active: activeSubscriptions.length,
    expiringSoon: expiringSoonSubscriptions.length,
    expired: expiredSubscriptions.length,
    cancelled: cancelledSubscriptions.length,
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <Card
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-slate-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("all")}
        >
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
        <Card
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("active")}
        >
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
        <Card
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("upcoming")}
        >
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
        <Card
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("expired")}
        >
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
        <Card 
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("cancelled")}
        >
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <XCircle className="h-6 w-6 text-gray-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cancelled</p>
              <p className="text-3xl font-bold text-gray-700">{analytics.cancelled}</p>
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
                </CardTitle>
                <CardDescription className="text-slate-600 font-medium">Monitor subscription status and track upcoming expirations</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchAllData} variant="outline" size="sm" className="h-9 w-9 p-0 shadow-md hover:shadow-lg hover:bg-slate-50 transition-all border-slate-300" title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <button
                onClick={() => {
                  setGuestSessionForm({
                    guest_name: "",
                    payment_method: "cash",
                    amount_received: "",
                    notes: ""
                  })
                  setIsCreateGuestSessionDialogOpen(true)
                }}
                style={{
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  border: 'none'
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold h-9 px-4 shadow-lg hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Plus className="h-4 w-4" />
                Guest Session
              </button>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-12 bg-white p-1.5 rounded-xl border border-slate-200 shadow-inner">
              <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-100 data-[state=active]:to-slate-50 data-[state=active]:shadow-md data-[state=active]:text-slate-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-slate-200">
                All ({analytics.total})
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
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-50 data-[state=active]:to-gray-100/50 data-[state=active]:shadow-md data-[state=active]:text-gray-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-gray-200">
                Cancelled ({analytics.cancelled})
              </TabsTrigger>
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
                    <Select value={planFilter} onValueChange={(value) => {
                      setPlanFilter(value)
                      // Reset type filter when plan filter changes away from Gym Session/Day Pass
                      if (value !== "Gym Session" && value !== "Day Pass" && value !== "Walk In") {
                        setSubscriptionTypeFilter("all")
                      }
                    }}>
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

                    {/* Only show Type filter when Gym Session/Day Pass is selected */}
                    {(planFilter === "Gym Session" || planFilter === "Day Pass" || planFilter === "Walk In") && (
                      <>
                        <Label htmlFor="active-subscription-type-filter">Type:</Label>
                        <Select value={subscriptionTypeFilter} onValueChange={setSubscriptionTypeFilter}>
                          <SelectTrigger className="w-40" id="active-subscription-type-filter">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="regular">Session</SelectItem>
                            <SelectItem value="guest">Guest Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
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
                        <SelectItem value="this_year">This Year</SelectItem>
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
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Time Left</TableHead>
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
                                      {getAvatarInitials(subscription)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {getDisplayName(subscription)}
                                      {subscription.is_guest_session && (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          Guest
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{getDisplayEmail(subscription)}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-medium">{subscription.plan_name}</div>
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
                                  if (!timeRemaining) return <span className="text-muted-foreground">-</span>

                                  if (timeRemaining.type === 'expired' || timeRemaining.type === 'expired_hours' || timeRemaining.type === 'expired_minutes') {
                                    return (
                                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                        Expired
                                      </Badge>
                                    )
                                  }

                                  if (timeRemaining.type === 'minutes') {
                                    return (
                                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                        {timeRemaining.minutes} min{timeRemaining.minutes !== 1 ? 's' : ''} left
                                      </Badge>
                                    )
                                  }

                                  if (timeRemaining.type === 'hours') {
                                    return (
                                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                        {timeRemaining.hours} hour{timeRemaining.hours !== 1 ? 's' : ''} left
                                      </Badge>
                                    )
                                  }

                                  if (timeRemaining.type === 'days') {
                                    return (
                                      <Badge variant="outline" className={daysLeft <= 7 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200"}>
                                        {timeRemaining.days} day{timeRemaining.days !== 1 ? 's' : ''} left
                                      </Badge>
                                    )
                                  }

                                  if (timeRemaining.type === 'months_days') {
                                    return (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        {timeRemaining.months} month{timeRemaining.months !== 1 ? 's' : ''} {timeRemaining.days} day{timeRemaining.days !== 1 ? 's' : ''} left
                                      </Badge>
                                    )
                                  }

                                  if (timeRemaining.type === 'years_months') {
                                    return (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        {timeRemaining.years} year{timeRemaining.years !== 1 ? 's' : ''} {timeRemaining.months} month{timeRemaining.months !== 1 ? 's' : ''} left
                                      </Badge>
                                    )
                                  }

                                  return <span className="text-muted-foreground">-</span>
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(subscription.total_paid || subscription.amount_paid || 0)}</div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {activePagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="text-sm text-slate-600">
                          Showing <span className="font-semibold text-slate-900">{(activePagination.currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                          <span className="font-semibold text-slate-900">{Math.min(activePagination.currentPage * itemsPerPage, activePagination.totalItems)}</span> of{" "}
                          <span className="font-semibold text-slate-900">{activePagination.totalItems}</span> subscriptions
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage({ ...currentPage, active: activePagination.currentPage - 1 })}
                            disabled={activePagination.currentPage === 1}
                            className="h-9"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: activePagination.totalPages }, (_, i) => i + 1).map((number) => (
                              <Button
                                key={number}
                                variant={activePagination.currentPage === number ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage({ ...currentPage, active: number })}
                                className="h-9 min-w-[36px]"
                              >
                                {number}
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage({ ...currentPage, active: activePagination.currentPage + 1 })}
                            disabled={activePagination.currentPage === activePagination.totalPages}
                            className="h-9"
                          >
                            Next
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
                    <Select value={planFilter} onValueChange={(value) => {
                      setPlanFilter(value)
                      // Reset type filter when plan filter changes away from Gym Session/Day Pass
                      if (value !== "Gym Session" && value !== "Day Pass" && value !== "Walk In") {
                        setSubscriptionTypeFilter("all")
                      }
                    }}>
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

                    {/* Only show Type filter when Gym Session/Day Pass is selected */}
                    {(planFilter === "Gym Session" || planFilter === "Day Pass" || planFilter === "Walk In") && (
                      <>
                        <Label htmlFor="upcoming-subscription-type-filter">Type:</Label>
                        <Select value={subscriptionTypeFilter} onValueChange={setSubscriptionTypeFilter}>
                          <SelectTrigger className="w-40" id="upcoming-subscription-type-filter">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="regular">Session</SelectItem>
                            <SelectItem value="guest">Guest Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
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
                        <SelectItem value="this_year">This Year</SelectItem>
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
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Time Left</TableHead>
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
                                      {getAvatarInitials(subscription)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {getDisplayName(subscription)}
                                      {subscription.is_guest_session && (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          Guest
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{getDisplayEmail(subscription)}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{subscription.plan_name}</div>
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
                                  const planNameLower = subscription.plan_name?.toLowerCase() || ''
                                  const isDay1Session = planNameLower.includes('day 1') || planNameLower.includes('day1')
                                  const isWalkIn = planNameLower === 'walk in' || subscription.plan_id === 6
                                  if (timeRemaining === null) return <span className="text-slate-500">N/A</span>
                                  if (timeRemaining.type === 'expired_minutes') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.minutes} minute{timeRemaining.minutes === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'expired_hours') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'expired') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  // For Walk In and day 1 session, show hours when 1 day or less, minutes when less than 1 hour
                                  if (isWalkIn || isDay1Session) {
                                    if (timeRemaining.type === 'minutes') {
                                      return (
                                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 font-medium">
                                          {timeRemaining.minutes} min{timeRemaining.minutes === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    if (timeRemaining.type === 'hours') {
                                      return (
                                        <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                          {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                  }
                                  if (timeRemaining.type === 'days') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'months_days') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.months} month{timeRemaining.months === 1 ? '' : 's'} {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'years_months') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.years} year{timeRemaining.years === 1 ? '' : 's'} {timeRemaining.months} month{timeRemaining.months === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  return <span className="text-slate-500">-</span>
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(subscription.total_paid || subscription.amount_paid || 0)}</div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {expiringPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="text-sm text-slate-600">
                          Showing <span className="font-semibold text-slate-900">{(expiringPagination.currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                          <span className="font-semibold text-slate-900">{Math.min(expiringPagination.currentPage * itemsPerPage, expiringPagination.totalItems)}</span> of{" "}
                          <span className="font-semibold text-slate-900">{expiringPagination.totalItems}</span> subscriptions
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage({ ...currentPage, upcoming: expiringPagination.currentPage - 1 })}
                            disabled={expiringPagination.currentPage === 1}
                            className="h-9"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: expiringPagination.totalPages }, (_, i) => i + 1).map((number) => (
                              <Button
                                key={number}
                                variant={expiringPagination.currentPage === number ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage({ ...currentPage, upcoming: number })}
                                className="h-9 min-w-[36px]"
                              >
                                {number}
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage({ ...currentPage, upcoming: expiringPagination.currentPage + 1 })}
                            disabled={expiringPagination.currentPage === expiringPagination.totalPages}
                            className="h-9"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
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
                              <div className="font-medium flex items-center gap-2 flex-wrap">
                                {subscription.plan_name}
                              </div>
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

            <TabsContent value="cancelled" className="space-y-4">
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
                    {!filterSubscriptions(cancelledSubscriptions) || filterSubscriptions(cancelledSubscriptions).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No cancelled subscriptions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterSubscriptions(cancelledSubscriptions).map((subscription) => (
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
                              <div className="font-medium flex items-center gap-2 flex-wrap">
                                {subscription.plan_name}
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
                    <Label htmlFor="all-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={(value) => {
                      setPlanFilter(value)
                      // Reset type filter when plan filter changes away from Gym Session/Day Pass
                      if (value !== "Gym Session" && value !== "Day Pass" && value !== "Walk In") {
                        setSubscriptionTypeFilter("all")
                      }
                    }}>
                      <SelectTrigger className="w-40" id="all-plan-filter">
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
                    
                    {/* Only show Type filter when Gym Session/Day Pass is selected */}
                    {(planFilter === "Gym Session" || planFilter === "Day Pass" || planFilter === "Walk In") && (
                      <>
                        <Label htmlFor="all-subscription-type-filter">Type:</Label>
                        <Select value={subscriptionTypeFilter} onValueChange={setSubscriptionTypeFilter}>
                          <SelectTrigger className="w-40" id="all-subscription-type-filter">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="regular">Session</SelectItem>
                            <SelectItem value="guest">Guest Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* Right side - Month and Year Filters */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <Label htmlFor="all-month-filter">Month:</Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-40" id="all-month-filter">
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

                    <Label htmlFor="all-year-filter">Year:</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-32" id="all-year-filter">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="this_year">This Year</SelectItem>
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
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Time Left</TableHead>
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
                                      {getAvatarInitials(subscription)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {getDisplayName(subscription)}
                                      {subscription.is_guest_session && (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          Guest
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{getDisplayEmail(subscription)}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-medium">{subscription.plan_name}</div>
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
                                  const planNameLower = subscription.plan_name?.toLowerCase() || ''
                                  const isDay1Session = planNameLower.includes('day 1') || planNameLower.includes('day1')
                                  const isWalkIn = planNameLower === 'walk in' || subscription.plan_id === 6
                                  if (timeRemaining === null) return <span className="text-slate-500">N/A</span>
                                  if (timeRemaining.type === 'expired_minutes') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.minutes} minute{timeRemaining.minutes === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'expired_hours') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'expired') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  // For Walk In and day 1 session, show hours when 1 day or less, minutes when less than 1 hour
                                  if (isWalkIn || isDay1Session) {
                                    if (timeRemaining.type === 'minutes') {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                          {timeRemaining.minutes} minute{timeRemaining.minutes === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    if (timeRemaining.type === 'hours') {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                          {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    return (
                                      <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  // For other plans, show orange if 7 days or less
                                  if (timeRemaining.type === 'minutes') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.minutes} minute{timeRemaining.minutes === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'hours') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'years_months') {
                                    const yearText = timeRemaining.years === 1 ? '1 year' : `${timeRemaining.years} years`
                                    const monthText = timeRemaining.months === 0 ? '' : timeRemaining.months === 1 ? ' and 1 month' : ` and ${timeRemaining.months} months`
                                  return (
                                    <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                      'bg-green-100 text-green-700 border-green-300'
                                      }`}>
                                        {yearText}{monthText} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'months_days') {
                                    const monthText = timeRemaining.months === 1 ? '1 month' : `${timeRemaining.months} months`
                                    const daysText = timeRemaining.days === 0 ? '' : timeRemaining.days === 1 ? ' and 1 day' : ` and ${timeRemaining.days} days`
                                    return (
                                      <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                        'bg-green-100 text-green-700 border-green-300'
                                        }`}>
                                        {monthText}{daysText} left
                                      </Badge>
                                    )
                                  }
                                  return (
                                    <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                      'bg-green-100 text-green-700 border-green-300'
                                      }`}>
                                      {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} left
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
                                  {subscription.total_paid === 0 && 
                                   subscription.status_name?.toLowerCase() !== "cancelled" && 
                                   subscription.status_name?.toLowerCase() !== "canceled" &&
                                   subscription.display_status?.toLowerCase() !== "cancelled" &&
                                   subscription.display_status?.toLowerCase() !== "canceled" && (
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
      <Dialog open={isCreateSubscriptionDialogOpen} onOpenChange={(open) => {
        setIsCreateSubscriptionDialogOpen(open)
        if (!open) {
          // Reset search when dialog closes
          setUserSearchQuery("")
          setShowUserDropdown(false)
        }
      }}>
        <DialogContent
          className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden"
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
            {/* First Row: User Name and Plan Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label className="text-sm text-gray-700 font-semibold">User Name</Label>
                {currentSubscriptionId ? (
                  <Input
                    value={selectedUserInfo ? `${selectedUserInfo.fname || ''} ${selectedUserInfo.lname || ''}`.trim() : 'Loading...'}
                    disabled
                    placeholder="Loading user details..."
                    className="h-10 text-sm border border-gray-300 bg-gray-50"
                  />
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        value={userSearchQuery || (selectedUserInfo ? `${selectedUserInfo.fname || ''} ${selectedUserInfo.lname || ''}`.trim() : "")}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value)
                          setShowUserDropdown(true)
                          // Clear user selection if user starts typing
                          if (e.target.value !== userSearchQuery && subscriptionForm.user_id) {
                            setSubscriptionForm(prev => ({ ...prev, user_id: "" }))
                            setSelectedUserInfo(null)
                          }
                        }}
                        onFocus={() => setShowUserDropdown(true)}
                        placeholder="Search user by name or email..."
                        className="h-10 text-sm border border-gray-300 pl-10"
                      />
                    </div>
                    {showUserDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowUserDropdown(false)}
                        />
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {(() => {
                            const filteredUsers = availableUsers.filter((user) => {
                              const searchLower = userSearchQuery.toLowerCase()
                              const fullName = `${user.fname} ${user.lname}`.toLowerCase()
                              const email = (user.email || '').toLowerCase()
                              return fullName.includes(searchLower) || email.includes(searchLower)
                            })
                            
                            if (filteredUsers.length === 0) {
                              return (
                                <div className="p-3 text-sm text-gray-500 text-center">
                                  No users found
                                </div>
                              )
                            }
                            
                            return filteredUsers.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => {
                                  handleUserSelection(user.id.toString())
                                  setShowUserDropdown(false)
                                }}
                                className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-sm text-gray-900">
                                  {user.fname || ''} {user.lname || ''}
                                </div>
                                {user.email && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {user.email}
                                  </div>
                                )}
                              </div>
                            ))
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 font-semibold">Plan Name</Label>
                {currentSubscriptionId ? (
                  <Input
                    value={subscriptionForm.plan_name || 'Loading...'}
                    disabled
                    placeholder="Loading plan details..."
                    className="h-10 text-sm border border-gray-300 bg-gray-50"
                  />
                ) : (
                  <Select 
                    value={subscriptionForm.plan_id} 
                    onValueChange={handlePlanChange}
                  >
                    <SelectTrigger className="h-10 text-sm border border-gray-300">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionPlans.map((plan) => {
                        const isAvailable = plan.is_available !== false
                        const isActivePlan = userActiveSubscriptions.some(sub => parseInt(sub.plan_id) === parseInt(plan.id))
                        return (
                          <SelectItem 
                            key={plan.id} 
                            value={plan.id.toString()}
                            disabled={!isAvailable}
                            className={!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            <div className="flex flex-col w-full">
                              <div className="flex items-center justify-between w-full">
                                <span>{plan.plan_name}</span>
                                {isActivePlan && (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs ml-2">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              {isActivePlan && isAvailable && (
                                <span className="text-xs text-gray-600 mt-0.5">
                                  Renewal/Advance Payment - Will extend existing subscription
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Quantity Input for Plan ID 1, 2, 3 (Advance Payment/Renewal) */}
            {subscriptionForm.plan_id && (subscriptionForm.plan_id == 1 || subscriptionForm.plan_id == 2 || subscriptionForm.plan_id == 3) && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 font-semibold">
                  {userActiveSubscriptions.some(sub => parseInt(sub.plan_id) === parseInt(subscriptionForm.plan_id))
                    ? "Renewal/Advance Payment - How much to extend?"
                    : "How much of the plan do you want to renew or advance payment?"}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={planQuantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="Enter quantity"
                  className="h-10 text-sm border border-gray-300"
                />
                <p className="text-xs text-gray-500">
                  {subscriptionForm.plan_id == 1 
                    ? "Enter number of years for Gym Membership" 
                    : "Enter number of months for Monthly Plan"}
                </p>
              </div>
            )}

            {/* Second Row: Amount to Pay and Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 font-semibold">Amount to Pay</Label>
                <Input
                  value={subscriptionForm.amount_paid || '0.00'}
                  disabled
                  placeholder="Amount to pay"
                  className="h-10 text-sm border border-gray-300 bg-gray-50 text-gray-900 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 font-semibold">Payment Method</Label>
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

            {/* Active Subscriptions Indicator */}
            {selectedUserInfo && userActiveSubscriptions.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">Active Subscriptions</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                        {userActiveSubscriptions.length} Active
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      This member has active subscription(s). Selecting the same plan will extend/renew their subscription.
                    </p>
                    <div className="mt-3 space-y-2">
                      {userActiveSubscriptions.map((sub, index) => {
                        const endDate = new Date(sub.end_date)
                        const isExpiringSoon = endDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                        const isSelectedPlan = subscriptionForm.plan_id && parseInt(subscriptionForm.plan_id) === parseInt(sub.plan_id)
                        
                        return (
                          <div 
                            key={index}
                            className={`p-3 rounded-md border ${
                              isSelectedPlan 
                                ? 'bg-blue-50 border-blue-300' 
                                : 'bg-white border-green-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle className={`h-4 w-4 ${isSelectedPlan ? 'text-blue-600' : 'text-green-600'}`} />
                                <span className="text-sm font-medium text-gray-900">{sub.plan_name}</span>
                                {isSelectedPlan && (
                                  <Badge className="bg-blue-600 text-white text-xs ml-2">
                                    Selected Plan - This will extend/renew
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Expires: {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              {isExpiringSoon && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                                  Expiring Soon
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Section */}
            {/* User Discount Status */}
            {selectedUserInfo && userActiveDiscount && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                    userActiveDiscount === 'student' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'bg-purple-100 text-purple-700 border border-purple-300'
                  }`}>
                    {userActiveDiscount === 'student' ? '🎓 Student' : '👤 Senior (55+)'}
                  </div>
                  <span className="text-sm text-gray-600">
                    {subscriptionForm.plan_id == 2 || subscriptionForm.plan_id == 3 || subscriptionForm.plan_id == 5
                      ? 'Discount will be automatically applied to this plan'
                      : 'Discount is available for Monthly Access plans'}
                  </span>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            {subscriptionForm.plan_id && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-gray-700 mb-2 text-sm font-semibold">Price Breakdown</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  {(() => {
                    const selectedPlan = subscriptionPlans.find(p => p.id.toString() === subscriptionForm.plan_id)
                    const planPrice = parseFloat(selectedPlan?.price || 0)
                    const amountPaid = parseFloat(subscriptionForm.amount_paid || 0)
                    const discount = discountConfig[subscriptionForm.discount_type]?.discount || 0
                    const hasDiscount = subscriptionForm.discount_type !== 'none' && subscriptionForm.discount_type !== 'regular' && discount > 0
                    
                    // Calculate original total: base price * quantity
                    const quantity = planQuantity || 1
                    const originalTotal = planPrice * quantity

                    return (
                      <>
                        <div className="flex justify-between">
                          <span>Original Price:</span>
                          <span className="font-medium text-gray-900">
                            {quantity > 1 ? (
                              <span>
                                ₱{planPrice.toFixed(2)} × {quantity} {subscriptionForm.plan_id == 1 ? 'year' : 'month'}{quantity > 1 ? 's' : ''} = ₱{originalTotal.toFixed(2)}
                              </span>
                            ) : (
                              `₱${planPrice.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        {hasDiscount && (
                          <div className="flex justify-between text-blue-700">
                            <span>Discount ({discountConfig[subscriptionForm.discount_type]?.name}):</span>
                            <span className="font-medium">-₱{discount.toFixed(2)}</span>
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

      {/* Create Guest Session Dialog */}
      <Dialog open={isCreateGuestSessionDialogOpen} onOpenChange={setIsCreateGuestSessionDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] overflow-x-hidden" hideClose>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Guest Session</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Name</Label>
              <Input
                value={guestSessionForm.guest_name}
                onChange={(e) => setGuestSessionForm(prev => ({ ...prev, guest_name: e.target.value }))}
                placeholder="Enter name"
                className="h-11 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
              />
            </div>

            {/* Plan and Price in Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Plan Display */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Plan</Label>
                <Input
                  value={gymSessionPlan?.plan_name || "Gym Session"}
                  disabled
                  className="h-11 text-sm border-gray-300 bg-gray-50 text-gray-700"
                />
              </div>

              {/* Price Display */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Price</Label>
                <Input
                  value={gymSessionPlan ? `₱${parseFloat(gymSessionPlan.price || 0).toFixed(2)}` : "₱0.00"}
                  disabled
                  className="h-11 text-sm border-gray-300 bg-gray-50 font-semibold text-gray-900"
                />
              </div>
            </div>

            {/* Payment Method - Cash and GCash buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGuestSessionForm(prev => ({ ...prev, payment_method: "cash", amount_received: prev.payment_method === "cash" ? prev.amount_received : "" }))}
                  className={`h-9 rounded-lg border-2 transition-all font-medium text-sm ${guestSessionForm.payment_method === "cash"
                    ? "border-gray-900 bg-gray-900 text-white shadow-md"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setGuestSessionForm(prev => ({ ...prev, payment_method: "digital", amount_received: "" }))}
                  className={`h-9 rounded-lg border-2 transition-all font-medium text-sm ${guestSessionForm.payment_method === "digital"
                    ? "border-gray-900 bg-gray-900 text-white shadow-md"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                >
                  GCash
                </button>
              </div>
            </div>

            {/* Amount Received (for cash only) */}
            {guestSessionForm.payment_method === "cash" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={guestSessionForm.amount_received}
                  onChange={(e) => setGuestSessionForm(prev => ({ ...prev, amount_received: e.target.value }))}
                  placeholder="Enter amount received"
                  className="h-11 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {guestSessionForm.amount_received && gymSessionPlan && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Change:</span>
                      <span className="text-base font-bold text-gray-900">₱{guestSessionChangeGiven.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsCreateGuestSessionDialogOpen(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGuestSession}
              disabled={
                guestSessionLoading ||
                !guestSessionForm.guest_name ||
                !gymSessionPlan ||
                (guestSessionForm.payment_method === "cash" && (!guestSessionForm.amount_received || parseFloat(guestSessionForm.amount_received) < parseFloat(gymSessionPlan.price || 0)))
              }
              className="bg-gray-900 hover:bg-gray-800 text-white font-semibold"
            >
              {guestSessionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Session Receipt Modal */}
      <Dialog open={showGuestReceipt} onOpenChange={setShowGuestReceipt}>
        <DialogContent className="max-w-lg" hideClose>
          <DialogHeader>
            <DialogTitle className="sr-only">Guest Session Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Transaction completed successfully. Receipt details are displayed below.
            </DialogDescription>
          </DialogHeader>
          {lastGuestTransaction && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="text-center space-y-4 pb-6 border-b-2 border-gray-200">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">CNERGY GYM</h2>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Guest Session Receipt</p>
                </div>
                <div className="pt-2 space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-700">Transaction Completed Successfully</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-xs font-medium text-gray-500">Receipt #</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">{lastGuestTransaction.receipt_number || "N/A"}</span>
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
                    <span className="text-sm font-medium text-gray-600">Guest Name</span>
                    <span className="text-sm font-semibold text-gray-900">{lastGuestTransaction.guest_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Plan</span>
                    <span className="text-sm font-semibold text-gray-900">Gym Session</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Payment Method</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">{lastGuestTransaction.payment_method}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Amount Paid</span>
                    <span className="text-base font-bold text-gray-900">₱{parseFloat(lastGuestTransaction.total_amount || 0).toFixed(2)}</span>
                  </div>
                  {lastGuestTransaction.payment_method === "cash" && lastGuestTransaction.amount_received && (
                    <>
                      <div className="flex justify-between items-center py-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Amount Received</span>
                        <span className="text-sm font-semibold text-gray-900">₱{parseFloat(lastGuestTransaction.amount_received).toFixed(2)}</span>
                      </div>
                      {lastGuestTransaction.change_given > 0 && (
                        <div className="flex justify-between items-center py-2 border-t border-gray-200">
                          <span className="text-sm font-medium text-gray-600">Change</span>
                          <span className="text-sm font-semibold text-gray-900">₱{parseFloat(lastGuestTransaction.change_given).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-center text-gray-500">
                  Thank you for choosing CNERGY GYM!
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setShowGuestReceipt(false)
                setLastGuestTransaction(null)
              }}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white"
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
