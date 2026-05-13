/**
 * Controlled vocabulary of tech-stack tags used across requirements
 * and candidate profiles.
 *
 * Kept as a literal tuple so downstream code gets a strict union type
 * (`TechStack`) via `typeof TECH_STACK_OPTIONS[number]`. Admin-managed
 * taxonomy (user-contributed skills) is a post-v1 concern.
 */
export const TECH_STACK_OPTIONS = [
  // Frontend
  "React",
  "Vue",
  "Angular",
  "Svelte",
  "Next.js",
  "TypeScript",

  // Backend languages
  "Node.js",
  "Python",
  "Java",
  "Go",
  "C#",
  ".NET",
  "Ruby",
  "PHP",

  // Frameworks
  "Spring Boot",
  "Django",
  "Flask",
  "Express",
  "FastAPI",
  "Rails",

  // Databases
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Cassandra",
  "DynamoDB",

  // Cloud / infra
  "AWS",
  "GCP",
  "Azure",
  "Kubernetes",
  "Docker",
  "Terraform",

  // Practices
  "GraphQL",
  "REST APIs",
  "Microservices",
  "CI/CD",
  "Linux",
] as const;

export type TechStack = (typeof TECH_STACK_OPTIONS)[number];
