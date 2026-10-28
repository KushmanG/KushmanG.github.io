/*
  =====================================================================
  a_content.js  ·  EVERY word on my site lives in this file
  =====================================================================
  How I edit the site (no Claude needed):
  1. Change any text inside the "quotes". Save. Done.
  2. ADD a project / research item / achievement / anything in a [ ] list:
     copy one whole { ... }, block, paste it right below, change the text.
     Keep the comma after the closing }   ← 90% of breakages are a missing comma lol
  3. HIDE something without deleting it: put   hidden: true,   inside its { }.
  4. A link left as "" just doesn't show up. So I can keep empty slots ready (Paper, Résumé).
  5. Formatting inside any text: **bold** → bold, *italic* → italic. That's all.
  6. Files (PDFs etc.): drop them next to index.html, then link them by name, e.g. url: "collatz.pdf".
  7. Preview: double-click index.html.  Publish: git add .  →  git commit -m "update"  →  git push  (live in ~1 min).
     index.html always fetches the newest copy of this file, so no stale-cache problem after a push.

  If the page goes blank or a red box shows up: I broke a comma or a quote.
  Open the browser console (Cmd + Option + J), it names the exact line.

  Only thing NOT in here: the text Google / WhatsApp / LinkedIn previews show → top of index.html (<title>, description).
*/

window.SITE = {

  // ---------------- Hero (top of the page) ----------------
  name: "Kushman Goyal",
  designation: "CSE Undergraduate · IIIT Bangalore",
  interests: ["AI / ML", "Physics"],
  tagline: "Computer science by profession, Physics by passion.",

  // ---------------- My links (hero, channels band and contact all read from here) ----------------
  links: {
    email:     "kushman.goyal@iiitb.ac.in",
    phone:     "+91 98166 78887",               // set to "" to take it off the public site
    github:    "https://github.com/KushmanG",
    linkedin:  "https://www.linkedin.com/in/kushman-goyal-93b512376/",
    instagram: "https://www.instagram.com/kushmangoyal/",
    youtube:   "https://www.youtube.com/@KushmanGoyal",
    resume:    "",                               // drop resume.pdf next to index.html, then write "resume.pdf"
  },

  // ---------------- YouTube + Instagram, the highlighted band right under the hero ----------------
  channels: [
    {
      platform: "YouTube",
      handle:   "@KushmanGoyal",
      url:      "https://www.youtube.com/@KushmanGoyal",
      blurb:    "Build logs and explainers on my projects, from physics engines to ML.",   // TODO: say it in my own words
    },
    {
      platform: "Instagram",
      handle:   "@kushmangoyal",
      url:      "https://www.instagram.com/kushmangoyal/",
      blurb:    "Short updates on what I'm building and learning.",                         // TODO: say it in my own words
    },
  ],

  // ---------------- Experience ----------------
  experience: [
    {
      role:  "Research Intern",
      org:   "CPP-IPR · Centre of Plasma Physics, Institute for Plasma Research",
      place: "Guwahati, Assam",
      dates: "Jun – Jul 2026",
      points: [
        "Built a **plasma molecular-dynamics engine** from scratch (Python, NumPy)",
        "Developed **ML tools (CNNs, PyTorch)** to infer coupling Γ and screening κ from simulation data",
        "Continuing as an independent **research paper**",
      ],
      tags:  ["Python", "NumPy", "PyTorch", "Simulation"],
      links: [],
    },
  ],

  // ---------------- Education ----------------
  education: [
    {
      degree: "B.Tech, Computer Science & Engineering",
      school: "International Institute of Information Technology, Bangalore",
      dates:  "2025 – 2029",
      coursework: ["Optimization", "Linear Algebra", "Probability & Statistics", "Data Structures & Algorithms", "Discrete Mathematics", "Operating Systems"],
    },
  ],

  // ---------------- Research ----------------
  research: [
    {
      title:  "CNNs that read plasma physics off a single snapshot",
      area:   "ML for physics",
      year:   "2026 · paper in preparation",
      points: [
        "**Question:** how much physics can a CNN read from one static frame, beyond the classical g(r)?",
        "**Task:** infer coupling Γ and screening κ *jointly* (prior work fixes Γ)",
        "**Model:** PyTorch CNN, circular padding for periodic boundaries, global average pooling, one network per parameter",
        "**Baseline:** classical g(r) fitting, so gains must be real signal",
      ],
      // optional: the pipeline, drawn as one line of steps
      pipeline: ["Simulate (my MD engine)", "Snapshot", "Rasterize", "CNN", "Γ, κ"],
      tags:  ["PyTorch", "CNNs", "NumPy", "Molecular dynamics"],
      links: [
        { label: "Simulator code", url: "https://github.com/KushmanG/Yukawa-Dusty-Plasma-Molecular-Dynamics-Engine" },
        { label: "CNN code",       url: "https://github.com/KushmanG/YDP-Convolutional-Neural-Network" },
        { label: "Datasets",       url: "https://github.com/KushmanG/YDP-Datasets" },
        { label: "Paper",          url: "" },     // arXiv link goes here once it's up
      ],
    },
    {
      title:  "Halving Count Structure of Odd Integers in the Collatz Problem",
      area:   "Mathematics",
      year:   "Independent",
      points: [
        "Reduce Collatz to the odd numbers, then study the odd-to-odd map **f(x) = (3x + 1) / 2^(n(x)+1)**",
        "Show the odd numbers split exactly into **arithmetic progressions**, one per halving count n, with no shared terms",
        "~1 year and ~200 pages of notes, worked on alone",
      ],
      tags:  ["Number theory", "Discrete dynamics"],
      links: [
        { label: "Read the paper (PDF)", url: "collatz.pdf" },
      ],
    },
  ],

  // ---------------- Projects ----------------
  projects: [
    {
      title:    "RAGCB",
      subtitle: "RAG ChatBot Builder",
      category: "AI · LLMs",
      points: [
        "Add a **retrieval-augmented chatbot** to any site with a **one-line embed**",
        "Bring-your-own LLM API key",
        "Core being released **open-source**",
      ],
      tags:  ["RAG", "LLMs", "Web"],
      links: [{ label: "GitHub", url: "https://github.com/KushmanG/RAG-ChatBot-Builder" }],
    },
    {
      title:    "Orbit fitting",
      subtitle: "Orbit determination from telescope data",
      category: "Optimization",
      points: [
        "**Least-squares** orbit fit to telescope RA / Dec observations",
        "**Convex vs non-convex** formulations on the same data",
        "Team project with Siddharth Arya & Manvik Kumar Gupta",
      ],
      tags:  ["Optimization", "Astronomy"],
      links: [{ label: "GitHub", url: "https://github.com/KushmanG/Orbit-Fitting-using-Telescopic-Data" }],
    },
    {
      title:    "NLDL",
      subtitle: "A programming language for nonlinear dynamics",
      category: "Compilers · C++",
      points: [
        "A language for **physics & nonlinear-dynamics** systems (.nldl files)",
        "**Compiler written from scratch in C++**",
        "Roadmap: integrators, simulator blocks, plotting, bifurcation tools",
      ],
      tags:  ["C++", "Compilers", "DSL"],
      links: [{ label: "GitHub", url: "https://github.com/KushmanG/NLD-Programming-Language" }],
    },
  ],

  // ---------------- Achievements (metric = the bold bit on the left) ----------------
  achievements: [
    { metric: "Gold",     title: "WorldQuant BRAIN",                 detail: "Invited for a Quant Research Consultant role" },
    { metric: "Round 2",  title: "International Quant Championship", detail: "Qualified for the 2nd round of WorldQuant's IQC 2026" },
    { metric: "Selected", title: "AICTE IDE Bootcamp",               detail: "3rd edition · national innovation & entrepreneurship bootcamp" },
    { metric: "AIR 5326", title: "JEE Main",                         detail: "All India Rank · NSEP qualifier (physics olympiad)" },
  ],

  // ---------------- Skill toolkit ----------------
  skills: [
    { group: "AI / ML",               items: ["PyTorch", "Neural Networks", "RAG"] },
    { group: "Languages & libraries", items: ["Python", "C++", "NumPy", "SciPy"] },
    { group: "Build & ship",          items: ["Clerk / Firebase (auth)", "Supabase (database)", "Railway / Vercel (deploy)", "Claude Code"] },
    { group: "Things I've built",     items: ["Physics engines", "Neural Networks", "Web apps"] },
  ],

  // ---------------- Contact ----------------
  // Email / phone / GitHub / LinkedIn / YouTube / Instagram / résumé come from `links` above automatically.
  contact: {
    heading: "Open to AI/ML internships and research collaborations.",
    extra: [
      // any other channel, same shape:
      // { label: "Kaggle", value: "kushmang", url: "https://www.kaggle.com/kushmang" },
    ],
  },

};

// Program Completed
