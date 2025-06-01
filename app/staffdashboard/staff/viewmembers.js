import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Search, Plus, Edit, Trash2, User, Phone, Mail, Calendar, Dumbbell, ChevronLeft, ChevronRight, Loader2, Shield } from 'lucide-react';

const memberFormSchema = z.object({
  fname: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lname: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone_no: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  status: z.enum(["active", "inactive", "deactive"], {
    required_error: "Please select a status.",
  }),
});

const ViewMembers = () => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 5;

  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      fname: "",
      lname: "",
      email: "",
      phone_no: "",
      status: "active",
    },
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('http://localhost/cynergy/member_management.php');
        const data = await response.json();
        setMembers(data);
        setFilteredMembers(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching members:", error);
        toast({
          title: "Error",
          description: "Failed to fetch members. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [toast]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(
        (member) =>
          member.fname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.lname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.phone_no.includes(searchQuery),
      );
      setFilteredMembers(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, members]);

  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember);
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "inactive":
        return <Badge className="bg-yellow-500">Inactive</Badge>;
      case "deactive":
        return <Badge className="bg-red-500">Deactivated</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  const handleViewMember = (member) => {
    setSelectedMember(member);
    setIsViewDialogOpen(true);
  };

  const handleEditMember = (member) => {
    setSelectedMember(member);
    form.reset({
      fname: member.fname,
      lname: member.lname,
      email: member.email,
      phone_no: member.phone_no,
      status: member.status || "active",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteMember = (member) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  const handleAddMember = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost/cynergy/member_management.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        setMembers([...members, result]);
        setIsAddDialogOpen(false);
        form.reset();
        toast({
          title: "Success",
          description: "Member added successfully!",
        });
      } else {
        throw new Error(result.message || 'Failed to add member');
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleUpdateMember = async (data) => {
    if (!selectedMember) return;

    setIsLoading(true);
    try {
      const updateData = {
        ...data,
        id_user: selectedMember.id_user,
      };
      
      const response = await fetch(`http://localhost/cynergy/member_management.php?id=${selectedMember.id_user}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      const result = await response.json();
      if (response.ok) {
        const updatedMembers = members.map((member) =>
          member.id_user === selectedMember.id_user ? { ...member, ...data } : member,
        );
        setMembers(updatedMembers);
        setIsEditDialogOpen(false);
        setSelectedMember(null);
        toast({
          title: "Success",
          description: "Member updated successfully!",
        });
      } else {
        throw new Error(result.message || 'Failed to update member');
      }
    } catch (error) {
      console.error("Error updating member:", error);
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMember) return;

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost/cynergy/member_management.php?id=${selectedMember.id_user}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_user: selectedMember.id_user }),
      });
      const result = await response.json();
      if (response.ok) {
        const updatedMembers = members.filter((member) => member.id_user !== selectedMember.id_user);
        setMembers(updatedMembers);
        setIsDeleteDialogOpen(false);
        setSelectedMember(null);
        toast({
          title: "Success",
          description: "Member deleted successfully!",
        });
      } else {
        throw new Error(result.message || 'Failed to delete member');
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "Error",
        description: "Failed to delete member. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleOpenAddDialog = () => {
    form.reset({
      fname: "",
      lname: "",
      email: "",
      phone_no: "",
      status: "active",
    });
    setIsAddDialogOpen(true);
  };

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
              placeholder="Search members..."
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
                  key={member.id_user || `member-${index}`}
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
                        <div className="font-medium">{member.fname} {member.lname}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(member.status)}
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
                  <p className="text-sm font-medium">Name</p>
                  <p>{selectedMember.fname} {selectedMember.lname}</p>
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
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p>{selectedMember.phone_no}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div>{getStatusBadge(selectedMember.status)}</div>
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
                setIsViewDialogOpen(false);
                if (selectedMember) handleEditMember(selectedMember);
              }}
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>Enter the details of the new gym member.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddMember)} className="space-y-4">
              <FormField
                control={form.control}
                name="fname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
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
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="deactive">Deactivated</SelectItem>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update the details of the gym member.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateMember)} className="space-y-4">
              <FormField
                control={form.control}
                name="fname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
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
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="deactive">Deactivated</SelectItem>
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
              <p className="font-medium">{selectedMember.fname} {selectedMember.lname}</p>
              <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
              <div className="mt-2">{getStatusBadge(selectedMember.status)}</div>
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
  );
};

export default ViewMembers;
