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
import { Plus, ShoppingCart, Package, DollarSign, TrendingUp } from "lucide-react"

// Sample data - replace with actual API calls
const recentSales = [
  { id: 1, member: "John Doe", item: "Protein Shake", type: "Product", amount: 1200, date: "2023-07-28" },
  { id: 2, member: "Jane Smith", item: "Monthly Plan", type: "Subscription", amount: 3500, date: "2023-07-27" },
  { id: 3, member: "Mike Johnson", item: "Gym Gloves", type: "Product", amount: 850, date: "2023-07-26" },
  { id: 4, member: "Sarah Williams", item: "Annual Plan", type: "Subscription", amount: 15000, date: "2023-07-25" },
  { id: 5, member: "Robert Brown", item: "Shaker Bottle", type: "Product", amount: 350, date: "2023-07-24" },
]

const products = [
  { id: 1, name: "Protein Shake", price: 1200, stock: 45 },
  { id: 2, name: "Gym Gloves", price: 850, stock: 23 },
  { id: 3, name: "Shaker Bottle", price: 350, stock: 12 },
  { id: 4, name: "Gym Towel", price: 450, stock: 34 },
  { id: 5, name: "Pre-Workout", price: 1500, stock: 5 },
]

const members = [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Smith" },
  { id: 3, name: "Mike Johnson" },
  { id: 4, name: "Sarah Williams" },
  { id: 5, name: "Robert Brown" },
]

const Sales = () => {
  const [selectedMember, setSelectedMember] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "" })

  const handleProductSale = () => {
    if (!selectedMember || !selectedProduct) {
      alert("Please select both member and product")
      return
    }

    const product = products.find((p) => p.id === Number.parseInt(selectedProduct))
    const member = members.find((m) => m.id === Number.parseInt(selectedMember))

    // This would be an API call in real implementation
    console.log("Processing sale:", {
      member: member.name,
      product: product.name,
      quantity,
      total: product.price * quantity,
      paymentMethod,
    })

    alert("Sale completed successfully!")

    // Reset form
    setSelectedMember("")
    setSelectedProduct("")
    setQuantity(1)
    setPaymentMethod("cash")
  }

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      alert("Please fill all product fields")
      return
    }

    // This would be an API call in real implementation
    console.log("Adding product:", newProduct)
    alert("Product added successfully!")

    // Reset form
    setNewProduct({ name: "", price: "", stock: "" })
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

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱8,450</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+8 from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱128,430</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
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
              <CardTitle>Create New Sale</CardTitle>
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
                          {member.name}
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
                          {product.name} - ₱{product.price} ({product.stock} in stock)
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
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                    disabled={!selectedProduct}
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
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <span>₱{products.find((p) => p.id === Number.parseInt(selectedProduct))?.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{quantity}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>
                        ₱{(products.find((p) => p.id === Number.parseInt(selectedProduct))?.price || 0) * quantity}
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
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.member}</TableCell>
                      <TableCell>{sale.item}</TableCell>
                      <TableCell>
                        <Badge variant={sale.type === "Product" ? "outline" : "secondary"}>{sale.type}</Badge>
                      </TableCell>
                      <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">₱{sale.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
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
                        <TableCell>₱{product.price.toLocaleString()}</TableCell>
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
