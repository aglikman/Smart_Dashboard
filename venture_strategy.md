# DashBoard Venture - Strategy & Business Plan

**Version:** 1.0 | **Date:** June 24, 2026
**Founders:** Arye Glikman, Ofir Levi, Meital Shashua

---

## 1. Executive Summary

We build turnkey business dashboards for Israeli SMBs that already use local CRM platforms (ScallaCRM, ArBox). Most SMB owners pay for a CRM but never look at their data in a meaningful way. We turn their existing CRM data into visual, actionable dashboards - delivered as a service, not a product.

**Model:** Setup fee (1,500-3,000 NIS) + monthly maintenance (350-599 NIS/mo)
**Tech stack:** Claude-assisted development (no engineering headcount needed at launch)
**Target:** Multi-vertical - any SMB running Scalla or ArBox

---

## 2. Problem Statement

Israeli SMBs spend 199-599 NIS/mo on CRM tools like Scalla and ArBox. They collect data on leads, sales, customers, classes, memberships, and revenue. But:

- **They don't analyze it.** CRM reports are basic, tabular, and require manual effort to interpret.
- **They can't see trends.** No visual KPI tracking, no month-over-month comparisons, no alerts.
- **They make decisions blind.** Pricing, staffing, marketing spend - all based on gut feel, not data.
- **They can't afford BI tools.** Power BI, Tableau, Looker are priced for enterprise. Israeli SMBs need something local, Hebrew-first, and affordable.

**The gap:** Nobody is offering a simple, affordable, Hebrew-native dashboard service that sits on top of local Israeli CRMs.

---

## 3. Solution

A managed dashboard service that:

1. **Connects** to the client's existing CRM via API (Scalla or ArBox)
2. **Visualizes** their business KPIs in a clean, Hebrew-language dashboard
3. **Updates** automatically with live or near-live data
4. **Adapts** to the client's specific vertical and metrics

We are a **service company**, not a SaaS product. Each dashboard is customized per client. Over time, we build templates per vertical that reduce setup time and increase margins.

---

## 4. Target Market

### 4.1 CRM Platform Addressable Market

| Platform | Focus | Est. Clients in Israel | Our Fit |
|----------|-------|----------------------|---------|
| ScallaCRM | General SMB - sales, services, retail | 5,000-10,000+ | High - broad API, multiple verticals |
| ArBox | Fitness, wellness, studios, gyms | 3,000-5,000+ | High - data-rich, recurring revenue model |

### 4.2 Beachhead Verticals (Launch With)

1. **Fitness & Wellness** (ArBox) - gyms, studios, yoga, pilates, CrossFit. KPIs: active members, churn, class utilization, revenue per member, retention.
2. **Kids Activities & Education** (Scalla) - after-school programs, camps, enrichment centers. KPIs: enrollment, attendance, revenue per class, seasonal trends.
3. **Professional Services** (Scalla) - consultants, agencies, freelancers. KPIs: lead pipeline, conversion rate, revenue, client lifetime value.

### 4.3 Expansion Verticals (Phase 2)

- Retail & e-commerce (Scalla)
- Beauty & personal care (ArBox/Scalla)
- Real estate agencies (Scalla)
- Medical clinics (Scalla)

---

## 5. Competitive Landscape

### Direct Competitors (Dashboard-as-a-Service for Israeli SMBs)

**None identified.** This is the core opportunity. No one is packaging CRM-specific dashboards as a managed service for the Israeli SMB market.

### Adjacent / Indirect Competition

| Competitor | Threat Level | Why We Win |
|-----------|-------------|-----------|
| Scalla/ArBox built-in reports | Medium | Basic tables, no visual dashboards, no customization |
| Power BI / Tableau | Low | Too expensive, too complex, English-only, requires technical setup |
| Zoho Analytics | Low | Generic, not integrated with local CRMs, overkill for SMBs |
| Freelance developers | Medium | One-off builds, no maintenance, inconsistent quality |
| Google Sheets / manual | High | Current "solution" for most - this is what we replace |

**Our moat:** Pre-built templates per vertical + per CRM, Hebrew-native UX, ongoing maintenance relationship, and deep understanding of local CRM APIs.

---

## 6. Revenue Model

### 6.1 Pricing Structure

| Component | Price Range | What's Included |
|-----------|-----------|----------------|
| **Setup fee** | 1,500-3,000 NIS | Requirements gathering, API connection, dashboard design & build, client training |
| **Monthly maintenance** | 350-599 NIS/mo | Hosting, data refresh, minor updates, email support, monthly performance snapshot |

### 6.2 Pricing Tiers

| Tier | Setup | Monthly | Target |
|------|-------|---------|--------|
| **Starter** | 1,500 NIS | 349 NIS/mo | Single dashboard, up to 5 KPI cards, 2 charts |
| **Business** | 2,500 NIS | 499 NIS/mo | Multi-view dashboard, up to 10 KPIs, 5 charts, 1 data table, filters |
| **Premium** | 3,000 NIS | 599 NIS/mo | Full custom build, unlimited views, alerts, scheduled email reports |

### 6.3 Unit Economics (per client)

| Metric | Starter | Business | Premium |
|--------|---------|----------|---------|
| Setup revenue | 1,500 | 2,500 | 3,000 |
| Monthly revenue | 349 | 499 | 599 |
| Annual revenue (setup + 12 mo) | 5,688 | 8,488 | 10,188 |
| Estimated setup time | 4-6 hrs | 6-10 hrs | 10-15 hrs |
| Monthly maintenance time | 1 hr | 1.5 hrs | 2 hrs |

### 6.4 Revenue Projections (Year 1)

| Quarter | New Clients | Cumulative | Quarterly Revenue |
|---------|-------------|------------|------------------|
| Q3 2026 | 5 (pilot) | 5 | ~20,000 NIS |
| Q4 2026 | 10 | 15 | ~45,000 NIS |
| Q1 2027 | 15 | 30 | ~75,000 NIS |
| Q2 2027 | 20 | 50 | ~110,000 NIS |
| **Year 1 Total** | **50 clients** | | **~250,000 NIS** |

*Assumes average ~500 NIS/mo per client and 2,000 NIS average setup fee.*

---

## 7. Team & Roles

| Person | Role | Responsibilities |
|--------|------|-----------------|
| **Arye Glikman** | Founder & Mentor | Venture architect, strategic advisor, mentoring Ofir & Meital on GTM execution, partnerships with Scalla/ArBox, guiding the project to full-scale operations |
| **Ofir Levi** | Head of Product & Client Success | Dashboard requirements, KPI definition per vertical, client onboarding, ongoing account management, EBRs |
| **Meital Shashua** | Head of Growth & Marketing | Lead generation (paid + organic), social media, client acquisition campaigns, landing page optimization |

### Technical Execution

- Claude Cowork + Claude Design handle dashboard development
- No engineering hire needed at launch
- Revisit at 30+ clients or when automation/scale demands it

---

## 8. Technology Stack

### CRM Integrations

**ScallaCRM:**
- API access via Access Key (key secured)
- Pricing tiers: Basic (199 NIS/mo), Advanced (349 NIS/mo), Premium (599 NIS/mo) - API access on Advanced+
- Features: automations, task management, cloud PBX, quotes, digital signatures, customer portal, dashboards, email/WhatsApp marketing

**ArBox:**
- API with key-based authentication
- Endpoints: businesses, members, classes, schedules, payments
- Integrations: Zapier, Make, Stripe, Facebook
- Focus: fitness businesses - gyms, studios, trainers

### Dashboard Technology

- HTML/CSS/JS with Chart.js (proven with Giliguli prototype)
- Hebrew RTL-first design
- Responsive for desktop + mobile
- Self-contained single-file deliverables (easy to host and maintain)

---

## 9. Go-to-Market Strategy

### Phase 1: Validate (July-August 2026)

- Build 3-5 pilot dashboards for real clients (free or discounted)
- Sources: personal network, Scalla/ArBox user communities, Facebook groups for Israeli SMBs
- Goal: prove value, collect testimonials, refine templates

### Phase 2: Launch (September-December 2026)

- Paid marketing (Meital leads): Facebook/Instagram ads targeting Israeli SMB owners
- Content marketing: before/after case studies, "what your CRM data is telling you" content
- Partnership play: approach Scalla and ArBox as a value-add partner (they refer clients who need dashboards, we drive stickiness to their platform)
- Pricing: full price, 3 tiers

### Phase 3: Scale (Q1-Q2 2027)

- Template library per vertical reduces setup time from 6-10 hrs to 2-3 hrs
- Upsell existing clients to higher tiers
- Explore additional CRM integrations (e.g., Monday.com, HubSpot for larger SMBs)
- Consider white-label offering for CRM vendors

---

## 10. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| CRM API changes or limits | High | Maintain close relationship with Scalla/ArBox teams; build abstraction layer |
| Low willingness to pay | High | Validate with pilots first; emphasize ROI with concrete examples |
| Client churn after setup | Medium | Monthly check-ins (Ofir), demonstrate ongoing value, add features over time |
| Claude dependency for builds | Medium | Build reusable templates; document processes so any team member can deliver |
| Competitor enters market | Medium | Move fast, lock in CRM partnerships, build vertical expertise moat |

---

## 11. Immediate Next Steps

1. **This week:** Share this strategy doc with Ofir & Meital for alignment
2. **This week:** Build a reusable dashboard prototype on Scalla API (extend Giliguli work)
3. **Next week:** Identify 5 pilot clients from personal networks
4. **Next week:** Create a one-page sales asset (Hebrew) for pilot outreach
5. **July:** Build ArBox prototype dashboard
6. **August:** Refine pricing based on pilot feedback, launch marketing assets

---

## 12. Success Metrics (6-Month Check)

- 15+ paying clients
- 90%+ monthly retention
- Average setup time under 6 hours
- Positive unit economics (revenue > time invested at 150 NIS/hr equivalent)
- At least 1 CRM partnership conversation initiated
