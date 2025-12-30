export interface JobRun {
  id: string;
  jobId: string;
  title: string;
  company?: string;
  location?: string;
  postingText: string;
  createdAt: string;
  updatedAt: string;
  source?: "pasted" | "url" | "file";
}

export interface ResumeVersion {
  id: string;
  jobId: string;
  createdAt: string;
  notes?: string;
  resumeText: string;
  formatResumeId?: string;
  scoreSnapshot?: any;
}
