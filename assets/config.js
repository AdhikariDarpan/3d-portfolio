export const CONFIG = {
  avatar: {
    glbUrl: '', // Set a GLB URL for a realistic avatar. Free options:
               //   - https://sketchfab.com/3d-models/... (download and place in assets/)
               //   - https://avaturn.me/ (export as GLB)
               //   - Search "free male character glb" on Sketchfab
    usePhotoTexture: true, // Falls back to photo-textured character if no GLB
    faceImage: 'images/front-img.webp',
    coatImage: 'images/coat-img.webp',
    fallbackColor: 0x8b5cf6,
  },
  scene: {
    backgroundColor: 0x89c4e1,
  },
  panels: {
    about: {
      pos: [-8, 1.5, -6],
      rot: [0, 0.785, 0],
      label: '// ABOUT',
      title: 'Building intelligent digital systems',
      content: `Hey, I'm <strong>Darpan Adhikari</strong> — a developer working across web, mobile, desktop, and AI-driven applications. 5+ years building scalable products from pixel-perfect UIs to rock-solid backend systems.`,
      stats: [
        { value: '50+', label: 'Projects' },
        { value: '5', label: 'Years' },
        { value: '30+', label: 'Clients' },
      ],
    },
    skills: {
      pos: [8, 1.5, -6],
      rot: [0, -0.785, 0],
      label: '// TECH STACK',
      title: 'Tools & Technologies',
      tabs: ['frontend', 'backend', 'cloud', 'tools'],
    },
    projects: {
      pos: [-8, 1.5, 6],
      rot: [0, 0.785, 0],
      label: '// FEATURED WORK',
      title: 'Selected Projects',
    },
    contact: {
      pos: [8, 1.5, 6],
      rot: [0, -0.785, 0],
      label: "// LET'S CONNECT",
      title: 'Got a project in mind?',
      content: 'Currently available for freelance & remote roles. Response within 24 hours.',
      links: [
        { icon: '✉', text: 'darpand263@gmail.com', url: 'mailto:darpand263@gmail.com' },
        { icon: 'in', text: 'LinkedIn', url: 'https://www.linkedin.com/in/darpan-adhikari-81b866280/', external: true },
        { icon: '⬡', text: 'GitHub', url: 'https://github.com/DarpanAdhikari', external: true },
      ],
    },
  },
  dialogue: {
    welcome: [
      "Welcome to my interactive portfolio — feel free to explore.",
      "Click any billboard to learn more about my work.",
    ],
    about: [
      "Let me tell you what I do.",
      "I build full-stack applications, AI tools, mobile apps, and desktop software.",
      "5+ years of turning ideas into production systems.",
    ],
    skills: [
      "Here's my tech stack.",
      "Frontend: React, TypeScript, Three.js, Vue, Tailwind.",
      "Backend: Node.js, Python, PHP, Go, databases.",
      "Cloud: AWS, Docker, Kubernetes, CI/CD pipelines.",
      "Click the tabs to see more.",
    ],
    projects: [
      "These are some projects I've built.",
      "Click any card to see features and tech details.",
      "From news platforms to AI tools to mobile apps.",
    ],
    contact: [
      "Want to work together?",
      "I'm available for freelance and remote roles.",
      "Drop me a message — I reply within 24 hours.",
    ],
    idle: [
      "Take your time looking around.",
      "Click a panel whenever you're ready.",
      "I'll be here if you need anything.",
    ],
  },
  performance: {
    high: {
      bloom: true,
      shadows: true,
      particles: 3000,
      geometryDetail: 'high',
      antialias: true,
    },
    medium: {
      bloom: true,
      shadows: false,
      particles: 1500,
      geometryDetail: 'medium',
      antialias: true,
    },
    low: {
      bloom: false,
      shadows: false,
      particles: 500,
      geometryDetail: 'low',
      antialias: false,
    },
  },
};