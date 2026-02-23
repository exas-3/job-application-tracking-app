export type UserEntity = {
  id: string;
  email: string;
  name: string | null;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string | null;
};

export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  create(input: CreateUserInput): Promise<UserEntity>;
  count(): Promise<number>;
}
