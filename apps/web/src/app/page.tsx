'use client';

import { NavBar, PageHeader, InfoStrip, ProgressCard, Button, Card, CardBody, CardHeader, CardTitle } from '@techorbit/ui';

function BriefcaseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream-100">
      <NavBar
        logoText="Techorbit"
        userName="Hemant"
        notificationCount={3}
        links={[
          { label: 'Home', href: '/', active: true },
          { label: 'Requirements', href: '/requirements' },
          { label: 'Candidates', href: '/candidates' },
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-12">
        <PageHeader
          icon={<BriefcaseIcon />}
          title="Welcome to Techorbit"
          subtitle="US IT Staffing Marketplace"
          actions={<Button variant="primary">Get Started</Button>}
        />

        <InfoStrip
          items={[
            { icon: <UserIcon />, label: 'Role', value: 'ENTREPRENEUR' },
            { icon: <GlobeIcon />, label: 'Market', value: 'US IT Staffing' },
          ]}
        />

        <div className="mt-8 grid gap-6">
          <ProgressCard
            title="Onboarding Progress"
            totalSteps={4}
            completedSteps={2}
            steps={[
              { label: 'Email verified', icon: <MailIcon />, status: 'complete' },
              { label: 'ID verification', icon: <ShieldIcon />, status: 'complete' },
              { label: 'Resume uploaded', icon: <FileTextIcon />, status: 'pending' },
              { label: 'Profile complete', icon: <UserIcon />, status: 'pending' },
            ]}
          />

          <Card>
            <CardBody>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <p className="text-base text-forest-800">
                Welcome to Techorbit! This platform connects IT professionals with opportunities
                across the United States. Get started by completing your profile and exploring
                available requirements.
              </p>
              <div className="mt-4 flex gap-3">
                <Button variant="primary">Create Profile</Button>
                <Button variant="secondary">Browse Requirements</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}