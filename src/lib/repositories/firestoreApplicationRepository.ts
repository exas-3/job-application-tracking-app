import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { firebaseAdminDb } from "@/lib/firebase/admin";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";
import type {
  ApplicationEntity,
  ApplicationRepository,
  CreateApplicationInput,
  ListApplicationsOptions,
  ListApplicationsResult,
} from "@/lib/repositories/applicationRepository";

const APPLICATIONS_COLLECTION = "applications";

function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function mapApplication(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ApplicationEntity {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: String(data.userId),
    company: String(data.company),
    role: String(data.role),
    status: data.status,
    jobUrl: data.jobUrl ?? null,
    location: data.location ?? null,
    appliedAt: toDate(data.appliedAt as Timestamp | Date | undefined),
    nextFollowUp: toDate(data.nextFollowUp as Timestamp | Date | undefined),
    createdAt:
      toDate(data.createdAt as Timestamp | Date | undefined) ?? new Date(),
    updatedAt:
      toDate(data.updatedAt as Timestamp | Date | undefined) ?? new Date(),
  };
}

export class FirestoreApplicationRepository implements ApplicationRepository {
  async listByUserId(
    userId: string,
    options: ListApplicationsOptions = {},
  ): Promise<ListApplicationsResult> {
    try {
      const rawLimit = options.limit ?? 20;
      const limit = Math.min(Math.max(rawLimit, 1), 100);
      let queryRef = firebaseAdminDb
        .collection(APPLICATIONS_COLLECTION)
        .where("userId", "==", userId) as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

      if (options.status) {
        queryRef = queryRef.where("status", "==", options.status);
      }

      queryRef = queryRef.orderBy("createdAt", "desc");

      if (options.cursor) {
        const cursorDate = new Date(Number(options.cursor));
        if (!Number.isNaN(cursorDate.getTime())) {
          queryRef = queryRef.startAfter(cursorDate);
        }
      }

      const query = await queryRef.limit(limit + 1).get();

      const mapped = query.docs.map((doc: QueryDocumentSnapshot<DocumentData>) =>
        mapApplication(doc),
      );
      const hasMore = mapped.length > limit;
      const items = hasMore ? mapped.slice(0, limit) : mapped;
      const last = items[items.length - 1];
      const nextCursor = hasMore && last ? String(last.createdAt.getTime()) : null;

      return { items, nextCursor };
    } catch (error) {
      reportError("firestore.application.list_failed", error, { userId });
      const details = error as { code?: string | number; message?: string };
      log.error("firestore.application.list_failed", {
        userId,
        code: details.code ?? null,
        message: details.message ?? "unknown",
      });
      throw error;
    }
  }

  async create(input: CreateApplicationInput): Promise<ApplicationEntity> {
    try {
      const ref = firebaseAdminDb.collection(APPLICATIONS_COLLECTION).doc();
      await ref.set({
        userId: input.userId,
        company: input.company,
        role: input.role,
        status: input.status ?? "SAVED",
        jobUrl: input.jobUrl ?? null,
        location: input.location ?? null,
        appliedAt: input.appliedAt ?? null,
        nextFollowUp: input.nextFollowUp ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const snapshot = await ref.get();
      if (!snapshot.exists) {
        throw new Error("Failed to create application document");
      }

      return mapApplication(snapshot as QueryDocumentSnapshot<DocumentData>);
    } catch (error) {
      reportError("firestore.application.create_failed", error, {
        userId: input.userId,
      });
      const details = error as { code?: string | number; message?: string };
      log.error("firestore.application.create_failed", {
        userId: input.userId,
        code: details.code ?? null,
        message: details.message ?? "unknown",
      });
      throw error;
    }
  }

  async updateByIdForUser(
    id: string,
    userId: string,
    input: Partial<Omit<CreateApplicationInput, "userId">>,
  ): Promise<ApplicationEntity | null> {
    try {
      const ref = firebaseAdminDb.collection(APPLICATIONS_COLLECTION).doc(id);
      const existing = await ref.get();
      if (!existing.exists) return null;

      const data = existing.data();
      if (!data || data.userId !== userId) return null;

      const updateData: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (input.company !== undefined) updateData.company = input.company;
      if (input.role !== undefined) updateData.role = input.role;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.jobUrl !== undefined) updateData.jobUrl = input.jobUrl;
      if (input.location !== undefined) updateData.location = input.location;
      if (input.appliedAt !== undefined) updateData.appliedAt = input.appliedAt;
      if (input.nextFollowUp !== undefined) {
        updateData.nextFollowUp = input.nextFollowUp;
      }

      await ref.update(updateData);
      const snapshot = await ref.get();
      if (!snapshot.exists) return null;
      return mapApplication(snapshot as QueryDocumentSnapshot<DocumentData>);
    } catch (error) {
      reportError("firestore.application.update_failed", error, { id, userId });
      const details = error as { code?: string | number; message?: string };
      log.error("firestore.application.update_failed", {
        id,
        userId,
        code: details.code ?? null,
        message: details.message ?? "unknown",
      });
      throw error;
    }
  }

  async deleteByIdForUser(id: string, userId: string): Promise<boolean> {
    try {
      const ref = firebaseAdminDb.collection(APPLICATIONS_COLLECTION).doc(id);
      const existing = await ref.get();
      if (!existing.exists) return false;

      const data = existing.data();
      if (!data || data.userId !== userId) return false;

      await ref.delete();
      return true;
    } catch (error) {
      reportError("firestore.application.delete_failed", error, { id, userId });
      const details = error as { code?: string | number; message?: string };
      log.error("firestore.application.delete_failed", {
        id,
        userId,
        code: details.code ?? null,
        message: details.message ?? "unknown",
      });
      throw error;
    }
  }
}
