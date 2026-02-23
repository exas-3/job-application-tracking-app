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
  CreateUserInput,
  UserEntity,
  UserRepository,
} from "@/lib/repositories/userRepository";

const USERS_COLLECTION = "users";

function toDate(value: Timestamp | Date | null | undefined): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

function mapUser(snapshot: QueryDocumentSnapshot<DocumentData>): UserEntity {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    email: String(data.email),
    name: data.name ?? null,
    createdAt: toDate(data.createdAt as Timestamp | Date | undefined),
    updatedAt: toDate(data.updatedAt as Timestamp | Date | undefined),
  };
}

export class FirestoreUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const query = await firebaseAdminDb
        .collection(USERS_COLLECTION)
        .where("email", "==", email)
        .limit(1)
        .get();

      if (query.empty) return null;
      const doc = query.docs[0];
      if (!doc) return null;
      return mapUser(doc);
    } catch (error) {
      reportError("firestore.user.find_by_email_failed", error, { email });
      const details = error as { code?: string | number; message?: string };
      log.error("firestore.user.find_by_email_failed", {
        email,
        code: details.code ?? null,
        message: details.message ?? "unknown",
      });
      throw error;
    }
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    try {
      const ref = input.id
        ? firebaseAdminDb.collection(USERS_COLLECTION).doc(input.id)
        : firebaseAdminDb.collection(USERS_COLLECTION).doc();

      await ref.set({
        email: input.email,
        name: input.name ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const snapshot = await ref.get();
      if (!snapshot.exists) {
        throw new Error("Failed to create user document");
      }

      return mapUser(snapshot as QueryDocumentSnapshot<DocumentData>);
    } catch (error) {
      reportError("firestore.user.create_failed", error, {
        id: input.id ?? null,
        email: input.email,
      });
      const details = error as { code?: string | number; message?: string };
      log.error("firestore.user.create_failed", {
        id: input.id ?? null,
        email: input.email,
        code: details.code ?? null,
        message: details.message ?? "unknown",
      });
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      const aggregate = await firebaseAdminDb
        .collection(USERS_COLLECTION)
        .count()
        .get();
      return aggregate.data().count;
    } catch (error) {
      reportError("firestore.user.count_failed", error);
      const details = error as { code?: string | number; message?: string };
      log.error("firestore.user.count_failed", {
        code: details.code ?? null,
        message: details.message ?? "unknown",
      });
      throw error;
    }
  }
}
