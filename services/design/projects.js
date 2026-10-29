/* Design portfolio projects — seeded from the website-portfolio folder (2026-10-29).
   Copy is a DRAFT written from the images; refine it in the CMS once that lands.
   Only `name` is required; every other text field is optional and hidden when empty.
   Media `src` is "<project>/<file>" (no extension) in the Supabase Storage `portfolio` bucket,
   uploaded as <file>.webp (2000w) + <file>-1000.webp (1000w). span 2 = full width, span 1 = paired. */
export const PROJECTS = [
  { id: "usersarabia", name: "UsersArabia", url: "usersarabia.com", accent: "#d65a8b", client: "UsersArabia", tagline: "Research participants across the Arab world, on demand.", cats: ["Product","SaaS"], services: ["Product design","Brand","Web build"], scope: "Platform + brand", lede: "A research-recruitment platform for the Middle East and North Africa. Researchers plan studies with AI, price them instantly and recruit from a verified participant panel.",
    media: [
    { src: "usersarabia/usersarabia-01-homepage-hero", w: 2000, h: 1500, span: 2, alt: "UsersArabia — homepage hero" },
    { src: "usersarabia/usersarabia-02-participant-panel", w: 2000, h: 1500, span: 2, alt: "UsersArabia — participant panel" },
    { src: "usersarabia/usersarabia-03-researcher-dashboard", w: 2000, h: 1500, span: 1, alt: "UsersArabia — researcher dashboard" },
    { src: "usersarabia/usersarabia-04-new-project-ai", w: 2000, h: 2667, span: 1, alt: "UsersArabia — new project ai" },
    { src: "usersarabia/usersarabia-05-price-calculator", w: 2000, h: 1500, span: 1, alt: "UsersArabia — price calculator" },
    { src: "usersarabia/usersarabia-06-study-builder", w: 2000, h: 2667, span: 1, alt: "UsersArabia — study builder" },
    { src: "usersarabia/usersarabia-07-onboarding-billing", w: 2000, h: 1500, span: 2, alt: "UsersArabia — onboarding billing" },
    { src: "usersarabia/usersarabia-08-email-automation", w: 2000, h: 1500, span: 1, alt: "UsersArabia — email automation" },
    { src: "usersarabia/usersarabia-09-brand-type", w: 2000, h: 2667, span: 1, alt: "UsersArabia — brand type" },
    { src: "usersarabia/usersarabia-10-components", w: 2000, h: 1500, span: 2, alt: "UsersArabia — components" }
    ] },
  { id: "osus", name: "Osus Properties", accent: "#8b1a2b", client: "Osus Properties", tagline: "Dubai residences, presented like the address they are.", cats: ["Real estate","Web design"], services: ["Website","Brand","Art direction"], scope: "Brand + website", lede: "A property website for a Dubai developer, pairing editorial photography with a quiet burgundy-and-sand identity and map-led location stories.",
    media: [
    { src: "osus/osus-01-homepage-hero", w: 2000, h: 1500, span: 2, alt: "Osus Properties — homepage hero" },
    { src: "osus/osus-02-long-scroll", w: 2000, h: 2667, span: 1, alt: "Osus Properties — long scroll" },
    { src: "osus/osus-03-properties", w: 2000, h: 1500, span: 1, alt: "Osus Properties — properties" },
    { src: "osus/osus-04-property-detail", w: 2000, h: 2667, span: 1, alt: "Osus Properties — property detail" },
    { src: "osus/osus-05-photography", w: 2000, h: 1500, span: 1, alt: "Osus Properties — photography" },
    { src: "osus/osus-06-mobile-duo", w: 2000, h: 1500, span: 1, alt: "Osus Properties — mobile duo" },
    { src: "osus/osus-07-brand-type", w: 2000, h: 2667, span: 1, alt: "Osus Properties — brand type" },
    { src: "osus/osus-08-market-enquire", w: 2000, h: 1500, span: 2, alt: "Osus Properties — market enquire" }
    ] },
  { id: "airnz", name: "Air New Zealand", accent: "#8e3a9d", client: "Air New Zealand", tagline: "A journey companion, from booking to boarding.", cats: ["Mobile","UX"], services: ["UX research","Product design","Design system"], scope: "Mobile journey concept", lede: "A mobile journey concept that keeps travellers a step ahead: a live trip timeline, a smart boarding pass, disruption rebooking and an in-app assistant.",
    media: [
    { src: "airnz/airnz-01-journey-hero", w: 2000, h: 1500, span: 2, alt: "Air New Zealand — journey hero" },
    { src: "airnz/airnz-02-lifestyle", w: 2000, h: 1500, span: 1, alt: "Air New Zealand — lifestyle" },
    { src: "airnz/airnz-03-journey-timeline", w: 2000, h: 2667, span: 1, alt: "Air New Zealand — journey timeline" },
    { src: "airnz/airnz-04-boarding-pass", w: 2000, h: 2667, span: 1, alt: "Air New Zealand — boarding pass" },
    { src: "airnz/airnz-05-disruption-flow", w: 2000, h: 1500, span: 1, alt: "Air New Zealand — disruption flow" },
    { src: "airnz/airnz-06-oscar-assistant", w: 2000, h: 1500, span: 1, alt: "Air New Zealand — oscar assistant" },
    { src: "airnz/airnz-07-colour-type", w: 2000, h: 2667, span: 1, alt: "Air New Zealand — colour type" },
    { src: "airnz/airnz-08-components", w: 2000, h: 1500, span: 2, alt: "Air New Zealand — components" }
    ] },
  { id: "fuelin", name: "Fuelin", accent: "#f5a623", client: "Fuelin", tagline: "Fuel like a pro.", cats: ["Health","App"], services: ["Website","App design"], scope: "Website + app", lede: "Website and app screens for a sports-nutrition platform that builds personalised fuel plans with expert coaches.",
    media: [
    { src: "fuelin/fuelin-02-mobile-trio", w: 2000, h: 1500, span: 2, alt: "Fuelin — mobile trio" },
    { src: "fuelin/fuelin-01-homepage-long", w: 1512, h: 6762, span: 1, alt: "Fuelin — homepage long" },
    { src: "fuelin/fuelin-04-athlete-reviews", w: 2000, h: 2667, span: 1, alt: "Fuelin — athlete reviews" },
    { src: "fuelin/fuelin-05-coaches", w: 2000, h: 1500, span: 2, alt: "Fuelin — coaches" },
    { src: "fuelin/fuelin-06-pricing", w: 2000, h: 1500, span: 2, alt: "Fuelin — pricing" },
    { src: "fuelin/fuelin-08-fuel-plan", w: 2000, h: 1500, span: 1, alt: "Fuelin — fuel plan" },
    { src: "fuelin/fuelin-09-brand-type", w: 2000, h: 2667, span: 1, alt: "Fuelin — brand type" },
    { src: "fuelin/fuelin-10-components", w: 2000, h: 1500, span: 2, alt: "Fuelin — components" }
    ] },
  { id: "jaro", name: "Jaro", accent: "#2f6fed", client: "Jaro", tagline: "Money, made simple.", cats: ["Fintech","App"], services: ["App design","UI design"], scope: "Mobile banking app", lede: "A mobile banking app for a fintech that makes everyday money easy to send, track and understand.",
    media: [
    { src: "jaro/jaro-01-app-hero", w: 2000, h: 1500, span: 2, alt: "Jaro — app hero" },
    { src: "jaro/jaro-02-brand-guide-spread", w: 2000, h: 1500, span: 2, alt: "Jaro — brand guide spread" },
    { src: "jaro/jaro-03-logo", w: 2000, h: 1500, span: 1, alt: "Jaro — logo" },
    { src: "jaro/jaro-04-colour-palette", w: 2000, h: 2667, span: 1, alt: "Jaro — colour palette" },
    { src: "jaro/jaro-05-typography", w: 2000, h: 1500, span: 1, alt: "Jaro — typography" },
    { src: "jaro/jaro-06-send-money", w: 2000, h: 2667, span: 1, alt: "Jaro — send money" },
    { src: "jaro/jaro-07-account-details", w: 2000, h: 1500, span: 1, alt: "Jaro — account details" },
    { src: "jaro/jaro-08-brand-guide-overview", w: 2000, h: 2667, span: 1, alt: "Jaro — brand guide overview" }
    ] },
  { id: "apple", name: "Apple Arabic", accent: "#0071e3", client: "Apple", tagline: "Apple, written right to left.", cats: ["Localisation","Web design"], services: ["RTL design","Arabic typography","Web"], scope: "Arabic product pages", lede: "Localising Apple's product pages for Arabic readers, with right-to-left layouts and Arabic typography across iPhone, MacBook and Apple Watch.",
    media: [
    { src: "apple/apple-01-arabic-website-hero", w: 2000, h: 1500, span: 2, alt: "Apple Arabic — arabic website hero" },
    { src: "apple/apple-02-iphone7-rtl", w: 2000, h: 1500, span: 2, alt: "Apple Arabic — iphone7 rtl" },
    { src: "apple/apple-03-iphone6s-typography", w: 2000, h: 1500, span: 2, alt: "Apple Arabic — iphone6s typography" },
    { src: "apple/apple-04-macbook", w: 2000, h: 1500, span: 1, alt: "Apple Arabic — macbook" },
    { src: "apple/apple-05-activity-ipad-watch", w: 2000, h: 2667, span: 1, alt: "Apple Arabic — activity ipad watch" },
    { src: "apple/apple-06-watch-edition", w: 2000, h: 2667, span: 1, alt: "Apple Arabic — watch edition" },
    { src: "apple/apple-07-overview-grid", w: 2000, h: 2667, span: 1, alt: "Apple Arabic — overview grid" }
    ] },
  { id: "meremotely", name: "ME Remotely", accent: "#e0705a", client: "ME Remotely", tagline: "Remote work, without borders.", cats: ["Marketplace","Web design"], services: ["Brand","Website","Product design"], scope: "Brand + platform", lede: "A remote-jobs platform for professionals in the Middle East, with verified employers, one-click applications and AI-assisted job posts in English and Arabic.",
    media: [
    { src: "meremotely/meremotely-01-homepage-hero", w: 2000, h: 1500, span: 2, alt: "ME Remotely — homepage hero" },
    { src: "meremotely/meremotely-02-mobile-sky", w: 2000, h: 2667, span: 1, alt: "ME Remotely — mobile sky" },
    { src: "meremotely/meremotely-03-jobs-listing", w: 2000, h: 1500, span: 1, alt: "ME Remotely — jobs listing" },
    { src: "meremotely/meremotely-04-mobile-duo", w: 2000, h: 1500, span: 1, alt: "ME Remotely — mobile duo" },
    { src: "meremotely/meremotely-05-job-cards", w: 2000, h: 2667, span: 1, alt: "ME Remotely — job cards" },
    { src: "meremotely/meremotely-06-why-us", w: 2000, h: 2667, span: 1, alt: "ME Remotely — why us" },
    { src: "meremotely/meremotely-07-post-a-job", w: 2000, h: 1500, span: 1, alt: "ME Remotely — post a job" },
    { src: "meremotely/meremotely-08-brand-type", w: 2000, h: 2667, span: 1, alt: "ME Remotely — brand type" },
    { src: "meremotely/meremotely-09-components", w: 2000, h: 1500, span: 1, alt: "ME Remotely — components" }
    ] },
  { id: "insightswap", name: "InsightSwap", accent: "#4338ca", client: "InsightSwap", tagline: "Swap feedback with people who get it.", cats: ["Community","SaaS"], services: ["Brand","Product design","Website"], scope: "Brand + product", lede: "A community platform where professionals trade quick, honest feedback on each other's work, with requests, tokens and calendar-synced sessions.",
    media: [
    { src: "insightswap/insightswap-01-homepage-hero", w: 2000, h: 1500, span: 2, alt: "InsightSwap — homepage hero" },
    { src: "insightswap/insightswap-02-community-orbit", w: 2000, h: 2667, span: 1, alt: "InsightSwap — community orbit" },
    { src: "insightswap/insightswap-03-why-insightswap", w: 2000, h: 1500, span: 1, alt: "InsightSwap — why insightswap" },
    { src: "insightswap/insightswap-04-pricing", w: 2000, h: 1500, span: 1, alt: "InsightSwap — pricing" },
    { src: "insightswap/insightswap-05-mobile-dashboard", w: 2000, h: 2667, span: 1, alt: "InsightSwap — mobile dashboard" },
    { src: "insightswap/insightswap-06-mobile-request", w: 2000, h: 1500, span: 2, alt: "InsightSwap — mobile request" },
    { src: "insightswap/insightswap-07-profile-calendar", w: 2000, h: 1500, span: 1, alt: "InsightSwap — profile calendar" },
    { src: "insightswap/insightswap-08-brand-type", w: 2000, h: 2667, span: 1, alt: "InsightSwap — brand type" }
    ] },
  { id: "phytano", name: "Phytano", accent: "#2bd95b", client: "Phytano", tagline: "Indoor farming, at a glance.", cats: ["AgriTech","Product"], services: ["Product design","Brand mark","Design system"], scope: "Dashboard + app", lede: "A dashboard and mobile app for indoor growers that tracks pH, light and temperature, schedules tasks and flags crops ready to harvest.",
    media: [
    { src: "phytano/phytano-01-dashboard-hero", w: 2000, h: 1500, span: 2, alt: "Phytano — dashboard hero" },
    { src: "phytano/phytano-02-tasks-calendar", w: 2000, h: 1500, span: 2, alt: "Phytano — tasks calendar" },
    { src: "phytano/phytano-03-mobile-duo", w: 2000, h: 1500, span: 1, alt: "Phytano — mobile duo" },
    { src: "phytano/phytano-04-mobile-detail", w: 2000, h: 2667, span: 1, alt: "Phytano — mobile detail" },
    { src: "phytano/phytano-05-colour-palette", w: 2000, h: 2667, span: 1, alt: "Phytano — colour palette" },
    { src: "phytano/phytano-06-typography", w: 2000, h: 1500, span: 1, alt: "Phytano — typography" },
    { src: "phytano/phytano-07-components", w: 2000, h: 1500, span: 1, alt: "Phytano — components" },
    { src: "phytano/phytano-08-brand-mark", w: 2000, h: 2667, span: 1, alt: "Phytano — brand mark" }
    ] },
  { id: "emailsignaturestudio", name: "Email Signature Studio", accent: "#f2a7c3", client: "Email Signature Studio", tagline: "Design your signature.", cats: ["SaaS","Tool"], services: ["Product design","Website","Brand"], scope: "Product + site", lede: "A drag-and-drop builder for professional email signatures, with live previews across mail clients and clean HTML export.",
    media: [
    { src: "emailsignaturestudio/emailsignaturestudio-01-homepage-hero", w: 2000, h: 1500, span: 2, alt: "Email Signature Studio — homepage hero" },
    { src: "emailsignaturestudio/emailsignaturestudio-02-builder", w: 2000, h: 1500, span: 1, alt: "Email Signature Studio — builder" },
    { src: "emailsignaturestudio/emailsignaturestudio-03-template-library", w: 2000, h: 2667, span: 1, alt: "Email Signature Studio — template library" },
    { src: "emailsignaturestudio/emailsignaturestudio-04-mobile-duo", w: 2000, h: 1500, span: 1, alt: "Email Signature Studio — mobile duo" },
    { src: "emailsignaturestudio/emailsignaturestudio-05-live-preview", w: 2000, h: 2667, span: 1, alt: "Email Signature Studio — live preview" },
    { src: "emailsignaturestudio/emailsignaturestudio-06-features", w: 2000, h: 1500, span: 2, alt: "Email Signature Studio — features" },
    { src: "emailsignaturestudio/emailsignaturestudio-07-html-export", w: 2000, h: 1500, span: 1, alt: "Email Signature Studio — html export" },
    { src: "emailsignaturestudio/emailsignaturestudio-08-brand-type", w: 2000, h: 2667, span: 1, alt: "Email Signature Studio — brand type" },
    { src: "emailsignaturestudio/emailsignaturestudio-09-components", w: 2000, h: 1500, span: 2, alt: "Email Signature Studio — components" }
    ] },
  { id: "learningplatform", name: "Learning Platform", accent: "#5b3df5", tagline: "Courses that feel like a gallery.", cats: ["EdTech","Web design"], services: ["Product design","Website","Design system"], scope: "Web + mobile", lede: "An online-course platform with a bold, art-led look, covering course discovery, enrolment, lessons and progress across web and mobile.",
    media: [
    { src: "learningplatform/learningplatform-01-homepage-hero", w: 2000, h: 1500, span: 2, alt: "Learning Platform — homepage hero" },
    { src: "learningplatform/learningplatform-02-course-overview", w: 2000, h: 2667, span: 1, alt: "Learning Platform — course overview" },
    { src: "learningplatform/learningplatform-03-dashboard", w: 2000, h: 1500, span: 1, alt: "Learning Platform — dashboard" },
    { src: "learningplatform/learningplatform-04-lesson-view", w: 2000, h: 1500, span: 2, alt: "Learning Platform — lesson view" },
    { src: "learningplatform/learningplatform-05-mobile-trio", w: 2000, h: 1500, span: 1, alt: "Learning Platform — mobile trio" },
    { src: "learningplatform/learningplatform-06-mobile-enrol", w: 2000, h: 2667, span: 1, alt: "Learning Platform — mobile enrol" },
    { src: "learningplatform/learningplatform-07-brand-type", w: 2000, h: 2667, span: 1, alt: "Learning Platform — brand type" },
    { src: "learningplatform/learningplatform-08-components", w: 2000, h: 1500, span: 1, alt: "Learning Platform — components" }
    ] }
];
