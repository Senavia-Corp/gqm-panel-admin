"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Eye, ClipboardList } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Technician, Job } from "@/lib/types"
import { fetchJobs } from "@/lib/services/jobs-service"
import { useToast } from "@/hooks/use-toast"

interface TechnicianJobsSectionProps {
  technician: Technician
}

export function TechnicianJobsSection({ technician }: TechnicianJobsSectionProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [assignSearchQuery, setAssignSearchQuery] = useState("")
  const [assignedJobIds, setAssignedJobIds] = useState<string[]>([])

  useEffect(() => {
    loadJobs()
  }, [])

  useEffect(() => {
    // Filter jobs based on search query
    if (searchQuery.trim() === "") {
      setFilteredJobs(jobs)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredJobs(
        jobs.filter(
          (job) =>
            job.id.toLowerCase().includes(query) ||
            job.projectName.toLowerCase().includes(query) ||
            job.client.name.toLowerCase().includes(query) ||
            job.status.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, jobs])

  const loadJobs = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Fetching technician assigned job IDs for:", technician.ID_Technician)

      const techResponse = await fetch(`/api/technician/${technician.ID_Technician}`)
      if (!techResponse.ok) {
        throw new Error("Failed to fetch technician data")
      }
      const techData = await techResponse.json()

      // Extract job IDs from subcontractor.jobs
      const jobIds = techData.subcontractor?.jobs?.map((job: any) => job.ID_Jobs) || []
      setAssignedJobIds(jobIds)
      console.log("[v0] Technician assigned job IDs:", jobIds)

      const { jobs: fetchedJobs } = await fetchJobs(1, 200) // Fetch more to ensure we get all assigned jobs

      const technicianJobs = fetchedJobs.filter((job) => jobIds.includes(job.id))
      console.log("[v0] Filtered technician jobs:", technicianJobs.length, "of", fetchedJobs.length)

      setJobs(technicianJobs)
      setFilteredJobs(technicianJobs)
      setAvailableJobs(fetchedJobs)
    } catch (error) {
      console.error("[v0] Error loading jobs:", error)
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (jobId: string) => {
    router.push(`/jobs/${jobId}`)
  }

  const handleViewTasks = (job: Job) => {
    // Navigate to technician tasks page for this job
    router.push(
      `/subcontractors/${technician.ID_Subcontractor}/technicians/${technician.ID_Technician}/jobs/${job.id}/tasks`,
    )
  }

  const handleAssignJob = (job: Job) => {
    // In a real app, this would make an API call to assign the job
    console.log("[v0] Assigning job", job.id, "to technician", technician.ID_Technician)

    // Add to the jobs list if not already there
    if (!jobs.find((j) => j.id === job.id)) {
      setJobs([...jobs, job])
    }

    setIsAssignDialogOpen(false)
    toast({
      title: "Success",
      description: `Job ${job.id} assigned to ${technician.Name}`,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Assigned/P.Quote":
        return "bg-blue-500 hover:bg-blue-600"
      case "Waiting for Approval":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "Schedule/Work in Progress":
        return "bg-gqm-green hover:bg-gqm-green/90"
      case "Cancelled":
        return "bg-red-500 hover:bg-red-600"
      case "Completed P. INV/POs":
        return "bg-purple-500 hover:bg-purple-600"
      case "Invoiced":
        return "bg-green-600 hover:bg-green-700"
      case "HOLD":
        return "bg-orange-500 hover:bg-orange-600"
      case "PAID":
        return "bg-emerald-600 hover:bg-emerald-700"
      case "Warranty":
        return "bg-indigo-500 hover:bg-indigo-600"
      case "Archived":
        return "bg-gray-500 hover:bg-gray-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const filteredAvailableJobs = availableJobs.filter(
    (job) =>
      assignSearchQuery.trim() === "" ||
      job.id.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
      job.projectName.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
      job.client.name.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
      job.status.toLowerCase().includes(assignSearchQuery.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Jobs</CardTitle>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gqm-green hover:bg-gqm-green/90 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Assign New Job
              </Button>
            </DialogTrigger>
            <DialogContent
              className="min-w-[1200px] w-[85vw] h-[85vh] max-h-[85vh] p-0 gap-0 flex flex-col"
              style={{ width: "85vw", minWidth: "1200px" }}
            >
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle className="text-xl">Assign Job to {technician.Name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6 pt-4">
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs by ID, name, client, or status..."
                    value={assignSearchQuery}
                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                <div className="flex-1 overflow-auto rounded-lg border bg-white">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10">
                      <TableRow>
                        <TableHead className="pl-6 w-[140px] font-semibold">Job ID</TableHead>
                        <TableHead className="w-[32%] font-semibold">Job Name</TableHead>
                        <TableHead className="w-[24%] font-semibold">Client</TableHead>
                        <TableHead className="w-[28%] font-semibold">Status</TableHead>
                        <TableHead className="text-right pr-6 w-[120px] font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAvailableJobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-base">
                            No jobs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAvailableJobs.map((job) => (
                          <TableRow key={job.id} className="hover:bg-muted/50 cursor-pointer">
                            <TableCell className="font-medium pl-6 text-base">{job.id}</TableCell>
                            <TableCell className="text-base">{job.projectName}</TableCell>
                            <TableCell className="text-base">{job.client.name}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(job.status)} text-sm px-3 py-1`}>{job.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                size="sm"
                                onClick={() => handleAssignJob(job)}
                                className="bg-gqm-green hover:bg-gqm-green/90 text-white px-4 py-2"
                              >
                                Assign
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Job ID</TableHead>
                <TableHead>Job Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading jobs...
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium pl-6">{job.id}</TableCell>
                    <TableCell>{job.projectName}</TableCell>
                    <TableCell>{job.client.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(job.id)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleViewTasks(job)} title="View Tasks">
                          <ClipboardList className="h-4 w-4" />
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
  )
}
