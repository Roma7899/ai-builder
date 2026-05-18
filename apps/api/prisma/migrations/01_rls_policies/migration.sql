-- Enable Row-Level Security on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GenerationJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublishDeployment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Domain" ENABLE ROW LEVEL SECURITY;

-- User: users can only read/update their own row
CREATE POLICY user_isolation ON "User"
  FOR ALL
  USING (id = current_setting('app.current_user_id')::text)
  WITH CHECK (id = current_setting('app.current_user_id')::text);

-- Bypass for registration (new users don't have an ID yet)
CREATE POLICY user_registration ON "User"
  FOR INSERT
  WITH CHECK (true);

-- Project: users can only access their own projects
CREATE POLICY project_isolation ON "Project"
  FOR ALL
  USING ("userId" = current_setting('app.current_user_id')::text)
  WITH CHECK ("userId" = current_setting('app.current_user_id')::text);

-- GenerationJob: users can only access jobs on their own projects
CREATE POLICY genjob_isolation ON "GenerationJob"
  FOR ALL
  USING (
    "userId" = current_setting('app.current_user_id')::text
    OR EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "GenerationJob"."projectId"
        AND p."userId" = current_setting('app.current_user_id')::text
    )
  )
  WITH CHECK (
    "userId" = current_setting('app.current_user_id')::text
  );

-- SiteVersion: users can only access versions of their own projects
CREATE POLICY siteversion_isolation ON "SiteVersion"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "SiteVersion"."projectId"
        AND p."userId" = current_setting('app.current_user_id')::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "SiteVersion"."projectId"
        AND p."userId" = current_setting('app.current_user_id')::text
    )
  );

-- PublishDeployment: users can only access deployments of their own projects
CREATE POLICY publish_isolation ON "PublishDeployment"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "PublishDeployment"."projectId"
        AND p."userId" = current_setting('app.current_user_id')::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "PublishDeployment"."projectId"
        AND p."userId" = current_setting('app.current_user_id')::text
    )
  );

-- Domain: users can only access domains of their own projects
CREATE POLICY domain_isolation ON "Domain"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "Domain"."projectId"
        AND p."userId" = current_setting('app.current_user_id')::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p."id" = "Domain"."projectId"
        AND p."userId" = current_setting('app.current_user_id')::text
    )
  );
