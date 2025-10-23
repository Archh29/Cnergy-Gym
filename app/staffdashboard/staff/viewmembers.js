"use client"

import { useState, useEffect } from "react"
import { formatDateToISO, safeDate } from "@/lib/dateUtils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Search,
  Plus,
  Edit,
  User,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Ban,
} from "lucide-react"

const memberSchema = z.object({
  fname: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  mname: z.string().min(1, "Middle name is required").max(50, "Middle name must be less than 50 characters"),
  lname: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  gender_id: z.string().min(1, "Gender is required"),
  bday: z.string().min(1, "Date of birth is required"),
  user_type_id: z.coerce.number().default(4),
  account_status: z.enum(["pending", "approved", "rejected", "deactivated"]).default("approved"),
})

const editMemberSchema = z.object({
  fname: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  mname: z.string().min(1, "Middle name is required").max(50, "Middle name must be less than 50 characters"),
  lname: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      return val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*(),.?":{}|<>]/.test(val)
    }, "Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character"),
  gender_id: z.string().min(1, "Gender is required"),
  bday: z.string().min(1, "Date of birth is required").refine((val) => {
    if (!val || val === "" || val === "0000-00-00") return false
    const date = new Date(val)
    return !isNaN(date.getTime()) && date.getFullYear() > 1900
  }, "Please enter a valid date of birth"),
  user_type_id: z.coerce.number().default(4),
  account_status: z.enum(["pending", "approved", "rejected", "deactivated"]).default("approved"),
})

const ViewMembers = ({ userId }) => {
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [monthFilter, setMonthFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [currentView, setCurrentView] = useState("active") // "active" or "archive"
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 5
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      gender_id: "",
      bday: "",
      user_type_id: 4,
      account_status: "approved",
    },
  })

  const editForm = useForm({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      gender_id: "",
      bday: "",
      user_type_id: 4,
      account_status: "pending",
    },
  })

  // Gender mapping
  const genderOptions = [
    { id: "1", name: "Male" },
    { id: "2", name: "Female" },
  ]

  // Account status options
  const statusOptions = [
    { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    { value: "approved", label: "Approved", color: "bg-green-100 text-green-800" },
    { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
    { value: "deactivated", label: "Deactivated", color: "bg-gray-100 text-gray-800" },
  ]

  const validateEmail = async (email, excludeId = null) => {
    try {
      const response = await fetch("https://api.cnergy.site/member_management.php")
      const existingMembers = await response.json()
      const emailExists = existingMembers.some(
        (member) => member.email.toLowerCase() === email.toLowerCase() && (excludeId ? member.id !== excludeId : true),
      )
      return !emailExists
    } catch (error) {
      console.error("Error validating email:", error)
      return true // Allow if validation fails
    }
  }

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("https://api.cnergy.site/member_management.php")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setMembers(Array.isArray(data) ? data : [])
        setFilteredMembers(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Error fetching members:", error)
        toast({
          title: "Error",
          description: "Failed to fetch members. Please check your connection and try again.",
          variant: "destructive",
        })
        setMembers([])
        setFilteredMembers([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchMembers()
  }, [toast])

  useEffect(() => {
    let filtered = members

    console.log("Filtering members - currentView:", currentView)
    console.log("All members before filtering:", members.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))

    // Filter by current view (active vs archive)
    if (currentView === "active") {
      filtered = filtered.filter((member) => member.account_status !== "deactivated")
      console.log("Active members after filtering:", filtered.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))
    } else if (currentView === "archive") {
      filtered = filtered.filter((member) => member.account_status === "deactivated")
      console.log("Archived members after filtering:", filtered.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowercaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (member) =>
          `${member.fname} ${member.lname}`.toLowerCase().includes(lowercaseQuery) ||
          member.email?.toLowerCase().includes(lowercaseQuery),
      )
    }

    // Filter by status (only apply if not using archive view)
    if (statusFilter !== "all" && currentView === "active") {
      filtered = filtered.filter((member) => member.account_status === statusFilter)
    }

    // Filter by month/year
    if (monthFilter && monthFilter !== "all" && yearFilter && yearFilter !== "all") {
      filtered = filtered.filter((member) => {
        if (!member.created_at) return false
        const createdDate = safeDate(member.created_at)
        if (!createdDate) return false

        const memberMonth = createdDate.getMonth() + 1 // getMonth() returns 0-11
        const memberYear = createdDate.getFullYear()

        return memberMonth === parseInt(monthFilter) && memberYear === parseInt(yearFilter)
      })
    } else if (monthFilter && monthFilter !== "all") {
      // Filter by month only
      filtered = filtered.filter((member) => {
        if (!member.created_at) return false
        const createdDate = safeDate(member.created_at)
        if (!createdDate) return false

        const memberMonth = createdDate.getMonth() + 1
        return memberMonth === parseInt(monthFilter)
      })
    } else if (yearFilter && yearFilter !== "all") {
      // Filter by year only
      filtered = filtered.filter((member) => {
        if (!member.created_at) return false
        const createdDate = safeDate(member.created_at)
        if (!createdDate) return false

        const memberYear = createdDate.getFullYear()
        return memberYear === parseInt(yearFilter)
      })
    }

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (b.id || 0) - (a.id || 0) // Higher ID first (newest)
        case "oldest":
          return (a.id || 0) - (b.id || 0) // Lower ID first (oldest)
        case "name_asc":
          return `${a.fname} ${a.lname}`.localeCompare(`${b.fname} ${b.lname}`) // A-Z
        case "name_desc":
          return `${b.fname} ${b.lname}`.localeCompare(`${a.fname} ${a.lname}`) // Z-A
        case "email_asc":
          return (a.email || "").localeCompare(b.email || "") // A-Z
        case "email_desc":
          return (b.email || "").localeCompare(a.email || "") // Z-A
        default:
          return (b.id || 0) - (a.id || 0) // Default to newest
      }
    })

    setFilteredMembers(filtered)
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortBy, monthFilter, yearFilter, members, currentView])

  const indexOfLastMember = currentPage * membersPerPage
  const indexOfFirstMember = indexOfLastMember - membersPerPage
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember)
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage)

  const getGenderName = (genderId) => {
    const gender = genderOptions.find((g) => g.id === genderId?.toString())
    return gender ? gender.name : "Unknown"
  }

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find((s) => s.value === status)
    if (!statusOption) return <Badge variant="outline">Unknown</Badge>

    return (
      <Badge className={statusOption.color} variant="outline">
        {status === "pending" && <Clock className="w-3 h-3 mr-1" />}
        {status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
        {status === "deactivated" && <Ban className="w-3 h-3 mr-1" />}
        {statusOption.label}
      </Badge>
    )
  }

  const isNewMember = (member) => {
    if (!member.created_at) return false
    const createdDate = safeDate(member.created_at)
    if (!createdDate) return false
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return createdDate > sevenDaysAgo
  }

  const handleViewMember = (member) => {
    setSelectedMember(member)
    setIsViewDialogOpen(true)
  }

  const handleEditMember = (member) => {
    setSelectedMember(member)

    // Handle invalid dates properly
    let safeBday = ""
    if (member.bday && member.bday !== "0000-00-00") {
      const date = safeDate(member.bday)
      if (date) {
        safeBday = formatDateToISO(date)
      }
    }

    editForm.reset({
      fname: member.fname || "",
      mname: member.mname || "",
      lname: member.lname || "",
      email: member.email || "",
      password: "",
      gender_id: member.gender_id?.toString() || "",
      bday: safeBday,
      user_type_id: member.user_type_id || 4,
      account_status: member.account_status || "approved",
    })
    setIsEditDialogOpen(true)
  }


  const handleVerifyMember = (member) => {
    setSelectedMember(member)
    setIsVerificationDialogOpen(true)
  }

  const handleUpdateAccountStatus = async (status) => {
    if (!selectedMember) return
    setIsLoading(true)

    try {
      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMember.id,
          account_status: status,
          staff_id: userId,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        // Refresh the members list
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        setIsVerificationDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Success",
          description: `Account ${status} successfully!`,
        })
      } else {
        throw new Error(result.message || "Failed to update account status")
      }
    } catch (error) {
      console.error("Error updating account status:", error)
      toast({
        title: "Error",
        description: "Failed to update account status. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleAddMember = async (data) => {
    setIsLoading(true)
    try {
      // Remove client-side email validation - let backend handle it
      console.log("Creating member with data:", data)

      const formattedData = {
        fname: data.fname.trim(),
        mname: data.mname.trim(),
        lname: data.lname.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        gender_id: Number.parseInt(data.gender_id),
        bday: data.bday,
        user_type_id: data.user_type_id,
        account_status: data.account_status,
        failed_attempt: 0,
        staff_id: userId,
      }

      console.log("Sending request to backend with data:", formattedData)

      const response = await fetch("https://api.cnergy.site/member_management.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      const result = await response.json()
      console.log("Response result:", result)

      if (response.ok) {
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setFilteredMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setIsAddDialogOpen(false)
        form.reset()
        toast({
          title: "Success",
          description: "Member added successfully!",
        })
      } else {
        // Prioritize the detailed message over the generic error
        throw new Error(result.message || result.error || "Failed to add member")
      }
    } catch (error) {
      console.error("Error adding member:", error)
      console.error("Error message:", error.message)
      console.error("Full error object:", error)

      // Check if it's an email-related error
      const errorMessage = error.message || "Failed to add member. Please try again."
      const isEmailError = errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("already exists")

      // Show error message in alert (simple approach)
      alert((isEmailError ? "Email Already Exists: " : "Error: ") + errorMessage)
    }
    setIsLoading(false)
  }

  const handleUpdateMember = async (data) => {
    console.log("handleUpdateMember called with data:", data)
    console.log("selectedMember:", selectedMember)

    if (!selectedMember) {
      console.error("No selected member")
      return
    }

    setIsLoading(true)
    try {
      if (data.email.toLowerCase() !== selectedMember.email.toLowerCase()) {
        const isEmailValid = await validateEmail(data.email, selectedMember.id)
        if (!isEmailValid) {
          toast({
            title: "Error",
            description: "Email address already exists. Please use a different email.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }

      const updateData = {
        id: selectedMember.id,
        fname: data.fname.trim(),
        mname: data.mname.trim(),
        lname: data.lname.trim(),
        email: data.email.trim().toLowerCase(),
        gender_id: Number.parseInt(data.gender_id),
        bday: data.bday,
        user_type_id: data.user_type_id,
        account_status: data.account_status,
        staff_id: userId,
      }

      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password
      }

      console.log("Sending update request with data:", updateData)

      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      console.log("Update response status:", response.status)
      const result = await response.json()
      console.log("Update response result:", result)

      if (response.ok) {
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setFilteredMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setIsEditDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Success",
          description: "Member updated successfully!",
        })
      } else {
        throw new Error(result.error || result.message || "Failed to update member")
      }
    } catch (error) {
      console.error("Error updating member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update member. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
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
      user_type_id: 4,
      account_status: "approved",
    })
    setShowPassword(false)
    setIsAddDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{members.length}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {members.filter((m) => m.account_status === "pending").length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {members.filter((m) => m.account_status === "approved").length}
              </div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {members.filter((m) => m.account_status === "rejected").length}
              </div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {members.filter((m) => m.account_status === "deactivated").length}
              </div>
              <div className="text-sm text-muted-foreground">Deactivated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                User Account Management
              </CardTitle>
              <CardDescription>Manage and verify user accounts</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOpenAddDialog}>
                <Plus className="mr-2 h-4 w-4" /> Add User
              </Button>
              <Button
                variant={currentView === "archive" ? "default" : "outline"}
                onClick={() => setCurrentView(currentView === "active" ? "archive" : "active")}
              >
                {currentView === "active" ? "Archive" : "Active Users"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search members by name or email..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="1">January</SelectItem>
                <SelectItem value="2">February</SelectItem>
                <SelectItem value="3">March</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">May</SelectItem>
                <SelectItem value="6">June</SelectItem>
                <SelectItem value="7">July</SelectItem>
                <SelectItem value="8">August</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
                <SelectItem value="2020">2020</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="email_asc">Email A-Z</SelectItem>
                <SelectItem value="email_desc">Email Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : currentMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found. Try a different search or add a new member.
            </div>
          ) : (
            <div className="space-y-2">
              {currentMembers.map((member, index) => (
                <div
                  key={member.id || `member-${index}`}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors"
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-0 h-auto"
                    onClick={() => handleViewMember(member)}
                  >
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="text-left">
                        <div className="font-medium">
                          {member.fname} {member.mname} {member.lname}
                        </div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                        {member.created_at && (
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(member.created_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2">
                    {isNewMember(member) && (
                      <Badge className="bg-green-100 text-green-800" variant="outline">
                        NEW
                      </Badge>
                    )}
                    {getStatusBadge(member.account_status)}
                    <Badge variant="outline">{getGenderName(member.gender_id)}</Badge>
                    {member.account_status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVerifyMember(member)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && filteredMembers.length > membersPerPage && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {indexOfFirstMember + 1}-{Math.min(indexOfLastMember, filteredMembers.length)} of{" "}
                {filteredMembers.length}
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

      {/* Account Verification Dialog */}
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Account Verification
            </DialogTitle>
            <DialogDescription>Review and verify this member's account to allow mobile app access.</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {selectedMember.fname} {selectedMember.mname} {selectedMember.lname}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Gender:</span> {getGenderName(selectedMember.gender_id)}
                  </div>
                  <div>
                    <span className="font-medium">Birthday:</span>{" "}
                    {selectedMember.bday ? new Date(selectedMember.bday).toLocaleDateString() : "N/A"}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Current Status:</span> {getStatusBadge(selectedMember.account_status)}
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Approving this account will allow the user to access the mobile application.
                  Rejecting will prevent access until manually approved.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsVerificationDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleUpdateAccountStatus("rejected")} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button onClick={() => handleUpdateAccountStatus("approved")} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Member Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p>
                    {selectedMember.fname} {selectedMember.mname} {selectedMember.lname}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p>{selectedMember.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Gender</p>
                  <p>{getGenderName(selectedMember.gender_id)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Date of Birth</p>
                  <p>{selectedMember.bday ? new Date(selectedMember.bday).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Account Status</p>
                  <div className="mt-1">{getStatusBadge(selectedMember.account_status)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                if (selectedMember) handleEditMember(selectedMember)
              }}
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>Enter the basic details for the new member.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddMember)} className="space-y-4">
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
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="********" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character
                    </div>
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
              <FormField
                control={form.control}
                name="account_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  Add Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update the member's information and account status.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateMember, (errors) => {
              console.log("Form validation errors:", errors)
              console.log("Form values:", editForm.getValues())
            })} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (leave blank to keep current)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showEditPassword ? "text" : "password"} placeholder="********" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      If changing password: must be at least 8 characters with 1 uppercase letter, 1 number, and 1
                      special character
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
              <FormField
                control={editForm.control}
                name="account_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={isLoading} onClick={async () => {
                  console.log("Update button clicked - manual submission")
                  console.log("Form is valid:", editForm.formState.isValid)
                  console.log("Form errors:", JSON.stringify(editForm.formState.errors, null, 2))
                  console.log("Form values:", JSON.stringify(editForm.getValues(), null, 2))

                  // Try manual form submission
                  const isValid = await editForm.trigger()
                  console.log("Form validation result:", isValid)

                  if (isValid) {
                    const formData = editForm.getValues()
                    console.log("Submitting form data:", formData)
                    await handleUpdateMember(formData)
                  } else {
                    console.log("Form validation failed, errors:", JSON.stringify(editForm.formState.errors, null, 2))
                    // Show user-friendly error message
                    toast({
                      title: "Validation Error",
                      description: "Please check all fields and try again. Check console for details.",
                      variant: "destructive",
                    })
                  }
                }}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default ViewMembers
