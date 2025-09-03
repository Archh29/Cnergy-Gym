"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
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
  Eye,
  EyeOff,
} from "lucide-react"

const API_URL = "http://localhost/cynergy/addcoach.php"

const validatePassword = (password) => {
  const errors = []
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }
  return errors
}

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

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
  const [validationErrors, setValidationErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  const coachesPerPage = 5
  const indexOfLastCoach = currentPage * coachesPerPage
  const indexOfFirstCoach = indexOfLastCoach - coachesPerPage
  const currentCoaches = filteredCoaches.slice(indexOfFirstCoach, indexOfLastCoach)
  const totalPages = Math.ceil(filteredCoaches.length / coachesPerPage)

  const { toast } = useToast()

  const [formData, setFormData] = useState({
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

  const validateForm = (data, isEdit = false) => {
    const errors = {}

    // Name validations
    if (!data.fname.trim()) errors.fname = "First name is required"
    if (!data.mname.trim()) errors.mname = "Middle name is required"
    if (!data.lname.trim()) errors.lname = "Last name is required"

    // Email validation
    if (!data.email.trim()) {
      errors.email = "Email is required"
    } else if (!validateEmail(data.email)) {
      errors.email = "Please enter a valid email address"
    }

    // Password validation (only for new coaches or when password is provided in edit)
    if (!isEdit || (isEdit && data.password && data.password.trim())) {
      if (!data.password || !data.password.trim()) {
        errors.password = "Password is required"
      } else {
        const passwordErrors = validatePassword(data.password)
        if (passwordErrors.length > 0) {
          errors.password = passwordErrors[0]
        }
      }
    }

    // Date validation
    if (!data.bday) errors.bday = "Date of birth is required"
    if (!data.gender_id) errors.gender_id = "Please select a gender"
    if (!data.specialty) errors.specialty = "Please specify a specialty"
    if (!data.experience) errors.experience = "Please specify experience level"
    if (!data.hourly_rate) errors.hourly_rate = "Please set an hourly rate"

    return errors
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear validation error
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSwitchChange = (name, checked) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const resetForm = () => {
    setFormData({
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
    setValidationErrors({})
  }

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
    fetchCoaches()
    fetchActivityLogs()
  }, [])

  const fetchCoaches = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(API_URL)
      const coachesData = response.data.coaches || []
      const enhancedCoaches = coachesData.map((coach) => ({
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
    } catch (error) {
      console.error("Error fetching coaches:", error)
      toast({
        title: "Error",
        description: "Failed to load coaches data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCoach = async (e) => {
    e.preventDefault()

    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setIsLoading(true)

      // Prepare data for both User and Coaches tables
      const formattedData = {
        // User table data
        fname: formData.fname,
        mname: formData.mname,
        lname: formData.lname,
        email: formData.email,
        password: formData.password,
        gender_id: Number.parseInt(formData.gender_id),
        bday: formData.bday,
        user_type_id: formData.user_type_id,
        failed_attempt: 0,

        // Coaches table data
        bio: formData.bio || "",
        specialty: formData.specialty,
        experience: formData.experience,
        hourly_rate: Number.parseFloat(formData.hourly_rate) || 0.0,
        certifications: formData.certifications || "",
        is_available: formData.is_available,
        image_url: formData.image_url || "",
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
          text: `New coach ${formData.fname} ${formData.lname} (${formData.specialty}) registered`,
          time: "Just now",
        }
        setActivities([newActivity, ...activities])
        await fetchActivityLogs()

        toast({ title: "Success", description: "Coach added successfully!" })
        resetForm()
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to add coach.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding coach:", error.response?.data || error.message)
      if (error.response?.data?.error?.includes("email")) {
        setValidationErrors({ email: "Email address already exists" })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to add coach.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCoach = async (e) => {
    e.preventDefault()

    const errors = validateForm(formData, true)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    if (!selectedCoach) return

    try {
      setIsLoading(true)
      const updateData = {
        id: selectedCoach.id,
        // User table data
        fname: formData.fname,
        mname: formData.mname,
        lname: formData.lname,
        email: formData.email,
        gender_id: Number.parseInt(formData.gender_id),
        bday: formData.bday,
        user_type_id: formData.user_type_id,

        // Coaches table data
        bio: formData.bio || "",
        specialty: formData.specialty,
        experience: formData.experience,
        hourly_rate: Number.parseFloat(formData.hourly_rate) || 0.0,
        certifications: formData.certifications || "",
        is_available: formData.is_available,
        image_url: formData.image_url || "",
      }

      if (formData.password && formData.password.trim() !== "") {
        updateData.password = formData.password
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
          text: `${formData.fname} ${formData.lname}'s profile updated`,
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
      if (error.response?.data?.error?.includes("email")) {
        setValidationErrors({ email: "Email address already exists" })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to update coach.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCoach) return

    try {
      setIsLoading(true)
      const response = await axios.delete(API_URL, {
        data: { id: selectedCoach.id },
      })

      if (response.data.success) {
        setCoaches(coaches.filter((coach) => coach.id !== selectedCoach.id))
        setFilteredCoaches(filteredCoaches.filter((coach) => coach.id !== selectedCoach.id))
        setIsDeleteDialogOpen(false)

        const deleteActivity = {
          text: `Coach ${selectedCoach.fullName} removed from system`,
          time: "Just now",
        }
        setActivities([deleteActivity, ...activities])
        await fetchActivityLogs()

        toast({ title: "Success", description: "Coach deleted successfully!" })
      } else {
        throw new Error(response.data.error || "Failed to delete coach.")
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
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleEditCoach = (coach) => {
    setSelectedCoach(coach)
    setFormData({
      fname: coach.fname,
      mname: coach.mname,
      lname: coach.lname,
      email: coach.email,
      password: "", // Clear password for editing
      gender_id: coach.gender === "Male" ? "1" : coach.gender === "Female" ? "2" : "3",
      bday: coach.bday,
      user_type_id: 3,
      bio: coach.bio || "",
      specialty: coach.specialty || "",
      experience: coach.experience || "",
      hourly_rate: coach.hourly_rate?.toString() || "",
      certifications: coach.certifications || "",
      is_available: coach.is_available !== undefined ? coach.is_available : true,
      image_url: coach.image_url || "",
    })
    setValidationErrors({})
    setIsEditDialogOpen(true)
  }

  const handleDeleteCoach = (coach) => {
    setSelectedCoach(coach)
    setIsDeleteDialogOpen(true)
  }

  useEffect(() => {
    const filtered = coaches.filter((coach) => {
      const searchLower = searchQuery.toLowerCase()
      return (
        coach.fullName.toLowerCase().includes(searchLower) ||
        coach.email.toLowerCase().includes(searchLower) ||
        coach.specialty.toLowerCase().includes(searchLower) ||
        coach.experience.toLowerCase().includes(searchLower)
      )
    })
    setFilteredCoaches(filtered)
    setCurrentPage(1)
  }, [searchQuery, coaches])

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Coach
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Coaches</p>
              <p className="text-2xl font-bold">{coaches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">{coaches.filter((c) => c.is_available).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
              <p className="text-2xl font-bold">
                {coaches.length > 0
                  ? (coaches.reduce((sum, coach) => sum + coach.rating, 0) / coaches.length).toFixed(1)
                  : "0.0"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Avg Rate/hr</p>
              <p className="text-2xl font-bold">
                $
                {coaches.length > 0
                  ? (coaches.reduce((sum, coach) => sum + coach.hourly_rate, 0) / coaches.length).toFixed(0)
                  : "0"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Coaches List</CardTitle>
          <CardDescription>View and manage all registered coaches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coaches by name, email, specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Coaches Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coach</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Rate/hr</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading coaches...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentCoaches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No coaches found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentCoaches.map((coach) => (
                    <TableRow key={coach.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {coach.image_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={coach.image_url || "/placeholder.svg"}
                              alt={coach.fullName}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{coach.fullName}</div>
                            <div className="text-sm text-muted-foreground">{coach.total_clients} clients</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{coach.email}</div>
                          <div className="text-sm text-muted-foreground">{coach.gender}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{coach.specialty}</Badge>
                      </TableCell>
                      <TableCell>{coach.experience}</TableCell>
                      <TableCell>${coach.hourly_rate}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          {coach.rating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={coach.is_available ? "default" : "secondary"}>
                          {coach.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCoach(coach)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteCoach(coach)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {indexOfFirstCoach + 1} to {Math.min(indexOfLastCoach, filteredCoaches.length)} of{" "}
                {filteredCoaches.length} coaches
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <Button
                      key={number}
                      variant={currentPage === number ? "default" : "outline"}
                      size="sm"
                      onClick={() => paginate(number)}
                    >
                      {number}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                activities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.text}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Active Coaches:</span>
                <span className="font-semibold text-green-600">{coaches.filter((c) => c.is_available).length}</span>
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
          <form onSubmit={handleAddCoach} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fname">First Name*</Label>
                  <Input
                    id="fname"
                    name="fname"
                    placeholder="John"
                    value={formData.fname}
                    onChange={handleInputChange}
                    className={validationErrors.fname ? "border-red-500" : ""}
                  />
                  {validationErrors.fname && <p className="text-sm text-red-500">{validationErrors.fname}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mname">Middle Name*</Label>
                  <Input
                    id="mname"
                    name="mname"
                    placeholder="Michael"
                    value={formData.mname}
                    onChange={handleInputChange}
                    className={validationErrors.mname ? "border-red-500" : ""}
                  />
                  {validationErrors.mname && <p className="text-sm text-red-500">{validationErrors.mname}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lname">Last Name*</Label>
                <Input
                  id="lname"
                  name="lname"
                  placeholder="Doe"
                  value={formData.lname}
                  onChange={handleInputChange}
                  className={validationErrors.lname ? "border-red-500" : ""}
                />
                {validationErrors.lname && <p className="text-sm text-red-500">{validationErrors.lname}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email*</Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={validationErrors.email ? "border-red-500" : ""}
                  />
                  {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password*</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="********"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={validationErrors.password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
                  <p className="text-xs text-gray-500">
                    Password must be 8+ characters with uppercase, number, and special character
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender_id">Gender*</Label>
                  <Select value={formData.gender_id} onValueChange={(value) => handleSelectChange("gender_id", value)}>
                    <SelectTrigger className={validationErrors.gender_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((gender) => (
                        <SelectItem key={gender.id} value={gender.id}>
                          {gender.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.gender_id && <p className="text-sm text-red-500">{validationErrors.gender_id}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bday">Date of Birth*</Label>
                  <Input
                    type="date"
                    id="bday"
                    name="bday"
                    value={formData.bday}
                    onChange={handleInputChange}
                    className={validationErrors.bday ? "border-red-500" : ""}
                  />
                  {validationErrors.bday && <p className="text-sm text-red-500">{validationErrors.bday}</p>}
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  placeholder="Tell us about the coach's background and approach..."
                  className="min-h-[100px]"
                  value={formData.bio}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty*</Label>
                  <Select value={formData.specialty} onValueChange={(value) => handleSelectChange("specialty", value)}>
                    <SelectTrigger className={validationErrors.specialty ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialtyOptions.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.specialty && <p className="text-sm text-red-500">{validationErrors.specialty}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level*</Label>
                  <Select
                    value={formData.experience}
                    onValueChange={(value) => handleSelectChange("experience", value)}
                  >
                    <SelectTrigger className={validationErrors.experience ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceOptions.map((exp) => (
                        <SelectItem key={exp} value={exp}>
                          {exp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.experience && <p className="text-sm text-red-500">{validationErrors.experience}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate ($)*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="hourly_rate"
                    name="hourly_rate"
                    placeholder="50.00"
                    value={formData.hourly_rate}
                    onChange={handleInputChange}
                    className={validationErrors.hourly_rate ? "border-red-500" : ""}
                  />
                  {validationErrors.hourly_rate && (
                    <p className="text-sm text-red-500">{validationErrors.hourly_rate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_url">Profile Image URL</Label>
                  <Input
                    id="image_url"
                    name="image_url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Textarea
                  id="certifications"
                  name="certifications"
                  placeholder="List certifications (e.g., NASM-CPT, ACE, ACSM...)"
                  value={formData.certifications}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Available for Training</Label>
                  <div className="text-sm text-muted-foreground">
                    Set whether this coach is currently available for new clients
                  </div>
                </div>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => handleSwitchChange("is_available", checked)}
                />
              </div>
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
        </DialogContent>
      </Dialog>

      {/* Edit Coach Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update the coach's information in both User and Coaches tables.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCoach} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fname">First Name*</Label>
                  <Input
                    id="edit-fname"
                    name="fname"
                    placeholder="John"
                    value={formData.fname}
                    onChange={handleInputChange}
                    className={validationErrors.fname ? "border-red-500" : ""}
                  />
                  {validationErrors.fname && <p className="text-sm text-red-500">{validationErrors.fname}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mname">Middle Name*</Label>
                  <Input
                    id="edit-mname"
                    name="mname"
                    placeholder="Michael"
                    value={formData.mname}
                    onChange={handleInputChange}
                    className={validationErrors.mname ? "border-red-500" : ""}
                  />
                  {validationErrors.mname && <p className="text-sm text-red-500">{validationErrors.mname}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lname">Last Name*</Label>
                <Input
                  id="edit-lname"
                  name="lname"
                  placeholder="Doe"
                  value={formData.lname}
                  onChange={handleInputChange}
                  className={validationErrors.lname ? "border-red-500" : ""}
                />
                {validationErrors.lname && <p className="text-sm text-red-500">{validationErrors.lname}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email*</Label>
                  <Input
                    type="email"
                    id="edit-email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={validationErrors.email ? "border-red-500" : ""}
                  />
                  {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                  <div className="relative">
                    <Input
                      type={showEditPassword ? "text" : "password"}
                      id="edit-password"
                      name="password"
                      placeholder="********"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={validationErrors.password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
                  <p className="text-xs text-gray-500">
                    If changing password: 8+ characters with uppercase, number, and special character
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-gender_id">Gender*</Label>
                  <Select value={formData.gender_id} onValueChange={(value) => handleSelectChange("gender_id", value)}>
                    <SelectTrigger className={validationErrors.gender_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((gender) => (
                        <SelectItem key={gender.id} value={gender.id}>
                          {gender.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.gender_id && <p className="text-sm text-red-500">{validationErrors.gender_id}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bday">Date of Birth*</Label>
                  <Input
                    type="date"
                    id="edit-bday"
                    name="bday"
                    value={formData.bday}
                    onChange={handleInputChange}
                    className={validationErrors.bday ? "border-red-500" : ""}
                  />
                  {validationErrors.bday && <p className="text-sm text-red-500">{validationErrors.bday}</p>}
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  name="bio"
                  placeholder="Tell us about the coach's background and approach..."
                  className="min-h-[100px]"
                  value={formData.bio}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-specialty">Specialty*</Label>
                  <Select value={formData.specialty} onValueChange={(value) => handleSelectChange("specialty", value)}>
                    <SelectTrigger className={validationErrors.specialty ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialtyOptions.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.specialty && <p className="text-sm text-red-500">{validationErrors.specialty}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-experience">Experience Level*</Label>
                  <Select
                    value={formData.experience}
                    onValueChange={(value) => handleSelectChange("experience", value)}
                  >
                    <SelectTrigger className={validationErrors.experience ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceOptions.map((exp) => (
                        <SelectItem key={exp} value={exp}>
                          {exp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.experience && <p className="text-sm text-red-500">{validationErrors.experience}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-hourly_rate">Hourly Rate ($)*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="edit-hourly_rate"
                    name="hourly_rate"
                    placeholder="50.00"
                    value={formData.hourly_rate}
                    onChange={handleInputChange}
                    className={validationErrors.hourly_rate ? "border-red-500" : ""}
                  />
                  {validationErrors.hourly_rate && (
                    <p className="text-sm text-red-500">{validationErrors.hourly_rate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-image_url">Profile Image URL</Label>
                  <Input
                    id="edit-image_url"
                    name="image_url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-certifications">Certifications</Label>
                <Textarea
                  id="edit-certifications"
                  name="certifications"
                  placeholder="List certifications (e.g., NASM-CPT, ACE, ACSM...)"
                  value={formData.certifications}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Available for Training</Label>
                  <div className="text-sm text-muted-foreground">
                    Set whether this coach is currently available for new clients
                  </div>
                </div>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => handleSwitchChange("is_available", checked)}
                />
              </div>
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
