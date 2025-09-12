"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { PlusCircle, Edit, Trash2 } from "lucide-react"

const API_URL = "https://api.cnergy.site/announcement.php"

const Announcement = () => {
  const [announcements, setAnnouncements] = useState([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    priority: "medium",
    status: "active",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(API_URL)
      setAnnouncements(response.data.announcements)
    } catch (error) {
      console.error("Error fetching announcements:", error)
      toast({
        title: "Error",
        description: "Failed to fetch announcements. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAnnouncement = async () => {
    try {
      await axios.post(API_URL, newAnnouncement)
      await fetchAnnouncements()
      setIsAddDialogOpen(false)
      setNewAnnouncement({ title: "", content: "", priority: "medium", status: "active" })
      toast({
        title: "Announcement Added",
        description: "Your new announcement has been successfully added.",
      })
    } catch (error) {
      console.error("Error adding announcement:", error)
      toast({
        title: "Error",
        description: "Failed to add announcement. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditAnnouncement = async () => {
    try {
      await axios.put(API_URL, selectedAnnouncement)
      await fetchAnnouncements()
      setIsEditDialogOpen(false)
      toast({
        title: "Announcement Updated",
        description: "Your announcement has been successfully updated.",
      })
    } catch (error) {
      console.error("Error updating announcement:", error)
      toast({
        title: "Error",
        description: "Failed to update announcement. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    try {
      await axios.delete(API_URL, { data: { id } })
      await fetchAnnouncements()
      toast({
        title: "Announcement Deleted",
        description: "The announcement has been successfully deleted.",
        variant: "destructive",
      })
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast({
        title: "Error",
        description: "Failed to delete announcement. Please try again.",
        variant: "destructive",
      })
    }
  }

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  }

  const statusColors = {
    active: "bg-blue-100 text-blue-800",
    scheduled: "bg-purple-100 text-purple-800",
    archived: "bg-gray-100 text-gray-800",
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Announcements</CardTitle>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Announcement
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          {["all", "active", "scheduled", "archived"].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue}>
              <ScrollArea className="h-[400px]">
                {announcements
                  .filter((a) => tabValue === "all" || a.status === tabValue)
                  .map((announcement) => (
                    <Card key={announcement.id} className="mb-4 last:mb-0">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{announcement.title}</CardTitle>
                          <div className="flex space-x-2">
                            <Badge className={priorityColors[announcement.priority]}>{announcement.priority}</Badge>
                            <Badge className={statusColors[announcement.status]}>{announcement.status}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Posted on: {new Date(announcement.date_posted).toLocaleDateString()}
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAnnouncement(announcement)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Add Announcement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Announcement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">
                Content
              </Label>
              <Textarea
                id="content"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <select
                id="priority"
                value={newAnnouncement.priority}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
                className="col-span-3"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <select
                id="status"
                value={newAnnouncement.status}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, status: e.target.value })}
                className="col-span-3"
              >
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddAnnouncement}>
              Add Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                Title
              </Label>
              <Input
                id="edit-title"
                value={selectedAnnouncement?.title || ""}
                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-content" className="text-right">
                Content
              </Label>
              <Textarea
                id="edit-content"
                value={selectedAnnouncement?.content || ""}
                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, content: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-priority" className="text-right">
                Priority
              </Label>
              <select
                id="edit-priority"
                value={selectedAnnouncement?.priority || ""}
                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, priority: e.target.value })}
                className="col-span-3"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Status
              </Label>
              <select
                id="edit-status"
                value={selectedAnnouncement?.status || ""}
                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, status: e.target.value })}
                className="col-span-3"
              >
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleEditAnnouncement}>
              Update Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default Announcement

