export interface CompanyVacancy {
  id: string;
  name: string;
  tagline: string;
  logoLetter: string;
  logoBg: string;
  roleTitle: string;
  department: string;
  location: string;
  term: string;
  stipend: string;
  fundingStage: string;
  teamSize: string;
  postedDate: string;
  aboutCompany: string;
  roleOverview: string;
  responsibilities: string[];
  qualifications: string[];
  bonusPoints: string[];
  perks: string[];
  techStack: string[];
  screeningPrompt: string;
}

export const SIMULATION_COMPANIES: CompanyVacancy[] = [
  {
    id: "novasphere",
    name: "NovaSphere AI",
    tagline: "Autonomous Distributed Intelligence & Edge Cloud Infrastructure",
    logoLetter: "N",
    logoBg: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    roleTitle: "Software Engineering Intern — AI Infrastructure & Distributed Systems",
    department: "Core Systems & Platform Engineering",
    location: "100% Remote (Worldwide / US & Global Timezones)",
    term: "Summer / Fall 2026 (4 – 6 Months, Flexible)",
    stipend: "$5,400 / month + $1,200 Remote Workspace Grant",
    fundingStage: "Series B ($48M Raised)",
    teamSize: "65 Distributed Engineers",
    postedDate: "2 days ago",
    aboutCompany:
      "NovaSphere AI builds high-performance distributed orchestration engines for next-generation foundation models. Our edge cloud infrastructure processes over 4 billion inference and background compute operations daily across 30 geographic regions.",
    roleOverview:
      "As a Software Engineering Intern on the AI Infrastructure team, you will collaborate directly with senior distributed systems engineers to architect, optimize, and scale low-latency backend pipelines, autonomous worker pools, and developer APIs.",
    responsibilities: [
      "Design and implement high-throughput asynchronous microservices in TypeScript, Go, or Python.",
      "Optimize real-time telemetry streaming pipelines and PostgreSQL / Redis query performance under concurrent load.",
      "Build developer-facing CLI tools and SDK interfaces to improve deployment automation.",
      "Participate in architecture design reviews, blameless post-mortems, and bi-weekly production releases.",
      "Work directly with our autonomous agent and autopilot telemetry pipelines to enhance execution reliability."
    ],
    qualifications: [
      "Currently pursuing a BS, MS, or self-directed degree in Computer Science, Software Engineering, or related technical field.",
      "Solid proficiency in modern TypeScript/JavaScript, Python, or Go.",
      "Understanding of REST APIs, asynchronous programming, and relational databases (PostgreSQL, SQLite, or similar).",
      "Comfort with Git workflows, pull requests, and modern CI/CD development practices.",
      "Self-directed communicator who thrives in an asynchronous, remote-first engineering culture."
    ],
    bonusPoints: [
      "Experience with Next.js, React, Docker, or Kubernetes.",
      "Familiarity with distributed message brokers like Kafka, RabbitMQ, or Redis Streams.",
      "Past contributions to open-source software, hackathons, or demonstrable side-projects."
    ],
    perks: [
      "Competitive monthly stipend ($5,400/mo) with full-time return offer potential.",
      "$1,200 home-office equipment budget (monitor, desk, accessories).",
      "1-on-1 dedicated senior staff mentorship and weekly pairing sessions.",
      "Flexible working hours across all global timezones.",
      "Access to internal GPU clusters, AI credits, and state-of-the-art developer tooling."
    ],
    techStack: ["TypeScript", "Next.js", "Python", "PostgreSQL", "Redis", "Docker", "AWS", "LLM APIs"],
    screeningPrompt: "Describe an interesting technical bug or architectural trade-off you encountered in a recent project. How did you diagnose and resolve it?"
  },
  {
    id: "aetheria",
    name: "Aetheria Cloud",
    tagline: "Next-Generation Serverless Observability & Autonomous Runtime",
    logoLetter: "A",
    logoBg: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
    roleTitle: "Full-Stack Software Engineering Intern — Product & Runtime UX",
    department: "Product Engineering & Cloud Console",
    location: "100% Remote (Global)",
    term: "Summer / Fall 2026 (4 Months)",
    stipend: "$5,100 / month + Hardware Allowance",
    fundingStage: "Series A ($22M Raised)",
    teamSize: "40 Engineers & Designers",
    postedDate: "Just now",
    aboutCompany:
      "Aetheria Cloud provides real-time observability, tracing, and autonomous self-healing for cloud-native microservices. Over 1,500 enterprise engineering teams use Aetheria to monitor latency anomalies.",
    roleOverview:
      "You will build responsive, high-performance web applications and interactive observability dashboards using React, Next.js, and modern real-time WebSocket pipelines.",
    responsibilities: [
      "Build dynamic data visualization components, telemetry charts, and interactive canvas graphs.",
      "Develop end-to-end features spanning React frontend components to Node.js / edge API endpoints.",
      "Ensure web performance scores exceed 95+ through code splitting, caching, and bundle optimization.",
      "Collaborate closely with product managers and design leads on user experience flows."
    ],
    qualifications: [
      "Experience building responsive web applications using React or Next.js with modern CSS.",
      "Understanding of state management, browser storage APIs, and client-server synchronization.",
      "Passion for crafting clean, accessible, and delight-inducing user interfaces."
    ],
    bonusPoints: [
      "Experience with TailwindCSS, Tailwind animations, or WebGL / SVG canvas charts.",
      "Knowledge of browser extensions or Chrome Manifest V3 APIs."
    ],
    perks: [
      "$5,100 / month stipend with performance-based bonuses.",
      "MacBook Pro provided + $1,000 remote setup stipend.",
      "Direct code ownership with features deployed to thousands of production users."
    ],
    techStack: ["React", "Next.js", "TailwindCSS", "Node.js", "GraphQL", "WebSockets"],
    screeningPrompt: "What is your favorite web application interface, and what subtle UX or performance detail makes it stand out to you?"
  },
  {
    id: "pulsegrid",
    name: "PulseGrid Robotics",
    tagline: "Autonomous Fleet Orchestration & Real-Time Distributed Telemetry",
    logoLetter: "P",
    logoBg: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    roleTitle: "Systems & Backend Engineering Intern — Fleet Telemetry (Remote)",
    department: "Fleet OS & Cloud Telemetry",
    location: "100% Remote (Worldwide)",
    term: "Flexible 4 – 6 Months",
    stipend: "$5,600 / month + Relocation/Home-Office Grant",
    fundingStage: "Series B ($60M Raised)",
    teamSize: "90 Engineers",
    postedDate: "3 days ago",
    aboutCompany:
      "PulseGrid builds the autonomous operating system for next-gen warehouse robotics and logistics facilities across North America and Europe.",
    roleOverview:
      "Join our core fleet telemetry team to build distributed backend systems handling millisecond-level telemetry packets from thousands of mobile industrial robots.",
    responsibilities: [
      "Implement resilient message ingestion handlers with fault tolerance and automatic backpressure.",
      "Author integration tests, automated benchmarks, and monitoring alarms for mission-critical services.",
      "Investigate bottlenecks across networking protocols and database writes."
    ],
    qualifications: [
      "Foundational understanding of concurrency, data structures, and computer networking (TCP/UDP, HTTP).",
      "Hands-on experience in either Python, Go, Rust, or C++.",
      "Curiosity about robotics, hardware interfaces, or large-scale backend systems."
    ],
    bonusPoints: [
      "Prior experience with MQTT, gRPC, or Protocol Buffers.",
      "Contributions to university engineering clubs or robotics competitions."
    ],
    perks: [
      "Top-tier compensation ($5,600/month).",
      "Sponsored access to technical conferences and learning courses.",
      "Fast-track conversion to full-time Associate Systems Engineer."
    ],
    techStack: ["Go", "Python", "gRPC", "TimescaleDB", "Docker", "Prometheus"],
    screeningPrompt: "Tell us about a time you optimized code execution speed or solved a tricky concurrency/networking bug."
  }
];
