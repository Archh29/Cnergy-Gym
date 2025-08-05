"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Award,
  User,
  Star,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react"

const API_URL = "http://localhost/cynergy/addcoach.php"

// Enhanced form schema including all coach-specific fields
const coachFormSchema = z.object({
  // User table fields
  fname: z.string().min(2, { message: "First name must be at least 2 characters." }),
  mname: z.string().min(1, { message: "Middle name is required." }),
  lname: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  gender_id: z.string().min(1, { message: "Please select a gender." }),
  bday: z.string().min(1, { message: "Date of birth is required." }),
  user_type_id: z.number().default(3),

  // Coaches table fields
  bio: z.string().optional(),
  specialty: z.string().min(1, { message: "Please specify a specialty." }),
  experience: z.string().min(1, { message: "Please specify experience level." }),
  hourly_rate: z.string().min(1, { message: "Please set an hourly rate." }),
  certifications: z.string().optional(),
  is_available: z.boolean().default(true),
  image_url: z.string().optional(),
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
  const [activityLogs, setActivityLogs] = useState([])

  const coachesPerPage = 5
  const indexOfLastCoach = currentPage * coachesPerPage
  const indexOfFirstCoach = indexOfLastCoach - coachesPerPage
  const currentCoaches = filteredCoaches.slice(indexOfFirstCoach, indexOfLastCoach)
  const totalPages = Math.ceil(filteredCoaches.length / coachesPerPage)

  const { toast } = useToast()

  // Enhanced form with all coach fields
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
      user_type_id: 3,
      bio: "",
      specialty: "",
      experience: "",
      hourly_rate: "",
      certifications: "",
      is_available: true,
      image_url: "",
    },
  })

  const genderOptions = [
    { id: "1", name: "Male" },
    { id: "2", name: "Female" },
    { id: "3", name: "Other" },
  ]

  const specialtyOptions = [
    "Personal Training",
    "Weight Loss",
    "Muscle Building",
    "Cardio Training",
    "Strength Training",
    "Yoga",
    "Pilates",
    "CrossFit",
    "Sports Training",
    "Rehabilitation",
    "Nutrition Coaching",
    "Group Fitness",
  ]

  const experienceOptions = [
    "Beginner (0-1 years)",
    "Intermediate (2-5 years)",
    "Advanced (6-10 years)",
    "Expert (10+ years)",
  ]

  // Fetch activity logs from backend
  const fetchActivityLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}?log=true`)
      if (response.data.logs) {
        setActivityLogs(response.data.logs.slice(0, 5))
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error)
    }
  }

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(API_URL)
        const coachesData = response.data.coaches || []

        // Enhanced coach data with coach-specific information
        const enhancedCoaches = coachesData.map((coach) => ({
          ...coach,
          fullName: `${coach.fname} ${coach.mname} ${coach.lname}`,
          // Default values for coach-specific fields if not provided by backend
          bio: coach.bio || "",
          specialty: coach.specialty || "General Training",
          experience: coach.experience || "Not specified",
          rating: coach.rating || 0.0,
          total_clients: coach.total_clients || 0,
          hourly_rate: coach.hourly_rate || 0.0,
          certifications: coach.certifications || "",
          is_available: coach.is_available !== undefined ? coach.is_available : true,
          image_url: coach.image_url || "",
        }))

        setCoaches(enhancedCoaches)
        setFilteredCoaches(enhancedCoaches)
        await fetchActivityLogs()
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
          coach.fullName.toLowerCase().includes(lowercaseQuery) ||
          coach.email?.toLowerCase().includes(lowercaseQuery) ||
          coach.specialty?.toLowerCase().includes(lowercaseQuery) ||
          coach.experience?.toLowerCase().includes(lowercaseQuery),
      )
      setFilteredCoaches(filtered)
    }
    setCurrentPage(1)
  }, [searchQuery, coaches])

  const handleAddCoach = async (data) => {
    try {
      setIsLoading(true)

      // Prepare data for both User and Coaches tables
      const formattedData = {
        // User table data
        fname: data.fname,
        mname: data.mname,
        lname: data.lname,
        email: data.email,
        password: data.password,
        gender_id: Number.parseInt(data.gender_id),
        bday: data.bday,
        user_type_id: data.user_type_id,
        failed_attempt: 0,

        // Coaches table data
        bio: data.bio || "",
        specialty: data.specialty,
        experience: data.experience,
        hourly_rate: Number.parseFloat(data.hourly_rate) || 0.0,
        certifications: data.certifications || "",
        is_available: data.is_available,
        image_url: data.image_url || "",
      }

      const response = await axios.post(API_URL, formattedData)
      if (response.data.success) {
        // Refresh coaches list
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        const enhancedCoaches = updatedCoaches.map((coach) => ({
          ...coach,
          fullName: `${coach.fname} ${coach.mname} ${coach.lname}`,
          bio: coach.bio || "",
          specialty: coach.specialty || "General Training",
          experience: coach.experience || "Not specified",
          rating: coach.rating || 0.0,
          total_clients: coach.total_clients || 0,
          hourly_rate: coach.hourly_rate || 0.0,
          certifications: coach.certifications || "",
          is_available: coach.is_available !== undefined ? coach.is_available : true,
          image_url: coach.image_url || "",
        }))

        setCoaches(enhancedCoaches)
        setFilteredCoaches(enhancedCoaches)
        setIsAddDialogOpen(false)

        const newActivity = {
          text: `New coach ${data.fname} ${data.lname} (${data.specialty}) registered`,
          time: "Just now",
        }
        setActivities([newActivity, ...activities])
        await fetchActivityLogs()

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
        id: selectedCoach.id,
        // User table data
        fname: data.fname,
        mname: data.mname,
        lname: data.lname,
        email: data.email,
        gender_id: Number.parseInt(data.gender_id),
        bday: data.bday,
        user_type_id: data.user_type_id,

        // Coaches table data
        bio: data.bio || "",
        specialty: data.specialty,
        experience: data.experience,
        hourly_rate: Number.parseFloat(data.hourly_rate) || 0.0,
        certifications: data.certifications || "",
        is_available: data.is_available,
        image_url: data.image_url || "",
      }

      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password
      }

      const response = await axios.put(API_URL, updateData, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.data.success) {
        // Refresh coaches list
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        const enhancedCoaches = updatedCoaches.map((coach) => ({
          ...coach,
          fullName: `${coach.fname} ${coach.mname} ${coach.lname}`,
          bio: coach.bio || "",
          specialty: coach.specialty || "General Training",
          experience: coach.experience || "Not specified",
          rating: coach.rating || 0.0,
          total_clients: coach.total_clients || 0,
          hourly_rate: coach.hourly_rate || 0.0,
          certifications: coach.certifications || "",
          is_available: coach.is_available !== undefined ? coach.is_available : true,
          image_url: coach.image_url || "",
        }))

        setCoaches(enhancedCoaches)
        setFilteredCoaches(enhancedCoaches)
        setIsEditDialogOpen(false)

        const updateActivity = {
          text: `${data.fname} ${data.lname}'s profile updated`,
          time: "Just now",
        }
        setActivities([updateActivity, ...activities])
        await fetchActivityLogs()

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
        // Refresh coaches list
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        const enhancedCoaches = updatedCoaches.map((coach) => ({
          ...coach,
          fullName: `${coach.fname} ${coach.mname} ${coach.lname}`,
          bio: coach.bio || "",
          specialty: coach.specialty || "General Training",
          experience: coach.experience || "Not specified",
          rating: coach.rating || 0.0,
          total_clients: coach.total_clients || 0,
          hourly_rate: coach.hourly_rate || 0.0,
          certifications: coach.certifications || "",
          is_available: coach.is_available !== undefined ? coach.is_available : true,
          image_url: coach.image_url || "",
        }))

        setCoaches(enhancedCoaches)
        setFilteredCoaches(enhancedCoaches)
        setIsDeleteDialogOpen(false)

        const deleteActivity = {
          text: `Coach ${selectedCoach.fname} ${selectedCoach.lname} removed`,
          time: "Just now",
        }
        setActivities([deleteActivity, ...activities])
        await fetchActivityLogs()

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
      bio: "",
      specialty: "",
      experience: "",
      hourly_rate: "",
      certifications: "",
      is_available: true,
      image_url: "",
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
      password: "",
      gender_id: coach.gender_id?.toString() || "",
      bday: coach.bday ? new Date(coach.bday).toISOString().split("T")[0] : "",
      user_type_id: coach.user_type_id || 3,
      bio: coach.bio || "",
      specialty: coach.specialty || "",
      experience: coach.experience || "",
      hourly_rate: coach.hourly_rate?.toString() || "",
      certifications: coach.certifications || "",
      is_available: coach.is_available !== undefined ? coach.is_available : true,
      image_url: coach.image_url || "",
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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return "N/A"
    }
  }

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-200 text-yellow-400" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />)
    }

    return stars
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Gym Coaches Management
              </CardTitle>
              <CardDescription>
                Manage your gym's coaching staff with detailed profiles and specializations
              </CardDescription>
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
              placeholder="Search coaches by name, email, or specialty..."
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Rate/Hour</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCoaches.map((coach) => (
                    <TableRow key={coach.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {coach.image_url ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={coach.image_url || "/placeholder.svg"}
                                alt={coach.fullName}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{coach.fullName}</div>
                            <div className="text-sm text-muted-foreground">{coach.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{coach.specialty}</Badge>
                      </TableCell>
                      <TableCell>{coach.experience}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {renderStars(coach.rating)}
                          <span className="text-sm text-muted-foreground ml-2">({coach.rating.toFixed(1)})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                          {coach.total_clients}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                          {coach.hourly_rate.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {coach.is_available ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <span className={coach.is_available ? "text-green-700" : "text-red-700"}>
                            {coach.is_available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCoach(coach)}>
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteCoach(coach)}>
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && filteredCoaches.length > coachesPerPage && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {indexOfFirstCoach + 1}-{Math.min(indexOfLastCoach, filteredCoaches.length)} of{" "}
                {filteredCoaches.length} coaches
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
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
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
            {activityLogs.length === 0 && activities.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No recent activities</div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 3).map((activity, index) => (
                  <div key={`local-${index}`} className="border-l-2 border-blue-500 pl-3">
                    <p className="text-sm">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                ))}
                {activityLogs.slice(0, 2).map((log, index) => (
                  <div key={`db-${index}`} className="border-l-2 border-gray-300 pl-3">
                    <p className="text-sm">{log.activity}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
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
                <span className="font-semibold text-lg">{coaches.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Available Coaches:</span>
                <span className="font-semibold text-green-600">
                  {coaches.filter((coach) => coach.is_available).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Average Rating:</span>
                <span className="font-semibold text-yellow-600">
                  {coaches.length > 0
                    ? (coaches.reduce((sum, coach) => sum + coach.rating, 0) / coaches.length).toFixed(1)
                    : "0.0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Clients:</span>
                <span className="font-semibold text-blue-600">
                  {coaches.reduce((sum, coach) => sum + coach.total_clients, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Coach Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Coach</DialogTitle>
            <DialogDescription>
              Enter the complete details for the new coach. This will create entries in both User and Coaches tables.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddCoach)} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
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
                <div className="grid grid-cols-2 gap-4">
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
                </div>
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
              </div>

              {/* Professional Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Professional Information</h3>
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about the coach's background and approach..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialty*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select specialty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {specialtyOptions.map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>
                                {specialty}
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
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience Level*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {experienceOptions.map((exp) => (
                              <SelectItem key={exp} value={exp}>
                                {exp}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)*</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="50.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certifications</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List certifications (e.g., NASM-CPT, ACE, ACSM...)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Available for Training</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Set whether this coach is currently available for new clients
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update the coach's information in both User and Coaches tables.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateCoach)} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
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
                <div className="grid grid-cols-2 gap-4">
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
                </div>
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
              </div>

              {/* Professional Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Professional Information</h3>
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about the coach's background and approach..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialty*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select specialty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {specialtyOptions.map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>
                                {specialty}
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
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience Level*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {experienceOptions.map((exp) => (
                              <SelectItem key={exp} value={exp}>
                                {exp}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)*</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="50.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certifications</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List certifications (e.g., NASM-CPT, ACE, ACSM...)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Available for Training</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Set whether this coach is currently available for new clients
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
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
              Are you sure you want to delete this coach? This will remove entries from both User and Coaches tables.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedCoach && (
            <div className="border rounded-md p-4 mb-4">
              <div className="flex items-center space-x-3 mb-2">
                {selectedCoach.image_url ? (
                  <img
                    className="h-12 w-12 rounded-full object-cover"
                    src={selectedCoach.image_url || "/placeholder.svg"}
                    alt={selectedCoach.fullName}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedCoach.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedCoach.email}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Specialty: {selectedCoach.specialty}</p>
                <p>Experience: {selectedCoach.experience}</p>
                <p>Clients: {selectedCoach.total_clients}</p>
                <p>Rating: {selectedCoach.rating.toFixed(1)}/5.0</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Coach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ViewCoach
