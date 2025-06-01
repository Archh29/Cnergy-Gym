"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, Trash2, Edit, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"

const API_URL = "/api/subscription-plans"

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState({
    id: null,
    plan_name: "",
    price: "",
  })
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(API_URL)
      if (Array.isArray(response.data.plans)) {
        const updatedPlans = response.data.plans.map((plan) => ({
          ...plan,
          popular: plan.popular === "1" || plan.popular === 1 || plan.popular === true,
          prices: JSON.parse(plan.prices),
          singlePrice: plan.prices.length === 1 && plan.prices[0].age_group === "All",
          price: plan.prices.length === 1 ? plan.prices[0].price : "",
        }))
        setPlans(updatedPlans)
      } else {
        setPlans([])
        console.error("Unexpected API response format:", response.data)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setPlans([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setCurrentPlan({
      id: null,
      plan_name: "",
      price: "",
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (plan) => {
    setCurrentPlan({ ...plan })
    setIsDialogOpen(true)
  }

  const handleDeleteConfirm = (id) => {
    setSelectedPlanId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await axios.delete(API_URL, { data: { id: selectedPlanId } })
      setPlans(plans.filter((plan) => plan.id !== selectedPlanId))
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentPlan.plan_name || !currentPlan.price) return

    setIsLoading(true)
    try {
      const planData = {
        id: currentPlan.id,
        plan_name: currentPlan.plan_name,
        price: currentPlan.price,
      }

      if (currentPlan.id) {
        await axios.put(API_URL, planData)
      } else {
        const response = await axios.post(API_URL, planData)
        setCurrentPlan({ ...currentPlan, id: response.data.id })
        setPlans([...plans, currentPlan])
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Membership Plans</h2>
        <Button onClick={handleAdd} className="flex items-center gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Add Plan
        </Button>
      </div>

      {isLoading && plans.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{plan.plan_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(plan.price)}</div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button className="w-full text-lg py-6">Select Plan</Button>
                <div className="flex justify-end w-full gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)} disabled={isLoading}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDeleteConfirm(plan.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentPlan.id ? "Edit Plan" : "Add Plan"}</DialogTitle>
            <DialogDescription>
              {currentPlan.id ? "Update the details of your membership plan." : "Add a new membership plan."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plan_name">Plan Name</Label>
              <Input
                id="plan_name"
                value={currentPlan.plan_name}
                onChange={(e) => setCurrentPlan({ ...currentPlan, plan_name: e.target.value })}
                placeholder="e.g. Basic Plan"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <div className="flex items-center">
                <span className="mr-2">₱</span>
                <Input
                  id="price"
                  type="number"
                  value={currentPlan.price}
                  onChange={(e) => setCurrentPlan({ ...currentPlan, price: e.target.value })}
                  placeholder="Enter price"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!currentPlan.plan_name || !currentPlan.price || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : currentPlan.id ? (
                "Update Plan"
              ) : (
                "Create Plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected membership plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SubscriptionPlans
