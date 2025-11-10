"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Plus,
  ShoppingCart,
  Package,
  TrendingUp,
  Search,
  Edit,
  Trash2,
  Minus,
  Calendar as CalendarIcon,
  User,
  ShoppingBag,
  CheckCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  UserCheck,
  LogIn,
  AlertTriangle,
  Clock,
  Store,
  BarChart3,
} from "lucide-react"

// API Configuration
const API_BASE_URL = "https://api.cnergy.site/sales.php"

const Sales = ({ userId }) => {
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "", category: "Uncategorized" })
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  // Filter states
  const [analyticsFilter, setAnalyticsFilter] = useState("today")
  const [saleTypeFilter, setSaleTypeFilter] = useState("all") // all, Product, Subscription, Coach Assignment, Walk-in, Day Pass
  const [dateFilter, setDateFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [unifiedSalesFilter, setUnifiedSalesFilter] = useState("all") // all, Product, Subscription, Coach Assignment, Walk-in, Day Pass

  // Calendar states
  const [customDate, setCustomDate] = useState(null)
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [monthFilter, setMonthFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")

  // Cart for multiple products
  const [cart, setCart] = useState([])

  // POS state
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [changeGiven, setChangeGiven] = useState(0)
  const [receiptNumber, setReceiptNumber] = useState("")
  const [transactionNotes, setTransactionNotes] = useState("")
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Stock management state
  const [stockUpdateProduct, setStockUpdateProduct] = useState(null)
  const [stockUpdateQuantity, setStockUpdateQuantity] = useState("")
  const [stockUpdateType, setStockUpdateType] = useState("add")
  const [isAddOnlyMode, setIsAddOnlyMode] = useState(false)

  // Product edit state
  const [editProduct, setEditProduct] = useState(null)
  const [editProductData, setEditProductData] = useState({ name: "", price: "", category: "Uncategorized" })

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)

  // Low stock dialog state
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false)

  // Success notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Coaching Sales dialog state
  const [coachingSalesDialogOpen, setCoachingSalesDialogOpen] = useState(false)
  const [coaches, setCoaches] = useState([])
  const [selectedCoachFilter, setSelectedCoachFilter] = useState("all")
  const [memberAssignments, setMemberAssignments] = useState({}) // Map of member_id -> assignment details
  const [coachingStatusFilter, setCoachingStatusFilter] = useState("active") // active or expired
  const [coachingMonthFilter, setCoachingMonthFilter] = useState("all")
  const [coachingYearFilter, setCoachingYearFilter] = useState("all")
  const [coachingServiceTypeFilter, setCoachingServiceTypeFilter] = useState("all") // all, session, monthly
  const [coachingCurrentPage, setCoachingCurrentPage] = useState(1)
  const [coachingItemsPerPage] = useState(10)

  // Walk-in Sales dialog state
  const [walkinSalesDialogOpen, setWalkinSalesDialogOpen] = useState(false)

  // Product Sales dialog state
  const [productSalesDialogOpen, setProductSalesDialogOpen] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all")
  const [selectedProductFilter, setSelectedProductFilter] = useState("all")

  // Subscription Sales dialog state
  const [subscriptionSalesDialogOpen, setSubscriptionSalesDialogOpen] = useState(false)
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all")

  // Data from API
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [analytics, setAnalytics] = useState({
    todaysSales: 0,
    productsSoldToday: 0,
    lowStockItems: 0,
    monthlyRevenue: 0,
    productSales: 0,
    subscriptionSales: 0,
    coachAssignmentSales: 0,
    walkinSales: 0,
    totalSales: 0,
    totalProductSales: 0,
    totalSubscriptionSales: 0,
  })

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Reload analytics when filter changes
  useEffect(() => {
    loadAnalytics()
  }, [analyticsFilter, saleTypeFilter, monthFilter, yearFilter, useCustomDate, customDate])

  // Reload sales when filters change
  useEffect(() => {
    loadSales()
  }, [saleTypeFilter, dateFilter, monthFilter, yearFilter, useCustomDate, customDate])

  // Load coaches when coaching sales dialog opens
  useEffect(() => {
    if (coachingSalesDialogOpen) {
      loadCoaches()
    }
  }, [coachingSalesDialogOpen])

  // Load member assignments when coaching sales dialog opens
  useEffect(() => {
    if (coachingSalesDialogOpen) {
      loadMemberAssignments()
    } else {
      setMemberAssignments({})
      setCoachingCurrentPage(1) // Reset to first page when dialog closes
    }
  }, [coachingSalesDialogOpen])

  // Reset to first page when filters change
  useEffect(() => {
    setCoachingCurrentPage(1)
  }, [selectedCoachFilter, coachingMonthFilter, coachingYearFilter, coachingServiceTypeFilter, coachingStatusFilter])

  // Load subscription plans when subscription sales dialog opens
  useEffect(() => {
    if (subscriptionSalesDialogOpen) {
      loadSubscriptionPlans()
    }
  }, [subscriptionSalesDialogOpen])

  // Calculate total sales with discount consideration
  const calculateTotalSales = (salesData) => {
    return salesData.reduce((total, sale) => {
      // If the sale has discount info, use the discounted amount
      if (sale.discount_amount && sale.discount_amount > 0) {
        return total + (sale.amount - sale.discount_amount);
      }
      // Otherwise use the regular amount
      return total + sale.amount;
    }, 0);
  }

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadProducts(), loadSales(), loadAnalytics()])
    } catch (error) {
      console.error("Error loading initial data:", error)
      alert("Error loading data. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }


  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=products`)
      console.log("Products loaded:", response.data.products)
      setProducts(response.data.products || [])
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

  const loadCoaches = async () => {
    try {
      const response = await axios.get("https://api.cnergy.site/addcoach.php")
      if (response.data && response.data.coaches) {
        const coaches = response.data.coaches.map(coach => ({
          id: coach.id,
          name: `${coach.fname} ${coach.mname || ''} ${coach.lname}`.trim()
        }))
        setCoaches(coaches)
      }
    } catch (error) {
      console.error("Error loading coaches:", error)
    }
  }

  // Calculate member count per coach from sales data
  const getMemberCountForCoach = (coachId) => {
    const coachingSales = sales.filter(sale => {
      const isCoachingSale = sale.sale_type === 'Coaching' ||
        sale.sale_type === 'Coach Assignment' ||
        sale.sale_type === 'Coach'
      return isCoachingSale && sale.coach_id && sale.coach_id.toString() === coachId.toString()
    })

    // Get unique member IDs
    const uniqueMemberIds = new Set()
    coachingSales.forEach(sale => {
      if (sale.user_id) {
        uniqueMemberIds.add(sale.user_id)
      }
    })

    return uniqueMemberIds.size
  }

  // Load member assignments to get end dates and days left for each member
  const loadMemberAssignments = async () => {
    try {
      const response = await axios.get(`https://api.cnergy.site/admin_coach.php?action=assigned-members`)
      if (response.data && response.data.success && response.data.assignments && response.data.assignments.length > 0) {
        const assignmentsMap = {}

        response.data.assignments.forEach(assignment => {
          const memberId = assignment.member?.id || assignment.member_id
          const coachId = assignment.coach?.id || assignment.coach_id

          if (memberId && coachId) {
            const key = `${memberId}_${coachId}`

            // Only keep the most recent active assignment for each member-coach pair
            if (!assignmentsMap[key] || assignment.status === 'active') {
              const endDate = assignment.expires_at || assignment.expiresAt
              let daysLeft = null

              if (endDate) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const expiry = new Date(endDate)
                expiry.setHours(0, 0, 0, 0)
                const diffTime = expiry - today
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              }

              assignmentsMap[key] = {
                endDate,
                daysLeft,
                startDate: assignment.staff_approved_at || assignment.assignedAt || assignment.created_at,
                rateType: assignment.rateType || assignment.rate_type || 'monthly',
                assignmentType: assignment.assignment_type || assignment.rateType || assignment.rate_type || 'monthly'
              }
            }
          }
        })

        setMemberAssignments(assignmentsMap)
      }
    } catch (error) {
      console.error("Error loading member assignments:", error)
      setMemberAssignments({})
    }
  }

  // Get assignment details for a specific member and coach
  const getMemberAssignmentDetails = (memberId, coachId) => {
    if (!memberId || !coachId) return null
    const key = `${memberId}_${coachId}`
    return memberAssignments[key] || null
  }

  const loadSubscriptionPlans = async () => {
    try {
      const response = await axios.get("https://api.cnergy.site/monitor_subscription.php?action=plans")
      if (response.data && response.data.plans) {
        const plans = response.data.plans.map(plan => ({
          id: plan.id,
          name: plan.plan_name
        }))
        setSubscriptionPlans(plans)
      }
    } catch (error) {
      console.error("Error loading subscription plans:", error)
      // If that endpoint doesn't work, try fetching from monitor_subscription
      try {
        const altResponse = await axios.get("https://api.cnergy.site/monitor_subscription.php")
        if (altResponse.data && altResponse.data.plans) {
          const plans = altResponse.data.plans.map(plan => ({
            id: plan.id,
            name: plan.plan_name
          }))
          setSubscriptionPlans(plans)
        }
      } catch (altError) {
        console.error("Error loading subscription plans from alternative endpoint:", altError)
      }
    }
  }

  const loadSales = async () => {
    try {
      const params = new URLSearchParams()
      if (saleTypeFilter !== "all") {
        // Map filter values to backend expected values
        let backendSaleType = saleTypeFilter
        if (saleTypeFilter === "Day Pass") {
          backendSaleType = "Guest" // Backend uses "Guest" for day pass
        }
        params.append("sale_type", backendSaleType)
      }
      if (dateFilter !== "all") {
        params.append("date_filter", dateFilter)
      }
      if (monthFilter && monthFilter !== "all") {
        params.append("month", monthFilter)
      }
      if (yearFilter && yearFilter !== "all") {
        params.append("year", yearFilter)
      }
      if (useCustomDate && customDate) {
        params.append("custom_date", format(customDate, "yyyy-MM-dd"))
      }

      const response = await axios.get(`${API_BASE_URL}?action=sales&${params.toString()}`)
      setSales(response.data.sales || [])
    } catch (error) {
      console.error("Error loading sales:", error)
    }
  }

  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams()

      // Handle custom date first (highest priority)
      if (useCustomDate && customDate) {
        params.append("period", "custom")
        params.append("custom_date", format(customDate, "yyyy-MM-dd"))
      } else {
        params.append("period", analyticsFilter)
      }

      if (saleTypeFilter !== "all") {
        // Map filter values to backend expected values
        let backendSaleType = saleTypeFilter
        if (saleTypeFilter === "Day Pass") {
          backendSaleType = "Guest" // Backend uses "Guest" for day pass
        }
        params.append("sale_type", backendSaleType)
      }

      if (monthFilter && monthFilter !== "all") {
        params.append("month", monthFilter)
      }
      if (yearFilter && yearFilter !== "all") {
        params.append("year", yearFilter)
      }

      const response = await axios.get(`${API_BASE_URL}?action=analytics&${params.toString()}`)
      setAnalytics(
        response.data.analytics || {
          todaysSales: 0,
          productsSoldToday: 0,
          lowStockItems: 0,
          monthlyRevenue: 0,
          productSales: 0,
          subscriptionSales: 0,
          coachAssignmentSales: 0,
          walkinSales: 0,
          totalSales: 0,
          totalProductSales: 0,
          totalSubscriptionSales: 0,
        },
      )
    } catch (error) {
      console.error("Error loading analytics:", error)
    }
  }

  const addToCart = () => {
    if (!selectedProduct) {
      alert("Please select a product")
      return
    }

    const product = getFilteredProducts().find((p) => p.id == selectedProduct || p.id === Number.parseInt(selectedProduct))
    if (!product) {
      console.log("Selected product ID:", selectedProduct)
      console.log("Available products:", products)
      alert("Product not found!")
      return
    }

    if (product.stock < quantity) {
      alert("Insufficient stock!")
      return
    }

    // Check if product already in cart
    const existingItemIndex = cart.findIndex((item) => item.product.id === product.id)
    if (existingItemIndex >= 0) {
      // Update quantity to the new value (replace, not add)
      const updatedCart = [...cart]
      if (quantity > product.stock) {
        alert("Quantity exceeds available stock!")
        return
      }
      updatedCart[existingItemIndex].quantity = quantity
      updatedCart[existingItemIndex].price = product.price * quantity
      setCart(updatedCart)
    } else {
      // Add new item to cart
      const cartItem = {
        product: product,
        quantity: quantity,
        price: product.price * quantity,
      }
      setCart([...cart, cartItem])
    }

    // Reset form
    setSelectedProduct("")
    setQuantity(1)
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = getFilteredProducts().find((p) => p.id == productId || p.id === Number.parseInt(productId))
    if (!product) {
      alert("Product not found!")
      return
    }

    if (newQuantity > product.stock) {
      alert("Quantity exceeds available stock!")
      return
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity, price: product.price * newQuantity } : item,
      ),
    )
  }

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.price, 0)
  }

  const handleProductSale = async () => {
    if (cart.length === 0) {
      alert("Please add products to cart")
      return
    }

    // Validate payment method and amount for cash payments
    if (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < getTotalAmount())) {
      alert("Please enter a valid amount received for cash payment")
      return
    }

    setShowConfirmDialog(true)
  }

  const confirmTransaction = async () => {
    setShowConfirmDialog(false)
    await handlePOSSale()
  }

  const handleRegularSale = async () => {
    setLoading(true)
    try {
      const saleData = {
        total_amount: getTotalAmount(),
        sale_type: "Product",
        sales_details: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        })),
      }

      const response = await axios.post(`${API_BASE_URL}?action=sale&staff_id=${userId}`, saleData)
      if (response.data.success) {
        alert("Sale completed successfully!")
        // Reset form and cart
        setCart([])
        // Reload data
        await Promise.all([loadProducts(), loadSales(), loadAnalytics()])
      }
    } catch (error) {
      console.error("Error creating sale:", error)
      alert(error.response?.data?.error || "Error creating sale")
    } finally {
      setLoading(false)
    }
  }

  const handlePOSSale = async () => {
    if (!paymentMethod) {
      alert("Please select a payment method")
      return
    }

    const totalAmount = getTotalAmount()
    const receivedAmount = parseFloat(amountReceived) || totalAmount
    const change = Math.max(0, receivedAmount - totalAmount)

    if (paymentMethod === "cash" && receivedAmount < totalAmount) {
      alert("Amount received cannot be less than total amount")
      return
    }

    setLoading(true)
    try {
      const saleData = {
        total_amount: totalAmount,
        sale_type: "Product",
        sales_details: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        })),
        payment_method: paymentMethod,
        amount_received: receivedAmount,
        notes: transactionNotes
      }

      const response = await axios.post(`${API_BASE_URL}?action=pos_sale&staff_id=${userId}`, saleData)
      if (response.data.success) {
        setLastTransaction({
          ...response.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: paymentMethod
        })
        setReceiptNumber(response.data.receipt_number)
        setChangeGiven(change)
        setShowReceipt(true)

        // Reset form and cart
        setCart([])
        setAmountReceived("")
        setTransactionNotes("")
        setPaymentMethod("cash")

        // Reload products immediately (before showing receipt)
        await loadProducts()

        // Reload sales and analytics in background
        loadSales()
        loadAnalytics()
      }
    } catch (error) {
      console.error("Error creating POS sale:", error)
      alert(error.response?.data?.error || "Error creating POS sale")
    } finally {
      setLoading(false)
    }
  }

  const calculateChange = () => {
    const total = getTotalAmount()
    const received = parseFloat(amountReceived) || 0
    const change = Math.max(0, received - total)
    setChangeGiven(change)
    return change
  }

  // Calculate change whenever amount received or cart changes
  useEffect(() => {
    if (paymentMethod === "cash" && amountReceived) {
      calculateChange()
    }
  }, [amountReceived, cart, paymentMethod])


  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      alert("Please fill all product fields")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}?action=product&staff_id=${userId}`, {
        name: newProduct.name,
        price: Number.parseFloat(newProduct.price),
        stock: Number.parseInt(newProduct.stock),
        category: newProduct.category,
      })

      if (response.data.success) {
        setSuccessMessage("Product added successfully!")
        setShowSuccessNotification(true)
        setNewProduct({ name: "", price: "", stock: "", category: "Uncategorized" })
        await loadProducts()
      }
    } catch (error) {
      console.error("Error adding product:", error)
      alert(error.response?.data?.error || "Error adding product")
    } finally {
      setLoading(false)
    }
  }

  const handleStockUpdate = async () => {
    if (!stockUpdateProduct || !stockUpdateQuantity) {
      alert("Please fill all fields")
      return
    }

    const updateQuantity = Number.parseInt(stockUpdateQuantity)
    if (updateQuantity <= 0) {
      alert("Quantity must be greater than 0")
      return
    }

    // Ensure userId is available
    if (!userId) {
      alert("User ID is missing. Please refresh the page and try again.")
      return
    }

    setLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}?action=stock&staff_id=${userId}`, {
        product_id: stockUpdateProduct.id,
        quantity: updateQuantity,
        type: stockUpdateType,
        staff_id: userId,
      }, {
        timeout: 30000 // Increase timeout to 30 seconds
      })

      if (response.data.success) {
        setSuccessMessage(`Stock ${stockUpdateType === "add" ? "added" : "removed"} successfully!`)
        setShowSuccessNotification(true)
        setStockUpdateProduct(null)
        setStockUpdateQuantity("")
        setStockUpdateType("add")
        setIsAddOnlyMode(false)
        await Promise.all([loadProducts(), loadAnalytics()])
      }
    } catch (error) {
      console.error("Error updating stock:", error)

      // Check if it's a timeout but the update might have succeeded
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Reload products to check if update actually succeeded
        await loadProducts()
        await loadAnalytics()

        // Check if the stock was actually updated
        const updatedProducts = await axios.get(`${API_BASE_URL}?action=products`)
        const updatedProduct = updatedProducts.data.products?.find(p => p.id === stockUpdateProduct.id)

        if (updatedProduct) {
          const expectedStock = stockUpdateType === "add"
            ? Number.parseInt(stockUpdateProduct.stock) + updateQuantity
            : Math.max(0, Number.parseInt(stockUpdateProduct.stock) - updateQuantity)

          if (updatedProduct.stock == expectedStock) {
            // Update actually succeeded, show success
            setSuccessMessage(`Stock ${stockUpdateType === "add" ? "added" : "removed"} successfully!`)
            setShowSuccessNotification(true)
            setStockUpdateProduct(null)
            setStockUpdateQuantity("")
            setStockUpdateType("add")
            setIsAddOnlyMode(false)
            setLoading(false)
            return
          }
        }
      }

      // Only show error if update actually failed
      alert(error.response?.data?.error || "Error updating stock. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEditProduct = async () => {
    if (!editProductData.name || !editProductData.price) {
      alert("Please fill all required fields")
      return
    }

    setLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}?action=product`, {
        id: editProduct.id,
        name: editProductData.name,
        price: Number.parseFloat(editProductData.price),
        category: editProductData.category,
      })

      if (response.data.success) {
        setSuccessMessage("Product updated successfully!")
        setShowSuccessNotification(true)
        setEditProduct(null)
        setEditProductData({ name: "", price: "", category: "Uncategorized" })
        await loadProducts()
      }
    } catch (error) {
      console.error("Error updating product:", error)
      alert(error.response?.data?.error || "Error updating product")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return

    setLoading(true)
    try {
      const response = await axios.delete(`${API_BASE_URL}?action=product`, {
        data: { id: productToDelete.id }
      })

      if (response.data.success) {
        setDeleteDialogOpen(false)
        setProductToDelete(null)
        await loadProducts()
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      alert(error.response?.data?.error || "Error deleting product")
    } finally {
      setLoading(false)
    }
  }

  const openDeleteDialog = (product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const openEditDialog = (product) => {
    setEditProduct(product)
    setEditProductData({
      name: product.name,
      price: product.price.toString(),
      category: product.category
    })
  }


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getProductName = (salesDetail) => {
    if (salesDetail.product) {
      return salesDetail.product.name
    }
    return salesDetail.subscription_id ? "Subscription Plan" : "Unknown Item"
  }

  const getUniqueCategories = () => {
    const categories = [...new Set(products.map(product => product.category).filter(category => category && category.trim() !== ""))]
    return categories.sort()
  }

  const getFilteredProducts = () => {
    if (categoryFilter === "all") {
      return products
    }
    return products.filter(product => product.category === categoryFilter)
  }

  const getLowStockProducts = () => {
    return products.filter(product => product.stock <= 10)
  }

  const filteredSales = sales.filter((sale) => {
    // Filter by search query
    const matchesSearch = searchQuery === "" ||
      sale.sale_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.sales_details.some(detail =>
        detail.product && detail.product.name.toLowerCase().includes(searchQuery.toLowerCase())
      )

    // Filter by sale type (this should already be handled by the API, but keeping as backup)
    let matchesSaleType = true
    if (saleTypeFilter !== "all") {
      if (saleTypeFilter === "Walk-in") {
        // Walk-in sales: 'Walk-in' or 'Walkin'
        matchesSaleType = sale.sale_type === 'Walk-in' || sale.sale_type === 'Walkin'
      } else if (saleTypeFilter === "Day Pass") {
        // Day Pass sales: 'Guest' or 'Day Pass'
        matchesSaleType = sale.sale_type === 'Guest' || sale.sale_type === 'Day Pass'
      } else if (saleTypeFilter === "Coach Assignment") {
        // Coaching sales: 'Coach Assignment', 'Coaching', or 'Coach'
        matchesSaleType = sale.sale_type === 'Coach Assignment' ||
          sale.sale_type === 'Coaching' ||
          sale.sale_type === 'Coach'
      } else {
        // Other types: exact match
        matchesSaleType = sale.sale_type === saleTypeFilter
      }
    }

    return matchesSearch && matchesSaleType
  })


  if (loading && sales.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading sales data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-1">Sales Management</CardTitle>
            <p className="text-sm text-gray-600">Manage product sales and inventory for CNERGY Gym</p>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats with Filter */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 shadow-sm">
                <Store className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">Sales Overview</CardTitle>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Label htmlFor="analytics-filter" className="text-sm font-medium text-gray-700">Period:</Label>
              <Select value={analyticsFilter} onValueChange={setAnalyticsFilter}>
                <SelectTrigger className="w-36 bg-white border-gray-300 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>

              {/* Month Filter */}
              <Label htmlFor="month-filter" className="text-sm font-medium text-gray-700">Month:</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-36 bg-white border-gray-300 shadow-sm">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
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

              {/* Year Filter */}
              <Label htmlFor="year-filter" className="text-sm font-medium text-gray-700">Year:</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-28 bg-white border-gray-300 shadow-sm">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                  <SelectItem value="2020">2020</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={useCustomDate ? "default" : "outline"}
                    className={cn(
                      "w-[220px] justify-start text-left font-medium h-10 border-2 transition-all duration-200",
                      useCustomDate
                        ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-md"
                        : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, "MMM dd, yyyy") : "Pick specific date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={(date) => {
                      setCustomDate(date)
                      setUseCustomDate(true)
                      setAnalyticsFilter("custom")
                    }}
                    className="rounded-md border"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Total Sales Card */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Total Sales</CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <TrendingUp className="h-5 w-5 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(analytics.todaysSales)}</div>
                <p className="text-xs text-gray-600 font-medium">All sales combined</p>
              </CardContent>
            </Card>

            {/* Product Sales Card */}
            <Card
              className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Product Sales</CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <ShoppingCart className="h-5 w-5 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(analytics.productSales || 0)}</div>
                <p className="text-xs text-gray-600 font-medium mb-3">
                  {analytics.productsSoldToday || 0} items sold
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setProductSalesDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Sales Card */}
            <Card
              className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Subscription Sales</CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(analytics.subscriptionSales || 0)}</div>
                <p className="text-xs text-gray-600 font-medium mb-3">Membership revenue</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setSubscriptionSalesDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Coaching Sales Card */}
            <Card
              className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Coaching Sales</CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <UserCheck className="h-5 w-5 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(analytics.coachAssignmentSales || 0)}</div>
                <p className="text-xs text-gray-600 font-medium mb-3">Coach revenue</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setCoachingSalesDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Walk-in Sales Card */}
            <Card
              className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Walk-in Sales</CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <LogIn className="h-5 w-5 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(analytics.walkinSales || 0)}</div>
                <p className="text-xs text-gray-600 font-medium mb-3">Guest/day pass revenue</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setWalkinSalesDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Low Stock Items Card */}
            <Card
              className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Low Stock Items</CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <AlertTriangle className="h-5 w-5 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{analytics.lowStockItems}</div>
                <p className="text-xs text-gray-600 font-medium mb-3">Need restocking</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setLowStockDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">New Sale</TabsTrigger>
          <TabsTrigger value="history">Sales History</TabsTrigger>
          <TabsTrigger value="products">Product Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Add Products to Cart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Filter by Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getUniqueCategories().map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredProducts() && getFilteredProducts().length > 0 ? getFilteredProducts().map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()} disabled={product.stock === 0}>
                          {product.name} - {formatCurrency(product.price)} ({product.stock} in stock) [{product.category}]
                        </SelectItem>
                      )) : (
                        <SelectItem value="no-products" disabled>No products available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max={
                      selectedProduct ? (products.find((p) => p.id == selectedProduct || p.id === Number.parseInt(selectedProduct))?.stock || 1) : 1
                    }
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    disabled={!selectedProduct}
                  />
                </div>

                <Button onClick={addToCart} className="w-full" disabled={!selectedProduct || loading}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>

            {/* Shopping Cart */}
            <Card>
              <CardHeader>
                <CardTitle>Shopping Cart ({cart.length} items)</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No items in cart</p>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {cart.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.product?.name || 'Unknown Product'}</h4>
                            <p className="text-sm text-muted-foreground">{formatCurrency(item.product?.price || 0)} each</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => removeFromCart(item.product.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="text-right ml-4">
                            <p className="font-medium">{formatCurrency(item.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(getTotalAmount())}</span>
                      </div>
                    </div>

                    {/* Payment Interface - Always Visible */}
                    {cart.length > 0 && (
                      <div className="border-t pt-4 space-y-4">
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

                        {paymentMethod === "cash" && (
                          <div className="space-y-2">
                            <Label>Amount Received (₱)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={amountReceived}
                              onChange={(e) => setAmountReceived(e.target.value)}
                              placeholder="Enter amount received"
                            />
                            {amountReceived && (
                              <div className="text-sm text-muted-foreground">
                                Change: {formatCurrency(changeGiven)}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Transaction Notes (Optional)</Label>
                          <Input
                            value={transactionNotes}
                            onChange={(e) => setTransactionNotes(e.target.value)}
                            placeholder="Add notes for this transaction"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleProductSale}
                      className="w-full"
                      disabled={cart.length === 0 || loading || (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < getTotalAmount()))}
                    >
                      {loading ? "Processing..." : "Process Sale"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle>Sales History</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Showing {filteredSales.length} of {sales.length} sales</span>
                      {saleTypeFilter !== "all" && (
                        <Badge variant="outline" className="text-xs">
                          {saleTypeFilter} only
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search sales..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sale-type-filter">Sale Type:</Label>
                    <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Product">Product Sales</SelectItem>
                        <SelectItem value="Subscription">Subscription Sales</SelectItem>
                        <SelectItem value="Coach Assignment">Coaching Sales</SelectItem>
                        <SelectItem value="Walk-in">Walk-in Sales</SelectItem>
                        <SelectItem value="Day Pass">Day Pass Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="month-filter">Month:</Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="year-filter">Year:</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2021">2021</SelectItem>
                        <SelectItem value="2020">2020</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={useCustomDate ? "default" : "outline"}
                        className={cn(
                          "w-[220px] justify-start text-left font-medium h-10 border-2 transition-all duration-200",
                          useCustomDate
                            ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-md"
                            : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDate ? format(customDate, "MMM dd, yyyy") : "Pick specific date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 shadow-2xl" align="start">
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={(date) => {
                          setCustomDate(date)
                          setUseCustomDate(!!date)
                          // Clear month/year filters when custom date is selected
                          if (date) {
                            setMonthFilter("all")
                            setYearFilter("all")
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {useCustomDate && customDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomDate(null)
                        setUseCustomDate(false)
                      }}
                      className="h-10 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200"
                    >
                      ✕ Clear Date
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Items</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No sales found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div className="space-y-1">
                            {sale.sales_details.map((detail, index) => (
                              <div key={index} className="text-sm">
                                {getProductName(detail)}
                                {detail.quantity && ` (${detail.quantity}x)`}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            sale.sale_type === "Product" ? "outline" :
                              sale.sale_type === "Guest" ? "default" :
                                "secondary"
                          }>
                            {sale.sale_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {sale.payment_method || "N/A"}
                            </Badge>
                            {sale.change_given > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Change: {formatCurrency(sale.change_given)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-mono">
                            {sale.receipt_number || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(sale.sale_date)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(sale.total_amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Product Inventory</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>Add a new product to your inventory</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="Enter product name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price (₱)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        placeholder="Enter price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Initial Stock</Label>
                      <Input
                        type="number"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                        placeholder="Enter stock quantity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newProduct.category} onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                          <SelectItem value="Beverages">Beverages</SelectItem>
                          <SelectItem value="Supplements">Supplements</SelectItem>
                          <SelectItem value="Snacks">Snacks</SelectItem>
                          <SelectItem value="Merch/Apparel">Merch/Apparel</SelectItem>
                          <SelectItem value="Accessories">Accessories</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddProduct} disabled={loading}>
                      {loading ? "Adding..." : "Add Product"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="product-category-filter">Filter by Category:</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getUniqueCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredProducts().map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge
                            variant={product.stock > 10 ? "outline" : product.stock > 0 ? "secondary" : "destructive"}
                          >
                            {product.stock > 10 ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setStockUpdateProduct(product)
                                setIsAddOnlyMode(false)
                                setStockUpdateQuantity("")
                              }}
                              disabled={loading}
                            >
                              <Package className="mr-1 h-3 w-3" />
                              Stock
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              disabled={loading}
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(product)}
                              disabled={loading}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Stock Update Dialog */}
      <Dialog open={!!stockUpdateProduct} onOpenChange={() => {
        setStockUpdateProduct(null)
        setIsAddOnlyMode(false)
        setStockUpdateQuantity("")
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAddOnlyMode ? (
                <Plus className="h-5 w-5 text-green-600" />
              ) : (
                <Package className="h-5 w-5 text-gray-600" />
              )}
              {isAddOnlyMode ? "Add Stock" : "Update Stock"} - {stockUpdateProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Current stock: <span className="font-semibold text-gray-900">{stockUpdateProduct?.stock} units</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!isAddOnlyMode && (
            <div className="space-y-2">
                <Label className="text-sm font-medium">Action</Label>
              <Select value={stockUpdateType} onValueChange={setStockUpdateType}>
                  <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="add">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-600" />
                        <span>Add Stock</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="remove">
                      <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-red-600" />
                        <span>Remove Stock</span>
                      </div>
                    </SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {isAddOnlyMode ? "Quantity to Add" : "Quantity"}
              </Label>
              <Input
                type="number"
                min="1"
                value={stockUpdateQuantity}
                onChange={(e) => setStockUpdateQuantity(e.target.value)}
                placeholder={isAddOnlyMode ? "Enter quantity to add" : "Enter quantity"}
                className="text-lg"
                autoFocus
              />
            </div>
            {stockUpdateQuantity && stockUpdateProduct && (
              <div className={`p-4 rounded-lg border-2 ${stockUpdateType === "add" || isAddOnlyMode
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Stock Preview</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-700">{stockUpdateProduct.stock}</span>
                      <span className="text-gray-400">→</span>
                      <span className={`text-xl font-bold ${stockUpdateType === "add" || isAddOnlyMode ? "text-green-700" : "text-red-700"
                        }`}>
                        {stockUpdateType === "add" || isAddOnlyMode
                          ? Number.parseInt(stockUpdateProduct.stock) + Number.parseInt(stockUpdateQuantity || "0")
                          : Math.max(0, Number.parseInt(stockUpdateProduct.stock) - Number.parseInt(stockUpdateQuantity || "0"))}
                      </span>
                      <span className="text-sm text-gray-600">units</span>
                    </div>
                  </div>
                  {stockUpdateType === "add" || isAddOnlyMode ? (
                    <Plus className="h-6 w-6 text-green-600" />
                  ) : (
                    <Minus className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStockUpdateProduct(null)
                setIsAddOnlyMode(false)
                setStockUpdateQuantity("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockUpdate}
              disabled={loading || !stockUpdateQuantity}
              className={isAddOnlyMode || stockUpdateType === "add"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {loading ? "Updating..." : isAddOnlyMode || stockUpdateType === "add" ? "Add Stock" : "Remove Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product - {editProduct?.name}</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={editProductData.name}
                onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₱)</Label>
              <Input
                type="number"
                step="0.01"
                value={editProductData.price}
                onChange={(e) => setEditProductData({ ...editProductData, price: e.target.value })}
                placeholder="Enter price"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editProductData.category} onValueChange={(value) => setEditProductData({ ...editProductData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                  <SelectItem value="Beverages">Beverages</SelectItem>
                  <SelectItem value="Supplements">Supplements</SelectItem>
                  <SelectItem value="Snacks">Snacks</SelectItem>
                  <SelectItem value="Merch/Apparel">Merch/Apparel</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditProduct} disabled={loading}>
              {loading ? "Updating..." : "Update Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Transaction</DialogTitle>
            <DialogDescription>Please review the transaction details before proceeding</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Items in Cart:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.product?.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-2 space-y-2">
              <div className="flex justify-between font-medium">
                <span>Total Amount:</span>
                <span>{formatCurrency(getTotalAmount())}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="capitalize">{paymentMethod}</span>
              </div>
              {paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between">
                    <span>Amount Received:</span>
                    <span>{formatCurrency(parseFloat(amountReceived) || 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Change Given:</span>
                    <span>{formatCurrency(changeGiven)}</span>
                  </div>
                </>
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
            <Button onClick={confirmTransaction} disabled={loading}>
              {loading ? "Processing..." : "Confirm Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
            <DialogDescription>Transaction completed successfully</DialogDescription>
          </DialogHeader>
          {lastTransaction && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-bold">CNERGY GYM</h3>
                <p className="text-sm text-muted-foreground">Point of Sale Receipt</p>
                <p className="text-xs text-muted-foreground">Receipt #: {receiptNumber}</p>
                <p className="text-xs text-muted-foreground">
                  Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium capitalize">{lastTransaction.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrency(lastTransaction.total_amount)}</span>
                </div>
                {lastTransaction.payment_method === "cash" && (
                  <>
                    <div className="flex justify-between">
                      <span>Amount Received:</span>
                      <span>{formatCurrency(parseFloat(amountReceived) || lastTransaction.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change Given:</span>
                      <span className="font-medium">{formatCurrency(changeGiven)}</span>
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
                <p className="text-sm text-muted-foreground">Thank you for your business!</p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Product
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{productToDelete?.name}&quot;</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Low Stock Products Dialog */}
      <Dialog open={lowStockDialogOpen} onOpenChange={setLowStockDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] border-0 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900">
              Low Stock Products
            </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-1">
              Products with 10 or fewer items remaining that need restocking
            </DialogDescription>
                </div>
              </div>
              {getLowStockProducts().length > 0 && (
                <Badge variant="destructive" className="text-base px-4 py-1.5 bg-red-600">
                  {getLowStockProducts().length} {getLowStockProducts().length === 1 ? 'Item' : 'Items'}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] -mx-6 px-6">
            {getLowStockProducts().length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-50 to-emerald-50 mb-6 shadow-lg">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Products Well Stocked!</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Great news! All your products have sufficient inventory levels. No restocking needed at this time.
                </p>
              </div>
            ) : (
              <div className="py-4">
              <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Product Name</TableHead>
                      <TableHead className="font-semibold text-gray-900">Category</TableHead>
                      <TableHead className="font-semibold text-gray-900">Current Stock</TableHead>
                      <TableHead className="font-semibold text-gray-900">Price</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getLowStockProducts()
                    .sort((a, b) => a.stock - b.stock)
                    .map((product) => (
                        <TableRow key={product.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-semibold text-gray-900">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                              {product.category}
                            </Badge>
                          </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.stock === 0 ? "destructive" : product.stock <= 5 ? "destructive" : "secondary"}
                              className={`w-fit font-semibold ${product.stock === 0
                                ? "bg-red-600 text-white"
                                : product.stock <= 5
                                  ? "bg-red-600 text-white"
                                  : "bg-orange-100 text-black border-orange-300"
                                }`}
                            >
                              {product.stock} {product.stock === 1 ? 'unit' : 'units'}
                          </Badge>
                        </TableCell>
                          <TableCell className="font-medium text-gray-900">{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          {product.stock === 0 ? (
                              <Badge variant="destructive" className="bg-red-600 text-white font-semibold">
                                Out of Stock
                              </Badge>
                          ) : product.stock <= 5 ? (
                              <Badge variant="destructive" className="bg-red-600 text-white font-semibold">
                              Critical
                            </Badge>
                          ) : (
                              <Badge variant="outline" className="bg-orange-100 text-black border-orange-300 font-semibold">
                              Low Stock
                            </Badge>
                          )}
                        </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setStockUpdateProduct(product)
                                setStockUpdateType("add")
                                setStockUpdateQuantity("")
                                setIsAddOnlyMode(true)
                                setLowStockDialogOpen(false)
                              }}
                              disabled={loading}
                              className="bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-sm hover:shadow-md transition-all"
                            >
                              <Plus className="mr-1.5 h-4 w-4" />
                              Add Stock
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-gray-200 pt-4">
            <Button
              variant="outline"
              onClick={() => setLowStockDialogOpen(false)}
              className="font-medium border-gray-300 hover:bg-gray-50 hover:border-gray-400"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Notification Dialog */}
      <Dialog open={showSuccessNotification} onOpenChange={setShowSuccessNotification}>
        <DialogContent className="max-w-md border-0 shadow-2xl">
          <div className="flex flex-col items-center text-center py-6 px-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-4 shadow-lg">
              <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
              Success!
            </DialogTitle>
            <p className="text-gray-600 mb-6 text-lg">{successMessage}</p>
            <Button
              onClick={() => setShowSuccessNotification(false)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 text-base font-semibold shadow-md"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coaching Sales Dialog */}
      <Dialog open={coachingSalesDialogOpen} onOpenChange={setCoachingSalesDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Coaching Sales Details
            </DialogTitle>
            <DialogDescription>
              View all coaching sales by coach with detailed transaction information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Left side - Coach Filter */}
            <div className="flex items-center gap-4">
                <Label htmlFor="coach-filter">By Coach:</Label>
              <Select value={selectedCoachFilter} onValueChange={setSelectedCoachFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coaches</SelectItem>
                    {coaches.map((coach) => {
                      const memberCount = getMemberCountForCoach(coach.id)
                      return (
                    <SelectItem key={coach.id} value={coach.id.toString()}>
                          {coach.name} ({memberCount} member{memberCount !== 1 ? 's' : ''})
                    </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
            </div>

              {/* Right side - Service Type, Month and Year Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <Label htmlFor="coaching-service-type-filter">Service Type:</Label>
                <Select value={coachingServiceTypeFilter} onValueChange={setCoachingServiceTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="session">Session</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>

                <Label htmlFor="coaching-month-filter">Month:</Label>
                <Select value={coachingMonthFilter} onValueChange={setCoachingMonthFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
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

                <Label htmlFor="coaching-year-filter">Year:</Label>
                <Select value={coachingYearFilter} onValueChange={setCoachingYearFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2021">2021</SelectItem>
                    <SelectItem value="2020">2020</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coach Member Count Display Card */}
            {selectedCoachFilter !== "all" && (
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-gray-100">
                        <Users className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {coaches.find(c => c.id.toString() === selectedCoachFilter)?.name || 'Selected Coach'}
                        </p>
                        <p className="text-xs text-gray-600">Total Members</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">
                        {getMemberCountForCoach(selectedCoachFilter)}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {getMemberCountForCoach(selectedCoachFilter) === 1 ? 'Member' : 'Members'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sales Dashboard */}
            {(() => {
              const filteredSales = sales.filter((sale) => {
                const isCoachingSale = sale.sale_type === 'Coaching' ||
                  sale.sale_type === 'Coach Assignment' ||
                  sale.sale_type === 'Coach'
                if (!isCoachingSale) return false

                if (selectedCoachFilter !== "all") {
                  if (!sale.coach_id || sale.coach_id.toString() !== selectedCoachFilter) return false
                }

                if (coachingMonthFilter !== "all") {
                  const saleDate = new Date(sale.sale_date)
                  const saleMonth = saleDate.getMonth() + 1
                  if (saleMonth.toString() !== coachingMonthFilter) return false
                }

                if (coachingYearFilter !== "all") {
                  const saleDate = new Date(sale.sale_date)
                  const saleYear = saleDate.getFullYear().toString()
                  if (saleYear !== coachingYearFilter) return false
                }

                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)

                // Filter out package sales and N/A entries (broken data)
                const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                const normalizedServiceType = serviceType === 'per_session' || serviceType === 'session' ? 'session' :
                  serviceType === 'package' ? 'package' : 'monthly'

                // Exclude package sales
                if (normalizedServiceType === 'package') return false

                // Exclude entries with N/A end dates (broken data)
                if (!assignmentDetails?.endDate) return false

                if (coachingServiceTypeFilter !== "all") {
                  if (normalizedServiceType !== coachingServiceTypeFilter) return false
                }

                if (coachingStatusFilter === "active") {
                  const isActive = assignmentDetails?.daysLeft === null ||
                    assignmentDetails?.daysLeft === undefined ||
                    assignmentDetails?.daysLeft >= 0
                  return isActive
                } else {
                  const isExpired = assignmentDetails?.daysLeft !== null &&
                    assignmentDetails?.daysLeft !== undefined &&
                    assignmentDetails?.daysLeft < 0
                  return isExpired
                }
              })

              const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
              const sessionSales = filteredSales.filter(sale => {
                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                return serviceType === 'per_session' || serviceType === 'session'
              })
              const monthlySales = filteredSales.filter(sale => {
                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                const normalizedType = serviceType === 'per_session' || serviceType === 'session' ? 'session' : 'monthly'
                return normalizedType === 'monthly'
              })

              const sessionTotal = sessionSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
              const monthlyTotal = monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border border-gray-200 bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Total Sales</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
                          <p className="text-xs text-gray-600 mt-1">{filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-2 rounded-full bg-gray-100">
                          <TrendingUp className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Session Sales</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(sessionTotal)}</p>
                          <p className="text-xs text-gray-600 mt-1">{sessionSales.length} sale{sessionSales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-2 rounded-full bg-gray-100">
                          <Clock className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Monthly Sales</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyTotal)}</p>
                          <p className="text-xs text-gray-600 mt-1">{monthlySales.length} sale{monthlySales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-2 rounded-full bg-gray-100">
                          <CalendarIcon className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )
            })()}

            {/* Active/Expired Tabs */}
            <Tabs value={coachingStatusFilter} onValueChange={setCoachingStatusFilter} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                {/* Active Coaching Sales Table */}
                {(() => {
                  const filteredActiveSales = sales.filter((sale) => {
                    // Filter by coaching sales
                    const isCoachingSale = sale.sale_type === 'Coaching' ||
                      sale.sale_type === 'Coach Assignment' ||
                      sale.sale_type === 'Coach'

                    if (!isCoachingSale) return false

                    // Filter by selected coach if not "all"
                    if (selectedCoachFilter !== "all") {
                      if (!sale.coach_id || sale.coach_id.toString() !== selectedCoachFilter) return false
                    }

                    // Filter by month if not "all"
                    if (coachingMonthFilter !== "all") {
                      const saleDate = new Date(sale.sale_date)
                      const saleMonth = saleDate.getMonth() + 1 // getMonth() returns 0-11
                      if (saleMonth.toString() !== coachingMonthFilter) return false
                    }

                    // Filter by year if not "all"
                    if (coachingYearFilter !== "all") {
                      const saleDate = new Date(sale.sale_date)
                      const saleYear = saleDate.getFullYear().toString()
                      if (saleYear !== coachingYearFilter) return false
                    }

                    const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)

                    // Filter out package sales and N/A entries (broken data)
                    const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                    const normalizedServiceType = serviceType === 'per_session' || serviceType === 'session' ? 'session' :
                      serviceType === 'package' ? 'package' : 'monthly'

                    // Exclude package sales
                    if (normalizedServiceType === 'package') return false

                    // Exclude entries with N/A end dates (broken data)
                    if (!assignmentDetails?.endDate) return false

                    if (coachingServiceTypeFilter !== "all") {
                      if (normalizedServiceType !== coachingServiceTypeFilter) return false
                    }

                    // Filter by active status
                    // Active: daysLeft is null, undefined, or >= 0
                    const isActive = assignmentDetails?.daysLeft === null ||
                      assignmentDetails?.daysLeft === undefined ||
                      assignmentDetails?.daysLeft >= 0

                    return isActive
                  })

                  const totalPages = Math.ceil(filteredActiveSales.length / coachingItemsPerPage)
                  const startIndex = (coachingCurrentPage - 1) * coachingItemsPerPage
                  const endIndex = startIndex + coachingItemsPerPage
                  const paginatedSales = filteredActiveSales.slice(startIndex, endIndex)

                  return (
                    <>
            <div className="overflow-y-auto max-h-[60vh] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                              <TableHead>Service Type</TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Receipt #</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Days Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                            {paginatedSales.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                  <p>No active coaching sales found</p>
                                </TableCell>
                              </TableRow>
                            ) : (
                              paginatedSales.map((sale) => {
                                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                                return (
                                  <TableRow key={sale.id}>
                                    <TableCell className="font-medium">
                                      {new Date(sale.sale_date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                      {sale.user_name || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      {(() => {
                                        const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                                        const displayType = serviceType === 'per_session' || serviceType === 'session' ? 'Session' : 'Monthly'
                                        return (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                                            {displayType}
                                          </Badge>
                                        )
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      {sale.coach_name ? (
                                        <Badge variant="secondary">{sale.coach_name}</Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">N/A</span>
                                      )}
                                    </TableCell>
                                    <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{sale.payment_method || 'Cash'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {sale.receipt_number || 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {assignmentDetails?.endDate
                                        ? new Date(assignmentDetails.endDate).toLocaleDateString()
                                        : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      {assignmentDetails?.daysLeft !== null && assignmentDetails?.daysLeft !== undefined ? (
                                        <span className={`text-sm font-medium ${assignmentDetails.daysLeft < 7 && assignmentDetails.daysLeft >= 0
                                          ? 'text-red-600'
                                          : 'text-green-600'
                                          }`}>
                                          {assignmentDetails.daysLeft} day{assignmentDetails.daysLeft !== 1 ? 's' : ''}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">N/A</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination Controls */}
                      {filteredActiveSales.length > 0 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredActiveSales.length)} of {filteredActiveSales.length} results
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCoachingCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={coachingCurrentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum
                                if (totalPages <= 5) {
                                  pageNum = i + 1
                                } else if (coachingCurrentPage <= 3) {
                                  pageNum = i + 1
                                } else if (coachingCurrentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i
                                } else {
                                  pageNum = coachingCurrentPage - 2 + i
                                }
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={coachingCurrentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCoachingCurrentPage(pageNum)}
                                    className="w-10"
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCoachingCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={coachingCurrentPage === totalPages}
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

              <TabsContent value="expired" className="mt-4">
                {/* Expired Coaching Sales Table */}
                {(() => {
                  const filteredExpiredSales = sales.filter((sale) => {
                      // Filter by coaching sales
                      const isCoachingSale = sale.sale_type === 'Coaching' ||
                        sale.sale_type === 'Coach Assignment' ||
                        sale.sale_type === 'Coach'

                      if (!isCoachingSale) return false

                      // Filter by selected coach if not "all"
                      if (selectedCoachFilter !== "all") {
                      if (!sale.coach_id || sale.coach_id.toString() !== selectedCoachFilter) return false
                    }

                    // Filter by month if not "all"
                    if (coachingMonthFilter !== "all") {
                      const saleDate = new Date(sale.sale_date)
                      const saleMonth = saleDate.getMonth() + 1 // getMonth() returns 0-11
                      if (saleMonth.toString() !== coachingMonthFilter) return false
                    }

                    // Filter by year if not "all"
                    if (coachingYearFilter !== "all") {
                      const saleDate = new Date(sale.sale_date)
                      const saleYear = saleDate.getFullYear().toString()
                      if (saleYear !== coachingYearFilter) return false
                    }

                    const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)

                    // Filter out package sales and N/A entries (broken data)
                    const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                    const normalizedServiceType = serviceType === 'per_session' || serviceType === 'session' ? 'session' :
                      serviceType === 'package' ? 'package' : 'monthly'

                    // Exclude package sales
                    if (normalizedServiceType === 'package') return false

                    // Exclude entries with N/A end dates (broken data)
                    if (!assignmentDetails?.endDate) return false

                    if (coachingServiceTypeFilter !== "all") {
                      if (normalizedServiceType !== coachingServiceTypeFilter) return false
                    }

                    // Filter by expired status
                    // Expired: daysLeft < 0
                    const isExpired = assignmentDetails?.daysLeft !== null &&
                      assignmentDetails?.daysLeft !== undefined &&
                      assignmentDetails?.daysLeft < 0

                    return isExpired
                  })

                  const totalPages = Math.ceil(filteredExpiredSales.length / coachingItemsPerPage)
                  const startIndex = (coachingCurrentPage - 1) * coachingItemsPerPage
                  const endIndex = startIndex + coachingItemsPerPage
                  const paginatedSales = filteredExpiredSales.slice(startIndex, endIndex)

                  return (
                    <>
                      <div className="overflow-y-auto max-h-[60vh] border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Member</TableHead>
                              <TableHead>Service Type</TableHead>
                              <TableHead>Coach</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment Method</TableHead>
                              <TableHead>Receipt #</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Days Expired</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedSales.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                  <p>No expired coaching sales found</p>
                                </TableCell>
                              </TableRow>
                            ) : (
                              paginatedSales.map((sale) => {
                                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                                return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {sale.user_name || 'N/A'}
                        </TableCell>
                                    <TableCell>
                                      {(() => {
                                        const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                                        const displayType = serviceType === 'per_session' || serviceType === 'session' ? 'Session' : 'Monthly'
                                        return (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                                            {displayType}
                                          </Badge>
                                        )
                                      })()}
                        </TableCell>
                        <TableCell>
                          {sale.coach_name ? (
                            <Badge variant="secondary">{sale.coach_name}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.payment_method || 'Cash'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sale.receipt_number || 'N/A'}
                        </TableCell>
                                    <TableCell className="text-sm">
                                      {assignmentDetails?.endDate
                                        ? new Date(assignmentDetails.endDate).toLocaleDateString()
                                        : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      {assignmentDetails?.daysLeft !== null && assignmentDetails?.daysLeft !== undefined && assignmentDetails?.daysLeft < 0 ? (
                                        <span className="text-sm font-medium text-red-600">
                                          Expired {Math.abs(assignmentDetails.daysLeft)} day{Math.abs(assignmentDetails.daysLeft) !== 1 ? 's' : ''} ago
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">N/A</span>
                                      )}
                        </TableCell>
                      </TableRow>
                                )
                              })
                            )}
                </TableBody>
              </Table>
                </div>

                      {/* Pagination Controls */}
                      {filteredExpiredSales.length > 0 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredExpiredSales.length)} of {filteredExpiredSales.length} results
            </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCoachingCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={coachingCurrentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum
                                if (totalPages <= 5) {
                                  pageNum = i + 1
                                } else if (coachingCurrentPage <= 3) {
                                  pageNum = i + 1
                                } else if (coachingCurrentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i
                                } else {
                                  pageNum = coachingCurrentPage - 2 + i
                                }
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={coachingCurrentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCoachingCurrentPage(pageNum)}
                                    className="w-10"
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCoachingCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={coachingCurrentPage === totalPages}
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
            </Tabs>
          </div>
          <DialogFooter>
            <Button onClick={() => setCoachingSalesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Walk-in Sales Dialog */}
      <Dialog open={walkinSalesDialogOpen} onOpenChange={setWalkinSalesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              Walk-in Sales Details
            </DialogTitle>
            <DialogDescription>
              View all walk-in and guest/day pass sales with detailed transaction information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Walk-in Sales Table */}
            <div className="overflow-y-auto max-h-[60vh] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Receipt #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales
                    .filter((sale) => {
                      // Filter by walk-in sales
                      const isWalkinSale = sale.sale_type === 'Walk-in' ||
                        sale.sale_type === 'Walkin' ||
                        sale.sale_type === 'Guest' ||
                        sale.sale_type === 'Day Pass'

                      return isWalkinSale
                    })
                    .map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {sale.guest_name || sale.user_name || 'N/A'}
                        </TableCell>
                        <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.payment_method || 'Cash'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sale.receipt_number || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {sales.filter(sale => sale.sale_type === 'Walk-in' || sale.sale_type === 'Walkin' || sale.sale_type === 'Guest' || sale.sale_type === 'Day Pass').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No walk-in sales found</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setWalkinSalesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Sales Dialog */}
      <Dialog open={subscriptionSalesDialogOpen} onOpenChange={setSubscriptionSalesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Subscription Sales Details
            </DialogTitle>
            <DialogDescription>
              View all subscription and membership sales with detailed transaction information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Plan Filter */}
            <div className="flex items-center gap-4">
              <Label htmlFor="plan-filter">Filter by Plan:</Label>
              <Select value={selectedPlanFilter} onValueChange={setSelectedPlanFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subscription Sales Table */}
            <div className="overflow-y-auto max-h-[60vh] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Receipt #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales
                    .filter((sale) => {
                      // Filter by subscription sales
                      const isSubscriptionSale = sale.sale_type === 'Subscription'

                      if (!isSubscriptionSale) return false

                      // Filter by selected plan if not "all"
                      if (selectedPlanFilter !== "all") {
                        // Check if any sales_details match the plan
                        return sale.sales_details && sale.sales_details.some(detail =>
                          detail.subscription_id && detail.subscription_id.toString() === selectedPlanFilter
                        )
                      }

                      return true
                    })
                    .map((sale) => {
                      // Get plan info - prefer from sale level, fallback to sales_details
                      const planName = sale.plan_name || sale.sales_details?.find(d => d.subscription?.plan_name)?.subscription?.plan_name

                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {sale.user_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {planName ? (
                              <Badge variant="secondary">{planName}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sale.payment_method || 'Cash'}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sale.receipt_number || 'N/A'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
              {sales.filter(sale => sale.sale_type === 'Subscription').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No subscription sales found</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSubscriptionSalesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Sales Dialog */}
      <Dialog open={productSalesDialogOpen} onOpenChange={(open) => {
        setProductSalesDialogOpen(open)
        if (!open) {
          // Reset filters when dialog closes
          setSelectedCategoryFilter("all")
          setSelectedProductFilter("all")
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Product Sales Details
            </DialogTitle>
            <DialogDescription>
              View all product sales with detailed transaction information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="category-filter">Filter by Category:</Label>
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getUniqueCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="product-filter">Filter by Product:</Label>
                <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products
                      .filter(p => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter)
                      .map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Sales Table */}
            <div className="overflow-y-auto max-h-[60vh] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Receipt #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales
                    .filter((sale) => {
                      // Filter by product sales - sales that have product items OR sale_type is Product
                      const hasProducts = sale.sales_details && sale.sales_details.some(detail => detail.product_id)
                      const isProductSale = sale.sale_type === 'Product'
                      
                      if (!hasProducts && !isProductSale) return false

                      // Filter by category if selected
                      if (selectedCategoryFilter !== "all") {
                        const hasCategoryMatch = sale.sales_details?.some(detail => {
                          if (!detail.product_id) return false
                          const product = detail.product || products.find(p => p.id === detail.product_id)
                          return product?.category === selectedCategoryFilter
                        })
                        if (!hasCategoryMatch) return false
                      }

                      // Filter by product if selected
                      if (selectedProductFilter !== "all") {
                        const hasProductMatch = sale.sales_details?.some(detail => 
                          detail.product_id && detail.product_id.toString() === selectedProductFilter
                        )
                        if (!hasProductMatch) return false
                      }

                      return true
                    })
                    .map((sale) => {
                      // Get product names from sales_details
                      const productDetails = sale.sales_details
                        ?.filter(detail => detail.product_id)
                        .map(detail => {
                          const productName = detail.product?.name || products.find(p => p.id === detail.product_id)?.name || 'Unknown Product'
                          const quantity = detail.quantity || 1
                          return `${productName}${quantity > 1 ? ` (x${quantity})` : ''}`
                        }) || []
                      
                      const productsDisplay = productDetails.length > 0 
                        ? productDetails.join(', ') 
                        : 'N/A'

                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm truncate" title={productsDisplay}>
                              {productsDisplay}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sale.payment_method || 'Cash'}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sale.receipt_number || 'N/A'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
              {sales.filter((sale) => {
                const hasProducts = sale.sales_details && sale.sales_details.some(detail => detail.product_id)
                const isProductSale = sale.sale_type === 'Product'
                if (!hasProducts && !isProductSale) return false
                
                if (selectedCategoryFilter !== "all") {
                  const hasCategoryMatch = sale.sales_details?.some(detail => {
                    if (!detail.product_id) return false
                    const product = detail.product || products.find(p => p.id === detail.product_id)
                    return product?.category === selectedCategoryFilter
                  })
                  if (!hasCategoryMatch) return false
                }

                if (selectedProductFilter !== "all") {
                  const hasProductMatch = sale.sales_details?.some(detail => 
                    detail.product_id && detail.product_id.toString() === selectedProductFilter
                  )
                  if (!hasProductMatch) return false
                }

                return true
              }).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No product sales found</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setProductSalesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Sales
