import { FirestoreApplicationRepository } from "@/lib/repositories/firestoreApplicationRepository";
import { FirestoreUserRepository } from "@/lib/repositories/firestoreUserRepository";

export const userRepository = new FirestoreUserRepository();
export const applicationRepository = new FirestoreApplicationRepository();
