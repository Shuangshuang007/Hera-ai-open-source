import SearchBar from '@/components/SearchBar';
import JobList from '@/components/JobList';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <SearchBar />
          <div className="mt-4 text-sm text-blue-600">
            <a href="/sign-in" className="hover:underline">
              Upload your resume - it only takes a few seconds
            </a>
          </div>
        </div>
        <JobList />
      </main>
    </div>
  );
} 