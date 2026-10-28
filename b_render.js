/*
  b_render.js · builds the whole page out of SITE (from a_content.js)
  1. I never add content here. Content → a_content.js. This file only draws it.
  2. One function per section. Each returns an HTML string, or "" when there's nothing to show,
     and then the section AND its nav link vanish on their own.
  3. Layout is a plain CV / homepage style: every entry is one row, meta (dates, area) on the left,
     the actual content on the right. No cards, no pills. Reads like a page a person wrote, not a template.
  4. All text gets escaped before it hits the page, so a stray < or & in content can't break the layout.
     Only formatting allowed: **bold** and *italic*.
*/

(function () {

  const SITE = window.SITE;
  const IS_LOCAL = location.protocol === "file:" || ["localhost", "127.0.0.1", ""].includes(location.hostname);
  const problems = [];                       // sections that crashed while rendering (shown in the local warning box)

  // =====================================================================
  // Tiny helpers
  // =====================================================================

  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function fmt(text) {
    // escape first, then my two formatting rules
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function plain(text) {
    // same text with the ** and * stripped (for SEO data)
    return String(text || "").replace(/\*+/g, "");
  }

  function shown(list) {
    // drops anything marked hidden: true, and empty slots
    return Array.isArray(list) ? list.filter(function (item) { return item && !item.hidden; }) : [];
  }

  /*
    Forgiving links:
    1. "" stays "" → that link just isn't drawn.
    2. "github.com/KushmanG/x" (forgot the https://) gets it added, cz I WILL forget it at some point.
    3. Plain file names like "collatz.pdf" are left alone (relative link inside the repo).
  */
  function cleanUrl(url) {
    const u = String(url || "").trim();
    if (u === "") return "";
    if (/^(https?:|mailto:|tel:|#|\/|\.\/)/i.test(u)) return u;
    if (/^www\./i.test(u) || /^([\w-]+\.)+(com|in|io|org|dev|ai|me|net|co|edu|xyz|app)(\/|$)/i.test(u)) return "https://" + u;
    return u;
  }

  function prettyUrl(url) {
    // "https://github.com/KushmanG" → "github.com/KushmanG"
    return cleanUrl(url).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  }

  function openAttrs(url) {
    // external links and PDFs open in a new tab
    return /^https?:/i.test(url) || /\.pdf$/i.test(url) ? ' target="_blank" rel="noopener"' : "";
  }

  function a(label, url, cls) {
    const u = cleanUrl(url);
    return '<a' + (cls ? ' class="' + cls + '"' : "") + ' href="' + esc(u) + '"' + openAttrs(u) + ">" + esc(label) + "</a>";
  }

  // =====================================================================
  // Small building blocks
  // =====================================================================

  function points(list) {
    const items = shown(list);
    if (!items.length) return "";
    return "<ul>" + items.map(function (p) { return "<li>" + fmt(p) + "</li>"; }).join("") + "</ul>";
  }

  function tagLine(list) {
    // tags as one quiet line of text: "PyTorch · CNNs · NumPy"
    const items = shown(list);
    if (!items.length) return "";
    return '<p class="tags">' + items.map(esc).join(" · ") + "</p>";
  }

  function linkLine(list) {
    // only links with a real url get drawn
    const items = shown(list).filter(function (l) { return cleanUrl(l.url) !== ""; });
    if (!items.length) return "";
    return '<p class="links">' + items.map(function (l) { return a((l.label || "Link") + " ↗", l.url); }).join("") + "</p>";
  }

  function entry(meta, body) {
    return '<div class="entry"><div class="meta">' + meta + '</div><div class="body">' + body + "</div></div>";
  }

  // =====================================================================
  // Sections (in page order)
  // =====================================================================

  function renderHero(site) {
    const L = site.links || {};

    // YouTube + Instagram live in the highlighted band right below, so the hero only keeps the quiet links
    const quiet = [];
    if (cleanUrl(L.github))   quiet.push(a("GitHub", L.github));
    if (cleanUrl(L.linkedin)) quiet.push(a("LinkedIn", L.linkedin));
    if (L.email)              quiet.push(a("Email", "mailto:" + String(L.email).trim()));
    if (cleanUrl(L.resume))   quiet.push(a("Résumé", L.resume));

    return `
      <h1>${esc(site.name)}</h1>
      ${site.heroNote ? '<p class="hand-note">' + esc(site.heroNote) + "</p>" : ""}
      <p class="designation">${esc(site.designation)}${shown(site.interests).length ? ' <span class="sep">/</span> ' + shown(site.interests).map(esc).join(" · ") : ""}</p>
      ${site.tagline ? '<p class="tagline">' + fmt(site.tagline) + "</p>" : ""}
      ${quiet.length ? '<p class="hero-quiet">' + quiet.join("") + "</p>" : ""}`;
  }

  function renderChannels(site) {
    /*
      The highlighted band right under the hero.
      1. YouTube + Instagram hold most of the "watch me build" stuff, so they get their own row before anything else.
      2. Each platform gets its colour as a thick bar on the left. Colour only, no logos.
    */
    const items = shown(site.channels).filter(function (c) { return cleanUrl(c.url) !== ""; });
    if (!items.length) return "";
    return '<div class="channels">' + items.map(function (c) {
      const kind = /you\s*tube/i.test(c.platform) ? "yt" : /insta/i.test(c.platform) ? "ig" : "other";
      const verb = kind === "yt" ? "Watch on YouTube" : kind === "ig" ? "Follow on Instagram" : "Open";
      const url = cleanUrl(c.url);
      return '<a class="channel ch-' + kind + '" href="' + esc(url) + '"' + openAttrs(url) + ">" +
        '<span class="ch-platform">' + esc(c.platform) + "</span>" +
        '<span class="ch-handle">' + esc(c.handle || prettyUrl(url)) + "</span>" +
        (c.blurb ? '<span class="ch-blurb">' + fmt(c.blurb) + "</span>" : "") +
        '<span class="ch-cta">' + verb + " →</span></a>";
    }).join("") + "</div>";
  }

  function renderExperience(site) {
    return shown(site.experience).map(function (e) {
      return entry(
        esc(e.dates) + (e.place ? "<br>" + esc(e.place) : ""),
        "<h3>" + esc(e.role) + "</h3>" + '<p class="sub">' + esc(e.org) + "</p>" + points(e.points) + tagLine(e.tags) + linkLine(e.links)
      );
    }).join("");
  }

  function renderEducation(site) {
    return shown(site.education).map(function (e) {
      const course = shown(e.coursework);
      return entry(
        esc(e.dates) + (e.place ? "<br>" + esc(e.place) : ""),
        "<h3>" + esc(e.school) + "</h3>" + '<p class="sub">' + esc(e.degree) + "</p>" + points(e.points) +
        (course.length ? '<p class="tags"><span class="label">Coursework:</span> ' + course.map(esc).join(" · ") + "</p>" : "")
      );
    }).join("");
  }

  function renderResearch(site) {
    return shown(site.research).map(function (r) {
      const pipe = shown(r.pipeline);
      const flow = pipe.length ? '<p class="flow">' + pipe.map(function (p) { return "<span>" + fmt(typeof p === "string" ? p : p.step) + "</span>"; }).join('<span class="arrow">→</span>') + "</p>" : "";
      return entry(
        esc(r.year || "") + (r.area ? "<br>" + esc(r.area) : ""),
        "<h3>" + fmt(r.title) + "</h3>" + flow + points(r.points) + tagLine(r.tags) + linkLine(r.links)
      );
    }).join("");
  }

  function renderProjects(site) {
    return shown(site.projects).map(function (p) {
      return entry(
        esc(p.category || "") + (p.year ? "<br>" + esc(p.year) : ""),
        "<h3>" + fmt(p.title) + (p.subtitle ? ' <span class="h3-sub">· ' + fmt(p.subtitle) + "</span>" : "") + "</h3>" +
        points(p.points) + tagLine(p.tags) + linkLine(p.links)
      );
    }).join("");
  }

  function renderAchievements(site) {
    return shown(site.achievements).map(function (x) {
      return entry(
        '<span class="metric">' + fmt(x.metric) + "</span>",
        "<h3>" + fmt(x.title) + "</h3>" + (x.detail ? '<p class="sub">' + fmt(x.detail) + "</p>" : "") + linkLine(x.links)
      );
    }).join("");
  }

  function renderSkills(site) {
    return shown(site.skills).map(function (g) {
      return entry(esc(g.group), '<p class="skill-items">' + shown(g.items).map(esc).join(" · ") + "</p>");
    }).join("");
  }

  function renderContact(site) {
    /*
      Contact rows:
      1. Everything in `links` shows up here automatically, YouTube + Instagram first cz they matter most.
      2. Anything in contact.extra gets appended (Kaggle, X, whatever).
    */
    const L = site.links || {};
    const c = site.contact || {};
    const rows = [];
    if (cleanUrl(L.youtube))   rows.push(["YouTube",   prettyUrl(L.youtube),   cleanUrl(L.youtube)]);
    if (cleanUrl(L.instagram)) rows.push(["Instagram", prettyUrl(L.instagram), cleanUrl(L.instagram)]);
    if (L.email)               rows.push(["Email",     L.email,                "mailto:" + String(L.email).trim()]);
    if (L.phone)               rows.push(["Phone",     L.phone,                "tel:" + String(L.phone).replace(/[^\d+]/g, "")]);
    if (cleanUrl(L.github))    rows.push(["GitHub",    prettyUrl(L.github),    cleanUrl(L.github)]);
    if (cleanUrl(L.linkedin))  rows.push(["LinkedIn",  prettyUrl(L.linkedin),  cleanUrl(L.linkedin)]);
    if (cleanUrl(L.resume))    rows.push(["Résumé",    "Download PDF",         cleanUrl(L.resume)]);
    shown(c.extra).forEach(function (x) { rows.push([x.label, x.value || prettyUrl(x.url), cleanUrl(x.url)]); });
    if (!rows.length && !c.heading) return "";

    return (c.heading ? '<p class="contact-head">' + fmt(c.heading) + "</p>" : "") +
      rows.map(function (r) {
        return entry(esc(r[0]), r[2] ? '<p class="contact-value">' + a(r[1], r[2]) + "</p>" : '<p class="contact-value">' + esc(r[1]) + "</p>");
      }).join("");
  }

  // id, nav label, section title, builder. Reorder this list = reorder the page.
  const SECTIONS = [
    ["channels",     "",             "",                renderChannels],     // no title, no nav link: it's the highlighted band
    ["experience",   "experience",   "Experience",      renderExperience],
    ["education",    "",             "Education",       renderEducation],
    ["research",     "research",     "Research",        renderResearch],
    ["projects",     "projects",     "Projects",        renderProjects],
    ["achievements", "achievements", "Achievements",    renderAchievements],
    ["skills",       "skills",       "Skills",          renderSkills],
    ["contact",      "contact",      "Contact",         renderContact],
  ];

  // =====================================================================
  // Content check, my validation ladder but for the website
  // =====================================================================
  /*
    1. Each flag tests one thing about SITE and prints PASS / FAIL in the browser console.
    2. Returns the list of failed flags (empty list = everything passed); the names also get printed at the end.
    3. When I preview locally (double-clicked index.html), failures also pop up as a red box on the page.
       On the live site they only go to the console, so visitors never see it.
  */
  function checkContent(site) {
    const all_flags = [];
    function flag(name, passed) {
      all_flags.push([name, passed]);
      console.log(name + ": " + (passed ? "PASS" : "FAIL"));
    }

    console.log("===================== content check =====================");
    flag("flag1 a_content.js loaded", !!site);
    if (site) {
      const lists = ["interests", "channels", "experience", "education", "research", "projects", "achievements", "skills"];
      flag("flag2 name is filled in", typeof site.name === "string" && site.name.trim() !== "");
      flag("flag3 every list is still a [ ] list", lists.every(function (k) { return site[k] === undefined || Array.isArray(site[k]); }));
      flag("flag4 every research item and project has a title", shown(site.research).concat(shown(site.projects)).every(function (p) { return !!p.title; }));
      flag("flag5 every achievement has a metric and a title", shown(site.achievements).every(function (x) { return !!x.metric && !!x.title; }));
      flag("flag6 every skill group has an items list", shown(site.skills).every(function (g) { return Array.isArray(g.items); }));
    }

    const failed = all_flags.filter(function (f) { return !f[1]; }).map(function (f) { return f[0]; });
    console.log("=========================================================");
    if (failed.length) console.log("Failed: " + failed.join(", "));
    return failed;
  }

  // =====================================================================
  // Wiring: nav, SEO data, warning boxes
  // =====================================================================

  function wireNav() {
    const nav = document.getElementById("nav");
    function onScroll() { nav.classList.toggle("solid", window.scrollY > 40); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function addPersonSchema(site) {
    // structured data so Google knows exactly who this page is about (part of my "Kushman" SEO plan)
    const L = site.links || {};
    const school = shown(site.education)[0];
    const data = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: site.name,
      url: location.protocol.startsWith("http") ? location.origin + location.pathname : undefined,
      description: plain(site.tagline),
      jobTitle: site.designation,
      knowsAbout: shown(site.interests),
      sameAs: [L.github, L.linkedin, L.youtube, L.instagram].map(cleanUrl).filter(Boolean),
      affiliation: school ? { "@type": "CollegeOrUniversity", name: school.school } : undefined,
    };
    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.textContent = JSON.stringify(data);
    document.head.appendChild(tag);
  }

  function showBroken() {
    // a_content.js didn't even load → say so instead of showing a blank page
    document.getElementById("main").innerHTML =
      '<div class="broken"><strong>a_content.js didn\'t load.</strong> Almost always a missing comma or quote. ' +
      "Open the browser console (Cmd + Option + J): it names the exact line.</div>";
  }

  function showWarning(failed) {
    const box = document.createElement("div");
    box.className = "warn";
    box.innerHTML = "<strong>Content check (only visible locally)</strong>" + failed.map(function (f) { return "<div>✗ " + esc(f) + "</div>"; }).join("");
    document.body.appendChild(box);
  }

  // =====================================================================
  // Build the page
  // =====================================================================

  function render() {
    const failed = checkContent(SITE);
    if (!SITE) { showBroken(); return; }

    document.getElementById("hero").innerHTML = renderHero(SITE);

    // Step 1: build every section; a section that crashes is skipped instead of killing the whole page
    const built = [];
    SECTIONS.forEach(function (s) {
      let inner = "";
      try { inner = s[3](SITE); }
      catch (err) { console.error("Section '" + s[0] + "' failed to render:", err); problems.push("section '" + s[0] + "' crashed (see console)"); }
      if (!inner) return;
      built.push({
        id: s[0],
        nav: s[1],
        html: '<section class="section sec-' + s[0] + '" id="' + s[0] + '">' + (s[2] ? "<h2><span>" + esc(s[2]) + "</span></h2>" : "") + inner + "</section>",
      });
    });

    // Step 2: drop everything into the page
    document.getElementById("main").innerHTML = built.map(function (b) { return b.html; }).join("");
    document.getElementById("navLinks").innerHTML = built.filter(function (b) { return b.nav; }).map(function (b) { return '<a href="#' + b.id + '">' + esc(b.nav) + "</a>"; }).join("");
    document.getElementById("navMark").textContent = SITE.name || "";
    document.getElementById("footer").innerHTML = "<span>© " + new Date().getFullYear() + " " + esc(SITE.name) + "</span>" + (SITE.footnote ? "<span>" + fmt(SITE.footnote) + "</span>" : "");

    // Step 3: extras
    addPersonSchema(SITE);
    wireNav();
    const issues = failed.concat(problems);
    if (issues.length && IS_LOCAL) showWarning(issues);
  }

  render();

})();

/*
  Learning Notes:
  1. Why JS-rendered and not plain HTML? So content and layout never mix. Adding a project = adding 10 lines of
     data in a_content.js, never touching markup. Google runs JavaScript before indexing, so SEO is fine, and the
     <title> + description in index.html are plain HTML anyway (those are what link previews read).
  2. Why escape everything? If content went in raw, one "<" in a project description would open a broken tag
     and eat half the page. esc() turns it into harmless text; fmt() then adds back only the two formats I allow.
  3. Why a script file (a_content.js) and not a .json file? Browsers block fetch() of local files when I just
     double-click index.html, a <script src> isn't blocked. Bonus: JS allows comments and trailing commas, JSON doesn't.
*/

// Program Completed
