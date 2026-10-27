/*
  b_render.js · builds the whole page out of SITE (from a_content.js)
  1. I never add content here. Content → a_content.js. This file only draws it.
  2. One function per section. Each returns an HTML string, or "" when there's nothing to show,
     and then the section AND its nav link vanish on their own. Section numbers (01, 02...) re-count themselves.
  3. All text gets escaped before it hits the page, so a stray < or & in content can't break the layout.
     Only formatting allowed: **bold** and *orange italic*.
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
    1. "" stays "" → that button just isn't drawn.
    2. "github.com/KushmanG/x" (forgot the https://) gets it added, cz I WILL forget it at some point.
    3. Plain file names like "resume.pdf" are left alone (relative link inside the repo).
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
    // external links open in a new tab
    return /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : "";
  }

  function statusKind(status) {
    // the pill colour comes from the words in the status, so I can write any status I want
    const s = String(status || "").toLowerCase();
    if (/idea|planned|soon|exploring/.test(s)) return "idea";                               // grey, dashed
    if (/publish|done|complete|shipped|live|written|accepted/.test(s)) return "done";        // blue
    return "active";                                                                          // orange = in progress
  }

  // =====================================================================
  // Small building blocks used by many sections
  // =====================================================================

  function pill(status) {
    if (!status) return "";
    return '<span class="pill s-' + statusKind(status) + '">' + esc(status) + "</span>";
  }

  function points(list) {
    const items = shown(list);
    if (!items.length) return "";
    return '<ul class="points">' + items.map(function (p) { return "<li>" + fmt(p) + "</li>"; }).join("") + "</ul>";
  }

  function chips(list, cls) {
    const items = shown(list);
    if (!items.length) return "";
    return '<div class="' + (cls || "tags") + '">' + items.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>";
  }

  function linkButtons(list) {
    // only links with a real url get a button
    const items = shown(list).filter(function (l) { return cleanUrl(l.url) !== ""; });
    if (!items.length) return "";
    return '<div class="card-links">' + items.map(function (l) {
      const url = cleanUrl(l.url);
      return '<a class="link-btn" href="' + esc(url) + '"' + openAttrs(url) + ">" + esc(l.label || "Link") + ' <span aria-hidden="true">↗</span></a>';
    }).join("") + "</div>";
  }

  // =====================================================================
  // Sections (in page order)
  // =====================================================================

  function renderHero(site) {
    const words = String(site.name || "").trim().split(/\s+/);
    const last = words.length > 1 ? words.pop() : "";
    const first = words.join(" ");

    const interests = shown(site.interests).map(function (t, i) {
      return '<span class="interest"><i class="c' + (i % 2) + '"></i>' + esc(t) + "</span>";
    }).join("");

    // hero buttons come from links, first one gets the solid style
    const L = site.links || {};
    const buttons = [];
    if (cleanUrl(L.resume))   buttons.push(["Résumé", cleanUrl(L.resume)]);
    if (cleanUrl(L.github))   buttons.push(["GitHub", cleanUrl(L.github)]);
    if (cleanUrl(L.linkedin)) buttons.push(["LinkedIn", cleanUrl(L.linkedin)]);
    if (L.email)              buttons.push(["Email", "mailto:" + String(L.email).trim()]);
    const buttonHtml = buttons.map(function (b, i) {
      return '<a class="btn' + (i === 0 ? " primary" : "") + '" href="' + esc(b[1]) + '"' + openAttrs(b[1]) + ">" + esc(b[0]) + (/^https?:/i.test(b[1]) ? ' <span aria-hidden="true">↗</span>' : "") + "</a>";
    }).join("");

    return `
      <div class="eyebrow">${esc(site.designation)}</div>
      <h1>${esc(first)}${last ? "<br><em>" + esc(last) + "</em>" : ""}</h1>
      ${interests ? '<div class="interests">' + interests + "</div>" : ""}
      ${site.tagline ? '<p class="tagline">' + fmt(site.tagline) + "</p>" : ""}
      ${buttonHtml ? '<div class="hero-links">' + buttonHtml + "</div>" : ""}`;
  }

  function renderExperience(site) {
    const xp = shown(site.experience);
    const ed = shown(site.education);
    if (!xp.length && !ed.length) return "";

    const xpHtml = xp.map(function (e) {
      return `
        <article class="card">
          <div class="card-top"><h3>${esc(e.role)}</h3><span class="date">${esc(e.dates)}</span></div>
          <div class="where">${esc(e.org)}</div>
          ${e.place ? '<div class="place">' + esc(e.place) + "</div>" : ""}
          ${points(e.points)}
          ${chips(e.tags)}
          ${linkButtons(e.links)}
        </article>`;
    }).join("");

    const edHtml = ed.map(function (e) {
      const course = shown(e.coursework);
      return `
        <article class="card">
          <div class="card-top"><h3>${esc(e.degree)}</h3><span class="date">${esc(e.dates)}</span></div>
          <div class="where">${esc(e.school)}</div>
          ${e.place ? '<div class="place">' + esc(e.place) + "</div>" : ""}
          ${points(e.points)}
          ${course.length ? '<div class="mini-label">Relevant coursework</div>' + chips(course) : ""}
        </article>`;
    }).join("");

    return `
      <div class="xp-grid${xp.length && ed.length ? "" : " single"}">
        ${xp.length ? '<div><div class="col-label">Experience</div><div class="stack-v">' + xpHtml + "</div></div>" : ""}
        ${ed.length ? '<div><div class="col-label">Education</div><div class="stack-v">' + edHtml + "</div></div>" : ""}
      </div>`;
  }

  function renderResearch(site) {
    const items = shown(site.research);
    if (!items.length) return "";

    return '<div class="research-list">' + items.map(function (r) {
      const pipe = shown(r.pipeline);
      const stats = shown(r.stats);
      const hasSide = pipe.length > 0 || stats.length > 0;

      // right-hand infographic: numbered pipeline + big-number tiles
      const pipeHtml = pipe.length ? '<div class="mini-label">How it works</div><ol class="pipeline">' + pipe.map(function (p, i) {
        return '<li class="pipe-step"><span class="dot">' + (i + 1) + '</span><div><div class="t">' + fmt(p.step) + '</div><div class="s">' + fmt(p.detail || "") + "</div></div></li>";
      }).join("") + "</ol>" : "";
      const statHtml = stats.length ? '<div class="stats">' + stats.map(function (s) {
        return '<div class="stat"><div class="v">' + esc(s.value) + '</div><div class="l">' + esc(s.label) + "</div></div>";
      }).join("") + "</div>" : "";

      return `
        <article class="card rcard${hasSide ? "" : " compact"}">
          <div class="r-main">
            <div class="card-top"><span class="cat">${esc(r.area)}</span>${pill(r.status)}</div>
            <h3 class="serif-title">${fmt(r.title)}</h3>
            ${points(r.points)}
            ${chips(r.tags)}
            ${linkButtons(r.links)}
          </div>
          ${hasSide ? '<aside class="r-side">' + pipeHtml + statHtml + "</aside>" : ""}
        </article>`;
    }).join("") + "</div>";
  }

  function renderProjects(site) {
    const items = shown(site.projects);
    if (!items.length) return "";

    return '<div class="grid-3">' + items.map(function (p) {
      return `
        <article class="card pcard">
          <div class="card-top"><span class="cat">${esc(p.category)}</span>${pill(p.status)}</div>
          <h3 class="serif-title">${fmt(p.title)}</h3>
          ${p.subtitle ? '<div class="where">' + fmt(p.subtitle) + "</div>" : ""}
          <div class="grow">${points(p.points)}</div>
          ${chips(p.tags)}
          ${linkButtons(p.links)}
        </article>`;
    }).join("") + "</div>";
  }

  function renderAchievements(site) {
    const items = shown(site.achievements);
    if (!items.length) return "";

    return '<div class="ach-grid">' + items.map(function (a) {
      return `
        <article class="ach">
          <div class="metric">${fmt(a.metric)}</div>
          <div class="ach-title">${fmt(a.title)}</div>
          ${a.detail ? '<div class="ach-detail">' + fmt(a.detail) + "</div>" : ""}
          ${linkButtons(a.links)}
        </article>`;
    }).join("") + "</div>";
  }

  function renderSkills(site) {
    const groups = shown(site.skills);
    if (!groups.length) return "";

    return '<div class="skills">' + groups.map(function (g) {
      return '<div class="card skill-group"><h4>' + esc(g.group) + "</h4>" + chips(g.items, "chips") + "</div>";
    }).join("") + "</div>";
  }

  function renderContact(site) {
    /*
      Contact rows:
      1. Email / phone / GitHub / LinkedIn / résumé are pulled from `links`, so each lives in exactly one place.
      2. Anything in contact.extra gets appended (Kaggle, X, whatever).
      3. A row without a url is still shown, just not clickable.
    */
    const L = site.links || {};
    const c = site.contact || {};
    const rows = [];
    if (L.email)              rows.push({ label: "Email",    value: L.email,              url: "mailto:" + String(L.email).trim() });
    if (L.phone)              rows.push({ label: "Phone",    value: L.phone,              url: "tel:" + String(L.phone).replace(/[^\d+]/g, "") });
    if (cleanUrl(L.github))   rows.push({ label: "GitHub",   value: prettyUrl(L.github),   url: cleanUrl(L.github) });
    if (cleanUrl(L.linkedin)) rows.push({ label: "LinkedIn", value: prettyUrl(L.linkedin), url: cleanUrl(L.linkedin) });
    if (cleanUrl(L.resume))   rows.push({ label: "Résumé",   value: "Download PDF",        url: cleanUrl(L.resume) });
    shown(c.extra).forEach(function (x) {
      rows.push({ label: x.label, value: x.value || prettyUrl(x.url), url: cleanUrl(x.url) });
    });
    if (!rows.length && !c.heading) return "";

    const rowHtml = rows.map(function (r) {
      const tag = r.url ? "a" : "div";
      const attrs = r.url ? ' href="' + esc(r.url) + '"' + openAttrs(r.url) : "";
      return "<" + tag + ' class="contact-item"' + attrs + '><div><div class="k">' + esc(r.label) + '</div><div class="v">' + esc(r.value) + "</div></div>" +
        (r.url ? '<span class="arrow" aria-hidden="true">→</span>' : "") + "</" + tag + ">";
    }).join("");

    return `
      ${c.heading ? '<p class="contact-head">' + fmt(c.heading) + "</p>" : ""}
      ${rowHtml ? '<div class="contact-grid">' + rowHtml + "</div>" : ""}`;
  }

  // id, nav label, section title, builder. Reorder this list = reorder the page.
  const SECTIONS = [
    ["experience",   "experience",   "Experience & Education", renderExperience],
    ["research",     "research",     "Research",               renderResearch],
    ["projects",     "projects",     "Projects",               renderProjects],
    ["achievements", "achievements", "Achievements",           renderAchievements],
    ["skills",       "skills",       "Skill toolkit",          renderSkills],
    ["contact",      "contact",      "Contact",                renderContact],
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
      const lists = ["interests", "experience", "education", "research", "projects", "achievements", "skills"];
      flag("flag2 name is filled in", typeof site.name === "string" && site.name.trim() !== "");
      flag("flag3 every list is still a [ ] list", lists.every(function (k) { return site[k] === undefined || Array.isArray(site[k]); }));
      flag("flag4 every research item and project has a title", shown(site.research).concat(shown(site.projects)).every(function (p) { return !!p.title; }));
      flag("flag5 every achievement has a metric and a title", shown(site.achievements).every(function (a) { return !!a.metric && !!a.title; }));
      flag("flag6 every skill group has an items list", shown(site.skills).every(function (g) { return Array.isArray(g.items); }));
    }

    const failed = all_flags.filter(function (f) { return !f[1]; }).map(function (f) { return f[0]; });
    console.log("=========================================================");
    if (failed.length) console.log("Failed: " + failed.join(", "));
    return failed;
  }

  // =====================================================================
  // Wiring: nav, scrollspy, SEO data, warning boxes
  // =====================================================================

  function wireNav(ids) {
    const nav = document.getElementById("nav");
    function onScroll() { nav.classList.toggle("solid", window.scrollY > 40); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // scrollspy: the nav link of the section I'm reading gets the orange dot
    if (!("IntersectionObserver" in window)) return;
    const links = {};
    document.querySelectorAll("#navLinks a").forEach(function (a) { links[a.dataset.id] = a; });
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle("active", k === en.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    ids.forEach(function (id) { const el = document.getElementById(id); if (el) spy.observe(el); });
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
      sameAs: [L.github, L.linkedin].map(cleanUrl).filter(Boolean),
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
      const num = String(built.length + 1).padStart(2, "0");
      built.push({
        id: s[0],
        nav: s[1],
        html: '<section class="section" id="' + s[0] + '"><header class="sec-head"><span class="sec-num">' + num + "</span><h2>" + esc(s[2]) + "</h2></header>" + inner + "</section>",
      });
    });

    // Step 2: drop everything into the page
    document.getElementById("main").innerHTML = built.map(function (b) { return b.html; }).join("");
    document.getElementById("navLinks").innerHTML = built.map(function (b) { return '<a href="#' + b.id + '" data-id="' + b.id + '">' + esc(b.nav) + "</a>"; }).join("");
    document.getElementById("navMark").textContent = String(SITE.name || "").toLowerCase().trim().replace(/\s+/g, ".");
    document.getElementById("footer").innerHTML = "<span>© " + new Date().getFullYear() + " " + esc(SITE.name) + "</span>" + (SITE.footnote ? "<span>" + fmt(SITE.footnote) + "</span>" : "");

    // Step 3: extras
    addPersonSchema(SITE);
    wireNav(built.map(function (b) { return b.id; }));
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
