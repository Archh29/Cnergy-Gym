"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Search, Plus, Edit, Trash2, Activity, ChevronLeft, ChevronRight, Loader2, Award } from "lucide-react"

const API_URL = "http://localhost/cynergy/addcoach.php"

// Simplified form schema matching the User table structure
const coachFormSchema = z.object({
  fname: z.string().min(2, { message: "First name must be at least 2 characters." }),
  mname: z.string().min(1, { message: "Middle name is required." }),
  lname: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  gender_id: z.string().min(1, { message: "Please select a gender." }),
  bday: z.string().min(1, { message: "Date of birth is required." }),
  user_type_id: z.number().default(3), 
})

const ViewCoach = () => {
  const [coaches, setCoaches] = useState([])
  const [filteredCoaches, setFilteredCoaches] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [activities, setActivities] = useState([])
  const coachesPerPage = 5
  const indexOfLastCoach = currentPage * coachesPerPage
  const indexOfFirstCoach = indexOfLastCoach - coachesPerPage
  const currentCoaches = filteredCoaches.slice(indexOfFirstCoach, indexOfLastCoach)
  const totalPages = Math.ceil(filteredCoaches.length / coachesPerPage)

  const { toast } = useToast()

  // Form with simplified default values matching database schema
  const form = useForm({
    resolver: zodResolver(coachFormSchema),
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      gender_id: "",
      bday: "",
      user_type_id: 3, // Default to coach type
    },
  })

  // Gender mapping (you'll need to adjust these IDs based on your Gender table)
  const genderOptions = [
    { id: "1", name: "Male" },
    { id: "2", name: "Female" },
    { id: "3", name: "Other" },
  ]

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(API_URL)
        const coachesData = response.data.coaches || []
        setCoaches(coachesData)
        setFilteredCoaches(coachesData)
      } catch (error) {
        console.error("Error fetching coaches:", error)
        toast({
          title: "Error",
          description: "Failed to fetch coaches. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCoaches()
  }, [toast])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCoaches(coaches)
    } else {
      const lowercaseQuery = searchQuery.toLowerCase()
      const filtered = coaches.filter(
        (coach) =>
          `${coach.fname} ${coach.lname}`.toLowerCase().includes(lowercaseQuery) ||
          coach.email?.toLowerCase().includes(lowercaseQuery),
      )
      setFilteredCoaches(filtered)
    }
    setCurrentPage(1)
  }, [searchQuery, coaches])

  const handleAddCoach = async (data) => {
    try {
      setIsLoading(true)

      // Format data to match database schema
      const formattedData = {
        fname: data.fname,
        mname: data.mname,
        lname: data.lname,
        email: data.email,
        password: data.password,
        gender_id: Number.parseInt(data.gender_id),
        bday: data.bday,
        user_type_id: data.user_type_id,
        failed_attempt: 0, // Default value
      }

      const response = await axios.post(API_URL, formattedData)

      if (response.data.success) {
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        setCoaches(updatedCoaches)
        setFilteredCoaches(updatedCoaches)

        setIsAddDialogOpen(false)
        setActivities([{ text: `New coach ${data.fname} ${data.lname} registered`, time: "Just now" }, ...activities])
        toast({ title: "Success", description: "Coach added successfully!" })
        form.reset()
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to add coach.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding coach:", error.response?.data || error.message)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add coach.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCoach = async (data) => {
    if (!selectedCoach) return

    try {
      setIsLoading(true)

      const updateData = {
        id: selectedCoach.id, // User ID
        fname: data.fname,
        mname: data.mname,
        lname: data.lname,
        email: data.email,
        gender_id: Number.parseInt(data.gender_id),
        bday: data.bday,
        user_type_id: data.user_type_id,
      }

      // Only include password if it's provided
      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password
      }

      const response = await axios.put(API_URL, updateData, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.data.success) {
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        setCoaches([...updatedCoaches])
        setFilteredCoaches([...updatedCoaches])

        setIsEditDialogOpen(false)
        setActivities([{ text: `${data.fname} ${data.lname}'s information updated`, time: "Just now" }, ...activities])

        toast({ title: "Success", description: "Coach updated successfully!" })
      } else {
        throw new Error(response.data.error || "Failed to update coach.")
      }
    } catch (error) {
      console.error("Error updating coach:", error.response?.data || error.message)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update coach.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCoach) return
    try {
      setIsLoading(true)

      const deleteData = {
        id: selectedCoach.id,
      }

      const response = await axios.delete(API_URL, { data: deleteData })

      if (response.data.success) {
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        setCoaches(updatedCoaches)
        setFilteredCoaches(updatedCoaches)

        setIsDeleteDialogOpen(false)
        setActivities([
          { text: `Coach ${selectedCoach.fname} ${selectedCoach.lname} removed`, time: "Just now" },
          ...activities,
        ])
        toast({ title: "Success", description: "Coach deleted successfully!" })
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to delete coach.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting coach:", error.response?.data || error.message)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete coach.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenAddDialog = () => {
    form.reset({
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      gender_id: "",
      bday: "",
      user_type_id: 3,
    })
    setIsAddDialogOpen(true)
  }

  const handleEditCoach = (coach) => {
    setSelectedCoach(coach)

    form.reset({
      fname: coach.fname || "",
      mname: coach.mname || "",
      lname: coach.lname || "",
      email: coach.email || "",
      password: "", // Don't populate password for security
      gender_id: coach.gender_id?.toString() || "",
      bday: coach.bday ? new Date(coach.bday).toISOString().split("T")[0] : "",
      user_type_id: coach.user_type_id || 3,
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteCoach = (coach) => {
    setSelectedCoach(coach)
    setIsDeleteDialogOpen(true)
  }

  const getGenderName = (genderId) => {
    const gender = genderOptions.find((g) => g.id === genderId?.toString())
    return gender ? gender.name : "Unknown"
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gym Coaches</CardTitle>
              <CardDescription>Manage your gym's coaching staff</CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" /> Add Coach
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search coaches by name or email..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : currentCoaches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No coaches found. Try a different search or add a new coach.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentCoaches.map((coach) => (
                  <TableRow key={coach.id}>
                    <TableCell>{`${coach.fname} ${coach.mname} ${coach.lname}`}</TableCell>
                    <TableCell>{coach.email}</TableCell>
                    <TableCell>{getGenderName(coach.gender_id)}</TableCell>
                    <TableCell>{coach.bday ? new Date(coach.bday).toLocaleDateString() : "N/A"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditCoach(coach)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteCoach(coach)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredCoaches.length > coachesPerPage && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {indexOfFirstCoach + 1}-{Math.min(indexOfLastCoach, filteredCoaches.length)} of{" "}
                {filteredCoaches.length}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No recent activities</div>
            ) : (
              activities.map((activity, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <p>{activity.text}</p>
                  <p className="text-sm text-muted-foreground">{activity.time}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Coach Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Total Coaches:</span>
                <span className="font-semibold">{coaches.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Male Coaches:</span>
                <span className="font-semibold">{coaches.filter((coach) => coach.gender_id === 1).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Female Coaches:</span>
                <span className="font-semibold">{coaches.filter((coach) => coach.gender_id === 2).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Coach Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Coach</DialogTitle>
            <DialogDescription>Enter the basic details for the new coach.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddCoach)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Michael" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="lname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password*</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {genderOptions.map((gender) => (
                            <SelectItem key={gender.id} value={gender.id}>
                              {gender.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth*</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Coach
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Coach Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update the coach's basic information.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateCoach)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Michael" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="lname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (leave blank to keep current)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {genderOptions.map((gender) => (
                            <SelectItem key={gender.id} value={gender.id}>
                              {gender.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth*</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Coach
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Coach</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this coach? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedCoach && (
            <div className="border rounded-md p-4 mb-4">
              <p className="font-medium">{`${selectedCoach.fname} ${selectedCoach.mname} ${selectedCoach.lname}`}</p>
              <p className="text-sm text-muted-foreground">{selectedCoach.email}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ViewCoach
