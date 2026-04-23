
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Submission
 * 
 */
export type Submission = $Result.DefaultSelection<Prisma.$SubmissionPayload>
/**
 * Model MatchingSignal
 * 
 */
export type MatchingSignal = $Result.DefaultSelection<Prisma.$MatchingSignalPayload>
/**
 * Model ProcessedEvent
 * 
 */
export type ProcessedEvent = $Result.DefaultSelection<Prisma.$ProcessedEventPayload>
/**
 * Model OutgoingEvent
 * 
 */
export type OutgoingEvent = $Result.DefaultSelection<Prisma.$OutgoingEventPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const SubmitterRole: {
  CANDIDATE_SELF: 'CANDIDATE_SELF',
  SRM: 'SRM',
  MSME: 'MSME'
};

export type SubmitterRole = (typeof SubmitterRole)[keyof typeof SubmitterRole]


export const SubmissionStatus: {
  SUBMITTED: 'SUBMITTED',
  SCREENING: 'SCREENING',
  INTERVIEWING: 'INTERVIEWING',
  OFFER: 'OFFER',
  PLACED: 'PLACED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN'
};

export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus]


export const OutgoingEventStatus: {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED'
};

export type OutgoingEventStatus = (typeof OutgoingEventStatus)[keyof typeof OutgoingEventStatus]

}

export type SubmitterRole = $Enums.SubmitterRole

export const SubmitterRole: typeof $Enums.SubmitterRole

export type SubmissionStatus = $Enums.SubmissionStatus

export const SubmissionStatus: typeof $Enums.SubmissionStatus

export type OutgoingEventStatus = $Enums.OutgoingEventStatus

export const OutgoingEventStatus: typeof $Enums.OutgoingEventStatus

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Submissions
 * const submissions = await prisma.submission.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Submissions
   * const submissions = await prisma.submission.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.submission`: Exposes CRUD operations for the **Submission** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Submissions
    * const submissions = await prisma.submission.findMany()
    * ```
    */
  get submission(): Prisma.SubmissionDelegate<ExtArgs>;

  /**
   * `prisma.matchingSignal`: Exposes CRUD operations for the **MatchingSignal** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MatchingSignals
    * const matchingSignals = await prisma.matchingSignal.findMany()
    * ```
    */
  get matchingSignal(): Prisma.MatchingSignalDelegate<ExtArgs>;

  /**
   * `prisma.processedEvent`: Exposes CRUD operations for the **ProcessedEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProcessedEvents
    * const processedEvents = await prisma.processedEvent.findMany()
    * ```
    */
  get processedEvent(): Prisma.ProcessedEventDelegate<ExtArgs>;

  /**
   * `prisma.outgoingEvent`: Exposes CRUD operations for the **OutgoingEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OutgoingEvents
    * const outgoingEvents = await prisma.outgoingEvent.findMany()
    * ```
    */
  get outgoingEvent(): Prisma.OutgoingEventDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Submission: 'Submission',
    MatchingSignal: 'MatchingSignal',
    ProcessedEvent: 'ProcessedEvent',
    OutgoingEvent: 'OutgoingEvent'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "submission" | "matchingSignal" | "processedEvent" | "outgoingEvent"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Submission: {
        payload: Prisma.$SubmissionPayload<ExtArgs>
        fields: Prisma.SubmissionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubmissionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubmissionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          findFirst: {
            args: Prisma.SubmissionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubmissionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          findMany: {
            args: Prisma.SubmissionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>[]
          }
          create: {
            args: Prisma.SubmissionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          createMany: {
            args: Prisma.SubmissionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SubmissionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>[]
          }
          delete: {
            args: Prisma.SubmissionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          update: {
            args: Prisma.SubmissionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          deleteMany: {
            args: Prisma.SubmissionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubmissionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SubmissionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          aggregate: {
            args: Prisma.SubmissionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSubmission>
          }
          groupBy: {
            args: Prisma.SubmissionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SubmissionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubmissionCountArgs<ExtArgs>
            result: $Utils.Optional<SubmissionCountAggregateOutputType> | number
          }
        }
      }
      MatchingSignal: {
        payload: Prisma.$MatchingSignalPayload<ExtArgs>
        fields: Prisma.MatchingSignalFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MatchingSignalFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MatchingSignalFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload>
          }
          findFirst: {
            args: Prisma.MatchingSignalFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MatchingSignalFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload>
          }
          findMany: {
            args: Prisma.MatchingSignalFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload>[]
          }
          create: {
            args: Prisma.MatchingSignalCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload>
          }
          createMany: {
            args: Prisma.MatchingSignalCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MatchingSignalCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload>[]
          }
          delete: {
            args: Prisma.MatchingSignalDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload>
          }
          update: {
            args: Prisma.MatchingSignalUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload>
          }
          deleteMany: {
            args: Prisma.MatchingSignalDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MatchingSignalUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.MatchingSignalUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MatchingSignalPayload>
          }
          aggregate: {
            args: Prisma.MatchingSignalAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMatchingSignal>
          }
          groupBy: {
            args: Prisma.MatchingSignalGroupByArgs<ExtArgs>
            result: $Utils.Optional<MatchingSignalGroupByOutputType>[]
          }
          count: {
            args: Prisma.MatchingSignalCountArgs<ExtArgs>
            result: $Utils.Optional<MatchingSignalCountAggregateOutputType> | number
          }
        }
      }
      ProcessedEvent: {
        payload: Prisma.$ProcessedEventPayload<ExtArgs>
        fields: Prisma.ProcessedEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProcessedEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProcessedEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          findFirst: {
            args: Prisma.ProcessedEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProcessedEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          findMany: {
            args: Prisma.ProcessedEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>[]
          }
          create: {
            args: Prisma.ProcessedEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          createMany: {
            args: Prisma.ProcessedEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProcessedEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>[]
          }
          delete: {
            args: Prisma.ProcessedEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          update: {
            args: Prisma.ProcessedEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          deleteMany: {
            args: Prisma.ProcessedEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProcessedEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ProcessedEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          aggregate: {
            args: Prisma.ProcessedEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProcessedEvent>
          }
          groupBy: {
            args: Prisma.ProcessedEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProcessedEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProcessedEventCountArgs<ExtArgs>
            result: $Utils.Optional<ProcessedEventCountAggregateOutputType> | number
          }
        }
      }
      OutgoingEvent: {
        payload: Prisma.$OutgoingEventPayload<ExtArgs>
        fields: Prisma.OutgoingEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OutgoingEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OutgoingEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload>
          }
          findFirst: {
            args: Prisma.OutgoingEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OutgoingEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload>
          }
          findMany: {
            args: Prisma.OutgoingEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload>[]
          }
          create: {
            args: Prisma.OutgoingEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload>
          }
          createMany: {
            args: Prisma.OutgoingEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OutgoingEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload>[]
          }
          delete: {
            args: Prisma.OutgoingEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload>
          }
          update: {
            args: Prisma.OutgoingEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload>
          }
          deleteMany: {
            args: Prisma.OutgoingEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OutgoingEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.OutgoingEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OutgoingEventPayload>
          }
          aggregate: {
            args: Prisma.OutgoingEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOutgoingEvent>
          }
          groupBy: {
            args: Prisma.OutgoingEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<OutgoingEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.OutgoingEventCountArgs<ExtArgs>
            result: $Utils.Optional<OutgoingEventCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model Submission
   */

  export type AggregateSubmission = {
    _count: SubmissionCountAggregateOutputType | null
    _avg: SubmissionAvgAggregateOutputType | null
    _sum: SubmissionSumAggregateOutputType | null
    _min: SubmissionMinAggregateOutputType | null
    _max: SubmissionMaxAggregateOutputType | null
  }

  export type SubmissionAvgAggregateOutputType = {
    matchScore: number | null
    proposedBillRate: Decimal | null
  }

  export type SubmissionSumAggregateOutputType = {
    matchScore: number | null
    proposedBillRate: Decimal | null
  }

  export type SubmissionMinAggregateOutputType = {
    id: string | null
    requirementId: string | null
    candidateId: string | null
    submittedByUserId: string | null
    submitterRole: $Enums.SubmitterRole | null
    attributedSrmId: string | null
    attributedMsmeId: string | null
    status: $Enums.SubmissionStatus | null
    matchScore: number | null
    coverNote: string | null
    proposedBillRate: Decimal | null
    withdrawnAt: Date | null
    withdrawnReason: string | null
    rejectedAt: Date | null
    rejectionReason: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubmissionMaxAggregateOutputType = {
    id: string | null
    requirementId: string | null
    candidateId: string | null
    submittedByUserId: string | null
    submitterRole: $Enums.SubmitterRole | null
    attributedSrmId: string | null
    attributedMsmeId: string | null
    status: $Enums.SubmissionStatus | null
    matchScore: number | null
    coverNote: string | null
    proposedBillRate: Decimal | null
    withdrawnAt: Date | null
    withdrawnReason: string | null
    rejectedAt: Date | null
    rejectionReason: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubmissionCountAggregateOutputType = {
    id: number
    requirementId: number
    candidateId: number
    submittedByUserId: number
    submitterRole: number
    attributedSrmId: number
    attributedMsmeId: number
    status: number
    matchScore: number
    coverNote: number
    proposedBillRate: number
    withdrawnAt: number
    withdrawnReason: number
    rejectedAt: number
    rejectionReason: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SubmissionAvgAggregateInputType = {
    matchScore?: true
    proposedBillRate?: true
  }

  export type SubmissionSumAggregateInputType = {
    matchScore?: true
    proposedBillRate?: true
  }

  export type SubmissionMinAggregateInputType = {
    id?: true
    requirementId?: true
    candidateId?: true
    submittedByUserId?: true
    submitterRole?: true
    attributedSrmId?: true
    attributedMsmeId?: true
    status?: true
    matchScore?: true
    coverNote?: true
    proposedBillRate?: true
    withdrawnAt?: true
    withdrawnReason?: true
    rejectedAt?: true
    rejectionReason?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubmissionMaxAggregateInputType = {
    id?: true
    requirementId?: true
    candidateId?: true
    submittedByUserId?: true
    submitterRole?: true
    attributedSrmId?: true
    attributedMsmeId?: true
    status?: true
    matchScore?: true
    coverNote?: true
    proposedBillRate?: true
    withdrawnAt?: true
    withdrawnReason?: true
    rejectedAt?: true
    rejectionReason?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubmissionCountAggregateInputType = {
    id?: true
    requirementId?: true
    candidateId?: true
    submittedByUserId?: true
    submitterRole?: true
    attributedSrmId?: true
    attributedMsmeId?: true
    status?: true
    matchScore?: true
    coverNote?: true
    proposedBillRate?: true
    withdrawnAt?: true
    withdrawnReason?: true
    rejectedAt?: true
    rejectionReason?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SubmissionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Submission to aggregate.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Submissions
    **/
    _count?: true | SubmissionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SubmissionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SubmissionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubmissionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubmissionMaxAggregateInputType
  }

  export type GetSubmissionAggregateType<T extends SubmissionAggregateArgs> = {
        [P in keyof T & keyof AggregateSubmission]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubmission[P]>
      : GetScalarType<T[P], AggregateSubmission[P]>
  }




  export type SubmissionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubmissionWhereInput
    orderBy?: SubmissionOrderByWithAggregationInput | SubmissionOrderByWithAggregationInput[]
    by: SubmissionScalarFieldEnum[] | SubmissionScalarFieldEnum
    having?: SubmissionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubmissionCountAggregateInputType | true
    _avg?: SubmissionAvgAggregateInputType
    _sum?: SubmissionSumAggregateInputType
    _min?: SubmissionMinAggregateInputType
    _max?: SubmissionMaxAggregateInputType
  }

  export type SubmissionGroupByOutputType = {
    id: string
    requirementId: string
    candidateId: string
    submittedByUserId: string
    submitterRole: $Enums.SubmitterRole
    attributedSrmId: string | null
    attributedMsmeId: string | null
    status: $Enums.SubmissionStatus
    matchScore: number | null
    coverNote: string | null
    proposedBillRate: Decimal | null
    withdrawnAt: Date | null
    withdrawnReason: string | null
    rejectedAt: Date | null
    rejectionReason: string | null
    createdAt: Date
    updatedAt: Date
    _count: SubmissionCountAggregateOutputType | null
    _avg: SubmissionAvgAggregateOutputType | null
    _sum: SubmissionSumAggregateOutputType | null
    _min: SubmissionMinAggregateOutputType | null
    _max: SubmissionMaxAggregateOutputType | null
  }

  type GetSubmissionGroupByPayload<T extends SubmissionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubmissionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubmissionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubmissionGroupByOutputType[P]>
            : GetScalarType<T[P], SubmissionGroupByOutputType[P]>
        }
      >
    >


  export type SubmissionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requirementId?: boolean
    candidateId?: boolean
    submittedByUserId?: boolean
    submitterRole?: boolean
    attributedSrmId?: boolean
    attributedMsmeId?: boolean
    status?: boolean
    matchScore?: boolean
    coverNote?: boolean
    proposedBillRate?: boolean
    withdrawnAt?: boolean
    withdrawnReason?: boolean
    rejectedAt?: boolean
    rejectionReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["submission"]>

  export type SubmissionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requirementId?: boolean
    candidateId?: boolean
    submittedByUserId?: boolean
    submitterRole?: boolean
    attributedSrmId?: boolean
    attributedMsmeId?: boolean
    status?: boolean
    matchScore?: boolean
    coverNote?: boolean
    proposedBillRate?: boolean
    withdrawnAt?: boolean
    withdrawnReason?: boolean
    rejectedAt?: boolean
    rejectionReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["submission"]>

  export type SubmissionSelectScalar = {
    id?: boolean
    requirementId?: boolean
    candidateId?: boolean
    submittedByUserId?: boolean
    submitterRole?: boolean
    attributedSrmId?: boolean
    attributedMsmeId?: boolean
    status?: boolean
    matchScore?: boolean
    coverNote?: boolean
    proposedBillRate?: boolean
    withdrawnAt?: boolean
    withdrawnReason?: boolean
    rejectedAt?: boolean
    rejectionReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $SubmissionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Submission"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      requirementId: string
      candidateId: string
      submittedByUserId: string
      submitterRole: $Enums.SubmitterRole
      attributedSrmId: string | null
      attributedMsmeId: string | null
      status: $Enums.SubmissionStatus
      matchScore: number | null
      coverNote: string | null
      proposedBillRate: Prisma.Decimal | null
      withdrawnAt: Date | null
      withdrawnReason: string | null
      rejectedAt: Date | null
      rejectionReason: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["submission"]>
    composites: {}
  }

  type SubmissionGetPayload<S extends boolean | null | undefined | SubmissionDefaultArgs> = $Result.GetResult<Prisma.$SubmissionPayload, S>

  type SubmissionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SubmissionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SubmissionCountAggregateInputType | true
    }

  export interface SubmissionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Submission'], meta: { name: 'Submission' } }
    /**
     * Find zero or one Submission that matches the filter.
     * @param {SubmissionFindUniqueArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubmissionFindUniqueArgs>(args: SelectSubset<T, SubmissionFindUniqueArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Submission that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SubmissionFindUniqueOrThrowArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubmissionFindUniqueOrThrowArgs>(args: SelectSubset<T, SubmissionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Submission that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindFirstArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubmissionFindFirstArgs>(args?: SelectSubset<T, SubmissionFindFirstArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Submission that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindFirstOrThrowArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubmissionFindFirstOrThrowArgs>(args?: SelectSubset<T, SubmissionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Submissions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Submissions
     * const submissions = await prisma.submission.findMany()
     * 
     * // Get first 10 Submissions
     * const submissions = await prisma.submission.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const submissionWithIdOnly = await prisma.submission.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SubmissionFindManyArgs>(args?: SelectSubset<T, SubmissionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Submission.
     * @param {SubmissionCreateArgs} args - Arguments to create a Submission.
     * @example
     * // Create one Submission
     * const Submission = await prisma.submission.create({
     *   data: {
     *     // ... data to create a Submission
     *   }
     * })
     * 
     */
    create<T extends SubmissionCreateArgs>(args: SelectSubset<T, SubmissionCreateArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Submissions.
     * @param {SubmissionCreateManyArgs} args - Arguments to create many Submissions.
     * @example
     * // Create many Submissions
     * const submission = await prisma.submission.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubmissionCreateManyArgs>(args?: SelectSubset<T, SubmissionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Submissions and returns the data saved in the database.
     * @param {SubmissionCreateManyAndReturnArgs} args - Arguments to create many Submissions.
     * @example
     * // Create many Submissions
     * const submission = await prisma.submission.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Submissions and only return the `id`
     * const submissionWithIdOnly = await prisma.submission.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SubmissionCreateManyAndReturnArgs>(args?: SelectSubset<T, SubmissionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Submission.
     * @param {SubmissionDeleteArgs} args - Arguments to delete one Submission.
     * @example
     * // Delete one Submission
     * const Submission = await prisma.submission.delete({
     *   where: {
     *     // ... filter to delete one Submission
     *   }
     * })
     * 
     */
    delete<T extends SubmissionDeleteArgs>(args: SelectSubset<T, SubmissionDeleteArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Submission.
     * @param {SubmissionUpdateArgs} args - Arguments to update one Submission.
     * @example
     * // Update one Submission
     * const submission = await prisma.submission.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubmissionUpdateArgs>(args: SelectSubset<T, SubmissionUpdateArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Submissions.
     * @param {SubmissionDeleteManyArgs} args - Arguments to filter Submissions to delete.
     * @example
     * // Delete a few Submissions
     * const { count } = await prisma.submission.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubmissionDeleteManyArgs>(args?: SelectSubset<T, SubmissionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Submissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Submissions
     * const submission = await prisma.submission.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubmissionUpdateManyArgs>(args: SelectSubset<T, SubmissionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Submission.
     * @param {SubmissionUpsertArgs} args - Arguments to update or create a Submission.
     * @example
     * // Update or create a Submission
     * const submission = await prisma.submission.upsert({
     *   create: {
     *     // ... data to create a Submission
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Submission we want to update
     *   }
     * })
     */
    upsert<T extends SubmissionUpsertArgs>(args: SelectSubset<T, SubmissionUpsertArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Submissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionCountArgs} args - Arguments to filter Submissions to count.
     * @example
     * // Count the number of Submissions
     * const count = await prisma.submission.count({
     *   where: {
     *     // ... the filter for the Submissions we want to count
     *   }
     * })
    **/
    count<T extends SubmissionCountArgs>(
      args?: Subset<T, SubmissionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubmissionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Submission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubmissionAggregateArgs>(args: Subset<T, SubmissionAggregateArgs>): Prisma.PrismaPromise<GetSubmissionAggregateType<T>>

    /**
     * Group by Submission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubmissionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubmissionGroupByArgs['orderBy'] }
        : { orderBy?: SubmissionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubmissionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubmissionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Submission model
   */
  readonly fields: SubmissionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Submission.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubmissionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Submission model
   */ 
  interface SubmissionFieldRefs {
    readonly id: FieldRef<"Submission", 'String'>
    readonly requirementId: FieldRef<"Submission", 'String'>
    readonly candidateId: FieldRef<"Submission", 'String'>
    readonly submittedByUserId: FieldRef<"Submission", 'String'>
    readonly submitterRole: FieldRef<"Submission", 'SubmitterRole'>
    readonly attributedSrmId: FieldRef<"Submission", 'String'>
    readonly attributedMsmeId: FieldRef<"Submission", 'String'>
    readonly status: FieldRef<"Submission", 'SubmissionStatus'>
    readonly matchScore: FieldRef<"Submission", 'Int'>
    readonly coverNote: FieldRef<"Submission", 'String'>
    readonly proposedBillRate: FieldRef<"Submission", 'Decimal'>
    readonly withdrawnAt: FieldRef<"Submission", 'DateTime'>
    readonly withdrawnReason: FieldRef<"Submission", 'String'>
    readonly rejectedAt: FieldRef<"Submission", 'DateTime'>
    readonly rejectionReason: FieldRef<"Submission", 'String'>
    readonly createdAt: FieldRef<"Submission", 'DateTime'>
    readonly updatedAt: FieldRef<"Submission", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Submission findUnique
   */
  export type SubmissionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission findUniqueOrThrow
   */
  export type SubmissionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission findFirst
   */
  export type SubmissionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Submissions.
     */
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission findFirstOrThrow
   */
  export type SubmissionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Submissions.
     */
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission findMany
   */
  export type SubmissionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Filter, which Submissions to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission create
   */
  export type SubmissionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * The data needed to create a Submission.
     */
    data: XOR<SubmissionCreateInput, SubmissionUncheckedCreateInput>
  }

  /**
   * Submission createMany
   */
  export type SubmissionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Submissions.
     */
    data: SubmissionCreateManyInput | SubmissionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Submission createManyAndReturn
   */
  export type SubmissionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Submissions.
     */
    data: SubmissionCreateManyInput | SubmissionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Submission update
   */
  export type SubmissionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * The data needed to update a Submission.
     */
    data: XOR<SubmissionUpdateInput, SubmissionUncheckedUpdateInput>
    /**
     * Choose, which Submission to update.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission updateMany
   */
  export type SubmissionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Submissions.
     */
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyInput>
    /**
     * Filter which Submissions to update
     */
    where?: SubmissionWhereInput
  }

  /**
   * Submission upsert
   */
  export type SubmissionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * The filter to search for the Submission to update in case it exists.
     */
    where: SubmissionWhereUniqueInput
    /**
     * In case the Submission found by the `where` argument doesn't exist, create a new Submission with this data.
     */
    create: XOR<SubmissionCreateInput, SubmissionUncheckedCreateInput>
    /**
     * In case the Submission was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubmissionUpdateInput, SubmissionUncheckedUpdateInput>
  }

  /**
   * Submission delete
   */
  export type SubmissionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Filter which Submission to delete.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission deleteMany
   */
  export type SubmissionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Submissions to delete
     */
    where?: SubmissionWhereInput
  }

  /**
   * Submission without action
   */
  export type SubmissionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
  }


  /**
   * Model MatchingSignal
   */

  export type AggregateMatchingSignal = {
    _count: MatchingSignalCountAggregateOutputType | null
    _avg: MatchingSignalAvgAggregateOutputType | null
    _sum: MatchingSignalSumAggregateOutputType | null
    _min: MatchingSignalMinAggregateOutputType | null
    _max: MatchingSignalMaxAggregateOutputType | null
  }

  export type MatchingSignalAvgAggregateOutputType = {
    skillOverlap: number | null
    candidateRating: Decimal | null
    matchScore: number | null
  }

  export type MatchingSignalSumAggregateOutputType = {
    skillOverlap: number | null
    candidateRating: Decimal | null
    matchScore: number | null
  }

  export type MatchingSignalMinAggregateOutputType = {
    id: string | null
    requirementId: string | null
    candidateId: string | null
    skillOverlap: number | null
    seniorityMatch: boolean | null
    locationMatch: boolean | null
    workAuthMatch: boolean | null
    candidateRating: Decimal | null
    matchScore: number | null
    computedAt: Date | null
  }

  export type MatchingSignalMaxAggregateOutputType = {
    id: string | null
    requirementId: string | null
    candidateId: string | null
    skillOverlap: number | null
    seniorityMatch: boolean | null
    locationMatch: boolean | null
    workAuthMatch: boolean | null
    candidateRating: Decimal | null
    matchScore: number | null
    computedAt: Date | null
  }

  export type MatchingSignalCountAggregateOutputType = {
    id: number
    requirementId: number
    candidateId: number
    skillOverlap: number
    seniorityMatch: number
    locationMatch: number
    workAuthMatch: number
    candidateRating: number
    matchScore: number
    computedAt: number
    _all: number
  }


  export type MatchingSignalAvgAggregateInputType = {
    skillOverlap?: true
    candidateRating?: true
    matchScore?: true
  }

  export type MatchingSignalSumAggregateInputType = {
    skillOverlap?: true
    candidateRating?: true
    matchScore?: true
  }

  export type MatchingSignalMinAggregateInputType = {
    id?: true
    requirementId?: true
    candidateId?: true
    skillOverlap?: true
    seniorityMatch?: true
    locationMatch?: true
    workAuthMatch?: true
    candidateRating?: true
    matchScore?: true
    computedAt?: true
  }

  export type MatchingSignalMaxAggregateInputType = {
    id?: true
    requirementId?: true
    candidateId?: true
    skillOverlap?: true
    seniorityMatch?: true
    locationMatch?: true
    workAuthMatch?: true
    candidateRating?: true
    matchScore?: true
    computedAt?: true
  }

  export type MatchingSignalCountAggregateInputType = {
    id?: true
    requirementId?: true
    candidateId?: true
    skillOverlap?: true
    seniorityMatch?: true
    locationMatch?: true
    workAuthMatch?: true
    candidateRating?: true
    matchScore?: true
    computedAt?: true
    _all?: true
  }

  export type MatchingSignalAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MatchingSignal to aggregate.
     */
    where?: MatchingSignalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MatchingSignals to fetch.
     */
    orderBy?: MatchingSignalOrderByWithRelationInput | MatchingSignalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MatchingSignalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MatchingSignals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MatchingSignals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MatchingSignals
    **/
    _count?: true | MatchingSignalCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MatchingSignalAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MatchingSignalSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MatchingSignalMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MatchingSignalMaxAggregateInputType
  }

  export type GetMatchingSignalAggregateType<T extends MatchingSignalAggregateArgs> = {
        [P in keyof T & keyof AggregateMatchingSignal]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMatchingSignal[P]>
      : GetScalarType<T[P], AggregateMatchingSignal[P]>
  }




  export type MatchingSignalGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MatchingSignalWhereInput
    orderBy?: MatchingSignalOrderByWithAggregationInput | MatchingSignalOrderByWithAggregationInput[]
    by: MatchingSignalScalarFieldEnum[] | MatchingSignalScalarFieldEnum
    having?: MatchingSignalScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MatchingSignalCountAggregateInputType | true
    _avg?: MatchingSignalAvgAggregateInputType
    _sum?: MatchingSignalSumAggregateInputType
    _min?: MatchingSignalMinAggregateInputType
    _max?: MatchingSignalMaxAggregateInputType
  }

  export type MatchingSignalGroupByOutputType = {
    id: string
    requirementId: string
    candidateId: string
    skillOverlap: number
    seniorityMatch: boolean
    locationMatch: boolean
    workAuthMatch: boolean
    candidateRating: Decimal
    matchScore: number
    computedAt: Date
    _count: MatchingSignalCountAggregateOutputType | null
    _avg: MatchingSignalAvgAggregateOutputType | null
    _sum: MatchingSignalSumAggregateOutputType | null
    _min: MatchingSignalMinAggregateOutputType | null
    _max: MatchingSignalMaxAggregateOutputType | null
  }

  type GetMatchingSignalGroupByPayload<T extends MatchingSignalGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MatchingSignalGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MatchingSignalGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MatchingSignalGroupByOutputType[P]>
            : GetScalarType<T[P], MatchingSignalGroupByOutputType[P]>
        }
      >
    >


  export type MatchingSignalSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requirementId?: boolean
    candidateId?: boolean
    skillOverlap?: boolean
    seniorityMatch?: boolean
    locationMatch?: boolean
    workAuthMatch?: boolean
    candidateRating?: boolean
    matchScore?: boolean
    computedAt?: boolean
  }, ExtArgs["result"]["matchingSignal"]>

  export type MatchingSignalSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requirementId?: boolean
    candidateId?: boolean
    skillOverlap?: boolean
    seniorityMatch?: boolean
    locationMatch?: boolean
    workAuthMatch?: boolean
    candidateRating?: boolean
    matchScore?: boolean
    computedAt?: boolean
  }, ExtArgs["result"]["matchingSignal"]>

  export type MatchingSignalSelectScalar = {
    id?: boolean
    requirementId?: boolean
    candidateId?: boolean
    skillOverlap?: boolean
    seniorityMatch?: boolean
    locationMatch?: boolean
    workAuthMatch?: boolean
    candidateRating?: boolean
    matchScore?: boolean
    computedAt?: boolean
  }


  export type $MatchingSignalPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MatchingSignal"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      requirementId: string
      candidateId: string
      skillOverlap: number
      seniorityMatch: boolean
      locationMatch: boolean
      workAuthMatch: boolean
      candidateRating: Prisma.Decimal
      matchScore: number
      computedAt: Date
    }, ExtArgs["result"]["matchingSignal"]>
    composites: {}
  }

  type MatchingSignalGetPayload<S extends boolean | null | undefined | MatchingSignalDefaultArgs> = $Result.GetResult<Prisma.$MatchingSignalPayload, S>

  type MatchingSignalCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<MatchingSignalFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: MatchingSignalCountAggregateInputType | true
    }

  export interface MatchingSignalDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MatchingSignal'], meta: { name: 'MatchingSignal' } }
    /**
     * Find zero or one MatchingSignal that matches the filter.
     * @param {MatchingSignalFindUniqueArgs} args - Arguments to find a MatchingSignal
     * @example
     * // Get one MatchingSignal
     * const matchingSignal = await prisma.matchingSignal.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MatchingSignalFindUniqueArgs>(args: SelectSubset<T, MatchingSignalFindUniqueArgs<ExtArgs>>): Prisma__MatchingSignalClient<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one MatchingSignal that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {MatchingSignalFindUniqueOrThrowArgs} args - Arguments to find a MatchingSignal
     * @example
     * // Get one MatchingSignal
     * const matchingSignal = await prisma.matchingSignal.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MatchingSignalFindUniqueOrThrowArgs>(args: SelectSubset<T, MatchingSignalFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MatchingSignalClient<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first MatchingSignal that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatchingSignalFindFirstArgs} args - Arguments to find a MatchingSignal
     * @example
     * // Get one MatchingSignal
     * const matchingSignal = await prisma.matchingSignal.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MatchingSignalFindFirstArgs>(args?: SelectSubset<T, MatchingSignalFindFirstArgs<ExtArgs>>): Prisma__MatchingSignalClient<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first MatchingSignal that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatchingSignalFindFirstOrThrowArgs} args - Arguments to find a MatchingSignal
     * @example
     * // Get one MatchingSignal
     * const matchingSignal = await prisma.matchingSignal.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MatchingSignalFindFirstOrThrowArgs>(args?: SelectSubset<T, MatchingSignalFindFirstOrThrowArgs<ExtArgs>>): Prisma__MatchingSignalClient<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more MatchingSignals that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatchingSignalFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MatchingSignals
     * const matchingSignals = await prisma.matchingSignal.findMany()
     * 
     * // Get first 10 MatchingSignals
     * const matchingSignals = await prisma.matchingSignal.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const matchingSignalWithIdOnly = await prisma.matchingSignal.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MatchingSignalFindManyArgs>(args?: SelectSubset<T, MatchingSignalFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a MatchingSignal.
     * @param {MatchingSignalCreateArgs} args - Arguments to create a MatchingSignal.
     * @example
     * // Create one MatchingSignal
     * const MatchingSignal = await prisma.matchingSignal.create({
     *   data: {
     *     // ... data to create a MatchingSignal
     *   }
     * })
     * 
     */
    create<T extends MatchingSignalCreateArgs>(args: SelectSubset<T, MatchingSignalCreateArgs<ExtArgs>>): Prisma__MatchingSignalClient<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many MatchingSignals.
     * @param {MatchingSignalCreateManyArgs} args - Arguments to create many MatchingSignals.
     * @example
     * // Create many MatchingSignals
     * const matchingSignal = await prisma.matchingSignal.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MatchingSignalCreateManyArgs>(args?: SelectSubset<T, MatchingSignalCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MatchingSignals and returns the data saved in the database.
     * @param {MatchingSignalCreateManyAndReturnArgs} args - Arguments to create many MatchingSignals.
     * @example
     * // Create many MatchingSignals
     * const matchingSignal = await prisma.matchingSignal.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MatchingSignals and only return the `id`
     * const matchingSignalWithIdOnly = await prisma.matchingSignal.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MatchingSignalCreateManyAndReturnArgs>(args?: SelectSubset<T, MatchingSignalCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a MatchingSignal.
     * @param {MatchingSignalDeleteArgs} args - Arguments to delete one MatchingSignal.
     * @example
     * // Delete one MatchingSignal
     * const MatchingSignal = await prisma.matchingSignal.delete({
     *   where: {
     *     // ... filter to delete one MatchingSignal
     *   }
     * })
     * 
     */
    delete<T extends MatchingSignalDeleteArgs>(args: SelectSubset<T, MatchingSignalDeleteArgs<ExtArgs>>): Prisma__MatchingSignalClient<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one MatchingSignal.
     * @param {MatchingSignalUpdateArgs} args - Arguments to update one MatchingSignal.
     * @example
     * // Update one MatchingSignal
     * const matchingSignal = await prisma.matchingSignal.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MatchingSignalUpdateArgs>(args: SelectSubset<T, MatchingSignalUpdateArgs<ExtArgs>>): Prisma__MatchingSignalClient<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more MatchingSignals.
     * @param {MatchingSignalDeleteManyArgs} args - Arguments to filter MatchingSignals to delete.
     * @example
     * // Delete a few MatchingSignals
     * const { count } = await prisma.matchingSignal.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MatchingSignalDeleteManyArgs>(args?: SelectSubset<T, MatchingSignalDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MatchingSignals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatchingSignalUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MatchingSignals
     * const matchingSignal = await prisma.matchingSignal.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MatchingSignalUpdateManyArgs>(args: SelectSubset<T, MatchingSignalUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one MatchingSignal.
     * @param {MatchingSignalUpsertArgs} args - Arguments to update or create a MatchingSignal.
     * @example
     * // Update or create a MatchingSignal
     * const matchingSignal = await prisma.matchingSignal.upsert({
     *   create: {
     *     // ... data to create a MatchingSignal
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MatchingSignal we want to update
     *   }
     * })
     */
    upsert<T extends MatchingSignalUpsertArgs>(args: SelectSubset<T, MatchingSignalUpsertArgs<ExtArgs>>): Prisma__MatchingSignalClient<$Result.GetResult<Prisma.$MatchingSignalPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of MatchingSignals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatchingSignalCountArgs} args - Arguments to filter MatchingSignals to count.
     * @example
     * // Count the number of MatchingSignals
     * const count = await prisma.matchingSignal.count({
     *   where: {
     *     // ... the filter for the MatchingSignals we want to count
     *   }
     * })
    **/
    count<T extends MatchingSignalCountArgs>(
      args?: Subset<T, MatchingSignalCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MatchingSignalCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MatchingSignal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatchingSignalAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MatchingSignalAggregateArgs>(args: Subset<T, MatchingSignalAggregateArgs>): Prisma.PrismaPromise<GetMatchingSignalAggregateType<T>>

    /**
     * Group by MatchingSignal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatchingSignalGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MatchingSignalGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MatchingSignalGroupByArgs['orderBy'] }
        : { orderBy?: MatchingSignalGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MatchingSignalGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMatchingSignalGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MatchingSignal model
   */
  readonly fields: MatchingSignalFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MatchingSignal.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MatchingSignalClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MatchingSignal model
   */ 
  interface MatchingSignalFieldRefs {
    readonly id: FieldRef<"MatchingSignal", 'String'>
    readonly requirementId: FieldRef<"MatchingSignal", 'String'>
    readonly candidateId: FieldRef<"MatchingSignal", 'String'>
    readonly skillOverlap: FieldRef<"MatchingSignal", 'Int'>
    readonly seniorityMatch: FieldRef<"MatchingSignal", 'Boolean'>
    readonly locationMatch: FieldRef<"MatchingSignal", 'Boolean'>
    readonly workAuthMatch: FieldRef<"MatchingSignal", 'Boolean'>
    readonly candidateRating: FieldRef<"MatchingSignal", 'Decimal'>
    readonly matchScore: FieldRef<"MatchingSignal", 'Int'>
    readonly computedAt: FieldRef<"MatchingSignal", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MatchingSignal findUnique
   */
  export type MatchingSignalFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * Filter, which MatchingSignal to fetch.
     */
    where: MatchingSignalWhereUniqueInput
  }

  /**
   * MatchingSignal findUniqueOrThrow
   */
  export type MatchingSignalFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * Filter, which MatchingSignal to fetch.
     */
    where: MatchingSignalWhereUniqueInput
  }

  /**
   * MatchingSignal findFirst
   */
  export type MatchingSignalFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * Filter, which MatchingSignal to fetch.
     */
    where?: MatchingSignalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MatchingSignals to fetch.
     */
    orderBy?: MatchingSignalOrderByWithRelationInput | MatchingSignalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MatchingSignals.
     */
    cursor?: MatchingSignalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MatchingSignals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MatchingSignals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MatchingSignals.
     */
    distinct?: MatchingSignalScalarFieldEnum | MatchingSignalScalarFieldEnum[]
  }

  /**
   * MatchingSignal findFirstOrThrow
   */
  export type MatchingSignalFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * Filter, which MatchingSignal to fetch.
     */
    where?: MatchingSignalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MatchingSignals to fetch.
     */
    orderBy?: MatchingSignalOrderByWithRelationInput | MatchingSignalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MatchingSignals.
     */
    cursor?: MatchingSignalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MatchingSignals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MatchingSignals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MatchingSignals.
     */
    distinct?: MatchingSignalScalarFieldEnum | MatchingSignalScalarFieldEnum[]
  }

  /**
   * MatchingSignal findMany
   */
  export type MatchingSignalFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * Filter, which MatchingSignals to fetch.
     */
    where?: MatchingSignalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MatchingSignals to fetch.
     */
    orderBy?: MatchingSignalOrderByWithRelationInput | MatchingSignalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MatchingSignals.
     */
    cursor?: MatchingSignalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MatchingSignals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MatchingSignals.
     */
    skip?: number
    distinct?: MatchingSignalScalarFieldEnum | MatchingSignalScalarFieldEnum[]
  }

  /**
   * MatchingSignal create
   */
  export type MatchingSignalCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * The data needed to create a MatchingSignal.
     */
    data: XOR<MatchingSignalCreateInput, MatchingSignalUncheckedCreateInput>
  }

  /**
   * MatchingSignal createMany
   */
  export type MatchingSignalCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MatchingSignals.
     */
    data: MatchingSignalCreateManyInput | MatchingSignalCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MatchingSignal createManyAndReturn
   */
  export type MatchingSignalCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many MatchingSignals.
     */
    data: MatchingSignalCreateManyInput | MatchingSignalCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MatchingSignal update
   */
  export type MatchingSignalUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * The data needed to update a MatchingSignal.
     */
    data: XOR<MatchingSignalUpdateInput, MatchingSignalUncheckedUpdateInput>
    /**
     * Choose, which MatchingSignal to update.
     */
    where: MatchingSignalWhereUniqueInput
  }

  /**
   * MatchingSignal updateMany
   */
  export type MatchingSignalUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MatchingSignals.
     */
    data: XOR<MatchingSignalUpdateManyMutationInput, MatchingSignalUncheckedUpdateManyInput>
    /**
     * Filter which MatchingSignals to update
     */
    where?: MatchingSignalWhereInput
  }

  /**
   * MatchingSignal upsert
   */
  export type MatchingSignalUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * The filter to search for the MatchingSignal to update in case it exists.
     */
    where: MatchingSignalWhereUniqueInput
    /**
     * In case the MatchingSignal found by the `where` argument doesn't exist, create a new MatchingSignal with this data.
     */
    create: XOR<MatchingSignalCreateInput, MatchingSignalUncheckedCreateInput>
    /**
     * In case the MatchingSignal was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MatchingSignalUpdateInput, MatchingSignalUncheckedUpdateInput>
  }

  /**
   * MatchingSignal delete
   */
  export type MatchingSignalDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
    /**
     * Filter which MatchingSignal to delete.
     */
    where: MatchingSignalWhereUniqueInput
  }

  /**
   * MatchingSignal deleteMany
   */
  export type MatchingSignalDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MatchingSignals to delete
     */
    where?: MatchingSignalWhereInput
  }

  /**
   * MatchingSignal without action
   */
  export type MatchingSignalDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchingSignal
     */
    select?: MatchingSignalSelect<ExtArgs> | null
  }


  /**
   * Model ProcessedEvent
   */

  export type AggregateProcessedEvent = {
    _count: ProcessedEventCountAggregateOutputType | null
    _min: ProcessedEventMinAggregateOutputType | null
    _max: ProcessedEventMaxAggregateOutputType | null
  }

  export type ProcessedEventMinAggregateOutputType = {
    eventId: string | null
    eventType: string | null
    processedAt: Date | null
  }

  export type ProcessedEventMaxAggregateOutputType = {
    eventId: string | null
    eventType: string | null
    processedAt: Date | null
  }

  export type ProcessedEventCountAggregateOutputType = {
    eventId: number
    eventType: number
    processedAt: number
    _all: number
  }


  export type ProcessedEventMinAggregateInputType = {
    eventId?: true
    eventType?: true
    processedAt?: true
  }

  export type ProcessedEventMaxAggregateInputType = {
    eventId?: true
    eventType?: true
    processedAt?: true
  }

  export type ProcessedEventCountAggregateInputType = {
    eventId?: true
    eventType?: true
    processedAt?: true
    _all?: true
  }

  export type ProcessedEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProcessedEvent to aggregate.
     */
    where?: ProcessedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessedEvents to fetch.
     */
    orderBy?: ProcessedEventOrderByWithRelationInput | ProcessedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProcessedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProcessedEvents
    **/
    _count?: true | ProcessedEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProcessedEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProcessedEventMaxAggregateInputType
  }

  export type GetProcessedEventAggregateType<T extends ProcessedEventAggregateArgs> = {
        [P in keyof T & keyof AggregateProcessedEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProcessedEvent[P]>
      : GetScalarType<T[P], AggregateProcessedEvent[P]>
  }




  export type ProcessedEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProcessedEventWhereInput
    orderBy?: ProcessedEventOrderByWithAggregationInput | ProcessedEventOrderByWithAggregationInput[]
    by: ProcessedEventScalarFieldEnum[] | ProcessedEventScalarFieldEnum
    having?: ProcessedEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProcessedEventCountAggregateInputType | true
    _min?: ProcessedEventMinAggregateInputType
    _max?: ProcessedEventMaxAggregateInputType
  }

  export type ProcessedEventGroupByOutputType = {
    eventId: string
    eventType: string
    processedAt: Date
    _count: ProcessedEventCountAggregateOutputType | null
    _min: ProcessedEventMinAggregateOutputType | null
    _max: ProcessedEventMaxAggregateOutputType | null
  }

  type GetProcessedEventGroupByPayload<T extends ProcessedEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProcessedEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProcessedEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProcessedEventGroupByOutputType[P]>
            : GetScalarType<T[P], ProcessedEventGroupByOutputType[P]>
        }
      >
    >


  export type ProcessedEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    eventId?: boolean
    eventType?: boolean
    processedAt?: boolean
  }, ExtArgs["result"]["processedEvent"]>

  export type ProcessedEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    eventId?: boolean
    eventType?: boolean
    processedAt?: boolean
  }, ExtArgs["result"]["processedEvent"]>

  export type ProcessedEventSelectScalar = {
    eventId?: boolean
    eventType?: boolean
    processedAt?: boolean
  }


  export type $ProcessedEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProcessedEvent"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      eventId: string
      eventType: string
      processedAt: Date
    }, ExtArgs["result"]["processedEvent"]>
    composites: {}
  }

  type ProcessedEventGetPayload<S extends boolean | null | undefined | ProcessedEventDefaultArgs> = $Result.GetResult<Prisma.$ProcessedEventPayload, S>

  type ProcessedEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ProcessedEventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ProcessedEventCountAggregateInputType | true
    }

  export interface ProcessedEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProcessedEvent'], meta: { name: 'ProcessedEvent' } }
    /**
     * Find zero or one ProcessedEvent that matches the filter.
     * @param {ProcessedEventFindUniqueArgs} args - Arguments to find a ProcessedEvent
     * @example
     * // Get one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProcessedEventFindUniqueArgs>(args: SelectSubset<T, ProcessedEventFindUniqueArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ProcessedEvent that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ProcessedEventFindUniqueOrThrowArgs} args - Arguments to find a ProcessedEvent
     * @example
     * // Get one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProcessedEventFindUniqueOrThrowArgs>(args: SelectSubset<T, ProcessedEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ProcessedEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventFindFirstArgs} args - Arguments to find a ProcessedEvent
     * @example
     * // Get one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProcessedEventFindFirstArgs>(args?: SelectSubset<T, ProcessedEventFindFirstArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ProcessedEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventFindFirstOrThrowArgs} args - Arguments to find a ProcessedEvent
     * @example
     * // Get one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProcessedEventFindFirstOrThrowArgs>(args?: SelectSubset<T, ProcessedEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ProcessedEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProcessedEvents
     * const processedEvents = await prisma.processedEvent.findMany()
     * 
     * // Get first 10 ProcessedEvents
     * const processedEvents = await prisma.processedEvent.findMany({ take: 10 })
     * 
     * // Only select the `eventId`
     * const processedEventWithEventIdOnly = await prisma.processedEvent.findMany({ select: { eventId: true } })
     * 
     */
    findMany<T extends ProcessedEventFindManyArgs>(args?: SelectSubset<T, ProcessedEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ProcessedEvent.
     * @param {ProcessedEventCreateArgs} args - Arguments to create a ProcessedEvent.
     * @example
     * // Create one ProcessedEvent
     * const ProcessedEvent = await prisma.processedEvent.create({
     *   data: {
     *     // ... data to create a ProcessedEvent
     *   }
     * })
     * 
     */
    create<T extends ProcessedEventCreateArgs>(args: SelectSubset<T, ProcessedEventCreateArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ProcessedEvents.
     * @param {ProcessedEventCreateManyArgs} args - Arguments to create many ProcessedEvents.
     * @example
     * // Create many ProcessedEvents
     * const processedEvent = await prisma.processedEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProcessedEventCreateManyArgs>(args?: SelectSubset<T, ProcessedEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProcessedEvents and returns the data saved in the database.
     * @param {ProcessedEventCreateManyAndReturnArgs} args - Arguments to create many ProcessedEvents.
     * @example
     * // Create many ProcessedEvents
     * const processedEvent = await prisma.processedEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProcessedEvents and only return the `eventId`
     * const processedEventWithEventIdOnly = await prisma.processedEvent.createManyAndReturn({ 
     *   select: { eventId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProcessedEventCreateManyAndReturnArgs>(args?: SelectSubset<T, ProcessedEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ProcessedEvent.
     * @param {ProcessedEventDeleteArgs} args - Arguments to delete one ProcessedEvent.
     * @example
     * // Delete one ProcessedEvent
     * const ProcessedEvent = await prisma.processedEvent.delete({
     *   where: {
     *     // ... filter to delete one ProcessedEvent
     *   }
     * })
     * 
     */
    delete<T extends ProcessedEventDeleteArgs>(args: SelectSubset<T, ProcessedEventDeleteArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ProcessedEvent.
     * @param {ProcessedEventUpdateArgs} args - Arguments to update one ProcessedEvent.
     * @example
     * // Update one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProcessedEventUpdateArgs>(args: SelectSubset<T, ProcessedEventUpdateArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ProcessedEvents.
     * @param {ProcessedEventDeleteManyArgs} args - Arguments to filter ProcessedEvents to delete.
     * @example
     * // Delete a few ProcessedEvents
     * const { count } = await prisma.processedEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProcessedEventDeleteManyArgs>(args?: SelectSubset<T, ProcessedEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProcessedEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProcessedEvents
     * const processedEvent = await prisma.processedEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProcessedEventUpdateManyArgs>(args: SelectSubset<T, ProcessedEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ProcessedEvent.
     * @param {ProcessedEventUpsertArgs} args - Arguments to update or create a ProcessedEvent.
     * @example
     * // Update or create a ProcessedEvent
     * const processedEvent = await prisma.processedEvent.upsert({
     *   create: {
     *     // ... data to create a ProcessedEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProcessedEvent we want to update
     *   }
     * })
     */
    upsert<T extends ProcessedEventUpsertArgs>(args: SelectSubset<T, ProcessedEventUpsertArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ProcessedEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventCountArgs} args - Arguments to filter ProcessedEvents to count.
     * @example
     * // Count the number of ProcessedEvents
     * const count = await prisma.processedEvent.count({
     *   where: {
     *     // ... the filter for the ProcessedEvents we want to count
     *   }
     * })
    **/
    count<T extends ProcessedEventCountArgs>(
      args?: Subset<T, ProcessedEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProcessedEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProcessedEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProcessedEventAggregateArgs>(args: Subset<T, ProcessedEventAggregateArgs>): Prisma.PrismaPromise<GetProcessedEventAggregateType<T>>

    /**
     * Group by ProcessedEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProcessedEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProcessedEventGroupByArgs['orderBy'] }
        : { orderBy?: ProcessedEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProcessedEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProcessedEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProcessedEvent model
   */
  readonly fields: ProcessedEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProcessedEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProcessedEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProcessedEvent model
   */ 
  interface ProcessedEventFieldRefs {
    readonly eventId: FieldRef<"ProcessedEvent", 'String'>
    readonly eventType: FieldRef<"ProcessedEvent", 'String'>
    readonly processedAt: FieldRef<"ProcessedEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProcessedEvent findUnique
   */
  export type ProcessedEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvent to fetch.
     */
    where: ProcessedEventWhereUniqueInput
  }

  /**
   * ProcessedEvent findUniqueOrThrow
   */
  export type ProcessedEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvent to fetch.
     */
    where: ProcessedEventWhereUniqueInput
  }

  /**
   * ProcessedEvent findFirst
   */
  export type ProcessedEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvent to fetch.
     */
    where?: ProcessedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessedEvents to fetch.
     */
    orderBy?: ProcessedEventOrderByWithRelationInput | ProcessedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProcessedEvents.
     */
    cursor?: ProcessedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProcessedEvents.
     */
    distinct?: ProcessedEventScalarFieldEnum | ProcessedEventScalarFieldEnum[]
  }

  /**
   * ProcessedEvent findFirstOrThrow
   */
  export type ProcessedEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvent to fetch.
     */
    where?: ProcessedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessedEvents to fetch.
     */
    orderBy?: ProcessedEventOrderByWithRelationInput | ProcessedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProcessedEvents.
     */
    cursor?: ProcessedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProcessedEvents.
     */
    distinct?: ProcessedEventScalarFieldEnum | ProcessedEventScalarFieldEnum[]
  }

  /**
   * ProcessedEvent findMany
   */
  export type ProcessedEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvents to fetch.
     */
    where?: ProcessedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessedEvents to fetch.
     */
    orderBy?: ProcessedEventOrderByWithRelationInput | ProcessedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProcessedEvents.
     */
    cursor?: ProcessedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessedEvents.
     */
    skip?: number
    distinct?: ProcessedEventScalarFieldEnum | ProcessedEventScalarFieldEnum[]
  }

  /**
   * ProcessedEvent create
   */
  export type ProcessedEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * The data needed to create a ProcessedEvent.
     */
    data: XOR<ProcessedEventCreateInput, ProcessedEventUncheckedCreateInput>
  }

  /**
   * ProcessedEvent createMany
   */
  export type ProcessedEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProcessedEvents.
     */
    data: ProcessedEventCreateManyInput | ProcessedEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProcessedEvent createManyAndReturn
   */
  export type ProcessedEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ProcessedEvents.
     */
    data: ProcessedEventCreateManyInput | ProcessedEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProcessedEvent update
   */
  export type ProcessedEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * The data needed to update a ProcessedEvent.
     */
    data: XOR<ProcessedEventUpdateInput, ProcessedEventUncheckedUpdateInput>
    /**
     * Choose, which ProcessedEvent to update.
     */
    where: ProcessedEventWhereUniqueInput
  }

  /**
   * ProcessedEvent updateMany
   */
  export type ProcessedEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProcessedEvents.
     */
    data: XOR<ProcessedEventUpdateManyMutationInput, ProcessedEventUncheckedUpdateManyInput>
    /**
     * Filter which ProcessedEvents to update
     */
    where?: ProcessedEventWhereInput
  }

  /**
   * ProcessedEvent upsert
   */
  export type ProcessedEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * The filter to search for the ProcessedEvent to update in case it exists.
     */
    where: ProcessedEventWhereUniqueInput
    /**
     * In case the ProcessedEvent found by the `where` argument doesn't exist, create a new ProcessedEvent with this data.
     */
    create: XOR<ProcessedEventCreateInput, ProcessedEventUncheckedCreateInput>
    /**
     * In case the ProcessedEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProcessedEventUpdateInput, ProcessedEventUncheckedUpdateInput>
  }

  /**
   * ProcessedEvent delete
   */
  export type ProcessedEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter which ProcessedEvent to delete.
     */
    where: ProcessedEventWhereUniqueInput
  }

  /**
   * ProcessedEvent deleteMany
   */
  export type ProcessedEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProcessedEvents to delete
     */
    where?: ProcessedEventWhereInput
  }

  /**
   * ProcessedEvent without action
   */
  export type ProcessedEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
  }


  /**
   * Model OutgoingEvent
   */

  export type AggregateOutgoingEvent = {
    _count: OutgoingEventCountAggregateOutputType | null
    _avg: OutgoingEventAvgAggregateOutputType | null
    _sum: OutgoingEventSumAggregateOutputType | null
    _min: OutgoingEventMinAggregateOutputType | null
    _max: OutgoingEventMaxAggregateOutputType | null
  }

  export type OutgoingEventAvgAggregateOutputType = {
    attempts: number | null
  }

  export type OutgoingEventSumAggregateOutputType = {
    attempts: number | null
  }

  export type OutgoingEventMinAggregateOutputType = {
    id: string | null
    eventType: string | null
    aggregateId: string | null
    status: $Enums.OutgoingEventStatus | null
    attempts: number | null
    lastError: string | null
    createdAt: Date | null
    sentAt: Date | null
  }

  export type OutgoingEventMaxAggregateOutputType = {
    id: string | null
    eventType: string | null
    aggregateId: string | null
    status: $Enums.OutgoingEventStatus | null
    attempts: number | null
    lastError: string | null
    createdAt: Date | null
    sentAt: Date | null
  }

  export type OutgoingEventCountAggregateOutputType = {
    id: number
    eventType: number
    aggregateId: number
    payload: number
    status: number
    attempts: number
    lastError: number
    createdAt: number
    sentAt: number
    _all: number
  }


  export type OutgoingEventAvgAggregateInputType = {
    attempts?: true
  }

  export type OutgoingEventSumAggregateInputType = {
    attempts?: true
  }

  export type OutgoingEventMinAggregateInputType = {
    id?: true
    eventType?: true
    aggregateId?: true
    status?: true
    attempts?: true
    lastError?: true
    createdAt?: true
    sentAt?: true
  }

  export type OutgoingEventMaxAggregateInputType = {
    id?: true
    eventType?: true
    aggregateId?: true
    status?: true
    attempts?: true
    lastError?: true
    createdAt?: true
    sentAt?: true
  }

  export type OutgoingEventCountAggregateInputType = {
    id?: true
    eventType?: true
    aggregateId?: true
    payload?: true
    status?: true
    attempts?: true
    lastError?: true
    createdAt?: true
    sentAt?: true
    _all?: true
  }

  export type OutgoingEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OutgoingEvent to aggregate.
     */
    where?: OutgoingEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OutgoingEvents to fetch.
     */
    orderBy?: OutgoingEventOrderByWithRelationInput | OutgoingEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OutgoingEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OutgoingEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OutgoingEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OutgoingEvents
    **/
    _count?: true | OutgoingEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OutgoingEventAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OutgoingEventSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OutgoingEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OutgoingEventMaxAggregateInputType
  }

  export type GetOutgoingEventAggregateType<T extends OutgoingEventAggregateArgs> = {
        [P in keyof T & keyof AggregateOutgoingEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOutgoingEvent[P]>
      : GetScalarType<T[P], AggregateOutgoingEvent[P]>
  }




  export type OutgoingEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OutgoingEventWhereInput
    orderBy?: OutgoingEventOrderByWithAggregationInput | OutgoingEventOrderByWithAggregationInput[]
    by: OutgoingEventScalarFieldEnum[] | OutgoingEventScalarFieldEnum
    having?: OutgoingEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OutgoingEventCountAggregateInputType | true
    _avg?: OutgoingEventAvgAggregateInputType
    _sum?: OutgoingEventSumAggregateInputType
    _min?: OutgoingEventMinAggregateInputType
    _max?: OutgoingEventMaxAggregateInputType
  }

  export type OutgoingEventGroupByOutputType = {
    id: string
    eventType: string
    aggregateId: string
    payload: JsonValue
    status: $Enums.OutgoingEventStatus
    attempts: number
    lastError: string | null
    createdAt: Date
    sentAt: Date | null
    _count: OutgoingEventCountAggregateOutputType | null
    _avg: OutgoingEventAvgAggregateOutputType | null
    _sum: OutgoingEventSumAggregateOutputType | null
    _min: OutgoingEventMinAggregateOutputType | null
    _max: OutgoingEventMaxAggregateOutputType | null
  }

  type GetOutgoingEventGroupByPayload<T extends OutgoingEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OutgoingEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OutgoingEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OutgoingEventGroupByOutputType[P]>
            : GetScalarType<T[P], OutgoingEventGroupByOutputType[P]>
        }
      >
    >


  export type OutgoingEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventType?: boolean
    aggregateId?: boolean
    payload?: boolean
    status?: boolean
    attempts?: boolean
    lastError?: boolean
    createdAt?: boolean
    sentAt?: boolean
  }, ExtArgs["result"]["outgoingEvent"]>

  export type OutgoingEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventType?: boolean
    aggregateId?: boolean
    payload?: boolean
    status?: boolean
    attempts?: boolean
    lastError?: boolean
    createdAt?: boolean
    sentAt?: boolean
  }, ExtArgs["result"]["outgoingEvent"]>

  export type OutgoingEventSelectScalar = {
    id?: boolean
    eventType?: boolean
    aggregateId?: boolean
    payload?: boolean
    status?: boolean
    attempts?: boolean
    lastError?: boolean
    createdAt?: boolean
    sentAt?: boolean
  }


  export type $OutgoingEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OutgoingEvent"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      eventType: string
      aggregateId: string
      payload: Prisma.JsonValue
      status: $Enums.OutgoingEventStatus
      attempts: number
      lastError: string | null
      createdAt: Date
      sentAt: Date | null
    }, ExtArgs["result"]["outgoingEvent"]>
    composites: {}
  }

  type OutgoingEventGetPayload<S extends boolean | null | undefined | OutgoingEventDefaultArgs> = $Result.GetResult<Prisma.$OutgoingEventPayload, S>

  type OutgoingEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OutgoingEventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OutgoingEventCountAggregateInputType | true
    }

  export interface OutgoingEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OutgoingEvent'], meta: { name: 'OutgoingEvent' } }
    /**
     * Find zero or one OutgoingEvent that matches the filter.
     * @param {OutgoingEventFindUniqueArgs} args - Arguments to find a OutgoingEvent
     * @example
     * // Get one OutgoingEvent
     * const outgoingEvent = await prisma.outgoingEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OutgoingEventFindUniqueArgs>(args: SelectSubset<T, OutgoingEventFindUniqueArgs<ExtArgs>>): Prisma__OutgoingEventClient<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one OutgoingEvent that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {OutgoingEventFindUniqueOrThrowArgs} args - Arguments to find a OutgoingEvent
     * @example
     * // Get one OutgoingEvent
     * const outgoingEvent = await prisma.outgoingEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OutgoingEventFindUniqueOrThrowArgs>(args: SelectSubset<T, OutgoingEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OutgoingEventClient<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first OutgoingEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OutgoingEventFindFirstArgs} args - Arguments to find a OutgoingEvent
     * @example
     * // Get one OutgoingEvent
     * const outgoingEvent = await prisma.outgoingEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OutgoingEventFindFirstArgs>(args?: SelectSubset<T, OutgoingEventFindFirstArgs<ExtArgs>>): Prisma__OutgoingEventClient<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first OutgoingEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OutgoingEventFindFirstOrThrowArgs} args - Arguments to find a OutgoingEvent
     * @example
     * // Get one OutgoingEvent
     * const outgoingEvent = await prisma.outgoingEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OutgoingEventFindFirstOrThrowArgs>(args?: SelectSubset<T, OutgoingEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__OutgoingEventClient<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more OutgoingEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OutgoingEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OutgoingEvents
     * const outgoingEvents = await prisma.outgoingEvent.findMany()
     * 
     * // Get first 10 OutgoingEvents
     * const outgoingEvents = await prisma.outgoingEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const outgoingEventWithIdOnly = await prisma.outgoingEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OutgoingEventFindManyArgs>(args?: SelectSubset<T, OutgoingEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a OutgoingEvent.
     * @param {OutgoingEventCreateArgs} args - Arguments to create a OutgoingEvent.
     * @example
     * // Create one OutgoingEvent
     * const OutgoingEvent = await prisma.outgoingEvent.create({
     *   data: {
     *     // ... data to create a OutgoingEvent
     *   }
     * })
     * 
     */
    create<T extends OutgoingEventCreateArgs>(args: SelectSubset<T, OutgoingEventCreateArgs<ExtArgs>>): Prisma__OutgoingEventClient<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many OutgoingEvents.
     * @param {OutgoingEventCreateManyArgs} args - Arguments to create many OutgoingEvents.
     * @example
     * // Create many OutgoingEvents
     * const outgoingEvent = await prisma.outgoingEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OutgoingEventCreateManyArgs>(args?: SelectSubset<T, OutgoingEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OutgoingEvents and returns the data saved in the database.
     * @param {OutgoingEventCreateManyAndReturnArgs} args - Arguments to create many OutgoingEvents.
     * @example
     * // Create many OutgoingEvents
     * const outgoingEvent = await prisma.outgoingEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OutgoingEvents and only return the `id`
     * const outgoingEventWithIdOnly = await prisma.outgoingEvent.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OutgoingEventCreateManyAndReturnArgs>(args?: SelectSubset<T, OutgoingEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a OutgoingEvent.
     * @param {OutgoingEventDeleteArgs} args - Arguments to delete one OutgoingEvent.
     * @example
     * // Delete one OutgoingEvent
     * const OutgoingEvent = await prisma.outgoingEvent.delete({
     *   where: {
     *     // ... filter to delete one OutgoingEvent
     *   }
     * })
     * 
     */
    delete<T extends OutgoingEventDeleteArgs>(args: SelectSubset<T, OutgoingEventDeleteArgs<ExtArgs>>): Prisma__OutgoingEventClient<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one OutgoingEvent.
     * @param {OutgoingEventUpdateArgs} args - Arguments to update one OutgoingEvent.
     * @example
     * // Update one OutgoingEvent
     * const outgoingEvent = await prisma.outgoingEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OutgoingEventUpdateArgs>(args: SelectSubset<T, OutgoingEventUpdateArgs<ExtArgs>>): Prisma__OutgoingEventClient<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more OutgoingEvents.
     * @param {OutgoingEventDeleteManyArgs} args - Arguments to filter OutgoingEvents to delete.
     * @example
     * // Delete a few OutgoingEvents
     * const { count } = await prisma.outgoingEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OutgoingEventDeleteManyArgs>(args?: SelectSubset<T, OutgoingEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OutgoingEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OutgoingEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OutgoingEvents
     * const outgoingEvent = await prisma.outgoingEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OutgoingEventUpdateManyArgs>(args: SelectSubset<T, OutgoingEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one OutgoingEvent.
     * @param {OutgoingEventUpsertArgs} args - Arguments to update or create a OutgoingEvent.
     * @example
     * // Update or create a OutgoingEvent
     * const outgoingEvent = await prisma.outgoingEvent.upsert({
     *   create: {
     *     // ... data to create a OutgoingEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OutgoingEvent we want to update
     *   }
     * })
     */
    upsert<T extends OutgoingEventUpsertArgs>(args: SelectSubset<T, OutgoingEventUpsertArgs<ExtArgs>>): Prisma__OutgoingEventClient<$Result.GetResult<Prisma.$OutgoingEventPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of OutgoingEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OutgoingEventCountArgs} args - Arguments to filter OutgoingEvents to count.
     * @example
     * // Count the number of OutgoingEvents
     * const count = await prisma.outgoingEvent.count({
     *   where: {
     *     // ... the filter for the OutgoingEvents we want to count
     *   }
     * })
    **/
    count<T extends OutgoingEventCountArgs>(
      args?: Subset<T, OutgoingEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OutgoingEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OutgoingEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OutgoingEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OutgoingEventAggregateArgs>(args: Subset<T, OutgoingEventAggregateArgs>): Prisma.PrismaPromise<GetOutgoingEventAggregateType<T>>

    /**
     * Group by OutgoingEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OutgoingEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OutgoingEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OutgoingEventGroupByArgs['orderBy'] }
        : { orderBy?: OutgoingEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OutgoingEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOutgoingEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OutgoingEvent model
   */
  readonly fields: OutgoingEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OutgoingEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OutgoingEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the OutgoingEvent model
   */ 
  interface OutgoingEventFieldRefs {
    readonly id: FieldRef<"OutgoingEvent", 'String'>
    readonly eventType: FieldRef<"OutgoingEvent", 'String'>
    readonly aggregateId: FieldRef<"OutgoingEvent", 'String'>
    readonly payload: FieldRef<"OutgoingEvent", 'Json'>
    readonly status: FieldRef<"OutgoingEvent", 'OutgoingEventStatus'>
    readonly attempts: FieldRef<"OutgoingEvent", 'Int'>
    readonly lastError: FieldRef<"OutgoingEvent", 'String'>
    readonly createdAt: FieldRef<"OutgoingEvent", 'DateTime'>
    readonly sentAt: FieldRef<"OutgoingEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * OutgoingEvent findUnique
   */
  export type OutgoingEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * Filter, which OutgoingEvent to fetch.
     */
    where: OutgoingEventWhereUniqueInput
  }

  /**
   * OutgoingEvent findUniqueOrThrow
   */
  export type OutgoingEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * Filter, which OutgoingEvent to fetch.
     */
    where: OutgoingEventWhereUniqueInput
  }

  /**
   * OutgoingEvent findFirst
   */
  export type OutgoingEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * Filter, which OutgoingEvent to fetch.
     */
    where?: OutgoingEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OutgoingEvents to fetch.
     */
    orderBy?: OutgoingEventOrderByWithRelationInput | OutgoingEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OutgoingEvents.
     */
    cursor?: OutgoingEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OutgoingEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OutgoingEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OutgoingEvents.
     */
    distinct?: OutgoingEventScalarFieldEnum | OutgoingEventScalarFieldEnum[]
  }

  /**
   * OutgoingEvent findFirstOrThrow
   */
  export type OutgoingEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * Filter, which OutgoingEvent to fetch.
     */
    where?: OutgoingEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OutgoingEvents to fetch.
     */
    orderBy?: OutgoingEventOrderByWithRelationInput | OutgoingEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OutgoingEvents.
     */
    cursor?: OutgoingEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OutgoingEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OutgoingEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OutgoingEvents.
     */
    distinct?: OutgoingEventScalarFieldEnum | OutgoingEventScalarFieldEnum[]
  }

  /**
   * OutgoingEvent findMany
   */
  export type OutgoingEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * Filter, which OutgoingEvents to fetch.
     */
    where?: OutgoingEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OutgoingEvents to fetch.
     */
    orderBy?: OutgoingEventOrderByWithRelationInput | OutgoingEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OutgoingEvents.
     */
    cursor?: OutgoingEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OutgoingEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OutgoingEvents.
     */
    skip?: number
    distinct?: OutgoingEventScalarFieldEnum | OutgoingEventScalarFieldEnum[]
  }

  /**
   * OutgoingEvent create
   */
  export type OutgoingEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * The data needed to create a OutgoingEvent.
     */
    data: XOR<OutgoingEventCreateInput, OutgoingEventUncheckedCreateInput>
  }

  /**
   * OutgoingEvent createMany
   */
  export type OutgoingEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OutgoingEvents.
     */
    data: OutgoingEventCreateManyInput | OutgoingEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OutgoingEvent createManyAndReturn
   */
  export type OutgoingEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many OutgoingEvents.
     */
    data: OutgoingEventCreateManyInput | OutgoingEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OutgoingEvent update
   */
  export type OutgoingEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * The data needed to update a OutgoingEvent.
     */
    data: XOR<OutgoingEventUpdateInput, OutgoingEventUncheckedUpdateInput>
    /**
     * Choose, which OutgoingEvent to update.
     */
    where: OutgoingEventWhereUniqueInput
  }

  /**
   * OutgoingEvent updateMany
   */
  export type OutgoingEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OutgoingEvents.
     */
    data: XOR<OutgoingEventUpdateManyMutationInput, OutgoingEventUncheckedUpdateManyInput>
    /**
     * Filter which OutgoingEvents to update
     */
    where?: OutgoingEventWhereInput
  }

  /**
   * OutgoingEvent upsert
   */
  export type OutgoingEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * The filter to search for the OutgoingEvent to update in case it exists.
     */
    where: OutgoingEventWhereUniqueInput
    /**
     * In case the OutgoingEvent found by the `where` argument doesn't exist, create a new OutgoingEvent with this data.
     */
    create: XOR<OutgoingEventCreateInput, OutgoingEventUncheckedCreateInput>
    /**
     * In case the OutgoingEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OutgoingEventUpdateInput, OutgoingEventUncheckedUpdateInput>
  }

  /**
   * OutgoingEvent delete
   */
  export type OutgoingEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
    /**
     * Filter which OutgoingEvent to delete.
     */
    where: OutgoingEventWhereUniqueInput
  }

  /**
   * OutgoingEvent deleteMany
   */
  export type OutgoingEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OutgoingEvents to delete
     */
    where?: OutgoingEventWhereInput
  }

  /**
   * OutgoingEvent without action
   */
  export type OutgoingEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OutgoingEvent
     */
    select?: OutgoingEventSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const SubmissionScalarFieldEnum: {
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

  export type SubmissionScalarFieldEnum = (typeof SubmissionScalarFieldEnum)[keyof typeof SubmissionScalarFieldEnum]


  export const MatchingSignalScalarFieldEnum: {
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

  export type MatchingSignalScalarFieldEnum = (typeof MatchingSignalScalarFieldEnum)[keyof typeof MatchingSignalScalarFieldEnum]


  export const ProcessedEventScalarFieldEnum: {
    eventId: 'eventId',
    eventType: 'eventType',
    processedAt: 'processedAt'
  };

  export type ProcessedEventScalarFieldEnum = (typeof ProcessedEventScalarFieldEnum)[keyof typeof ProcessedEventScalarFieldEnum]


  export const OutgoingEventScalarFieldEnum: {
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

  export type OutgoingEventScalarFieldEnum = (typeof OutgoingEventScalarFieldEnum)[keyof typeof OutgoingEventScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'SubmitterRole'
   */
  export type EnumSubmitterRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubmitterRole'>
    


  /**
   * Reference to a field of type 'SubmitterRole[]'
   */
  export type ListEnumSubmitterRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubmitterRole[]'>
    


  /**
   * Reference to a field of type 'SubmissionStatus'
   */
  export type EnumSubmissionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubmissionStatus'>
    


  /**
   * Reference to a field of type 'SubmissionStatus[]'
   */
  export type ListEnumSubmissionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubmissionStatus[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'OutgoingEventStatus'
   */
  export type EnumOutgoingEventStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OutgoingEventStatus'>
    


  /**
   * Reference to a field of type 'OutgoingEventStatus[]'
   */
  export type ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OutgoingEventStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type SubmissionWhereInput = {
    AND?: SubmissionWhereInput | SubmissionWhereInput[]
    OR?: SubmissionWhereInput[]
    NOT?: SubmissionWhereInput | SubmissionWhereInput[]
    id?: StringFilter<"Submission"> | string
    requirementId?: StringFilter<"Submission"> | string
    candidateId?: StringFilter<"Submission"> | string
    submittedByUserId?: StringFilter<"Submission"> | string
    submitterRole?: EnumSubmitterRoleFilter<"Submission"> | $Enums.SubmitterRole
    attributedSrmId?: StringNullableFilter<"Submission"> | string | null
    attributedMsmeId?: StringNullableFilter<"Submission"> | string | null
    status?: EnumSubmissionStatusFilter<"Submission"> | $Enums.SubmissionStatus
    matchScore?: IntNullableFilter<"Submission"> | number | null
    coverNote?: StringNullableFilter<"Submission"> | string | null
    proposedBillRate?: DecimalNullableFilter<"Submission"> | Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: DateTimeNullableFilter<"Submission"> | Date | string | null
    withdrawnReason?: StringNullableFilter<"Submission"> | string | null
    rejectedAt?: DateTimeNullableFilter<"Submission"> | Date | string | null
    rejectionReason?: StringNullableFilter<"Submission"> | string | null
    createdAt?: DateTimeFilter<"Submission"> | Date | string
    updatedAt?: DateTimeFilter<"Submission"> | Date | string
  }

  export type SubmissionOrderByWithRelationInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    submittedByUserId?: SortOrder
    submitterRole?: SortOrder
    attributedSrmId?: SortOrderInput | SortOrder
    attributedMsmeId?: SortOrderInput | SortOrder
    status?: SortOrder
    matchScore?: SortOrderInput | SortOrder
    coverNote?: SortOrderInput | SortOrder
    proposedBillRate?: SortOrderInput | SortOrder
    withdrawnAt?: SortOrderInput | SortOrder
    withdrawnReason?: SortOrderInput | SortOrder
    rejectedAt?: SortOrderInput | SortOrder
    rejectionReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubmissionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    requirementId_candidateId?: SubmissionRequirementIdCandidateIdCompoundUniqueInput
    AND?: SubmissionWhereInput | SubmissionWhereInput[]
    OR?: SubmissionWhereInput[]
    NOT?: SubmissionWhereInput | SubmissionWhereInput[]
    requirementId?: StringFilter<"Submission"> | string
    candidateId?: StringFilter<"Submission"> | string
    submittedByUserId?: StringFilter<"Submission"> | string
    submitterRole?: EnumSubmitterRoleFilter<"Submission"> | $Enums.SubmitterRole
    attributedSrmId?: StringNullableFilter<"Submission"> | string | null
    attributedMsmeId?: StringNullableFilter<"Submission"> | string | null
    status?: EnumSubmissionStatusFilter<"Submission"> | $Enums.SubmissionStatus
    matchScore?: IntNullableFilter<"Submission"> | number | null
    coverNote?: StringNullableFilter<"Submission"> | string | null
    proposedBillRate?: DecimalNullableFilter<"Submission"> | Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: DateTimeNullableFilter<"Submission"> | Date | string | null
    withdrawnReason?: StringNullableFilter<"Submission"> | string | null
    rejectedAt?: DateTimeNullableFilter<"Submission"> | Date | string | null
    rejectionReason?: StringNullableFilter<"Submission"> | string | null
    createdAt?: DateTimeFilter<"Submission"> | Date | string
    updatedAt?: DateTimeFilter<"Submission"> | Date | string
  }, "id" | "requirementId_candidateId">

  export type SubmissionOrderByWithAggregationInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    submittedByUserId?: SortOrder
    submitterRole?: SortOrder
    attributedSrmId?: SortOrderInput | SortOrder
    attributedMsmeId?: SortOrderInput | SortOrder
    status?: SortOrder
    matchScore?: SortOrderInput | SortOrder
    coverNote?: SortOrderInput | SortOrder
    proposedBillRate?: SortOrderInput | SortOrder
    withdrawnAt?: SortOrderInput | SortOrder
    withdrawnReason?: SortOrderInput | SortOrder
    rejectedAt?: SortOrderInput | SortOrder
    rejectionReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SubmissionCountOrderByAggregateInput
    _avg?: SubmissionAvgOrderByAggregateInput
    _max?: SubmissionMaxOrderByAggregateInput
    _min?: SubmissionMinOrderByAggregateInput
    _sum?: SubmissionSumOrderByAggregateInput
  }

  export type SubmissionScalarWhereWithAggregatesInput = {
    AND?: SubmissionScalarWhereWithAggregatesInput | SubmissionScalarWhereWithAggregatesInput[]
    OR?: SubmissionScalarWhereWithAggregatesInput[]
    NOT?: SubmissionScalarWhereWithAggregatesInput | SubmissionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Submission"> | string
    requirementId?: StringWithAggregatesFilter<"Submission"> | string
    candidateId?: StringWithAggregatesFilter<"Submission"> | string
    submittedByUserId?: StringWithAggregatesFilter<"Submission"> | string
    submitterRole?: EnumSubmitterRoleWithAggregatesFilter<"Submission"> | $Enums.SubmitterRole
    attributedSrmId?: StringNullableWithAggregatesFilter<"Submission"> | string | null
    attributedMsmeId?: StringNullableWithAggregatesFilter<"Submission"> | string | null
    status?: EnumSubmissionStatusWithAggregatesFilter<"Submission"> | $Enums.SubmissionStatus
    matchScore?: IntNullableWithAggregatesFilter<"Submission"> | number | null
    coverNote?: StringNullableWithAggregatesFilter<"Submission"> | string | null
    proposedBillRate?: DecimalNullableWithAggregatesFilter<"Submission"> | Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: DateTimeNullableWithAggregatesFilter<"Submission"> | Date | string | null
    withdrawnReason?: StringNullableWithAggregatesFilter<"Submission"> | string | null
    rejectedAt?: DateTimeNullableWithAggregatesFilter<"Submission"> | Date | string | null
    rejectionReason?: StringNullableWithAggregatesFilter<"Submission"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Submission"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Submission"> | Date | string
  }

  export type MatchingSignalWhereInput = {
    AND?: MatchingSignalWhereInput | MatchingSignalWhereInput[]
    OR?: MatchingSignalWhereInput[]
    NOT?: MatchingSignalWhereInput | MatchingSignalWhereInput[]
    id?: StringFilter<"MatchingSignal"> | string
    requirementId?: StringFilter<"MatchingSignal"> | string
    candidateId?: StringFilter<"MatchingSignal"> | string
    skillOverlap?: IntFilter<"MatchingSignal"> | number
    seniorityMatch?: BoolFilter<"MatchingSignal"> | boolean
    locationMatch?: BoolFilter<"MatchingSignal"> | boolean
    workAuthMatch?: BoolFilter<"MatchingSignal"> | boolean
    candidateRating?: DecimalFilter<"MatchingSignal"> | Decimal | DecimalJsLike | number | string
    matchScore?: IntFilter<"MatchingSignal"> | number
    computedAt?: DateTimeFilter<"MatchingSignal"> | Date | string
  }

  export type MatchingSignalOrderByWithRelationInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    skillOverlap?: SortOrder
    seniorityMatch?: SortOrder
    locationMatch?: SortOrder
    workAuthMatch?: SortOrder
    candidateRating?: SortOrder
    matchScore?: SortOrder
    computedAt?: SortOrder
  }

  export type MatchingSignalWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    requirementId_candidateId?: MatchingSignalRequirementIdCandidateIdCompoundUniqueInput
    AND?: MatchingSignalWhereInput | MatchingSignalWhereInput[]
    OR?: MatchingSignalWhereInput[]
    NOT?: MatchingSignalWhereInput | MatchingSignalWhereInput[]
    requirementId?: StringFilter<"MatchingSignal"> | string
    candidateId?: StringFilter<"MatchingSignal"> | string
    skillOverlap?: IntFilter<"MatchingSignal"> | number
    seniorityMatch?: BoolFilter<"MatchingSignal"> | boolean
    locationMatch?: BoolFilter<"MatchingSignal"> | boolean
    workAuthMatch?: BoolFilter<"MatchingSignal"> | boolean
    candidateRating?: DecimalFilter<"MatchingSignal"> | Decimal | DecimalJsLike | number | string
    matchScore?: IntFilter<"MatchingSignal"> | number
    computedAt?: DateTimeFilter<"MatchingSignal"> | Date | string
  }, "id" | "requirementId_candidateId">

  export type MatchingSignalOrderByWithAggregationInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    skillOverlap?: SortOrder
    seniorityMatch?: SortOrder
    locationMatch?: SortOrder
    workAuthMatch?: SortOrder
    candidateRating?: SortOrder
    matchScore?: SortOrder
    computedAt?: SortOrder
    _count?: MatchingSignalCountOrderByAggregateInput
    _avg?: MatchingSignalAvgOrderByAggregateInput
    _max?: MatchingSignalMaxOrderByAggregateInput
    _min?: MatchingSignalMinOrderByAggregateInput
    _sum?: MatchingSignalSumOrderByAggregateInput
  }

  export type MatchingSignalScalarWhereWithAggregatesInput = {
    AND?: MatchingSignalScalarWhereWithAggregatesInput | MatchingSignalScalarWhereWithAggregatesInput[]
    OR?: MatchingSignalScalarWhereWithAggregatesInput[]
    NOT?: MatchingSignalScalarWhereWithAggregatesInput | MatchingSignalScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MatchingSignal"> | string
    requirementId?: StringWithAggregatesFilter<"MatchingSignal"> | string
    candidateId?: StringWithAggregatesFilter<"MatchingSignal"> | string
    skillOverlap?: IntWithAggregatesFilter<"MatchingSignal"> | number
    seniorityMatch?: BoolWithAggregatesFilter<"MatchingSignal"> | boolean
    locationMatch?: BoolWithAggregatesFilter<"MatchingSignal"> | boolean
    workAuthMatch?: BoolWithAggregatesFilter<"MatchingSignal"> | boolean
    candidateRating?: DecimalWithAggregatesFilter<"MatchingSignal"> | Decimal | DecimalJsLike | number | string
    matchScore?: IntWithAggregatesFilter<"MatchingSignal"> | number
    computedAt?: DateTimeWithAggregatesFilter<"MatchingSignal"> | Date | string
  }

  export type ProcessedEventWhereInput = {
    AND?: ProcessedEventWhereInput | ProcessedEventWhereInput[]
    OR?: ProcessedEventWhereInput[]
    NOT?: ProcessedEventWhereInput | ProcessedEventWhereInput[]
    eventId?: StringFilter<"ProcessedEvent"> | string
    eventType?: StringFilter<"ProcessedEvent"> | string
    processedAt?: DateTimeFilter<"ProcessedEvent"> | Date | string
  }

  export type ProcessedEventOrderByWithRelationInput = {
    eventId?: SortOrder
    eventType?: SortOrder
    processedAt?: SortOrder
  }

  export type ProcessedEventWhereUniqueInput = Prisma.AtLeast<{
    eventId?: string
    AND?: ProcessedEventWhereInput | ProcessedEventWhereInput[]
    OR?: ProcessedEventWhereInput[]
    NOT?: ProcessedEventWhereInput | ProcessedEventWhereInput[]
    eventType?: StringFilter<"ProcessedEvent"> | string
    processedAt?: DateTimeFilter<"ProcessedEvent"> | Date | string
  }, "eventId">

  export type ProcessedEventOrderByWithAggregationInput = {
    eventId?: SortOrder
    eventType?: SortOrder
    processedAt?: SortOrder
    _count?: ProcessedEventCountOrderByAggregateInput
    _max?: ProcessedEventMaxOrderByAggregateInput
    _min?: ProcessedEventMinOrderByAggregateInput
  }

  export type ProcessedEventScalarWhereWithAggregatesInput = {
    AND?: ProcessedEventScalarWhereWithAggregatesInput | ProcessedEventScalarWhereWithAggregatesInput[]
    OR?: ProcessedEventScalarWhereWithAggregatesInput[]
    NOT?: ProcessedEventScalarWhereWithAggregatesInput | ProcessedEventScalarWhereWithAggregatesInput[]
    eventId?: StringWithAggregatesFilter<"ProcessedEvent"> | string
    eventType?: StringWithAggregatesFilter<"ProcessedEvent"> | string
    processedAt?: DateTimeWithAggregatesFilter<"ProcessedEvent"> | Date | string
  }

  export type OutgoingEventWhereInput = {
    AND?: OutgoingEventWhereInput | OutgoingEventWhereInput[]
    OR?: OutgoingEventWhereInput[]
    NOT?: OutgoingEventWhereInput | OutgoingEventWhereInput[]
    id?: StringFilter<"OutgoingEvent"> | string
    eventType?: StringFilter<"OutgoingEvent"> | string
    aggregateId?: StringFilter<"OutgoingEvent"> | string
    payload?: JsonFilter<"OutgoingEvent">
    status?: EnumOutgoingEventStatusFilter<"OutgoingEvent"> | $Enums.OutgoingEventStatus
    attempts?: IntFilter<"OutgoingEvent"> | number
    lastError?: StringNullableFilter<"OutgoingEvent"> | string | null
    createdAt?: DateTimeFilter<"OutgoingEvent"> | Date | string
    sentAt?: DateTimeNullableFilter<"OutgoingEvent"> | Date | string | null
  }

  export type OutgoingEventOrderByWithRelationInput = {
    id?: SortOrder
    eventType?: SortOrder
    aggregateId?: SortOrder
    payload?: SortOrder
    status?: SortOrder
    attempts?: SortOrder
    lastError?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    sentAt?: SortOrderInput | SortOrder
  }

  export type OutgoingEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: OutgoingEventWhereInput | OutgoingEventWhereInput[]
    OR?: OutgoingEventWhereInput[]
    NOT?: OutgoingEventWhereInput | OutgoingEventWhereInput[]
    eventType?: StringFilter<"OutgoingEvent"> | string
    aggregateId?: StringFilter<"OutgoingEvent"> | string
    payload?: JsonFilter<"OutgoingEvent">
    status?: EnumOutgoingEventStatusFilter<"OutgoingEvent"> | $Enums.OutgoingEventStatus
    attempts?: IntFilter<"OutgoingEvent"> | number
    lastError?: StringNullableFilter<"OutgoingEvent"> | string | null
    createdAt?: DateTimeFilter<"OutgoingEvent"> | Date | string
    sentAt?: DateTimeNullableFilter<"OutgoingEvent"> | Date | string | null
  }, "id">

  export type OutgoingEventOrderByWithAggregationInput = {
    id?: SortOrder
    eventType?: SortOrder
    aggregateId?: SortOrder
    payload?: SortOrder
    status?: SortOrder
    attempts?: SortOrder
    lastError?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    sentAt?: SortOrderInput | SortOrder
    _count?: OutgoingEventCountOrderByAggregateInput
    _avg?: OutgoingEventAvgOrderByAggregateInput
    _max?: OutgoingEventMaxOrderByAggregateInput
    _min?: OutgoingEventMinOrderByAggregateInput
    _sum?: OutgoingEventSumOrderByAggregateInput
  }

  export type OutgoingEventScalarWhereWithAggregatesInput = {
    AND?: OutgoingEventScalarWhereWithAggregatesInput | OutgoingEventScalarWhereWithAggregatesInput[]
    OR?: OutgoingEventScalarWhereWithAggregatesInput[]
    NOT?: OutgoingEventScalarWhereWithAggregatesInput | OutgoingEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"OutgoingEvent"> | string
    eventType?: StringWithAggregatesFilter<"OutgoingEvent"> | string
    aggregateId?: StringWithAggregatesFilter<"OutgoingEvent"> | string
    payload?: JsonWithAggregatesFilter<"OutgoingEvent">
    status?: EnumOutgoingEventStatusWithAggregatesFilter<"OutgoingEvent"> | $Enums.OutgoingEventStatus
    attempts?: IntWithAggregatesFilter<"OutgoingEvent"> | number
    lastError?: StringNullableWithAggregatesFilter<"OutgoingEvent"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"OutgoingEvent"> | Date | string
    sentAt?: DateTimeNullableWithAggregatesFilter<"OutgoingEvent"> | Date | string | null
  }

  export type SubmissionCreateInput = {
    id?: string
    requirementId: string
    candidateId: string
    submittedByUserId: string
    submitterRole: $Enums.SubmitterRole
    attributedSrmId?: string | null
    attributedMsmeId?: string | null
    status?: $Enums.SubmissionStatus
    matchScore?: number | null
    coverNote?: string | null
    proposedBillRate?: Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: Date | string | null
    withdrawnReason?: string | null
    rejectedAt?: Date | string | null
    rejectionReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionUncheckedCreateInput = {
    id?: string
    requirementId: string
    candidateId: string
    submittedByUserId: string
    submitterRole: $Enums.SubmitterRole
    attributedSrmId?: string | null
    attributedMsmeId?: string | null
    status?: $Enums.SubmissionStatus
    matchScore?: number | null
    coverNote?: string | null
    proposedBillRate?: Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: Date | string | null
    withdrawnReason?: string | null
    rejectedAt?: Date | string | null
    rejectionReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    requirementId?: StringFieldUpdateOperationsInput | string
    candidateId?: StringFieldUpdateOperationsInput | string
    submittedByUserId?: StringFieldUpdateOperationsInput | string
    submitterRole?: EnumSubmitterRoleFieldUpdateOperationsInput | $Enums.SubmitterRole
    attributedSrmId?: NullableStringFieldUpdateOperationsInput | string | null
    attributedMsmeId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    matchScore?: NullableIntFieldUpdateOperationsInput | number | null
    coverNote?: NullableStringFieldUpdateOperationsInput | string | null
    proposedBillRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    withdrawnReason?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    requirementId?: StringFieldUpdateOperationsInput | string
    candidateId?: StringFieldUpdateOperationsInput | string
    submittedByUserId?: StringFieldUpdateOperationsInput | string
    submitterRole?: EnumSubmitterRoleFieldUpdateOperationsInput | $Enums.SubmitterRole
    attributedSrmId?: NullableStringFieldUpdateOperationsInput | string | null
    attributedMsmeId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    matchScore?: NullableIntFieldUpdateOperationsInput | number | null
    coverNote?: NullableStringFieldUpdateOperationsInput | string | null
    proposedBillRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    withdrawnReason?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionCreateManyInput = {
    id?: string
    requirementId: string
    candidateId: string
    submittedByUserId: string
    submitterRole: $Enums.SubmitterRole
    attributedSrmId?: string | null
    attributedMsmeId?: string | null
    status?: $Enums.SubmissionStatus
    matchScore?: number | null
    coverNote?: string | null
    proposedBillRate?: Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: Date | string | null
    withdrawnReason?: string | null
    rejectedAt?: Date | string | null
    rejectionReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    requirementId?: StringFieldUpdateOperationsInput | string
    candidateId?: StringFieldUpdateOperationsInput | string
    submittedByUserId?: StringFieldUpdateOperationsInput | string
    submitterRole?: EnumSubmitterRoleFieldUpdateOperationsInput | $Enums.SubmitterRole
    attributedSrmId?: NullableStringFieldUpdateOperationsInput | string | null
    attributedMsmeId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    matchScore?: NullableIntFieldUpdateOperationsInput | number | null
    coverNote?: NullableStringFieldUpdateOperationsInput | string | null
    proposedBillRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    withdrawnReason?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    requirementId?: StringFieldUpdateOperationsInput | string
    candidateId?: StringFieldUpdateOperationsInput | string
    submittedByUserId?: StringFieldUpdateOperationsInput | string
    submitterRole?: EnumSubmitterRoleFieldUpdateOperationsInput | $Enums.SubmitterRole
    attributedSrmId?: NullableStringFieldUpdateOperationsInput | string | null
    attributedMsmeId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    matchScore?: NullableIntFieldUpdateOperationsInput | number | null
    coverNote?: NullableStringFieldUpdateOperationsInput | string | null
    proposedBillRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    withdrawnAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    withdrawnReason?: NullableStringFieldUpdateOperationsInput | string | null
    rejectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rejectionReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MatchingSignalCreateInput = {
    id?: string
    requirementId: string
    candidateId: string
    skillOverlap: number
    seniorityMatch: boolean
    locationMatch: boolean
    workAuthMatch: boolean
    candidateRating: Decimal | DecimalJsLike | number | string
    matchScore: number
    computedAt?: Date | string
  }

  export type MatchingSignalUncheckedCreateInput = {
    id?: string
    requirementId: string
    candidateId: string
    skillOverlap: number
    seniorityMatch: boolean
    locationMatch: boolean
    workAuthMatch: boolean
    candidateRating: Decimal | DecimalJsLike | number | string
    matchScore: number
    computedAt?: Date | string
  }

  export type MatchingSignalUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    requirementId?: StringFieldUpdateOperationsInput | string
    candidateId?: StringFieldUpdateOperationsInput | string
    skillOverlap?: IntFieldUpdateOperationsInput | number
    seniorityMatch?: BoolFieldUpdateOperationsInput | boolean
    locationMatch?: BoolFieldUpdateOperationsInput | boolean
    workAuthMatch?: BoolFieldUpdateOperationsInput | boolean
    candidateRating?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    matchScore?: IntFieldUpdateOperationsInput | number
    computedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MatchingSignalUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    requirementId?: StringFieldUpdateOperationsInput | string
    candidateId?: StringFieldUpdateOperationsInput | string
    skillOverlap?: IntFieldUpdateOperationsInput | number
    seniorityMatch?: BoolFieldUpdateOperationsInput | boolean
    locationMatch?: BoolFieldUpdateOperationsInput | boolean
    workAuthMatch?: BoolFieldUpdateOperationsInput | boolean
    candidateRating?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    matchScore?: IntFieldUpdateOperationsInput | number
    computedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MatchingSignalCreateManyInput = {
    id?: string
    requirementId: string
    candidateId: string
    skillOverlap: number
    seniorityMatch: boolean
    locationMatch: boolean
    workAuthMatch: boolean
    candidateRating: Decimal | DecimalJsLike | number | string
    matchScore: number
    computedAt?: Date | string
  }

  export type MatchingSignalUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    requirementId?: StringFieldUpdateOperationsInput | string
    candidateId?: StringFieldUpdateOperationsInput | string
    skillOverlap?: IntFieldUpdateOperationsInput | number
    seniorityMatch?: BoolFieldUpdateOperationsInput | boolean
    locationMatch?: BoolFieldUpdateOperationsInput | boolean
    workAuthMatch?: BoolFieldUpdateOperationsInput | boolean
    candidateRating?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    matchScore?: IntFieldUpdateOperationsInput | number
    computedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MatchingSignalUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    requirementId?: StringFieldUpdateOperationsInput | string
    candidateId?: StringFieldUpdateOperationsInput | string
    skillOverlap?: IntFieldUpdateOperationsInput | number
    seniorityMatch?: BoolFieldUpdateOperationsInput | boolean
    locationMatch?: BoolFieldUpdateOperationsInput | boolean
    workAuthMatch?: BoolFieldUpdateOperationsInput | boolean
    candidateRating?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    matchScore?: IntFieldUpdateOperationsInput | number
    computedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessedEventCreateInput = {
    eventId: string
    eventType: string
    processedAt?: Date | string
  }

  export type ProcessedEventUncheckedCreateInput = {
    eventId: string
    eventType: string
    processedAt?: Date | string
  }

  export type ProcessedEventUpdateInput = {
    eventId?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    processedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessedEventUncheckedUpdateInput = {
    eventId?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    processedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessedEventCreateManyInput = {
    eventId: string
    eventType: string
    processedAt?: Date | string
  }

  export type ProcessedEventUpdateManyMutationInput = {
    eventId?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    processedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessedEventUncheckedUpdateManyInput = {
    eventId?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    processedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OutgoingEventCreateInput = {
    id?: string
    eventType: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.OutgoingEventStatus
    attempts?: number
    lastError?: string | null
    createdAt?: Date | string
    sentAt?: Date | string | null
  }

  export type OutgoingEventUncheckedCreateInput = {
    id?: string
    eventType: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.OutgoingEventStatus
    attempts?: number
    lastError?: string | null
    createdAt?: Date | string
    sentAt?: Date | string | null
  }

  export type OutgoingEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumOutgoingEventStatusFieldUpdateOperationsInput | $Enums.OutgoingEventStatus
    attempts?: IntFieldUpdateOperationsInput | number
    lastError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OutgoingEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumOutgoingEventStatusFieldUpdateOperationsInput | $Enums.OutgoingEventStatus
    attempts?: IntFieldUpdateOperationsInput | number
    lastError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OutgoingEventCreateManyInput = {
    id?: string
    eventType: string
    aggregateId: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.OutgoingEventStatus
    attempts?: number
    lastError?: string | null
    createdAt?: Date | string
    sentAt?: Date | string | null
  }

  export type OutgoingEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumOutgoingEventStatusFieldUpdateOperationsInput | $Enums.OutgoingEventStatus
    attempts?: IntFieldUpdateOperationsInput | number
    lastError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OutgoingEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    aggregateId?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumOutgoingEventStatusFieldUpdateOperationsInput | $Enums.OutgoingEventStatus
    attempts?: IntFieldUpdateOperationsInput | number
    lastError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type EnumSubmitterRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmitterRole | EnumSubmitterRoleFieldRefInput<$PrismaModel>
    in?: $Enums.SubmitterRole[] | ListEnumSubmitterRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmitterRole[] | ListEnumSubmitterRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmitterRoleFilter<$PrismaModel> | $Enums.SubmitterRole
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumSubmissionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusFilter<$PrismaModel> | $Enums.SubmissionStatus
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SubmissionRequirementIdCandidateIdCompoundUniqueInput = {
    requirementId: string
    candidateId: string
  }

  export type SubmissionCountOrderByAggregateInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    submittedByUserId?: SortOrder
    submitterRole?: SortOrder
    attributedSrmId?: SortOrder
    attributedMsmeId?: SortOrder
    status?: SortOrder
    matchScore?: SortOrder
    coverNote?: SortOrder
    proposedBillRate?: SortOrder
    withdrawnAt?: SortOrder
    withdrawnReason?: SortOrder
    rejectedAt?: SortOrder
    rejectionReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubmissionAvgOrderByAggregateInput = {
    matchScore?: SortOrder
    proposedBillRate?: SortOrder
  }

  export type SubmissionMaxOrderByAggregateInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    submittedByUserId?: SortOrder
    submitterRole?: SortOrder
    attributedSrmId?: SortOrder
    attributedMsmeId?: SortOrder
    status?: SortOrder
    matchScore?: SortOrder
    coverNote?: SortOrder
    proposedBillRate?: SortOrder
    withdrawnAt?: SortOrder
    withdrawnReason?: SortOrder
    rejectedAt?: SortOrder
    rejectionReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubmissionMinOrderByAggregateInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    submittedByUserId?: SortOrder
    submitterRole?: SortOrder
    attributedSrmId?: SortOrder
    attributedMsmeId?: SortOrder
    status?: SortOrder
    matchScore?: SortOrder
    coverNote?: SortOrder
    proposedBillRate?: SortOrder
    withdrawnAt?: SortOrder
    withdrawnReason?: SortOrder
    rejectedAt?: SortOrder
    rejectionReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubmissionSumOrderByAggregateInput = {
    matchScore?: SortOrder
    proposedBillRate?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumSubmitterRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmitterRole | EnumSubmitterRoleFieldRefInput<$PrismaModel>
    in?: $Enums.SubmitterRole[] | ListEnumSubmitterRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmitterRole[] | ListEnumSubmitterRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmitterRoleWithAggregatesFilter<$PrismaModel> | $Enums.SubmitterRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubmitterRoleFilter<$PrismaModel>
    _max?: NestedEnumSubmitterRoleFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumSubmissionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubmissionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubmissionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubmissionStatusFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type MatchingSignalRequirementIdCandidateIdCompoundUniqueInput = {
    requirementId: string
    candidateId: string
  }

  export type MatchingSignalCountOrderByAggregateInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    skillOverlap?: SortOrder
    seniorityMatch?: SortOrder
    locationMatch?: SortOrder
    workAuthMatch?: SortOrder
    candidateRating?: SortOrder
    matchScore?: SortOrder
    computedAt?: SortOrder
  }

  export type MatchingSignalAvgOrderByAggregateInput = {
    skillOverlap?: SortOrder
    candidateRating?: SortOrder
    matchScore?: SortOrder
  }

  export type MatchingSignalMaxOrderByAggregateInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    skillOverlap?: SortOrder
    seniorityMatch?: SortOrder
    locationMatch?: SortOrder
    workAuthMatch?: SortOrder
    candidateRating?: SortOrder
    matchScore?: SortOrder
    computedAt?: SortOrder
  }

  export type MatchingSignalMinOrderByAggregateInput = {
    id?: SortOrder
    requirementId?: SortOrder
    candidateId?: SortOrder
    skillOverlap?: SortOrder
    seniorityMatch?: SortOrder
    locationMatch?: SortOrder
    workAuthMatch?: SortOrder
    candidateRating?: SortOrder
    matchScore?: SortOrder
    computedAt?: SortOrder
  }

  export type MatchingSignalSumOrderByAggregateInput = {
    skillOverlap?: SortOrder
    candidateRating?: SortOrder
    matchScore?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type ProcessedEventCountOrderByAggregateInput = {
    eventId?: SortOrder
    eventType?: SortOrder
    processedAt?: SortOrder
  }

  export type ProcessedEventMaxOrderByAggregateInput = {
    eventId?: SortOrder
    eventType?: SortOrder
    processedAt?: SortOrder
  }

  export type ProcessedEventMinOrderByAggregateInput = {
    eventId?: SortOrder
    eventType?: SortOrder
    processedAt?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type EnumOutgoingEventStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.OutgoingEventStatus | EnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    in?: $Enums.OutgoingEventStatus[] | ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.OutgoingEventStatus[] | ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumOutgoingEventStatusFilter<$PrismaModel> | $Enums.OutgoingEventStatus
  }

  export type OutgoingEventCountOrderByAggregateInput = {
    id?: SortOrder
    eventType?: SortOrder
    aggregateId?: SortOrder
    payload?: SortOrder
    status?: SortOrder
    attempts?: SortOrder
    lastError?: SortOrder
    createdAt?: SortOrder
    sentAt?: SortOrder
  }

  export type OutgoingEventAvgOrderByAggregateInput = {
    attempts?: SortOrder
  }

  export type OutgoingEventMaxOrderByAggregateInput = {
    id?: SortOrder
    eventType?: SortOrder
    aggregateId?: SortOrder
    status?: SortOrder
    attempts?: SortOrder
    lastError?: SortOrder
    createdAt?: SortOrder
    sentAt?: SortOrder
  }

  export type OutgoingEventMinOrderByAggregateInput = {
    id?: SortOrder
    eventType?: SortOrder
    aggregateId?: SortOrder
    status?: SortOrder
    attempts?: SortOrder
    lastError?: SortOrder
    createdAt?: SortOrder
    sentAt?: SortOrder
  }

  export type OutgoingEventSumOrderByAggregateInput = {
    attempts?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type EnumOutgoingEventStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OutgoingEventStatus | EnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    in?: $Enums.OutgoingEventStatus[] | ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.OutgoingEventStatus[] | ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumOutgoingEventStatusWithAggregatesFilter<$PrismaModel> | $Enums.OutgoingEventStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOutgoingEventStatusFilter<$PrismaModel>
    _max?: NestedEnumOutgoingEventStatusFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumSubmitterRoleFieldUpdateOperationsInput = {
    set?: $Enums.SubmitterRole
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumSubmissionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SubmissionStatus
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type EnumOutgoingEventStatusFieldUpdateOperationsInput = {
    set?: $Enums.OutgoingEventStatus
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumSubmitterRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmitterRole | EnumSubmitterRoleFieldRefInput<$PrismaModel>
    in?: $Enums.SubmitterRole[] | ListEnumSubmitterRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmitterRole[] | ListEnumSubmitterRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmitterRoleFilter<$PrismaModel> | $Enums.SubmitterRole
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumSubmissionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusFilter<$PrismaModel> | $Enums.SubmissionStatus
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedEnumSubmitterRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmitterRole | EnumSubmitterRoleFieldRefInput<$PrismaModel>
    in?: $Enums.SubmitterRole[] | ListEnumSubmitterRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmitterRole[] | ListEnumSubmitterRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmitterRoleWithAggregatesFilter<$PrismaModel> | $Enums.SubmitterRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubmitterRoleFilter<$PrismaModel>
    _max?: NestedEnumSubmitterRoleFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubmissionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubmissionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubmissionStatusFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedEnumOutgoingEventStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.OutgoingEventStatus | EnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    in?: $Enums.OutgoingEventStatus[] | ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.OutgoingEventStatus[] | ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumOutgoingEventStatusFilter<$PrismaModel> | $Enums.OutgoingEventStatus
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumOutgoingEventStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OutgoingEventStatus | EnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    in?: $Enums.OutgoingEventStatus[] | ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.OutgoingEventStatus[] | ListEnumOutgoingEventStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumOutgoingEventStatusWithAggregatesFilter<$PrismaModel> | $Enums.OutgoingEventStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOutgoingEventStatusFilter<$PrismaModel>
    _max?: NestedEnumOutgoingEventStatusFilter<$PrismaModel>
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use SubmissionDefaultArgs instead
     */
    export type SubmissionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SubmissionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use MatchingSignalDefaultArgs instead
     */
    export type MatchingSignalArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = MatchingSignalDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ProcessedEventDefaultArgs instead
     */
    export type ProcessedEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ProcessedEventDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OutgoingEventDefaultArgs instead
     */
    export type OutgoingEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OutgoingEventDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}