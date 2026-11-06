# System Modeling & Diagram Blueprint: Instructor / Faculty (`instructor`) Account Workflow

---

## Objective

To apply system modeling concepts to the **Mindoro State University (MinSU) E-Learn & Networking Academy — Instructor / Faculty (`instructor`) Account Workflow** by identifying, selecting, and documenting the complete suite of **8 Structural Diagrams (The Static Blueprint)** and **9 Behavioral Diagrams (The System in Motion)** required to architect, implement, and verify the faculty instructional, curriculum authoring, rubric grading, selection-only assessment design, and weighted gradebook sub-system across Mindoro State University's Bongabong, Main (Victoria), and Calapan City campuses.

---

## Part 1: Core Modeling Framework

Every proposed system must be viewed through two distinct lenses to ensure it can be successfully built:

### 1. Structural Diagrams (The Static Blueprint)
- **What it is:** These diagrams map out the static skeleton of your project—what parts make up the system architecture, how they are organized, and where they will be hosted.
- **Key Rule:** These components and relationships do not change based on individual user actions. They represent the permanent infrastructure or codebase layout.
- **Core Examples:** System Architecture, Class, Component, and Deployment diagrams (plus Object, Package, Composite Structure, and Profile diagrams).

### 2. Behavioral Diagrams (The System in Motion)
- **What it is:** These diagrams document the dynamic logic of your project—how data moves, how components interact step-by-step, and how the system responds to users over time.
- **Key Rule:** These change dynamically based on triggers, inputs, time, or external events.
- **Core Examples:** Data Flow Diagrams (DFD), Use Case, Sequence, and Activity diagrams (plus State Machine, Communication, Interaction Overview, Timing, and Requirement diagrams).

---

## Part 2: Diagram Reference Guide

### Section A: Structural Diagrams (Static Blueprint)
- **System Architecture Diagram:** High-level layout of your servers, clients, cloud infrastructure, and databases.
- **Class Diagram:** Maps out data models, object classes, their attributes, and how they connect.
- **Component Diagram:** Shows how different software modules, libraries, or microservices depend on each other.
- **Deployment Diagram:** Outlines the physical hardware or containerized infrastructure hosting your application.
- **Object Diagram:** Captures a snapshot of instances of classes at a specific moment in time.
- **Package Diagram:** Groups classes or components into higher-level folders (packages) to show organization.
- **Composite Structure Diagram:** Breaks down the internal structure of a single complex classifier or class.
- **Profile Diagram:** Customizes existing UML elements for specific industries, domains, or platforms.

### Section B: Behavioral Diagrams (The System in Motion)
- **Data Flow Diagram (DFD):** Tracks exactly how data enters your system, processes through nodes, and hits storage.
- **Use Case Diagram:** Defines project scope by mapping who your users/systems are (actors) and what actions they can take.
- **Activity Diagram:** A technical flowchart mapping out business logic, background processes, or algorithms.
- **Sequence Diagram:** Coordinates chronological, step-by-step messages between system entities for a single feature.
- **State Machine Diagram:** Tracks the lifecycle stages an entity goes through based on events (e.g., an Order going from Pending → Paid → Shipped).
- **Communication Diagram:** Similar to a sequence diagram, but focuses on the freeform network structure of objects rather than time.
- **Interaction Overview Diagram:** Combines an Activity diagram with miniature Sequence diagrams.
- **Timing Diagram:** Explores exact timing constraints and phase changes of objects over an explicit timeline.
- **Requirement Diagram (SysML):** Maps text-based system rules and requirements directly to physical or digital components.

---

## Part 3: Completed Blueprinting Exercise (Instructor / Faculty Workflow)

### 1. Project Identification
- **Proposal Title:** **Mindoro State University (MinSU) E-Learn & Networking Academy: A Web-Based Role-Driven Learning Management System Inspired by Cisco NetAcad** *(Focus Module: Instructor / Faculty Curriculum Authoring, Selection-Only Assessment Design, Rubric Grading & Weighted Section Gradebook Sub-System)*
- **Project Summary (2–3 Sentences):**
  The Mindoro State University (MinSU) E-Learn & Networking Academy is a full-stack, role-based Learning Management System engineered for MinSU's College of Computer Studies across its Bongabong, Main (Victoria), and Calapan City campuses. Within this platform, the **Instructor (`instructor`)** role serves as the primary pedagogical authority responsible for authoring structured course modules and Packet Tracer guided labs in the Course Studio, building timed selection-only checkpoint quizzes and exams (`multiple_choice`, `true_false`, `multiple_select`, `matching`), creating lab assignments with multi-criteria JSON rubrics, grading student submissions alongside Teaching Assistant preliminary notes, and managing the weighted section gradebook with instant CSV export.

### 2. Structural Blueprinting
- **Selected Essential Structural Diagram:** **Class Diagram** (paired with the **System Architecture Diagram**)
- **Why This Specific Layout Diagram Is Required:**
  The **Class Diagram** is essential for the MinSU Instructor sub-system because an Instructor interacts with the deepest relational hierarchy in the entire LMS: an Instructor `User` (`role = 'instructor'`) is assigned to one or more `ClassSection` offerings (`instructorId`), authors hierarchical `Module` and `Lesson` entities inside the parent `Course`, creates `Assignment` records (which automatically provision linked `GradeItem` columns in the section gradebook), builds `Assessment` and `Question` banks strictly constrained to selection-only types, and evaluates student `Submission` records that automatically synchronize numeric scores into `GradeRecord` cells. Without a strict Class Diagram defining these foreign keys, cascade rules, and JSON rubric/question schemas, faculty grading and curriculum authoring would suffer from orphaned grade items and unsynchronized student gradebooks.

### 3. Behavioral Blueprinting
- **Selected Critical Behavioral Diagram 1:** **Use Case Diagram**
  - **Specific Project Scenario Mapped:** Maps the complete pedagogical boundary of the **MinSU Instructor (`instructor`)** actor across 6 core functional clusters:
    1. *Assigned Classes & Section Roster Management* (`/instructor/dashboard`, `/instructor/classes`),
    2. *Course Studio Curriculum & Guided Lab Authoring* (`/instructor/courses`),
    3. *Assignment & JSON Rubric Creation* (`/instructor/assignments`),
    4. *Submission Evaluation & Rubric Grading* (`/instructor/submissions`),
    5. *Selection-Only Assessment & Question Bank Authoring* (`/instructor/assessments`), and
    6. *Weighted Section Gradebook Management & CSV Export* (`/instructor/gradebook`, `/instructor/reports`).
- **Selected Critical Behavioral Diagram 2:** **Sequence Diagram** (supported by the **Activity Diagram** and **DFD**)
  - **Specific Project Scenario Mapped:** Maps the chronological, multi-table transactional handshake for **"Instructor Grading a Student Lab Submission via JSON Rubric & Synchronizing the Section Gradebook"** (`PUT /api/v1/assignments/submissions/:id/grade`). It traces how the Instructor selects rubric criteria tiers in the React UI, sends the payload with a Bearer JWT to Express, passes through `authenticate` and `authorize('super_admin', 'academic_admin', 'instructor')`, updates the `Submission` status to `'graded'`, upserts the corresponding `GradeRecord` for the assignment's `GradeItem`, recalculates the student's weighted course average, and dispatches an in-app `Notification` to the MinSU student.

### 4. Data Blueprinting
- **How Data Flows from Instructor Input to the System Database:**
  1. **Curriculum, Assignment, or Grade Input:** The MinSU Instructor interacts with the React 18 faculty workspace (`InstructorPages.jsx`)—for example, creating a new Packet Tracer lab assignment with a 3-criterion JSON rubric or grading a student's submitted topology report.
  2. **Authenticated REST Request:** The Axios client (`api.js`) attaches `Authorization: Bearer <accessToken>` and dispatches an HTTP request (`POST /api/v1/assignments` or `PUT /api/v1/assignments/submissions/:id/grade`) to the Express.js API gateway.
  3. **JWT & RBAC Verification:** `authenticate` verifies the JWT signature and checks `User.status === 'active'`, while `authorize('super_admin', 'academic_admin', 'instructor')` confirms the caller holds faculty privileges (preventing Teaching Assistants or Students from publishing official final grades).
  4. **Controller Validation & Multi-Table Persistence:** Inside `assignment.controller.js`, Sequelize ORM executes atomic database writes in SQLite3/PostgreSQL: creating an `Assignment` also creates a linked `GradeItem` (`category = 'assignment'`, `weight = 0.30`), and grading a `Submission` updates `submissions.numeric_score`, `submissions.rubric_Breakdown`, `submissions.status = 'graded'`, and upserts `grade_records.score`, immediately reflecting in both the Instructor Gradebook Matrix and the Student's Gradebook view.

---

# Section 1: Structural Diagrams (The Static Blueprint) — All 8 Diagrams

| # | Diagram Name | Primary Purpose | Best Used For (MinSU Instructor Context) |
| :--- | :--- | :--- | :--- |
| **A1** | **System Architecture Diagram** | Shows high-level layout of servers, clients, cloud infrastructure, and databases. | Explaining the 3-tier MinSU Faculty Course Studio, Assessment Builder, and Gradebook architecture. |
| **A2** | **Class Diagram** | Maps out object-oriented classes, their attributes, methods, and relationships. | Baseline blueprint for `ClassSection`, `Module`, `Lesson`, `Assignment`, `Submission`, `Assessment`, `Question`, `GradeItem`, and `GradeRecord`. |
| **A3** | **Component Diagram** | Shows how software pieces (modules, libraries, microservices) are bundled and depend on each other. | Mapping dependencies between `InstructorPages.jsx`, `academic.controller.js`, `assignment.controller.js`, and `assessment.controller.js`. |
| **A4** | **Deployment Diagram** | Maps software components to physical hardware or cloud infrastructure. | DevOps layout across MinSU Faculty Workstations, Nginx Reverse Proxy, Node.js API Container, and SQL Database. |
| **A5** | **Object Diagram** | Captures a snapshot of instances of classes at a specific moment in time. | Concrete runtime snapshot of `inst_santos` teaching `BSIT-2A-NET101` and grading `stud_calapan_01`'s OSPF Lab. |
| **A6** | **Package Diagram** | Groups classes or components into higher-level folders (packages) to show organization. | Organizing the Monorepo into Faculty UI Views, Express Instructional Controllers, RBAC Middleware, and Sequelize Models. |
| **A7** | **Composite Structure Diagram** | Breaks down the internal structure of a single complex classifier or class. | Internal ports, parts, and connectors of the `InstructorGradingAndAssessmentEngine` composite component. |
| **A8** | **Profile Diagram** | Customizes existing UML elements for specific industries, domains, or platforms. | Defining custom UML stereotypes (`<<MinSUFacultyAction>>`, `<<SelectionOnlyRule>>`, `<<GradebookSync>>`) for MinSU CCS. |

---

## A1. System Architecture Diagram (Instructor Workflow)

```mermaid
flowchart TB
    subgraph ClientTier["1. Client Tier (MinSU Faculty Browser — React 18 + Vite SPA)"]
        IDash["Faculty Dashboard & KPIs\n(/instructor/dashboard)"]
        IClass["Assigned Classes & Rosters\n(/instructor/classes)"]
        IStudio["Course Studio: Modules, Lessons & Labs\n(/instructor/courses)"]
        IAssign["Assignment & JSON Rubric Builder\n(/instructor/assignments)"]
        ISub["Submission Grading & Rubric Evaluator\n(/instructor/submissions)"]
        IQuiz["Selection-Only Assessment & Question Studio\n(/instructor/assessments)"]
        IGrade["Weighted Section Gradebook & CSV Export\n(/instructor/gradebook)"]
    end

    subgraph SecurityTier["2. API Gateway & Faculty RBAC Layer (Node.js + Express)"]
        Gateway["Express REST Router (/api/v1/*)\nHelmet + CORS + Rate Limiter"]
        AuthMW["JWT Verification (authenticate)\nConfirms Active Faculty Session"]
        RoleMW["RBAC Guard (authorize)\nAllows: instructor, academic_admin, super_admin"]
    end

    subgraph LogicTier["3. Instructional Application Services (Controllers)"]
        AcadCtrl["Academic Controller\n(Module/Lesson CRUD, Section Rosters, Announcements)"]
        AssignCtrl["Assignment Controller\n(Assignment CRUD, Rubric Grading, GradeRecord Sync)"]
        AssessCtrl["Assessment Controller\n(Selection-Only Quiz Builder, Weighted Gradebook Engine)"]
    end

    subgraph DataTier["4. Persistence Tier (Sequelize ORM + SQLite / PostgreSQL)"]
        CurrDB[("Curriculum Store\ncourses, modules, lessons,\nclass_sections, enrollments")]
        WorkDB[("Coursework & Assessment Store\nassignments, submissions,\nassessments, questions, attempts")]
        GradeDB[("Gradebook & Comms Store\ngrade_items, grade_records,\nannouncements, notifications")]
    end

    IDash & IClass & IStudio -->|"HTTPS JSON + Bearer JWT"| Gateway
    IAssign & ISub & IQuiz & IGrade -->|"HTTPS JSON + Bearer JWT"| Gateway
    Gateway --> AuthMW --> RoleMW
    RoleMW --> AcadCtrl & AssignCtrl & AssessCtrl
    AcadCtrl -->|"Sequelize ORM"| CurrDB & GradeDB
    AssignCtrl -->|"Sequelize ORM"| WorkDB & GradeDB
    AssessCtrl -->|"Sequelize ORM"| WorkDB & GradeDB
```

---

## A2. Class Diagram (Instructor Domain Model)

```mermaid
classDiagram
    class User {
        +Integer id
        +String firstName
        +String lastName
        +String email
        +Enum role "instructor"
        +String department
        +getAssignedSections()
        +authorCurriculum()
        +gradeSubmission()
    }

    class ClassSection {
        +Integer id
        +Integer courseId
        +Integer termId
        +Integer instructorId
        +Integer assistantId
        +String sectionCode
        +String schedule
        +String room
        +Enum status
    }

    class Course {
        +Integer id
        +String code
        +String title
        +Enum level
        +Enum status
    }

    class Module {
        +Integer id
        +Integer courseId
        +String title
        +Text description
        +Integer orderIndex
        +Boolean isPublished
    }

    class Lesson {
        +Integer id
        +Integer moduleId
        +String title
        +Enum contentType "reading|lab|video|resource"
        +Text contentBody
        +Text labInstructions
        +Integer estimatedMinutes
        +Integer orderIndex
    }

    class Assignment {
        +Integer id
        +Integer courseId
        +Integer moduleId
        +String title
        +Text instructions
        +DateTime dueDate
        +Float maxScore
        +JSON rubric
        +Boolean isPublished
    }

    class Submission {
        +Integer id
        +Integer assignmentId
        +Integer studentId
        +Enum status "submitted|late|graded|returned"
        +Float numericScore
        +Text feedback
        +JSON rubricBreakdown
        +Integer gradedById
    }

    class Assessment {
        +Integer id
        +Integer courseId
        +Integer moduleId
        +String title
        +Enum type "quiz|module_exam|final_exam"
        +Integer timeLimitMinutes
        +Integer maxAttempts
        +Float passingScorePct
    }

    class Question {
        +Integer id
        +Integer assessmentId
        +Enum type "multiple_choice|true_false|multiple_select|matching"
        +Text prompt
        +JSON options
        +JSON correctAnswer
        +Float points
    }

    class GradeItem {
        +Integer id
        +Integer courseId
        +String title
        +Enum category "assignment|quiz|exam|lab"
        +Float weight
        +Float maxScore
        +String sourceType
        +Integer sourceId
    }

    class GradeRecord {
        +Integer id
        +Integer gradeItemId
        +Integer studentId
        +Float score
        +Text feedback
        +Integer gradedById
    }

    User "1" --> "0..*" ClassSection : teaches (instructorId)
    Course "1" --> "0..*" ClassSection : offeredIn
    Course "1" *-- "0..*" Module : contains
    Module "1" *-- "0..*" Lesson : structures
    Course "1" *-- "0..*" Assignment : includes
    Assignment "1" --> "0..*" Submission : receives
    User "1" --> "0..*" Submission : evaluates (gradedById)
    Course "1" *-- "0..*" Assessment : evaluatesWith
    Assessment "1" *-- "1..*" Question : comprises
    Course "1" *-- "0..*" GradeItem : definesColumns
    GradeItem "1" --> "0..*" GradeRecord : storesScores
    User "1" --> "0..*" GradeRecord : records (gradedById)
```

---

## A3. Component Diagram (Instructor Sub-System)

```mermaid
flowchart LR
    subgraph FrontendSPA["MinSU Faculty Frontend (client/src/pages/InstructorPages.jsx)"]
        IDashComp["[Component]\nInstructorDashboard"]
        IClassComp["[Component]\nAssignedClasses & Roster"]
        IStudioComp["[Component]\nCourseStudioBuilder"]
        IAssignComp["[Component]\nAssignmentRubricBuilder"]
        IGraderComp["[Component]\nSubmissionRubricGrader"]
        IQuizComp["[Component]\nSelectionAssessmentStudio"]
        IGBComp["[Component]\nSectionGradebook & CSV"]
        ApiClient["[Component]\nAxios API Client (api.js)"]
    end

    subgraph BackendAPI["MinSU Express Backend (server/src/)"]
        RBACGuard["[Component]\nJWT + Faculty RBAC Middleware"]
        AcadComp["[Component]\nacademic.controller.js"]
        AssignComp["[Component]\nassignment.controller.js"]
        AssessComp["[Component]\nassessment.controller.js"]
        ORMComp["[Component]\nSequelize ORM Models"]
    end

    IDashComp & IClassComp & IStudioComp --> ApiClient
    IAssignComp & IGraderComp & IQuizComp & IGBComp --> ApiClient
    ApiClient -->|"REST /api/v1/*"| RBACGuard
    RBACGuard --> AcadComp & AssignComp & AssessComp
    AcadComp & AssignComp & AssessComp --> ORMComp
```

---

## A4. Deployment Diagram (Instructor Infrastructure)

```mermaid
flowchart TB
    subgraph FacultyNode["Device Node\nMinSU Faculty Workstation (CCS Lab / Faculty Office)"]
        subgraph BrowserEnv["Execution Environment\nWeb Browser (Chrome / Edge)"]
            FacultySPA["Artifact\nReact 18 Faculty SPA\n(Course Studio, Grader, Gradebook)"]
            CSVBlob["Artifact\nClient-Side CSV Export\n(Section Gradebook CSV)"]
        end
    end

    subgraph AppServerNode["Server Node\nMinSU Application Host (Docker / Ubuntu 24.04 LTS)"]
        subgraph NginxContainer["Container\nNginx Reverse Proxy"]
            NginxArtifact["Artifact\nTLS 1.3 Termination &\nStatic Asset Server"]
        end
        subgraph NodeContainer["Container\nNode.js 20 LTS Runtime"]
            ExpressArtifact["Artifact\nMinSU LMS REST API\n(Academic, Assignment & Assessment Controllers)"]
        end
    end

    subgraph DataServerNode["Database Node\nMinSU Primary Data Host"]
        subgraph DBEngine["Database\nPostgreSQL 16 / SQLite3"]
            RelationalData["Artifact\nModules, Lessons, Rubrics,\nSubmissions, Questions & GradeRecords"]
        end
    end

    FacultySPA -->|"Client Blob Generation"| CSVBlob
    FacultySPA <-->|"HTTPS / TLS 1.3 (Port 443)"| NginxArtifact
    NginxArtifact <-->|"HTTP Proxy (Port 5000)"| ExpressArtifact
    ExpressArtifact <-->|"Sequelize SQL Connection"| RelationalData
```

---

## A5. Object Diagram (Runtime Snapshot — Instructor Grading Session)

```mermaid
flowchart TB
    instSantos["instSantos : User\nid = 3\nname = 'Prof. Elena Santos'\nrole = 'instructor'\ndepartment = 'MinSU CCS Bongabong'"]

    secBsit2A["secBsit2A : ClassSection\nid = 1\ncourseId = 1\nsectionCode = 'BSIT-2A-NET101'\ninstructorId = 3\nroom = 'Cisco Lab 101'"]

    assignVlan["assignVlanLab : Assignment\nid = 1\ncourseId = 1\ntitle = 'Packet Tracer VLAN Trunking Lab'\nmaxScore = 100.0\nisPublished = true"]

    subStudent["subCalapan01 : Submission\nid = 14\nassignmentId = 1\nstudentId = 5\nstatus = 'graded'\nnumericScore = 96.0\ngradedById = 3"]

    giVlan["giVlanLab : GradeItem\nid = 1\ncourseId = 1\ncategory = 'assignment'\nweight = 0.30\nsourceType = 'assignment'\nsourceId = 1"]

    grStudent["grCalapan01 : GradeRecord\nid = 28\ngradeItemId = 1\nstudentId = 5\nscore = 96.0\ngradedById = 3"]

    instSantos -->|"teaches"| secBsit2A
    instSantos -->|"evaluates"| subStudent
    instSantos -->|"records"| grStudent
    assignVlan -->|"hasSubmission"| subStudent
    assignVlan -->|"linkedTo"| giVlan
    giVlan -->|"storesScoreIn"| grStudent
```

---

## A6. Package Diagram (Instructor Codebase Organization)

```mermaid
flowchart TB
    subgraph ClientPackage["Package: client/src (React 18 Frontend)"]
        PkgLayout["layouts\n(AppLayout.jsx — Faculty Nav)"]
        PkgInstPages["pages/InstructorPages.jsx\n(Dashboard, Classes, Course Studio,\nAssignments, Submissions, Assessments, Gradebook)"]
        PkgClientServices["services & context\n(api.js, AuthContext.jsx)"]
    end

    subgraph ServerPackage["Package: server/src (Express Backend)"]
        PkgRoutes["routes\n(academic, assignment, assessment.routes.js)"]
        PkgMiddleware["middleware\n(auth.middleware.js: authenticate + authorize)"]
        PkgControllers["controllers\n(academic, assignment, assessment.controller.js)"]
        PkgModels["models\n(Module, Lesson, Assignment, Submission,\nAssessment, Question, GradeItem, GradeRecord)"]
    end

    PkgLayout -.->|"renders"| PkgInstPages
    PkgInstPages -.->|"imports"| PkgClientServices
    PkgClientServices -.->|"HTTP REST"| PkgRoutes
    PkgRoutes -.->|"uses"| PkgMiddleware
    PkgRoutes -.->|"dispatches"| PkgControllers
    PkgControllers -.->|"queries"| PkgModels
```

---

## A7. Composite Structure Diagram (`InstructorGradingAndAssessmentEngine`)

```mermaid
flowchart LR
    subgraph EngineClassifier["Classifier: InstructorGradingAndAssessmentEngine"]
        PortIn(["Port: pFacultyInput\n(HTTP JSON Request)"])

        subgraph InternalParts["Internal Collaborating Parts"]
            PartValidator["Part: partSelectionValidator\nSelectionOnlyQuestionValidator\n(Blocks fill_in_the_blank / essay)"]
            PartRubric["Part: partRubricAggregator\nRubricScoreCalculator\n(Computes JSON Criterion Sum)"]
            PartSync["Part: partGradebookSynchronizer\nGradeRecordUpsertService\n(Links Submission to GradeItem to GradeRecord)"]
            PartWeight["Part: partWeightedCalculator\nCourseWeightedAverageEngine\n(Computes Weighted Section Matrix)"]
        end

        PortDB(["Port: pDatabasePersistence\n(Sequelize ORM)"])
        PortNotify(["Port: pStudentNotification\n(In-App Notification Dispatcher)"])
    end

    PortIn -->|"Quiz Question Payload"| PartValidator
    PortIn -->|"Rubric Grade Payload"| PartRubric
    PartValidator -->|"Validated Selection Item"| PortDB
    PartRubric -->|"Computed numericScore"| PartSync
    PartSync -->|"Upsert GradeRecord"| PortDB
    PartSync -->|"Trigger Recalculation"| PartWeight
    PartWeight -->|"Updated Section Matrix"| PortDB
    PartSync -->|"Grade Posted Event"| PortNotify
```

---

## A8. Profile Diagram (MinSU Faculty Instructional UML Profile)

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
    class MetaClass_Property {
        <<metaclass>>
        Property
    }

    class MinSUFacultyEndpoint {
        <<stereotype>>
        +String[] allowedRoles = ["super_admin","academic_admin","instructor"]
        +String campusScope = "MinSU Bongabong | Victoria | Calapan"
        +Boolean requiresActiveJWT = true
    }

    class SelectionOnlyQuestionRule {
        <<stereotype>>
        +String[] permittedTypes = ["multiple_choice","true_false","multiple_select","matching"]
        +String[] prohibitedTypes = ["fill_in_the_blank","essay"]
        +Boolean autoGradable = true
    }

    class AutoGradebookSync {
        <<stereotype>>
        +Boolean autoCreatesGradeItem = true
        +Boolean upsertsGradeRecord = true
        +Boolean notifiesStudent = true
    }

    class GuidedNetworkingLab {
        <<stereotype>>
        +String simulatorTool = "Cisco Packet Tracer"
        +Boolean requiresRubricJson = true
    }

    MetaClass_Operation <|-- MinSUFacultyEndpoint : extends
    MetaClass_Class <|-- SelectionOnlyQuestionRule : extends
    MetaClass_Operation <|-- AutoGradebookSync : extends
    MetaClass_Property <|-- GuidedNetworkingLab : extends
```

---

# Section 2: Behavioral Diagrams (The System in Motion) — All 9 Diagrams

| # | Diagram Name | Primary Purpose | Best Used For (MinSU Instructor Context) |
| :--- | :--- | :--- | :--- |
| **B1** | **Data Flow Diagram (DFD)** | Traces how data enters a system, transforms through processes, and gets stored. | Mapping data pipelines from Instructor Course Studio, Assessment Builder, and Rubric Grader into SQL stores. |
| **B2** | **Use Case Diagram** | Highlights relationships between external actors and specific goals. | Scoping all 6 instructional capability clusters of the MinSU Instructor (`instructor`) role. |
| **B3** | **Activity Diagram** | Flowchart showing operational workflows, logic gates, and parallel actions. | Documenting end-to-end logic for authoring a course module, validating selection-only questions, and grading rubrics. |
| **B4** | **Sequence Diagram** | Maps chronological interactions between system entities for a single task. | Tracing `PUT /api/v1/assignments/submissions/:id/grade` across UI, Express, Sequelize, and Gradebook sync. |
| **B5** | **State Machine Diagram** | Tracks the lifecycle stages an entity goes through based on events. | Tracking a Student `Submission` & Course `Assignment` lifecycle (`Draft` → `Published` → `Submitted` → `Graded` → `Returned`). |
| **B6** | **Communication Diagram** | Focuses on the numbered network structure of collaborating objects. | Highlighting message pathways between `:InstructorUI`, `:AssignmentController`, `:SubmissionModel`, and `:GradeRecordModel`. |
| **B7** | **Interaction Overview Diagram** | Combines an Activity diagram with miniature Sequence diagrams. | High-level semester orchestration of an Instructor's workflow from Module Setup to Final Grade CSV Export. |
| **B8** | **Timing Diagram** | Explores exact timing constraints and phase changes over an explicit timeline. | Measuring SLA response windows for Selection-Only Quiz Creation, Rubric Grading Sync, and CSV Generation. |
| **B9** | **Requirement Diagram (SysML)** | Maps text-based system rules and requirements directly to components. | Proving traceability for Selection-Only Quiz Constraints, Auto-GradeRecord Sync, and Faculty RBAC rules. |

---

## B1. Data Flow Diagram (DFD — Level 1: Instructor Sub-System)

```mermaid
flowchart LR
    Inst["External Entity\nMinSU Instructor / Faculty"]
    Stud["External Entity\nMinSU Student"]
    TA["External Entity\nTeaching Assistant"]

    subgraph InstructorProcesses["MinSU LMS — Instructor Level-1 DFD Processes"]
        P1(("P1.0\nAuthor Modules,\nLessons & Labs"))
        P2(("P2.0\nCreate Assignments\n& JSON Rubrics"))
        P3(("P3.0\nBuild Selection-Only\nQuizzes & Exams"))
        P4(("P4.0\nGrade Submissions\n& Sync Gradebook"))
        P5(("P5.0\nCompute Weighted\nGrades & Export CSV"))
    end

    D1[("D1: Curriculum Store\n(modules, lessons)")]
    D2[("D2: Assignment Store\n(assignments, submissions)")]
    D3[("D3: Assessment Store\n(assessments, questions)")]
    D4[("D4: Gradebook Store\n(grade_items, grade_records, notifications)")]

    Inst -->|"Module/Lesson & Lab Specs"| P1
    P1 -->|"Write Module & Lesson Rows"| D1
    D1 -->|"Published Learning Path"| Stud

    Inst -->|"Assignment Details & JSON Rubric"| P2
    P2 -->|"Save Assignment"| D2
    P2 -->|"Auto-Create Linked GradeItem"| D4

    Inst -->|"Quiz Config & Selection-Only Questions"| P3
    P3 -->|"Validate & Store Questions"| D3
    P3 -->|"Auto-Create Quiz GradeItem"| D4

    Stud -->|"Submitted Lab Report / File"| D2
    TA -->|"Preliminary Review Notes"| D2
    D2 -->|"Unreviewed Submission Queue"| P4
    Inst -->|"Rubric Criterion Scores & Feedback"| P4
    P4 -->|"Update Submission (status='graded')"| D2
    P4 -->|"Upsert GradeRecord & Send Notification"| D4
    D4 -->|"Grade Released Notification"| Stud

    D3 -->|"Auto-Graded Quiz Scores"| D4
    D4 -->|"All GradeItems & Student GradeRecords"| P5
    P5 -->|"Weighted Grade Matrix & CSV File"| Inst
```

---

## B2. Use Case Diagram (Instructor / Faculty Role)

```mermaid
flowchart LR
    Instructor(["MinSU Instructor / Faculty\n(Primary Actor)"])
    TA(["Teaching Assistant\n(Secondary Actor)"])
    Student(["MinSU Student\n(Secondary Actor)"])

    subgraph FacultySystem["MinSU E-Learn & Networking Academy — Instructor Sub-System"]
        subgraph Cluster1["1. Class & Roster Management"]
            UC1(["UC1: View Assigned Class Sections & Schedule"])
            UC2(["UC2: Inspect Student Roster & Completion %"])
            UC3(["UC3: Publish Course Announcements"])
        end

        subgraph Cluster2["2. Course Studio Authoring"]
            UC4(["UC4: Create & Order Course Modules"])
            UC5(["UC5: Author Lessons & Guided Networking Labs"])
        end

        subgraph Cluster3["3. Assignments & Rubrics"]
            UC6(["UC6: Create Assignment & JSON Rubric"])
            UC7(["UC7: Auto-Provision GradeItem Column"])
        end

        subgraph Cluster4["4. Submission Grading"]
            UC8(["UC8: Review Submissions & TA Preliminary Notes"])
            UC9(["UC9: Grade Submission via Interactive Rubric"])
            UC10(["UC10: Upsert Student GradeRecord & Notify"])
        end

        subgraph Cluster5["5. Selection-Only Assessment Studio"]
            UC11(["UC11: Create Timed Quiz / Module Exam"])
            UC12(["UC12: Author Selection-Only Questions\n(MC, T/F, Multi-Select, Matching)"])
            UC13(["UC13: Validate Selection-Only Question Type"])
        end

        subgraph Cluster6["6. Gradebook & Analytics"]
            UC14(["UC14: View & Override Weighted Gradebook Matrix"])
            UC15(["UC15: Export Section Gradebook to CSV"])
        end
    end

    Instructor --> UC1 & UC2 & UC3
    Instructor --> UC4 & UC5
    Instructor --> UC6
    UC6 -.->|"include"| UC7
    Instructor --> UC8 & UC9
    UC9 -.->|"include"| UC10
    Instructor --> UC11 & UC12
    UC12 -.->|"include"| UC13
    Instructor --> UC14
    UC15 -.->|"extend"| UC14

    TA -->|"Provides Preliminary Notes"| UC8
    UC3 & UC5 & UC10 -->|"Delivers Content & Grades"| Student
```

---

## B3. Activity Diagram (Curriculum Authoring, Selection-Only Quiz Creation & Rubric Grading)

```mermaid
flowchart TB
    Start([Start: MinSU Instructor Opens Faculty Workspace]) --> SelectTask{"Select Faculty\nWorkflow"}

    SelectTask -->|"Branch A: Author Quiz Question"| OpenQuiz["Open Assessment Studio\nSubmit Question Payload"]
    OpenQuiz --> CheckJWT1["Express Middleware: Verify JWT &\nauthorize('instructor')"]
    CheckJWT1 --> ValidateQType{"Is Question Type in\n[multiple_choice, true_false,\nmultiple_select, matching]?"}
    ValidateQType -->|"No (e.g., fill_in_the_blank)"| RejectQ["Return HTTP 400:\n'Only selection-based question types permitted'"]
    RejectQ --> EndNode([End Workflow])
    ValidateQType -->|"Yes (Valid Selection Type)"| SaveQ["Sequelize: Insert Question Record\ninto questions Table"]
    SaveQ --> ReturnQ["Return HTTP 201 Created &\nRefresh Question Bank UI"]
    ReturnQ --> EndNode

    SelectTask -->|"Branch B: Grade Student Lab Submission"| OpenSub["Open Submissions Queue\nSelect Student Submission & Score JSON Rubric"]
    OpenSub --> CheckJWT2["Express Middleware: Verify JWT &\nauthorize('super_admin', 'academic_admin', 'instructor')"]
    CheckJWT2 --> UpdateSub["Sequelize: Update Submission\n(numericScore, feedback, rubricBreakdown, status='graded')"]
    UpdateSub --> FindGradeItem["Sequelize: Find/Create Linked GradeItem\n(sourceType='assignment', sourceId=assignmentId)"]
    FindGradeItem --> UpsertGradeRecord["Sequelize: Upsert Student GradeRecord\n(score = numericScore, gradedById = instructor.id)"]
    UpsertGradeRecord --> NotifyStudent["Sequelize: Create Student Notification\n('Your assignment has been graded')"]
    NotifyStudent --> RefreshGB["Refresh Weighted Section Gradebook Matrix\n& Enable One-Click CSV Export"]
    RefreshGB --> EndNode
```

---

## B4. Sequence Diagram (Rubric Grading & Automatic Gradebook Synchronization)

```mermaid
sequenceDiagram
    autonumber
    actor Inst as MinSU Instructor
    participant UI as InstructorPages.jsx
    participant MW as auth.middleware.js
    participant Ctrl as assignment.controller.js
    participant DB as Sequelize DB
    participant Notif as Notification Store

    Inst->>UI: Select Rubric Criteria (Total: 96/100) + Enter Feedback & Click Save Grade
    UI->>MW: PUT /api/v1/assignments/submissions/14/grade\nAuthorization: Bearer JWT\nBody: { numericScore: 96, feedback, rubricBreakdown }
    MW->>MW: Verify JWT Signature & Confirm role IN (instructor, academic_admin, super_admin)
    MW->>Ctrl: Forward Authenticated Grading Request (req.user)

    Ctrl->>DB: Submission.findByPk(14, include Assignment)
    DB-->>Ctrl: Return Submission + Parent Assignment (courseId, maxScore)

    Ctrl->>DB: submission.update({ numericScore: 96, feedback, rubricBreakdown, status: graded, gradedById: req.user.id })
    DB-->>Ctrl: Confirm Submission Updated

    Ctrl->>DB: GradeItem.findOrCreate({ courseId, sourceType: assignment, sourceId: assignment.id })
    DB-->>Ctrl: Return Linked GradeItem (id=1, weight=0.30)

    Ctrl->>DB: GradeRecord.upsert({ gradeItemId: 1, studentId, score: 96, gradedById: req.user.id })
    DB-->>Ctrl: Confirm GradeRecord Synchronized

    Ctrl->>Notif: Notification.create({ userId: studentId, title: Assignment Graded, message: You scored 96/100 })
    Notif-->>Ctrl: Notification Persisted

    Ctrl-->>UI: HTTP 200 OK { submission, gradeRecord }
    UI-->>Inst: Display Grade Saved Toast + Update Status Badge to Graded
```

---

## B5. State Machine Diagram (Assignment & Student Submission Grading Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> AssignmentDraft : Instructor Creates Assignment (isPublished = false)

    AssignmentDraft --> AssignmentPublished : Instructor Publishes Assignment\n[Auto-Creates GradeItem Column]

    AssignmentPublished --> SubmissionReceived_OnTime : Student Submits Work\n[submittedAt <= dueDate]
    AssignmentPublished --> SubmissionReceived_Late : Student Submits Work\n[submittedAt > dueDate]

    SubmissionReceived_OnTime --> UnderTAReview : TA Opens Submission Queue
    SubmissionReceived_Late --> UnderTAReview : TA Opens Submission Queue

    UnderTAReview --> ReturnedForRevision : TA / Instructor Flags Issue\n(status = returned)
    SubmissionReceived_OnTime --> ReturnedForRevision : Instructor Requests Revision

    ReturnedForRevision --> SubmissionReceived_OnTime : Student Resubmits Updated Work

    UnderTAReview --> OfficiallyGraded : Instructor Evaluates Rubric & Saves Grade\n[role == instructor AND 0 <= score <= maxScore]
    SubmissionReceived_OnTime --> OfficiallyGraded : Instructor Evaluates Rubric & Saves Grade
    SubmissionReceived_Late --> OfficiallyGraded : Instructor Evaluates Rubric & Saves Grade

    OfficiallyGraded --> SynchronizedInGradebook : Controller Upserts GradeRecord\n& Dispatches Student Notification

    SynchronizedInGradebook --> OfficiallyGraded : Instructor Updates Score / Override
    SynchronizedInGradebook --> [*] : Term Completed & CSV Exported
```

---

## B6. Communication Diagram (Instructor Object Collaboration Network)

```mermaid
flowchart TB
    Inst(["MinSU Instructor"])
    UI["InstructorPagesUI"]
    Ctrl["AssignmentController"]
    AssignM[("AssignmentModel")]
    SubM[("SubmissionModel")]
    GIM[("GradeItemModel")]
    GRM[("GradeRecordModel")]
    NotifM[("NotificationModel")]

    Inst -->|"1: createAssignment(title, rubric)\n2: gradeSubmission(id, score, rubricBreakdown)"| UI
    UI -->|"1.1: POST /api/v1/assignments\n2.1: PUT /api/v1/assignments/submissions/:id/grade"| Ctrl
    Ctrl -->|"1.2: Assignment.create()"| AssignM
    Ctrl -->|"1.3: GradeItem.create(sourceType=assignment)\n2.3: GradeItem.findOne()"| GIM
    Ctrl -->|"2.2: Submission.update(status=graded)"| SubM
    Ctrl -->|"2.4: GradeRecord.upsert(score)"| GRM
    Ctrl -->|"2.5: Notification.create(studentId)"| NotifM
```

---

## B7. Interaction Overview Diagram (End-to-End Semester Instructional Lifecycle)

```mermaid
flowchart TB
    Start([Start Semester Instructional Workflow]) --> SD1

    subgraph SD1["sd: Verify Assigned MinSU Sections & Rosters"]
        S1["Instructor UI -> GET /api/v1/sections & /courses\nExpress -> Returns Assigned BSIT Sections & Student Roster"]
    end

    SD1 --> ForkBar["Parallel Course Preparation Fork"]

    ForkBar --> SD2
    ForkBar --> SD3
    ForkBar --> SD4

    subgraph SD2["sd: Author Modules & Guided Labs"]
        S2["Instructor UI -> POST /courses/:id/modules & /lessons\nDB -> Persists Reading & Packet Tracer Lab Content"]
    end

    subgraph SD3["sd: Build Selection-Only Assessments"]
        S3["Instructor UI -> POST /assessments & /questions\nValidator -> Enforces MC, T/F, Multi-Select, Matching Only"]
    end

    subgraph SD4["sd: Create Assignments & JSON Rubrics"]
        S4["Instructor UI -> POST /api/v1/assignments\nController -> Creates Assignment + Linked GradeItem"]
    end

    SD2 & SD3 & SD4 --> JoinBar["Synchronize Course Readiness"]

    JoinBar --> SD5

    subgraph SD5["sd: Grade Submissions & Sync GradeRecords"]
        S5["Instructor UI -> PUT /assignments/submissions/:id/grade\nController -> Updates Submission + Upserts GradeRecord + Notifies Student"]
    end

    SD5 --> CheckDone{"All Section Submissions\nEvaluated?"}
    CheckDone -->|"Pending Submissions Remain"| SD5
    CheckDone -->|"All Graded"| SD6

    subgraph SD6["sd: Compute Weighted Gradebook & Export CSV"]
        S6["Instructor UI -> GET /api/v1/courses/:id/gradebook\nBrowser -> Generates & Downloads Official Section CSV"]
    end

    SD6 --> EndNode([End Semester Instructional Workflow])
```

---

## B8. Timing Diagram (Assessment Authoring, Rubric Grading & Gradebook Sync SLAs)

```mermaid
flowchart LR
    subgraph Timeline["Instructor Rubric Grading & Gradebook Sync Timeline (0ms to 250ms SLA)"]
        direction LR
        T0["T = 0ms\nInstructor Clicks\nSave Rubric Grade"]
        T20["T = 20ms\nJWT & Faculty RBAC\nVerified"]
        T95["T = 95ms\nSubmission Row Updated\n(status=graded, score)"]
        T165["T = 165ms\nGradeItem Matched &\nGradeRecord Upserted"]
        T200["T = 200ms\nStudent Notification Saved\n& HTTP 200 Returned"]
        T250["T = 250ms\nReact UI Refreshes Badge\n& Weighted Gradebook"]

        T0 -->|"20ms"| T20 -->|"75ms"| T95 -->|"70ms"| T165 -->|"35ms"| T200 -->|"50ms"| T250
    end

    subgraph Lifelines["Lifeline State Summary"]
        L1["FacultyBrowserUI:\nEditingRubric -> AwaitingAPI -> RenderingGradebook"]
        L2["ExpressAuthGuard:\nIdle -> VerifyingJWT -> Authorized"]
        L3["AssignmentController:\nIdle -> UpdatingSubmission -> UpsertingGradeRecord -> Done"]
        L4["DatabaseStorage:\nIdle -> WritingSubmission -> WritingGradeRecord -> Committed"]
    end
```

---

## B9. Requirement Diagram — SysML (Instructor Sub-System Requirements Traceability)

```mermaid
flowchart TB
    subgraph Requirements["SysML Requirements — MinSU Instructor / Faculty Sub-System"]
        R1["Requirement REQ-INST-01\nSelection-Only Question Enforcement\n(MC, T/F, Multi-Select, Matching Only)"]
        R2["Requirement REQ-INST-02\nCourse Studio Module &\nGuided Lab Authoring"]
        R3["Requirement REQ-INST-03\nAutomatic GradeItem Column\nProvisioning on Creation"]
        R4["Requirement REQ-INST-04\nInteractive Rubric Grading &\nGradeRecord Auto-Upsert"]
        R5["Requirement REQ-INST-05\nStrict Faculty RBAC Boundary\n(Blocks TA/Student Final Grading)"]
        R6["Requirement REQ-INST-06\nWeighted Section Gradebook\nCalculation & CSV Export"]
    end

    subgraph Implementation["Implementation Artifacts (Code Modules)"]
        C_Assess["Module: assessment.controller.js\n(ALLOWED_QUESTION_TYPES & Gradebook Engine)"]
        C_Acad["Module: academic.controller.js\n(createModule & createLesson)"]
        C_Assign["Module: assignment.controller.js\n(createAssignment & gradeSubmission)"]
        C_Auth["Module: auth.middleware.js\n(authenticate & authorize)"]
        C_UI["Module: InstructorPages.jsx\n(Course Studio, Rubric Grader & CSV Exporter)"]
    end

    subgraph Verification["Verification Artifacts (Test Suites)"]
        T_API["Test Suite: server/tests/api.test.js\n(Jest + Supertest Integration Tests)"]
        T_UI["Test Suite: client/src/test/App.test.jsx\n(Vitest Frontend Suite)"]
    end

    C_Assess -->|"satisfy"| R1 & R3 & R6
    C_Acad -->|"satisfy"| R2
    C_Assign -->|"satisfy"| R3 & R4
    C_Auth -->|"satisfy"| R5
    C_UI -->|"satisfy"| R2 & R4 & R6

    T_API -->|"verify"| R1 & R3 & R4 & R5 & R6
    T_UI -->|"verify"| R2 & R6
```

---

*Document prepared for: Mindoro State University (MinSU) — College of Computer Studies*
*System: MinSU E-Learn & Networking Academy — Instructor / Faculty Sub-System*
*Campuses: Bongabong | Main (Victoria) | Calapan City*
