-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "display_name" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_sessions" (
    "id" UUID NOT NULL,
    "short_id" VARCHAR(12) NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "initial_lat" DECIMAL(10,8) NOT NULL,
    "initial_lng" DECIMAL(11,8) NOT NULL,
    "last_lat" DECIMAL(10,8) NOT NULL,
    "last_lng" DECIMAL(11,8) NOT NULL,
    "platform" VARCHAR(20),
    "device_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "sos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_locations" (
    "id" BIGSERIAL NOT NULL,
    "sos_session_id" UUID NOT NULL,
    "lat" DECIMAL(10,8) NOT NULL,
    "lng" DECIMAL(11,8) NOT NULL,
    "accuracy" DECIMAL(6,2),
    "altitude" DECIMAL(8,2),
    "speed" DECIMAL(6,2),
    "heading" DECIMAL(5,2),
    "battery_level" INTEGER,
    "is_moving" BOOLEAN,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_media" (
    "id" UUID NOT NULL,
    "sos_session_id" UUID NOT NULL,
    "media_type" VARCHAR(20) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size_bytes" BIGINT,
    "duration_seconds" INTEGER,
    "mime_type" VARCHAR(50),
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "lat" DECIMAL(10,8),
    "lng" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_viewers" (
    "id" BIGSERIAL NOT NULL,
    "sos_session_id" UUID NOT NULL,
    "viewer_identifier" VARCHAR(100) NOT NULL,
    "viewer_type" VARCHAR(20) NOT NULL DEFAULT 'contact',
    "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sos_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "users_phone_number_idx" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "sos_sessions_short_id_key" ON "sos_sessions"("short_id");

-- CreateIndex
CREATE INDEX "sos_sessions_short_id_idx" ON "sos_sessions"("short_id");

-- CreateIndex
CREATE INDEX "sos_sessions_user_id_idx" ON "sos_sessions"("user_id");

-- CreateIndex
CREATE INDEX "sos_sessions_status_idx" ON "sos_sessions"("status");

-- CreateIndex
CREATE INDEX "sos_sessions_expires_at_idx" ON "sos_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sos_locations_sos_session_id_idx" ON "sos_locations"("sos_session_id");

-- CreateIndex
CREATE INDEX "sos_locations_sos_session_id_timestamp_idx" ON "sos_locations"("sos_session_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "sos_media_sos_session_id_idx" ON "sos_media"("sos_session_id");

-- CreateIndex
CREATE INDEX "sos_media_media_type_idx" ON "sos_media"("media_type");

-- CreateIndex
CREATE INDEX "sos_viewers_sos_session_id_idx" ON "sos_viewers"("sos_session_id");

-- CreateIndex
CREATE INDEX "sos_viewers_viewer_identifier_idx" ON "sos_viewers"("viewer_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "sos_viewers_sos_session_id_viewer_identifier_key" ON "sos_viewers"("sos_session_id", "viewer_identifier");

-- AddForeignKey
ALTER TABLE "sos_sessions" ADD CONSTRAINT "sos_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_locations" ADD CONSTRAINT "sos_locations_sos_session_id_fkey" FOREIGN KEY ("sos_session_id") REFERENCES "sos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_media" ADD CONSTRAINT "sos_media_sos_session_id_fkey" FOREIGN KEY ("sos_session_id") REFERENCES "sos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_viewers" ADD CONSTRAINT "sos_viewers_sos_session_id_fkey" FOREIGN KEY ("sos_session_id") REFERENCES "sos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
