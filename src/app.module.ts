import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthMiddleware } from './auth.middleware'
import { JobController } from './job/job.controller'
import { JobModule } from './job/job.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    JobModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(JobController)
  }
}
