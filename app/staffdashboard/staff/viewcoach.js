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

const API_URL = "http://localhost/cynergy/addcoach.php" // Adjust to match your backend URL

// Update the form schema to include all required user fields
const coachFormSchema = z.object({
  fname: z.string().min(2, { message: "First name must be at least 2 characters." }),
  mname: z.string().optional(),
  lname: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone_no: z.string().min(10, { message: "Phone number must be at least 10 digits." }).optional(),
  gender: z.enum(["Male", "Female", "Other"], {
    required_error: "Please select a gender.",
  }),
  bday: z.string().optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  id_usertype: z.number().default(2), // Default to 2 for coaches
  specialization: z.string().min(1, { message: "Please select a specialization." }),
  experience_year: z.string().min(1, { message: "Please enter years of experience." }),
  certifications: z.string().default("Certified Personal Trainer"),
  availability: z.string().min(1, { message: "Please select availability." }),
  hourly_rate: z.string().min(1, { message: "Please enter hourly rate." }),
  descriptions: z.string().optional(),
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

  // Update the form default values
  const form = useForm({
    resolver: zodResolver(coachFormSchema),
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      phone_no: "",
      gender: undefined,
      bday: "",
      password: "",
      id_usertype: 2,
      specialization: "",
      experience_year: "",
      certifications: "Certified Personal Trainer",
      availability: "",
      hourly_rate: "50",
      descriptions: "",
    },
  })

  // Update the useEffect for fetching coaches to handle the backend response format
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(API_URL)

        // The PHP backend returns { coaches: [...] } for GET requests
        const coachesData = response.data.coaches || []

        // Process the data to handle JSON-encoded availability
        const processedCoaches = coachesData.map((coach) => ({
          ...coach,
          // Parse availability if it's a JSON string
          availability:
            typeof coach.availability === "string"
              ? coach.availability.startsWith("[") || coach.availability.startsWith("{")
                ? JSON.parse(coach.availability)
                : coach.availability
              : coach.availability,
        }))

        setCoaches(processedCoaches)
        setFilteredCoaches(processedCoaches)
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

  // Filter coaches when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCoaches(coaches)
    } else {
      const lowercaseQuery = searchQuery.toLowerCase()
      const filtered = coaches.filter(
        (coach) =>
          `${coach.fname} ${coach.lname}`.toLowerCase().includes(lowercaseQuery) ||
          coach.email?.toLowerCase().includes(lowercaseQuery) ||
          coach.specialization?.toLowerCase().includes(lowercaseQuery),
      )
      setFilteredCoaches(filtered)
    }
    setCurrentPage(1) // Reset to first page when search changes
  }, [searchQuery, coaches])

  // Update the handleAddCoach function to match the backend's expected format
  const handleAddCoach = async (data) => {
    try {
      setIsLoading(true)

      // Format availability as an array if it's a string
      const formattedData = {
        ...data,
        hourly_rate: Number.parseFloat(data.hourly_rate), // Ensure hourly_rate is a number
        availability: data.availability, // Backend will JSON.stringify this
      }

      const response = await axios.post(API_URL, formattedData)

      if (response.data.success) {
        // Refresh the coaches list
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        setCoaches(updatedCoaches)
        setFilteredCoaches(updatedCoaches)

        setIsAddDialogOpen(false)
        setActivities([{ text: `New coach ${data.fname} ${data.lname} registered`, time: "Just now" }, ...activities])
        toast({ title: "Success", description: "Coach added successfully!" })
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

      // Format data properly for backend expectations
      const updateData = {
        id_coach: selectedCoach.id_coach, // Ensure this is present
        fname: data.fname,
        mname: data.mname, // Added middle name
        lname: data.lname,
        email: data.email,
        phone_no: data.phone_no,
        bday: data.bday,
        specialization: data.specialization,
        experience_year: data.experience_year,
        certifications: data.certifications,
        availability: JSON.stringify(data.availability), // Ensure proper formatting
        hourly_rate: Number.parseFloat(data.hourly_rate), // Ensure number format
        descriptions: data.descriptions,
      }

      // Send PUT request
      const response = await axios.put(API_URL, updateData, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.data.success) {
        // Fetch updated coaches list
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        setCoaches([...updatedCoaches])
        setFilteredCoaches([...updatedCoaches])

        setIsEditDialogOpen(false)

        // Update activity log
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

      // Format the data according to the PHP backend's expected structure for deletion
      const deleteData = {
        id_coach: selectedCoach.id_coach,
      }

      const response = await axios.delete(API_URL, { data: deleteData })

      if (response.data.success) {
        // Refresh the coaches list
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
      phone_no: "",
      gender: undefined,
      bday: "",
      password: "",
      id_usertype: 2,
      specialization: "",
      experience_year: "",
      certifications: "Certified Personal Trainer",
      availability: "",
      hourly_rate: "50",
      descriptions: "",
    })
    setIsAddDialogOpen(true)
  }

  // Update the availability field in the form to handle array values
  const handleEditCoach = (coach) => {
    setSelectedCoach(coach)

    // Parse availability if it's a JSON string
    let availability = coach.availability
    if (typeof availability === "string") {
      try {
        if (availability.startsWith("[") || availability.startsWith("{")) {
          const parsed = JSON.parse(availability)
          // If it's an array, take the first value or convert to string
          availability = Array.isArray(parsed) ? parsed[0] : availability
        }
      } catch (e) {
        console.error("Error parsing availability:", e)
      }
    } else if (Array.isArray(availability)) {
      availability = availability[0] // Take first value if it's already an array
    }

    form.reset({
      fname: coach.fname || "",
      mname: coach.mname || "",
      lname: coach.lname || "",
      email: coach.email || "",
      phone_no: coach.phone_no || "",
      gender: coach.gender || "Male",
      bday: coach.bday ? new Date(coach.bday).toISOString().split("T")[0] : "",
      password: "", // Don't populate password for security reasons
      id_usertype: coach.id_usertype || 2,
      specialization: coach.specialization || "",
      experience_year: coach.experience_year || "",
      certifications: coach.certifications || "Certified Personal Trainer",
      availability: availability,
      hourly_rate: coach.hourly_rate?.toString() || "50",
      descriptions: coach.descriptions || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteCoach = (coach) => {
    setSelectedCoach(coach)
    setIsDeleteDialogOpen(true)
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
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search coaches by name, email, or specialization..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Coaches table */}
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
                  <TableHead>Specialization</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentCoaches.map((coach) => (
                  <TableRow key={coach.id_coach}>
                    <TableCell>{`${coach.fname} ${coach.lname}`}</TableCell>
                    <TableCell>{coach.specialization}</TableCell>
                    <TableCell>{coach.experience_year}</TableCell>
                    {/* Update the TableCell for availability to properly display the value */}
                    <TableCell>
                      {typeof coach.availability === "string"
                        ? coach.availability
                        : Array.isArray(coach.availability)
                          ? coach.availability.join(", ")
                          : JSON.stringify(coach.availability)}
                    </TableCell>
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

          {/* Pagination */}
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

      <div className="grid gap-8 md:grid-cols-2 w-full">
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
                <div key={index} className="mb-4 last:mb-0 break-words">
                  <p className="line-clamp-2">{activity.text}</p>
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
                <span>Most Common Specialization:</span>
                <span className="font-semibold">
                  {Object.entries(
                    coaches.reduce((acc, coach) => {
                      if (coach.specialization) {
                        acc[coach.specialization] = (acc[coach.specialization] || 0) + 1
                      }
                      return acc
                    }, {}),
                  ).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"}
                </span>
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
            <DialogDescription>Enter the details of the new gym coach.</DialogDescription>
          </DialogHeader>
          {/* Replace the Add Coach Dialog form with this updated version */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddCoach)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Michael" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="gender"
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
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="phone_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Strength Training">Strength Training</SelectItem>
                          <SelectItem value="Yoga">Yoga</SelectItem>
                          <SelectItem value="CrossFit">CrossFit</SelectItem>
                          <SelectItem value="Pilates">Pilates</SelectItem>
                          <SelectItem value="Nutrition">Nutrition</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experience_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (years)*</FormLabel>
                      <FormControl>
                        <Input placeholder="5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certifications</FormLabel>
                      <FormControl>
                        <Input placeholder="Certified Personal Trainer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)*</FormLabel>
                      <FormControl>
                        <Input placeholder="50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select availability" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Weekdays">Weekdays</SelectItem>
                        <SelectItem value="Weekends">Weekends</SelectItem>
                        <SelectItem value="Evenings">Evenings</SelectItem>
                        <SelectItem value="Mornings">Mornings</SelectItem>
                        <SelectItem value="Flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descriptions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Professional coach with expertise in..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            <DialogDescription>Update the details of the gym coach.</DialogDescription>
          </DialogHeader>
          {/* Replace the Edit Coach Dialog form with this updated version */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateCoach)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Michael" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="gender"
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
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="phone_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Strength Training">Strength Training</SelectItem>
                          <SelectItem value="Yoga">Yoga</SelectItem>
                          <SelectItem value="CrossFit">CrossFit</SelectItem>
                          <SelectItem value="Pilates">Pilates</SelectItem>
                          <SelectItem value="Nutrition">Nutrition</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experience_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (years)*</FormLabel>
                      <FormControl>
                        <Input placeholder="5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certifications</FormLabel>
                      <FormControl>
                        <Input placeholder="Certified Personal Trainer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)*</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select availability" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Weekdays">Weekdays</SelectItem>
                        <SelectItem value="Weekends">Weekends</SelectItem>
                        <SelectItem value="Evenings">Evenings</SelectItem>
                        <SelectItem value="Mornings">Mornings</SelectItem>
                        <SelectItem value="Flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descriptions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Professional coach with expertise in..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              <p className="font-medium">{`${selectedCoach.fname} ${selectedCoach.lname}`}</p>
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

