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
import { useToast } from "@/components/ui/use-toast"
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
  AlertTriangle,
  Filter,
  Hash,
  Layers,
  ShoppingBag,
  Archive,
  RotateCcw,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
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
  const [saleTypeFilter, setSaleTypeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Product Inventory filter states
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [productStockStatusFilter, setProductStockStatusFilter] = useState("all") // all, in_stock, low_stock, out_of_stock
  const [productPriceRangeFilter, setProductPriceRangeFilter] = useState("all") // all, low, medium, high

  // Pagination states
  const [allSalesCurrentPage, setAllSalesCurrentPage] = useState(1)
  const [allSalesItemsPerPage] = useState(15) // 15 entries per page for All Sales
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1)
  const [inventoryItemsPerPage] = useState(20) // 20 entries per page for Product Inventory

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

  // Archive/Restore state
  const [showArchived, setShowArchived] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [productToArchive, setProductToArchive] = useState(null)

  // Toast notifications
  const { toast } = useToast()

  // Low stock dialog state
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false)

  // Stock error modal state
  const [stockErrorModalOpen, setStockErrorModalOpen] = useState(false)
  const [stockErrorData, setStockErrorData] = useState({ productName: "", availableStock: 0, requestedQuantity: 0 })

  // Data from API
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [lowStockItems, setLowStockItems] = useState(0)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Reload sales when filters change
  useEffect(() => {
    loadSales()
  }, [saleTypeFilter, dateFilter])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadProducts(), loadSales(), loadLowStockItems()])
    } catch (error) {
      console.error("Error loading initial data:", error)
      alert("Error loading data. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }


  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=products${showArchived ? '&archived=1' : ''}`)
      console.log("Products loaded:", response.data.products)
      setProducts(response.data.products || [])
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

  // Reload products when archive view changes
  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  const loadSales = async () => {
    try {
      const params = new URLSearchParams()
      if (saleTypeFilter !== "all") {
        params.append("sale_type", saleTypeFilter)
      }
      if (dateFilter !== "all") {
        params.append("date_filter", dateFilter)
      }

      const response = await axios.get(`${API_BASE_URL}?action=sales&${params.toString()}`)
      setSales(response.data.sales || [])
    } catch (error) {
      console.error("Error loading sales:", error)
    }
  }

  const loadLowStockItems = async () => {
    try {
      // Count products with low stock (less than 10 items) that are not archived
      const lowStockCount = products.filter(product =>
        product.stock < 10 &&
        (product.is_archived === 0 || product.is_archived === false || !product.is_archived)
      ).length
      setLowStockItems(lowStockCount)
    } catch (error) {
      console.error("Error loading low stock items:", error)
    }
  }

  // Update low stock count when products change
  useEffect(() => {
    if (products.length > 0) {
      loadLowStockItems()
    }
  }, [products])

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
      setStockErrorData({
        productName: product.name,
        availableStock: product.stock,
        requestedQuantity: quantity
      })
      setStockErrorModalOpen(true)
      return
    }

    // Check if product already in cart
    const existingItemIndex = cart.findIndex((item) => item.product.id === product.id)
    if (existingItemIndex >= 0) {
      // Update quantity if product already in cart
      const updatedCart = [...cart]
      const newQuantity = updatedCart[existingItemIndex].quantity + quantity
      if (newQuantity > product.stock) {
        setStockErrorData({
          productName: product.name,
          availableStock: product.stock,
          requestedQuantity: newQuantity
        })
        setStockErrorModalOpen(true)
        return
      }
      updatedCart[existingItemIndex].quantity = newQuantity
      updatedCart[existingItemIndex].price = product.price * newQuantity
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
      setStockErrorData({
        productName: product.name,
        availableStock: product.stock,
        requestedQuantity: newQuantity
      })
      setStockErrorModalOpen(true)
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

      const response = await axios.post(`${API_BASE_URL}?action=sale`, {
        ...saleData,
        staff_id: userId
      })
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
        notes: ""
      }

      const response = await axios.post(`${API_BASE_URL}?action=pos_sale`, {
        ...saleData,
        staff_id: userId
      })
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

        // Reload data
        await Promise.all([loadProducts(), loadSales(), loadAnalytics()])
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
      const response = await axios.post(`${API_BASE_URL}?action=product`, {
        name: newProduct.name,
        price: Number.parseFloat(newProduct.price),
        stock: Number.parseInt(newProduct.stock),
        category: newProduct.category,
        staff_id: userId
      })

      if (response.data.success) {
        alert("Product added successfully!")
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

    setLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}?action=stock`, {
        product_id: stockUpdateProduct.id,
        quantity: updateQuantity,
        type: stockUpdateType,
        staff_id: userId
      })

      if (response.data.success) {
        alert(`Stock ${stockUpdateType === "add" ? "added" : "removed"} successfully!`)
        setStockUpdateProduct(null)
        setStockUpdateQuantity("")
        setStockUpdateType("add")
        await Promise.all([loadProducts(), loadAnalytics()])
      }
    } catch (error) {
      console.error("Error updating stock:", error)
      alert(error.response?.data?.error || "Error updating stock")
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
        staff_id: userId
      })

      if (response.data.success) {
        alert("Product updated successfully!")
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

  const openArchiveDialog = (product) => {
    setProductToArchive(product)
    setArchiveDialogOpen(true)
  }

  const handleArchiveProduct = async () => {
    if (!productToArchive) return

    setLoading(true)
    try {
      const response = await axios.delete(`${API_BASE_URL}?action=product`, {
        data: {
          id: productToArchive.id,
          staff_id: userId
        }
      })

      if (response.data.success) {
        const productName = productToArchive.name
        setArchiveDialogOpen(false)
        setProductToArchive(null)
        await loadProducts()
        toast({
          title: "Product Archived Successfully",
          description: `"${productName}" has been archived and hidden from active inventory. You can restore it anytime.`,
        })
      }
    } catch (error) {
      console.error("Error archiving product:", error)
      alert(error.response?.data?.error || "Error archiving product")
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreProduct = async (product) => {
    setLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}?action=restore`, {
        id: product.id,
        staff_id: userId
      })

      if (response.data.success) {
        await loadProducts()
        toast({
          title: "Product Restored Successfully",
          description: `"${product.name}" has been restored and is now visible in active inventory.`,
        })
      }
    } catch (error) {
      console.error("Error restoring product:", error)
      alert(error.response?.data?.error || "Error restoring product")
    } finally {
      setLoading(false)
    }
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
    if (!dateString) return "N/A"
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

  const formatDateTime = () => {
    const now = new Date()
    // Format current date/time in Philippines timezone
    return {
      date: now.toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    }
  }

  // Calculate months for subscription (similar to monitoring subscription)
  const calculateSubscriptionMonths = (subscription, sale = null) => {
    // First check duration_months from plan (most accurate)
    if (subscription?.duration_months) {
      return subscription.duration_months
    }
    if (sale?.duration_months) {
      return sale.duration_months
    }

    // Fallback: Calculate from amount paid and plan price
    const amountPaid = subscription?.amount_paid ||
      subscription?.discounted_price ||
      sale?.subscription_amount_paid ||
      sale?.subscription_discounted_price ||
      sale?.total_amount ||
      0

    const planPrice = subscription?.plan_price ||
      sale?.plan_price ||
      0

    if (planPrice > 0 && amountPaid > 0) {
      const months = Math.floor(amountPaid / planPrice)
      return months > 0 ? months : 1
    }
    return 1
  }

  const getProductName = (salesDetail, sale = null) => {
    // Product sales
    if (salesDetail?.product) {
      return salesDetail.product.name
    }

    // Get plan name from multiple sources
    let planName = null
    let subscription = null

    // 1. Check subscription in sales detail
    if (salesDetail?.subscription) {
      subscription = salesDetail.subscription
      planName = subscription.plan_name
    }

    // 2. Check sale level plan_name (set by API)
    if (!planName && sale?.plan_name) {
      planName = sale.plan_name
    }

    // 3. If we have a subscription_id but no plan_name, check sale object
    if (!planName && (salesDetail?.subscription_id || sale?.sale_type === 'Subscription')) {
      planName = sale?.plan_name || "Subscription Plan"
    }

    // If we found a plan name, calculate and display months
    // Don't show "12 months" since that's the default/given duration
    if (planName) {
      const months = calculateSubscriptionMonths(subscription, sale)
      // Only show months if it's not 12 (since 12 months is the default)
      if (months > 1 && months !== 12) {
        return `${planName} (${months} months)`
      }
      return planName
    }

    // Guest/Walk-in sales
    if (sale?.guest_name) {
      return `Day Pass - ${sale.guest_name}`
    }

    // Coaching sales
    if (sale?.coach_name) {
      return `Coaching - ${sale.coach_name}`
    }

    // Walk-in sales
    if (sale?.sale_type === "Walk-in" || sale?.sale_type === "Walkin") {
      return "Walk-in Entry"
    }

    // Fallback
    if (salesDetail?.subscription_id || sale?.sale_type === 'Subscription') {
      return "Subscription Plan"
    }

    return "Unknown Item"
  }

  const getUniqueCategories = () => {
    const categories = [...new Set(products.map(product => product.category).filter(category => category && category.trim() !== ""))]
    return categories.sort()
  }

  const getFilteredProducts = () => {
    let filtered = products

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.category === categoryFilter)
    }

    // Filter by stock status
    if (productStockStatusFilter !== "all") {
      if (productStockStatusFilter === "in_stock") {
        filtered = filtered.filter(product => product.stock > 10)
      } else if (productStockStatusFilter === "low_stock") {
        filtered = filtered.filter(product => product.stock > 0 && product.stock <= 10)
      } else if (productStockStatusFilter === "out_of_stock") {
        filtered = filtered.filter(product => product.stock === 0)
      }
    }

    // Filter by price range
    if (productPriceRangeFilter !== "all") {
      if (productPriceRangeFilter === "low") {
        filtered = filtered.filter(product => product.price < 100)
      } else if (productPriceRangeFilter === "medium") {
        filtered = filtered.filter(product => product.price >= 100 && product.price < 500)
      } else if (productPriceRangeFilter === "high") {
        filtered = filtered.filter(product => product.price >= 500)
      }
    }

    // Filter by search query
    if (productSearchQuery) {
      const query = productSearchQuery.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.price.toString().includes(query)
      )
    }

    return filtered
  }

  const getLowStockProducts = () => {
    return products.filter(product =>
      product.stock <= 10 &&
      (product.is_archived === 0 || product.is_archived === false || !product.is_archived)
    )
  }

  const filteredSales = sales.filter((sale) => {
    // Filter by search query
    const matchesSearch = searchQuery === "" ||
      sale.sale_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.plan_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.coach_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.some(detail =>
        (detail.product && detail.product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (detail.subscription?.plan_name && detail.subscription.plan_name.toLowerCase().includes(searchQuery.toLowerCase()))
      ))

    // Filter by sale type (this should already be handled by the API, but keeping as backup)
    const matchesSaleType = saleTypeFilter === "all" || sale.sale_type === saleTypeFilter

    return matchesSearch && matchesSaleType
  })

  // Pagination for All Sales tab
  const allSalesTotalPages = Math.max(1, Math.ceil(filteredSales.length / allSalesItemsPerPage))
  const allSalesStartIndex = (allSalesCurrentPage - 1) * allSalesItemsPerPage
  const allSalesEndIndex = allSalesStartIndex + allSalesItemsPerPage
  const paginatedAllSales = filteredSales.slice(allSalesStartIndex, allSalesEndIndex)

  // Pagination for Product Inventory
  const filteredProducts = getFilteredProducts()
  const inventoryTotalPages = Math.max(1, Math.ceil(filteredProducts.length / inventoryItemsPerPage))
  const inventoryStartIndex = (inventoryCurrentPage - 1) * inventoryItemsPerPage
  const inventoryEndIndex = inventoryStartIndex + inventoryItemsPerPage
  const paginatedProducts = filteredProducts.slice(inventoryStartIndex, inventoryEndIndex)

  // Reset pagination when filters change
  useEffect(() => {
    setAllSalesCurrentPage(1)
  }, [searchQuery, saleTypeFilter, dateFilter])

  useEffect(() => {
    setInventoryCurrentPage(1)
  }, [productSearchQuery, categoryFilter, productStockStatusFilter, productPriceRangeFilter, showArchived])


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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sales Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-l font-semibold">Manage product sales and inventory for CNERGY Gym</p>
        </CardContent>
      </Card>

      {/* Inventory Overview - Staff Only */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
            <Card
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setLowStockDialogOpen(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lowStockItems}</div>
                <p className="text-xs text-muted-foreground">Items need restocking</p>
                <p className="text-xs text-blue-600 mt-1">Click to view details</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">New Sale</TabsTrigger>
          <TabsTrigger value="history">All Sales</TabsTrigger>
          <TabsTrigger value="products">Product Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Selection */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">Add Products to Cart</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Filter className="h-4 w-4 text-gray-500" />
                    Filter by Category
                  </Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
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
                  <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Package className="h-4 w-4 text-gray-500" />
                    Select Product
                  </Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {getFilteredProducts() && getFilteredProducts().length > 0 ? getFilteredProducts().map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()} disabled={product.stock === 0} className="py-3">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-semibold text-gray-900 truncate">{product.name}</span>
                              <span className="text-xs text-gray-500">{product.category} • {formatCurrency(product.price)}</span>
                            </div>
                            <span className={`ml-3 text-xs font-medium px-2 py-1 rounded ${product.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : product.stock <= 5
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                              }`}>
                              {product.stock === 0 ? 'Out' : `${product.stock} left`}
                            </span>
                          </div>
                        </SelectItem>
                      )) : (
                        <SelectItem value="no-products" disabled>No products available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Hash className="h-4 w-4 text-gray-500" />
                    Quantity
                  </Label>
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
                    className="h-11 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-semibold"
                  />
                  {selectedProduct && (
                    <p className="text-xs text-gray-500">
                      Max available: {products.find((p) => p.id == selectedProduct || p.id === Number.parseInt(selectedProduct))?.stock || 0} units
                    </p>
                  )}
                </div>

                <Button
                  onClick={addToCart}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={!selectedProduct || loading}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>

            {/* Shopping Cart */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">Shopping Cart</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-base px-3 py-1 bg-green-100 text-green-700 border-green-300">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="p-4 rounded-full bg-gray-100 mb-4">
                      <ShoppingCart className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-600 mb-2">No items in cart</p>
                    <p className="text-sm text-gray-500 text-center">Add products from the left panel to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {cart.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-all duration-200">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1 truncate">{item.product?.name || 'Unknown Product'}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-600">{formatCurrency(item.product?.price || 0)} each</p>
                              <span className="text-gray-400">•</span>
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-900 border-gray-300">
                                {item.product?.category || 'N/A'}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mx-4">
                            <div className="flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                                onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-10 text-center font-semibold text-gray-900">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                                onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-700"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="text-right min-w-[80px]">
                            <p className="font-bold text-lg text-gray-900">{formatCurrency(item.price)}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t-2 border-gray-300 pt-4 mt-4">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                        <span className="text-xl font-bold text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-green-700">{formatCurrency(getTotalAmount())}</span>
                      </div>
                    </div>

                    {/* Payment Interface - Always Visible */}
                    {cart.length > 0 && (
                      <div className="border-t pt-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Payment Method *</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="gcash">Gcash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {paymentMethod === "cash" && (
                          <div className="space-y-2">
                            <Label>Amount Received (₱) *</Label>
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
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">All Sales</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <span>Showing {filteredSales.length} of {sales.length} sales (Page {allSalesCurrentPage} of {allSalesTotalPages})</span>
                        {saleTypeFilter !== "all" && (
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                            {saleTypeFilter} only
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search sales..."
                      className="pl-10 h-11 border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap pt-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sale-type-filter" className="text-sm font-semibold text-gray-700">Sale Type:</Label>
                    <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
                      <SelectTrigger className="w-44 h-10 border-2 border-gray-300 focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Subscription">Subscription</SelectItem>
                        <SelectItem value="Coach Assignment">Coach Assignment</SelectItem>
                        <SelectItem value="Walk-in">Walk-in</SelectItem>
                        <SelectItem value="Day Pass">Day Pass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="month-filter" className="text-sm font-semibold text-gray-700">Month:</Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-36 h-10 border-2 border-gray-300 focus:border-purple-500">
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
                    <Label htmlFor="year-filter" className="text-sm font-semibold text-gray-700">Year:</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-28 h-10 border-2 border-gray-300 focus:border-purple-500">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={useCustomDate ? "default" : "outline"}
                        className={cn(
                          "w-[220px] justify-start text-left font-medium h-10 border-2 transition-all duration-200",
                          useCustomDate
                            ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-md"
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
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Plan/Product</TableHead>
                      <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                      <TableHead className="font-semibold text-gray-900">Type</TableHead>
                      <TableHead className="font-semibold text-gray-900">Payment</TableHead>
                      <TableHead className="font-semibold text-gray-900">Receipt</TableHead>
                      <TableHead className="font-semibold text-gray-900">Date</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-3 rounded-full bg-gray-100 mb-3">
                              <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-600 mb-1">No sales found</p>
                            <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAllSales.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              {sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.length > 0 ? (
                                sale.sales_details.map((detail, index) => (
                                  <div key={index} className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {getProductName(detail, sale)}
                                    </span>
                                    {!detail.subscription_id && detail.quantity && detail.quantity > 1 && (
                                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-900 border-gray-300 font-medium">
                                        {detail.quantity}x
                                      </Badge>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span className="text-sm font-semibold text-gray-900">
                                  {getProductName({}, sale)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-1">
                              {sale.sale_type === "Subscription" || sale.sale_type === "Coach Assignment" || sale.sale_type === "Coaching" || sale.sale_type === "Coach" ? (
                                <div className="text-sm font-medium text-gray-900">
                                  {sale.user_name || "N/A"}
                                </div>
                              ) : sale.sale_type === "Guest" || sale.sale_type === "Day Pass" || sale.sale_type === "Walk-in" || sale.sale_type === "Walkin" ? (
                                <div className="text-sm font-medium text-gray-900">
                                  {sale.guest_name || sale.user_name || "Guest"}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  N/A
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="font-medium bg-gray-50 text-gray-900 border-gray-300">
                              {sale.sale_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs font-medium bg-gray-50 text-gray-700 border-gray-300">
                                {sale.payment_method || "N/A"}
                              </Badge>
                              {sale.change_given > 0 && (
                                <div className="text-xs text-gray-600 font-medium">
                                  Change: {formatCurrency(sale.change_given)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="text-xs font-mono font-medium text-gray-700">
                              {sale.receipt_number || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 font-medium text-gray-700">{formatDate(sale.sale_date)}</TableCell>
                          <TableCell className="text-right py-4 font-bold text-lg text-gray-900">{formatCurrency(sale.total_amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination Controls for All Sales */}
              {filteredSales.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white mb-6">
                  <div className="text-sm text-gray-500">
                    {filteredSales.length} {filteredSales.length === 1 ? 'entry' : 'entries'} total
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllSalesCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={allSalesCurrentPage === 1}
                      className="h-8 px-3 flex items-center gap-1 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md min-w-[100px] text-center">
                      Page {allSalesCurrentPage} of {allSalesTotalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllSalesCurrentPage(prev => Math.min(allSalesTotalPages, prev + 1))}
                      disabled={allSalesCurrentPage === allSalesTotalPages}
                      className="h-8 px-3 flex items-center gap-1 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Product Inventory</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <span>Showing {filteredProducts.length} of {products.length} {showArchived ? "archived" : "active"} products (Page {inventoryCurrentPage} of {inventoryTotalPages})</span>
                        {(categoryFilter !== "all" || productStockStatusFilter !== "all" || productPriceRangeFilter !== "all" || productSearchQuery) && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                            Filtered
                          </Badge>
                        )}
                        {showArchived && (
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                            Archived
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all duration-200">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader className="space-y-3 pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <Plus className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold text-gray-900">Add New Product</DialogTitle>
                            <DialogDescription className="text-sm text-gray-600 mt-1">
                              Add a new product to your inventory
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="space-y-5 py-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            Product Name
                          </Label>
                          <Input
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            placeholder="Enter product name"
                            className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            Price (₱)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                            placeholder="Enter price"
                            className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 text-lg font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            Initial Stock
                          </Label>
                          <Input
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                            placeholder="Enter stock quantity"
                            className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            Category
                          </Label>
                          <Select value={newProduct.category} onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}>
                            <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-gray-500">
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
                      <DialogFooter className="pt-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          onClick={() => setNewProduct({ name: "", price: "", stock: "", category: "Uncategorized" })}
                          className="h-11 border-2 border-gray-300 hover:bg-gray-50"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddProduct}
                          disabled={loading}
                          className="h-11 bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          {loading ? "Adding..." : "Add"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-3 pt-2">
                  {/* Archive Toggle and Search Row */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Archive Toggle */}
                    <Button
                      variant={showArchived ? "default" : "outline"}
                      onClick={() => setShowArchived(!showArchived)}
                      className={`h-10 border-2 transition-all duration-200 ${showArchived
                        ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-md"
                        : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
                        }`}
                    >
                      {showArchived ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          View Active Products
                        </>
                      ) : (
                        <>
                          <Archive className="mr-2 h-4 w-4" />
                          View Archived Products
                        </>
                      )}
                    </Button>
                    {/* Search */}
                    <div className="relative flex-1 min-w-[250px] max-w-md">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Search products..."
                        className="pl-10 h-10 border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Filter Row */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="product-category-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        <Filter className="h-4 w-4 inline mr-1" />
                        Category:
                      </Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-44 h-10 border-2 border-gray-300 focus:border-orange-500">
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
                    {/* Stock Status Filter */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="stock-status-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Stock Status:
                      </Label>
                      <Select value={productStockStatusFilter} onValueChange={setProductStockStatusFilter}>
                        <SelectTrigger className="w-40 h-10 border-2 border-gray-300 focus:border-orange-500">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="in_stock">In Stock (&gt;10)</SelectItem>
                          <SelectItem value="low_stock">Low Stock (1-10)</SelectItem>
                          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Price Range Filter */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="price-range-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Price Range:
                      </Label>
                      <Select value={productPriceRangeFilter} onValueChange={setProductPriceRangeFilter}>
                        <SelectTrigger className="w-36 h-10 border-2 border-gray-300 focus:border-orange-500">
                          <SelectValue placeholder="All Prices" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Prices</SelectItem>
                          <SelectItem value="low">Low (&lt;₱100)</SelectItem>
                          <SelectItem value="medium">Medium (₱100-₱500)</SelectItem>
                          <SelectItem value="high">High (&gt;₱500)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Product Name</TableHead>
                      <TableHead className="font-semibold text-gray-900">Category</TableHead>
                      <TableHead className="font-semibold text-gray-900">Price</TableHead>
                      <TableHead className="font-semibold text-gray-900">Stock</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-3 rounded-full bg-gray-100 mb-3">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-600 mb-1">No products found</p>
                            <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedProducts.map((product) => (
                        <TableRow key={product.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="py-4 font-medium text-gray-900">{product.name}</TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-gray-50 text-gray-900 border-gray-300">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="py-4 font-medium text-gray-900">{formatCurrency(product.price)}</TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{product.stock}</span>
                              {product.stock <= 5 && product.stock > 0 && (
                                <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                                  Low
                                </Badge>
                              )}
                              {product.stock === 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  Out
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge
                              variant={product.stock > 10 ? "outline" : product.stock > 0 ? "secondary" : "destructive"}
                              className={`font-medium ${product.stock > 10
                                ? "bg-green-100 text-green-700 border-green-300"
                                : product.stock > 0
                                  ? "bg-orange-100 text-orange-700 border-orange-300"
                                  : "bg-red-100 text-red-700 border-red-300"
                                }`}
                            >
                              {product.stock > 10 ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
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
                                className="border-2 hover:bg-gray-100"
                              >
                                <Package className="mr-1 h-3 w-3" />
                                Stock
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(product)}
                                disabled={loading}
                                className="border-2 hover:bg-blue-50"
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              {!showArchived ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openArchiveDialog(product)}
                                  disabled={loading}
                                  className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                                >
                                  <Archive className="mr-1 h-3 w-3" />
                                  Archive
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestoreProduct(product)}
                                  disabled={loading}
                                  className="border-2 border-green-300 text-green-700 hover:bg-green-50"
                                >
                                  <RotateCcw className="mr-1 h-3 w-3" />
                                  Restore
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination Controls for Product Inventory */}
              {filteredProducts.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white mb-6">
                  <div className="text-sm text-gray-500">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'entry' : 'entries'} total
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInventoryCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={inventoryCurrentPage === 1}
                      className="h-8 px-3 flex items-center gap-1 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md min-w-[100px] text-center">
                      Page {inventoryCurrentPage} of {inventoryTotalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInventoryCurrentPage(prev => Math.min(inventoryTotalPages, prev + 1))}
                      disabled={inventoryCurrentPage === inventoryTotalPages}
                      className="h-8 px-3 flex items-center gap-1 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Update Dialog */}
      <Dialog open={!!stockUpdateProduct} onOpenChange={() => {
        setStockUpdateProduct(null)
        setIsAddOnlyMode(false)
        setStockUpdateQuantity("")
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isAddOnlyMode || stockUpdateType === "add" ? "bg-green-100" : "bg-blue-100"}`}>
                {isAddOnlyMode ? (
                  <Plus className="h-5 w-5 text-green-600" />
                ) : (
                  <Package className={`h-5 w-5 ${stockUpdateType === "add" ? "text-green-600" : "text-blue-600"}`} />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {isAddOnlyMode ? "Add Stock" : "Update Stock"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {stockUpdateProduct?.name}
                </DialogDescription>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-sm text-gray-600">
                Current stock: <span className="font-bold text-gray-900">{stockUpdateProduct?.stock} units</span>
              </p>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {!isAddOnlyMode && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  Action
                </Label>
                <Select value={stockUpdateType} onValueChange={setStockUpdateType}>
                  <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500">
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
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                {isAddOnlyMode ? "Quantity to Add" : "Quantity"}
              </Label>
              <Input
                type="number"
                min="1"
                value={stockUpdateQuantity}
                onChange={(e) => setStockUpdateQuantity(e.target.value)}
                placeholder={isAddOnlyMode ? "Enter quantity to add" : "Enter quantity"}
                className="h-11 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-semibold"
                autoFocus
              />
            </div>
            {stockUpdateQuantity && stockUpdateProduct && (
              <div className={`p-5 rounded-xl border-2 shadow-sm ${stockUpdateType === "add" || isAddOnlyMode
                ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Stock Preview</p>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Current</p>
                        <span className="text-2xl font-bold text-gray-700">{stockUpdateProduct.stock}</span>
                      </div>
                      <span className="text-2xl text-gray-400">→</span>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">New</p>
                        <span className={`text-3xl font-bold ${stockUpdateType === "add" || isAddOnlyMode ? "text-green-700" : "text-red-700"
                          }`}>
                          {stockUpdateType === "add" || isAddOnlyMode
                            ? Number.parseInt(stockUpdateProduct.stock) + Number.parseInt(stockUpdateQuantity || "0")
                            : Math.max(0, Number.parseInt(stockUpdateProduct.stock) - Number.parseInt(stockUpdateQuantity || "0"))}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">units</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${stockUpdateType === "add" || isAddOnlyMode ? "bg-green-100" : "bg-red-100"}`}>
                    {stockUpdateType === "add" || isAddOnlyMode ? (
                      <Plus className="h-6 w-6 text-green-700" />
                    ) : (
                      <Minus className="h-6 w-6 text-red-700" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setStockUpdateProduct(null)
                setIsAddOnlyMode(false)
                setStockUpdateQuantity("")
              }}
              className="h-11 border-2 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockUpdate}
              disabled={loading || !stockUpdateQuantity}
              className={`h-11 shadow-md hover:shadow-lg transition-all duration-200 ${isAddOnlyMode || stockUpdateType === "add"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
                }`}
            >
              {loading ? "Updating..." : isAddOnlyMode || stockUpdateType === "add" ? "Add Stock" : "Remove Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Edit className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Edit Product</DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {editProduct?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                Product Name
              </Label>
              <Input
                value={editProductData.name}
                onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                placeholder="Enter product name"
                className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                Price (₱)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={editProductData.price}
                onChange={(e) => setEditProductData({ ...editProductData, price: e.target.value })}
                placeholder="Enter price"
                className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                Category
              </Label>
              <Select value={editProductData.category} onValueChange={(value) => setEditProductData({ ...editProductData, category: value })}>
                <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-gray-500">
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
          <DialogFooter className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setEditProduct(null)}
              className="h-11 border-2 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditProduct}
              disabled={loading}
              className="h-11 bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {loading ? "Updating..." : "Update"}
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
                  Date: {formatDateTime().date} {formatDateTime().time}
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

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="space-y-3 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Archive className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-gray-900">Archive Product</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-gray-600 mt-1">
                  {productToArchive?.name}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-700">
              Are you sure you want to archive <span className="font-semibold text-gray-900">&quot;{productToArchive?.name}&quot;</span>?
            </p>
            <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="space-y-2 text-sm text-orange-800">
                  <p className="font-semibold">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-orange-700">
                    <li>This product will be hidden from active inventory</li>
                    <li>Sales data will be preserved</li>
                    <li>You can restore this product later</li>
                    <li>This action does not delete the product</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="pt-4 border-t border-gray-200">
            <AlertDialogCancel className="h-11 border-2 border-gray-300 hover:bg-gray-50" disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveProduct}
              disabled={loading}
              className="h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {loading ? "Archiving..." : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Product
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Low Stock Products Dialog */}
      <Dialog open={lowStockDialogOpen} onOpenChange={setLowStockDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] border-0 shadow-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <Package className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-semibold text-gray-900">
                    Low Stock Products
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-1.5">
                    Products with 10 or fewer items remaining that need restocking
                  </DialogDescription>
                </div>
              </div>
              {getLowStockProducts().length > 0 && (
                <Badge variant="outline" className="text-sm px-3 py-1.5 bg-gray-50 text-gray-700 border-gray-200 font-medium">
                  {getLowStockProducts().length} {getLowStockProducts().length === 1 ? 'Item' : 'Items'}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {getLowStockProducts().length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
                  <Package className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-gray-600 font-medium">All products are well stocked!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-100">
                    <TableHead className="font-medium text-gray-700">Product Name</TableHead>
                    <TableHead className="font-medium text-gray-700">Category</TableHead>
                    <TableHead className="font-medium text-gray-700">Current Stock</TableHead>
                    <TableHead className="font-medium text-gray-700">Price</TableHead>
                    <TableHead className="font-medium text-gray-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getLowStockProducts()
                    .sort((a, b) => a.stock - b.stock)
                    .map((product) => (
                      <TableRow key={product.id} className="hover:bg-gray-50/30 transition-colors border-b border-gray-50">
                        <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 font-normal">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-gray-700">
                            {product.stock} {product.stock === 1 ? 'unit' : 'units'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          {product.stock === 0 || product.stock <= 5 ? (
                            <Badge className="bg-red-500 text-white font-medium border-0">
                              {product.stock === 0 ? 'Out of Stock' : 'Critical'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
                              Low Stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button
              variant="outline"
              onClick={() => setLowStockDialogOpen(false)}
              className="font-medium border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Error Modal */}
      <Dialog open={stockErrorModalOpen} onOpenChange={setStockErrorModalOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Insufficient Stock
              </DialogTitle>
            </div>
            <DialogDescription className="text-base text-gray-600">
              The requested quantity exceeds the available stock for this product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Product:</span>
                <span className="text-sm font-semibold text-gray-900">{stockErrorData.productName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Available Stock:</span>
                <Badge
                  variant={stockErrorData.availableStock === 0 ? "destructive" : "secondary"}
                  className="font-semibold"
                >
                  {stockErrorData.availableStock} {stockErrorData.availableStock === 1 ? 'unit' : 'units'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Requested Quantity:</span>
                <Badge variant="outline" className="font-semibold text-red-600 border-red-300">
                  {stockErrorData.requestedQuantity} {stockErrorData.requestedQuantity === 1 ? 'unit' : 'units'}
                </Badge>
              </div>
            </div>
            {stockErrorData.availableStock > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can add up to {stockErrorData.availableStock} {stockErrorData.availableStock === 1 ? 'unit' : 'units'} of this product to your cart.
                </p>
              </div>
            )}
            {stockErrorData.availableStock === 0 && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>Note:</strong> This product is currently out of stock. Please restock the inventory before adding it to a sale.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setStockErrorModalOpen(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Sales
