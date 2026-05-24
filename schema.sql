


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."ContestStatus" AS ENUM (
    'UPCOMING',
    'ACTIVE',
    'ENDED'
);


ALTER TYPE "public"."ContestStatus" OWNER TO "postgres";


CREATE TYPE "public"."Difficulty" AS ENUM (
    'EASY',
    'MEDIUM',
    'HARD'
);


ALTER TYPE "public"."Difficulty" OWNER TO "postgres";


CREATE TYPE "public"."Role" AS ENUM (
    'ADMIN',
    'TEACHER',
    'STUDENT'
);


ALTER TYPE "public"."Role" OWNER TO "postgres";


CREATE TYPE "public"."SubmissionStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'WRONG_ANSWER',
    'TIME_LIMIT_EXCEEDED',
    'MEMORY_LIMIT_EXCEEDED',
    'RUNTIME_ERROR',
    'COMPILATION_ERROR'
);


ALTER TYPE "public"."SubmissionStatus" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."contest_participants" (
    "contestId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "rank" integer,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."contest_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contest_problems" (
    "contestId" "text" NOT NULL,
    "problemId" "text" NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "pointOverride" integer
);


ALTER TABLE "public"."contest_problems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contests" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone NOT NULL,
    "isPublic" boolean DEFAULT true NOT NULL,
    "rules" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" "text" NOT NULL
);


ALTER TABLE "public"."contests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."problem_tags" (
    "problemId" "text" NOT NULL,
    "tagId" "text" NOT NULL
);


ALTER TABLE "public"."problem_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."problems" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" NOT NULL,
    "difficulty" "public"."Difficulty" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "timeLimit" integer DEFAULT 2000 NOT NULL,
    "memoryLimit" integer DEFAULT 256 NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "testCases" "jsonb" NOT NULL,
    "starterCode" "jsonb" NOT NULL,
    "constraints" "text",
    "examples" "jsonb",
    "hints" "jsonb",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" "text" NOT NULL
);


ALTER TABLE "public"."problems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "text" NOT NULL,
    "code" "text" NOT NULL,
    "language" "text" NOT NULL,
    "status" "public"."SubmissionStatus" DEFAULT 'PENDING'::"public"."SubmissionStatus" NOT NULL,
    "runtimeMs" integer,
    "memoryKb" integer,
    "testResults" "jsonb",
    "errorMsg" "text",
    "pointsAwarded" integer DEFAULT 0 NOT NULL,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" "text" NOT NULL,
    "problemId" "text" NOT NULL,
    "contestId" "text"
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "color" "text" DEFAULT '#6366f1'::"text" NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."universities" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "logoUrl" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."universities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "passwordHash" "text" NOT NULL,
    "role" "public"."Role" DEFAULT 'STUDENT'::"public"."Role" NOT NULL,
    "totalPoints" integer DEFAULT 0 NOT NULL,
    "avatarUrl" "text",
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "universityId" "text" NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."contest_participants"
    ADD CONSTRAINT "contest_participants_pkey" PRIMARY KEY ("contestId", "userId");



ALTER TABLE ONLY "public"."contest_problems"
    ADD CONSTRAINT "contest_problems_pkey" PRIMARY KEY ("contestId", "problemId");



ALTER TABLE ONLY "public"."contests"
    ADD CONSTRAINT "contests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."problem_tags"
    ADD CONSTRAINT "problem_tags_pkey" PRIMARY KEY ("problemId", "tagId");



ALTER TABLE ONLY "public"."problems"
    ADD CONSTRAINT "problems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."universities"
    ADD CONSTRAINT "universities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "contests_endsAt_idx" ON "public"."contests" USING "btree" ("endsAt");



CREATE INDEX "contests_startsAt_idx" ON "public"."contests" USING "btree" ("startsAt");



CREATE INDEX "problems_createdById_idx" ON "public"."problems" USING "btree" ("createdById");



CREATE INDEX "problems_difficulty_idx" ON "public"."problems" USING "btree" ("difficulty");



CREATE UNIQUE INDEX "problems_slug_key" ON "public"."problems" USING "btree" ("slug");



CREATE INDEX "submissions_problemId_idx" ON "public"."submissions" USING "btree" ("problemId");



CREATE INDEX "submissions_status_idx" ON "public"."submissions" USING "btree" ("status");



CREATE INDEX "submissions_submittedAt_idx" ON "public"."submissions" USING "btree" ("submittedAt");



CREATE INDEX "submissions_userId_idx" ON "public"."submissions" USING "btree" ("userId");



CREATE UNIQUE INDEX "tags_name_key" ON "public"."tags" USING "btree" ("name");



CREATE UNIQUE INDEX "universities_domain_key" ON "public"."universities" USING "btree" ("domain");



CREATE UNIQUE INDEX "users_email_key" ON "public"."users" USING "btree" ("email");



CREATE INDEX "users_totalPoints_idx" ON "public"."users" USING "btree" ("totalPoints");



CREATE INDEX "users_universityId_idx" ON "public"."users" USING "btree" ("universityId");



ALTER TABLE ONLY "public"."contest_participants"
    ADD CONSTRAINT "contest_participants_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "public"."contests"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contest_participants"
    ADD CONSTRAINT "contest_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contest_problems"
    ADD CONSTRAINT "contest_problems_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "public"."contests"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contest_problems"
    ADD CONSTRAINT "contest_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."problems"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contests"
    ADD CONSTRAINT "contests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."problem_tags"
    ADD CONSTRAINT "problem_tags_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."problems"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."problem_tags"
    ADD CONSTRAINT "problem_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."problems"
    ADD CONSTRAINT "problems_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "public"."contests"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."problems"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "public"."universities"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."contest_participants" TO "anon";
GRANT ALL ON TABLE "public"."contest_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."contest_participants" TO "service_role";



GRANT ALL ON TABLE "public"."contest_problems" TO "anon";
GRANT ALL ON TABLE "public"."contest_problems" TO "authenticated";
GRANT ALL ON TABLE "public"."contest_problems" TO "service_role";



GRANT ALL ON TABLE "public"."contests" TO "anon";
GRANT ALL ON TABLE "public"."contests" TO "authenticated";
GRANT ALL ON TABLE "public"."contests" TO "service_role";



GRANT ALL ON TABLE "public"."problem_tags" TO "anon";
GRANT ALL ON TABLE "public"."problem_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."problem_tags" TO "service_role";



GRANT ALL ON TABLE "public"."problems" TO "anon";
GRANT ALL ON TABLE "public"."problems" TO "authenticated";
GRANT ALL ON TABLE "public"."problems" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."universities" TO "anon";
GRANT ALL ON TABLE "public"."universities" TO "authenticated";
GRANT ALL ON TABLE "public"."universities" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







