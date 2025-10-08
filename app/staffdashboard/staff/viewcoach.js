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
  Users,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react"

const API_URL = "https://api.cnergy.site/addcoach.php"

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

const ViewCoach = ({ userId }) => {
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
  const [coachStats, setCoachStats] = useState({
    totalCoaches: 0,
    availableCoaches: 0,
    averageRating: 0,
    averagePerSessionRate: 0,
    totalClients: 0,
    specialtyDistribution: [],
    recentActivities: []
  })
  const [activityFilter, setActivityFilter] = useState('all')
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
    per_session_rate: "",
    package_rate: "",
    package_sessions: "",
    monthly_rate: "",
    certifications: "",
    is_available: true,
    image_url: "",
  })

  const genderOptions = [
    { id: "1", name: "Male" },
    { id: "2", name: "Female" },
    // Note: "Other" option removed until added to database
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
    if (data.gender_id && ![1, 2].includes(Number.parseInt(data.gender_id))) {
      errors.gender_id = "Please select a valid gender"
    }
    if (!data.specialty) errors.specialty = "Please specify a specialty"
    if (!data.experience) errors.experience = "Please specify experience level"
    if (!data.per_session_rate) errors.per_session_rate = "Please set a per session rate"
    
    // Package sessions validation
    if (data.package_sessions && (isNaN(data.package_sessions) || data.package_sessions < 1)) {
      errors.package_sessions = "Package sessions must be a positive number"
    }
    
    // Rate validations
    if (data.package_rate && (isNaN(data.package_rate) || data.package_rate < 0)) {
      errors.package_rate = "Package rate must be a positive number"
    }
    if (data.monthly_rate && (isNaN(data.monthly_rate) || data.monthly_rate < 0)) {
      errors.monthly_rate = "Monthly rate must be a positive number"
    }

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
      per_session_rate: "",
      package_rate: "",
      package_sessions: "",
      monthly_rate: "",
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

  // Fetch coach statistics from backend
  const fetchCoachStats = async () => {
    try {
      const response = await axios.get(`${API_URL}?stats=true&filter=${activityFilter}`)
      if (response.data.stats) {
        setCoachStats(response.data.stats)
        // Update activities with real data
        setActivities(response.data.stats.recentActivities || [])
      }
    } catch (error) {
      console.error("Error fetching coach statistics:", error)
    }
  }

  // Filter activities based on time period
  const getFilteredActivities = () => {
    if (activityFilter === 'all') return coachStats.recentActivities
    
    const now = new Date()
    const filterDate = new Date()
    
    switch (activityFilter) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        filterDate.setDate(now.getDate() - 7)
        break
      case 'month':
        filterDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        return coachStats.recentActivities
    }
    
    return coachStats.recentActivities.filter(activity => {
      const activityDate = new Date(activity.timestamp)
      return activityDate >= filterDate
    })
  }

  useEffect(() => {
    fetchCoaches()
    fetchActivityLogs()
    fetchCoachStats()
  }, [])

  // Refetch stats when filter changes
  useEffect(() => {
    fetchCoachStats()
  }, [activityFilter])

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
        per_session_rate: coach.per_session_rate || 0.0,
        package_rate: coach.package_rate || 0.0,
        package_sessions: coach.package_sessions || 0,
        monthly_rate: coach.monthly_rate || 0.0,
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
        user_type_id: Number.parseInt(formData.user_type_id),
        failed_attempt: 0,

        // Coaches table data
        bio: formData.bio || "",
        specialty: formData.specialty,
        experience: formData.experience,
        per_session_rate: Number.parseFloat(formData.per_session_rate) || 0.0,
        package_rate: formData.package_rate ? Number.parseFloat(formData.package_rate) : null,
        package_sessions: formData.package_sessions ? Number.parseInt(formData.package_sessions) : null,
        monthly_rate: formData.monthly_rate ? Number.parseFloat(formData.monthly_rate) : null,
        certifications: formData.certifications || "",
        is_available: formData.is_available,
        image_url: formData.image_url || "",
      }

      const response = await axios.post(`${API_URL}?staff_id=${userId}`, formattedData)
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

        // Refresh statistics and activity logs
        await fetchCoachStats()
        await fetchActivityLogs()

        toast({ title: "Success", description: "Coach added successfully!" })
        resetForm()
      } else {
        // Handle API error response (like email already exists)
        console.error("Coach creation failed:", response.data)
        console.error("Error response data:", response.data)
        
        // Check if it's an email-related error (case insensitive)
        const errorText = (response.data.error || "").toLowerCase()
        console.log("Error text to check:", errorText)
        console.log("Contains email:", errorText.includes("email"))
        console.log("Contains already exists:", errorText.includes("already exists"))
        
        if (errorText.includes("email") || errorText.includes("already exists")) {
          // Show the detailed error message from backend
          const errorMessage = response.data.message || response.data.error || "Email address already exists"
          console.log("Showing email error message:", errorMessage)
          setValidationErrors({ email: errorMessage })
          toast({
            title: "Email Already Exists",
            description: errorMessage,
            variant: "destructive",
          })
        } else {
          console.log("Showing generic error message")
          toast({
            title: "Error",
            description: response.data.message || response.data.error || "Failed to add coach.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error adding coach:", error.response?.data || error.message)
      console.error("Error response data:", error.response?.data)
      console.error("Error response status:", error.response?.status)
      console.error("Full error object:", error)
      
      // Check if it's an email-related error (case insensitive)
      const errorText = (error.response?.data?.error || "").toLowerCase()
      
      if (errorText.includes("email") || errorText.includes("already exists")) {
        // Show the detailed error message from backend in form field
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "Email address already exists"
        setValidationErrors({ email: errorMessage })
      } else {
        // Show generic error in form field
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to add coach."
        setValidationErrors({ email: errorMessage })
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
        user_type_id: Number.parseInt(formData.user_type_id),

        // Coaches table data
        bio: formData.bio || "",
        specialty: formData.specialty,
        experience: formData.experience,
        per_session_rate: Number.parseFloat(formData.per_session_rate) || 0.0,
        package_rate: formData.package_rate ? Number.parseFloat(formData.package_rate) : null,
        package_sessions: formData.package_sessions ? Number.parseInt(formData.package_sessions) : null,
        monthly_rate: formData.monthly_rate ? Number.parseFloat(formData.monthly_rate) : null,
        certifications: formData.certifications || "",
        is_available: formData.is_available,
        image_url: formData.image_url || "",
      }

      if (formData.password && formData.password.trim() !== "") {
        updateData.password = formData.password
      }

      const response = await axios.put(`${API_URL}?staff_id=${userId}`, updateData, {
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

        // Refresh statistics and activity logs
        await fetchCoachStats()
        await fetchActivityLogs()

        toast({ title: "Success", description: "Coach updated successfully!" })
      } else {
        throw new Error(response.data.error || "Failed to update coach.")
      }
    } catch (error) {
      console.error("Error updating coach:", error.response?.data || error.message)
      if (error.response?.data?.error?.includes("email")) {
        // Show the detailed error message from backend
        const errorMessage = error.response?.data?.message || "Email address already exists"
        setValidationErrors({ email: errorMessage })
        toast({
          title: "Email Already Exists",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.response?.data?.error || "Failed to update coach.",
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
      const response = await axios.delete(`${API_URL}?staff_id=${userId}`, {
        data: { id: selectedCoach.id },
      })

      if (response.data.success) {
        setCoaches(coaches.filter((coach) => coach.id !== selectedCoach.id))
        setFilteredCoaches(filteredCoaches.filter((coach) => coach.id !== selectedCoach.id))
        setIsDeleteDialogOpen(false)

        // Refresh statistics and activity logs
        await fetchCoachStats()
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
      gender_id: coach.gender_id?.toString() || "1",
      bday: coach.bday,
      user_type_id: 3,
      bio: coach.bio || "",
      specialty: coach.specialty || "",
      experience: coach.experience || "",
      per_session_rate: coach.per_session_rate?.toString() || "",
      package_rate: coach.package_rate?.toString() || "",
      package_sessions: coach.package_sessions?.toString() || "",
      monthly_rate: coach.monthly_rate?.toString() || "",
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
              <p className="text-2xl font-bold">{coachStats.totalCoaches}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">{coachStats.availableCoaches}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
              <p className="text-2xl font-bold">{coachStats.averageRating}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <span className="text-green-600 text-2xl">₱</span>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Avg Per Session</p>
              <p className="text-2xl font-bold">₱{coachStats.averagePerSessionRate}</p>
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
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Coach</TableHead>
                  <TableHead className="min-w-[150px]">Contact</TableHead>
                  <TableHead className="min-w-[120px]">Specialty</TableHead>
                  <TableHead className="min-w-[100px]">Experience</TableHead>
                  <TableHead className="min-w-[100px]">Per Session</TableHead>
                  <TableHead className="min-w-[120px]">Package</TableHead>
                  <TableHead className="min-w-[120px]">Monthly Plan</TableHead>
                  <TableHead className="min-w-[80px]">Rating</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading coaches...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentCoaches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      No coaches found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentCoaches.map((coach) => (
                    <TableRow key={coach.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          {coach.image_url ? (
                            <img
                              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover flex-shrink-0"
                              src={coach.image_url || "/placeholder.svg"}
                              alt={coach.fullName}
                            />
                          ) : (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-sm sm:text-base truncate">{coach.fullName}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">{coach.total_clients} clients</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{coach.email}</div>
                          <div className="text-xs text-muted-foreground">{coach.gender}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{coach.specialty}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{coach.experience}</TableCell>
                      <TableCell className="text-sm font-medium">₱{coach.per_session_rate}</TableCell>
                      <TableCell className="text-sm">
                        {coach.package_rate && coach.package_sessions 
                          ? (
                            <div>
                              <div>₱{coach.package_rate}</div>
                              <div className="text-xs text-muted-foreground">({coach.package_sessions} sessions)</div>
                            </div>
                          )
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {coach.monthly_rate ? (
                          <div>
                            <div>₱{coach.monthly_rate}</div>
                            <div className="text-xs text-muted-foreground">(18 sessions)</div>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-1" />
                          <span className="text-sm">{coach.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={coach.is_available ? "default" : "secondary"} className="text-xs">
                          {coach.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCoach(coach)} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline ml-1">Edit</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteCoach(coach)} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline ml-1">Delete</span>
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-32">
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
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto space-y-4 pr-2">
              {getFilteredActivities().length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                getFilteredActivities().map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm break-words">{activity.activity}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
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
                <span className="font-semibold text-green-600">{coachStats.availableCoaches}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Average Rating:</span>
                <span className="font-semibold text-yellow-600">{coachStats.averageRating}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Clients:</span>
                <span className="font-semibold text-blue-600">{coachStats.totalClients}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Avg Per Session Rate:</span>
                <span className="font-semibold text-green-600">₱{coachStats.averagePerSessionRate}</span>
              </div>
              {coachStats.specialtyDistribution.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Top Specialties:</p>
                  <div className="space-y-1">
                    {coachStats.specialtyDistribution.slice(0, 3).map((specialty, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{specialty.specialty}</span>
                        <span className="font-semibold">{specialty.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Coach Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="per_session_rate">Per Session Rate (₱)*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="per_session_rate"
                    name="per_session_rate"
                    placeholder="500.00"
                    value={formData.per_session_rate}
                    onChange={handleInputChange}
                    className={validationErrors.per_session_rate ? "border-red-500" : ""}
                  />
                  {validationErrors.per_session_rate && (
                    <p className="text-sm text-red-500">{validationErrors.per_session_rate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_rate">Monthly Plan Rate (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="monthly_rate"
                    name="monthly_rate"
                    placeholder="8000.00"
                    value={formData.monthly_rate}
                    onChange={handleInputChange}
                    className={validationErrors.monthly_rate ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-gray-500">18 sessions per month</p>
                  {validationErrors.monthly_rate && (
                    <p className="text-sm text-red-500">{validationErrors.monthly_rate}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="package_rate">Package Rate (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="package_rate"
                    name="package_rate"
                    placeholder="2000.00"
                    value={formData.package_rate}
                    onChange={handleInputChange}
                    className={validationErrors.package_rate ? "border-red-500" : ""}
                  />
                  {validationErrors.package_rate && (
                    <p className="text-sm text-red-500">{validationErrors.package_rate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package_sessions">Package Sessions</Label>
                  <Input
                    type="number"
                    id="package_sessions"
                    name="package_sessions"
                    placeholder="18"
                    value={formData.package_sessions}
                    onChange={handleInputChange}
                    className={validationErrors.package_sessions ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-gray-500">Default: 18 sessions</p>
                  {validationErrors.package_sessions && (
                    <p className="text-sm text-red-500">{validationErrors.package_sessions}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Coach
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Coach Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update the coach's information in both User and Coaches tables.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCoach} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-per_session_rate">Per Session Rate (₱)*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="edit-per_session_rate"
                    name="per_session_rate"
                    placeholder="500.00"
                    value={formData.per_session_rate}
                    onChange={handleInputChange}
                    className={validationErrors.per_session_rate ? "border-red-500" : ""}
                  />
                  {validationErrors.per_session_rate && (
                    <p className="text-sm text-red-500">{validationErrors.per_session_rate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-monthly_rate">Monthly Plan Rate (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="edit-monthly_rate"
                    name="monthly_rate"
                    placeholder="8000.00"
                    value={formData.monthly_rate}
                    onChange={handleInputChange}
                    className={validationErrors.monthly_rate ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-gray-500">18 sessions per month</p>
                  {validationErrors.monthly_rate && (
                    <p className="text-sm text-red-500">{validationErrors.monthly_rate}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-package_rate">Package Rate (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="edit-package_rate"
                    name="package_rate"
                    placeholder="2000.00"
                    value={formData.package_rate}
                    onChange={handleInputChange}
                    className={validationErrors.package_rate ? "border-red-500" : ""}
                  />
                  {validationErrors.package_rate && (
                    <p className="text-sm text-red-500">{validationErrors.package_rate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-package_sessions">Package Sessions</Label>
                  <Input
                    type="number"
                    id="edit-package_sessions"
                    name="package_sessions"
                    placeholder="18"
                    value={formData.package_sessions}
                    onChange={handleInputChange}
                    className={validationErrors.package_sessions ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-gray-500">Default: 18 sessions</p>
                  {validationErrors.package_sessions && (
                    <p className="text-sm text-red-500">{validationErrors.package_sessions}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
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
