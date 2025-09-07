

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



CREATE OR REPLACE FUNCTION "public"."add_creator_as_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Add the creator as an admin member
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (family_id, user_id) DO NOTHING;
  
  -- Update the user's profile with the family_id
  UPDATE public.profiles
  SET family_id = NEW.id
  WHERE id = NEW.created_by;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_creator_as_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "invite_token" "uuid" DEFAULT "gen_random_uuid"(),
    "used" boolean DEFAULT false,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."family_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "family_members_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying])::"text"[])))
);


ALTER TABLE "public"."family_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photo_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "tagged_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."photo_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tag_count" integer DEFAULT 0,
    "family_id" "uuid"
);


ALTER TABLE "public"."photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" character varying(15) NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "family_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "tagged_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tag_links" OWNER TO "postgres";


ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_invitations"
    ADD CONSTRAINT "family_invitations_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."family_invitations"
    ADD CONSTRAINT "family_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_id_user_id_key" UNIQUE ("family_id", "user_id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photo_tags"
    ADD CONSTRAINT "photo_tags_photo_id_tagged_user_id_key" UNIQUE ("photo_id", "tagged_user_id");



ALTER TABLE ONLY "public"."photo_tags"
    ADD CONSTRAINT "photo_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."tag_links"
    ADD CONSTRAINT "tag_links_photo_id_tagged_user_id_key" UNIQUE ("photo_id", "tagged_user_id");



ALTER TABLE ONLY "public"."tag_links"
    ADD CONSTRAINT "tag_links_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_family_invitations_family" ON "public"."family_invitations" USING "btree" ("family_id");



CREATE INDEX "idx_family_invitations_token" ON "public"."family_invitations" USING "btree" ("invite_token");



CREATE INDEX "idx_family_members_family" ON "public"."family_members" USING "btree" ("family_id");



CREATE INDEX "idx_family_members_user" ON "public"."family_members" USING "btree" ("user_id");



CREATE INDEX "idx_photo_tags_photo" ON "public"."photo_tags" USING "btree" ("photo_id");



CREATE INDEX "idx_photo_tags_user" ON "public"."photo_tags" USING "btree" ("tagged_user_id");



CREATE INDEX "idx_photos_created" ON "public"."photos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_photos_family" ON "public"."photos" USING "btree" ("family_id");



CREATE INDEX "idx_photos_user" ON "public"."photos" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_family" ON "public"."profiles" USING "btree" ("family_id");



CREATE INDEX "idx_tag_links_photo" ON "public"."tag_links" USING "btree" ("photo_id");



CREATE INDEX "idx_tag_links_user" ON "public"."tag_links" USING "btree" ("tagged_user_id");



CREATE OR REPLACE TRIGGER "on_family_created" AFTER INSERT ON "public"."families" FOR EACH ROW EXECUTE FUNCTION "public"."add_creator_as_admin"();



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_invitations"
    ADD CONSTRAINT "family_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_invitations"
    ADD CONSTRAINT "family_invitations_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_tags"
    ADD CONSTRAINT "photo_tags_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_tags"
    ADD CONSTRAINT "photo_tags_tagged_user_id_fkey" FOREIGN KEY ("tagged_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tag_links"
    ADD CONSTRAINT "tag_links_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tag_links"
    ADD CONSTRAINT "tag_links_tagged_user_id_fkey" FOREIGN KEY ("tagged_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage invitations" ON "public"."family_invitations" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."family_members"
  WHERE (("family_members"."family_id" = "family_invitations"."family_id") AND ("family_members"."user_id" = "auth"."uid"()) AND (("family_members"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Admins can update invitations" ON "public"."family_invitations" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."family_members"
  WHERE (("family_members"."family_id" = "family_invitations"."family_id") AND ("family_members"."user_id" = "auth"."uid"()) AND (("family_members"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Admins can update their families" ON "public"."families" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."family_members"
  WHERE (("family_members"."family_id" = "families"."id") AND ("family_members"."user_id" = "auth"."uid"()) AND (("family_members"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Anyone can view family members" ON "public"."family_members" FOR SELECT USING (true);



CREATE POLICY "Anyone can view invitation by token" ON "public"."family_invitations" FOR SELECT USING (true);



CREATE POLICY "Photo owners can manage tag links" ON "public"."tag_links" USING ((EXISTS ( SELECT 1
   FROM "public"."photos"
  WHERE (("photos"."id" = "tag_links"."photo_id") AND ("photos"."user_id" = "auth"."uid"())))));



CREATE POLICY "Photo owners can manage tags" ON "public"."photo_tags" USING ((EXISTS ( SELECT 1
   FROM "public"."photos"
  WHERE (("photos"."id" = "photo_tags"."photo_id") AND ("photos"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create families" ON "public"."families" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete own membership" ON "public"."family_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own photos" ON "public"."photos" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own membership" ON "public"."family_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own membership" ON "public"."family_members" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own photos" ON "public"."photos" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can upload their own photos" ON "public"."photos" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view all tag links" ON "public"."tag_links" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view all tags" ON "public"."photo_tags" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view family photos" ON "public"."photos" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p1",
    "public"."profiles" "p2"
  WHERE (("p1"."id" = "auth"."uid"()) AND ("p2"."id" = "photos"."user_id") AND ("p1"."family_id" IS NOT NULL) AND ("p1"."family_id" = "p2"."family_id")))))));



CREATE POLICY "Users can view their own families" ON "public"."families" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."family_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."family_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photo_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tag_links" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_creator_as_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_creator_as_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_creator_as_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";



GRANT ALL ON TABLE "public"."family_invitations" TO "anon";
GRANT ALL ON TABLE "public"."family_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."family_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."family_members" TO "anon";
GRANT ALL ON TABLE "public"."family_members" TO "authenticated";
GRANT ALL ON TABLE "public"."family_members" TO "service_role";



GRANT ALL ON TABLE "public"."photo_tags" TO "anon";
GRANT ALL ON TABLE "public"."photo_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."photo_tags" TO "service_role";



GRANT ALL ON TABLE "public"."photos" TO "anon";
GRANT ALL ON TABLE "public"."photos" TO "authenticated";
GRANT ALL ON TABLE "public"."photos" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tag_links" TO "anon";
GRANT ALL ON TABLE "public"."tag_links" TO "authenticated";
GRANT ALL ON TABLE "public"."tag_links" TO "service_role";



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






RESET ALL;
