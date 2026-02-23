export type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "HR"
  | "TECH"
  | "ONSITE"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export type ApplicationEntity = {
  id: string;
  userId: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  jobUrl: string | null;
  location: string | null;
  appliedAt: Date | null;
  nextFollowUp: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateApplicationInput = {
  userId: string;
  company: string;
  role: string;
  status?: ApplicationStatus;
  jobUrl?: string | null;
  location?: string | null;
  appliedAt?: Date | null;
  nextFollowUp?: Date | null;
};

export interface ApplicationRepository {
  listByUserId(userId: string): Promise<ApplicationEntity[]>;
  create(input: CreateApplicationInput): Promise<ApplicationEntity>;
  updateByIdForUser(
    id: string,
    userId: string,
    input: Partial<Omit<CreateApplicationInput, "userId">>,
  ): Promise<ApplicationEntity | null>;
  deleteByIdForUser(id: string, userId: string): Promise<boolean>;
}
