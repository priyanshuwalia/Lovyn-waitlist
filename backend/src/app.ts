import cors from "cors";
import express, { type ErrorRequestHandler, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { config } from "./config";
import { createWaitlistEmailService, type WaitlistEmailService } from "./email-service";
import { prisma } from "./prisma";
import {
  adminParticipantsQuerySchema,
  seekingOptionLabels,
  waitlistSubmissionSchema,
  type WaitlistSubmission,
} from "./waitlist-contract";

type AdminIdentity = NonNullable<typeof config.admin>["user"];
type AdminRequest = Request & { admin: AdminIdentity };
type EmailDeliveryState = "SENT" | "SKIPPED" | "FAILED";

type CreateAppOptions = {
  emailService?: WaitlistEmailService;
};

class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const emailService = options.emailService ?? createWaitlistEmailService(config);

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy ? 1 : false);

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, "origin_not_allowed", "Origin is not allowed."));
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
      maxAge: 86_400,
    }),
  );

  app.use(express.json({ limit: "32kb" }));

  const waitlistLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.waitlistMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: "rate_limited",
        message: "Too many waitlist submissions. Please try again later.",
      },
    },
  });

  const adminLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.adminMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: "rate_limited",
        message: "Too many admin requests. Please try again later.",
      },
    },
  });

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      environment: config.nodeEnv,
    });
  });

  app.post(
    "/api/waitlist",
    waitlistLimiter,
    asyncHandler(async (request, response) => {
      const submission = waitlistSubmissionSchema.parse(request.body);

      const existingParticipant = await prisma.waitlistParticipant.findUnique({
        where: {
          email: submission.email,
        },
        select: {
          id: true,
        },
      });

      if (existingParticipant) {
        response.status(200).json({
          data: {
            id: existingParticipant.id,
            status: "already_registered",
          },
        });
        return;
      }

      let participant;

      try {
        participant = await prisma.waitlistParticipant.create({
          data: {
            fullName: submission.fullName,
            email: submission.email,
            seeking: submission.seeking,
          },
          select: {
            id: true,
          },
        });
      } catch (error) {
        if (!isPrismaUniqueConstraintError(error)) {
          throw error;
        }

        const duplicateParticipant = await prisma.waitlistParticipant.findUniqueOrThrow({
          where: {
            email: submission.email,
          },
          select: {
            id: true,
          },
        });

        response.status(200).json({
          data: {
            id: duplicateParticipant.id,
            status: "already_registered",
          },
        });
        return;
      }

      const confirmationEmailStatus = await updateEmailDeliveryState(participant.id, submission, emailService);

      response.status(201).json({
        data: {
          id: participant.id,
          status: "registered",
          confirmationEmailStatus,
        },
      });
    }),
  );

  app.get(
    "/api/admin/waitlist-participants",
    adminLimiter,
    requireAdmin,
    asyncHandler(async (request, response) => {
      const adminRequest = request as AdminRequest;
      const query = adminParticipantsQuerySchema.parse(request.query);
      const skip = (query.page - 1) * query.pageSize;

      const [total, participants] = await prisma.$transaction([
        prisma.waitlistParticipant.count(),
        prisma.waitlistParticipant.findMany({
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: query.pageSize,
          select: {
            id: true,
            fullName: true,
            email: true,
            seeking: true,
            confirmationEmailStatus: true,
            confirmationEmailSentAt: true,
            confirmationEmailFailure: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);

      response.json({
        data: participants.map(participant => ({
          id: participant.id,
          fullName: participant.fullName,
          email: participant.email,
          seeking: participant.seeking,
          seekingLabel: seekingOptionLabels.get(participant.seeking) ?? participant.seeking,
          confirmationEmailStatus: participant.confirmationEmailStatus,
          confirmationEmailSentAt: participant.confirmationEmailSentAt,
          confirmationEmailFailure: participant.confirmationEmailFailure,
          createdAt: participant.createdAt,
          updatedAt: participant.updatedAt,
        })),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
        requestedBy: adminRequest.admin,
      });
    }),
  );

  app.post(
    "/api/admin/waitlist-participants/:participantId/resend-confirmation",
    adminLimiter,
    requireAdmin,
    asyncHandler(async (request, response) => {
      const params = z
        .object({
          participantId: z.string().uuid(),
        })
        .parse(request.params);

      const participant = await prisma.waitlistParticipant.findUnique({
        where: {
          id: params.participantId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          seeking: true,
        },
      });

      if (!participant) {
        throw new HttpError(404, "participant_not_found", "Waitlist participant was not found.");
      }

      const confirmationEmailStatus = await updateEmailDeliveryState(participant.id, participant, emailService);

      response.json({
        data: {
          id: participant.id,
          confirmationEmailStatus,
        },
      });
    }),
  );

  app.use((_request, _response, next) => {
    next(new HttpError(404, "not_found", "Route not found."));
  });

  app.use(errorHandler);

  return app;
}

async function updateEmailDeliveryState(
  participantId: string,
  submission: WaitlistSubmission,
  emailService: WaitlistEmailService,
): Promise<EmailDeliveryState> {
  try {
    const deliveryResult = await emailService.sendWaitlistConfirmation(submission);

    await prisma.waitlistParticipant.update({
      where: {
        id: participantId,
      },
      data:
        deliveryResult.status === "SENT"
          ? {
              confirmationEmailStatus: "SENT",
              confirmationEmailSentAt: deliveryResult.sentAt,
              confirmationEmailFailure: null,
            }
          : {
              confirmationEmailStatus: "SKIPPED",
              confirmationEmailSentAt: null,
              confirmationEmailFailure: deliveryResult.reason,
            },
    });

    return deliveryResult.status;
  } catch (error) {
    console.error("Waitlist confirmation email failed.", {
      participantId,
      error: getErrorMessage(error),
    });

    await prisma.waitlistParticipant.update({
      where: {
        id: participantId,
      },
      data: {
        confirmationEmailStatus: "FAILED",
        confirmationEmailSentAt: null,
        confirmationEmailFailure: truncate(getErrorMessage(error), 512),
      },
    });

    return "FAILED";
  }
}

const requireAdmin: RequestHandler = (request, _response, next) => {
  if (!config.admin) {
    next(new HttpError(503, "admin_not_configured", "Admin access is not configured."));
    return;
  }

  const token = readBearerToken(request);
  if (!token || !constantTimeEquals(token, config.admin.token)) {
    next(new HttpError(401, "unauthorized", "A valid admin bearer token is required."));
    return;
  }

  (request as AdminRequest).admin = config.admin.user;
  next();
};

function readBearerToken(request: Request) {
  const authorization = request.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function constantTimeEquals(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function asyncHandler(handler: (request: Request, response: Response, next: NextFunction) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof z.ZodError) {
    response.status(422).json({
      error: {
        code: "validation_failed",
        message: "Request validation failed.",
        issues: error.issues.map(issue => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (isJsonParseError(error)) {
    response.status(400).json({
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON.",
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  console.error("Unhandled request error.", {
    error: getErrorMessage(error),
  });

  response.status(500).json({
    error: {
      code: "internal_error",
      message: "Something went wrong.",
    },
  });
};

function isJsonParseError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "type" in error &&
      (error as { type?: string }).type === "entity.parse.failed",
  );
}

function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
