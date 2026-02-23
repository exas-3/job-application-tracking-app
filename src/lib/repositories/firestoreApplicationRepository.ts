import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { firebaseAdminDb } from "@/lib/firebase/admin";
import type {
  ApplicationEntity,
  ApplicationRepository,
  CreateApplicationInput,
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
  async listByUserId(userId: string): Promise<ApplicationEntity[]> {
    const query = await firebaseAdminDb
      .collection(APPLICATIONS_COLLECTION)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return query.docs.map((doc: QueryDocumentSnapshot<DocumentData>) =>
      mapApplication(doc),
    );
  }

  async create(input: CreateApplicationInput): Promise<ApplicationEntity> {
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
  }
}
