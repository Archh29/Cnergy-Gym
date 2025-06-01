"use client"

import { useState, useEffect } from "react"
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
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react"

// Updated schema to match User table structure
const memberFormSchema = z.object({
  fname: z.string().min(2, { message: "First name must be at least 2 characters." }),
  mname: z.string().min(1, { message: "Middle name is required." }),
  lname: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  gender_id: z.string().min(1, { message: "Please select a gender." }),
  bday: z.string().min(1, { message: "Date of birth is required." }),
  user_type_id: z.number().default(3), // Assuming 3 is for members
})

const ViewMembers = () => {
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 5

  const { toast } = useToast()

  // Form with database-aligned default values
  const form = useForm({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      gender_id: "",
      bday: "",
      user_type_id: 4, // Default to member type
    },
  })

  // Gender mapping (adjust IDs based on your Gender table)
  const genderOptions = [
    { id: "1", name: "Male" },
    { id: "2", name: "Female" },
    { id: "3", name: "Other" },
  ]

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("http://localhost/cynergy/member_management.php")
        const data = await response.json()
        setMembers(data)
        setFilteredMembers(data)
      } catch (error) {
        console.error("Error fetching members:", error)
        toast({
          title: "Error",
          description: "Failed to fetch members. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [toast])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members)
    } else {
      const lowercaseQuery = searchQuery.toLowerCase()
      const filtered = members.filter(
        (member) =>
          `${member.fname} ${member.lname}`.toLowerCase().includes(lowercaseQuery) ||
          member.email?.toLowerCase().includes(lowercaseQuery),
      )
      setFilteredMembers(filtered)
    }
    setCurrentPage(1)
  }, [searchQuery, members])

  const indexOfLastMember = currentPage * membersPerPage
  const indexOfFirstMember = indexOfLastMember - membersPerPage
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember)
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage)

  const getGenderName = (genderId) => {
    const gender = genderOptions.find((g) => g.id === genderId?.toString())
    return gender ? gender.name : "Unknown"
  }

  const handleViewMember = (member) => {
    setSelectedMember(member)
    setIsViewDialogOpen(true)
  }

  const handleEditMember = (member) => {
    setSelectedMember(member)
    form.reset({
      fname: member.fname || "",
      mname: member.mname || "",
      lname: member.lname || "",
      email: member.email || "",
      password: "", // Don't populate password for security
      gender_id: member.gender_id?.toString() || "",
      bday: member.bday ? new Date(member.bday).toISOString().split("T")[0] : "",
      user_type_id: member.user_type_id || 3,
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteMember = (member) => {
    setSelectedMember(member)
    setIsDeleteDialogOpen(true)
  }

  const handleAddMember = async (data) => {
    setIsLoading(true)
    try {
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

      const response = await fetch("http://localhost/cynergy/member_management.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh the members list
        const getResponse = await fetch("http://localhost/cynergy/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)

        setIsAddDialogOpen(false)
        form.reset()
        toast({
          title: "Success",
          description: "Member added successfully!",
        })
      } else {
        throw new Error(result.message || "Failed to add member")
      }
    } catch (error) {
      console.error("Error adding member:", error)
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleUpdateMember = async (data) => {
    if (!selectedMember) return

    setIsLoading(true)
    try {
      const updateData = {
        id: selectedMember.id, // User ID
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

      const response = await fetch(`http://localhost/cynergy/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh the members list
        const getResponse = await fetch("http://localhost/cynergy/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)

        setIsEditDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Success",
          description: "Member updated successfully!",
        })
      } else {
        throw new Error(result.message || "Failed to update member")
      }
    } catch (error) {
      console.error("Error updating member:", error)
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleConfirmDelete = async () => {
    if (!selectedMember) return

    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost/cynergy/member_management.php?id=${selectedMember.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: selectedMember.id }),
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh the members list
        const getResponse = await fetch("http://localhost/cynergy/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)

        setIsDeleteDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Success",
          description: "Member deleted successfully!",
        })
      } else {
        throw new Error(result.message || "Failed to delete member")
      }
    } catch (error) {
      console.error("Error deleting member:", error)
      toast({
        title: "Error",
        description: "Failed to delete member. Please try again.",
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
      user_type_id: 3,
    })
    setIsAddDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Member List</CardTitle>
              <CardDescription>Manage your gym members</CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search members by name or email..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
                      </div>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getGenderName(member.gender_id)}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(member)}>
                      <Trash2 className="h-4 w-4" />
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

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Member Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{members.length}</div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{members.filter((m) => m.gender_id === 1).length}</div>
              <div className="text-sm text-muted-foreground">Male</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">{members.filter((m) => m.gender_id === 2).length}</div>
              <div className="text-sm text-muted-foreground">Female</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  members.filter((m) => {
                    if (!m.bday) return false
                    const today = new Date()
                    const birthDate = new Date(m.bday)
                    const age = today.getFullYear() - birthDate.getFullYear()
                    return age >= 18 && age <= 30
                  }).length
                }
              </div>
              <div className="text-sm text-muted-foreground">18-30 Years</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <DialogContent className="sm:max-w-md">
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
                  Add Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update the member's basic information.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateMember)} className="space-y-4">
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
                  Update Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this member? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="border rounded-md p-4 mb-4">
              <p className="font-medium">
                {selectedMember.fname} {selectedMember.mname} {selectedMember.lname}
              </p>
              <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
              <div className="mt-2">
                <Badge variant="outline">{getGenderName(selectedMember.gender_id)}</Badge>
              </div>
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

export default ViewMembers
