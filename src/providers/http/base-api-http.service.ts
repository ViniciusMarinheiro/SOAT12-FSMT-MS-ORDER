import { HttpService } from '@nestjs/axios';
import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { EnvConfigService } from '@/common/service/env/env-config.service';

@Injectable({ scope: Scope.REQUEST })
export class BaseApiHttpService {
  public readonly API_BASE_URL: string;

  constructor(
    readonly httpService: HttpService,
    private readonly envConfigService: EnvConfigService,
    @Inject(REQUEST) private readonly request: Request,
  ) {
    this.API_BASE_URL =
      this.envConfigService.get('API_BASE_URL') ||
      'http://localhost:3333/api/v1/oficina';
  }

  get headers() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Extrair token JWT do header Authorization da requisição atual
    const authHeader = this.request.headers.authorization;
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    return headers;
  }
}
