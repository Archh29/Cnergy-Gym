"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"

const Exercises = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [exercises, setExercises] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [exerciseName, setExerciseName] = useState("")
  const [exerciseDescription, setExerciseDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // API base URL
  const API_URL = "http://localhost/cynergy/exercises.php"

  // Fetch exercises from backend
  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(API_URL)

      if (response.data.success) {
        setExercises(response.data.exercises)
        setError("")
      } else {
        setError(response.data.message || "Failed to fetch exercises")
      }
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        setError(error.response.data.message || "Server error occurred")
      } else if (error.request) {
        // Request was made but no response received
        setError("Unable to connect to server")
      } else {
        // Something else happened
        setError("An unexpected error occurred")
      }
      console.error("Error fetching exercises:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      setError("Exercise name is required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const exerciseData = {
        name: exerciseName.trim(),
        description: exerciseDescription.trim(),
      }

      let response
      if (selectedExercise) {
        // Update existing exercise
        response = await axios.put(API_URL, {
          id: selectedExercise.id,
          ...exerciseData,
        })
      } else {
        // Create new exercise
        response = await axios.post(API_URL, exerciseData)
      }

      if (response.data.success) {
        await fetchExercises() // Refresh the list
        handleCloseDialog()
      } else {
        setError(response.data.message || "Failed to save exercise")
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data.message || "Server error occurred")
      } else if (error.request) {
        setError("Unable to connect to server")
      } else {
        setError("An unexpected error occurred")
      }
      console.error("Error saving exercise:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteExercise = async (id) => {
    if (!confirm("Are you sure you want to delete this exercise?")) {
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await axios.delete(API_URL, {
        data: { id },
      })

      if (response.data.success) {
        await fetchExercises() // Refresh the list
      } else {
        setError(response.data.message || "Failed to delete exercise")
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data.message || "Server error occurred")
      } else if (error.request) {
        setError("Unable to connect to server")
      } else {
        setError("An unexpected error occurred")
      }
      console.error("Error deleting exercise:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditExercise = (exercise) => {
    setSelectedExercise(exercise)
    setExerciseName(exercise.name)
    setExerciseDescription(exercise.description || "")
    setDialogOpen(true)
  }

  const handleAddExercise = () => {
    setSelectedExercise(null)
    setExerciseName("")
    setExerciseDescription("")
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedExercise(null)
    setExerciseName("")
    setExerciseDescription("")
    setError("")
  }

  const filteredExercises = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exercise.description && exercise.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Manage Exercises
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
        <CardDescription>Add, edit, or remove exercises from the database</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search exercises..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddExercise} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExercises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    {isLoading
                      ? "Loading exercises..."
                      : searchQuery
                        ? "No exercises found matching your search"
                        : "No exercises found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={exercise.description}>
                        {exercise.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditExercise(exercise)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteExercise(exercise.id)}
                          disabled={isLoading}
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedExercise ? "Edit Exercise" : "Add Exercise"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Exercise Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter exercise name"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter exercise description (optional)"
                  value={exerciseDescription}
                  onChange={(e) => setExerciseDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSaveExercise} disabled={!exerciseName.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : selectedExercise ? (
                  "Update Exercise"
                ) : (
                  "Add Exercise"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default Exercises
