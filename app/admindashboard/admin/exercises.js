"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Edit, Trash2, Loader2, X, Play, ImageIcon, Dumbbell, Target, ChevronLeft, ChevronRight } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const ExerciseMuscleManager = () => {
  // Common states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  // Exercise states
  const [exercises, setExercises] = useState([])
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("")
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [exerciseName, setExerciseName] = useState("")
  const [exerciseDescription, setExerciseDescription] = useState("")
  const [exerciseInstructions, setExerciseInstructions] = useState("")
  const [exerciseBenefits, setExerciseBenefits] = useState("")
  const [selectedMuscles, setSelectedMuscles] = useState([])
  const [exerciseImageFile, setExerciseImageFile] = useState(null)
  const [exerciseVideoFile, setExerciseVideoFile] = useState(null)
  const [exerciseImagePreview, setExerciseImagePreview] = useState("")
  const [exerciseVideoPreview, setExerciseVideoPreview] = useState("")

  // Muscle states
  const [muscles, setMuscles] = useState([])
  const [muscleSearchQuery, setMuscleSearchQuery] = useState("")
  const [muscleDialogOpen, setMuscleDialogOpen] = useState(false)
  const [selectedMuscle, setSelectedMuscle] = useState(null)
  const [muscleName, setMuscleName] = useState("")
  const [parentMuscleId, setParentMuscleId] = useState("")
  const [muscleImageFile, setMuscleImageFile] = useState(null)
  const [muscleImagePreview, setMuscleImagePreview] = useState("")

  const [muscleGroups, setMuscleGroups] = useState([])
  const [muscleParts, setMuscleParts] = useState([])
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("")
  const [musclePartSearchQuery, setMusclePartSearchQuery] = useState("")
  const [musclePartDialogOpen, setMusclePartDialogOpen] = useState(false)
  const [selectedMusclePart, setSelectedMusclePart] = useState(null)
  const [musclePartName, setMusclePartName] = useState("")
  const [musclePartParentId, setMusclePartParentId] = useState("")
  const [musclePartImageFile, setMusclePartImageFile] = useState(null)
  const [musclePartImagePreview, setMusclePartImagePreview] = useState("")

  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([])
  const [muscleTargetSearchQuery, setMuscleTargetSearchQuery] = useState("")

  // Exercise filter states
  const [selectedExerciseMuscleGroup, setSelectedExerciseMuscleGroup] = useState("")
  const [selectedExerciseMusclePart, setSelectedExerciseMusclePart] = useState("")
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [exerciseToDelete, setExerciseToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // Muscle group delete dialog states
  const [muscleGroupDeleteDialogOpen, setMuscleGroupDeleteDialogOpen] = useState(false)
  const [muscleGroupToDelete, setMuscleGroupToDelete] = useState(null)
  const [muscleGroupDeleteLoading, setMuscleGroupDeleteLoading] = useState(false)
  
  // Muscle part delete dialog states
  const [musclePartDeleteDialogOpen, setMusclePartDeleteDialogOpen] = useState(false)
  const [musclePartToDelete, setMusclePartToDelete] = useState(null)
  const [musclePartDeleteLoading, setMusclePartDeleteLoading] = useState(false)

  // API base URL
  const API_URL = "https://api.cnergy.site/exercises.php"

  useEffect(() => {
    fetchExercises()
    fetchMuscles()
    fetchMuscleGroups()
    fetchMuscleParts()
  }, [])

  // Exercise functions
  const fetchExercises = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${API_URL}?action=get_exercises`)
      if (response.data.success) {
        setExercises(response.data.data)
        setError("")
      } else {
        setError(response.data.message || "Failed to fetch exercises")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMuscles = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=get_muscles`)
      if (response.data.success) {
        setMuscles(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching muscles:", error)
    }
  }

  const fetchMuscleGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=get_muscle_groups`)
      if (response.data.success) {
        setMuscleGroups(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching muscle groups:", error)
    }
  }

  const fetchMuscleParts = async (parentId = null) => {
    try {
      const url = parentId
        ? `${API_URL}?action=get_muscle_parts&parent_id=${parentId}`
        : `${API_URL}?action=get_muscle_parts`
      const response = await axios.get(url)
      if (response.data.success) {
        setMuscleParts(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching muscle parts:", error)
    }
  }

  const handleApiError = (error) => {
    if (error.response) {
      let errorMessage = error.response.data.message || "Server error occurred"
      
      // Check for foreign key constraint errors and provide user-friendly message
      if (errorMessage.includes("Integrity constraint violation") || 
          errorMessage.includes("foreign key constraint") ||
          errorMessage.includes("member_workout_exercise")) {
        errorMessage = "Cannot delete this exercise because it is currently being used in member workout programs. Please remove it from all workout programs before deleting."
      }
      
      setError(errorMessage)
    } else if (error.request) {
      setError("Unable to connect to server")
    } else {
      setError("An unexpected error occurred")
    }
    console.error("API Error:", error)
  }

  const handleFileUpload = async (file, type) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("action", "upload_file")
    formData.append("type", type)

    try {
      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 300000, // 5 minutes timeout for large video files
      })

      if (response.data.success) {
        return response.data.file_url
      } else {
        throw new Error(response.data.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  // Exercise handlers
  const handleExerciseImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setExerciseImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setExerciseImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleExerciseVideoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setExerciseVideoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setExerciseVideoPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleMuscleToggle = (muscleId, role = "primary") => {
    setSelectedMuscles((prev) => {
      const existingIndex = prev.findIndex((m) => m.id === muscleId)
      if (existingIndex >= 0) {
        // Remove if exists
        return prev.filter((m) => m.id !== muscleId)
      } else {
        // Add with role
        return [...prev, { id: muscleId, role }]
      }
    })
  }

  const handleMuscleRoleChange = (muscleId, newRole) => {
    setSelectedMuscles((prev) => prev.map((m) => (m.id === muscleId ? { ...m, role: newRole } : m)))
  }

  const handleMuscleGroupToggle = (muscleGroupId) => {
    setSelectedMuscleGroups((prev) => {
      if (prev.includes(muscleGroupId)) {
        return prev.filter((id) => id !== muscleGroupId)
      } else {
        return [...prev, muscleGroupId]
      }
    })
  }

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) return

    setIsLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("name", exerciseName.trim())
      formData.append("description", exerciseDescription.trim())
      formData.append("instructions", exerciseInstructions.trim())
      formData.append("benefits", exerciseBenefits.trim())

      const allMuscles = [...selectedMuscleGroups.map((id) => ({ id, role: "primary" })), ...selectedMuscles]
      formData.append("target_muscles", JSON.stringify(allMuscles))

      let imageUrl = selectedExercise?.image_url || ""
      let videoUrl = selectedExercise?.video_url || ""

      // Upload image if new file selected
      if (exerciseImageFile) {
        imageUrl = await handleFileUpload(exerciseImageFile, "image")
      }

      // Upload video if new file selected
      if (exerciseVideoFile) {
        videoUrl = await handleFileUpload(exerciseVideoFile, "video")
      }

      const exerciseData = {
        action: selectedExercise ? "update_exercise" : "create_exercise",
        name: exerciseName.trim(),
        description: exerciseDescription.trim(),
        instructions: exerciseInstructions.trim(),
        benefits: exerciseBenefits.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
        target_muscles: allMuscles,
      }

      if (selectedExercise) {
        exerciseData.id = selectedExercise.id
      }

      const response = await axios.post(API_URL, exerciseData)

      if (response.data.success) {
        await fetchExercises()
        handleCloseExerciseDialog()
      } else {
        setError(response.data.message || "Failed to save exercise")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (exercise) => {
    setExerciseToDelete(exercise)
    setDeleteDialogOpen(true)
    setError("")
  }

  const handleConfirmDelete = async () => {
    if (!exerciseToDelete) return

    setDeleteLoading(true)
    setError("")

    try {
      const response = await axios.post(API_URL, {
        action: "delete_exercise",
        id: exerciseToDelete.id,
      })

      if (response.data.success) {
        await fetchExercises()
        setDeleteDialogOpen(false)
        setExerciseToDelete(null)
        setError("")
        
        // Show success toast
        toast({
          title: "Exercise Deleted Successfully",
          description: `${exerciseToDelete.name} has been removed from the exercise library.`,
          className: "border-green-200 bg-green-50 text-green-900 shadow-md",
          duration: 3000,
        })
      } else {
        let errorMessage = response.data.message || "Failed to delete exercise"
        
        // Check for foreign key constraint errors
        if (errorMessage.includes("Integrity constraint violation") || 
            errorMessage.includes("foreign key constraint") ||
            errorMessage.includes("member_workout_exercise")) {
          errorMessage = "Cannot delete this exercise because it is currently being used in member workout programs. Please remove it from all workout programs before deleting."
        }
        
        setError(errorMessage)
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setExerciseToDelete(null)
    setError("")
  }

  const handleEditExercise = (exercise) => {
    setSelectedExercise(exercise)
    setExerciseName(exercise.name)
    setExerciseDescription(exercise.description || "")
    setExerciseInstructions(exercise.instructions || "")
    setExerciseBenefits(exercise.benefits || "")
    const muscleGroups = exercise.target_muscles?.filter((m) => !m.parent_id) || []
    const muscleTargets = exercise.target_muscles?.filter((m) => m.parent_id) || []
    setSelectedMuscleGroups(muscleGroups.map((m) => m.id))
    setSelectedMuscles(muscleTargets.map((m) => ({ id: m.id, role: m.role || "primary" })))
    setExerciseImagePreview(exercise.image_url || "")
    setExerciseVideoPreview(exercise.video_url || "")
    setExerciseImageFile(null)
    setExerciseVideoFile(null)
    setExerciseDialogOpen(true)
  }

  const handleAddExercise = () => {
    setSelectedExercise(null)
    setExerciseName("")
    setExerciseDescription("")
    setExerciseInstructions("")
    setExerciseBenefits("")
    setSelectedMuscleGroups([])
    setSelectedMuscles([])
    setMuscleTargetSearchQuery("")
    setExerciseImagePreview("")
    setExerciseVideoPreview("")
    setExerciseImageFile(null)
    setExerciseVideoFile(null)
    setExerciseDialogOpen(true)
  }

  const handleCloseExerciseDialog = () => {
    setExerciseDialogOpen(false)
    setSelectedExercise(null)
    setExerciseName("")
    setExerciseDescription("")
    setExerciseInstructions("")
    setExerciseBenefits("")
    setSelectedMuscleGroups([])
    setSelectedMuscles([])
    setMuscleTargetSearchQuery("")
    setExerciseImagePreview("")
    setExerciseVideoPreview("")
    setExerciseImageFile(null)
    setExerciseVideoFile(null)
  }

  // Muscle handlers
  const handleMuscleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setMuscleImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setMuscleImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveMuscle = async () => {
    if (!muscleName.trim()) {
      setError("Muscle group name is required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      let imageUrl = selectedMuscle?.image_url || ""

      if (muscleImageFile) {
        imageUrl = await handleFileUpload(muscleImageFile, "image")
      }

      const muscleData = {
        action: selectedMuscle ? "update_muscle" : "create_muscle",
        name: muscleName.trim(),
        image_url: imageUrl,
        parent_id: null, // Always null for muscle groups
      }

      if (selectedMuscle) {
        muscleData.id = selectedMuscle.id
      }

      const response = await axios.post(API_URL, muscleData)

      if (response.data.success) {
        await fetchMuscleGroups()
        await fetchMuscles() // Also refresh main muscles list
        handleCloseMuscleDialog()
      } else {
        setError(response.data.message || "Failed to save muscle group")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMusclePartImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setMusclePartImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setMusclePartImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveMusclePart = async () => {
    if (!musclePartName.trim()) {
      setError("Muscle part name is required")
      return
    }

    if (!musclePartParentId) {
      setError("Parent muscle group is required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      let imageUrl = selectedMusclePart?.image_url || ""

      if (musclePartImageFile) {
        imageUrl = await handleFileUpload(musclePartImageFile, "image")
      }

      const musclePartData = {
        action: selectedMusclePart ? "update_muscle" : "create_muscle",
        name: musclePartName.trim(),
        image_url: imageUrl,
        parent_id: musclePartParentId,
      }

      if (selectedMusclePart) {
        musclePartData.id = selectedMusclePart.id
      }

      const response = await axios.post(API_URL, musclePartData)

      if (response.data.success) {
        await fetchMuscleParts(selectedMuscleGroup || null)
        await fetchMuscles() // Also refresh main muscles list
        handleCloseMusclePartDialog()
        
        // Show success toast
        toast({
          title: selectedMusclePart ? "Muscle Part Updated Successfully" : "Muscle Part Added Successfully",
          description: selectedMusclePart 
            ? `${musclePartName.trim()} has been updated.`
            : `${musclePartName.trim()} has been added to the muscle parts library.`,
          className: "border-green-200 bg-green-50 text-green-900 shadow-md",
          duration: 3000,
        })
      } else {
        setError(response.data.message || "Failed to save muscle part")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMusclePartClick = (musclePart) => {
    setMusclePartToDelete(musclePart)
    setMusclePartDeleteDialogOpen(true)
    setError("")
  }

  const handleConfirmDeleteMusclePart = async () => {
    if (!musclePartToDelete) return

    setMusclePartDeleteLoading(true)
    setError("")

    try {
      const response = await axios.post(API_URL, {
        action: "delete_muscle",
        id: musclePartToDelete.id,
      })

      if (response.data.success) {
        await fetchMuscleParts(selectedMuscleGroup || null)
        await fetchMuscles()
        setMusclePartDeleteDialogOpen(false)
        setMusclePartToDelete(null)
        setError("")
        
        // Show success toast
        toast({
          title: "Muscle Part Deleted Successfully",
          description: `${musclePartToDelete.name} has been removed.`,
          className: "border-green-200 bg-green-50 text-green-900 shadow-md",
          duration: 3000,
        })
      } else {
        setError(response.data.message || "Failed to delete muscle part")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setMusclePartDeleteLoading(false)
    }
  }

  const handleCancelDeleteMusclePart = () => {
    setMusclePartDeleteDialogOpen(false)
    setMusclePartToDelete(null)
    setError("")
  }

  const handleEditMusclePart = (musclePart) => {
    setSelectedMusclePart(musclePart)
    setMusclePartName(musclePart.name)
    setMusclePartParentId(musclePart.parent_id?.toString() || "")
    setMusclePartImagePreview(musclePart.image_url || "")
    setMusclePartImageFile(null)
    setMusclePartDialogOpen(true)
  }

  const handleAddMusclePart = () => {
    setSelectedMusclePart(null)
    setMusclePartName("")
    setMusclePartParentId(selectedMuscleGroup || "")
    setMusclePartImagePreview("")
    setMusclePartImageFile(null)
    setMusclePartDialogOpen(true)
  }

  const handleCloseMusclePartDialog = () => {
    setMusclePartDialogOpen(false)
    setSelectedMusclePart(null)
    setMusclePartName("")
    setMusclePartParentId("")
    setMusclePartImagePreview("")
    setMusclePartImageFile(null)
    setError("")
  }

  const handleMuscleGroupFilter = (groupId) => {
    const actualGroupId = groupId === "all" ? "" : groupId
    setSelectedMuscleGroup(actualGroupId)
    fetchMuscleParts(actualGroupId || null)
  }

  const handleDeleteMuscleClick = (muscle) => {
    setMuscleGroupToDelete(muscle)
    setMuscleGroupDeleteDialogOpen(true)
    setError("")
  }

  const handleConfirmDeleteMuscle = async () => {
    if (!muscleGroupToDelete) return

    setMuscleGroupDeleteLoading(true)
    setError("")

    try {
      const response = await axios.post(API_URL, {
        action: "delete_muscle",
        id: muscleGroupToDelete.id,
      })

      if (response.data.success) {
        await fetchMuscles()
        await fetchMuscleGroups()
        setMuscleGroupDeleteDialogOpen(false)
        setMuscleGroupToDelete(null)
        setError("")
        
        // Show success toast
        toast({
          title: "Muscle Group Deleted Successfully",
          description: `${muscleGroupToDelete.name} has been removed.`,
          className: "border-green-200 bg-green-50 text-green-900 shadow-md",
          duration: 3000,
        })
      } else {
        setError(response.data.message || "Failed to delete muscle group")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setMuscleGroupDeleteLoading(false)
    }
  }

  const handleCancelDeleteMuscle = () => {
    setMuscleGroupDeleteDialogOpen(false)
    setMuscleGroupToDelete(null)
    setError("")
  }

  const handleEditMuscle = (muscle) => {
    setSelectedMuscle(muscle)
    setMuscleName(muscle.name)
    setParentMuscleId(muscle.parent_id || "")
    setMuscleImagePreview(muscle.image_url || "")
    setMuscleImageFile(null)
    setMuscleDialogOpen(true)
  }

  const handleAddMuscle = () => {
    setSelectedMuscle(null)
    setMuscleName("")
    setParentMuscleId("")
    setMuscleImagePreview("")
    setMuscleImageFile(null)
    setMuscleDialogOpen(true)
  }

  const handleCloseMuscleDialog = () => {
    setMuscleDialogOpen(false)
    setSelectedMuscle(null)
    setMuscleName("")
    setParentMuscleId("")
    setMuscleImagePreview("")
    setMuscleImageFile(null)
    setError("")
  }

  // Filter functions
  const filteredMuscleGroups = muscleGroups.filter((muscle) =>
    muscle.name.toLowerCase().includes(muscleSearchQuery.toLowerCase()),
  )

  const filteredMuscleParts = muscleParts.filter((muscle) =>
    muscle.name.toLowerCase().includes(musclePartSearchQuery.toLowerCase()),
  )

  const filteredExercises = exercises.filter((exercise) => {
    // Search filter
    const matchesSearch =
      exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
      (exercise.description && exercise.description.toLowerCase().includes(exerciseSearchQuery.toLowerCase()))
    
    // Muscle group filter
    const matchesMuscleGroup = !selectedExerciseMuscleGroup || 
      exercise.target_muscles?.some((muscle) => {
        // Check if any target muscle matches the selected group
        if (muscle.id === parseInt(selectedExerciseMuscleGroup)) return true
        // Check if any target muscle's parent matches the selected group
        if (muscle.parent_id === parseInt(selectedExerciseMuscleGroup)) return true
        return false
      })
    
    // Muscle part filter
    const matchesMusclePart = !selectedExerciseMusclePart ||
      exercise.target_muscles?.some((muscle) => {
        // Check if any target muscle matches the selected part
        if (muscle.id === parseInt(selectedExerciseMusclePart)) return true
        return false
      })
    
    return matchesSearch && matchesMuscleGroup && matchesMusclePart
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredExercises.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedExercises = filteredExercises.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [exerciseSearchQuery, selectedExerciseMuscleGroup, selectedExerciseMusclePart])

  const filteredMuscles = muscles.filter((muscle) =>
    muscle.name.toLowerCase().includes(muscleSearchQuery.toLowerCase()),
  )

  const parentMuscles = muscles.filter((muscle) => !muscle.parent_id)

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="exercises" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Exercises
          </TabsTrigger>
          <TabsTrigger value="muscle-groups" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Muscle Groups
          </TabsTrigger>
          <TabsTrigger value="muscle-parts" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Muscle Parts
          </TabsTrigger>
        </TabsList>

        {/* Exercises Tab */}
        <TabsContent value="exercises">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Manage Exercises
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Add, edit, or remove exercises with target muscles, instructions, and benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search exercises..."
                    className="pl-8"
                    value={exerciseSearchQuery}
                    onChange={(e) => setExerciseSearchQuery(e.target.value)}
                  />
                </div>
                <Select 
                  value={selectedExerciseMuscleGroup || "all"} 
                  onValueChange={(value) => setSelectedExerciseMuscleGroup(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by muscle group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Muscle Groups</SelectItem>
                    {muscleGroups.filter(group => group.id && group.name).map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedExerciseMusclePart || "all"} 
                  onValueChange={(value) => setSelectedExerciseMusclePart(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by muscle part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Muscle Parts</SelectItem>
                    {muscleParts.filter(part => part.id && part.name).map((part) => (
                      <SelectItem key={part.id} value={part.id.toString()}>
                        {part.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddExercise} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </div>

              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold w-[200px]">Exercise Name</TableHead>
                      <TableHead className="font-semibold min-w-[280px]">Target Muscles</TableHead>
                      <TableHead className="font-semibold w-[120px]">Media</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExercises.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Dumbbell className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm font-medium">
                              {isLoading
                                ? "Loading exercises..."
                                : exerciseSearchQuery
                                  ? "No exercises found matching your search"
                                  : "No exercises found"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedExercises.map((exercise) => (
                        <TableRow key={exercise.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-semibold py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{exercise.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[400px]">
                              {exercise.target_muscles && exercise.target_muscles.length > 0 ? (
                                exercise.target_muscles.map((muscle) => (
                                  <Badge
                                    key={muscle.id}
                                    variant={
                                      muscle.role === "primary"
                                        ? "default"
                                        : muscle.role === "secondary"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs font-medium px-2 py-0.5"
                                  >
                                    {muscle.name}
                                    <span className="ml-1 text-[10px] opacity-75">({muscle.role})</span>
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No muscles assigned</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              {exercise.image_url && exercise.video_url ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground border border-border">
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium">Image</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground border border-border">
                                    <Play className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium">Video</span>
                                  </div>
                                </div>
                              ) : exercise.image_url ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground border border-border">
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Image</span>
                                </div>
                              ) : exercise.video_url ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground border border-border">
                                  <Play className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Video</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No media</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 max-w-[400px]">
                            <div 
                              className="text-sm text-muted-foreground line-clamp-2 leading-relaxed" 
                              title={exercise.description || "No description available"}
                            >
                              {exercise.description || (
                                <span className="italic text-muted-foreground/70">No description available</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditExercise(exercise)}
                                disabled={isLoading}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(exercise)}
                                disabled={isLoading}
                                className="h-8 w-8 p-0"
                              >
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
              {filteredExercises.length > 0 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredExercises.length)} of {filteredExercises.length} exercises
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              disabled={isLoading}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          )
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )
                        }
                        return null
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="muscle-groups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Manage Muscle Groups
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>Add, edit, or remove main muscle groups (parent categories)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search muscle groups..."
                    className="pl-8"
                    value={muscleSearchQuery}
                    onChange={(e) => setMuscleSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddMuscle} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Muscle Group
                </Button>
              </div>

              {filteredMuscleGroups.length === 0 ? (
                <div className="rounded-lg border bg-card p-12">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Target className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {isLoading
                        ? "Loading muscle groups..."
                        : muscleSearchQuery
                          ? "No muscle groups found matching your search"
                          : "No muscle groups found"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMuscleGroups.map((muscle) => (
                    <Card key={muscle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        {muscle.image_url ? (
                          <>
                            <img
                              src={muscle.image_url}
                              alt={muscle.name}
                              className="w-full h-full object-cover"
                              onLoad={(e) => {
                                // Hide placeholder when image loads successfully
                                const placeholder = e.target.nextElementSibling
                                if (placeholder) {
                                  placeholder.style.display = 'none'
                                }
                              }}
                              onError={(e) => {
                                // Hide image and show placeholder on error
                                e.target.style.display = 'none'
                                const placeholder = e.target.nextElementSibling
                                if (placeholder) {
                                  placeholder.style.display = 'flex'
                                }
                              }}
                            />
                            <div
                              className="absolute inset-0 w-full h-full flex items-center justify-center text-muted-foreground bg-muted"
                              style={{ display: 'none' }}
                            >
                              <ImageIcon className="h-12 w-12 opacity-50" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-12 w-12 opacity-50" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-base">{muscle.name}</h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditMuscle(muscle)}
                              disabled={isLoading}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteMuscleClick(muscle)}
                                disabled={isLoading}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="muscle-parts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Manage Muscle Parts
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>Add, edit, or remove specific muscle parts within muscle groups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search muscle parts..."
                    className="pl-8 h-9"
                    value={musclePartSearchQuery}
                    onChange={(e) => setMusclePartSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedMuscleGroup || "all"} onValueChange={handleMuscleGroupFilter}>
                  <SelectTrigger className="w-48 h-9">
                    <SelectValue placeholder="Filter by muscle group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All muscle groups</SelectItem>
                    {muscleGroups.filter(group => group.id && group.name).map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddMusclePart} disabled={isLoading} className="h-9">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Muscle Part
                </Button>
              </div>

              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="font-semibold h-10 px-4">Muscle Part Name</TableHead>
                      <TableHead className="font-semibold h-10 px-4">Muscle Group</TableHead>
                      <TableHead className="font-semibold h-10 px-4 w-[120px]">Image</TableHead>
                      <TableHead className="font-semibold h-10 px-4 w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMuscleParts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Target className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm font-medium">
                              {isLoading
                                ? "Loading muscle parts..."
                                : musclePartSearchQuery
                                  ? "No muscle parts found matching your search"
                                  : selectedMuscleGroup
                                    ? "No muscle parts found for selected group"
                                    : "No muscle parts found"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMuscleParts.map((muscle) => (
                        <TableRow key={muscle.id} className="hover:bg-muted/50 transition-colors border-b">
                          <TableCell className="font-medium py-2 px-4">
                            <span className="text-sm">{muscle.name}</span>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <Badge variant="outline" className="font-normal text-xs">
                              {muscle.parent_name || "No group"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <div className="flex items-center justify-start">
                              {muscle.image_url ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground border border-border">
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Image</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No Image</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditMusclePart(muscle)}
                                disabled={isLoading}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteMusclePartClick(muscle)}
                                disabled={isLoading}
                                className="h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Exercise Dialog */}
      <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl">{selectedExercise ? "Edit Exercise" : "Add Exercise"}</DialogTitle>
            <DialogDescription>
              {selectedExercise ? "Update exercise details and target muscles" : "Create a new exercise with details, instructions, and target muscles"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="pb-2 border-b">
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exercise-name" className="text-sm font-semibold">
                    Exercise Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="exercise-name"
                    placeholder="e.g., Barbell Bench Press"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exercise-description" className="text-sm font-semibold">
                    Description
                  </Label>
                  <Textarea
                    id="exercise-description"
                    placeholder="Provide a brief overview of the exercise..."
                    value={exerciseDescription}
                    onChange={(e) => setExerciseDescription(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Instructions & Benefits Section */}
            <div className="space-y-4">
              <div className="pb-2 border-b">
                <h3 className="text-lg font-semibold">Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exercise-instructions" className="text-sm font-semibold">
                    Instructions
                  </Label>
                  <Textarea
                    id="exercise-instructions"
                    placeholder="Step 1: Set up...&#10;Step 2: Position...&#10;Step 3: Execute..."
                    value={exerciseInstructions}
                    onChange={(e) => setExerciseInstructions(e.target.value)}
                    disabled={isLoading}
                    rows={5}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exercise-benefits" className="text-sm font-semibold">
                    Benefits
                  </Label>
                  <Textarea
                    id="exercise-benefits"
                    placeholder="• Builds strength&#10;• Improves posture&#10;• Increases muscle mass"
                    value={exerciseBenefits}
                    onChange={(e) => setExerciseBenefits(e.target.value)}
                    disabled={isLoading}
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Target Muscles Section */}
            <div className="space-y-4">
              <div className="pb-2 border-b">
                <h3 className="text-lg font-semibold">Target Muscles</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Muscle Groups</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto border rounded-lg p-4 bg-muted/30">
                    {muscleGroups.map((muscleGroup) => {
                      const isSelected = selectedMuscleGroups.includes(muscleGroup.id)
                      return (
                        <div 
                          key={muscleGroup.id} 
                          className={`flex items-center space-x-3 p-2 rounded-md border transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-background border-border hover:bg-muted/50'
                          }`}
                          onClick={() => handleMuscleGroupToggle(muscleGroup.id)}
                        >
                          <Checkbox
                            id={`muscle-group-${muscleGroup.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleMuscleGroupToggle(muscleGroup.id)}
                            disabled={isLoading}
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            {muscleGroup.image_url ? (
                              <img
                                src={muscleGroup.image_url}
                                alt={muscleGroup.name}
                                className="w-10 h-10 object-cover rounded-md border border-border"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded-md border border-border flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <Label
                              htmlFor={`muscle-group-${muscleGroup.id}`}
                              className="text-sm font-medium cursor-pointer flex-1"
                            >
                              {muscleGroup.name}
                            </Label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Specific Muscle Parts</Label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search muscle parts..."
                        value={muscleTargetSearchQuery}
                        onChange={(e) => setMuscleTargetSearchQuery(e.target.value)}
                        disabled={isLoading}
                        className="pl-9 h-10"
                      />
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                      {muscleParts
                        .filter(
                          (muscle) =>
                            muscle.name.toLowerCase().includes(muscleTargetSearchQuery.toLowerCase()) ||
                            (muscle.parent_name &&
                              muscle.parent_name.toLowerCase().includes(muscleTargetSearchQuery.toLowerCase())),
                        )
                        .map((muscle) => {
                          const selectedMuscle = selectedMuscles.find((m) => m.id === muscle.id)
                          const isSelected = !!selectedMuscle

                          return (
                            <div 
                              key={muscle.id} 
                              className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary' 
                                  : 'bg-background border-border hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <Checkbox
                                  id={`muscle-target-${muscle.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => handleMuscleToggle(muscle.id)}
                                  disabled={isLoading}
                                />
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`muscle-target-${muscle.id}`}
                                    className="text-sm font-medium cursor-pointer block"
                                  >
                                    {muscle.name}
                                  </Label>
                                  {muscle.parent_name && (
                                    <span className="text-xs text-muted-foreground">{muscle.parent_name}</span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <Select
                                  value={selectedMuscle.role || "primary"}
                                  onValueChange={(value) => handleMuscleRoleChange(muscle.id, value)}
                                  disabled={isLoading}
                                >
                                  <SelectTrigger className="w-36 h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="primary">Primary</SelectItem>
                                    <SelectItem value="secondary">Secondary</SelectItem>
                                    <SelectItem value="stabilizer">Stabilizer</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Media Section */}
            <div className="space-y-4">
              <div className="pb-2 border-b">
                <h3 className="text-lg font-semibold">Media</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Exercise Image</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleExerciseImageChange}
                        disabled={isLoading}
                        className="flex-1 h-10"
                      />
                      {exerciseImagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExerciseImagePreview("")
                            setExerciseImageFile(null)
                          }}
                          disabled={isLoading}
                          className="h-10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {exerciseImagePreview && (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <img
                          src={exerciseImagePreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-md border"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Exercise Video</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={handleExerciseVideoChange}
                        disabled={isLoading}
                        className="flex-1 h-10"
                      />
                      {exerciseVideoPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExerciseVideoPreview("")
                            setExerciseVideoFile(null)
                          }}
                          disabled={isLoading}
                          className="h-10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {exerciseVideoPreview && (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <video 
                          src={exerciseVideoPreview} 
                          controls 
                          className="w-full h-48 object-cover rounded-md border" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button 
              variant="outline" 
              onClick={handleCloseExerciseDialog} 
              disabled={isLoading}
              className="h-10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveExercise} 
              disabled={!exerciseName.trim() || isLoading}
              className="h-10 min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedExercise ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={muscleDialogOpen} onOpenChange={setMuscleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl">{selectedMuscle ? "Edit Muscle Group" : "Add Muscle Group"}</DialogTitle>
            <DialogDescription>
              {selectedMuscle ? "Update muscle group details and image" : "Create a new muscle group with name and optional image"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="muscle-name" className="text-sm font-semibold">Muscle Group Name *</Label>
              <Input
                id="muscle-name"
                placeholder="Enter muscle group name"
                value={muscleName}
                onChange={(e) => setMuscleName(e.target.value)}
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Muscle Group Image</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleMuscleImageChange}
                  disabled={isLoading}
                  className="flex-1 h-10"
                />
                {muscleImagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMuscleImagePreview("")
                      setMuscleImageFile(null)
                    }}
                    disabled={isLoading}
                    className="h-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {muscleImagePreview && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-center">
                    <img
                      src={muscleImagePreview || "/placeholder.svg"}
                      alt="Preview"
                      className="w-48 h-48 object-cover rounded-md border shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={handleCloseMuscleDialog} disabled={isLoading} className="h-10">
              Cancel
            </Button>
            <Button onClick={handleSaveMuscle} disabled={!muscleName.trim() || isLoading} className="h-10 min-w-[120px]">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedMuscle ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={musclePartDialogOpen} onOpenChange={setMusclePartDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl">{selectedMusclePart ? "Edit Muscle Part" : "Add Muscle Part"}</DialogTitle>
            <DialogDescription>
              {selectedMusclePart ? "Update muscle part details and image" : "Create a new muscle part with name, parent group, and optional image"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="muscle-part-name" className="text-sm font-semibold">Muscle Part Name *</Label>
              <Input
                id="muscle-part-name"
                placeholder="Enter muscle part name"
                value={musclePartName}
                onChange={(e) => setMusclePartName(e.target.value)}
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="parent-muscle-group" className="text-sm font-semibold">Parent Muscle Group *</Label>
              <Select value={musclePartParentId} onValueChange={setMusclePartParentId} disabled={isLoading}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select parent muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups.filter(group => group.id && group.name).map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Muscle Part Image</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleMusclePartImageChange}
                  disabled={isLoading}
                  className="flex-1 h-10"
                />
                {musclePartImagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMusclePartImagePreview("")
                      setMusclePartImageFile(null)
                    }}
                    disabled={isLoading}
                    className="h-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {musclePartImagePreview && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-center">
                    <img
                      src={musclePartImagePreview}
                      alt="Preview"
                      className="w-48 h-48 object-cover rounded-md border shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={handleCloseMusclePartDialog} disabled={isLoading} className="h-10">
              Cancel
            </Button>
            <Button
              onClick={handleSaveMusclePart}
              disabled={!musclePartName.trim() || !musclePartParentId || isLoading}
              className="h-10 min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedMusclePart ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Exercise</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please confirm that you want to delete this exercise.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{exerciseToDelete?.name}</strong>? This action cannot be undone.
            </p>
            {exerciseToDelete && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> If this exercise is currently assigned to any member workout programs, the deletion will fail. You'll need to remove it from all programs first.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelDelete} 
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete} 
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Exercise"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Muscle Group Delete Confirmation Dialog */}
      <Dialog open={muscleGroupDeleteDialogOpen} onOpenChange={setMuscleGroupDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Muscle Group</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please confirm that you want to delete this muscle group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{muscleGroupToDelete?.name}</strong>? This action cannot be undone.
            </p>
            {muscleGroupToDelete && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> If this muscle group has associated muscle parts or exercises, the deletion may fail. You'll need to remove all associations first.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDeleteMuscle}
              disabled={muscleGroupDeleteLoading}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMuscle}
              disabled={muscleGroupDeleteLoading}
              className="h-10"
            >
              {muscleGroupDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Muscle Part Delete Confirmation Dialog */}
      <Dialog open={musclePartDeleteDialogOpen} onOpenChange={setMusclePartDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Muscle Part</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please confirm that you want to delete this muscle part.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{musclePartToDelete?.name}</strong>? This action cannot be undone.
            </p>
            {musclePartToDelete && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> If this muscle part is currently assigned to any exercises, the deletion may fail. You'll need to remove it from all exercises first.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDeleteMusclePart}
              disabled={musclePartDeleteLoading}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMusclePart}
              disabled={musclePartDeleteLoading}
              className="h-10"
            >
              {musclePartDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ExerciseMuscleManager
