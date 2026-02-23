import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { firebaseAdminDb } from "@/lib/firebase/admin";
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
    const query = await firebaseAdminDb
      .collection(USERS_COLLECTION)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (query.empty) return null;
    const doc = query.docs[0];
    if (!doc) return null;
    return mapUser(doc);
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
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
  }

  async count(): Promise<number> {
    const aggregate = await firebaseAdminDb
      .collection(USERS_COLLECTION)
      .count()
      .get();
    return aggregate.data().count;
  }
}
