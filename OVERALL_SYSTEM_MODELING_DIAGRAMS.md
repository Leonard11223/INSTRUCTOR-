# Mindoro State University (MinSU) E-Learn & Networking Academy
## Comprehensive System Modeling & Complete 17-Diagram Architectural Blueprint
### Unified Reference for All User Roles: Super Administrator, Academic Administrator, Instructor, Teaching Assistant, and Student

---

## Objective
To apply comprehensive system modeling concepts to the **Mindoro State University (MinSU) E-Learn & Networking Academy** by identifying, selecting, and documenting the complete suite of **8 Structural Diagrams (The Static Blueprint)** and **9 Behavioral Diagrams (The System in Motion)**. This blueprint provides a unified, production-grade architectural specification covering all five user roles—**Super Administrator (`super_admin`)**, **Academic Administrator (`academic_admin`)**, **Instructor / Faculty (`instructor`)**, **Teaching Assistant (`teaching_assistant`)**, and **Student / Learner (`student`)**—across Mindoro State University's Bongabong, Main (Victoria), and Calapan City campuses.

---

## Part 1: Core Modeling Framework

Every proposed software system must be viewed through two distinct lenses to ensure it can be successfully engineered, audited, and maintained:

### 1. Structural Diagrams (The Static Blueprint)
- **What it is:** These diagrams map out the static skeleton of your project—what parts make up the system architecture, how they are organized, and where they will be hosted.
- **Key Rule:** These components and relationships do not change based on individual user actions. They represent the permanent infrastructure, domain classes, components, or codebase layout.
- **Core Examples:** System Architecture, Class, Component, Deployment, Object, Package, Composite Structure, and Profile diagrams.

### 2. Behavioral Diagrams (The System in Motion)
- **What it is:** These diagrams document the dynamic logic of your project—how data moves, how components interact step-by-step, and how the system responds to users over time.
- **Key Rule:** These change dynamically based on triggers, inputs, time, or external events.
- **Core Examples:** Data Flow Diagrams (DFD), Use Case, Activity, Sequence, State Machine, Communication, Interaction Overview, Timing, and Requirement (SysML) diagrams.

---

## Part 2: Diagram Reference Guide

### Section A: Structural Diagrams (The Static Blueprint)
| Diagram Name | Primary Purpose | Best Used For (MinSU LMS Context) |
| :--- | :--- | :--- |
| **System Architecture Diagram** | High-level layout of clients, application servers, security gateways, and databases. | Explaining the end-to-end 3-tier system architecture supporting all 5 roles across MinSU campuses. |
| **Class Diagram** | Maps object-oriented models, attributes, methods, relationships, and multiplicities. | The baseline database and ORM schema for users, roles, courses, sections, modules, labs, grades, and logs. |
| **Component Diagram** | Shows software pieces (modules, libraries, microservices) and dependencies. | Wiring React SPA page components, Express controllers, RBAC filters, and Sequelize models. |
| **Deployment Diagram** | Maps software artifacts to physical hardware, virtualization, or cloud containers. | DevOps deployment across MinSU campus client workstations, Nginx proxy, Node.js API, and PostgreSQL. |
| **Object Diagram** | Captures a concrete snapshot of class instances at an exact moment in time. | Troubleshooting real-world runtime states involving active admins, faculty, TAs, students, and lab submissions. |
| **Package Diagram** | Groups classes or components into higher-level logical directories/packages. | Managing the monorepo directory layout between client, server, routes, controllers, and models. |
| **Composite Structure Diagram** | Breaks down internal structure, ports, and parts of a single complex classifier. | Detailing the inner processing pipelines of the MinSU Academy Core Application Engine. |
| **Profile Diagram** | Customizes UML elements with domain-specific stereotypes and tagged values. | Defining institutional stereotypes (`<<MinSURoleGuard>>`, `<<SelectionOnlyRule>>`, `<<AuditLogged>>`). |

### Section B: Behavioral Diagrams (The System in Motion)
| Diagram Name | Primary Purpose | Best Used For (MinSU LMS Context) |
| :--- | :--- | :--- |
| **Data Flow Diagram (DFD)** | Traces how data enters, transforms through processes, and hits storage. | Mapping data movement from all 5 user inputs through validation to database stores. |
| **Use Case Diagram** | Maps external actors (roles) to functional system use cases and boundaries. | Defining the full institutional functional scope for SuperAdmin, AcademicAdmin, Instructor, TA, and Student. |
| **Activity Diagram** | Flowchart showing operational workflows, logic gates, and parallel actions. | Documenting end-to-end workflows (e.g., student lab submission, quiz grading, and certificate generation). |
| **Sequence Diagram** | Coordinates chronological, step-by-step messages between system entities. | Debugging multi-table transactions (e.g., instructor rubric grading auto-syncing into student gradebook). |
| **State Machine Diagram** | Tracks lifecycle stages an entity undergoes based on events and triggers. | Modeling the lifecycle of Courses, Assignments, Submissions, Quizzes, and Student Certifications. |
| **Communication Diagram** | Explores freeform object network structure and numbered message exchanges. | Visualizing collaboration between UI components, auth guards, controllers, and database models. |
| **Interaction Overview Diagram** | Combines high-level activity nodes with embedded sequence diagrams. | Orchestrating the complete academic semester lifecycle from term setup to final grade archiving. |
| **Timing Diagram** | Explores exact timing constraints and state changes over an explicit timeline. | Verifying real-time SLA deadlines (JWT verification, quiz auto-scoring, and grade sync under 250ms). |
| **Requirement Diagram (SysML)**| Maps formal textual requirements to software components and automated tests. | Ensuring strict traceability for RBAC, selection-only quizzes, rubric grading, and certificate validation. |

---

## Part 3: Completed Blueprinting Exercise (All 5 MinSU User Roles)

### 1. Project Identification
- **Proposal Title:** **Mindoro State University (MinSU) E-Learn & Networking Academy: A Web-Based Role-Driven Learning Management System Inspired by Cisco NetAcad**
- **System Summary (2–3 Sentences):**
  The Mindoro State University (MinSU) E-Learn & Networking Academy is an enterprise-grade, role-driven Learning Management System designed specifically for MinSU's College of Computer Studies across its Bongabong, Main (Victoria), and Calapan City campuses. The platform establishes five distinct, secure user workspaces—Super Administrator, Academic Administrator, Instructor/Faculty, Teaching Assistant, and Student/Learner—enabling end-to-end management of academic terms, hands-on Cisco Packet Tracer networking labs, strict selection-only checkpoint assessments, rubric-based submission grading, weighted gradebooks, and instant HTML5 badge and certificate generation.

### 2. Structural Blueprinting
- **Selected Essential Structural Diagram:** **Class Diagram (A2)** paired with **System Architecture Diagram (A1)**.
- **Why Required:**
  The Class Diagram establishes the foundational relational schema connecting all 5 roles: `User` (`role: super_admin | academic_admin | instructor | teaching_assistant | student`), `AcademicTerm`, `Course`, `ClassSection`, `Enrollment`, `Module`, `Lesson`, `Assignment`, `Submission`, `Assessment`, `Question`, `GradeItem`, `GradeRecord`, and `AuditLog`. It guarantees relational integrity, foreign key constraints, cascade rules, and JSON schemas (rubrics, selection-only questions), ensuring data consistency across all campus operations.

### 3. Behavioral Blueprinting
- **Selected Critical Behavioral Diagram 1:** **Use Case Diagram (B2)**.
  - **Specific Project Scenario Mapped:** Defines the complete functional boundaries and permission matrix for all five actors: SuperAdmin (system config, user management, audit logs), AcademicAdmin (course offerings, class section scheduling, faculty assignments), Instructor (curriculum authoring, selection-only quiz builder, rubric grading, section gradebook), Teaching Assistant (section monitoring, preliminary submission notes, discussion moderation), and Student (enrolled courses, lab execution, timed selection quizzes with instant score %, badge/certificate downloads).
- **Selected Critical Behavioral Diagram 2:** **Sequence Diagram (B4)**.
  - **Specific Project Scenario Mapped:** Details the end-to-end coursework submission and evaluation loop: a Student submits a Packet Tracer lab, a Teaching Assistant reviews and attaches preliminary notes, the Instructor applies an interactive JSON rubric (`PUT /api/v1/assignments/submissions/:id/grade`), the system updates the `Submission`, upserts the student's `GradeRecord`, recalculates the weighted course average, and issues an automated in-app notification.

### 4. Data Blueprinting
- **How Data Flows from User Input to the System Database:**
  1. **User Interaction:** A user on any of the 5 roles interacts with the React 18 SPA (e.g., Student submits quiz answers; Instructor grades a submission; SuperAdmin updates system settings).
  2. **API Dispatch:** The centralized Axios client (`api.js`) attaches `Authorization: Bearer <JWT>` and dispatches an HTTP REST request to the Express API.
  3. **Security Gate:** Express middleware checks token validity (`authenticate`) and role authorization (`authorize(...)`).
  4. **Controller & ORM Logic:** The specialized controller validates inputs, executes business logic, and coordinates transactions via Sequelize ORM into PostgreSQL/SQLite3.
  5. **Persistence & Side Effects:** Changes are committed to relational tables, grade records are synchronized, notifications are generated, and security audit logs are recorded.

---

# SECTION 1: ALL 8 STRUCTURAL DIAGRAMS (THE STATIC BLUEPRINT)

---

## A1. System Architecture Diagram (Unified Multi-Role Architecture)

### Copy-Paste AI Prompt
```text
Create a high-level System Architecture Diagram for the "Mindoro State University (MinSU) E-Learn & Networking Academy" supporting 5 distinct user roles (Super Administrator, Academic Administrator, Instructor, Teaching Assistant, and Student).
Divide the architecture into 4 clean horizontal layers:
1. Client Layer (React 18 + Vite + Tailwind CSS SPA):
   - SuperAdmin Workspace (`/admin/*`: Users, Audit Logs, Terms, Settings)
   - AcademicAdmin Workspace (`/academic/*`: Departments, Programs, Course Offerings, Sections)
   - Instructor Workspace (`/instructor/*`: Course Studio, Assignments, Rubric Grader, Quizzes, Gradebook)
   - Teaching Assistant Workspace (`/ta/*`: Section Rosters, Submission Reviews, Discussions)
   - Student Workspace (`/student/*`: Enrolled Courses, Modules, Guided Labs, Timed Quizzes, Badges & Certificates)
2. Security & API Gateway Layer (Express.js):
   - Reverse Proxy & SSL Termination (Nginx)
   - Security Middleware: Helmet, CORS, Rate Limiting, Request Logging (Morgan)
   - Authentication & RBAC Guard: JWT Validator (`authenticate`), Role Dispatcher (`authorize`)
3. Business Application Layer (Express REST Controllers):
   - Auth Controller, Academic Controller, Course Controller, Assignment & Rubric Controller, Assessment & Selection Quiz Controller, Gradebook Controller, User & Audit Controller
4. Persistence & Storage Layer:
   - Sequelize ORM Layer
   - Relational Database (PostgreSQL 16 / SQLite3)
   - Static Asset & Packet Tracer Lab Storage
Connect all layers with directional arrows showing HTTPS/JSON and SQL database queries.
```

### Mermaid Diagram
```mermaid
flowchart TB
    subgraph ClientLayer["1. Client Layer (MinSU Web Browser SPA — React 18 + Vite)"]
        SA_UI["SuperAdmin Portal<br/>(/admin/*)"]
        AA_UI["Academic Admin Portal<br/>(/academic/*)"]
        INS_UI["Instructor Course Studio<br/>(/instructor/*)"]
        TA_UI["Teaching Assistant Portal<br/>(/ta/*)"]
        STU_UI["Student Learning Portal<br/>(/student/*)"]
    end

    subgraph GatewayLayer["2. Gateway & Security Middleware (Node.js + Express)"]
        Proxy["Nginx Reverse Proxy & TLS 1.3"]
        SecMW["Security Middlewares (Helmet, CORS, RateLimiter)"]
        AuthMW["JWT Auth & RBAC Guard (authenticate + authorize)"]
    end

    subgraph ServiceLayer["3. Business Application Services (Controllers)"]
        AuthSvc["Auth & Session Controller"]
        AcadSvc["Academic & Section Controller"]
        StudioSvc["Course Studio & Content Controller"]
        AssignSvc["Assignment & Rubric Controller"]
        AssessSvc["Assessment & Selection Quiz Engine"]
        GradeSvc["Gradebook & Calculation Engine"]
        AuditSvc["User Admin & Audit Log Controller"]
    end

    subgraph DataLayer["4. Persistence & File Storage Layer"]
        ORM["Sequelize ORM Layer"]
        DB[(PostgreSQL 16 / SQLite3<br/>Unified Relational Database)]
        Storage[("Static Lab Assets &<br/>Packet Tracer Repositories")]
    end

    SA_UI & AA_UI & INS_UI & TA_UI & STU_UI -->|"HTTPS / REST JSON"| Proxy
    Proxy --> SecMW --> AuthMW
    AuthMW --> AuthSvc & AcadSvc & StudioSvc & AssignSvc & AssessSvc & GradeSvc & AuditSvc
    AuthSvc & AcadSvc & StudioSvc & AssignSvc & AssessSvc & GradeSvc & AuditSvc --> ORM
    ORM <-->|"SQL Queries & Transactions"| DB
    StudioSvc & AssignSvc <-->|"File I/O"| Storage
```

---

## A2. Class Diagram (Complete Unified Domain Model)

### Copy-Paste AI Prompt
```text
Generate a comprehensive UML Class Diagram for the Mindoro State University (MinSU) E-Learn & Networking Academy incorporating all five user roles and core entities.
Classes to include with attributes and relationships:
1. `User`: `id: Integer`, `username: String`, `email: String`, `role: Enum('super_admin','academic_admin','instructor','teaching_assistant','student')`, `campus: Enum('Bongabong','Victoria','Calapan')`, `status: Enum('active','suspended')`.
2. `AcademicTerm`: `id: Integer`, `name: String`, `startDate: Date`, `endDate: Date`, `isCurrent: Boolean`.
3. `Course`: `id: Integer`, `code: String`, `title: String`, `description: Text`, `level: Enum('beginner','intermediate','advanced')`, `status: Enum('draft','published')`.
4. `ClassSection`: `id: Integer`, `courseId: Integer`, `termId: Integer`, `instructorId: Integer`, `taId: Integer`, `sectionCode: String`, `capacity: Integer`.
5. `Enrollment`: `id: Integer`, `classSectionId: Integer`, `studentId: Integer`, `status: Enum('enrolled','dropped','completed')`, `progressPct: Float`.
6. `Module`: `id: Integer`, `courseId: Integer`, `title: String`, `orderIndex: Integer`.
7. `Lesson`: `id: Integer`, `moduleId: Integer`, `title: String`, `contentType: Enum('reading','lab','video')`, `labInstructions: Text`.
8. `Assignment`: `id: Integer`, `courseId: Integer`, `title: String`, `dueDate: DateTime`, `maxScore: Float`, `rubric: JSON`.
9. `Submission`: `id: Integer`, `assignmentId: Integer`, `studentId: Integer`, `status: Enum('submitted','late','graded','returned')`, `numericScore: Float`, `rubricBreakdown: JSON`, `gradedById: Integer`.
10. `Assessment`: `id: Integer`, `courseId: Integer`, `title: String`, `timeLimitMinutes: Integer`, `passingScorePct: Float`.
11. `Question`: `id: Integer`, `assessmentId: Integer`, `type: Enum('multiple_choice','true_false','multiple_select','matching')`, `prompt: Text`, `options: JSON`, `correctAnswer: JSON`, `points: Float`.
12. `AssessmentAttempt`: `id: Integer`, `assessmentId: Integer`, `studentId: Integer`, `score: Float`, `percentage: Float`, `passed: Boolean`.
13. `GradeItem`: `id: Integer`, `courseId: Integer`, `title: String`, `category: Enum('assignment','quiz','exam','lab')`, `weight: Float`.
14. `GradeRecord`: `id: Integer`, `gradeItemId: Integer`, `studentId: Integer`, `score: Float`.
15. `AuditLog`: `id: Integer`, `userId: Integer`, `action: String`, `resource: String`, `details: JSON`, `ipAddress: String`.
Connect all classes with appropriate associations, aggregations, compositions, and foreign key notes.
```

### Mermaid Diagram
```mermaid
classDiagram
    class User {
        +Integer id
        +String username
        +String email
        +Enum role
        +Enum campus
        +Enum status
        +login()
        +updateProfile()
    }

    class AcademicTerm {
        +Integer id
        +String name
        +Date startDate
        +Date endDate
        +Boolean isCurrent
    }

    class Course {
        +Integer id
        +String code
        +String title
        +Enum level
        +Enum status
    }

    class ClassSection {
        +Integer id
        +Integer courseId
        +Integer termId
        +Integer instructorId
        +Integer taId
        +String sectionCode
        +Integer capacity
    }

    class Enrollment {
        +Integer id
        +Integer classSectionId
        +Integer studentId
        +Enum status
        +Float progressPct
    }

    class Module {
        +Integer id
        +Integer courseId
        +String title
        +Integer orderIndex
    }

    class Lesson {
        +Integer id
        +Integer moduleId
        +String title
        +Enum contentType
        +Text labInstructions
    }

    class Assignment {
        +Integer id
        +Integer courseId
        +String title
        +DateTime dueDate
        +Float maxScore
        +JSON rubric
    }

    class Submission {
        +Integer id
        +Integer assignmentId
        +Integer studentId
        +Enum status
        +Float numericScore
        +JSON rubricBreakdown
        +Integer gradedById
    }

    class Assessment {
        +Integer id
        +Integer courseId
        +String title
        +Integer timeLimitMinutes
        +Float passingScorePct
    }

    class Question {
        +Integer id
        +Integer assessmentId
        +Enum type
        +Text prompt
        +JSON options
        +JSON correctAnswer
        +Float points
    }

    class AssessmentAttempt {
        +Integer id
        +Integer assessmentId
        +Integer studentId
        +Float score
        +Float percentage
        +Boolean passed
    }

    class GradeItem {
        +Integer id
        +Integer courseId
        +String title
        +Enum category
        +Float weight
        +Float maxScore
    }

    class GradeRecord {
        +Integer id
        +Integer gradeItemId
        +Integer studentId
        +Float score
    }

    class AuditLog {
        +Integer id
        +Integer userId
        +String action
        +String resource
        +JSON details
        +String ipAddress
    }

    User "1" --> "0..*" ClassSection : teaches (as Instructor)
    User "1" --> "0..*" ClassSection : assists (as TA)
    User "1" --> "0..*" Enrollment : enrolls (as Student)
    User "1" --> "0..*" AuditLog : triggers
    AcademicTerm "1" --> "0..*" ClassSection : schedules
    Course "1" --> "0..*" ClassSection : offers
    Course "1" *-- "0..*" Module : contains
    Module "1" *-- "0..*" Lesson : structures
    Course "1" *-- "0..*" Assignment : assigns
    Assignment "1" --> "0..*" Submission : receives
    User "1" --> "0..*" Submission : submits/evaluates
    Course "1" *-- "0..*" Assessment : tests
    Assessment "1" *-- "1..*" Question : contains
    Assessment "1" --> "0..*" AssessmentAttempt : records
    ClassSection "1" --> "0..*" Enrollment : includes
    Course "1" *-- "0..*" GradeItem : evaluates
    GradeItem "1" --> "0..*" GradeRecord : stores
    Enrollment "1" --> "0..*" GradeRecord : accumulates
```

---

## A3. Component Diagram (Software Architecture & Modules)

### Copy-Paste AI Prompt
```text
Create a UML Component Diagram showing the major front-end and back-end software components of the Mindoro State University (MinSU) E-Learn & Networking Academy.
Show dependencies between:
1. Frontend Components (`client/src`):
   - `AppLayout` (Navigation, Campus Header, Dynamic Role-Based Sidebar)
   - Role Page Containers: `SuperAdminPages`, `AcademicAdminPages`, `InstructorPages`, `TaAndSharedPages`, `StudentPages`
   - UI Modules: `CourseStudio`, `RubricGrader`, `SelectionAssessmentStudio`, `CertificateDownloader`
   - Core API Client: `api.js` (Axios with Bearer Interceptor)
2. Backend Components (`server/src`):
   - `AuthenticationMiddleware` (`authenticate`, `authorize`)
   - `AuditLogMiddleware` (Captures mutations)
   - Specialized Controllers: `academic.controller`, `course.controller`, `assignment.controller`, `assessment.controller`, `admin.controller`
   - Model Layer: `SequelizeDatabaseEngine` (SQLite3 / PostgreSQL)
Link components using standard UML interface connectors and dependency arrows.
```

### Mermaid Diagram
```mermaid
flowchart LR
    subgraph FrontendSPA["Client-Side SPA Components (React 18 + Vite)"]
        Layout["[Component]<br/>AppLayout.jsx"]
        SAPages["[Component]<br/>SuperAdminPages"]
        AAPages["[Component]<br/>AcademicAdminPages"]
        INSPages["[Component]<br/>InstructorPages"]
        TAPages["[Component]<br/>TaAndSharedPages"]
        STUPages["[Component]<br/>StudentPages"]
        ApiClient["[Component]<br/>api.js (Axios Client)"]
    end

    subgraph BackendAPI["Backend Express Services (Node.js)"]
        AuthFilter["[Component]<br/>auth.middleware.js"]
        AuditFilter["[Component]<br/>audit.middleware.js"]
        AcadCtrl["[Component]<br/>academic.controller.js"]
        AssignCtrl["[Component]<br/>assignment.controller.js"]
        AssessCtrl["[Component]<br/>assessment.controller.js"]
        AdminCtrl["[Component]<br/>admin.controller.js"]
        ORMComp["[Component]<br/>Sequelize ORM Engine"]
    end

    Layout --> SAPages & AAPages & INSPages & TAPages & STUPages
    SAPages & AAPages & INSPages & TAPages & STUPages --> ApiClient
    ApiClient -->|"REST API Calls"| AuthFilter
    AuthFilter --> AuditFilter
    AuditFilter --> AcadCtrl & AssignCtrl & AssessCtrl & AdminCtrl
    AcadCtrl & AssignCtrl & AssessCtrl & AdminCtrl --> ORMComp
```

---

## A4. Deployment Diagram (Physical & Containerized Infrastructure)

### Copy-Paste AI Prompt
```text
Create a UML Deployment Diagram for the Mindoro State University (MinSU) E-Learn & Networking Academy.
Illustrate the deployment across 3 physical/virtual tiers:
1. Client Device Nodes (MinSU Campuses: Bongabong, Victoria, Calapan):
   - Admin Workstations, Faculty Laptops, Student Lab PCs running Modern Browsers (Chrome/Edge/Firefox)
2. Application Server Node (Ubuntu 24.04 LTS Host running Docker):
   - Docker Container 1: `nginx:alpine` (Reverse Proxy, SSL Termination, Static Asset Serving on Port 443)
   - Docker Container 2: `minsu-lms-backend:latest` (Node.js 20 LTS Runtime running Express API on Port 5000)
3. Database & Storage Server Node:
   - Docker Container 3: `postgres:16-alpine` (Relational database with persistent volume `/var/lib/postgresql/data`)
   - Persistent File Storage Volume (`/app/storage/labs` for guided Packet Tracer labs, student attachments, and backup dumps)
Show connection protocols: HTTPS/TLS 1.3 between clients and Nginx, TCP Port 5000 internally, and TCP Port 5432 for DB connections.
```

### Mermaid Diagram
```mermaid
flowchart TB
    subgraph CampusClients["<<Device Node>> MinSU Campus Clients (Bongabong, Main-Victoria, Calapan)"]
        AdminPC["<<Client PC>><br/>Admin Workstation<br/>Browser"]
        FacultyPC["<<Client PC>><br/>Faculty Laptop<br/>Browser"]
        StudentPC["<<Client PC>><br/>Computer Lab PC<br/>Browser + Packet Tracer"]
    end

    subgraph AppHost["<<Server Node>> MinSU Application Host (Ubuntu 24.04 LTS / Docker)"]
        subgraph NginxPod["<<Container>> Web Gateway"]
            Nginx["Nginx 1.25<br/>(TLS 1.3 / Port 443)"]
        end
        subgraph NodePod["<<Container>> API Server"]
            ExpressAPI["Node.js 20 LTS<br/>Express LMS Backend<br/>(Port 5000)"]
        end
    end

    subgraph DataHost["<<Server Node>> MinSU Data & Backup Host"]
        subgraph DBContainer["<<Container>> Database"]
            PostgreSQL["PostgreSQL 16 DB<br/>(Port 5432)"]
        end
        subgraph FileVolume["<<Storage Volume>>"]
            LabStorage["Persistent Volume<br/>(/app/storage/labs & backups)"]
        end
    end

    AdminPC & FacultyPC & StudentPC -->|"HTTPS / TLS 1.3 (Port 443)"| Nginx
    Nginx -->|"Internal Proxy (TCP 5000)"| ExpressAPI
    ExpressAPI <-->|"TCP 5432"| PostgreSQL
    ExpressAPI <-->|"File Mount"| LabStorage
```

---

## A5. Object Diagram (Concrete Runtime System Snapshot)

### Copy-Paste AI Prompt
```text
Create a UML Object Diagram illustrating a concrete runtime snapshot of the Mindoro State University (MinSU) E-Learn & Networking Academy during the 1st Semester A.Y. 2026-2027.
Show specific object instances representing all 5 roles and active entities:
- `adminUser : User` (`id = 1`, `username = "superadmin"`, `role = "super_admin"`, `campus = "Main (Victoria)"`)
- `acadDean : User` (`id = 2`, `username = "dean_ccs"`, `role = "academic_admin"`, `campus = "Bongabong"`)
- `profSantos : User` (`id = 3`, `username = "prof_santos"`, `role = "instructor"`, `campus = "Bongabong"`)
- `taReyes : User` (`id = 4`, `username = "ta_reyes"`, `role = "teaching_assistant"`, `campus = "Bongabong"`)
- `studDelaCruz : User` (`id = 5`, `username = "stud_delacruz"`, `role = "student"`, `campus = "Bongabong"`)
- `term2026 : AcademicTerm` (`id = 1`, `name = "1st Semester A.Y. 2026-2027"`, `isCurrent = true`)
- `courseNet101 : Course` (`id = 1`, `code = "NET-101"`, `title = "Introduction to Networking & Packet Tracer"`)
- `secBsit2A : ClassSection` (`id = 1`, `sectionCode = "BSIT-2A-NET101"`, `instructorId = 3`, `taId = 4`)
- `assignVlan : Assignment` (`id = 10`, `title = "Packet Tracer Lab: VLAN Trunking"`, `maxScore = 100`)
- `subStudent : Submission` (`id = 25`, `studentId = 5`, `numericScore = 95.0`, `status = "graded"`, `gradedById = 3`)
- `grRecord : GradeRecord` (`id = 42`, `studentId = 5`, `score = 95.0`)
Connect instances showing exact associations and runtime links.
```

### Mermaid Diagram
```mermaid
flowchart TB
    admin["<u>adminUser : User</u><br/>id = 1<br/>role = 'super_admin'<br/>campus = 'Main (Victoria)'"]
    dean["<u>acadDean : User</u><br/>id = 2<br/>role = 'academic_admin'<br/>campus = 'Bongabong'"]
    prof["<u>profSantos : User</u><br/>id = 3<br/>role = 'instructor'<br/>campus = 'Bongabong'"]
    ta["<u>taReyes : User</u><br/>id = 4<br/>role = 'teaching_assistant'<br/>campus = 'Bongabong'"]
    stud["<u>studDelaCruz : User</u><br/>id = 5<br/>role = 'student'<br/>campus = 'Bongabong'"]

    term["<u>term2026 : AcademicTerm</u><br/>id = 1<br/>name = '1st Sem 2026-2027'<br/>isCurrent = true"]
    course["<u>courseNet101 : Course</u><br/>id = 1<br/>code = 'NET-101'<br/>status = 'published'"]
    sec["<u>secBsit2A : ClassSection</u><br/>id = 1<br/>sectionCode = 'BSIT-2A-NET101'"]
    assign["<u>assignVlan : Assignment</u><br/>id = 10<br/>title = 'VLAN Trunking Lab'<br/>maxScore = 100.0"]
    sub["<u>subStudent : Submission</u><br/>id = 25<br/>numericScore = 95.0<br/>status = 'graded'"]
    gr["<u>grRecord : GradeRecord</u><br/>id = 42<br/>score = 95.0"]

    term --> sec
    course --> sec
    prof -->|"teaches"| sec
    ta -->|"assists"| sec
    dean -->|"approved"| sec
    admin -->|"audits"| admin
    stud -->|"enrolledIn"| sec
    course --> assign
    assign --> sub
    stud -->|"submitted"| sub
    prof -->|"graded"| sub
    sub --> gr
```

---

## A6. Package Diagram (Monorepo Codebase Organization)

### Copy-Paste AI Prompt
```text
Create a UML Package Diagram representing the architectural directory and package organization of the MinSU LMS monorepo.
Packages to include:
1. `client` (Frontend Application):
   - `client.layouts` (`AppLayout.jsx`)
   - `client.pages` (`SuperAdminPages`, `AcademicAdminPages`, `InstructorPages`, `TaAndSharedPages`, `StudentPages`, `PublicPages`)
   - `client.services` (`api.js`, `AuthContext.jsx`)
2. `server` (Backend Application):
   - `server.routes` (`academic.routes`, `assignment.routes`, `assessment.routes`, `admin.routes`)
   - `server.middleware` (`auth.middleware`, `audit.middleware`)
   - `server.controllers` (`academic.controller`, `assignment.controller`, `assessment.controller`, `admin.controller`)
   - `server.models` (`User`, `Course`, `ClassSection`, `Module`, `Lesson`, `Assignment`, `Submission`, `Assessment`, `Question`, `GradeItem`, `GradeRecord`, `AuditLog`)
Show dependency arrows (`<<import>>`, `<<use>>`, `<<call>>`) connecting these packages.
```

### Mermaid Diagram
```mermaid
flowchart TB
    subgraph ClientPkg["client/src"]
        PkgLayout["📁 layouts<br/>(AppLayout.jsx)"]
        PkgPages["📁 pages<br/>(SuperAdmin, AcademicAdmin, Instructor, TA, Student)"]
        PkgServices["📁 services & context<br/>(api.js, AuthContext.jsx)"]
    end

    subgraph ServerPkg["server/src"]
        PkgRoutes["📁 routes<br/>(admin, academic, assignment, assessment.routes.js)"]
        PkgMW["📁 middleware<br/>(auth.middleware.js, audit.middleware.js)"]
        PkgCtrl["📁 controllers<br/>(admin, academic, assignment, assessment.controller.js)"]
        PkgModels["📁 models<br/>(User, Course, Module, Assignment, Assessment, GradeRecord, AuditLog)"]
    end

    PkgLayout -.->|"<<renders>>"| PkgPages
    PkgPages -.->|"<<imports>>"| PkgServices
    PkgServices -.->|"<<HTTPS REST>>"| PkgRoutes
    PkgRoutes -.->|"<<uses>>"| PkgMW
    PkgRoutes -.->|"<<dispatches>>"| PkgCtrl
    PkgCtrl -.->|"<<queries>>"| PkgModels
```

---

## A7. Composite Structure Diagram (MinSU Core Application Engine)

### Copy-Paste AI Prompt
```text
Create a UML Composite Structure Diagram for the `MinSUCoreApplicationEngine` showing external ports and internal collaborating parts.
External Ports:
- `pClientREST`: Handles incoming requests from all 5 user roles
- `pDatabaseBridge`: Connects to Sequelize ORM for persistence
- `pNotificationPort`: Dispatches in-app alerts and grading notices
Internal Parts:
- `partRBACValidator`: Enforces role-based permissions (`super_admin`, `academic_admin`, `instructor`, `teaching_assistant`, `student`)
- `partCurriculumManager`: Manages course studio modules and Packet Tracer lessons
- `partSelectionAssessmentEngine`: Validates selection-only questions (`multiple_choice`, `true_false`, `multiple_select`, `matching`) and auto-grades quizzes
- `partRubricGradingSync`: Aggregates multi-criterion rubrics and upserts `GradeRecord`
- `partAuditLogger`: Writes immutable audit logs for administrative operations
Show internal wiring and connectors between ports and parts.
```

### Mermaid Diagram
```mermaid
flowchart LR
    subgraph EngineClassifier["<<Classifier>> MinSUCoreApplicationEngine"]
        PortREST(["[Port] pClientREST<br/>(HTTP REST Requests)"])

        subgraph Parts["Internal Collaborating Sub-Systems"]
            RBAC["[Part] partRBACValidator<br/>Role & Permission Guard"]
            Curr["[Part] partCurriculumManager<br/>Modules, Lessons, Guided Labs"]
            Assess["[Part] partSelectionAssessmentEngine<br/>Selection-Only Quiz Validator & Scorer"]
            Grader["[Part] partRubricGradingSync<br/>Rubric Calculator & GradeRecord Sync"]
            Audit["[Part] partAuditLogger<br/>Mutation & Security Audit Tracker"]
        end

        PortDB(["[Port] pDatabaseBridge<br/>(Sequelize ORM)"])
        PortNotif(["[Port] pNotificationPort<br/>(In-App Alert Service)"])
    end

    PortREST --> RBAC
    RBAC --> Curr & Assess & Grader & Audit
    Curr --> PortDB
    Assess --> PortDB
    Grader --> PortDB
    Grader --> PortNotif
    Audit --> PortDB
```

---

## A8. Profile Diagram (MinSU LMS UML Stereotype Profile)

### Copy-Paste AI Prompt
```text
Create a UML Profile Diagram defining institutional custom stereotypes for the Mindoro State University (MinSU) E-Learn & Networking Academy.
Metaclasses: `<<metaclass>> Class`, `<<metaclass>> Operation`, `<<metaclass>> Property`.
Stereotypes:
1. `<<stereotype>> MinSURoleGuard` (extends `Operation`): Tagged values `requiredRole = ['super_admin','academic_admin','instructor','teaching_assistant','student']`, `campus = ['Bongabong','Victoria','Calapan']`.
2. `<<stereotype>> SelectionOnlyQuestionRule` (extends `Class`): Tagged values `permittedTypes = ['multiple_choice','true_false','multiple_select','matching']`, `prohibitedTypes = ['fill_in_the_blank','essay']`.
3. `<<stereotype>> AutoGradeSync` (extends `Operation`): Tagged values `syncsGradeRecord = true`, `dispatchesNotification = true`.
4. `<<stereotype>> AuditLogged` (extends `Operation`): Tagged values `logsAction = true`, `immutable = true`.
```

### Mermaid Diagram
```mermaid
classDiagram
    class MetaClass_Class {
        <<metaclass>>
        Class
    }
    class MetaClass_Operation {
        <<metaclass>>
        Operation
    }

    class MinSURoleGuard {
        <<stereotype>>
        +String[] requiredRole
        +String campusScope
        +Boolean enforceActiveStatus
    }

    class SelectionOnlyQuestionRule {
        <<stereotype>>
        +String[] permittedTypes
        +String[] prohibitedTypes
        +Boolean autoGradable
    }

    class AutoGradeSync {
        <<stereotype>>
        +Boolean syncsGradeRecord
        +Boolean dispatchesNotification
    }

    class AuditLogged {
        <<stereotype>>
        +Boolean logsAction
        +Boolean persistsIP
    }

    MetaClass_Operation <|-- MinSURoleGuard : <<extends>>
    MetaClass_Class <|-- SelectionOnlyQuestionRule : <<extends>>
    MetaClass_Operation <|-- AutoGradeSync : <<extends>>
    MetaClass_Operation <|-- AuditLogged : <<extends>>
```

---

# SECTION 2: ALL 9 BEHAVIORAL DIAGRAMS (THE SYSTEM IN MOTION)

---

## B1. Data Flow Diagram (DFD — Level 1: Unified Multi-Role DFD)

### Copy-Paste AI Prompt
```text
Create a Level 1 Data Flow Diagram (DFD) for the Mindoro State University (MinSU) E-Learn & Networking Academy showing data flows for all 5 roles.
External Entities:
- `E1: Super Administrator`
- `E2: Academic Administrator`
- `E3: Instructor / Faculty`
- `E4: Teaching Assistant`
- `E5: Student / Learner`
Processes:
- `P1.0: User Management & System Audit`
- `P2.0: Academic Term & Section Scheduling`
- `P3.0: Course Studio & Selection Assessment Authoring`
- `P4.0: Learning, Lab Execution & Quiz Taking`
- `P5.0: Rubric Grading, Gradebook Sync & Certification`
Data Stores:
- `D1: Users & System Logs Store`
- `D2: Academic Offerings & Sections Store`
- `D3: Curriculum & Assessment Store`
- `D4: Student Submissions & Quiz Attempts Store`
- `D5: Gradebook & Certification Store`
Show clear, labeled bidirectional data flows between entities, processes, and data stores.
```

### Mermaid Diagram
```mermaid
flowchart LR
    E1["[Entity] Super Administrator"]
    E2["[Entity] Academic Admin"]
    E3["[Entity] Instructor / Faculty"]
    E4["[Entity] Teaching Assistant"]
    E5["[Entity] Student / Learner"]

    subgraph Processes["MinSU Core Level-1 DFD Processes"]
        P1(("P1.0<br/>User Admin &<br/>System Auditing"))
        P2(("P2.0<br/>Term & Section<br/>Scheduling"))
        P3(("P3.0<br/>Course Studio &<br/>Quiz Authoring"))
        P4(("P4.0<br/>Learning Path &<br/>Quiz Execution"))
        P5(("P5.0<br/>Rubric Grading &<br/>Gradebook Sync"))
    end

    D1[("D1: Users & Logs Store")]
    D2[("D2: Academic Sections Store")]
    D3[("D3: Curriculum & Assessments Store")]
    D4[("D4: Submissions & Attempts Store")]
    D5[("D5: Gradebook & Certs Store")]

    E1 -->|"User provisioning & System params"| P1
    P1 -->|"Write credentials & audit records"| D1

    E2 -->|"Term setup & Faculty assignments"| P2
    P2 -->|"Class sections & schedules"| D2

    E3 -->|"Modules, Labs & Selection-only Quizzes"| P3
    P3 -->|"Save structured curriculum & questions"| D3

    E5 -->|"Lab files, repo URLs & Quiz answers"| P4
    P4 -->|"Record student submissions & attempts"| D4

    E4 -->|"Preliminary review notes & flags"| P5
    E3 -->|"Rubric evaluations & grade criteria"| P5
    P5 -->|"Upsert grade records & release certs"| D5
    D5 -->|"Grade summary & downloadable certificates"| E5
```

---

## B2. Use Case Diagram (Unified All-5-Roles Use Case Map)

### Copy-Paste AI Prompt
```text
Create a unified UML Use Case Diagram for the Mindoro State University (MinSU) E-Learn & Networking Academy mapping all 5 user roles as distinct actors.
Actors:
- `Super Administrator`
- `Academic Administrator`
- `Instructor / Faculty`
- `Teaching Assistant`
- `Student / Learner`
Use Cases grouped by domain:
- System & User Management: Manage Users & Roles, View Audit Logs, Configure System Settings
- Academic Management: Manage Academic Terms, Assign Instructors & TAs to Sections, Manage Enrollments
- Course & Assessment Studio: Author Modules & Lessons, Build Selection-Only Quizzes (MC, T/F, Multi-Select, Matching), Create Assignments & Rubrics
- Grading & Evaluation: Grade Lab Submissions via Rubric, Review Preliminary TA Notes, Manage Section Gradebook, Export Gradebook CSV
- Student Learning & Certification: View Lessons & Guided Labs, Submit Lab Work, Take Timed Quizzes, Download Badge & Certificate PNG, View Completed Courses
Connect actors to relevant use cases with include/extend relationships.
```

### Mermaid Diagram
```mermaid
flowchart LR
    SA["👨‍💼 Super Administrator"]
    AA["🏛️ Academic Admin"]
    INS["👨‍🏫 Instructor"]
    TA["🧑‍💻 Teaching Assistant"]
    STU["🎓 Student / Learner"]

    subgraph MinSULMS["MinSU E-Learn & Networking Academy"]
        subgraph AdminUseCases["System & Academic Administration"]
            UC_Users(["Manage Users & Permissions"])
            UC_Audit(["View Security Audit Logs"])
            UC_Terms(["Manage Academic Terms & Sections"])
            UC_AssignFac(["Assign Faculty & TAs"])
        end

        subgraph InstructionUseCases["Instruction & Content Studio"]
            UC_Studio(["Author Modules & Packet Tracer Labs"])
            UC_QuizAuthor(["Build Selection-Only Assessments"])
            UC_ValidateQ(["Validate Question Types"])
            UC_AssignCreate(["Create Assignments & Rubrics"])
        end

        subgraph GradingUseCases["Evaluation & Gradebook"]
            UC_GradeRubric(["Grade Submissions via Rubric"])
            UC_SyncGrade(["Sync Student GradeRecord"])
            UC_TAReview(["Record Preliminary TA Notes"])
            UC_Gradebook(["View Weighted Gradebook & Export CSV"])
        end

        subgraph StudentUseCases["Learning & Certification"]
            UC_Study(["Complete Modules & Guided Labs"])
            UC_SubmitLab(["Submit Assignment Work"])
            UC_TakeQuiz(["Take Timed Selection Quiz"])
            UC_ShowScore(["View Percentage Result"])
            UC_DownloadCert(["Download Badge & Certificate PNG"])
            UC_Completed(["View Completed Courses Portfolio"])
        end
    end

    SA --> UC_Users & UC_Audit
    AA --> UC_Terms & UC_AssignFac
    INS --> UC_Studio & UC_QuizAuthor & UC_AssignCreate & UC_GradeRubric & UC_Gradebook
    UC_QuizAuthor -.->|"<<include>>"| UC_ValidateQ
    UC_GradeRubric -.->|"<<include>>"| UC_SyncGrade
    TA --> UC_TAReview & UC_Gradebook
    STU --> UC_Study & UC_SubmitLab & UC_TakeQuiz & UC_DownloadCert & UC_Completed
    UC_TakeQuiz -.->|"<<include>>"| UC_ShowScore
```

---

## B3. Activity Diagram (End-to-End Coursework, Assessment & Certification Workflow)

### Copy-Paste AI Prompt
```text
Create a UML Activity Diagram with swimlanes mapping the complete coursework, assessment, and certificate generation lifecycle in the MinSU LMS.
Swimlanes:
1. `Student / Learner`
2. `Instructor / TA`
3. `MinSU LMS System Engine`
Steps:
- Student completes learning module reading and Packet Tracer lab instructions.
- Student submits lab files and opens Checkpoint Quiz.
- Student takes timed selection-only quiz.
- System validates answers, computes score percentage, and updates progress.
- TA inspects lab submission and leaves preliminary rubric feedback.
- Instructor applies final rubric scoring and clicks "Save Grade".
- System marks submission graded, updates `GradeRecord`, and recalculates course completion percentage.
- Decision: Has course completion reached 100% and passing grade achieved?
  - If Yes: System issues Course Completion Badge and triggers dynamic HTML5 canvas certificate generation; Student downloads Certificate PNG.
  - If No: System displays updated grade in Student Gradebook.
- End.
```

### Mermaid Diagram
```mermaid
flowchart TB
    Start([Start: Student Enrolls in Course]) --> ReadLessons[Student: Complete Modules & Guided Packet Tracer Labs]
    ReadLessons --> LabDone{Work Required?}

    LabDone -->|"Lab Assignment"| SubmitLab[Student: Submit Lab Report & Topology File]
    LabDone -->|"Checkpoint Quiz"| TakeQuiz[Student: Answer Timed Selection-Only Questions]

    SubmitLab --> TAReview[TA: Review Submission & Add Preliminary Notes]
    TAReview --> InstGrade[Instructor: Evaluate Interactive Rubric & Confirm Grade]
    InstGrade --> SyncLabGrade[System: Update Submission & Upsert GradeRecord]

    TakeQuiz --> AutoScore[System: Auto-Evaluate Selection Answers]
    AutoScore --> ShowScore[System: Display Percentage Result Toast & Score Badge]
    ShowScore --> SyncQuizGrade[System: Upsert Assessment GradeRecord]

    SyncLabGrade & SyncQuizGrade --> CheckProgress{Course Progress = 100%<br/>& Passing Grade?}

    CheckProgress -->|"No"| UpdateGB[System: Update Student Gradebook Progress]
    UpdateGB --> ReadLessons

    CheckProgress -->|"Yes"| IssueBadge[System: Issue Course Badge & Unlock Certificate]
    IssueBadge --> CanvasRender[Student: Open Completed Courses & Render HTML5 Canvas Cert]
    CanvasRender --> DownloadPNG[Student: Download Verified Certificate PNG]
    DownloadPNG --> EndNode([End: Academic Achievement Recorded])
```

---

## B4. Sequence Diagram (Multi-Role Lab Submission, TA Review, Faculty Grading & Gradebook Sync)

### Copy-Paste AI Prompt
```text
Create a detailed UML Sequence Diagram showing the multi-role collaboration for lab submission and grading:
Participants:
- `Student`
- `TeachingAssistant`
- `Instructor`
- `ReactClient` (`client/src`)
- `ExpressAPI` (`server/src`)
- `Database` (Sequelize ORM)
Chronological Messages:
1. `Student` submits assignment (`POST /api/v1/assignments/1/submissions` with file / repo URL).
2. `ExpressAPI` verifies student JWT, creates `Submission` record with `status = 'submitted'`, and notifies TA.
3. `TeachingAssistant` accesses `/ta/submissions`, inspects the work, and adds preliminary notes (`PUT /api/v1/assignments/submissions/10/feedback`).
4. `Instructor` opens `/instructor/submissions`, reviews TA notes, selects rubric criteria (score: 95/100), and confirms grade (`PUT /api/v1/assignments/submissions/10/grade`).
5. `ExpressAPI` verifies Instructor role, updates `Submission` status to `'graded'`, upserts linked `GradeRecord`, and dispatches notification to Student.
6. `Student` views updated grade and percentage score on `/student/gradebook`.
```

### Mermaid Diagram
```mermaid
sequenceDiagram
    autonumber
    actor Stu as 🎓 MinSU Student
    actor TA as 🧑‍💻 Teaching Assistant
    actor Inst as 👨‍🏫 Instructor
    participant UI as 💻 React 18 SPA
    participant API as ⚙️ Express REST API
    participant DB as 🗄️ Database (Sequelize)

    Stu->>UI: Submit Packet Tracer Lab (file/repo URL)
    UI->>API: POST /api/v1/assignments/1/submissions (Bearer JWT)
    API->>DB: Submission.create({ status: 'submitted', studentId })
    DB-->>API: Submission created (id: 25)
    API-->>UI: 201 Created
    UI-->>Stu: "Lab Submitted Successfully"

    TA->>UI: Open TA Review Queue (/ta/submissions)
    UI->>API: GET /api/v1/assignments/1/submissions
    API-->>UI: Return Submissions List
    TA->>UI: Add Preliminary Rubric Notes
    UI->>API: PUT /api/v1/assignments/submissions/25/feedback
    API->>DB: Submission.update({ preliminaryNotes })
    DB-->>API: Updated

    Inst->>UI: Open Submissions Grader (/instructor/submissions)
    UI->>API: GET /api/v1/assignments/submissions/25
    API-->>UI: Return Submission + TA Notes
    Inst->>UI: Select Rubric Criteria (95/100) & Click "Save Grade"
    UI->>API: PUT /api/v1/assignments/submissions/25/grade
    API->>API: Enforce authorize('instructor', 'academic_admin', 'super_admin')
    API->>DB: Submission.update({ numericScore: 95, status: 'graded', gradedById })
    API->>DB: GradeRecord.upsert({ gradeItemId, studentId, score: 95 })
    API->>DB: Notification.create({ studentId, title: 'Grade Released' })
    DB-->>API: Committed
    API-->>UI: 200 OK
    UI-->>Inst: "Grade Saved & Synced to Gradebook"

    Stu->>UI: Open Student Gradebook (/student/gradebook)
    UI->>API: GET /api/v1/courses/1/my-grades
    API-->>UI: Return Synchronized GradeRecords & Course Average
    UI-->>Stu: Displays 95% on VLAN Trunking Lab
```

---

## B5. State Machine Diagram (Unified Entity Lifecycles)

### Copy-Paste AI Prompt
```text
Create a UML State Machine Diagram showing the lifecycle of:
1. An `Assignment Submission`: `Draft` -> `Submitted (On Time / Late)` -> `Under TA Review` -> `Returned for Revision` -> `Graded` -> `Gradebook Synchronized`.
2. A `Student Course Enrollment`: `Enrolled` -> `In Progress` -> `Completed` -> `Certified`.
Show transitions, events, guards, and actions.
```

### Mermaid Diagram
```mermaid
stateDiagram-v2
    [*] --> Enrolled : Student Enrolled in ClassSection
    
    state "Course Progression" as Progress {
        Enrolled --> InProgress : Begins First Lesson / Lab
        
        state "Submission Lifecycle" as SubLifecycle {
            [*] --> SubDraft : Opens Lab Assignment
            SubDraft --> SubmittedOnTime : Submits before dueDate
            SubDraft --> SubmittedLate : Submits after dueDate
            SubmittedOnTime --> UnderTAReview : TA Views Submission
            SubmittedLate --> UnderTAReview : TA Views Submission
            UnderTAReview --> ReturnedForRevision : Flagged by TA / Instructor
            ReturnedForRevision --> SubmittedOnTime : Resubmitted by Student
            UnderTAReview --> Graded : Instructor Grades via Rubric
            Graded --> Synchronized : Upsert GradeRecord & Recalculate Average
        }

        InProgress --> InProgress : Completes Lessons & Quizzes
    }

    Progress --> Completed : All Modules Finished & Passing Grade Met
    Completed --> Certified : System Generates Verified Badge & Certificate
    Certified --> [*] : Achievement Displayed in Portfolio
```

---

## B6. Communication Diagram (Object Collaboration Network)

### Copy-Paste AI Prompt
```text
Create a UML Communication Diagram representing the network of interacting objects when a student takes a timed selection-only assessment, receives an instant score percentage, and syncs the gradebook.
Objects:
- `:StudentUser`
- `:QuizTakingUI`
- `:AssessmentController`
- `:SelectionValidator`
- `:AssessmentAttemptModel`
- `:GradeRecordModel`
- `:NotificationModel`
Include numbered messages showing execution order.
```

### Mermaid Diagram
```mermaid
flowchart TB
    Stu(["🎓 :StudentUser"])
    UI["💻 :QuizTakingUI"]
    Ctrl["⚙️ :AssessmentController"]
    Val["🛡️ :SelectionValidator"]
    AttM[("📝 :AssessmentAttemptModel")]
    GRM[("🏅 :GradeRecordModel")]
    NotifM[("🔔 :NotificationModel")]

    Stu -->|"1: submitQuizAnswers(attemptData)"| UI
    UI -->|"1.1: POST /api/v1/assessments/:id/submit"| Ctrl
    Ctrl -->|"1.2: validateQuestionResponses()"| Val
    Val -->|"1.3: confirmSelectionTypes(MC, T/F, Multi, Match)"| Ctrl
    Ctrl -->|"1.4: computePercentageScore()"| Ctrl
    Ctrl -->|"1.5: create(attemptRecord)"| AttM
    Ctrl -->|"1.6: upsert(gradeRecord)"| GRM
    Ctrl -->|"1.7: create(studentNotification)"| NotifM
    Ctrl -->>|"1.8: return { score, percentage, passed }"| UI
    UI -->>|"1.9: renderResultBadgeAndScoreToast()"| Stu
```

---

## B7. Interaction Overview Diagram (Full Semester Academic Lifecycle)

### Copy-Paste AI Prompt
```text
Create a UML Interaction Overview Diagram showing the high-level control flow of a complete academic semester across MinSU campuses, integrating sequence interaction frames (`sd`).
Interaction Frames:
- `sdSetupAcademicTerm`: SuperAdmin & AcademicAdmin configure terms, course catalog, and class sections.
- `sdAuthorCurriculum`: Instructors author modules, lessons, Packet Tracer labs, and selection-only quizzes.
- `sdEnrollStudents`: Academic Admin / Students complete section enrollments.
- `sdExecuteCoursework`: Students study, submit labs, and take timed checkpoint assessments.
- `sdEvaluateAndGrade`: TAs review work, Instructors apply rubrics, and grades sync to gradebooks.
- `sdIssueCertificates`: System verifies 100% completion and issues verified Badges and Certificates.
- `sdArchiveSemester`: SuperAdmin audits system and exports academic records.
```

### Mermaid Diagram
```mermaid
flowchart TB
    Start([Start Academic Year]) --> SD1

    subgraph SD1["sd: Term & Section Setup"]
        S1["Admin: Set Term Dates & Assign Faculty / TAs to Sections"]
    end

    SD1 --> SD2

    subgraph SD2["sd: Curriculum & Quiz Authoring"]
        S2["Instructor: Author Course Studio Modules & Selection-Only Quizzes"]
    end

    SD2 --> SD3

    subgraph SD3["sd: Student Enrollment"]
        S3["Academic Admin / Student: Register & Approve Course Enrollments"]
    end

    SD3 --> SD4

    subgraph SD4["sd: Coursework & Quiz Execution"]
        S4["Student: Complete Guided Labs & Take Timed Checkpoint Assessments"]
    end

    SD4 --> SD5

    subgraph SD5["sd: Rubric Evaluation & Gradebook Sync"]
        S5["TA & Instructor: Review Submissions, Grade Rubrics & Auto-Sync Grades"]
    end

    SD5 --> CheckComplete{"Student Completed<br/>All Requirements?"}

    CheckComplete -->|"Incomplete"| SD4
    CheckComplete -->|"Completed"| SD6

    subgraph SD6["sd: Badge & Certificate Issuance"]
        S6["System: Unlock Verified Badge & Generate Downloadable Canvas Certificate PNG"]
    end

    SD6 --> SD7

    subgraph SD7["sd: Term Closure & Audit Archival"]
        S7["SuperAdmin: Export Section Gradebooks to CSV & Archive Term Records"]
    end

    SD7 --> EndNode([End Academic Year])
```

---

## B8. Timing Diagram (Real-Time Performance SLAs & Transaction Latencies)

### Copy-Paste AI Prompt
```text
Create a UML Timing Diagram illustrating state changes and maximum allowable response latencies (in milliseconds) across 4 lifelines during a Student Quiz Submission and Instant Result Calculation transaction (`T = 0ms` to `T = 250ms`).
Lifelines:
1. `StudentBrowserUI` (States: `SubmittingAnswers`, `AwaitingResponse`, `RenderingScorePercentage`)
2. `APIAuthAndRateLimiter` (States: `Idle`, `ValidatingJWT`, `Authorized`)
3. `AssessmentEngine` (States: `Idle`, `ScoringSelectionQuestions`, `CalculatingPercentage`, `UpsertingGradeRecord`)
4. `RelationalDatabase` (States: `Idle`, `WritingAttempt`, `WritingGradeRecord`, `Committed`)
Show exact milestones:
- T = 0ms: Submit clicked
- T = 20ms: Auth validated (<20ms SLA)
- T = 90ms: Questions scored and attempt persisted
- T = 160ms: GradeRecord upserted and average computed
- T = 200ms: HTTP 200 returned with percentage score
- T = 240ms: UI renders result modal and progress ring (<250ms total SLA)
```

### Mermaid Diagram
```mermaid
flowchart LR
    subgraph TimingSLA["Quiz Submission & Auto-Scoring Timing SLA (0ms to 250ms)"]
        direction LR
        T0["T = 0ms<br/>Student Clicks<br/>'Submit Quiz'"]
        T20["T = 20ms<br/>JWT & Rate Limit<br/>Verified (<20ms)"]
        T90["T = 90ms<br/>Selection Questions Scored<br/>& Attempt Saved"]
        T160["T = 160ms<br/>GradeRecord Upserted &<br/>Course Average Recalculated"]
        T200["T = 200ms<br/>HTTP 200 Returned with<br/>Percentage & Result"]
        T240["T = 240ms<br/>UI Renders Score Toast,<br/>Result Modal & Badge (<250ms)"]

        T0 -->|"20ms"| T20 -->|"70ms"| T90 -->|"70ms"| T160 -->|"40ms"| T200 -->|"40ms"| T240
    end
```

---

## B9. Requirement Diagram — SysML (Comprehensive System Traceability)

### Copy-Paste AI Prompt
```text
Create a SysML Requirement Diagram establishing complete requirement traceability for the Mindoro State University (MinSU) E-Learn & Networking Academy.
Requirements:
1. `REQ-RBAC-01`: Multi-Role Access Control (SuperAdmin, AcademicAdmin, Instructor, TA, Student)
2. `REQ-QUIZ-02`: Selection-Only Question Enforcement (Blocks fill_in_the_blank/essay; permits MC, T/F, Multi-Select, Matching)
3. `REQ-RUBRIC-03`: Interactive JSON Rubric Grading & Automatic GradeRecord Synchronization
4. `REQ-CERT-04`: Dynamic Canvas Badge & Certificate Generation upon 100% course completion
5. `REQ-AUDIT-05`: Immutable Administrative Audit Logging
Link requirements via `<<satisfy>>` to code components (`auth.middleware.js`, `assessment.controller.js`, `assignment.controller.js`, `StudentPages.jsx`, `audit.middleware.js`) and via `<<verify>>` to automated test suites (`server/tests/api.test.js`, `client/src/test/App.test.jsx`).
```

### Mermaid Diagram
```mermaid
flowchart TB
    subgraph SystemRequirements["SysML Requirements — MinSU Academy Core Platform"]
        R1["[Requirement] REQ-RBAC-01<br/>Multi-Role Access Control<br/>(5 Dedicated User Roles)"]
        R2["[Requirement] REQ-QUIZ-02<br/>Selection-Only Question Rule<br/>(MC, T/F, Multi-Select, Matching)"]
        R3["[Requirement] REQ-RUBRIC-03<br/>Interactive Rubric Grading &<br/>Automatic GradeRecord Sync"]
        R4["[Requirement] REQ-CERT-04<br/>Dynamic Canvas Badge &<br/>Certificate PNG Generation"]
        R5["[Requirement] REQ-AUDIT-05<br/>Immutable Administrative<br/>Audit Logging"]
    end

    subgraph ImplementationModules["Software Implementation Modules"]
        M_Auth["auth.middleware.js<br/>(JWT & Role Guard)"]
        M_Assess["assessment.controller.js<br/>(Selection Validator & Scorer)"]
        M_Assign["assignment.controller.js<br/>(Rubric Grader & Sync)"]
        M_Cert["StudentPages.jsx<br/>(Canvas Certificate Downloader)"]
        M_Audit["audit.middleware.js<br/>(Audit Trail Recorder)"]
    end

    subgraph VerificationSuites["Automated Verification Suites"]
        T_API["server/tests/api.test.js<br/>(23 Backend Integration Tests)"]
        T_UI["client/src/test/App.test.jsx<br/>(12 Vitest Frontend Tests)"]
    end

    M_Auth -->|"<<satisfy>>"| R1
    M_Assess -->|"<<satisfy>>"| R2
    M_Assign -->|"<<satisfy>>"| R3
    M_Cert -->|"<<satisfy>>"| R4
    M_Audit -->|"<<satisfy>>"| R5

    T_API -->|"<<verify>>"| R1 & R2 & R3 & R5
    T_UI -->|"<<verify>>"| R1 & R4
```

