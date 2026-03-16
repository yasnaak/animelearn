import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

// === ENUMS ===

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'analyzing',
  'planned',
  'generating',
  'completed',
  'failed',
]);

export const episodeStatusEnum = pgEnum('episode_status', [
  'planned',
  'script',
  'visuals',
  'audio',
  'composing',
  'ready',
  'failed',
]);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'creator',
  'pro',
]);

export const sourceTypeEnum = pgEnum('source_type', ['pdf', 'youtube', 'text', 'idea', 'url']);

// === BETTER AUTH TABLES ===

export const authUsers = pgTable('auth_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const authSessions = pgTable('auth_session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
});

export const authAccounts = pgTable('auth_account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const authVerifications = pgTable('auth_verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// === APP TABLES ===

export const appProfiles = pgTable(
  'app_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authUserId: text('auth_user_id')
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    tier: subscriptionTierEnum('tier').notNull().default('free'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    episodesUsedThisMonth: integer('episodes_used_this_month')
      .notNull()
      .default(0),
    extraCredits: integer('extra_credits').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('app_profiles_auth_user_id_idx').on(table.authUserId)],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: projectStatusEnum('status').notNull().default('draft'),
    sourceType: sourceTypeEnum('source_type').notNull(),
    sourceUrl: text('source_url'),
    rawContent: text('raw_content'),
    contentAnalysis: jsonb('content_analysis'),
    seriesPlan: jsonb('series_plan'),
    style: text('style').notNull().default('clean_modern'),
    language: text('language').notNull().default('es'),
    targetDurationMinutes: integer('target_duration_minutes').notNull().default(5),
    totalEpisodes: integer('total_episodes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('projects_user_id_idx').on(table.userId)],
);

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: text('role').notNull(),
    visualDescription: text('visual_description').notNull(),
    signatureFeatures: jsonb('signature_features').$type<string[]>(),
    characterSheetUrl: text('character_sheet_url'),
    voiceId: text('voice_id'),
    personality: jsonb('personality'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('characters_project_id_idx').on(table.projectId)],
);

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    locationId: text('location_id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    keyFeatures: jsonb('key_features').$type<string[]>(),
    referenceImageUrl: text('reference_image_url'),
    referencePrompt: text('reference_prompt'),
    colorPalette: jsonb('color_palette').$type<string[]>(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('locations_project_id_idx').on(table.projectId)],
);

export const episodes = pgTable(
  'episodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    episodeNumber: integer('episode_number').notNull(),
    title: text('title').notNull(),
    status: episodeStatusEnum('status').notNull().default('planned'),
    synopsis: text('synopsis'),
    script: jsonb('script'),
    screenplay: jsonb('screenplay'),
    visualPrompts: jsonb('visual_prompts'),
    audioDirection: jsonb('audio_direction'),
    videoUrl: text('video_url'),
    subtitlesUrl: text('subtitles_url'),
    thumbnailUrl: text('thumbnail_url'),
    durationSeconds: integer('duration_seconds'),
    youtubeMetadata: jsonb('youtube_metadata'),
    isPublic: boolean('is_public').notNull().default(false),
    publicSlug: text('public_slug').unique(),
    generationStartedAt: timestamp('generation_started_at'),
    generationCompletedAt: timestamp('generation_completed_at'),
    generationError: text('generation_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('episodes_project_id_idx').on(table.projectId),
    index('episodes_public_slug_idx').on(table.publicSlug),
  ],
);

export const panels = pgTable(
  'panels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    episodeId: uuid('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    sceneId: text('scene_id').notNull(),
    panelId: text('panel_id').notNull(),
    panelOrder: integer('panel_order').notNull(),
    backgroundImageUrl: text('background_image_url'),
    characterLayerUrl: text('character_layer_url'),
    effectLayerUrl: text('effect_layer_url'),
    videoUrl: text('video_url'),
    compositeImageUrl: text('composite_image_url'),
    prompt: jsonb('prompt'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('panels_episode_id_idx').on(table.episodeId)],
);

export const shots = pgTable(
  'shots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    episodeId: uuid('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    sceneId: text('scene_id').notNull(),
    shotId: text('shot_id').notNull(),
    shotOrder: integer('shot_order').notNull(),
    shotType: text('shot_type').notNull(),
    referenceImageUrl: text('reference_image_url'),
    videoUrl: text('video_url'),
    locationRefUrl: text('location_ref_url'),
    characterRefUrls: jsonb('character_ref_urls').$type<Record<string, string>>(),
    durationSeconds: integer('duration_seconds').notNull().default(5),
    prompt: jsonb('prompt'),
    videoPrompt: jsonb('video_prompt'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('shots_episode_id_idx').on(table.episodeId)],
);

export const audioTracks = pgTable(
  'audio_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    episodeId: uuid('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    trackType: text('track_type').notNull(),
    characterId: uuid('character_id').references(() => characters.id, {
      onDelete: 'set null',
    }),
    audioUrl: text('audio_url').notNull(),
    durationMs: integer('duration_ms').notNull(),
    panelId: text('panel_id'),
    shotId: text('shot_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('audio_tracks_episode_id_idx').on(table.episodeId)],
);

export const generationJobs = pgTable(
  'generation_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    episodeId: uuid('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    inngestRunId: text('inngest_run_id'),
    currentStep: text('current_step'),
    progress: integer('progress').notNull().default(0),
    stepsCompleted: jsonb('steps_completed'),
    costCents: integer('cost_cents').notNull().default(0),
    error: text('error'),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [index('generation_jobs_episode_id_idx').on(table.episodeId)],
);

