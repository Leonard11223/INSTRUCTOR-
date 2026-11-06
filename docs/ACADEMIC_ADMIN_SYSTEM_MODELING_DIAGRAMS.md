# Mindoro State University (MinSU) LMS — Academic Administrator Role Workflow System Modeling & Complete Diagram Blueprint

## Objective
To apply system modeling concepts to the **Mindoro State University (MinSU) E-Learn & Networking Academy Learning Management System (LMS)** project proposal by identifying, selecting, and generating all **Structural Diagrams (The Static Blueprint)** and **Behavioral Diagrams (The System in Motion)** required to document the **Academic Administrator (Registrar & Curriculum Governance) Account Workflow**.

---

## Part 1: Core Modeling Framework
Every proposed system must be viewed through two distinct lenses to ensure it can be successfully built:

### 1. Structural Diagrams (The Static Blueprint)
* **What it is:** These diagrams map out the static skeleton of the MinSU LMS Academic Administration subsystem—what parts make up the system architecture, how they are organized, and where they will be hosted.
* **Key Rule:** These components and relationships do not change based on individual user actions. They represent the permanent infrastructure or codebase layout.
* **Core Examples:** System Architecture, Class, Component, and Deployment diagrams *(plus Object, Package, Composite Structure, and Profile diagrams)*.

### 2. Behavioral Diagrams (The System in Motion)
* **What it is:** These diagrams document the dynamic logic of the MinSU LMS Academic Administration subsystem—how data moves, how components interact step-by-step, and how the system responds to registrar and curriculum operations over time.
* **Key Rule:** These change dynamically based on triggers, inputs, time, or external events.
* **Core Examples:** Data Flow Diagrams (DFD), Use Case, Sequence, and Activity diagrams *(plus State Machine, Communication, Interaction Overview, Timing, and Requirement diagrams)*.

---

## Part 2: Diagram Reference Guide

### Section A: Structural Diagrams (Static Blueprint)
* **System Architecture Diagram:** High-level layout of MinSU Registrar/Academic Admin clients, Express API servers, CSV bulk-import processors, and relational databases.
* **Class Diagram:** Maps out academic structure data models (`Department`, `Program`, `AcademicTerm`, `Course`, `ClassSection`, `Enrollment`, `Certificate`), their attributes, and relationships.
* **Component Diagram:** Shows how the Academic Admin React pages (`AcademicAdminPages.jsx`), Express controllers (`academic.controller.js`, `assignment.controller.js`), and Sequelize models depend on each other.
* **Deployment Diagram:** Outlines the physical workstations and Docker containers hosting the MinSU Academic Administration portal.
* **Object Diagram:** Captures a concrete runtime snapshot of Registrar `Clarissa Thorne` provisioning section `BSIT-3A-NET201` for `First Semester AY 2026-2027` and approving final grades.
* **Package Diagram:** Groups academic administration frontend views, validation schemas, backend controllers, and models into higher-level packages.
* **Composite Structure Diagram:** Breaks down the internal structure and ports of the `AcademicOperationsAndRegistrarEngine` classifier.
* **Profile Diagram:** Customizes UML elements with MinSU Registrar stereotypes (`<<AcademicCatalogEntity>>`, `<<SectionCapacityGuard>>`, `<<RegistrarGradeLock>>`).

### Section B: Behavioral Diagrams (The System in Motion)
* **Data Flow Diagram (DFD):** Tracks how department setups, course creations, CSV bulk enrollments, and final grade approvals flow into relational storage.
* **Use Case Diagram:** Defines project scope by mapping the **MinSU Academic Administrator**, **Enrollment & Capacity Engine**, and **Grade Lock & Certificate Issuer** across all registrar goals.
* **Activity Diagram:** A technical flowchart mapping out semester setup, course & section provisioning, instructor/TA assignment, student enrollment, and final grade approval.
* **Sequence Diagram:** Coordinates chronological, step-by-step messages between the Academic Admin UI, backend controllers, and database during Final Grade Approval & Certificate Issuance.
* **State Machine Diagram:** Tracks the lifecycle stages of a MinSU Class Section & Gradebook (`Draft_Section` → `Open_Enrollment` → `Active_Instruction` → `Grades_Submitted_By_Instructor` → `Registrar_Approved_Locked` → `Archived`).
* **Communication Diagram:** Focuses on the object network and numbered messages during CSV Bulk Enrollment Import and section capacity checking.
* **Interaction Overview Diagram:** Combines an Activity workflow with inline Sequence interaction blocks across term setup, section creation, bulk enrollment, and grade locking.
* **Timing Diagram:** Explores exact timing constraints across the MinSU Academic Calendar timeline (Enrollment Window → Active Instruction Period → Grade Submission Window → Registrar Final Approval Lock).
* **Requirement Diagram (SysML):** Maps text-based MinSU Registrar requirements (academic hierarchy, section capacity checks, CSV bulk import, and final grade approval locking) to code components and tests.

---

## Part 3: Completed Blueprinting Exercise

### 1. Project Identification
* **Proposal Title:** **Mindoro State University (MinSU) E-Learn & Networking Academy: A Web-Based Role-Driven Learning Management System Inspired by Cisco NetAcad**
* **System Summary (2–3 Sentences):**
  The Mindoro State University (MinSU) E-Learn & Networking Academy LMS is a centralized, full-stack educational platform designed for MinSU campuses to streamline academic governance, IT/Networking curriculum delivery, automated assessments, and verifiable credentialing across five distinct institutional roles. Within this ecosystem, the **Academic Administrator Workflow** manages the university's academic hierarchy—configuring MinSU colleges/departments, degree programs, academic terms, master courses, class sections, faculty/TA assignments, CSV bulk student enrollments, and final gradebook approvals. Every registrar operation enforces server-side capacity, prerequisite, and grade-locking rules persisted in a relational database.

### 2. Structural Blueprinting
* **Selected Essential Structural Diagram:** **Class Diagram** *(supported below by all 8 Structural Diagrams)*
* **Why This Specific Layout Diagram Is Required:**
  A **Class Diagram** is essential to build the MinSU Academic Administration infrastructure because university scheduling and enrollment depend on strict hierarchical foreign-key relationships in `server/src/models/index.js`: `Department` → `Program` → `Course` → `ClassSection` (linked to `AcademicTerm`, `instructorId`, and `taId`) → `Enrollment` → `Certificate`. Mapping these static associations upfront guarantees that sections cannot be created without valid courses and terms, enrollments respect section capacity limits, and locking final grades accurately transitions student enrollments and certificates.

### 3. Behavioral Blueprinting
* **Selected Critical Behavioral Diagrams:** **Sequence Diagram** and **Activity Diagram** *(supported below by all 9 Behavioral Diagrams)*
* **Specific Scenarios Mapped:**
  1. **Sequence Diagram Scenario — *MinSU Registrar Final Grade Approval, Gradebook Locking & Official Certificate Issuance*:**
     Maps the chronological interaction when a MinSU Academic Administrator reviews instructor-submitted standing grades in `GradeApprovalsPage` (`client/src/pages/AcademicAdminPages.jsx`) and triggers `POST /api/classes/:id/approve-grades`. It traces how `assignment.controller.js` verifies the `grades.approve` permission, locks the section (`gradesApproved = true`), marks passing student enrollments as `completed`, mints verifiable MinSU `Certificate` records, and logs `FINAL_GRADES_APPROVED` in `audit_logs`.
  2. **Activity Diagram Scenario — *End-to-End MinSU Academic Term, Course Offering, Section Provisioning, CSV Bulk Enrollment & Grade Approval Workflow*:**
     Maps the operational workflow and decision gates from configuring an active MinSU semester, publishing master courses, creating class sections with assigned Instructors and TAs, validating seat capacities during student enrollment/CSV import, and locking final section grades at term end.

### 4. Data Blueprinting
* **How Data Flows from an Academic Administrator Input to the System Database:**
  1. **Client Input & Serialization:** The MinSU Academic Administrator submits a form or uploads CSV records in `client/src/pages/AcademicAdminPages.jsx` (e.g., creating a class section, enrolling students, or approving final grades). Axios (`client/src/services/api.js`) serializes the JSON payload and attaches the `Authorization: Bearer <JWT>` token.
  2. **Authentication & RBAC Gatekeeper:** Express routes the request through `authenticate` and `requirePermissions` (`courses.manage`, `classes.manage`, `enrollments.manage`, or `grades.approve` in `server/src/middleware/auth.middleware.js`).
  3. **Validation & Academic Rule Processing:** `academic.controller.js` and `assignment.controller.js` validate section capacities (`enrolledCount < maxCapacity`), term dates, instructor/TA role eligibility, and CSV row formats.
  4. **Relational Persistence & Audit Recording:** Sequelize ORM persists records into `departments`, `programs`, `academic_terms`, `courses`, `class_sections`, `enrollments`, and `certificates`, writes an immutable audit event (`COURSE_CREATED`, `CSV_RECORDS_IMPORTED`, `FINAL_GRADES_APPROVED`) into `audit_logs`, and returns updated JSON data to the React UI.

---

## Section 1: Structural Diagrams (The Static Blueprint) — All 8 Diagrams

These show what components exist in the MinSU LMS Academic Administration architecture and how they are wired together. They do not change based on user actions.

| # | Diagram Name | Primary Purpose | Best Used For (MinSU Academic Admin Context) |
| :--- | :--- | :--- | :--- |
| **A1** | **System Architecture Diagram** | Shows high-level layout of servers, clients, cloud infrastructure, and databases. | Explaining the 4-tier MinSU Registrar, Curriculum, and Enrollment architecture. |
| **A2** | **Class Diagram** | Maps out object-oriented classes, their attributes, methods, and relationships. | Baseline blueprint for `Department`, `Program`, `AcademicTerm`, `Course`, `ClassSection`, and `Enrollment`. |
| **A3** | **Component Diagram** | Shows how software pieces (modules, libraries, services) are bundled and depend on each other. | Managing dependencies between `AcademicAdminPages.jsx`, CSV import parser, and backend controllers. |
| **A4** | **Deployment Diagram** | Maps software components to physical hardware or containerized infrastructure (Docker). | DevOps topology connecting MinSU Registrar workstations to Nginx, Node.js API, and MySQL 8. |
| **A5** | **Object Diagram** | Captures a snapshot of instances of classes at a specific moment in time. | Inspecting runtime links between `deptCCS`, `progBSIT`, `courseNET201`, `sectionBSIT3A`, and `acadAdminClarissa`. |
| **A6** | **Package Diagram** | Groups classes or components into higher-level folders (packages) to show organization. | Organizing the Academic Admin UI pages, validation schemas, routes, controllers, and ORM models. |
| **A7** | **Composite Structure Diagram** | Breaks down the internal structure of a single complex classifier or class. | Designing the internal parts and ports of the `AcademicOperationsAndRegistrarEngine`. |
| **A8** | **Profile Diagram** | Customizes existing UML elements for specific industries, domains, or platforms. | Defining MinSU Registrar stereotypes (`<<AcademicCatalogEntity>>`, `<<CapacityGuardedSection>>`, `<<RegistrarGradeLock>>`). |

---

### A1. System Architecture Diagram (MinSU Academic Administration Infrastructure)

#### Copy-Paste AI Prompt
```text
Create a 4-Tier System Architecture Diagram for the "Academic Administrator (Registrar & Curriculum Governance) Infrastructure" of the "Mindoro State University (MinSU) E-Learn & Networking Academy LMS".

Tier 1: MinSU Academic Admin Presentation Tier (React 18 + Vite)
- Academic Dashboard UI (/academic/dashboard)
- Departments & Degree Programs UI (/academic/structure)
- Academic Terms & Semesters UI (/academic/terms)
- Courses & Offerings Catalog UI (/academic/courses)
- Classes, Sections & Faculty Assignment UI (/academic/classes)
- Enrollment Management & CSV Bulk Import UI (/academic/enrollments)
- Final Grade Approvals & Lock UI (/academic/grade-approvals)

Tier 2: API Gateway & RBAC Middleware Tier (Node.js + Express)
- Express REST Router (/api/academic/*, /api/courses/*, /api/classes/*, /api/enrollments/*)
- JWT Authentication Middleware
- RBAC Permission Guard ('courses.manage', 'classes.manage', 'enrollments.manage', 'grades.approve')

Tier 3: Business Logic & Registrar Service Tier (Controllers & Engines)
- Academic Structure & Term Controller (academic.controller.js)
- Section Capacity & CSV Bulk Import Engine (importCsvRecords)
- Final Grade Approval & Certificate Issuance Engine (assignment.controller.js -> approveSectionGrades)
- Immutable Audit Logger Service (auditLogger.js)

Tier 4: Relational Persistence Tier (Sequelize ORM + MySQL 8 / SQLite)
- Departments & Programs Tables
- AcademicTerms Table
- Courses & ClassSections Tables
- Enrollments & Certificates Tables
- AuditLogs Table
```

#### Mermaid Diagram
```mermaid
flowchart LR
    subgraph Client["1. MinSU Academic Admin Presentation Tier (React 18 + Vite)"]
        ADash["Academic Dashboard\n(/academic/dashboard)"]
        AStruct["Departments & Programs\n(/academic/structure)"]
        ATerms["Academic Terms\n(/academic/terms)"]
        ACourses["Courses & Catalog\n(/academic/courses)"]
        AClasses["Class Sections & Faculty\n(/academic/classes)"]
        AEnroll["Enrollments & CSV Import\n(/academic/enrollments)"]
        AGrades["Grade Approvals & Locks\n(/academic/grade-approvals)"]
        Axios["Axios API Client\n(Bearer JWT)"]
    end

    subgraph Gateway["2. Security & RBAC Gateway Tier (Express.js)"]
        JWT["authenticate Middleware"]
        RBAC["requirePermissions Guard\n(courses.manage / classes.manage /\nenrollments.manage / grades.approve)"]
    end

    subgraph Services["3. Academic & Registrar Logic Tier (Node.js Controllers)"]
        AcadCtrl["academic.controller.js\n(Structure, Terms, Courses, Sections)"]
        CsvEngine["CSV Bulk Import Processor\n(Users, Courses, Enrollments)"]
        ApproveCtrl["assignment.controller.js\n(Final Grade Approval & Lock Engine)"]
        AuditSvc["auditLogger.js\n(Compliance Event Recorder)"]
    end

    subgraph Database["4. Relational Persistence Tier (Sequelize ORM / MySQL 8)"]
        DBStruct[("departments, programs,\nacademic_terms")]
        DBCurr[("courses,\nclass_sections")]
        DBEnr[("enrollments,\ncertificates")]
        DBAudit[("audit_logs")]
    end

    ADash & AStruct & ATerms & ACourses & AClasses & AEnroll & AGrades --> Axios
    Axios -- "HTTPS REST JSON" --> JWT --> RBAC
    RBAC --> AcadCtrl & CsvEngine & ApproveCtrl
    AcadCtrl & CsvEngine --> DBStruct & DBCurr & DBEnr
    ApproveCtrl --> DBCurr & DBEnr
    AcadCtrl & CsvEngine & ApproveCtrl --> AuditSvc --> DBAudit
```

---

### A2. Class Diagram (MinSU Academic Hierarchy, Scheduling & Enrollment Schema)

#### Copy-Paste AI Prompt
```text
Generate a detailed UML Class Diagram for the "Academic Administrator Workflow" of the "Mindoro State University (MinSU) E-Learn & Networking Academy LMS".

Classes:
1. Department (+id: INT PK, +code: STRING, +name: STRING, +headName: STRING, +description: TEXT, +status: ENUM)
2. Program (+id: INT PK, +departmentId: INT FK, +code: STRING, +name: STRING, +degreeType: STRING, +totalCredits: INT, +status: ENUM)
3. AcademicTerm (+id: INT PK, +name: STRING, +academicYear: STRING, +semester: STRING, +startDate: DATE, +endDate: DATE, +isCurrent: BOOLEAN, +status: ENUM)
4. Course (+id: INT PK, +departmentId: INT FK, +programId: INT FK, +code: STRING, +title: STRING, +credits: INT, +level: ENUM, +prerequisiteCode: STRING, +deliveryMode: ENUM, +status: ENUM)
5. ClassSection (+id: INT PK, +courseId: INT FK, +termId: INT FK, +instructorId: INT FK, +taId: INT FK, +sectionCode: STRING, +schedule: STRING, +room: STRING, +maxCapacity: INT, +status: ENUM, +gradesApproved: BOOLEAN, +gradesApprovedAt: DATETIME)
6. Enrollment (+id: INT PK, +classId: INT FK, +studentId: INT FK, +status: ENUM('active', 'completed', 'dropped', 'waitlisted'), +progressPercentage: FLOAT, +finalNumericGrade: FLOAT, +finalLetterGrade: STRING, +completedAt: DATETIME)
7. Certificate (+id: INT PK, +certificateNumber: STRING, +verificationCode: STRING, +studentId: INT FK, +courseId: INT FK, +classId: INT FK, +finalScore: FLOAT, +status: ENUM, +issuedAt: DATETIME)

Relationships:
- Department "1" --> "0..*" Program
- Department "1" --> "0..*" Course
- Program "1" --> "0..*" Course
- AcademicTerm "1" --> "0..*" ClassSection
- Course "1" --> "0..*" ClassSection
- ClassSection "1" --> "0..*" Enrollment
- ClassSection "1" --> "0..*" Certificate
```

#### Mermaid Diagram
```mermaid
classDiagram
    class Department {
        +INTEGER id PK
        +STRING code
        +STRING name
        +STRING headName
        +TEXT description
        +ENUM status
    }

    class Program {
        +INTEGER id PK
        +INTEGER departmentId FK
        +STRING code
        +STRING name
        +STRING degreeType
        +INTEGER totalCredits
        +ENUM status
    }

    class AcademicTerm {
        +INTEGER id PK
        +STRING name
        +STRING academicYear
        +STRING semester
        +DATE startDate
        +DATE endDate
        +BOOLEAN isCurrent
        +ENUM status
    }

    class Course {
        +INTEGER id PK
        +INTEGER departmentId FK
        +INTEGER programId FK
        +STRING code
        +STRING title
        +INTEGER credits
        +ENUM level
        +STRING prerequisiteCode
        +ENUM deliveryMode
        +ENUM status
    }

    class ClassSection {
        +INTEGER id PK
        +INTEGER courseId FK
        +INTEGER termId FK
        +INTEGER instructorId FK
        +INTEGER taId FK
        +STRING sectionCode
        +STRING schedule
        +STRING room
        +INTEGER maxCapacity
        +ENUM status
        +BOOLEAN gradesApproved
        +DATETIME gradesApprovedAt
    }

    class Enrollment {
        +INTEGER id PK
        +INTEGER classId FK
        +INTEGER studentId FK
        +ENUM status
        +FLOAT progressPercentage
        +FLOAT finalNumericGrade
        +STRING finalLetterGrade
        +DATETIME completedAt
    }

    class Certificate {
        +INTEGER id PK
        +STRING certificateNumber
        +STRING verificationCode
        +INTEGER studentId FK
        +INTEGER courseId FK
        +INTEGER classId FK
        +FLOAT finalScore
        +ENUM status
        +DATETIME issuedAt
    }

    Department "1" --> "0..*" Program : offers
    Department "1" --> "0..*" Course : houses
    Program "1" --> "0..*" Course : includes
    AcademicTerm "1" --> "0..*" ClassSection : schedules
    Course "1" --> "0..*" ClassSection : instantiated_as
    ClassSection "1" --> "0..*" Enrollment : enrolls
    ClassSection "1" --> "0..*" Certificate : issues_upon_approval
```

---

### A3. Component Diagram (MinSU Academic Administration Module Dependencies)

#### Copy-Paste AI Prompt
```text
Create a UML Component Diagram showing how the frontend and backend components of the MinSU Academic Administrator subsystem depend on each other.

Frontend Components (client/src):
- [AcademicAdminPages.jsx] (AcademicDashboardPage, DepartmentsAndProgramsPage, TermsManagementPage, CoursesAndOfferingsPage, ClassesAndSectionsPage, EnrollmentManagementPage, GradeApprovalsPage)
- [SharedAnnouncementsPage & SharedReportsPage] (Institutional announcements & CSV analytics export)
- [AppLayout.jsx] (Academic Admin navigation sidebar)
- [api.js] (Axios REST client)

Backend Components (server/src):
- [academic.controller.js] (CRUD for Departments, Programs, Terms, Courses, ClassSections, Enrollments, and CSV Bulk Import)
- [assignment.controller.js] (Section Gradebook Calculation & Registrar Final Grade Approval Lock)
- [auth.middleware.js] (JWT & Academic Admin RBAC permission verifier)
- [models/index.js] (Sequelize ORM models)
```

#### Mermaid Diagram
```mermaid
flowchart TB
    subgraph AcadFrontend["Academic Admin Frontend Bundle (client/src)"]
        AcadPages["«component»\nAcademicAdminPages.jsx\n(Structure, Terms, Courses, Classes, Enrollments, Approvals)"]
        SharedPages["«component»\nTaAndSharedPages.jsx\n(Announcements & Institutional Reports)"]
        LayoutShell["«component»\nAppLayout.jsx\n(Academic Admin Navigation)"]
        ApiSvc["«component»\napi.js\n(Axios HTTP Client)"]
    end

    subgraph AcadBackend["Academic Admin Backend Bundle (server/src)"]
        AuthMW["«component»\nauth.middleware.js\n(JWT & RBAC Permission Guard)"]
        AcadCtrl["«component»\nacademic.controller.js\n(Hierarchy, Sections, Enrollments & CSV Import)"]
        GradeCtrl["«component»\nassignment.controller.js\n(approveSectionGrades & Certificate Minter)"]
        AuditUtil["«component»\nauditLogger.js\n(Registrar Audit Service)"]
        ORM["«component»\nmodels/index.js\n(Sequelize Models)"]
    end

    AcadPages & SharedPages --> LayoutShell & ApiSvc
    ApiSvc -- "HTTPS REST JSON" --> AuthMW
    AuthMW --> AcadCtrl & GradeCtrl
    AcadCtrl & GradeCtrl --> ORM & AuditUtil
```

---

### A4. Deployment Diagram (MinSU Registrar & Academic Admin Container Topology)

#### Copy-Paste AI Prompt
```text
Create a UML Deployment Diagram for the "Mindoro State University (MinSU) E-Learn & Networking Academy LMS" showing how the Academic Administrator (Registrar) workstation interacts with the containerized server infrastructure.

Nodes:
1. Node: MinSU Registrar / Academic Admin Workstation
   - Execution Environment: Web Browser (React 18 SPA + CSV Batch Uploader & Transcript Exporter)
2. Node: MinSU Campus / Cloud Server Host (Docker Compose Engine)
   - Container 1: [lms-client (Nginx Alpine :8080)]
   - Container 2: [lms-server (Node.js 20 Alpine :5000)] (AcademicController, CSV Import Engine, Grade Approval Service)
   - Container 3: [lms-mysql (MySQL 8.0 Server :3306)] (Persistent storage for departments, programs, terms, courses, sections, enrollments, certificates)
```

#### Mermaid Diagram
```mermaid
flowchart LR
    subgraph RegWorkstation["«device»\nMinSU Registrar Workstation"]
        RegBrowser["«executionEnvironment»\nWeb Browser (HTTPS)\nReact Academic Admin Portal\n+ CSV Import / Export Utility"]
    end

    subgraph MinSUHost["«node»\nMinSU Campus / Cloud Host (Docker Compose Engine)"]
        subgraph NginxCont["«container»\nlms-client (Nginx :8080)"]
            Nginx["Nginx Reverse Proxy &\nStatic Bundle Server"]
        end

        subgraph NodeCont["«container»\nlms-server (Node.js 20 :5000)"]
            NodeSrv["Express API Server\n+ Academic & CSV Engine\n+ Grade Approval Service"]
        end

        subgraph MySQLCont["«container»\nlms-mysql (MySQL 8.0 :3306)"]
            MySQL[("MySQL 8.0 Database\n(departments, programs, terms,\ncourses, class_sections, enrollments)")]
        end
    end

    RegBrowser -- "HTTPS JSON / CSV Payload\n(Port 8080 / 443)" --> Nginx
    Nginx -- "Internal HTTP Proxy\n(Port 5000)" --> NodeSrv
    NodeSrv -- "Sequelize TCP\n(Port 3306)" --> MySQL
```

---

### A5. Object Diagram (Runtime Snapshot of Section Provisioning & Final Grade Approval)

#### Copy-Paste AI Prompt
```text
Create a UML Object Diagram capturing a concrete runtime snapshot of the MinSU Academic Administration state after Registrar `Clarissa Thorne` configures `First Semester AY 2026-2027`, provisions section `BSIT-3A-NET201`, and approves final grades.

Objects:
1. registrarClarissa : User (id = 2, name = "Clarissa Thorne", email = "acadadmin@academy.edu", primaryRole = "academic_admin")
2. deptCCS : Department (id = 1, code = "CCS", name = "College of Computer Studies")
3. progBSIT : Program (id = 1, departmentId = 1, code = "BSIT", name = "BS in Information Technology")
4. term1stSem : AcademicTerm (id = 1, name = "First Semester AY 2026-2027", isCurrent = true, status = "active")
5. courseNET201 : Course (id = 1, code = "NET-201", title = "Enterprise Routing, OSPF & Network Programmability", credits = 4)
6. sectionBSIT3A : ClassSection (id = 1, sectionCode = "BSIT-3A-NET201", instructorId = 3, taId = 5, maxCapacity = 40, gradesApproved = true)
```

#### Mermaid Diagram
```mermaid
flowchart TB
    RegObj["<u>registrarClarissa : User</u>\nid = 2\nname = 'Clarissa Thorne'\nemail = 'acadadmin@academy.edu'\nrole = 'academic_admin'"]

    DeptObj["<u>deptCCS : Department</u>\nid = 1\ncode = 'CCS'\nname = 'College of Computer Studies'"]

    ProgObj["<u>progBSIT : Program</u>\nid = 1\ncode = 'BSIT'\ndegreeType = 'Bachelor of Science'"]

    TermObj["<u>term1stSem : AcademicTerm</u>\nid = 1\nname = 'First Semester AY 2026-2027'\nisCurrent = true"]

    CourseObj["<u>courseNET201 : Course</u>\nid = 1\ncode = 'NET-201'\ntitle = 'Enterprise Routing & OSPF'\ncredits = 4"]

    SecObj["<u>sectionBSIT3A : ClassSection</u>\nid = 1\nsectionCode = 'BSIT-3A-NET201'\ninstructorId = 3 (Prof. Vance)\ntaId = 5 (Arra Siena)\nmaxCapacity = 40\ngradesApproved = true"]

    DeptObj -- "owns" --> ProgObj
    ProgObj -- "curates" --> CourseObj
    TermObj -- "schedules" --> SecObj
    CourseObj -- "offered as" --> SecObj
    RegObj -- "provisioned & approved grades for" --> SecObj
```

---

### A6. Package Diagram (MinSU Academic Administration Codebase Organization)

#### Copy-Paste AI Prompt
```text
Create a UML Package Diagram showing the package organization of the MinSU Academic Administration subsystem across client and server directories.

Packages:
1. client/src
   - pages/AcademicAdminPages (Dashboard, DepartmentsAndPrograms, TermsManagement, CoursesAndOfferings, ClassesAndSections, EnrollmentManagement, GradeApprovals)
   - layouts/AppLayout (Academic Admin Sidebar)
   - schemas/validation (Course, ClassSection, and Enrollment validation schemas)
   - services/api (Axios API service)

2. server/src
   - routes (academic.routes.js, assignment.routes.js)
   - middleware (auth.middleware.js)
   - controllers (academic.controller.js, assignment.controller.js)
   - models (Department, Program, AcademicTerm, Course, ClassSection, Enrollment, Certificate)
```

#### Mermaid Diagram
```mermaid
flowchart TB
    subgraph ClientAcadPkg["📦 Package: client/src (Academic Admin Workspace)"]
        P_AcadUI["📁 pages/AcademicAdminPages.jsx\n(7 Registrar & Curriculum Views)"]
        P_Shell["📁 layouts/AppLayout.jsx\n(Academic Admin Navigation)"]
        P_Val["📁 schemas/validation.js\n(Zod Form Validation)"]
        P_Api["📁 services/api.js\n(Axios REST Client)"]
    end

    subgraph ServerAcadPkg["📦 Package: server/src (Academic & Registrar API)"]
        P_Routes["📁 routes\n(academic.routes.js, assignment.routes.js)"]
        P_Auth["📁 middleware/auth.middleware.js\n(RBAC Permission Enforcement)"]
        P_Ctrls["📁 controllers\n(academic.controller.js, assignment.controller.js)"]
        P_Models["📁 models/index.js\n(Department, Program, Term, Course, ClassSection, Enrollment)"]
    end

    P_AcadUI -. "imports" .-> P_Shell & P_Val & P_Api
    P_Api -. "HTTPS REST" .-> P_Routes
    P_Routes -. "protected by" .-> P_Auth
    P_Routes -. "handled by" .-> P_Ctrls
    P_Ctrls -. "persists via" .-> P_Models
```

---

### A7. Composite Structure Diagram (Internal Structure of `AcademicOperationsAndRegistrarEngine`)

#### Copy-Paste AI Prompt
```text
Create a UML Composite Structure Diagram breaking down the internal parts, ports, and connectors inside the "AcademicOperationsAndRegistrarEngine" classifier in the MinSU LMS.

Internal Parts:
- [Part 1: Academic Hierarchy Manager] (Manages Departments, Degree Programs, and Active Term exclusivity)
- [Part 2: Master Catalog & Section Scheduler] (Validates Course prerequisites, section schedules, and Instructor/TA assignments)
- [Part 3: Enrollment & Capacity Gatekeeper] (Enforces maxCapacity limits, handles section transfers, and parses CSV bulk imports)
- [Part 4: Final Grade Lock & Credential Issuer] (Locks section gradebooks upon registrar approval and auto-mints Certificates for passing students)
- [Part 5: Compliance Audit Emitter] (Dispatches audit events to audit_logs)
```

#### Mermaid Diagram
```mermaid
flowchart LR
    InStruct(["🔌 Port: CurriculumConfigPort\n(/api/academic/*, /api/courses/*)"])
    InEnroll(["🔌 Port: EnrollmentAndCsvPort\n(/api/enrollments/*, /api/academic/import-csv)"])
    InGrade(["🔌 Port: GradeApprovalPort\n(/api/classes/:id/approve-grades)"])

    subgraph RegEngine["«classifier» AcademicOperationsAndRegistrarEngine"]
        PartHier["[Part 1]\nDepartment, Program &\nActive Term Manager"]
        PartSched["[Part 2]\nCourse Catalog &\nSection Scheduler"]
        PartCap["[Part 3]\nCapacity Guard &\nCSV Bulk Importer"]
        PartLock["[Part 4]\nRegistrar Grade Lock &\nCertificate Issuer"]
        PartAud["[Part 5]\nRegistrar Audit\nEvent Dispatcher"]

        PartHier -- "validatedStructure" --> PartSched
        PartSched -- "activeSectionContext" --> PartCap
        PartCap -- "verifiedRoster" --> PartLock
        PartHier & PartSched & PartCap & PartLock -- "auditPayload" --> PartAud
    end

    OutDB(["🔌 Port: AcademicDBPort\n(departments, courses, sections, enrollments, certificates)"])
    OutAudit(["🔌 Port: AuditDBPort\n(audit_logs)"])

    InStruct --> PartHier & PartSched
    InEnroll --> PartCap
    InGrade --> PartLock
    PartHier & PartSched & PartCap & PartLock --> OutDB
    PartAud --> OutAudit
```

---

### A8. Profile Diagram (MinSU Registrar & Curriculum Governance Stereotypes)

#### Copy-Paste AI Prompt
```text
Create a UML Profile Diagram defining custom stereotypes for the "MinSU Registrar & Curriculum Governance Profile".

Stereotypes:
1. <<SingleCurrentTermRule>> (Extends UML::Class -> Applied to AcademicTerm; tagged values: allowOnlyOneCurrentTerm=true)
2. <<CapacityGuardedSection>> (Extends UML::Class -> Applied to ClassSection; tagged values: defaultMaxCapacity=40, enforceSeatLimit=true)
3. <<BulkImportableEntity>> (Extends UML::Class -> Applied to User, Course, Enrollment; tagged values: supportsCsvImport=true, duplicateStrategy="skip_or_upsert")
4. <<RegistrarGradeLock>> (Extends UML::Operation -> Applied to approveSectionGrades(); tagged values: locksInstructorEdits=true, autoIssuesCertificates=true)
```

#### Mermaid Diagram
```mermaid
classDiagram
    class UMLClass["«metaclass»\nUML::Class"]
    class UMLOperation["«metaclass»\nUML::Operation"]

    class SingleTerm["«stereotype»\nSingleCurrentTermRule"] {
        +Boolean onlyOneCurrentTerm = true
        +Boolean autoUnsetPreviousTerm = true
    }

    class CapacityGuard["«stereotype»\nCapacityGuardedSection"] {
        +Integer defaultMaxCapacity = 40
        +Boolean blockOverEnrollment = true
    }

    class BulkImport["«stereotype»\nBulkImportableEntity"] {
        +Boolean supportsCsvUpload = true
        +String conflictPolicy = "skip_duplicates"
    }

    class GradeLock["«stereotype»\nRegistrarGradeLock"] {
        +Boolean immutableAfterApproval = true
        +Boolean autoIssueCertificates = true
    }

    UMLClass <|-- SingleTerm : extends
    UMLClass <|-- CapacityGuard : extends
    UMLClass <|-- BulkImport : extends
    UMLOperation <|-- GradeLock : extends
```

---

## Section 2: Behavioral Diagrams (The System in Motion) — All 9 Diagrams

These show how data moves, how components talk to each other, and how the MinSU LMS changes state over time in response to Academic Administrator triggers, CSV uploads, section assignments, and final grade approvals.

| # | Diagram Name | Primary Purpose | Best Used For (MinSU Academic Admin Context) |
| :--- | :--- | :--- | :--- |
| **B1** | **Data Flow Diagram (DFD)** | Traces how data enters a system, transforms through processes, and gets stored. | Mapping how curriculum configs, CSV bulk records, and grade approvals flow into MySQL. |
| **B2** | **Use Case Diagram** | Highlights relationships between external actors and specific goals (use cases). | Scoping all 11 Academic Administrator / Registrar functions and RBAC rules. |
| **B3** | **Activity Diagram** | A flowchart showing operational workflows, logic gates, and parallel actions step-by-step. | Documenting term creation, section provisioning, capacity-checked enrollment, and grade locking. |
| **B4** | **Sequence Diagram** | Maps chronological interactions between system entities for a single task. | Tracing `POST /api/classes/:id/approve-grades` from Registrar UI through Certificate issuance. |
| **B5** | **State Machine Diagram** | Tracks the lifecycle stages an entity goes through based on events. | Tracking a MinSU Class Section from `Draft` → `Open_Enrollment` → `Active` → `Grades_Approved_Locked`. |
| **B6** | **Communication Diagram** | Focuses on the network structure of collaborating objects and numbered messages. | Showing object collaboration during CSV Bulk Enrollment Import (`POST /api/academic/import-csv`). |
| **B7** | **Interaction Overview Diagram** | Combines an Activity diagram with miniature Sequence interaction blocks. | Mapping the complete semester lifecycle managed by the MinSU Academic Administrator. |
| **B8** | **Timing Diagram** | Explores exact timing constraints and phase changes of objects over an explicit timeline. | Modeling the semester timeline (Term Start → Add/Drop Deadline → Grade Submission → Registrar Lock). |
| **B9** | **Requirement Diagram (SysML)** | Maps text-based system rules and requirements directly to components and tests. | Proving that MinSU Registrar hierarchy, CSV import, capacity limits, and grade locks are verified. |

---

### B1. Data Flow Diagram / DFD Level 1 (MinSU Academic Admin Input-to-Database Pipeline)

#### Copy-Paste AI Prompt
```text
Create a Level 1 Data Flow Diagram (DFD) illustrating how data moves from a MinSU Academic Administrator's inputs to the relational database in the LMS.

External Entity:
- MinSU Academic Administrator (Registrar)

Processes (1.0 to 5.0):
- Process 1.0: Authenticate & Verify Registrar Permissions (Checks JWT & 'courses.manage', 'classes.manage', 'enrollments.manage', 'grades.approve')
- Process 2.0: Configure Academic Structure & Terms (Writes Departments, Programs, and current AcademicTerm to D1)
- Process 3.0: Provision Courses, Sections & Faculty Assignments (Writes published Courses and ClassSections with Instructor/TA IDs to D2)
- Process 4.0: Process Enrollments, Section Transfers & CSV Bulk Import (Checks section capacity in D2; writes student Enrollments to D3)
- Process 5.0: Approve & Lock Final Section Grades (Reads standing grades from D3; locks ClassSection in D2; updates completed Enrollments and issues Certificates in D3; logs audit event in D4)

Data Stores:
- D1: departments, programs & academic_terms
- D2: courses & class_sections
- D3: enrollments, grade_records & certificates
- D4: audit_logs
```

#### Mermaid Diagram
```mermaid
flowchart TB
    AA["External Entity:\nMinSU Academic Admin (Registrar)"]

    P1(("1.0\nAuthenticate &\nVerify RBAC"))
    P2(("2.0\nConfigure Colleges,\nPrograms & Terms"))
    P3(("3.0\nProvision Courses &\nClass Sections"))
    P4(("4.0\nManage Enrollments\n& CSV Bulk Import"))
    P5(("5.0\nApprove Final Grades\n& Issue Certificates"))

    D1[("D1: departments, programs\n& academic_terms")]
    D2[("D2: courses &\nclass_sections")]
    D3[("D3: enrollments, grades\n& certificates")]
    D4[("D4: audit_logs")]

    AA -- "1. Registrar Input / CSV Payload + JWT" --> P1
    P1 -- "Structure & Term Payload" --> P2
    P1 -- "Course & Section Payload" --> P3
    P1 -- "Enrollment / CSV Rows" --> P4
    P1 -- "Grade Approval Command" --> P5

    P2 -- "Upsert Hierarchy & Active Term" --> D1
    P3 -- "Write Courses, Sections & Faculty Links" --> D2

    D2 -- "Check Section Max Capacity" --> P4
    P4 -- "Insert Active / Transferred Enrollments" --> D3

    D3 -- "Read Instructor-Submitted Standing" --> P5
    P5 -- "Set gradesApproved = true (Lock)" --> D2
    P5 -- "Complete Enrollments & Mint Certificates" --> D3
    P2 & P3 & P4 & P5 -- "Append Compliance Audit Events" --> D4
    D1 & D2 & D3 -- "2. Updated Catalogs, Rosters & Approval Telemetry" --> AA
```

---

### B2. Use Case Diagram (MinSU Academic Administration Scope)

#### Copy-Paste AI Prompt
```text
Create a UML Use Case Diagram for the "Academic Administrator Workflow" in the "Mindoro State University (MinSU) E-Learn & Networking Academy LMS".

Actors:
- Primary Actor: MinSU Academic Administrator (Registrar)
- Secondary Actors: Capacity & CSV Import Engine, Grade Lock & Certificate Issuer

Use Cases:
- UC1: View Academic KPI & Enrollment Telemetry Dashboard
- UC2: Manage MinSU Colleges, Departments & Degree Programs
- UC3: Configure Academic Years, Semesters & Active Term
- UC4: Author & Publish Master Course Catalog Offerings
- UC5: Provision Class Sections, Schedules & Rooms
- UC6: Assign Instructors & Teaching Assistants to Sections
- UC7: Manage Student Enrollments, Waitlists & Section Transfers
- UC8: Execute CSV Bulk Import (Users, Courses, Enrollments)
- UC9: Review, Approve & Lock Final Section Grades
- UC10: Broadcast Institutional Announcements
- UC11: Export Registrar & Enrollment Analytics Reports
```

#### Mermaid Diagram
```mermaid
flowchart LR
    AA(["🏛️ MinSU Academic Administrator"])
    CapEng(["⚙️ Capacity & CSV\nImport Engine"])
    LockEng(["🏅 Grade Lock &\nCertificate Issuer"])

    subgraph LMS["Mindoro State University (MinSU) LMS — Academic Administration Subsystem"]
        UC1(["UC1: View Academic KPI & Enrollment Dashboard"])
        UC2(["UC2: Manage Colleges, Departments & Degree Programs"])
        UC3(["UC3: Configure Academic Years & Active Semesters"])
        UC4(["UC4: Manage Master Course Catalog & Prerequisites"])
        UC5(["UC5: Provision Class Sections, Schedules & Rooms"])
        UC6(["UC6: Assign Instructors & Teaching Assistants"])
        UC7(["UC7: Manage Student Enrollments & Section Transfers"])
        UC8(["UC8: Execute CSV Bulk Import (Users / Courses / Enrollments)"])
        UC9(["UC9: Approve & Lock Final Section Grades"])
        UC10(["UC10: Publish Institutional Announcements"])
        UC11(["UC11: Export Registrar & Grade Distribution Reports"])

        UC_Cap(["«include»\nValidate Section Seat Capacity"])
        UC_CSV(["«include»\nParse & Deduplicate CSV Rows"])
        UC_Cert(["«include»\nAuto-Issue MinSU Certificates on Grade Lock"])
    end

    AA --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9 & UC10 & UC11

    UC7 -.-> UC_Cap
    UC8 -.-> UC_CSV
    UC9 -.-> UC_Cert

    UC_Cap & UC_CSV --> CapEng
    UC_Cert --> LockEng
```

---

### B3. Activity Diagram (MinSU Semester Setup, Section Provisioning, Enrollment & Grade Approval)

#### Copy-Paste AI Prompt
```text
Create a UML Activity Diagram mapping the complete operational workflow of a MinSU Academic Administrator across an academic semester.

Steps:
1. Start -> Academic Admin logs in -> Render Academic Dashboard (/academic/dashboard).
2. Configure Academic Hierarchy (/academic/structure & /academic/terms):
   - Create/Verify MinSU Department (e.g., CCS) & Program (e.g., BSIT).
   - Set Current Active Academic Term (automatically unsets previous active term).
3. Publish Master Course & Provision Class Section (/academic/courses & /academic/classes):
   - Define Course code, credits, level, and prerequisites.
   - Create ClassSection (sectionCode, room, schedule, maxCapacity) and assign Instructor + Teaching Assistant.
4. Enroll Students (/academic/enrollments):
   - Choose Single Enrollment, Section Transfer, or CSV Bulk Import.
   - Decision: Is Enrolled Count < Section maxCapacity?
     * No -> Place on Waitlist or Reject with Capacity Alert.
     * Yes -> Create Active Enrollment record.
5. End-of-Term Final Grade Approval (/academic/grade-approvals):
   - Review Instructor-calculated section standing grades.
   - Decision: Approve & Lock Final Grades?
     * Yes -> Lock ClassSection (gradesApproved = true), transition passing Enrollments to 'completed', auto-issue MinSU Certificates, and write FINAL_GRADES_APPROVED audit log.
6. End.
```

#### Mermaid Diagram
```mermaid
flowchart TD
    Start(["Start: MinSU Academic Admin Logs In"]) --> Dash["View Academic Dashboard\n(/academic/dashboard)"]
    Dash --> ConfigTerm["Configure Department, Program &\nSet Current Academic Term (/academic/terms)"]
    ConfigTerm --> CreateCourse["Create / Publish Master Course\n(/academic/courses)"]
    CreateCourse --> CreateSec["Provision Class Section, Schedule, Room &\nAssign Instructor + TA (/academic/classes)"]

    CreateSec --> EnrollMode{"Select Enrollment Method\n(/academic/enrollments)"}
    EnrollMode -- "Individual / Transfer" --> CapCheck{"Section Enrolled <\nmaxCapacity?"}
    EnrollMode -- "CSV Bulk Import" --> ParseCSV["Parse & Validate CSV Rows\n(Skip Duplicates)"] --> CapCheck

    CapCheck -- "No (Section Full)" --> Waitlist["Assign Waitlisted Status\nor Notify Registrar"]
    CapCheck -- "Yes (Seats Available)" --> ActivateEnr["Create Active Enrollment Record\nfor MinSU Student"]

    ActivateEnr --> TermRun["Semester Instruction & Assessments Proceed"]
    TermRun --> ReviewGrades["Inspect Instructor-Submitted Section Grades\n(/academic/grade-approvals)"]

    ReviewGrades --> LockCheck{"Approve & Lock\nFinal Grades?"}
    LockCheck -- "No (Needs Revision)" --> ReturnInst["Notify Instructor for Gradebook Review"]
    LockCheck -- "Yes (Approve)" --> LockSection["Set ClassSection.gradesApproved = true\n& Mark Passing Enrollments = completed"]
    LockSection --> MintCerts["Auto-Issue Official MinSU Certificates\n& Log FINAL_GRADES_APPROVED"]
    Waitlist & ReturnInst & MintCerts --> EndNode(["End Registrar Workflow"])
```

---

### B4. Sequence Diagram (MinSU Registrar Final Grade Approval & Certificate Issuance)

#### Copy-Paste AI Prompt
```text
Create a UML Sequence Diagram for the "MinSU Academic Administrator Final Grade Approval, Gradebook Locking, and Certificate Issuance" workflow.

Participants:
1. MinSU Academic Admin
2. GradeApprovalsPage (React)
3. AuthMiddleware
4. AssignmentController
5. Relational Database (Sequelize)
6. AuditLogService

Chronological Steps:
1. Academic Admin clicks "Approve & Lock Final Grades" for a ClassSection in GradeApprovalsPage.
2. GradeApprovalsPage sends POST /api/classes/:classId/approve-grades with Bearer JWT.
3. AuthMiddleware verifies JWT and checks 'grades.approve' permission.
4. AssignmentController loads ClassSection, Course, and active Enrollments from Database.
5. For each student Enrollment:
   - Calculates finalNumericGrade and finalLetterGrade (if not already finalized).
   - Sets Enrollment status = 'completed', progressPercentage = 100, completedAt = NOW().
   - If passing score (>= 60%), creates or verifies official MinSU Certificate record in certificates table.
6. AssignmentController updates ClassSection (gradesApproved = true, gradesApprovedAt = NOW(), status = 'completed').
7. AssignmentController calls AuditLogService.logAuditEvent('FINAL_GRADES_APPROVED').
8. Returns 200 OK { classSection, issuedCertificatesCount } to GradeApprovalsPage.
```

#### Mermaid Diagram
```mermaid
sequenceDiagram
    autonumber
    actor AA as MinSU Academic Admin
    participant UI as GradeApprovalsPage (React)
    participant MW as AuthMiddleware
    participant Ctrl as AssignmentController
    participant DB as Relational Database
    participant Audit as AuditLogService

    AA->>UI: Click "Approve & Lock Final Grades" (ClassSection #id)
    UI->>MW: POST /api/classes/:id/approve-grades (Bearer JWT)
    MW->>DB: Verify JWT & Check "grades.approve" Permission
    MW->>Ctrl: approveSectionGrades(req, res)
    Ctrl->>DB: SELECT ClassSection, Course & Enrollments WHERE classId = :id

    loop For Each Enrolled Student in Section
        Ctrl->>Ctrl: Compute Final Numeric & Letter Grade Standing
        Ctrl->>DB: UPDATE enrollments SET status="completed", progressPercentage=100, finalLetterGrade
        alt Final Score >= Passing Threshold (60%)
            Ctrl->>DB: FIND OR CREATE Certificate (AIT-CERT-YYYY-XXXX, verificationCode)
        end
    end

    Ctrl->>DB: UPDATE class_sections SET gradesApproved=true, gradesApprovedAt=NOW(), status="completed"
    Ctrl->>Audit: logAuditEvent("FINAL_GRADES_APPROVED", entityId: classSection.id)
    Audit->>DB: INSERT INTO audit_logs
    Ctrl-->>UI: 200 OK { message, issuedCertificatesCount }
    UI-->>AA: Update Section Badge to "APPROVED & LOCKED" + Show Toast
```

---

### B5. State Machine Diagram (MinSU Class Section & Gradebook Lifecycle States)

#### Copy-Paste AI Prompt
```text
Create a UML State Machine Diagram tracking the lifecycle states of a "MinSU Class Section & Official Gradebook" managed by the Academic Administrator.

States:
- [*] Initial
- Scheduled_Open (Section provisioned; Instructor & TA assigned; open for student enrollment)
- Capacity_Full_Waitlist (Enrolled students == maxCapacity; new requests waitlisted)
- Active_Instruction (Semester in progress; lessons, labs, and quizzes active)
- Awaiting_Grade_Approval (Term ended; Instructor computed standing grades; awaiting Registrar review)
- Grades_Approved_Locked (Academic Admin approved final grades; gradebook locked; Certificates issued)
- Archived_Closed (Historical transcript record)
```

#### Mermaid Diagram
```mermaid
stateDiagram-v2
    [*] --> Scheduled_Open : Academic Admin Creates ClassSection\n(Assigns Course, Term, Instructor & TA)

    Scheduled_Open --> Capacity_Full_Waitlist : Enrolled Count Reaches maxCapacity (40)
    Capacity_Full_Waitlist --> Scheduled_Open : Student Drops / Transfers Section

    Scheduled_Open --> Active_Instruction : Semester Begins\n(Lessons, Labs & Quizzes Active)
    Capacity_Full_Waitlist --> Active_Instruction : Semester Begins

    Active_Instruction --> Awaiting_Grade_Approval : Instructor Finalizes Section Gradebook\n[Ready for Registrar Review]

    Awaiting_Grade_Approval --> Active_Instruction : Academic Admin Requests Grade Revision
    Awaiting_Grade_Approval --> Grades_Approved_Locked : Academic Admin Approves Final Grades\n[gradesApproved = true + Certificates Issued]

    Grades_Approved_Locked --> Archived_Closed : Academic Year Closes\n[Immutable Transcript Record]
    Archived_Closed --> [*]
```

---

### B6. Communication Diagram (Object Collaboration During CSV Bulk Import)

#### Copy-Paste AI Prompt
```text
Create a UML Communication Diagram showing the collaborating objects and numbered messages when a MinSU Academic Administrator executes a CSV Bulk Import (`POST /api/academic/import-csv`).

Objects:
- :MinSUAcademicAdmin (Actor)
- :EnrollmentManagementPage (React UI)
- :AuthMiddleware (RBAC Guard)
- :AcademicController (CSV Import Handler)
- :UserModel (users & user_roles)
- :EnrollmentModel (enrollments & class_sections)
- :AuditLogger (audit_logs)
```

#### Mermaid Diagram
```mermaid
flowchart LR
    AA(["🏛️ :MinSUAcademicAdmin"])
    UI["🖥️ :EnrollmentManagementPage"]
    MW["🛡️ :AuthMiddleware"]
    Ctrl["⚙️ :AcademicController"]
    UserM[("👤 :UserModel\n(users & user_roles)")]
    EnrM[("📋 :EnrollmentModel\n(enrollments)")]
    AudM[("📜 :AuditLogger\n(audit_logs)")]

    AA -- "1: uploadCsvRecords(entityType, records[])" --> UI
    UI -- "1.1: POST /api/academic/import-csv" --> MW
    MW -- "1.2: verifyRole('academic_admin')" --> Ctrl
    Ctrl -- "1.3: findOrCreateUsers(records[])" --> UserM
    Ctrl -- "1.4: findOrCreateEnrollments(records[])" --> EnrM
    Ctrl -- "1.5: logAuditEvent('CSV_RECORDS_IMPORTED')" --> AudM
    Ctrl -- "1.6: 201 Created { importedCount, skippedCount }" --> UI
```

---

### B7. Interaction Overview Diagram (End-to-End MinSU Registrar Semester Lifecycle)

#### Copy-Paste AI Prompt
```text
Create a UML Interaction Overview Diagram combining Activity nodes with inline Sequence frames (`sd`) for the complete MinSU Academic Administrator workflow from Semester Configuration to Final Grade Approval.

Frames (`sd` blocks):
1. sd Configure_Academic_Hierarchy_And_Term (POST /api/academic/departments, /programs, /terms)
2. sd Publish_Courses_And_Provision_Sections (POST /api/courses & POST /api/classes with Instructor/TA assignment)
3. sd Manage_Enrollments_And_CSV_Import (POST /api/enrollments & POST /api/academic/import-csv)
4. sd Approve_Final_Grades_And_Mint_Certificates (POST /api/classes/:id/approve-grades)
```

#### Mermaid Diagram
```mermaid
flowchart TD
    Start(["Start MinSU Registrar Semester Cycle"]) --> SD_Hierarchy

    subgraph SD_Hierarchy["sd Configure_Academic_Hierarchy_And_Term"]
        H1["AcademicAdmin → AcademicController: Create Department, Program & Set Current Term"] --> H2["AcademicController → DB: Persist Structure & Unset Previous Current Term"]
    end

    SD_Hierarchy --> SD_Catalog

    subgraph SD_Catalog["sd Publish_Courses_And_Provision_Sections"]
        C1["AcademicAdmin → AcademicController: Create Published Course & ClassSection"] --> C2["AcademicController → DB: Link Course, Term, Instructor & TA"]
    end

    SD_Catalog --> SD_Enroll

    subgraph SD_Enroll["sd Manage_Enrollments_And_CSV_Import"]
        E1["AcademicAdmin → AcademicController: Enroll Students / Upload CSV Batch"] --> E2["AcademicController → DB: Verify Seat Capacity & Insert Active Enrollments"]
    end

    SD_Enroll --> SD_Approve

    subgraph SD_Approve["sd Approve_Final_Grades_And_Mint_Certificates"]
        G1["AcademicAdmin → AssignmentController: POST /api/classes/:id/approve-grades"] --> G2["AssignmentController → DB: Lock Section, Complete Enrollments & Issue Certificates"]
    end

    SD_Approve --> EndNode(["End Registrar Semester Cycle"])
```

---

### B8. Timing Diagram (MinSU Semester & Grade Approval Governance Timeline)

#### Copy-Paste AI Prompt
```text
Create a UML Timing Diagram showing the phase transitions and timing constraints of an Academic Term, Class Section Enrollment Window, and Gradebook Approval state across a MinSU 18-Week Semester timeline.

Lifelines & Phases:
1. Academic Term State:
   - Week 0: [Upcoming_Setup] -> Week 1 to Week 18: [Current_Active_Term] -> Week 19+: [Completed_Archived_Term].
2. Section Enrollment Window:
   - Week 0 to Week 2: [Open_Enrollment_And_Transfer] -> Week 3 to Week 18: [Roster_Locked_Active_Study].
3. Section Gradebook & Certificate State:
   - Week 1 to Week 16: [Continuous_Assessment] -> Week 17: [Instructor_Final_Standing_Computed] -> Week 18: [Registrar_Approved_Locked & Certificates_Minted].
```

#### Mermaid Diagram
```mermaid
flowchart LR
    subgraph SemTimeline["MinSU 18-Week Semester Timeline"]
        direction LR
        W0["Week 0\nTerm & Section Setup"] --> W1["Weeks 1–2\nEnrollment & CSV Import"] --> W3["Weeks 3–16\nActive Instruction"] --> W17["Week 17\nInstructor Standing"] --> W18["Week 18\nRegistrar Grade Lock"]
    end

    subgraph TermLife["Lifeline 1: AcademicTerm State"]
        TL0["State: Upcoming"] --> TL1["State: Current_Active\n(Weeks 1–18)"] --> TL2["State: Completed_Term\n(Week 18+)"]
    end

    subgraph RosterLife["Lifeline 2: ClassSection Enrollment Window"]
        RL0["State: Open_Enrollment_&_Transfers\n(Weeks 0–2, Capacity <= 40)"] --> RL1["State: Active_Cohort_Roster\n(Weeks 3–17)"] --> RL2["State: Completed_Roster"]
    end

    subgraph GradeLife["Lifeline 3: Official Gradebook & Certificate State"]
        GL0["State: In_Progress_Grading"] --> GL1["State: Awaiting_Registrar_Approval\n(Week 17)"] --> GL2["State: Grades_Approved_Locked\n+ MinSU Certificates Issued (Week 18)"]
    end

    W0 -.-> TL0 & RL0
    W1 -.-> TL1
    W3 -.-> RL1 & GL0
    W17 -.-> GL1
    W18 -.-> TL2 & RL2 & GL2
```

---

### B9. Requirement Diagram (SysML — MinSU Academic Administrator Requirements)

#### Copy-Paste AI Prompt
```text
Create a SysML Requirement Diagram mapping the formal requirements of the MinSU Academic Administrator role to the backend/frontend components that satisfy them and the automated tests that verify them.

Requirements:
- REQ-AA-01 (Academic Hierarchy & Single Active Term): "The system must support managing MinSU departments, degree programs, and academic terms where setting a term as current automatically unsets previous current terms."
- REQ-AA-02 (Course Offerings & Faculty Section Assignment): "Academic Admins must be able to publish master courses, provision class sections, and assign Instructors and Teaching Assistants."
- REQ-AA-03 (Enrollment Management & CSV Bulk Import): "The system must support individual enrollments, section transfers, seat capacity enforcement, and CSV bulk record imports."
- REQ-AA-04 (Final Grade Approval & Certificate Issuance): "Academic Admins must be able to approve and lock final section grades, automatically completing passing enrollments and issuing verifiable certificates."
```

#### Mermaid Diagram
```mermaid
flowchart TB
    subgraph AARequirements["SysML Requirements — MinSU Academic Administration"]
        R1["«requirement»\nREQ-AA-01: Academic Hierarchy & Terms\nid = 'AA-01'\ntext = 'Manage departments, programs, and exclusive current academic terms'"]
        R2["«requirement»\nREQ-AA-02: Course & Section Provisioning\nid = 'AA-02'\ntext = 'Create courses, sections, schedules, and assign Instructors & TAs'"]
        R3["«requirement»\nREQ-AA-03: Enrollments & CSV Bulk Import\nid = 'AA-03'\ntext = 'Enforce section capacity, section transfers, and CSV batch imports'"]
        R4["«requirement»\nREQ-AA-04: Final Grade Lock & Certificates\nid = 'AA-04'\ntext = 'Lock section grades and auto-issue MinSU certificates upon approval'"]
    end

    subgraph AAImplementation["System Components (client/src & server/src)"]
        C_Acad["«block»\nacademic.controller.js\n(Departments, Programs, Terms, Courses, Sections, CSV Import)"]
        C_Approve["«block»\nassignment.controller.js\n(approveSectionGrades & Certificate Issuance)"]
        C_UI["«block»\nAcademicAdminPages.jsx\n(7 Registrar & Curriculum Management Views)"]
    end

    subgraph AAVerification["Automated Verification Suite"]
        T_Suite["«testCase»\nlms.integration.test.js\n(Verifies Course Creation, CSV Import & Final Grade Approval)"]
    end

    C_Acad -- "«satisfy»" --> R1 & R2 & R3
    C_Approve -- "«satisfy»" --> R4
    C_UI -- "«satisfy»" --> R1 & R2 & R3 & R4
    T_Suite -. "«verify»" .-> R1 & R2 & R3 & R4
```

