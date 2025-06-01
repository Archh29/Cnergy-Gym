"use client"

import { useState } from "react"
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
import { Plus, ShoppingCart, Package, DollarSign, TrendingUp, Search } from "lucide-react"

const Sales = () => {
  const [selectedMember, setSelectedMember] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "" })
  const [searchQuery, setSearchQuery] = useState("")

  // Data structure matching your database schema
  const [sales, setSales] = useState([
    {
      id: 1,
      user: {
        id: 1,
        fname: "John",
        mname: "Michael",
        lname: "Doe",
        email: "john.doe@email.com",
      },
      total_amount: 1200.0,
      sale_date: "2024-12-28T10:30:00Z",
      sale_type: "Product",
      sales_details: [
        {
          id: 1,
          product: {
            id: 1,
            name: "Protein Shake",
            price: 1200.0,
          },
          quantity: 1,
          price: 1200.0,
        },
      ],
    },
    {
      id: 2,
      user: {
        id: 2,
        fname: "Jane",
        mname: "Marie",
        lname: "Smith",
        email: "jane.smith@email.com",
      },
      total_amount: 3500.0,
      sale_date: "2024-12-27T14:20:00Z",
      sale_type: "Subscription",
      sales_details: [
        {
          id: 2,
          subscription_id: 1,
          quantity: null,
          price: 3500.0,
        },
      ],
    },
    {
      id: 3,
      user: {
        id: 3,
        fname: "Mike",
        mname: "Robert",
        lname: "Johnson",
        email: "mike.johnson@email.com",
      },
      total_amount: 1700.0,
      sale_date: "2024-12-26T16:45:00Z",
      sale_type: "Product",
      sales_details: [
        {
          id: 3,
          product: {
            id: 2,
            name: "Gym Gloves",
            price: 850.0,
          },
          quantity: 2,
          price: 1700.0,
        },
      ],
    },
  ])

  // Products from Product table
  const [products, setProducts] = useState([
    { id: 1, name: "Protein Shake", price: 1200.0, stock: 45 },
    { id: 2, name: "Gym Gloves", price: 850.0, stock: 23 },
    { id: 3, name: "Shaker Bottle", price: 350.0, stock: 12 },
    { id: 4, name: "Gym Towel", price: 450.0, stock: 34 },
    { id: 5, name: "Pre-Workout", price: 1500.0, stock: 5 },
  ])

  // Members from User table
  const [members] = useState([
    {
      id: 1,
      fname: "John",
      mname: "Michael",
      lname: "Doe",
      email: "john.doe@email.com",
    },
    {
      id: 2,
      fname: "Jane",
      mname: "Marie",
      lname: "Smith",
      email: "jane.smith@email.com",
    },
    {
      id: 3,
      fname: "Mike",
      mname: "Robert",
      lname: "Johnson",
      email: "mike.johnson@email.com",
    },
    {
      id: 4,
      fname: "Sarah",
      mname: "Ann",
      lname: "Williams",
      email: "sarah.williams@email.com",
    },
  ])

  // Calculate analytics from actual data
  const analytics = {
    todaysSales: sales
      .filter((sale) => {
        const today = new Date().toDateString()
        const saleDate = new Date(sale.sale_date).toDateString()
        return today === saleDate
      })
      .reduce((sum, sale) => sum + sale.total_amount, 0),
    productsSoldToday: sales
      .filter((sale) => {
        const today = new Date().toDateString()
        const saleDate = new Date(sale.sale_date).toDateString()
        return today === saleDate && sale.sale_type === "Product"
      })
      .reduce((sum, sale) => {
        return (
          sum +
          sale.sales_details.reduce((detailSum, detail) => {
            return detailSum + (detail.quantity || 0)
          }, 0)
        )
      }, 0),
    lowStockItems: products.filter((product) => product.stock <= 10).length,
    monthlyRevenue: sales.reduce((sum, sale) => sum + sale.total_amount, 0),
  }

  const handleProductSale = () => {
    if (!selectedMember || !selectedProduct) {
      alert("Please select both member and product")
      return
    }

    const product = products.find((p) => p.id === Number.parseInt(selectedProduct))
    const member = members.find((m) => m.id === Number.parseInt(selectedMember))

    if (product.stock < quantity) {
      alert("Insufficient stock!")
      return
    }

    // Create new sale record matching database structure
    const newSale = {
      id: Date.now(),
      user: member,
      total_amount: product.price * quantity,
      sale_date: new Date().toISOString(),
      sale_type: "Product",
      sales_details: [
        {
          id: Date.now(),
          product: product,
          quantity: quantity,
          price: product.price * quantity,
        },
      ],
    }

    setSales((prev) => [newSale, ...prev])

    // Update product stock
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: p.stock - quantity } : p)))

    alert("Sale completed successfully!")

    // Reset form
    setSelectedMember("")
    setSelectedProduct("")
    setQuantity(1)
  }

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      alert("Please fill all product fields")
      return
    }

    const product = {
      id: Date.now(),
      name: newProduct.name,
      price: Number.parseFloat(newProduct.price),
      stock: Number.parseInt(newProduct.stock),
    }

    setProducts((prev) => [...prev, product])
    alert("Product added successfully!")

    // Reset form
    setNewProduct({ name: "", price: "", stock: "" })
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
    const fullName = getFullName(sale.user)
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.sale_type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

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

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.todaysSales)}</div>
            <p className="text-xs text-muted-foreground">Product & subscription sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Sold Today</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.productsSoldToday}</div>
            <p className="text-xs text-muted-foreground">Items sold today</p>
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

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">New Sale</TabsTrigger>
          <TabsTrigger value="history">Sales History</TabsTrigger>
          <TabsTrigger value="products">Product Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Create New Product Sale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Member</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {getFullName(member)} - {member.email}
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
              </div>

              {selectedProduct && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-2">Sale Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Product:</span>
                      <span>{products.find((p) => p.id === Number.parseInt(selectedProduct))?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unit Price:</span>
                      <span>
                        {formatCurrency(products.find((p) => p.id === Number.parseInt(selectedProduct))?.price || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{quantity}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>
                        {formatCurrency(
                          (products.find((p) => p.id === Number.parseInt(selectedProduct))?.price || 0) * quantity,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleProductSale} className="w-full" disabled={!selectedMember || !selectedProduct}>
                Complete Sale
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
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
                    <Button onClick={handleAddProduct}>Add Product</Button>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Sales
