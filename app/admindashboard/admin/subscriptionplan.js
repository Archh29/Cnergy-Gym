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
import { Badge } from "@/components/ui/badge"
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
import { Crown, Plus, Trash2, Edit, ChevronUp, ChevronDown, Loader2, Calendar } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const API_URL = "http://localhost/cynergy/membership.php"

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState({
    id: null,
    name: "",
    duration: "",
    popular: false,
    singlePrice: true,
    price: "",
    prices: [
      { age_group: "Student", price: "" },
      { age_group: "Adult", price: "" },
      { age_group: "55+", price: "" },
    ],
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
      name: "",
      duration: "",
      popular: false,
      singlePrice: true,
      price: "",
      prices: [
        { age_group: "Student", price: "" },
        { age_group: "Adult", price: "" },
        { age_group: "55+", price: "" },
      ],
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
    if (
      !currentPlan.name ||
      !currentPlan.duration ||
      (currentPlan.singlePrice && !currentPlan.price) ||
      (!currentPlan.singlePrice && !currentPlan.prices.some((p) => p.price))
    )
      return

    setIsLoading(true)
    try {
      const planData = {
        id: currentPlan.id,
        name: currentPlan.name,
        duration: currentPlan.duration,
        popular: currentPlan.popular ? 1 : 0,
        prices: currentPlan.singlePrice
          ? [{ age_group: "All", price: currentPlan.price }]
          : currentPlan.prices.filter((p) => p.price),
      }

      if (currentPlan.id) {
        await axios.put(API_URL, planData)
      } else {
        await axios.post(API_URL, planData)
      }
      await fetchPlans()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const movePlanUp = (index) => {
    if (index === 0) return
    const newPlans = [...plans]
    ;[newPlans[index], newPlans[index - 1]] = [newPlans[index - 1], newPlans[index]]
    setPlans(newPlans)
  }

  const movePlanDown = (index) => {
    if (index === plans.length - 1) return
    const newPlans = [...plans]
    ;[newPlans[index], newPlans[index + 1]] = [newPlans[index + 1], newPlans[index]]
    setPlans(newPlans)
  }


  const togglePopular = async (id) => {
    setIsLoading(true);
    try {
        const updatedPlans = plans.map((plan) =>
            plan.id === id
                ? { ...plan, popular: !plan.popular }
                : plan.popular && plan.id !== id
                ? { ...plan, popular: false }
                : plan
        );

        const toggledPlan = updatedPlans.find((plan) => plan.id === id);

        const response = await axios.put(API_URL, {
            id: toggledPlan.id,
            popular: toggledPlan.popular, // Only updating popular field
        });

        console.log("API Response:", response.data); // Log API response

        if (response.data.success) {
            setPlans(updatedPlans);
        } else {
            console.error("Failed to update popular status in DB", response.data);
        }
    } catch (error) {
        console.error("Error toggling popular status:", error);
    } finally {
        setIsLoading(false);
    }
};



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
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                plan.popular ? "border-2 border-primary bg-primary/5" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg px-3 py-1.5 text-sm font-semibold">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      {plan.name}
                      {plan.popular && <Crown className="h-5 w-5 text-yellow-500" />}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => movePlanUp(index)}
                      disabled={index === 0 || isLoading}
                      className="h-8 w-8"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => movePlanDown(index)}
                      disabled={index === plans.length - 1 || isLoading}
                      className="h-8 w-8"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.singlePrice ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <div className="flex items-center gap-1 font-bold text-primary">
                        <span>₱{plan.price}</span>
                      </div>
                    </div>
                  ) : (
                    plan.prices.map((priceItem, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{priceItem.age_group}:</span>
                        <div className="flex items-center gap-1 font-bold text-primary">
                          <span>₱{priceItem.price}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  <span>{plan.duration} months</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button className="w-full text-lg py-6" variant={plan.popular ? "default" : "outline"}>
                  Select Plan
                </Button>
                <div className="flex justify-between w-full">
                  <Button variant="ghost" size="sm" onClick={() => togglePopular(plan.id)} disabled={isLoading}>
                    {plan.popular ? "Unmark Popular" : "Mark Popular"}
                  </Button>
                  <div className="flex gap-2">
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
              {currentPlan.id
                ? "Update the details of your membership plan."
                : "Add a new membership plan with pricing options."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={currentPlan.name}
                onChange={(e) => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                placeholder="e.g. Basic Plan"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="single-price">Single Price for All</Label>
              <Switch
                id="single-price"
                checked={currentPlan.singlePrice}
                onCheckedChange={(checked) => setCurrentPlan({ ...currentPlan, singlePrice: checked })}
              />
            </div>
            {currentPlan.singlePrice ? (
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
            ) : (
              <div className="grid gap-2">
                <Label>Prices</Label>
                {currentPlan.prices.map((priceItem, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Label className="w-24">{priceItem.age_group}</Label>
                    <div className="flex items-center">
                      <span className="mr-2">₱</span>
                      <Input
                        type="number"
                        value={priceItem.price}
                        onChange={(e) => {
                          const newPrices = [...currentPlan.prices]
                          newPrices[idx].price = e.target.value
                          setCurrentPlan({ ...currentPlan, prices: newPrices })
                        }}
                        placeholder={`Price for ${priceItem.age_group}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (Months)</Label>
              <Input
                id="duration"
                type="number"
                value={currentPlan.duration}
                onChange={(e) => setCurrentPlan({ ...currentPlan, duration: e.target.value })}
                placeholder="e.g. 12"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="popular"
                checked={currentPlan.popular}
                onChange={(e) => setCurrentPlan({ ...currentPlan, popular: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
                disabled={isLoading}
              />
              <Label htmlFor="popular">Mark as popular plan</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !currentPlan.name ||
                !currentPlan.duration ||
                (currentPlan.singlePrice && !currentPlan.price) ||
                (!currentPlan.singlePrice && !currentPlan.prices.some((p) => p.price)) ||
                isLoading
              }
            >
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

