# Product Process

**Single source of truth:** `docs/product/stories.json`.  
Edit on web or mobile. Pushing updates auto-(re)creates Epics & Stories via **Actions → Seed Epics & Stories**.

- Labels sync: edit `.github/labels.yml`
- Issue templates: use **New issue → Epic/User Story**
- Optional Projects (beta): set two repo-level **Variables**:
  - `PROJECT_ORG` = your org or username (e.g., `jbandu`)
  - `PROJECT_NUMBER` = project number (open the project, URL ends with `/projects/<number>`)

**Traceability**
- Each Story links to its Epic in the body.
- PRs should include `Closes #<story-id>`.
