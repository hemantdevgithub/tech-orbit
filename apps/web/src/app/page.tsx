import Link from "next/link";
import {
  ArrowRightIcon,
  AwardIcon,
  BriefcaseIcon,
  BuildingIcon,
  HandshakeIcon,
  SearchIcon,
  ShieldIcon,
  TargetIcon,
  UsersIcon,
} from "@/components/icons";

export const metadata = {
  title: "TechOrbit — Empowering the future of tech work",
  description:
    "TechOrbit is the platform for IT staffing — transparent commission splits, owned payroll, verified vendors, and in-platform delivery for customers, recruiters, and talent.",
};

export default function TechOrbitHomepage(): JSX.Element {
  return (
    <div className="min-h-screen bg-cream-50 text-forest-900">
      <SiteNav />
      <Hero />
      <ProductSelector />
      <BeginWith />
      <TrustStrip />
      <SiteFooter />
    </div>
  );
}

// ─── Top navigation ─────────────────────────────────────────────────────────

function SiteNav(): JSX.Element {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-cream-50/80 border-b border-surface-border">
      <nav className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-forest-800 text-mint-200 flex items-center justify-center font-bold text-base">
            T
          </span>
          <span className="text-lg font-semibold tracking-tight">TechOrbit</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1 text-sm font-medium text-sage-600">
          <li>
            <Link
              href="/"
              className="px-3 py-2 rounded-md text-forest-900 hover:bg-cream-200 transition-colors motion-reduce:transition-none"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/register"
              className="px-3 py-2 rounded-md hover:text-forest-900 hover:bg-cream-200 transition-colors motion-reduce:transition-none"
            >
              Find Talent
            </Link>
          </li>
          <li>
            <Link
              href="/register"
              className="px-3 py-2 rounded-md hover:text-forest-900 hover:bg-cream-200 transition-colors motion-reduce:transition-none"
            >
              Find Work
            </Link>
          </li>
          <li>
            <Link
              href="/techforce/dashboard"
              className="px-3 py-2 rounded-md hover:text-forest-900 hover:bg-cream-200 transition-colors motion-reduce:transition-none"
            >
              TechForce
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-forest-900 hover:bg-cream-200 rounded-md transition-colors motion-reduce:transition-none"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-forest-800 text-cream-50 text-sm font-semibold hover:bg-forest-700 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-mint-300"
          >
            Create Account
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </nav>
    </header>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function Hero(): JSX.Element {
  return (
    <section className="relative overflow-hidden">
      {/* Layered gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-mint-100 via-cream-50 to-cream-200"
      />
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-forest-200/40 blur-3xl -z-10"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-mint-300/60 blur-3xl -z-10"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-24 md:pt-24 md:pb-32 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-100 text-forest-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Now serving US IT staffing marketplaces
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight text-forest-900">
            Empowering the future
            <br className="hidden md:block" /> of tech work.
          </h1>
          <p className="mt-6 text-lg text-sage-600 max-w-2xl">
            TechOrbit connects customers, recruiters, and talent through
            transparent commission splits, owned payroll, and verified vendor
            partners — all in one platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-forest-800 text-cream-50 text-sm font-semibold hover:bg-forest-700 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-mint-300 shadow-card"
            >
              Create a Profile
              <ArrowRightIcon size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cream-50 border border-surface-border text-forest-900 text-sm font-semibold hover:bg-cream-100 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-mint-300"
            >
              Sign In
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-sage-600">
            <span className="inline-flex items-center gap-1.5">
              <ShieldIcon size={14} className="text-forest-700" />
              KYC verified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <AwardIcon size={14} className="text-forest-700" />
              Transparent splits
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HandshakeIcon size={14} className="text-forest-700" />
              Owned payroll
            </span>
          </div>
        </div>

        {/* Decorative cluster — three floating cards mimicking the platform UI */}
        <div className="lg:col-span-5 relative hidden lg:block">
          <FloatingCard
            className="absolute -top-8 right-4 w-64 rotate-3"
            icon={<BriefcaseIcon size={20} />}
            iconBg="bg-forest-100 text-forest-700"
            title="Requirement posted"
            subtitle="Senior React Engineer · Remote"
            chip="OPEN"
            chipClass="bg-success/15 text-success"
          />
          <FloatingCard
            className="absolute top-32 left-0 w-72 -rotate-2"
            icon={<UsersIcon size={20} />}
            iconBg="bg-mint-200 text-forest-800"
            title="3 submissions in screening"
            subtitle="Match scores 78 · 82 · 91"
            chip="SCREENING"
            chipClass="bg-info/15 text-info"
          />
          <FloatingCard
            className="absolute top-72 right-12 w-72 rotate-1"
            icon={<HandshakeIcon size={20} />}
            iconBg="bg-forest-200 text-forest-800"
            title="Placement #4821 active"
            subtitle="$95/hr · 6 month engagement"
            chip="PLACED"
            chipClass="bg-warning/15 text-warning"
          />
        </div>
      </div>
    </section>
  );
}

type FloatingCardProps = {
  className?: string;
  icon: JSX.Element;
  iconBg: string;
  title: string;
  subtitle: string;
  chip: string;
  chipClass: string;
};

function FloatingCard({
  className,
  icon,
  iconBg,
  title,
  subtitle,
  chip,
  chipClass,
}: FloatingCardProps): JSX.Element {
  return (
    <div
      className={`bg-cream-50 rounded-2xl border border-surface-border shadow-card p-4 flex items-start gap-3 ${className ?? ""}`}
    >
      <span
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-forest-900 truncate">{title}</p>
        <p className="text-xs text-sage-600 mt-0.5 truncate">{subtitle}</p>
        <span
          className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${chipClass}`}
        >
          {chip}
        </span>
      </div>
    </div>
  );
}

// ─── Product selector (TechForce + TechProject) ─────────────────────────────

function ProductSelector(): JSX.Element {
  return (
    <section className="bg-cream-50 py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-3">
            Choose your platform
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-forest-900">
            Two products, one TechOrbit
          </h2>
          <p className="mt-3 text-sage-600">
            Pick the marketplace that fits how you work. Switch any time — your
            profile travels with you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Link
            href="/techforce/dashboard"
            className="group block bg-cream-50 rounded-2xl shadow-card hover:shadow-cardHover transition-shadow duration-200 overflow-hidden border border-surface-border hover:border-forest-300 focus:outline-none focus:ring-2 focus:ring-mint-300 motion-reduce:transition-none"
          >
            <div className="h-32 bg-gradient-to-br from-forest-700 to-forest-900 flex items-center px-8">
              <span className="text-cream-50">
                <BriefcaseIcon size={48} />
              </span>
            </div>
            <div className="p-8">
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-forest-900">TechForce</h3>
                <span className="text-xs font-semibold text-success uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-sage-600 mb-6">
                IT staffing marketplace with transparent commission splits.
                Connect customers with verified tech talent end-to-end.
              </p>
              <div className="inline-flex items-center text-forest-700 font-semibold text-sm group-hover:text-forest-900">
                Enter TechForce
                <span className="ml-2 group-hover:translate-x-1 transition-transform motion-reduce:transition-none">
                  <ArrowRightIcon size={16} />
                </span>
              </div>
            </div>
          </Link>

          <div
            className="relative bg-cream-50 rounded-2xl shadow-card overflow-hidden border border-surface-border opacity-85"
            aria-label="TechProject — coming soon"
          >
            <div className="h-32 bg-gradient-to-br from-sage-500 to-sage-600 flex items-center px-8">
              <span className="text-cream-50">
                <BuildingIcon size={48} />
              </span>
            </div>
            <div className="p-8">
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-forest-900">TechProject</h3>
                <span className="text-xs font-semibold text-warning uppercase tracking-wider">
                  Soon
                </span>
              </div>
              <p className="text-sage-600 mb-6">
                Project-based technology delivery marketplace. Outcome-priced
                statements of work for studios, agencies, and vendor teams.
              </p>
              <span className="inline-flex items-center px-3 py-1.5 bg-cream-200 text-sage-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                In development
              </span>
            </div>
            <div className="absolute top-5 right-5 bg-sage-500 text-cream-50 px-3 py-1 rounded-full text-xs font-semibold">
              Coming soon
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── "Everything you need to begin with" ────────────────────────────────────

function BeginWith(): JSX.Element {
  return (
    <section className="bg-gradient-to-b from-cream-50 to-mint-100 py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-forest-900">
            Everything you need to begin
          </h2>
          <p className="mt-3 text-sage-600">
            Two paths into the platform — both lead to your next great match.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <Link
            href="/register"
            className="group relative block h-72 rounded-2xl overflow-hidden border border-surface-border shadow-card hover:shadow-cardHover transition-shadow duration-200 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-mint-300"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-forest-600 via-forest-800 to-forest-900"
            />
            <div aria-hidden className="absolute inset-0 opacity-30">
              <div className="absolute top-12 left-12 w-32 h-32 rounded-full bg-mint-300/40 blur-2xl" />
              <div className="absolute bottom-6 right-12 w-40 h-40 rounded-full bg-cream-200/30 blur-3xl" />
            </div>
            <div className="relative h-full p-8 flex flex-col justify-between text-cream-50">
              <span className="inline-flex w-12 h-12 rounded-xl bg-cream-50/15 backdrop-blur items-center justify-center">
                <SearchIcon size={24} />
              </span>
              <div>
                <h3 className="text-3xl font-bold mb-2">Find a project</h3>
                <p className="text-mint-200 mb-4 max-w-md">
                  Browse open requirements, submit your profile, and get matched
                  to the engagement that fits your skills and rate.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all motion-reduce:transition-none">
                  Join as talent
                  <ArrowRightIcon size={16} />
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/register"
            className="group relative block h-72 rounded-2xl overflow-hidden border border-surface-border shadow-card hover:shadow-cardHover transition-shadow duration-200 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-mint-300"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-cream-200 via-cream-300 to-forest-200"
            />
            <div aria-hidden className="absolute inset-0 opacity-40">
              <div className="absolute top-10 right-10 w-36 h-36 rounded-full bg-mint-300/60 blur-2xl" />
              <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full bg-forest-300/40 blur-3xl" />
            </div>
            <div className="relative h-full p-8 flex flex-col justify-between text-forest-900">
              <span className="inline-flex w-12 h-12 rounded-xl bg-forest-800/10 items-center justify-center text-forest-800">
                <TargetIcon size={24} />
              </span>
              <div>
                <h3 className="text-3xl font-bold mb-2">Find talent</h3>
                <p className="text-forest-700 mb-4 max-w-md">
                  Post a requirement and let our matching engine surface
                  verified candidates from your CRMs, SRMs, and vendor partners.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all motion-reduce:transition-none">
                  Join as customer
                  <ArrowRightIcon size={16} />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Trust strip ────────────────────────────────────────────────────────────

function TrustStrip(): JSX.Element {
  return (
    <section className="bg-forest-800 text-cream-50 py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        <Pillar
          icon={<ShieldIcon size={22} />}
          title="KYC + background checks"
          body="Verified identity and right-to-work on every candidate."
        />
        <Pillar
          icon={<AwardIcon size={22} />}
          title="Transparent splits"
          body="Every party on the value chain sees their slice."
        />
        <Pillar
          icon={<HandshakeIcon size={22} />}
          title="Owned payroll"
          body="W-2 and C2C engagements handled in-platform."
        />
        <Pillar
          icon={<UsersIcon size={22} />}
          title="Multi-role"
          body="One account, every role you play in the marketplace."
        />
      </div>
    </section>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: JSX.Element;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <div>
      <span className="inline-flex w-10 h-10 rounded-lg bg-cream-50/10 items-center justify-center text-mint-200 mb-3">
        {icon}
      </span>
      <p className="font-semibold text-sm text-cream-50">{title}</p>
      <p className="text-xs text-sage-400 mt-1">{body}</p>
    </div>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function SiteFooter(): JSX.Element {
  return (
    <footer className="bg-cream-100 border-t border-surface-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-forest-800 text-mint-200 flex items-center justify-center font-bold text-sm">
            T
          </span>
          <span className="text-sm font-semibold text-forest-900">TechOrbit</span>
        </div>
        <p className="text-xs text-sage-600">
          © {new Date().getFullYear()} TechOrbit. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-sage-600">
          <Link href="/login" className="hover:text-forest-900 transition-colors motion-reduce:transition-none">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-forest-900 transition-colors motion-reduce:transition-none">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  );
}
