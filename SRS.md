# Software Requirements Specification (SRS)

**Project:** Greenex Digital Transformation Platform  
**Prepared by:** Gunadhya Software Solutions  
**Version:** 0.1 (Draft)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [High-Level Architecture](#3-high-level-architecture)
4. [User Roles & Permissions](#4-user-roles--permissions-rbac-model)
5. [Functional Requirements](#5-functional-requirements)
   - [5.1 CRM Module](#51-crm-module)
   - [5.2 Quotation & Deal Finalization](#52-quotation--deal-finalization)
   - [5.3 Service Management & Project Creation](#53-service-management--project-creation)
   - [5.4 Dynamic Checklist Management](#54-dynamic-checklist-management)
   - [5.5 Work Assignment Module](#55-work-assignment-module)
   - [5.6 Verification Gate](#56-verification-gate-step-5)
   - [5.7 Execution of Work](#57-execution-of-work-step-6)
   - [5.8 Draft Report Preparation](#58-draft-report-preparation-step-7)
   - [5.9 Client Review & Clarifications](#59-client-review--clarifications-step-8)
   - [5.10 Account Closure & Payment](#510-account-closure--payment-tracking-step-9)
   - [5.11 Final Report & Invoice](#511-final-report-handover--tax-invoice-upload)
   - [5.12 EcoVadis Module](#512-ecovadis-module)
   - [5.13 CMS / Content Management](#513-cms--content-management-for-mobile-app)
   - [5.14 Notification Engine](#514-notification-engine)
   - [5.15 User Management & RBAC](#515-user-management--rbac-functional)
   - [5.16 Mobile App Requirements](#516-mobile-app-functional-requirements)
   - [5.17 Additional Requirements](#517-additional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [API Specification](#7-api-specification-high-level)
8. [Data Model](#8-data-model--entity-overview)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) describes the complete functional and non-functional requirements for the **Greenex Digital Transformation Platform**, consisting of:

1. **System 1 — Client Mobile App + CMS**
2. **System 2 — Business Process & Workflow Management Web Application**

This document serves as the authoritative source for: Development team, QA team, UI/UX team, Project managers, and Greenex stakeholders.

### 1.2 Scope

The platform aims to digitize the full Greenex Environmental operational lifecycle — from client engagement to final report delivery — while enabling seamless internal task coordination, document management, reporting automation, and EcoVadis compliance support.

**Scope includes:**
- CRM Lite
- Quotation & Deal Finalization
- Dynamic Checklists (Scope 1, 2, 3 + EcoVadis)
- Work Assignment & SLA Management
- Verification Gate Workflows
- Execution Tasks & Logs
- Automated Report Generation
- Client Review & Clarification Cycles
- Payments & Invoice Module
- Final Report Delivery
- Client Mobile App for engagement & updates
- CMS for content publishing
- Communication & Meeting Scheduling Add-ons
- Personal Task Tracker
- Document Libraries
- Notifications & Automation Engine

### 1.3 Definitions & Abbreviations

| Term | Definition |
|------|------------|
| CRM | Customer Relationship Management |
| SLA | Service Level Agreement |
| QA | Quality Assurance Reviewer |
| Checklist | A structured set of inputs required for a service |
| EcoVadis | Sustainability rating documentation framework |
| Scope 1, 2, 3 | GHG accounting categories |
| TAT | Turnaround Time |
| UAT | User Acceptance Testing |
| CMS | Content Management System |

### 1.4 References

- Greenex Digital Transformation Proposal (04 Nov 2025)
- EcoVadis Required Attachments List
- EcoVadis Policies & Training Requirements
- Greenex 11-Step Operational Workflow (Kick-off → Invoice)

---

## 2. System Overview

### 2.1 System 1 — Client Mobile App + CMS

The Greenex Mobile App functions primarily as a **client engagement and content delivery platform**. It is *not* a project execution or workflow tool.

#### A. Content Delivery (3 Types Only)

1. **Text (Blog Articles)** - Title, Short description, Full article, Author, Publish date, Thumbnail
2. **Graphics (Image Posts)** - Single image upload, Title/caption, Short description
3. **Media (YouTube Video Links)** - YouTube embed link, Title, Short description, Auto-thumbnail

No other file formats (PDF, XLS, DOC, etc.) will be allowed.

#### B. Lead Generation (Primary Business Goal)

- "Enquiry Form" inside app
- Mandatory fields: Name, Phone, Email, Company, Service Required, Message
- Submission → Direct entry into CRM Leads (System 2)
- Auto-notification to Sales team
- Auto-acknowledgement email to user

#### C. Project Status Tracking (Existing Customers Only)

After login, existing clients can view high-level project stages only:
1. Quotation Sent
2. Quotation Accepted
3. Checklist Pending
4. Work In Progress
5. Draft Report Ready
6. Client Review
7. Payment Pending
8. Final Report Ready

**No uploads, comments, checklists, payments, or interactions.** Strictly for transparency.

#### D. Training & Workshop Notifications

Push notifications for: Upcoming webinars, Training sessions, Workshops, Awareness events.

#### E. What Mobile App Will NOT Include

❌ Checklist submission  
❌ Document upload  
❌ Report viewing  
❌ Clarifications/comments  
❌ Internal communications  
❌ Payment processing  
❌ Invoice download  
❌ Task, SLA, or workflow screens  

All operational functions remain exclusively in **System 2 (Web Platform)**.

### 2.2 System 2 — Business Process & Workflow Web Application

This is the operational backbone of Greenex. It includes:
- CRM Lite (Leads → Opportunities → Deals)
- Quotation Builder
- Service Catalogue
- Dynamic Checklist Engine
- Work Assignment & SLA Monitoring
- Verification Gate
- Execution Panel
- Report Drafting & Automation
- Client Review System
- Account Closure
- Invoice Generator
- Document Repository
- EcoVadis Module
- Internal Communication & Personal Task Tracker

---

## 3. High-Level Architecture

### 3.1 Overall Architecture

Three-tier architecture:

**Frontend Layer:**
- Web Admin (React/Next.js or equivalent)
- Mobile App (Flutter / React Native)

**Backend Layer (API Services):**
- Authentication
- CRM
- Checklist Engine
- Project Workflow
- Report Engine
- EcoVadis Document Engine
- Notification Engine
- Invoice Engine

**Storage Layer:**
- Relational DB (PostgreSQL)
- Document Storage (Local/S3)
- Audit Logs

### 3.2 Development Approach

Both systems developed in parallel, sharing the same backend & services.

---

## 4. User Roles & Permissions (RBAC Model)

The system uses **Role-Based Access Control (RBAC)** with:
- Configurable roles
- Granular permissions
- Multiple-role assignment per user

### 4.1 User Types

1. **Internal Users (Greenex team)** – access Business Process Web App
2. **External Users (Clients & App Users)** – access Client Web Portal and Mobile App

### 4.2 Role & Permission Model

#### 4.2.1 Permissions

Permissions defined as atomic actions on modules:
- `crm.view_leads`, `crm.create_lead`, `crm.edit_lead`
- `quotation.create`, `quotation.send`, `quotation.view_all`
- `project.view`, `project.manage_assignment`
- `checklist.define`, `checklist.view`, `checklist.freeze`
- `report.generate`, `report.view`, `report.send_to_client`
- `invoice.generate`, `invoice.view`, `invoice.send`
- `content.create`, `content.publish`, `content.delete`
- `ecoVadis.policy_manage`, `ecoVadis.document_review`

#### 4.2.2 Roles

- A **Role** is a named collection of permissions
- Default roles seeded at deployment
- Admin users can create/edit roles and assign permissions

### 4.3 Default System Roles

1. **Super Admin** - Full access to all modules & settings
2. **Operations Manager** - Project creation, checklist management, workflow control
3. **Analyst / Engineer** - View assigned projects, manage execution tasks
4. **Reviewer / QA** - Access verification gate, approve/reject checklists
5. **Sales Executive** - Manage Leads/Opportunities, create quotations
6. **Accounts Executive** - Manage payment status, generate invoices
7. **CMS Admin** - Manage blog posts, graphics, videos
8. **Client User** - Access client portal and mobile app

### 4.4 Client Role

**Client User can (Web Portal):**
- Login securely
- View list of their projects
- View high-level project statuses
- Review draft reports (if enabled)
- Provide clarifications/comments
- Download final reports
- View invoices & payment status (read-only)

**Client User can (Mobile App):**
- Login using provided credentials
- View project status (read-only overview)
- Receive project-related notifications

---

## 5. Functional Requirements

### 5.1 CRM Module

The CRM Lite module exists solely to:
- ✔ Capture enquiries (especially from Mobile App)
- ✔ Store basic customer information
- ✔ Maintain organization & contact records
- ✔ Allow Sales to send quotations
- ✔ Send email notifications to sales team

**No pipeline, no detailed opportunity tracking, no notes, no tasks.**

#### 5.1.1 Lead Capture

**Lead Sources:**
1. Mobile App Enquiry Form (primary source)
2. Manual entry by Sales Executive

**Lead Fields:**

| Field | Type | Mandatory |
|-------|------|-----------|
| Full Name | Text | Yes |
| Email | Email | Yes |
| Phone | Text | Yes |
| Company Name | Text | Optional |
| Service Required | Dropdown | Yes |
| Message | Textarea | Optional |
| Source | Auto-set | Yes ("Mobile App", "Manual") |
| Created Date | Timestamp | Auto |

**Lead Status (Simplified):** Only 3 states:
1. `new`
2. `in_progress`
3. `closed`

#### 5.1.2 Organization Management

Sales can create/edit:
- Organization Name
- Address (optional)
- GST Number (optional)
- Linked Contacts

#### 5.1.3 Contact Management

Contacts store: Name, Email, Phone, Organization (optional)

#### 5.1.4 CRM Permissions

| Role | Permissions |
|------|-------------|
| Sales Executive | Full create/edit of Leads, Contacts, Organizations |
| Ops Manager | Read-only |
| Accounts | Read-only |
| Analyst/QA | No access |
| Client User | No access |
| Super Admin | Full access |

#### 5.1.5 CRM Email Notifications

- **Mobile App Enquiry Submitted** → Sales receives email
- **Quotation Sent** → Client receives quotation email
- **Client Accepted Quotation** → Sales notified
- **Client Rejected Quotation** → Sales notified

⚠️ All notifications are **email only**.

---

### 5.2 Quotation & Deal Finalization

The system only stores and tracks the quotation PDF. Quotations are prepared externally.

#### 5.2.1 Quotation Upload

| Field | Mandatory |
|-------|-----------|
| Quotation PDF (File Upload) | Yes |
| Quotation Title / Reference Number | Yes |
| Amount (Optional metadata) | No |
| Notes | Optional |
| Uploaded By | Auto |
| Uploaded Date | Auto |

#### 5.2.2 Quotation Statuses

1. `uploaded`
2. `sent`
3. `accepted` (Marked manually)
4. `rejected` (Marked manually)

**Important:**
- ✔ No Accept/Reject link
- ✔ Acceptance based on offline communication
- ✔ System only allows manual status update

#### 5.2.3 Project Creation Trigger

Project created ONLY when quotation marked as **Accepted**.

Once accepted:
1. System shows button: "Create Project"
2. Clicking moves to Step 3: Requirement & Checklist Finalization
3. All project fields populated from Lead & Organization

#### 5.2.4 Permissions

| Role | Permissions |
|------|-------------|
| Sales Executive | Upload, mark sent, mark accepted/rejected |
| Accounts Executive | Upload + mark accepted/rejected |
| Ops Manager | Read-only |
| Analysts / QA | No access |
| Client User | No access |
| Super Admin | Full control |

---

### 5.3 Service Management & Project Creation

#### 5.3.1 Service Catalogue

**Service Fields:**

| Field | Mandatory | Notes |
|-------|-----------|-------|
| Service Name | Yes | e.g., "Carbon Footprint Scope 1 & 2" |
| Description | Optional | Displayed to internal team |
| Associated Checklists | Yes | Multiple checklists allowed |
| Active/Inactive | Yes | Inactive services not shown |
| Expected TAT | Optional | Informational |

#### 5.3.2 Project Creation Workflow

**Project Fields:**

| Field | Mandatory | Notes |
|-------|-----------|-------|
| Project Name | Yes | Auto: "[Client] – [Service] – [Month]" (editable) |
| Linked Client Organization | Yes | From CRM |
| Primary Client Contact | Yes | From CRM |
| Services Included | Yes | Multi-select |
| Project Description | Optional | Short internal summary |
| Start Date | Optional | For TAT calculations |
| Internal Notes | Optional | Visible only to internal users |

**Project ID:** Auto-generated as `PRJ-YYYY-XXXX`

#### 5.3.3 Project Status Lifecycle

```
planned → checklist_finalized → verification_passed → execution_in_progress → 
execution_complete → draft_prepared → client_review → account_closure → completed
```

**Independent Status Fields:**

| Status Type | Values |
|-------------|--------|
| Overall Status | planned, checklist_finalized, verification_passed, execution_in_progress, execution_complete, draft_prepared, client_review, account_closure, completed |
| Verification Status | pending, under_verification, passed, failed |
| Execution Status | not_started, in_progress, complete |
| Client Review Status | not_started, in_review, changes_requested, revised_shared, client_approved |
| Payment Status | pending, partial, paid |

#### 5.3.4 Checklist Assignment

Each service has pre-associated checklists. During project setup, Ops Manager:
1. Reviews recommended checklists
2. Selects which checklists apply
3. Confirms checklist version
4. Freezes checklist v1 before starting execution

#### 5.3.5 Checklist Finalization (Critical Step)

Before work starts:
1. Ops Manager selects applicable checklists
2. System generates Checklist Set v1
3. Client may upload documents (web portal only)
4. Ops Manager **freezes** the checklist version
5. Project moves from `planned` → `checklist_finalized`

⚠️ Once frozen, checklist items cannot be changed unless Ops creates Checklist v2.

---

### 5.4 Dynamic Checklist Management

Powers Step 3, 5, and partly 6 of the Greenex process.

#### 5.4.1 Checklist Template Fields

| Field | Mandatory | Description |
|-------|-----------|-------------|
| Checklist Name | Yes | e.g. "CF Scope 1 & 2 – Data Collection" |
| Category | Yes | environment, labour, ethics, procurement, other |
| Service Mapping | Yes | One or more services using this checklist |
| Description | Optional | Internal notes |
| Active/Inactive | Yes | Controls availability |

#### 5.4.2 Checklist Item Types

- **Text Input** (single-line)
- **Textarea** (multi-line)
- **Number**
- **Dropdown / Select**
- **Date**
- **File Upload**
- **Multi-File Upload**
- **Reference Text** (read-only info/help)

#### 5.4.3 Checklist Item Attributes

| Attribute | Mandatory | Description |
|-----------|-----------|-------------|
| Item Code | Yes | Unique technical ID (e.g., ENV_POL_01) |
| Label | Yes | Human-readable question |
| Type | Yes | As above |
| Help Text | Optional | Tooltip or subtext |
| Mandatory | Yes | True/False |
| Visible to Client | Yes | If false, internal-only item |
| Expected Document Type | Optional | E.g., "Policy", "Training Evidence" |
| Section / Group | Optional | For grouping |

#### 5.4.4 Checklist Status within a Project

1. `draft` – Fields can be edited
2. `in_progress` – Client and/or Ops filling data
3. `ready_for_verification` – Ops marks when complete
4. `verified_passed` / `verified_failed` – Checked by Reviewer/QA
5. `finalized` – No further changes allowed
6. `superseded` – Old version when v2 created

#### 5.4.5 Completeness Check

Before moving to `ready_for_verification`:
- System calculates **Completeness Score (%):**
  - `(Mandatory answered + Mandatory docs uploaded) / Total mandatory`
- Block progression if any mandatory field/document is missing

#### 5.4.6 Verification

Once Ops sets `ready_for_verification`:
- Reviewer/QA receives email notification
- For each item, Reviewer can: View data, Add comment, Mark as Accepted/Needs Clarification
- At checklist level, set status: `passed` or `failed`

If **Passed** → checklist can be finalized by Ops  
If **Failed** → goes back to `in_progress` with comments

#### 5.4.7 Versioning

- Ops can create **New Version (v2)** of checklist instance
- Old version marked as `superseded` (locked)
- New version inherits previous answers
- All versions remain accessible for audit

---

### 5.5 Work Assignment Module

#### 5.5.1 Task Model

| Field | Mandatory | Description |
|-------|-----------|-------------|
| Task ID | Auto | Unique system ID |
| Project | Yes | Parent project reference |
| Title | Yes | e.g., "Collect Scope 1 fuel data – Plant A" |
| Description | Optional | Instructions or context |
| Service | Optional | One of the project's services |
| Checklist Link | Optional | If tied to a checklist section/item |
| Assigned To | Yes | Internal user |
| Created By | Auto | User who created task |
| Created Date | Auto | Timestamp |
| Due Date | Optional | For SLA tracking |
| Priority | Optional | low, medium, high |
| Status | Yes | to_do, doing, blocked, done |
| Blocked Reason | Optional | Required if status = blocked |
| Internal Notes | Optional | Free-form notes |

#### 5.5.2 Task Status Lifecycle

1. `to_do` – default on creation
2. `doing` – when assignee starts work
3. `blocked` – if something preventing progress (requires reason)
4. `done` – once completed

#### 5.5.3 SLA & Due Date Tracking

- `on_track` – Today < Due Date
- `due_today` – Today == Due Date
- `overdue` – Today > Due Date and Status ≠ done

#### 5.5.4 Permissions

| Role | Capabilities |
|------|--------------|
| Ops Manager | Create tasks, edit, assign/reassign, update status, set due dates |
| Super Admin | Full control |
| Analyst/Engineer | View assigned tasks, update status, add notes |
| Client User | No access to internal task list |

---

### 5.6 Verification Gate (Step 5)

Mandatory control point before execution can begin.

#### 5.6.1 Gate States at Project Level

- `pending` (default)
- `under_verification`
- `passed`
- `failed`

#### 5.6.2 Preconditions for Starting Verification

1. At least one checklist exists for the project
2. Each checklist has status = `ready_for_verification`
3. Completeness = 100% for mandatory fields & documents

#### 5.6.3 Starting Verification

When Ops clicks "Send for Verification":
1. Project Verification Status → `under_verification`
2. Email sent to Reviewer/QA role users

#### 5.6.4 Verification View (Reviewer/QA)

Consolidated screen showing:
- Project Summary (Client, Services, Checklists count)
- Checklist-Level View (Name, Version, Completeness %, Status)

#### 5.6.5 Actions on Verification Results

**When Passed:**
- Project status can move to `execution_in_progress`
- Email to Ops & Analysts
- Checklist data effectively frozen

**When Failed:**
- Checklists with Failed status remain editable
- Email to Ops with comments
- Must fix and re-trigger verification

---

### 5.7 Execution of Work (Step 6)

Begins only after:
- All project checklists are finalized
- Verification Gate status = `passed`
- Ops has assigned tasks for execution

#### 5.7.1 Execution Dashboard (Analyst View)

- Summary Section (Project, Client, Services, Tasks)
- Tasks Section (filtered list assigned to user)
- Work Files Section (execution uploads)

#### 5.7.2 Task Execution

For each task, Analyst can:
1. Update Task Status
2. Add Execution Notes
3. Upload Work Files (Excel, PDF, images)
4. Link File to Task
5. **Cannot modify Checklist Data** (locked)

#### 5.7.3 Execution File Management

| Field | Description |
|-------|-------------|
| File Name | Original name or sanitized |
| File Type | Excel, PDF, JPG, ZIP, etc. |
| Uploaded By | Analyst/Engineer |
| Uploaded On | Timestamp |
| Linked Task | Optional |
| Internal Only | Always Yes |

#### 5.7.4 Execution Completion

Execution is considered complete when:
- Analyst marks all assigned tasks as Done
- Ops Manager reviews task completion
- Ops manually moves Project to `draft_prepared`

**Manual control by Ops — no automated state progression.**

---

### 5.8 Draft Report Preparation (Step 7)

#### 5.8.1 Preconditions

- Project Verification Status = `passed`
- Execution Phase marked Complete by Ops
- Required checklists in `finalized` state

#### 5.8.2 Report Templates

Admin configurable DOCX templates with:
- Header & footer (Greenex branding)
- Cover page
- Table of contents
- Section headings
- Placeholder variables

#### 5.8.3 Auto Report Generation

When Analyst clicks "Generate Draft Report":
1. System loads applicable template
2. Fetches data from Checklists, Execution Notes, Files metadata
3. Populates placeholders
4. Produces Draft_v1.docx and Draft_v1.pdf
5. Stores under Project → Reports

#### 5.8.4 Manual Report Upload

System allows uploading manually prepared draft (PDF or DOCX).

#### 5.8.5 Report Versioning

- Each new draft increments version (v1, v2, v3...)
- Only **one version active** at a time
- Older versions remain read-only

---

### 5.9 Client Review & Clarifications (Step 8)

#### 5.9.1 Preconditions

- At least one Draft Report version exists
- Ops marks version as "Ready for Client Review"

#### 5.9.2 Client Portal – Review Screen

Client sees:
- Project Header (Name, Services, Status)
- Draft Report Section (PDF viewer/download)
- Comments / Clarification Thread

#### 5.9.3 Client Actions

- View Draft Report (PDF)
- Add Comments / Clarification Requests
- Tag comments as: query, change_request, info
- Mark as "Client Approved"

#### 5.9.4 Internal Actions

- View all client comments
- Reply to comments
- Mark comments as: open, in_progress, resolved
- Push revised drafts

#### 5.9.5 Review Cycle & Statuses

- `not_started`
- `in_review`
- `changes_requested`
- `revised_shared`
- `client_approved`

---

### 5.10 Account Closure & Payment Tracking (Step 9)

#### 5.10.1 Payment Fields

| Field | Mandatory | Notes |
|-------|-----------|-------|
| Payment Status | Yes | pending, partial, paid |
| Amount Expected | Yes | Entered manually or from quotation |
| Amount Received | Optional | Editable only by Accounts |
| Payment Mode | Optional | bank_transfer, upi, cash, other |
| Receipt/Proof Upload | Optional | PDF/JPG |
| Payment Date | Optional | For record-keeping |
| Notes | Optional | Internal comments |

#### 5.10.2 Delivery Block (Optional)

Configuration allows blocking final report handover until `payment_status = paid`.

---

### 5.11 Final Report Handover & Tax Invoice Upload

#### 5.11.1 Preconditions for Final Report

1. Draft Report approved by client
2. Payment Status = `paid` (if delivery-block enabled)
3. Final Report (PDF) prepared and uploaded

#### 5.11.2 Final Report Handover

When Ops clicks "Hand Over Final Report":
1. Final Report visible in Client Portal
2. Client receives email notification
3. Download log stored

#### 5.11.3 Tax Invoice Upload

| Field | Mandatory |
|-------|-----------|
| Invoice PDF Upload | Yes |
| Invoice Number | Yes |
| Invoice Date | Yes |
| Invoice Amount | Optional |
| Notes | Optional |

**System does NOT generate invoice** – only stores and exposes.

#### 5.11.4 Project Closure

Once Final Report handed over, Invoice uploaded, Payment received → Ops marks project as `completed`.

---

### 5.12 EcoVadis Module

Four main sections:
1. **Environment**
2. **Labour & Human Rights**
3. **Ethics**
4. **Sustainable Procurement**

Each contains: Policies, Training evidences, Operational documents.

#### 5.12.1 EcoVadis Item Structure

| Attribute | Description |
|-----------|-------------|
| Category | environment, labour, ethics, procurement |
| Sub-category | policy, training, document |
| Title | e.g., "Environmental Policy" |
| Description | Short explanation |
| Mandatory | Yes/No |
| Multi-file allowed | Yes/No |

#### 5.12.2 EcoVadis Checklist Templates

Four master templates, one per pillar:
- EcoVadis – Environment
- EcoVadis – Labour & HR
- EcoVadis – Ethics
- EcoVadis – Sustainable Procurement

#### 5.12.3 Document Upload Rules

- Multi-File Upload allowed
- Document Versioning (Doc_v1, Doc_v2, Doc_v3)
- Mandatory Document Validation before freeze

#### 5.12.4 EcoVadis Dashboard

Per pillar shows: Total items, Completed items, Missing items, Mandatory pending, Completeness %.

#### 5.12.5 EcoVadis Reporting Layer

- Structured Data Output by pillar
- Sample Document Downloads (templates)
- Report Bundle Export (ZIP)

---

### 5.13 CMS / Content Management (For Mobile App)

Content types strictly limited to:
1. **Text (Blog)**
2. **Graphics (Image Posts)**
3. **Media (YouTube Video Links)**

#### 5.13.1 Blog Fields

| Field | Mandatory |
|-------|-----------|
| Title | Yes |
| Slug / URL Key | Auto |
| Short Summary | Optional |
| Full Content | Yes |
| Thumbnail Image | Optional |
| Category | Optional |
| Tags | Optional |
| Author Name | Optional |
| Publish Date | Auto/Manual |
| Status | Yes (draft, published, archived) |
| Feature Flag | Optional |
| Audience | public, client |

#### 5.13.2 Graphics Fields

| Field | Mandatory |
|-------|-----------|
| Title / Caption | Yes |
| Image File | Yes (PNG/JPG) |
| Description | Optional |
| Status | Yes |

#### 5.13.3 Video Fields

| Field | Mandatory |
|-------|-----------|
| Title | Yes |
| YouTube URL | Yes (validated) |
| Short Description | Optional |
| Status | Yes |

#### 5.13.4 Content Lifecycle

- `draft` – Not shown in app
- `published` – Visible in app, can trigger push notification
- `archived` – Not visible, kept for history

#### 5.13.5 Training / Workshop

Use Blog/Graphic with flag:
- Is Training/Workshop (Boolean)
- Event Date (Optional)
- Event Link (URL)

---

### 5.14 Notification Engine

Cross-cutting service for:
- Internal notifications via **Email**
- External notifications via **Mobile Push**

#### 5.14.1 Notification Channels

**Internal Email:** Leads, Quotations, Verification, Tasks, Reports, Payments

**Mobile Push:** New content, Training announcements, Project status changes

#### 5.14.2 Notification Types by Module

| Module | Notification Events |
|--------|---------------------|
| CRM | New Enquiry, Lead Assigned |
| Quotation | Uploaded, Accepted, Rejected |
| Checklist | Assigned to Client, Ready for Verification, Passed/Failed |
| Tasks | Assignment, Blocked, Completed |
| Reports | Draft Generated, Ready for Review |
| Client Review | Draft Shared, Comment Added, Approved |
| Payment | Invoice Uploaded, Payment Received |
| CMS | Blog/Video/Graphic Published, Training Announced |
| Project Status | Status changes (push to clients) |

#### 5.14.3 Notification Templates

Templates with placeholders: `{{client_name}}`, `{{project_name}}`, `{{due_date}}`, etc.

---

### 5.15 User Management & RBAC (Functional)

#### 5.15.1 User Entity

| Field | Mandatory |
|-------|-----------|
| User ID | Auto |
| Full Name | Yes |
| Email | Yes (unique) |
| Phone | Optional |
| Password (hashed) | Yes |
| Status | Yes (active, inactive) |
| User Type | Yes (internal, client) |
| Client Organization | Conditional |
| Roles (list) | Yes |

#### 5.15.2 User Lifecycle

- **Create User:** Admin enters details, system sends password setup email
- **Activate/Deactivate:** Toggle status
- **Reset Password:** Admin trigger or user "Forgot Password"

#### 5.15.3 Authentication

- Login with Email + Password
- JWT tokens
- Session timeout (configurable)
- Logout option

---

### 5.16 Mobile App Functional Requirements

#### 5.16.1 Platforms & Users

- **Platforms:** Android + iOS
- **Public User:** Browse content, submit enquiry
- **Client User:** Above + project status view + notifications

#### 5.16.2 App Home Screen

- Top banner (featured graphic)
- Latest Blogs, Videos, Graphics
- "My Projects" button (logged-in users)

#### 5.16.3 Content Browsing

- Blog List/Detail
- Graphics List/Detail
- Videos List/Detail (YouTube embed)

#### 5.16.4 Enquiry Form

Fields: Name, Email, Phone, Company, Service Required, Message

#### 5.16.5 My Projects (Clients Only)

- List of projects with status
- Project Detail (read-only status timeline)

#### 5.16.6 Notifications

- Content notifications
- Project status notifications
- Notification settings (toggle on/off)

---

### 5.17 Additional Requirements

#### 5.17.1 Meeting Scheduling with Google Meet

- Schedule Meeting Form (Title, DateTime, Duration, Participants, Description)
- Google Calendar Integration via OAuth
- Auto-generate Google Meet link
- Meeting List per project

#### 5.17.2 Personal Task Tracker

- Personal Tasks (not project-linked)
- Fields: Title, Description, Assigned To, Due Date, Status, Mandatory flag
- **Logout Restriction:** Cannot log out with pending mandatory tasks

#### 5.17.3 In-System Calculation Engine

- Formula Engine (arithmetic, aggregations)
- Data inputs from checklists and execution
- Outputs used in report templates

#### 5.17.4 Communication Module (Chat)

- One-to-One messaging
- Group Chat (per project or team)
- Text + small file attachments
- Read/unread indicators

#### 5.17.5 EcoVadis Reporting Layer

- Structured data output by pillar
- Sample document templates
- Report Bundle Export (ZIP)

---

## 6. Non-Functional Requirements

### 6.1 Performance

- API response times < 500ms
- Paginated views for large datasets
- File upload limits: 5-20 MB (configurable)

### 6.2 Security

- JWT-based authentication
- Secure password hashing (bcrypt)
- RBAC enforced at backend
- HTTPS only
- Input validation and sanitization
- Access-controlled file downloads

### 6.3 Reliability & Backup

- Daily database backups
- Regular file storage backups
- Uptime target: ~99%
- Comprehensive logging

### 6.4 Maintainability

- Code organized by domain
- Clear separation of concerns
- Configuration via environment variables

### 6.5 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation
- Initial release: English only

---

## 7. API Specification (High-Level)

Base URL: `/api/v1`

### Response Format

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {}
  }
}
```

### API Modules

| Module | Key Endpoints |
|--------|---------------|
| Auth | POST /auth/login, /auth/logout, /auth/forgot-password |
| Users | GET/POST/PUT /users, /users/:id |
| Roles | GET/POST/PUT /roles |
| Organizations | GET/POST/PUT /organizations |
| Leads | GET/POST/PUT /leads, POST /enquiries |
| Quotations | GET/POST/PUT /quotations |
| Projects | GET/POST/PUT /projects |
| Checklists | GET/POST/PUT /checklist-templates, /project-checklists |
| Verification | POST /projects/:id/send-for-verification, /verification-decision |
| Tasks | GET/POST/PUT /projects/:id/tasks, /tasks/:id |
| Personal Tasks | GET/POST/PUT /personal-tasks |
| Execution Files | GET/POST /projects/:id/execution-files |
| Reports | POST /projects/:id/reports/generate-draft, /upload-draft, /upload-final |
| Client Review | GET/POST /projects/:id/client-comments, /client-approval |
| Payments | PUT /projects/:id/payment |
| Invoices | GET/POST /projects/:id/invoice |
| EcoVadis | GET /projects/:id/ecovadis/dashboard, /items, POST /export |
| CMS | GET/POST/PUT /cms/posts, /cms/categories |
| Notifications | POST /devices/register, GET /notifications/logs |
| Meetings | GET/POST /projects/:id/meetings |
| Chat | GET/POST /conversations, /conversations/:id/messages |

---

## 8. Data Model & Entity Overview

### 8.1 Core Security & RBAC

- `users` - id, email, password_hash, full_name, user_type, status, organization_id
- `roles` - id, name, description, status
- `permissions` - id, code, description
- `role_permissions` - role_id, permission_id
- `user_roles` - user_id, role_id

### 8.2 CRM & Organizations

- `organizations` - id, name, address, primary_contact_*
- `enquiries` - id, name, email, phone, company, service_id, message, source
- `leads` - id, organization_id, contact_*, status, assigned_to
- `services` - id, name, description, expected_tat_days, active

### 8.3 Quotations & Projects

- `quotations` - id, lead_id, organization_id, title, amount, status
- `quotation_files` - id, quotation_id, file_path, original_name
- `projects` - id, name, organization_id, quotation_id, status, verification_status, execution_status, client_review_status, payment_status
- `project_services` - project_id, service_id

### 8.4 Checklists

- `checklist_templates` - id, name, category, description, active
- `checklist_template_items` - id, template_id, code, label, type, mandatory, visible_to_client
- `project_checklists` - id, project_id, template_id, version, status, completeness_percent
- `project_checklist_items` - id, project_checklist_id, template_item_id, value_*, verified_status
- `checklist_item_files` - id, project_checklist_item_id, file_path, version

### 8.5 Tasks & Execution

- `project_tasks` - id, project_id, title, assigned_to, status, priority, due_date
- `personal_tasks` - id, assigned_to, title, status, mandatory, due_date
- `execution_files` - id, project_id, task_id, file_path, uploaded_by

### 8.6 Reports

- `report_templates` - id, name, service_id, template_type, file_path
- `project_reports` - id, project_id, version, type, is_manual_upload, docx_path, pdf_path

### 8.7 Client Review

- `project_comments` - id, project_id, author_id, origin, type, text, status

### 8.8 Payments & Invoices

- `project_payments` - id, project_id, payment_status, amount_expected, amount_received
- `project_invoices` - id, project_id, invoice_number, invoice_date, file_path

### 8.9 EcoVadis

- `ecovadis_items` - id, pillar, category, title, mandatory
- `project_ecovadis_status` - id, project_id, pillar, total_items, completed_items

### 8.10 CMS

- `cms_categories` - id, name
- `cms_posts` - id, type, title, slug, content, status, audience, is_featured
- `cms_tags` - id, name
- `cms_post_tags` - post_id, tag_id

### 8.11 Notifications

- `device_tokens` - id, user_id, platform, device_token
- `notifications_log` - id, recipient_user_id, channel, type, payload, status

### 8.12 Meetings

- `meetings` - id, project_id, title, start_datetime, google_meet_link
- `meeting_participants` - meeting_id, email, user_id

### 8.13 Chat

- `conversations` - id, type, name, project_id
- `conversation_participants` - conversation_id, user_id
- `messages` - id, conversation_id, sender_id, text, attachment_path

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | Dec 2024 | Gunadhya Software | Initial draft |

---

*End of Document*
