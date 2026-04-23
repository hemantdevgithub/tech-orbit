
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/edge.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.SubmissionScalarFieldEnum = {
  id: 'id',
  requirementId: 'requirementId',
  candidateId: 'candidateId',
  submittedByUserId: 'submittedByUserId',
  submitterRole: 'submitterRole',
  attributedSrmId: 'attributedSrmId',
  attributedMsmeId: 'attributedMsmeId',
  status: 'status',
  matchScore: 'matchScore',
  coverNote: 'coverNote',
  proposedBillRate: 'proposedBillRate',
  withdrawnAt: 'withdrawnAt',
  withdrawnReason: 'withdrawnReason',
  rejectedAt: 'rejectedAt',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MatchingSignalScalarFieldEnum = {
  id: 'id',
  requirementId: 'requirementId',
  candidateId: 'candidateId',
  skillOverlap: 'skillOverlap',
  seniorityMatch: 'seniorityMatch',
  locationMatch: 'locationMatch',
  workAuthMatch: 'workAuthMatch',
  candidateRating: 'candidateRating',
  matchScore: 'matchScore',
  computedAt: 'computedAt'
};

exports.Prisma.ProcessedEventScalarFieldEnum = {
  eventId: 'eventId',
  eventType: 'eventType',
  processedAt: 'processedAt'
};

exports.Prisma.OutgoingEventScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  aggregateId: 'aggregateId',
  payload: 'payload',
  status: 'status',
  attempts: 'attempts',
  lastError: 'lastError',
  createdAt: 'createdAt',
  sentAt: 'sentAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.SubmitterRole = exports.$Enums.SubmitterRole = {
  CANDIDATE_SELF: 'CANDIDATE_SELF',
  SRM: 'SRM',
  MSME: 'MSME'
};

exports.SubmissionStatus = exports.$Enums.SubmissionStatus = {
  SUBMITTED: 'SUBMITTED',
  SCREENING: 'SCREENING',
  INTERVIEWING: 'INTERVIEWING',
  OFFER: 'OFFER',
  PLACED: 'PLACED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN'
};

exports.OutgoingEventStatus = exports.$Enums.OutgoingEventStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED'
};

exports.Prisma.ModelName = {
  Submission: 'Submission',
  MatchingSignal: 'MatchingSignal',
  ProcessedEvent: 'ProcessedEvent',
  OutgoingEvent: 'OutgoingEvent'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/Users/hemant/techorbit/services/matching/src/generated/client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "darwin-arm64",
        "native": true
      }
    ],
    "previewFeatures": [
      "multiSchema"
    ],
    "sourceFilePath": "/Users/hemant/techorbit/services/matching/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null
  },
  "relativePath": "../../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider        = \"prisma-client-js\"\n  output          = \"../src/generated/client\"\n  previewFeatures = [\"multiSchema\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n  schemas  = [\"matching\"]\n}\n\nmodel Submission {\n  id                String           @id @default(uuid())\n  // No DB-level FK: requirement-svc and profile-svc own their data in separate\n  // schemas/services. Integrity enforced at the service layer.\n  requirementId     String           @map(\"requirement_id\")\n  candidateId       String           @map(\"candidate_id\")\n  submittedByUserId String           @map(\"submitted_by_user_id\")\n  submitterRole     SubmitterRole    @map(\"submitter_role\")\n  attributedSrmId   String?          @map(\"attributed_srm_id\")\n  attributedMsmeId  String?          @map(\"attributed_msme_id\")\n  status            SubmissionStatus @default(SUBMITTED)\n  matchScore        Int?             @map(\"match_score\")\n  coverNote         String?          @map(\"cover_note\") @db.Text\n  proposedBillRate  Decimal?         @map(\"proposed_bill_rate\") @db.Decimal(10, 2)\n  withdrawnAt       DateTime?        @map(\"withdrawn_at\")\n  withdrawnReason   String?          @map(\"withdrawn_reason\")\n  rejectedAt        DateTime?        @map(\"rejected_at\")\n  rejectionReason   String?          @map(\"rejection_reason\")\n  createdAt         DateTime         @default(now()) @map(\"created_at\")\n  updatedAt         DateTime         @updatedAt @map(\"updated_at\")\n\n  @@unique([requirementId, candidateId])\n  @@index([status, createdAt])\n  @@index([requirementId, status])\n  @@index([candidateId])\n  @@index([attributedSrmId])\n  @@index([attributedMsmeId])\n  @@map(\"submission\")\n  @@schema(\"matching\")\n}\n\nmodel MatchingSignal {\n  id              String   @id @default(uuid())\n  requirementId   String   @map(\"requirement_id\")\n  candidateId     String   @map(\"candidate_id\")\n  skillOverlap    Int      @map(\"skill_overlap\")\n  seniorityMatch  Boolean  @map(\"seniority_match\")\n  locationMatch   Boolean  @map(\"location_match\")\n  workAuthMatch   Boolean  @map(\"work_auth_match\")\n  candidateRating Decimal  @map(\"candidate_rating\") @db.Decimal(3, 2)\n  matchScore      Int      @map(\"match_score\")\n  computedAt      DateTime @default(now()) @map(\"computed_at\")\n\n  @@unique([requirementId, candidateId])\n  @@index([requirementId, matchScore])\n  @@index([candidateId])\n  @@map(\"matching_signal\")\n  @@schema(\"matching\")\n}\n\n// Idempotency guard for event consumers: the first time we see an eventId,\n// we write a row; a duplicate delivery fails the unique constraint and the\n// handler can skip safely.\nmodel ProcessedEvent {\n  eventId     String   @id @map(\"event_id\")\n  eventType   String   @map(\"event_type\")\n  processedAt DateTime @default(now()) @map(\"processed_at\")\n\n  @@map(\"processed_event\")\n  @@schema(\"matching\")\n}\n\nmodel OutgoingEvent {\n  id          String              @id @default(uuid())\n  eventType   String              @map(\"event_type\")\n  aggregateId String              @map(\"aggregate_id\")\n  payload     Json\n  status      OutgoingEventStatus @default(PENDING)\n  attempts    Int                 @default(0)\n  lastError   String?             @map(\"last_error\")\n  createdAt   DateTime            @default(now()) @map(\"created_at\")\n  sentAt      DateTime?           @map(\"sent_at\")\n\n  @@index([status, createdAt])\n  @@map(\"outgoing_event\")\n  @@schema(\"matching\")\n}\n\nenum SubmitterRole {\n  CANDIDATE_SELF\n  SRM\n  MSME\n\n  @@schema(\"matching\")\n}\n\nenum SubmissionStatus {\n  SUBMITTED\n  SCREENING\n  INTERVIEWING\n  OFFER\n  PLACED\n  REJECTED\n  WITHDRAWN\n\n  @@schema(\"matching\")\n}\n\nenum OutgoingEventStatus {\n  PENDING\n  SENT\n  FAILED\n\n  @@schema(\"matching\")\n}\n",
  "inlineSchemaHash": "9b265bdff626e1bd8bef120b262d280ed368d163e609c088dcef81df1b52a1aa",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"Submission\":{\"dbName\":\"submission\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"requirementId\",\"dbName\":\"requirement_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"candidateId\",\"dbName\":\"candidate_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"submittedByUserId\",\"dbName\":\"submitted_by_user_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"submitterRole\",\"dbName\":\"submitter_role\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SubmitterRole\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"attributedSrmId\",\"dbName\":\"attributed_srm_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"attributedMsmeId\",\"dbName\":\"attributed_msme_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"SubmissionStatus\",\"default\":\"SUBMITTED\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"matchScore\",\"dbName\":\"match_score\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"coverNote\",\"dbName\":\"cover_note\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"proposedBillRate\",\"dbName\":\"proposed_bill_rate\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"withdrawnAt\",\"dbName\":\"withdrawn_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"withdrawnReason\",\"dbName\":\"withdrawn_reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rejectedAt\",\"dbName\":\"rejected_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rejectionReason\",\"dbName\":\"rejection_reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueFields\":[[\"requirementId\",\"candidateId\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"requirementId\",\"candidateId\"]}],\"isGenerated\":false},\"MatchingSignal\":{\"dbName\":\"matching_signal\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"requirementId\",\"dbName\":\"requirement_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"candidateId\",\"dbName\":\"candidate_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"skillOverlap\",\"dbName\":\"skill_overlap\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"seniorityMatch\",\"dbName\":\"seniority_match\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Boolean\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"locationMatch\",\"dbName\":\"location_match\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Boolean\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"workAuthMatch\",\"dbName\":\"work_auth_match\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Boolean\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"candidateRating\",\"dbName\":\"candidate_rating\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"matchScore\",\"dbName\":\"match_score\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"computedAt\",\"dbName\":\"computed_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"requirementId\",\"candidateId\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"requirementId\",\"candidateId\"]}],\"isGenerated\":false},\"ProcessedEvent\":{\"dbName\":\"processed_event\",\"fields\":[{\"name\":\"eventId\",\"dbName\":\"event_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"eventType\",\"dbName\":\"event_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"processedAt\",\"dbName\":\"processed_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"OutgoingEvent\":{\"dbName\":\"outgoing_event\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"eventType\",\"dbName\":\"event_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"aggregateId\",\"dbName\":\"aggregate_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"payload\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"OutgoingEventStatus\",\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"attempts\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"lastError\",\"dbName\":\"last_error\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sentAt\",\"dbName\":\"sent_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"SubmitterRole\":{\"values\":[{\"name\":\"CANDIDATE_SELF\",\"dbName\":null},{\"name\":\"SRM\",\"dbName\":null},{\"name\":\"MSME\",\"dbName\":null}],\"dbName\":null},\"SubmissionStatus\":{\"values\":[{\"name\":\"SUBMITTED\",\"dbName\":null},{\"name\":\"SCREENING\",\"dbName\":null},{\"name\":\"INTERVIEWING\",\"dbName\":null},{\"name\":\"OFFER\",\"dbName\":null},{\"name\":\"PLACED\",\"dbName\":null},{\"name\":\"REJECTED\",\"dbName\":null},{\"name\":\"WITHDRAWN\",\"dbName\":null}],\"dbName\":null},\"OutgoingEventStatus\":{\"values\":[{\"name\":\"PENDING\",\"dbName\":null},{\"name\":\"SENT\",\"dbName\":null},{\"name\":\"FAILED\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

