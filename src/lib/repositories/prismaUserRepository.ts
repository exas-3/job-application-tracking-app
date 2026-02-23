import { prisma } from "@/lib/prisma";
import type {
  CreateUserInput,
  UserEntity,
  UserRepository,
} from "@/lib/repositories/userRepository";

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    return prisma.user.create({
      data: {
        email: input.email,
        password: input.password,
        name: input.name ?? null,
      },
    });
  }

  async count(): Promise<number> {
    return prisma.user.count();
  }
}
