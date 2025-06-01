"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Bell, CheckCircle, XCircle, Clock, Star, MapPin, Phone, Mail, Award } from "lucide-react"

const CoachAssignments = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [requestDetailOpen, setRequestDetailOpen] = useState(false)

  // Pending connection requests from mobile app
  const [pendingRequests, setPendingRequests] = useState([
    {
      id: 1,
      member: {
        name: "Sarah Wilson",
        email: "sarah.wilson@email.com",
        phone: "+1 (555) 123-4567",
        age: 28,
        goals: "Weight loss and strength training",
        experience: "Beginner",
        location: "New York, NY",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      coach: {
        name: "Mike Rodriguez",
        email: "mike.rodriguez@email.com",
        phone: "+1 (555) 987-6543",
        specialties: ["Weight Loss", "Strength Training", "Nutrition"],
        experience: "5 years",
        rating: 4.8,
        certifications: ["NASM-CPT", "Nutrition Specialist"],
        location: "New York, NY",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      requestedAt: "2024-01-15T10:30:00Z",
      status: "pending",
    },
    {
      id: 2,
      member: {
        name: "David Chen",
        email: "david.chen@email.com",
        phone: "+1 (555) 234-5678",
        age: 35,
        goals: "Marathon training and endurance",
        experience: "Intermediate",
        location: "Los Angeles, CA",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      coach: {
        name: "Lisa Thompson",
        email: "lisa.thompson@email.com",
        phone: "+1 (555) 876-5432",
        specialties: ["Endurance Training", "Running", "Sports Performance"],
        experience: "8 years",
        rating: 4.9,
        certifications: ["USATF Level 2", "Sports Performance"],
        location: "Los Angeles, CA",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      requestedAt: "2024-01-15T14:20:00Z",
      status: "pending",
    },
  ])

  // Assigned members
  const [assignedMembers, setAssignedMembers] = useState([
    {
      id: 3,
      name: "John Doe",
      coach: "Coach Martinez",
      assignedAt: "2024-01-10T09:00:00Z",
      status: "active",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 4,
      name: "Jane Smith",
      coach: "Coach Johnson",
      assignedAt: "2024-01-12T11:30:00Z",
      status: "active",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ])

  const handleApproveRequest = (requestId) => {
    const request = pendingRequests.find((r) => r.id === requestId)
    if (request) {
      // Add to assigned members
      const newAssignment = {
        id: Date.now(),
        name: request.member.name,
        coach: request.coach.name,
        assignedAt: new Date().toISOString(),
        status: "active",
        avatar: request.member.avatar,
      }

      setAssignedMembers((prev) => [...prev, newAssignment])

      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId))

      setRequestDetailOpen(false)
    }
  }

  const handleDeclineRequest = (requestId) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId))
    setRequestDetailOpen(false)
  }

  const openRequestDetail = (request) => {
    setSelectedRequest(request)
    setRequestDetailOpen(true)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredRequests = pendingRequests.filter(
    (request) =>
      request.member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.coach.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredMembers = assignedMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.coach.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Notification Alert */}
      {pendingRequests.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Bell className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            You have {pendingRequests.length} pending coach assignment request{pendingRequests.length > 1 ? "s" : ""}{" "}
            waiting for approval.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Coach Assignment Management
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingRequests.length} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Manage coach-member connections from mobile app requests</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative w-full max-w-md mb-6">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search members or coaches..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="assigned" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Assigned Members
                <Badge variant="secondary" className="ml-1">
                  {assignedMembers.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Pending Requests Tab */}
            <TabsContent value="pending" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Requested Coach</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {pendingRequests.length === 0 ? "No pending requests" : "No requests match your search"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={request.member.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {request.member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{request.member.name}</div>
                              <div className="text-sm text-muted-foreground">{request.member.experience}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={request.coach.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {request.coach.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{request.coach.name}</div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {request.coach.rating}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(request.requestedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => openRequestDetail(request)} variant="outline">
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeclineRequest(request.id)}>
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Assigned Members Tab */}
            <TabsContent value="assigned" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Assigned Coach</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {assignedMembers.length === 0 ? "No assigned members" : "No members match your search"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium">{member.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{member.coach}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(member.assignedAt)}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {member.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Detail Dialog */}
      <Dialog open={requestDetailOpen} onOpenChange={setRequestDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connection Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Member Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Member Information</h3>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedRequest.member.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="text-lg">
                      {selectedRequest.member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-xl font-semibold">{selectedRequest.member.name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.member.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.member.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.member.location}
                      </div>
                      <div>
                        <span className="font-medium">Age:</span> {selectedRequest.member.age}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium">Experience:</span> {selectedRequest.member.experience}
                      </div>
                      <div>
                        <span className="font-medium">Goals:</span> {selectedRequest.member.goals}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coach Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Requested Coach</h3>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedRequest.coach.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="text-lg">
                      {selectedRequest.coach.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-semibold">{selectedRequest.coach.name}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{selectedRequest.coach.rating}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.coach.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.coach.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {selectedRequest.coach.location}
                      </div>
                      <div>
                        <span className="font-medium">Experience:</span> {selectedRequest.coach.experience}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Specialties:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedRequest.coach.specialties.map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Certifications:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedRequest.coach.certifications.map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Request Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Request submitted:</span> {formatDate(selectedRequest.requestedAt)}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestDetailOpen(false)}>
              Close
            </Button>
            <Button variant="destructive" onClick={() => handleDeclineRequest(selectedRequest?.id)}>
              <XCircle className="h-4 w-4 mr-2" />
              Decline Request
            </Button>
            <Button
              onClick={() => handleApproveRequest(selectedRequest?.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CoachAssignments
