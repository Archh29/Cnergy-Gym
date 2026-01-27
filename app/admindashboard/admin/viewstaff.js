"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Search, Plus, Edit, Trash2, Loader2, Eye, EyeOff, Archive, RotateCcw, Users, Mail, Shield, CalendarDays, User, AlertTriangle, UserX, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// Use Next.js proxy in dev to avoid CORS issues
const API_BASE_URL = "/api/addstaff"

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

// Helper function to generate standard password for staff
// Format: St + First2LettersOfFirstName(lowercase) + First2LettersOfMiddleName(lowercase, optional) + #2023 + First2LettersOfLastName(lowercase)
// Examples: "John Michael Doe" -> "StjoMi#2023do", "Jane Doe" (no middle name) -> "Stja#2023do"
const generateStaffPassword = (fname, mname, lname) => {
  // Get first 2 letters of first name: both lowercase
  const first = (fname || "").trim()
  const firstNamePart = first.length > 0 
    ? (first.substring(0, 2).toLowerCase())
    : ""
  
  // Get first 2 letters of middle name ONLY if it exists: both lowercase (optional)
  const middle = (mname && mname.trim() !== "") ? mname.trim() : ""
  const middleNamePart = middle.length > 0
    ? (middle.substring(0, 2).toLowerCase())
    : ""
  
  // Get first 2 letters of last name: all lowercase
  const last = (lname || "").trim()
  const lastNamePart = last.length > 0 
    ? last.substring(0, 2).toLowerCase()
    : ""
  
  // Combine: St + FirstName2(lowercase) + MiddleName2(lowercase, if exists) + #2023 + LastName2(lowercase)
  return `St${firstNamePart}${middleNamePart}#2023${lastNamePart}`
}

const ViewStaff = () => {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [userInfoOpen, setUserInfoOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    user_type_id: 2, // Always Staff
    fname: "",
    mname: "",
    lname: "",
    bday: "",
    gender_id: 1, // Default to 1 (Male)
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [archivedStaff, setArchivedStaff] = useState([])
  const [loadingArchived, setLoadingArchived] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [staffToRestore, setStaffToRestore] = useState(null)
  const [activeTab, setActiveTab] = useState("active")

  useEffect(() => {
    fetchStaffData()
    fetchArchivedStaff() // Also fetch archived staff count on mount
  }, [])

  // Auto-generate password when name fields change (Add flow only; never during Edit)
  useEffect(() => {
    if (editOpen) return
    if (formData.fname || formData.lname) {
      const generatedPassword = generateStaffPassword(formData.fname, formData.mname, formData.lname)
      setFormData((prev) => ({
        ...prev,
        password: generatedPassword,
      }))
    }
  }, [formData.fname, formData.mname, formData.lname])

  // Ensure password is reset when Add Staff dialog opens
  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        password: "",
      }))
      setShowPassword(false)
    }
  }, [open])

  const fetchStaffData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}`)
      setStaffList(response.data.staff || [])
    } catch (error) {
      console.error("Error fetching staff data:", error)
      toast({
        title: "Error",
        description: "Failed to load staff data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchArchivedStaff = async () => {
    setLoadingArchived(true)
    try {
      const response = await axios.get(`${API_BASE_URL}?archived=1`)
      setArchivedStaff(response.data.staff || [])
    } catch (error) {
      console.error("Error fetching archived staff:", error)
      toast({
        title: "Error",
        description: "Failed to load archived staff data.",
        variant: "destructive",
      })
    } finally {
      setLoadingArchived(false)
    }
  }

  const handleRestoreClick = (staffId) => {
    setStaffToRestore(staffId)
    setRestoreConfirmOpen(true)
  }

  const handleRestoreStaff = async () => {
    if (!staffToRestore) return

    setSubmitting(true)
    try {
      const response = await axios.patch(`${API_BASE_URL}`, {
        id: staffToRestore,
        action: 'restore'
      })

      toast({
        title: "Success",
        description: "Staff member restored successfully",
      })
      setRestoreConfirmOpen(false)
      fetchStaffData()
      fetchArchivedStaff()
    } catch (error) {
      console.error("Error restoring staff:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to restore staff member",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const validateForm = (data, isEdit = false) => {
    const errors = {}

    // Name validations
    if (!data.fname.trim()) errors.fname = "First name is required"
    if (!data.lname.trim()) errors.lname = "Last name is required"

    // Email validation
    if (!data.email.trim()) {
      errors.email = "Email is required"
    } else if (!validateEmail(data.email)) {
      errors.email = "Please enter a valid email address"
    }

    // Password validation (only for new staff or when password is provided in edit)
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
    if (!data.bday) {
      errors.bday = "Date of birth is required"
    } else {
      // Validate age - must be at least 18 years old
      const today = new Date()
      const birthDate = new Date(data.bday)
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()
      
      // Calculate exact age
      let exactAge = age
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        exactAge--
      }
      
      if (exactAge < 18) {
        errors.bday = "Staff must be at least 18 years old"
      }
    }

    return errors
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleUserClick = (staff) => {
    setSelectedStaff(staff)
    setUserInfoOpen(true)
  }

  const handleEditClick = (staff) => {
    setSelectedStaff(staff)
    setFormData({
      id: staff.id,
      email: staff.email,
      password: "", // Clear password field for editing
      user_type_id: 2, // Always Staff
      fname: staff.fname,
      mname: staff.mname || "",
      lname: staff.lname,
      bday: staff.bday,
      gender_id: staff.gender_id || 1, // Include gender_id, default to 1 if not present
    })
    setValidationErrors({}) // Clear validation errors
    setEditOpen(true)
  }

  const handleDeleteClick = (staff) => {
    setStaffToDelete(staff)
    setDeleteConfirmOpen(true)
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()

    // Generate standard password from name
    // Handle middle name - convert null/undefined/empty to empty string (database doesn't allow NULL)
    // Set default gender_id (1 = Male) since gender field was removed from UI
    const generatedPassword = generateStaffPassword(formData.fname, formData.mname, formData.lname)
    const staffData = {
      ...formData,
      password: generatedPassword,
      mname: formData.mname && formData.mname.trim() !== '' ? formData.mname.trim() : '',
      gender_id: formData.gender_id || 1, // Default to 1 (Male) if not set
    }

    const errors = validateForm(staffData)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      const response = await axios.post(`${API_BASE_URL}`, staffData)

      // Format staff member's full name
      const fullName = `${formData.fname}${formData.mname ? ` ${formData.mname}` : ''} ${formData.lname}`.trim()

      // Show success toast with better formatting
      toast({
        title: "Staff Member Successfully Added",
        description: `${fullName} has been added to the system. Email: ${formData.email}. Account is ready to use.`,
      })

      setOpen(false)
      resetForm()
      fetchStaffData()
    } catch (error) {
      console.error("Error adding staff:", error)
      console.error("Error response data:", error.response?.data)
      console.error("Error response status:", error.response?.status)

      // Check if it's an email-related error
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to add staff member. Please try again."
      const isEmailError = errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("already exists")

      // Show error message in alert (simple approach)
      alert((isEmailError ? "Email Already Exists: " : "Error: ") + errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStaff = async (e) => {
    e.preventDefault()

    // Handle middle name - convert null/undefined/empty to empty string (database doesn't allow NULL)
    // Ensure gender_id is set (default to 1 if not present)
    const updateData = {
      ...formData,
      mname: formData.mname && formData.mname.trim() !== '' ? formData.mname.trim() : '',
      gender_id: formData.gender_id || 1, // Default to 1 (Male) if not set
    }

    const errors = validateForm(updateData, true)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      const response = await axios.put(`${API_BASE_URL}`, updateData)

      toast({
        title: "Success",
        description: response.data?.password_updated
          ? "Staff member updated (password updated)."
          : "Staff member updated successfully",
      })
      setEditOpen(false)
      resetForm()
      fetchStaffData()
    } catch (error) {
      console.error("Error updating staff:", error)
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
          description: error.response?.data?.message || error.response?.data?.error || "Failed to update staff member",
          variant: "destructive",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete || !staffToDelete.id) return

    setSubmitting(true)
    try {
      const response = await axios.delete(`${API_BASE_URL}`, {
        data: { id: staffToDelete.id },
      })

      toast({
        title: "Success",
        description: "Staff member archived successfully",
      })
      setDeleteConfirmOpen(false)
      setStaffToDelete(null)
      fetchStaffData()
      fetchArchivedStaff()
    } catch (error) {
      console.error("Error deleting staff:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to archive staff member",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      password: "CnergyStaff#1",
      user_type_id: 2, // Always Staff
      fname: "",
      mname: "",
      lname: "",
      bday: "",
      gender_id: 1, // Default to 1 (Male)
    })
    setValidationErrors({}) // Clear validation errors
  }

  const filteredStaff = staffList.filter((staff) => {
    const fullName = `${staff.fname} ${staff.mname || ""} ${staff.lname}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) || staff.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center text-xl font-bold text-gray-800 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                Staff List
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 ml-11">
                Manage your gym staff
              </CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 px-4 font-medium shadow-md hover:shadow-lg transition-all duration-200">
                  <Plus className="mr-2 h-4 w-4" /> Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3 pb-4 border-b">
                  <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
                    <User className="h-6 w-6 text-primary" />
                    Add New Staff
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    Enter the basic details for the new staff member account.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddStaff} className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fname" className="text-sm font-medium">First Name</Label>
                      <Input
                        id="fname"
                        name="fname"
                        placeholder="John"
                        value={formData.fname}
                        onChange={handleInputChange}
                        required
                        className={`h-11 ${validationErrors.fname ? "border-red-500" : ""}`}
                      />
                      {validationErrors.fname && <p className="text-sm text-red-500">{validationErrors.fname}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mname" className="text-sm font-medium">Middle Name (optional)</Label>
                      <Input
                        id="mname"
                        name="mname"
                        placeholder="Michael"
                        value={formData.mname || ""}
                        onChange={handleInputChange}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lname" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="lname"
                      name="lname"
                      placeholder="Doe"
                      value={formData.lname}
                      onChange={handleInputChange}
                      required
                      className={`h-11 ${validationErrors.lname ? "border-red-500" : ""}`}
                    />
                    {validationErrors.lname && <p className="text-sm text-red-500">{validationErrors.lname}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className={`h-11 ${validationErrors.email ? "border-red-500" : ""}`}
                    />
                    {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password || generateStaffPassword(formData.fname, formData.mname, formData.lname)}
                        readOnly
                        className="bg-blue-50 border-blue-200 text-blue-900 cursor-not-allowed h-11 pr-36 font-mono"
                        onFocus={(e) => e.target.blur()}
                        tabIndex={-1}
                        onChange={(e) => {
                          // Always reset to generated password if user tries to change it
                          const generatedPwd = generateStaffPassword(formData.fname, formData.mname, formData.lname)
                          setFormData({ ...formData, password: generatedPwd })
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                          Auto-set
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-transparent"
                          onClick={(e) => {
                            e.preventDefault()
                            setShowPassword(!showPassword)
                          }}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                      <p className="text-xs text-blue-800 flex items-start gap-2">
                        <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Standard password is automatically set.</strong> The default password meets all security requirements.
                        </span>
                      </p>
                    </div>
                    {validationErrors.password && (
                      <p className="text-sm text-red-500">{validationErrors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bday" className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Date of Birth
                    </Label>
                    <Input
                      type="date"
                      id="bday"
                      name="bday"
                      value={formData.bday}
                      onChange={handleInputChange}
                      required
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      className={`h-11 ${validationErrors.bday ? "border-red-500" : ""}`}
                    />
                    {validationErrors.bday && <p className="text-sm text-red-500">{validationErrors.bday}</p>}
                  </div>
                  <DialogFooter className="pt-4 border-t gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setOpen(false)}
                      className="h-11 px-6"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="h-11 px-6 bg-primary hover:bg-primary/90">
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <User className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <Tabs
            defaultValue="active"
            className="w-full"
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value)
              if (value === "active") {
                fetchStaffData()
              } else {
                fetchArchivedStaff()
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-auto grid-cols-2 h-11">
                <TabsTrigger value="active" className="font-medium px-6">
                  Active Staff
                </TabsTrigger>
                <TabsTrigger value="archived" className="font-medium px-6">
                  Archived
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
                {activeTab === "active" ? (
                  <>
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{staffList.length}</span> active staff
                    </span>
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{archivedStaff.length}</span> archived staff
                    </span>
                  </>
                )}
              </div>
            </div>

            <TabsContent value="active" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search staff..."
                  className="pl-10 h-10 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-700">Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Email</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <div className="flex flex-col justify-center items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <span className="text-sm text-muted-foreground">Loading staff data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <Users className="h-10 w-10 text-gray-400 mb-2" />
                            <p className="text-sm font-medium text-gray-700">No staff members found</p>
                            <p className="text-xs text-muted-foreground mt-1">Try a different search or add a new staff member</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((staff) => (
                        <TableRow key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <button
                              className="text-left font-medium text-gray-900 transition-colors focus:outline-none focus:underline"
                              onClick={() => handleUserClick(staff)}
                            >
                              {`${staff.fname} ${staff.mname ? staff.mname + " " : ""}${staff.lname}`}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-600">{staff.email}</TableCell>
                          <TableCell>
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" onClick={() => handleEditClick(staff)} className="h-8">
                                <Edit className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteClick(staff)} className="h-8">
                                <Archive className="mr-2 h-3.5 w-3.5" />
                                Archive
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="archived" className="space-y-4 mt-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-700">Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Email</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingArchived ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <div className="flex flex-col justify-center items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <span className="text-sm text-muted-foreground">Loading archived staff...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : archivedStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <Archive className="h-10 w-10 text-gray-400 mb-2" />
                            <p className="text-sm font-medium text-gray-700">No archived staff members</p>
                            <p className="text-xs text-muted-foreground mt-1">Archived staff will appear here</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      archivedStaff.map((staff) => (
                        <TableRow key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-medium text-gray-900">
                            {`${staff.fname} ${staff.mname ? staff.mname + " " : ""}${staff.lname}`}
                          </TableCell>
                          <TableCell className="text-gray-600">{staff.email}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button variant="outline" size="sm" onClick={() => handleRestoreClick(staff.id)} className="h-8">
                                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                Restore
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* User Info Modal */}
      <Dialog open={userInfoOpen} onOpenChange={setUserInfoOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Staff Information</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{`${selectedStaff.fname} ${selectedStaff.mname ? selectedStaff.mname + " " : ""}${selectedStaff.lname}`}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{selectedStaff.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p>{selectedStaff.bday ? new Date(selectedStaff.bday).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setUserInfoOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Edit className="h-6 w-6 text-primary" />
              Edit
            </DialogTitle>
            <DialogDescription className="text-base">
              Update the staff member's information and account details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStaff} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-fname" className="text-sm font-medium">First Name</Label>
                <Input
                  id="edit-fname"
                  name="fname"
                  placeholder="John"
                  value={formData.fname}
                  onChange={handleInputChange}
                  required
                  className={`h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${validationErrors.fname ? "border-red-500" : ""}`}
                />
                {validationErrors.fname && <p className="text-sm text-red-500">{validationErrors.fname}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mname" className="text-sm font-medium">Middle Name (optional)</Label>
                <Input
                  id="edit-mname"
                  name="mname"
                  placeholder="Michael"
                  value={formData.mname || ""}
                  onChange={handleInputChange}
                  className="h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lname" className="text-sm font-medium">Last Name</Label>
              <Input
                id="edit-lname"
                name="lname"
                placeholder="Doe"
                value={formData.lname}
                onChange={handleInputChange}
                required
                className={`h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${validationErrors.lname ? "border-red-500" : ""}`}
              />
              {validationErrors.lname && <p className="text-sm text-red-500">{validationErrors.lname}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                Email
              </Label>
              <Input
                type="email"
                id="edit-email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                className={`h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${validationErrors.email ? "border-red-500" : ""}`}
              />
              {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password" className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                New Password (leave blank to keep current)
              </Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? "text" : "password"}
                  id="edit-password"
                  name="password"
                  placeholder="********"
                  value={formData.password || ""}
                  autoComplete="new-password"
                  onChange={handleInputChange}
                  className={`h-11 pr-12 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${validationErrors.password ? "border-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2">
                <p className="text-xs text-gray-700">
                  <strong>Password Requirements:</strong> If changing password, it must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.
                </p>
              </div>
              {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bday" className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                Date of Birth
              </Label>
              <Input
                type="date"
                id="edit-bday"
                name="bday"
                value={formData.bday}
                onChange={handleInputChange}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className={`h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${validationErrors.bday ? "border-red-500" : ""}`}
              />
              {validationErrors.bday && <p className="text-sm text-red-500">{validationErrors.bday}</p>}
            </div>
            <DialogFooter className="pt-4 border-t gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditOpen(false)}
                className="h-11 px-6 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-11 px-6 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Edit className="mr-2 h-4 w-4" />
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => {
        setDeleteConfirmOpen(open)
        if (!open) {
          setStaffToDelete(null)
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Archive className="h-6 w-6 text-amber-600" />
              Archive Staff Member
            </DialogTitle>
            <DialogDescription className="text-base">
              This action is used when a staff member leaves or is terminated.
            </DialogDescription>
          </DialogHeader>
          {staffToDelete && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {staffToDelete.fname} {staffToDelete.mname ? staffToDelete.mname + " " : ""}{staffToDelete.lname}
                    </p>
                    <p className="text-sm text-gray-600 truncate flex items-center gap-1 mt-1">
                      <Mail className="h-3.5 w-3.5" />
                      {staffToDelete.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 mb-2">What happens when you archive:</p>
                    <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
                      <li>Staff member will be removed from the active staff list</li>
                      <li>Their account access will be disabled</li>
                      <li>They can be restored later if needed</li>
                      <li>All their data will be preserved</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 flex items-start gap-2">
                  <UserX className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Use this when:</strong> Staff member resigns, leaves the company, or is terminated. This keeps their records for reference while removing active access.
                  </span>
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 border-t gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setStaffToDelete(null)
              }}
              className="h-11 px-6"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStaff}
              disabled={submitting}
              className="h-11 px-6 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Restore</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to restore this staff member? They will be visible in the active staff list again.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestoreStaff} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ViewStaff
