"use client";
import { MoreVertical } from 'lucide-react';

// 模拟数据
const MOCK_JOBS = [
  {
    id: 1,
    title: "Qualified sanitary plumber",
    company: "A plumbing",
    location: "Melbourne VIC",
    salary: "$35-50 per hour",
    type: "Full-time",
    posted: "Active 1 day ago",
    source: "SEEK"
  },
  {
    id: 2,
    title: "Software Engineer",
    company: "Tech Solutions",
    location: "Melbourne VIC",
    salary: "$120,000 - $150,000",
    type: "Full-time",
    posted: "Active 2 days ago",
    source: "Indeed"
  },
  {
    id: 3,
    title: "Marketing Manager",
    company: "Global Marketing",
    location: "Melbourne VIC",
    salary: "$90,000 - $110,000",
    type: "Full-time",
    posted: "Active 3 days ago",
    source: "SEEK"
  },
  {
    id: 4,
    title: "Data Analyst",
    company: "Data Corp",
    location: "Melbourne VIC",
    salary: "$85,000 - $100,000",
    type: "Full-time",
    posted: "Active 1 day ago",
    source: "Indeed"
  },
  {
    id: 5,
    title: "UX Designer",
    company: "Creative Agency",
    location: "Melbourne VIC",
    salary: "$95,000 - $120,000",
    type: "Full-time",
    posted: "Active 4 days ago",
    source: "SEEK"
  }
];

export default function JobList() {
  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Jobs for you</h2>
        <div className="text-sm text-gray-500">Recent searches</div>
      </div>
      
      <div className="grid gap-4">
        {MOCK_JOBS.map((job) => (
          <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-600">{job.title}</h3>
                <p className="text-gray-600">{job.company}</p>
                <p className="text-gray-500">{job.location}</p>
                <div className="mt-2">
                  <span className="text-gray-900">{job.salary}</span>
                  <span className="mx-2">•</span>
                  <span className="text-gray-600">{job.type}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{job.posted}</p>
                <p className="mt-1 text-xs text-gray-400">Source: {job.source}</p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full h-fit">
                <MoreVertical className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 