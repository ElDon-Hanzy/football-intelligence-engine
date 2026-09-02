import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { endpoints, fetchValidated, publicGatewayHeaders } from './api';

export const GameweekStatusSchema = z.object({
  ok: z.literal(true),
  live_gameweek: z.number().int().min(1).max(38),
  reason: z.string().min(1),
  as_of: z.string(),
  schedule: z.array(z.object({
    gameweek: z.number().int().min(1).max(38),
    fixtures: z.number().int().nonnegative(),
    finished: z.number().int().nonnegative(),
    unfinished: z.number().int().nonnegative(),
    first_kickoff: z.string(),
    last_kickoff: z.string(),
  }).passthrough()),
  teams: z.array(z.object({
    id: z.number(),
    fpl_team_id: z.number().int().positive(),
    name: z.string().min(1),
    short_name: z.string().min(1),
    team_code: z.number().int().positive(),
  }).passthrough()).default([]),
  semantics: z.object({
    frozen_projection_runs_do_not_define_live_gameweek: z.literal(true),
  }).passthrough(),
}).passthrough();

export function useLiveGameweek(enabled: boolean) {
  return useQuery({
    queryKey: ['live-gameweek'],
    queryFn: ({ signal }) => fetchValidated(endpoints.gameweekStatus, GameweekStatusSchema, signal, publicGatewayHeaders),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGameweekStatus() {
  return useQuery({
    queryKey: ['live-gameweek'],
    queryFn: ({ signal }) => fetchValidated(endpoints.gameweekStatus, GameweekStatusSchema, signal, publicGatewayHeaders),
    staleTime: 5 * 60 * 1000,
  });
}

export type GameweekStatus = z.infer<typeof GameweekStatusSchema>;
