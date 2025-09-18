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
import {
  Plus,
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  Search,
  Edit,
  Trash2,
  Minus,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// API Configuration
const API_BASE_URL = "https://api.cnergy.site/sales.php"

const Sales = () => {
  const [selectedMember, setSelectedMember] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "" })
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  // Member/Coach search states
  const [memberSearchOpen, setMemberSearchOpen] = useState(false)
  const [memberSearchValue, setMemberSearchValue] = useState("")

  // Filter states
  const [analyticsFilter, setAnalyticsFilter] = useState("today")
  const [saleTypeFilter, setSaleTypeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  // Cart for multiple products
  const [cart, setCart] = useState([])

  // Stock management state
  const [stockUpdateProduct, setStockUpdateProduct] = useState(null)
  const [stockUpdateQuantity, setStockUpdateQuantity] = useState("")
  const [stockUpdateType, setStockUpdateType] = useState("add")

  // Data from API
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [members, setMembers] = useState([])
  const [analytics, setAnalytics] = useState({
    todaysSales: 0,
    productsSoldToday: 0,
    lowStockItems: 0,
    monthlyRevenue: 0,
  })

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Reload analytics when filter changes
  useEffect(() => {
    loadAnalytics()
  }, [analyticsFilter])

  // Reload sales when filters change
  useEffect(() => {
    loadSales()
  }, [saleTypeFilter, dateFilter])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadMembers(), loadProducts(), loadSales(), loadAnalytics()])
    } catch (error) {
      console.error("Error loading initial data:", error)
      alert("Error loading data. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=members`)
      console.log("Members API Response:", response.data) // Add this line for debugging
      setMembers(response.data.members || [])
    } catch (error) {
      console.error("Error loading members:", error)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=products`)
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

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=analytics&period=${analyticsFilter}`)
      setAnalytics(
        response.data.analytics || {
          todaysSales: 0,
          productsSoldToday: 0,
          lowStockItems: 0,
          monthlyRevenue: 0,
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

    const product = products.find((p) => p.id === Number.parseInt(selectedProduct))
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

    const product = products.find((p) => p.id === productId)
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

    setLoading(true)
    try {
      const saleData = {
        user_id: selectedMember ? Number.parseInt(selectedMember) : null,
        total_amount: getTotalAmount(),
        sale_type: "Product",
        sales_details: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        })),
      }

      const response = await axios.post(`${API_BASE_URL}?action=sale`, saleData)
      if (response.data.success) {
        alert("Sale completed successfully!")
        // Reset form and cart
        setSelectedMember("")
        setMemberSearchValue("")
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
      })

      if (response.data.success) {
        alert("Product added successfully!")
        setNewProduct({ name: "", price: "", stock: "" })
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

  const getFullName = (user) => {
    return `${user.fname} ${user.mname} ${user.lname}`.trim()
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

  const filteredSales = sales.filter((sale) => {
    const fullName = sale.user ? getFullName(sale.user) : ""
    const email = sale.user ? sale.user.email : ""
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.sale_type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Get selected member details for display
  const getSelectedMemberDisplay = () => {
    if (!selectedMember) return "No Member (Walk-in Sale)"
    const member = members.find((m) => m.id.toString() === selectedMember)
    if (!member) return "No Member (Walk-in Sale)"
    return `${getFullName(member)} (${member.type_name || "Member"}) - ${member.email}`
  }

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

      {/* Quick Stats with Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Analytics Overview</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="analytics-filter">Period:</Label>
              <Select value={analyticsFilter} onValueChange={setAnalyticsFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.todaysSales)}</div>
                <p className="text-xs text-muted-foreground">Product & subscription sales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.productsSoldToday}</div>
                <p className="text-xs text-muted-foreground">Items sold</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.lowStockItems}</div>
                <p className="text-xs text-muted-foreground">Need restocking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.monthlyRevenue)}</div>
                <p className="text-xs text-muted-foreground">All-time revenue</p>
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
                  <Label>Select Member or Coach (Optional)</Label>
                  <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={memberSearchOpen}
                        className="w-full justify-between bg-transparent"
                      >
                        {getSelectedMemberDisplay()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search members and coaches..."
                          value={memberSearchValue}
                          onValueChange={setMemberSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>No member or coach found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setSelectedMember("")
                                setMemberSearchOpen(false)
                                setMemberSearchValue("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedMember === "" ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">No Member (Walk-in Sale)</span>
                                <span className="text-sm text-muted-foreground">Sell without member selection</span>
                              </div>
                            </CommandItem>
                            {members
                              .filter((member) => {
                                const fullName = getFullName(member).toLowerCase()
                                const email = member.email.toLowerCase()
                                const searchTerm = memberSearchValue.toLowerCase()
                                return fullName.includes(searchTerm) || email.includes(searchTerm)
                              })
                              .map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={member.id.toString()}
                                  onSelect={(currentValue) => {
                                    setSelectedMember(currentValue === selectedMember ? "" : currentValue)
                                    setMemberSearchOpen(false)
                                    setMemberSearchValue("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedMember === member.id.toString() ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {getFullName(member)} ({member.type_name || "Member"})
                                    </span>
                                    <span className="text-sm text-muted-foreground">{member.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Select Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()} disabled={product.stock === 0}>
                          {product.name} - {formatCurrency(product.price)} ({product.stock} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max={
                      selectedProduct ? products.find((p) => p.id === Number.parseInt(selectedProduct))?.stock || 1 : 1
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
                            <h4 className="font-medium">{item.product.name}</h4>
                            <p className="text-sm text-muted-foreground">{formatCurrency(item.product.price)} each</p>
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

                    <Button
                      onClick={handleProductSale}
                      className="w-full"
                      disabled={cart.length === 0 || loading}
                    >
                      {loading ? "Processing..." : "Complete Sale"}
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
                  <CardTitle>Sales History</CardTitle>
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="date-filter">Date Range:</Label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No sales found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {sale.user ? (
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {sale.user.fname[0]}
                                  {sale.user.lname[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{getFullName(sale.user)}</div>
                                <div className="text-sm text-muted-foreground">{sale.user.email}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-muted-foreground">Walk-in Customer</div>
                                <div className="text-sm text-muted-foreground">No member selected</div>
                              </div>
                            </div>
                          )}
                        </TableCell>
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
                          <Badge variant={sale.sale_type === "Product" ? "outline" : "secondary"}>
                            {sale.sale_type}
                          </Badge>
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
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddProduct} disabled={loading}>
                      {loading ? "Adding..." : "Add Product"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStockUpdateProduct(product)}
                            disabled={loading}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Update Stock
                          </Button>
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
    </div>
  )
}

export default Sales
