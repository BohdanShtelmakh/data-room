import { User } from '@prisma/client';

export class UserResponseDto {
  id!: string;

  email!: string;

  name!: string;

  createdAt!: Date;

  updatedAt!: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  public static fromEntity(user: User): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
