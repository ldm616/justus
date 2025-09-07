import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold mb-4">JustUs</h1>
        <p className="text-xl text-gray-400 mb-8">
          Share moments with the people who matter most
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link 
            to="/login" 
            className="btn-secondary px-8 py-3 text-lg"
          >
            Log in
          </Link>
          <Link 
            to="/signup" 
            className="btn-primary px-8 py-3 text-lg"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}