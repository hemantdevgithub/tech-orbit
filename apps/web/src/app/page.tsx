import Link from "next/link";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  BuildingIcon,
} from "@/components/icons";

export default function TechOrbitHomepage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-50 to-cream-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-forest-900 mb-4">TechOrbit</h1>
          <p className="text-xl text-sage-600 max-w-2xl mx-auto">
            Your complete platform for technology workforce solutions
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link
            href="/techforce/dashboard"
            className="group block bg-cream-50 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 overflow-hidden border-2 border-transparent hover:border-forest-500 focus:outline-none focus:ring-2 focus:ring-mint-300 motion-reduce:transition-none"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-forest-100 rounded-lg flex items-center justify-center mb-6 group-hover:bg-forest-500 transition-colors motion-reduce:transition-none">
                <span className="text-forest-600 group-hover:text-cream-50 transition-colors motion-reduce:transition-none">
                  <BriefcaseIcon size={32} />
                </span>
              </div>

              <h2 className="text-2xl font-bold text-forest-900 mb-3">TechForce</h2>

              <p className="text-sage-600 mb-6">
                IT staffing marketplace with transparent commission splits. Connect
                customers with top tech talent through our verified network.
              </p>

              <div className="flex items-center text-forest-600 font-medium group-hover:text-forest-700">
                Enter TechForce
                <span className="ml-2 group-hover:translate-x-1 transition-transform motion-reduce:transition-none">
                  <ArrowRightIcon size={18} />
                </span>
              </div>
            </div>
          </Link>

          <div
            className="relative bg-cream-50 rounded-xl shadow-lg overflow-hidden border-2 border-sage-200 opacity-75"
            aria-label="TechProject — coming soon"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-sage-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-sage-400">
                  <BuildingIcon size={32} />
                </span>
              </div>

              <h2 className="text-2xl font-bold text-forest-900 mb-3">TechProject</h2>

              <p className="text-sage-600 mb-6">
                Project-based technology solutions marketplace. Coming soon.
              </p>

              <div className="inline-flex items-center px-4 py-2 bg-sage-100 text-sage-600 rounded-lg font-medium">
                Coming Soon
              </div>
            </div>

            <div className="absolute top-4 right-4 bg-sage-500 text-cream-50 px-3 py-1 rounded-full text-sm font-medium">
              In Development
            </div>
          </div>
        </div>

        <div className="text-center mt-16 space-x-6">
          <Link
            href="/login"
            className="text-sage-600 hover:text-forest-600 transition-colors motion-reduce:transition-none"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sage-600 hover:text-forest-600 transition-colors motion-reduce:transition-none"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
