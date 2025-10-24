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

  // Product edit state
  const [editProduct, setEditProduct] = useState(null)
  const [editProductData, setEditProductData] = useState({ name: "", price: "", category: "Uncategorized" })

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
      const response = await axios.get(`${API_BASE_URL}?action=products`)
      console.log("Products loaded:", response.data.products)
      setProducts(response.data.products || [])
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

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
      // Count products with low stock (less than 10 items)
      const lowStockCount = products.filter(product => product.stock < 10).length
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
      alert("Insufficient stock!")
      return
    }

    // Check if product already in cart
    const existingItemIndex = cart.findIndex((item) => item.product.id === product.id)
    if (existingItemIndex >= 0) {
      // Update quantity if product already in cart
      const updatedCart = [...cart]
      const newQuantity = updatedCart[existingItemIndex].quantity + quantity
      if (newQuantity > product.stock) {
        alert("Total quantity exceeds available stock!")
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
        notes: transactionNotes
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

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const response = await axios.delete(`${API_BASE_URL}?action=product`, {
        data: {
          id: product.id,
          staff_id: userId
        }
      })

      if (response.data.success) {
        alert("Product deleted successfully!")
        await loadProducts()
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      alert(error.response?.data?.error || "Error deleting product")
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

  const filteredSales = sales.filter((sale) => {
    // Filter by search query
    const matchesSearch = searchQuery === "" ||
      sale.sale_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.sales_details.some(detail =>
        detail.product && detail.product.name.toLowerCase().includes(searchQuery.toLowerCase())
      )

    // Filter by sale type (this should already be handled by the API, but keeping as backup)
    const matchesSaleType = saleTypeFilter === "all" || sale.sale_type === saleTypeFilter

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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lowStockItems}</div>
                <p className="text-xs text-muted-foreground">Items need restocking</p>
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
                          <Label>Payment Method *</Label>
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
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Subscription">Subscription</SelectItem>
                        <SelectItem value="Guest">Day Pass Access</SelectItem>
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
                              onClick={() => setStockUpdateProduct(product)}
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
                              onClick={() => handleDeleteProduct(product)}
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
      <Dialog open={!!stockUpdateProduct} onOpenChange={() => setStockUpdateProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock - {stockUpdateProduct?.name}</DialogTitle>
            <DialogDescription>Current stock: {stockUpdateProduct?.stock} units</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={stockUpdateType} onValueChange={setStockUpdateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={stockUpdateQuantity}
                onChange={(e) => setStockUpdateQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            {stockUpdateQuantity && stockUpdateProduct && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm">
                  <strong>Preview:</strong> {stockUpdateProduct.stock} →{" "}
                  {stockUpdateType === "add"
                    ? stockUpdateProduct.stock + Number.parseInt(stockUpdateQuantity || "0")
                    : Math.max(0, stockUpdateProduct.stock - Number.parseInt(stockUpdateQuantity || "0"))}{" "}
                  units
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockUpdateProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleStockUpdate} disabled={loading}>
              {loading ? "Updating..." : stockUpdateType === "add" ? "Add Stock" : "Remove Stock"}
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
    </div>
  )
}

export default Sales
